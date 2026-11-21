"""Train and evaluate the main model (E7c MoE, with PageValues) for every seed.

Experts: Behaviour/Context = XGBoost, Analytics = logistic regression; gate = small neural network.

Usage:  python -u run_experiments.py --seeds 10            (full run -> results/, uses all CPU cores)
        python -u run_experiments.py --seeds 10 --jobs 1   (sequential)
        python -u run_experiments.py --seeds 1             (quick smoke test)

Parallelism: the seeds are independent, so they run in --jobs worker processes,
each limited to (logical cores / jobs) threads.
Outputs: <out>/metrics.csv and <out>/artefacts.pkl
"""
import argparse
import os
import pickle
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).parent


def _job(seed):
    # imported here so worker processes pick up MOE_THREADS before torch/xgboost load
    from src.data import load_data
    from src.experiment import run_once
    X, y, _ = load_data(ROOT / "online_shoppers_intention.csv")
    t = time.time()
    r, a = run_once(X, y, seed, log=lambda *_: None)
    return seed, r, a, time.time() - t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=10)
    ap.add_argument("--first-seed", type=int, default=100,
                    help="seeds used are first_seed .. first_seed+seeds-1. Default 100: fresh splits "
                         "that were never used while designing the model (seeds 0-9 were)")
    ap.add_argument("--out", default="results", help="output folder")
    ap.add_argument("--jobs", type=int, default=0,
                    help="parallel worker processes (default: physical cores)")
    args = ap.parse_args()
    out = ROOT / args.out
    logical = os.cpu_count() or 1
    jobs = min(args.jobs or max(1, logical // 2), args.seeds)
    os.environ["MOE_THREADS"] = str(max(1, logical // jobs))  # inherited by workers

    from src.data import load_data

    X, y, n_dupes = load_data(ROOT / "online_shoppers_intention.csv")
    print(f"Loaded {len(X)} sessions after removing {n_dupes} duplicates; "
          f"positive rate {y.mean():.3f}")

    print(f"{args.seeds} runs (seeds {args.first_seed}-{args.first_seed + args.seeds - 1}) on {jobs} workers x {os.environ['MOE_THREADS']} threads")
    rows, artefacts, t0 = [], {}, time.time()
    with ProcessPoolExecutor(max_workers=jobs) as pool:
        seeds = range(args.first_seed, args.first_seed + args.seeds)
        futures = [pool.submit(_job, s) for s in seeds]
        for i, f in enumerate(as_completed(futures), 1):
            seed, r, a, dt = f.result()
            rows += r
            artefacts[seed] = a
            print(f"[{i}/{args.seeds}] seed={seed} done in {dt:.0f}s "
                  f"(elapsed {time.time() - t0:.0f}s)", flush=True)
    rows.sort(key=lambda r: r["seed"])

    out.mkdir(exist_ok=True)
    pd.DataFrame(rows).to_csv(out / "metrics.csv", index=False)
    with open(out / "artefacts.pkl", "wb") as f:
        pickle.dump(artefacts, f)
    print(f"saved results to {out}")


if __name__ == "__main__":
    main()
