#!/usr/bin/env python3
"""Train and HONESTLY evaluate a work-strain classifier on the public SWELL-KW
computer-interaction dataset (CC BY-NC-SA 4.0, https://doi.org/10.17026/dans-x55-69zp).

Task: from one minute of keyboard + mouse activity counts, predict whether the
person was in a NEUTRAL work condition (0) or a STRAINED one (1 = interrupted or
under time pressure). This is work context, NOT a medical diagnosis.

Evaluation is leave-participants-out (StratifiedGroupKFold by participant), so the
model is always tested on people it never trained on. We report false positives
and false negatives SEPARATELY, against a majority-class baseline, as the
hackathon brief requires. This is a prototype and is not medical advice.
"""
import json
import hashlib
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    average_precision_score,
    confusion_matrix,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)
from sklearn.model_selection import StratifiedGroupKFold, cross_val_predict
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "research/raw/swell-computer.csv"
OUT = ROOT / "web/public/eval"
OUT.mkdir(parents=True, exist_ok=True)

FEATURES = [
    "SnMouseAct", "SnLeftClicked", "SnRightClicked", "SnDoubleClicked", "SnWheel",
    "SnDragged", "SnMouseDistance", "SnKeyStrokes", "SnChars", "SnSpecialKeys",
    "SnDirectionKeys", "SnErrorKeys", "SnShortcutKeys", "SnSpaces", "SnAppChange",
    "SnTabfocusChange",
]
FG, GRID = "#111111", "#e3e3e3"


def rates(y_true, y_pred):
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
        "accuracy": round((tp + tn) / len(y_true), 4),
        "precision": round(tp / (tp + fp), 4) if (tp + fp) else 0.0,
        "recall_strain": round(tp / (tp + fn), 4) if (tp + fn) else 0.0,
        "specificity": round(tn / (tn + fp), 4) if (tn + fp) else 0.0,
        "false_positive_rate": round(fp / (fp + tn), 4) if (fp + tn) else 0.0,
        "false_negative_rate": round(fn / (fn + tp), 4) if (fn + tp) else 0.0,
    }


def style(ax, title):
    ax.set_title(title, color=FG, fontsize=12, fontweight="bold")
    for s in ax.spines.values():
        s.set_color(GRID)
    ax.tick_params(colors=FG)
    ax.xaxis.label.set_color(FG)
    ax.yaxis.label.set_color(FG)


def save(fig, name):
    fig.patch.set_facecolor("white")
    fig.savefig(OUT / name, dpi=130, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def ensure_data():
    """Download the public SWELL computer-interaction CSV if it is not present."""
    if CSV.exists():
        return
    import urllib.request

    CSV.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve("https://ssh.datastations.nl/api/access/datafile/189419", CSV)
    got = hashlib.sha1(CSV.read_bytes()).hexdigest()
    if got != "2faba3261a90567f30c5120efd37cc19d56de62a":
        CSV.unlink(missing_ok=True)
        raise RuntimeError(f"SWELL file checksum mismatch ({got}); refusing to use it.")


def main():
    ensure_data()
    df = pd.read_csv(CSV, encoding="utf-8-sig")
    df.columns = [c.strip() for c in df.columns]
    df = df[df["Condition"].isin(["N", "I", "T"])].copy()
    for col in FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df = df.dropna(subset=FEATURES)

    X = df[FEATURES].to_numpy(dtype=float)
    y = (df["Condition"] != "N").astype(int).to_numpy()
    groups = df["PP"].to_numpy()

    n_participants = len(np.unique(groups))
    prevalence = float(y.mean())
    print(f"rows={len(df)} participants={n_participants} strain_prevalence={prevalence:.3f}")

    cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=7)

    models = {
        "logistic_regression": make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced")),
        "random_forest": RandomForestClassifier(n_estimators=300, class_weight="balanced", random_state=7),
    }

    majority = int(round(prevalence))
    baseline_pred = np.full_like(y, majority)
    report = {
        "dataset": "SWELL-KW computer-interaction minute features",
        "source": "https://doi.org/10.17026/dans-x55-69zp",
        "license": "CC BY-NC-SA 4.0",
        "sha256": hashlib.sha256(CSV.read_bytes()).hexdigest(),
        "rows": int(len(df)),
        "participants": int(n_participants),
        "strain_prevalence": round(prevalence, 4),
        "task": "Predict strained (interrupted/time-pressure) vs neutral work minute from keyboard+mouse activity.",
        "evaluation": "Leave-participants-out StratifiedGroupKFold (5-fold); pooled out-of-fold predictions.",
        "baseline_majority_class": rates(y, baseline_pred),
        "models": {},
    }

    roc_fig, roc_ax = plt.subplots(figsize=(5, 4))
    pr_fig, pr_ax = plt.subplots(figsize=(5, 4))
    roc_ax.plot([0, 1], [0, 1], "--", color=GRID)

    best_proba = None
    for name, model in models.items():
        proba = cross_val_predict(model, X, y, cv=cv, groups=groups, method="predict_proba")[:, 1]
        pred = (proba >= 0.5).astype(int)
        m = rates(y, pred)
        m["roc_auc"] = round(float(roc_auc_score(y, proba)), 4)
        m["pr_auc"] = round(float(average_precision_score(y, proba)), 4)
        report["models"][name] = m
        print(f"{name}: acc={m['accuracy']} recall={m['recall_strain']} FPR={m['false_positive_rate']} "
              f"FNR={m['false_negative_rate']} ROC-AUC={m['roc_auc']}")

        fpr, tpr, _ = roc_curve(y, proba)
        roc_ax.plot(fpr, tpr, label=f"{name.replace('_', ' ')} (AUC {m['roc_auc']})")
        prec, rec, _ = precision_recall_curve(y, proba)
        pr_ax.plot(rec, prec, label=f"{name.replace('_', ' ')} (AP {m['pr_auc']})")
        if name == "logistic_regression":
            best_proba, best_pred, best = proba, pred, m

    style(roc_ax, "ROC — strain vs neutral")
    roc_ax.set_xlabel("False positive rate")
    roc_ax.set_ylabel("True positive rate")
    roc_ax.legend(fontsize=8)
    save(roc_fig, "roc.png")

    pr_ax.axhline(prevalence, ls="--", color=GRID, label=f"baseline (AP {prevalence:.2f})")
    style(pr_ax, "Precision–recall — strain")
    pr_ax.set_xlabel("Recall")
    pr_ax.set_ylabel("Precision")
    pr_ax.legend(fontsize=8)
    save(pr_fig, "pr.png")

    cm = confusion_matrix(y, best_pred, labels=[0, 1])
    fig, ax = plt.subplots(figsize=(4.2, 4))
    ax.imshow(cm, cmap="Greys")
    ax.set_xticks([0, 1], ["neutral", "strained"])
    ax.set_yticks([0, 1], ["neutral", "strained"])
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    for i in range(2):
        for j in range(2):
            ax.text(j, i, cm[i, j], ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else FG, fontsize=14, fontweight="bold")
    style(ax, "Confusion matrix (logistic regression)")
    save(fig, "confusion-matrix.png")

    lr = make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced")).fit(X, y)
    coefs = lr.named_steps["logisticregression"].coef_[0]
    order = np.argsort(np.abs(coefs))[::-1][:10][::-1]
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.barh([FEATURES[i] for i in order], [coefs[i] for i in order], color=FG)
    ax.axvline(0, color=GRID)
    style(ax, "Top features (standardised LR weight)")
    save(fig, "feature-importance.png")

    df = df.assign(_pred=best_pred, _y=y)
    by_cond = {}
    for code, label in [("N", "neutral"), ("I", "interrupted"), ("T", "time_pressure")]:
        sub = df[df["Condition"] == code]
        flagged = float((sub["_pred"] == 1).mean())
        by_cond[label] = round(flagged, 4)
    report["flagged_rate_by_condition"] = by_cond
    fig, ax = plt.subplots(figsize=(5, 4))
    ax.bar(list(by_cond), [by_cond[k] * 100 for k in by_cond], color=FG)
    ax.set_ylabel("% of minutes flagged as strained")
    ax.set_ylim(0, 100)
    style(ax, "Flagged rate by true condition")
    save(fig, "by-condition.png")

    (ROOT / "research/swell-strain-metrics.json").write_text(json.dumps(report, indent=2) + "\n")
    print("baseline:", report["baseline_majority_class"])
    print("logistic_regression:", best)
    print("by condition:", by_cond)
    print(f"wrote graphs to {OUT} and research/swell-strain-metrics.json")


if __name__ == "__main__":
    main()
