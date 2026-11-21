# Context-aware Feature-Group Mixture of Experts — Online Shoppers Purchasing Intention

ML course project (Project 3: Online Shopping Behaviour Prediction).
The full write-up is in [REPORT.md](REPORT.md).

## Layout

| Path | What it is |
|---|---|
| `online_shoppers_intention.csv` | UCI dataset (12,330 sessions) |
| `src/data.py` | loading, de-duplication, feature groups, preprocessing transformers |
| `src/models.py` | XGBoost and logistic-regression experts, gating network (PyTorch) |
| `src/experiment.py` | one leakage-free run of the main model (E7c MoE, with PageValues) for a given seed |
| `run_experiments.py` | runs seeds 100–109 in parallel → `results/metrics.csv`, `results/artefacts.pkl` |
| `analyze_results.py` | summary tables, gate-weight tables, figures → `results/`, `figures/` |
| `REPORT.md` | the five-part report (formulation, data, methods, results, conclusion) |

## Reproduce

```bash
python -m pip install scikit-learn xgboost pandas matplotlib tabulate
```

```bash
python -m pip install torch --index-url https://download.pytorch.org/whl/cpu
```

```bash
python run_experiments.py --seeds 10
```

```bash
python analyze_results.py
```

The full run takes under a minute on a 6-core laptop CPU: the 10 seeds run in parallel worker processes (no GPU needed; on this small dataset it is slower than the CPU).
`python run_experiments.py --seeds 1` is a quick smoke test.
