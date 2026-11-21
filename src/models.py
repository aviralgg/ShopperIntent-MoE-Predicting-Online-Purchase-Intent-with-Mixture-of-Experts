"""Experts (XGBoost, logistic regression) and the MoE gating network."""
import os

import numpy as np
import torch
import torch.nn as nn
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier

from .data import gate_preprocessor, tree_preprocessor

# Threads per process. run_experiments.py --jobs N sets MOE_THREADS so that
# N parallel workers x MOE_THREADS threads fill the CPU without oversubscribing.
N_THREADS = int(os.environ.get("MOE_THREADS", "-1"))
torch.set_num_threads(N_THREADS if N_THREADS > 0 else 4)
EPS = 1e-4


# ----------------------------------------------------------------------------
# Base learners
# ----------------------------------------------------------------------------
class BalancedXGB(XGBClassifier):
    """XGBoost that sets scale_pos_weight = #neg / #pos from the data it is fitted on."""

    def fit(self, X, y, **kw):
        pos = max(int(np.sum(y)), 1)
        self.set_params(scale_pos_weight=(len(y) - pos) / pos)
        return super().fit(X, y, **kw)


def xgb_model(cols, seed):
    """XGBoost expert: one-hot categoricals, shallow boosted trees, class-balanced."""
    clf = BalancedXGB(
        n_estimators=400, learning_rate=0.05, max_depth=4, min_child_weight=2,
        subsample=0.8, colsample_bytree=0.8, reg_lambda=1.0, tree_method="hist",
        eval_metric="logloss", n_jobs=N_THREADS, random_state=seed,
    )
    return Pipeline([("prep", tree_preprocessor(cols)), ("clf", clf)])


def logistic_model(cols, seed):
    """Linear baseline on the gate's preprocessing (one-hot + log + scale)."""
    return Pipeline([
        ("prep", gate_preprocessor(cols)),
        ("clf", LogisticRegression(C=1.0, class_weight="balanced", max_iter=2000, random_state=seed)),
    ])


# ----------------------------------------------------------------------------
# Combiners. Interface: fit(Z, P, y) ; predict(Z, P) -> (probability, weights|None)
#   Z : preprocessed session features for the gate (n, d)
#   P : expert probabilities (n, k)
# ----------------------------------------------------------------------------
def _logit(P):
    P = np.clip(P, EPS, 1 - EPS)
    return np.log(P / (1 - P))


class _GateNet(nn.Module):
    """Static: one learnable logit per expert (same weights for everyone).
    Adaptive: Linear(d,16) -> ReLU -> Linear(16,k); softmax gives per-session weights."""

    def __init__(self, d, k, hidden, static):
        super().__init__()
        self.static = static
        if static:
            self.logits = nn.Parameter(torch.zeros(k))
        else:
            self.net = nn.Sequential(nn.Linear(d, hidden), nn.ReLU(), nn.Linear(hidden, k))
        # Only used for log-odds pooling: p = sigmoid(scale * sum_j w_j logit(P_j) + bias)
        self.raw_scale = nn.Parameter(torch.tensor(0.5413))  # softplus(0.5413) = 1
        self.bias = nn.Parameter(torch.tensor(0.0))

    def forward(self, x):
        if self.static:
            return torch.softmax(self.logits, 0).expand(x.shape[0], -1)
        return torch.softmax(self.net(x), dim=1)


class SoftmaxGate:
    """Trains a gate so that p = sum_j w_j(x) * P_j minimises binary cross-entropy.

    static=True  -> E6 (one global weight vector)
    static=False -> E7 (context-aware Mixture of Experts)
    with_probs   -> the gate also sees the experts' logits as input (variant E7b)
    pool="prob"  -> p = sum_j w_j P_j                       (original design)
    pool="logit" -> p = sigmoid(s * sum_j w_j logit(P_j) + b)  (log-odds pooling, E6c/E7c)
    """

    def __init__(self, static=False, with_probs=False, pool="prob", hidden=16, lr=0.01,
                 weight_decay=1e-3, max_epochs=1000, patience=50, seed=0):
        self.static, self.with_probs, self.pool = static, with_probs, pool
        self.hidden, self.lr, self.wd = hidden, lr, weight_decay
        self.max_epochs, self.patience, self.seed = max_epochs, patience, seed

    def _inputs(self, Z, P):
        X = np.hstack([Z, _logit(P)]) if self.with_probs else Z
        E = _logit(P) if self.pool == "logit" else P
        return torch.tensor(X, dtype=torch.float32), torch.tensor(E, dtype=torch.float32)

    def _combine(self, W, E):
        if self.pool == "logit":
            s = nn.functional.softplus(self.model.raw_scale)
            return torch.sigmoid(s * (W * E).sum(1) + self.model.bias)
        return (W * E).sum(1)

    def fit(self, Z, P, y):
        torch.manual_seed(self.seed)
        idx_tr, idx_va = train_test_split(
            np.arange(len(y)), test_size=0.15, stratify=y, random_state=self.seed)
        X, Pt = self._inputs(Z, P)
        yt = torch.tensor(y, dtype=torch.float32)
        self.model = _GateNet(X.shape[1], P.shape[1], self.hidden, self.static)
        opt = torch.optim.AdamW(self.model.parameters(), lr=self.lr, weight_decay=self.wd)
        bce = nn.BCELoss()

        def loss_on(idx):
            W = self.model(X[idx])
            p = self._combine(W, Pt[idx]).clamp(EPS, 1 - EPS)
            return bce(p, yt[idx])

        best, best_state, wait = np.inf, None, 0
        for _ in range(self.max_epochs):  # full-batch training (data is small)
            self.model.train()
            opt.zero_grad()
            loss = loss_on(idx_tr)
            loss.backward()
            opt.step()
            self.model.eval()
            with torch.no_grad():
                v = loss_on(idx_va).item()
            if v < best - 1e-6:
                best, wait = v, 0
                best_state = {k: t.clone() for k, t in self.model.state_dict().items()}
            else:
                wait += 1
                if wait >= self.patience:
                    break
        self.model.load_state_dict(best_state)
        return self

    def predict(self, Z, P):
        X, Pt = self._inputs(Z, P)
        self.model.eval()
        with torch.no_grad():
            W = self.model(X)
            p = self._combine(W, Pt)
        return p.numpy(), W.numpy()
