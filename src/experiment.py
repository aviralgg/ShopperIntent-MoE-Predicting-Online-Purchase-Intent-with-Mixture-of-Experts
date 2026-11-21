"""One complete, leakage-free run of the main model (E7c) for a given seed, with PageValues.

Main model: context-aware Mixture of Experts with log-odds pooling (E7c)
    Behaviour expert -> XGBoost
    Context expert   -> XGBoost
    Analytics expert -> logistic regression
    Gate             -> small neural network giving per-session expert weights

Protocol per run
1. Stratified 80/20 split (seed-dependent). Test set untouched until the end.
2. 5-fold stratified CV on the training split -> out-of-fold (OOF) probabilities
   for every expert. Preprocessing is inside each pipeline, so it is refitted on
   every training fold.
3. The gate is trained on the OOF expert probabilities only. To choose its decision
   threshold it is itself cross-fitted on the OOF table (inner 5-fold), giving OOF
   combined predictions.
4. Every expert is refitted on the full training split; the gate trained on the
   full OOF table is applied to the refitted experts' test probabilities.
5. Threshold = the one maximising F1 on the OOF combined predictions.
"""
import numpy as np
from sklearn.metrics import (accuracy_score, average_precision_score, balanced_accuracy_score,
                             f1_score, precision_recall_curve, precision_score, recall_score,
                             roc_auc_score)
from sklearn.model_selection import StratifiedKFold, train_test_split

from .data import all_features, feature_groups, gate_preprocessor
from .models import SoftmaxGate, logistic_model, xgb_model

N_FOLDS = 5
MAIN = "E7c Context-aware MoE, log-odds pooling"
EXPERTS = ["Behaviour", "Context", "Analytics"]

# Model used by each expert (fixed by design choice):
#   Behaviour & Context -> XGBoost (many features, non-linear patterns and interactions)
#   Analytics           -> logistic regression (3 smooth, near-monotone rate features)
EXPERT_MODELS = {"Behaviour": xgb_model, "Context": xgb_model, "Analytics": logistic_model}


def best_f1_threshold(y, p):
    prec, rec, thr = precision_recall_curve(y, p)
    f1 = 2 * prec * rec / np.maximum(prec + rec, 1e-12)
    return float(thr[np.argmax(f1[:-1])])


def evaluate(y, p, thr):
    yhat = (p >= thr).astype(int)
    return {
        "precision": precision_score(y, yhat, zero_division=0),
        "recall": recall_score(y, yhat),
        "f1": f1_score(y, yhat),
        "pr_auc": average_precision_score(y, p),
        "roc_auc": roc_auc_score(y, p),
        "balanced_acc": balanced_accuracy_score(y, yhat),
        "accuracy": accuracy_score(y, yhat),
        "threshold": thr,
    }


def make_gate(seed):
    return SoftmaxGate(pool="logit", seed=seed)


def run_once(X, y, seed, log=print):
    groups = feature_groups(use_pagevalues=True)
    feats = all_features(use_pagevalues=True)
    X = X[feats]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=seed)

    # ---------------- experts: out-of-fold + test probabilities --------------
    P_oof = np.zeros((len(ytr), len(EXPERTS)))
    skf = StratifiedKFold(N_FOLDS, shuffle=True, random_state=seed)
    for tr, va in skf.split(Xtr, ytr):
        for j, e in enumerate(EXPERTS):
            m = EXPERT_MODELS[e](groups[e], seed).fit(Xtr.iloc[tr], ytr[tr])
            P_oof[va, j] = m.predict_proba(Xtr.iloc[va])[:, 1]
    P_te = np.column_stack([
        EXPERT_MODELS[e](groups[e], seed).fit(Xtr, ytr).predict_proba(Xte)[:, 1] for e in EXPERTS])
    log("  experts done")

    gp = gate_preprocessor(feats).fit(Xtr)  # unsupervised scaling, fitted on train only
    Z_oof, Z_te = gp.transform(Xtr), gp.transform(Xte)

    # ---------------- gate ---------------------------------------------------
    oof = np.zeros(len(ytr))  # OOF combined predictions, only used to pick the threshold
    skf2 = StratifiedKFold(N_FOLDS, shuffle=True, random_state=seed + 1000)
    for tr, va in skf2.split(Z_oof, ytr):
        oof[va] = make_gate(seed).fit(Z_oof[tr], P_oof[tr], ytr[tr]).predict(Z_oof[va], P_oof[va])[0]
    gate = make_gate(seed).fit(Z_oof, P_oof, ytr)
    p_te, W_te = gate.predict(Z_te, P_te)
    log("  gate done")

    # ---------------- evaluation ---------------------------------------------
    thr = best_f1_threshold(ytr, oof)
    rows = [{"model": MAIN, **evaluate(yte, p_te, thr), "seed": seed}]
    artefacts = {
        "test_index": Xte.index.to_numpy(), "y_test": yte, "probs": p_te,
        "threshold": thr, "weights": W_te, "P_test": P_te,
    }
    return rows, artefacts
