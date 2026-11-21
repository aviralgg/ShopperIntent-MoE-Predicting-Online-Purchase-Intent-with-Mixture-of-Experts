"""Data loading, feature groups and preprocessing.

All preprocessing objects are sklearn transformers so they are always fitted
on training folds only (no leakage into validation or test data).
"""
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler

TARGET = "Revenue"

BEHAVIOUR = [
    "Administrative", "Administrative_Duration",
    "Informational", "Informational_Duration",
    "ProductRelated", "ProductRelated_Duration",
]
CONTEXT = [
    "OperatingSystems", "Browser", "Region", "TrafficType",
    "VisitorType", "Month", "Weekend", "SpecialDay",
]
ANALYTICS = ["BounceRates", "ExitRates", "PageValues"]

# Integer IDs that are really categories, plus the two string columns.
CATEGORICAL = ["OperatingSystems", "Browser", "Region", "TrafficType", "VisitorType", "Month"]
# Heavy right tail -> log1p before scaling (only matters for the neural gate).
SKEWED = BEHAVIOUR + ["PageValues"]

# Categories seen fewer than this many times in the training fold are merged
# into a single "infrequent" level by the one-hot encoder.
MIN_CATEGORY_COUNT = 30


def load_data(path):
    """Load the CSV, drop exact duplicate sessions, return X (DataFrame) and y (0/1 array)."""
    df = pd.read_csv(path)
    n_raw = len(df)
    df = df.drop_duplicates().reset_index(drop=True)
    X = df.drop(columns=TARGET)
    X["Weekend"] = X["Weekend"].astype(int)
    for c in CATEGORICAL:
        X[c] = X[c].astype(str)
    y = df[TARGET].astype(int).to_numpy()
    return X, y, n_raw - len(df)


def feature_groups(use_pagevalues=True):
    """Return the expert feature groups; optionally drop PageValues."""
    analytics = ANALYTICS if use_pagevalues else [c for c in ANALYTICS if c != "PageValues"]
    return {"Behaviour": BEHAVIOUR, "Context": CONTEXT, "Analytics": analytics}


def all_features(use_pagevalues=True):
    g = feature_groups(use_pagevalues)
    return g["Behaviour"] + g["Context"] + g["Analytics"]


def _onehot():
    return OneHotEncoder(
        min_frequency=MIN_CATEGORY_COUNT,
        handle_unknown="infrequent_if_exist",
        sparse_output=False,
    )


def tree_preprocessor(cols):
    """For tree models: one-hot categorical IDs, leave numeric features unscaled."""
    cat = [c for c in cols if c in CATEGORICAL]
    num = [c for c in cols if c not in CATEGORICAL]
    # remainder="drop": an expert must only ever see its own feature group
    return ColumnTransformer([("cat", _onehot(), cat), ("num", "passthrough", num)],
                             remainder="drop")


def gate_preprocessor(cols):
    """For the neural gate / linear models: one-hot + log1p(skewed) + standardise."""
    cat = [c for c in cols if c in CATEGORICAL]
    skew = [c for c in cols if c in SKEWED]
    rest = [c for c in cols if c not in cat and c not in skew]
    return ColumnTransformer([
        ("cat", _onehot(), cat),
        ("log", Pipeline([("log1p", FunctionTransformer(np.log1p)), ("scale", StandardScaler())]), skew),
        ("num", StandardScaler(), rest),
    ])
