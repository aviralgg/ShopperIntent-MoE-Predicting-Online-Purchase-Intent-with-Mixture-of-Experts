"""Turn results/metrics.csv + results/artefacts.pkl into tables and figures for the main model (E7c).

Usage: python analyze_results.py   (results/ -> figures/)
Outputs: <results>/*.csv, <results>/*.md and <figures>/*.png
"""
import argparse
import pickle
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_curve

from src.data import load_data

ROOT = Path(__file__).parent
RES, FIG = ROOT / "results", ROOT / "figures"  # overridden by --results / --figures in main()

# Validated categorical palette (blue, orange, aqua, yellow) + neutral ink.
BLUE, ORANGE, AQUA, YELLOW = "#2a78d6", "#eb6834", "#1baf7a", "#eda100"
GREY, INK, INK2, GRID, SURFACE = "#a3a29c", "#0b0b0b", "#52514e", "#e6e5e0", "#fcfcfb"
EXPERT_COLORS = {"Behaviour": BLUE, "Context": ORANGE, "Analytics": AQUA}
METRICS = ["precision", "recall", "f1", "pr_auc", "roc_auc", "balanced_acc", "accuracy"]
EXPERTS = ["Behaviour", "Context", "Analytics"]

plt.rcParams.update({
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
    "axes.edgecolor": GRID, "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "text.color": INK, "font.size": 10, "axes.spines.top": False, "axes.spines.right": False,
    "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.8, "axes.axisbelow": True,
    "axes.titleweight": "bold", "axes.titlesize": 11, "axes.titlelocation": "left",
})


def summary_tables(df):
    """Mean ± std over seeds, plus the per-seed table."""
    m, s = df[METRICS].mean(), df[METRICS].std()
    tab = pd.DataFrame({"mean": m.round(3), "std": s.round(3)})
    tab.to_csv(RES / "summary.csv")
    per_seed = df.set_index("seed")[METRICS + ["threshold"]].round(3)
    (RES / "summary_tables.md").write_text(
        f"### E7c MoE, with PageValues (test set, mean ± std over {len(df)} seeds)\n\n"
        + tab.to_markdown() + "\n\n### Per seed\n\n" + per_seed.to_markdown() + "\n",
        encoding="utf-8")


def fig_pr_curves(art):
    """Precision-recall curve of the main model on every seed's test set."""
    fig, ax = plt.subplots(figsize=(6.5, 4.8))
    for i, (seed, a) in enumerate(sorted(art.items())):
        p, r, _ = precision_recall_curve(a["y_test"], a["probs"])
        ax.plot(r, p, color=BLUE, lw=2 if i == 0 else 1, alpha=1 if i == 0 else 0.3,
                label=f"seed {seed}" if i == 0 else ("other seeds" if i == 1 else None))
    base = np.mean([a["y_test"].mean() for a in art.values()])
    ax.axhline(base, color=INK2, lw=1, ls=":")
    ax.text(0.02, base + 0.015, "random classifier", fontsize=8, color=INK2)
    ax.set_xlabel("Recall"), ax.set_ylabel("Precision")
    ax.set_title("E7c MoE — precision–recall curves (test sets)")
    ax.set_xlim(0, 1), ax.set_ylim(0, 1.02)
    ax.legend(frameon=False, fontsize=8.5, loc="upper right")
    fig.tight_layout()
    fig.savefig(FIG / "fig1_pr_curves.png", dpi=160)
    plt.close(fig)


def gate_frame(art, X):
    """Stack test-set gate weights of all seeds with the raw session features."""
    frames = []
    for seed, a in art.items():
        f = X.iloc[a["test_index"]].reset_index(drop=True).copy()
        f["Revenue"] = a["y_test"]
        for j, e in enumerate(EXPERTS):
            f[f"w_{e}"] = a["weights"][:, j]
        f["seed"] = seed
        frames.append(f)
    return pd.concat(frames, ignore_index=True)


def fig_gate_weights(art, X):
    g = gate_frame(art, X)
    fig, axes = plt.subplots(1, 3, figsize=(14, 4.4))
    # (a) distribution by class
    ax = axes[0]
    for j, e in enumerate(EXPERTS):
        for k, cls in enumerate([0, 1]):
            bp = ax.boxplot(g.loc[g.Revenue == cls, f"w_{e}"], positions=[j * 3 + k], widths=0.7,
                            patch_artist=True, showfliers=False, medianprops={"color": INK, "lw": 1.5})
            bp["boxes"][0].set(facecolor=EXPERT_COLORS[e], alpha=0.45 if cls == 0 else 1.0,
                               edgecolor=EXPERT_COLORS[e])
    ax.set_xticks([0, 1, 3, 4, 6, 7], ["no buy", "buy"] * 3, fontsize=8)
    for j, e in enumerate(EXPERTS):
        ax.text(j * 3 + 0.5, 1.02, e, ha="center", fontsize=9, color=INK, transform=ax.get_xaxis_transform())
    ax.set_ylabel("Gate weight")
    ax.set_title("(a) Weights by outcome", pad=18)
    # (b) vs product browsing depth
    ax = axes[1]
    bins = pd.qcut(g.ProductRelated, 5, duplicates="drop")
    m = g.groupby(bins, observed=True)[[f"w_{e}" for e in EXPERTS]].mean()
    x = np.arange(len(m))
    for e in EXPERTS:
        ax.plot(x, m[f"w_{e}"], color=EXPERT_COLORS[e], lw=2, marker="o", ms=6)
        ax.text(x[-1] + 0.1, m[f"w_{e}"].iloc[-1], e, color=INK2, fontsize=8.5, va="center")
    ax.set_xticks(x, [f"{int(i.left)+1}–{int(i.right)}" for i in m.index], fontsize=8)
    ax.set_xlim(-0.3, len(m) + 0.6)
    ax.set_xlabel("Product pages viewed (quintile)")
    ax.set_ylabel("Mean gate weight")
    ax.set_title("(b) Weights vs browsing depth")
    # (c) by visitor type
    ax = axes[2]
    vt = g.groupby("VisitorType")[[f"w_{e}" for e in EXPERTS]].mean()
    xx = np.arange(len(vt))
    for j, e in enumerate(EXPERTS):
        ax.bar(xx + (j - 1) * 0.26, vt[f"w_{e}"], width=0.24, color=EXPERT_COLORS[e], label=e)
    ax.set_xticks(xx, [s.replace("_", " ") for s in vt.index], fontsize=8.5)
    ax.set_ylabel("Mean gate weight")
    ax.set_title("(c) Weights by visitor type")
    ax.set_ylim(0, 1.1)
    ax.legend(frameon=False, fontsize=8, loc="upper center", ncol=3)
    ax.grid(axis="x", visible=False)
    fig.tight_layout()
    fig.savefig(FIG / "fig2_gate_weights.png", dpi=160)
    plt.close(fig)

    t = g.groupby("Revenue")[[f"w_{e}" for e in EXPERTS]].agg(["mean", "std"]).round(3)
    t.index = [f"Revenue={i}" for i in t.index]
    with open(RES / "gate_weights.md", "w", encoding="utf-8") as f:
        f.write(t.to_markdown() + "\n\n" + vt.round(3).to_markdown() + "\n")


def fig_data_overview(X, y):
    fig, axes = plt.subplots(1, 3, figsize=(14, 3.8))
    ax = axes[0]
    vals = [(y == 0).sum(), (y == 1).sum()]
    ax.bar(["No purchase", "Purchase"], vals, color=[GREY, BLUE], width=0.55)
    for i, v in enumerate(vals):
        ax.text(i, v + 150, f"{v:,} ({v / len(y):.1%})", ha="center", fontsize=9, color=INK2)
    ax.set_title("Class balance (after de-duplication)")
    ax.set_ylim(0, max(vals) * 1.15)
    ax.grid(axis="x", visible=False)

    ax = axes[1]
    pv = X.PageValues > 0
    rates = [y[~pv].mean(), y[pv].mean()]
    ax.bar(["PageValues = 0", "PageValues > 0"], rates, color=[GREY, AQUA], width=0.55)
    for i, r in enumerate(rates):
        ax.text(i, r + 0.015, f"{r:.1%}  (n={[(~pv).sum(), pv.sum()][i]:,})", ha="center",
                fontsize=9, color=INK2)
    ax.set_ylabel("Purchase rate")
    ax.set_title("PageValues is a near-direct purchase signal")
    ax.set_ylim(0, 0.7)
    ax.grid(axis="x", visible=False)

    ax = axes[2]
    months = ["Feb", "Mar", "May", "June", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    r = pd.Series(y).groupby(X.Month.to_numpy()).mean().reindex(months)
    n = X.Month.value_counts().reindex(months)
    ax.bar(months, r, color=BLUE, width=0.6)
    for i, (rv, nv) in enumerate(zip(r, n)):
        ax.text(i, rv + 0.008, f"{nv}", ha="center", fontsize=7.5, color=INK2)
    ax.set_ylabel("Purchase rate")
    ax.set_title("Purchase rate by month (labels = sessions)")
    ax.grid(axis="x", visible=False)
    fig.tight_layout()
    fig.savefig(FIG / "fig0_data_overview.png", dpi=160)
    plt.close(fig)


def main():
    global RES, FIG
    ap = argparse.ArgumentParser()
    ap.add_argument("--results", default="results", help="folder written by run_experiments.py")
    ap.add_argument("--figures", default="figures", help="figure folder")
    args = ap.parse_args()
    RES = ROOT / args.results
    FIG = ROOT / args.figures
    FIG.mkdir(exist_ok=True)

    df = pd.read_csv(RES / "metrics.csv")
    with open(RES / "artefacts.pkl", "rb") as f:
        art = pickle.load(f)
    X, y, _ = load_data(ROOT / "online_shoppers_intention.csv")
    summary_tables(df)
    fig_data_overview(X, y)
    fig_pr_curves(art)
    fig_gate_weights(art, X)
    print(f"tables -> {RES.name}/, figures -> {FIG.name}/")


if __name__ == "__main__":
    main()
