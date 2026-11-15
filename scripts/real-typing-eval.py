#!/usr/bin/env python3
"""Test the check-in on real people's typing instead of simulated typists.

Data: CMU Keystroke Dynamics Benchmark (51 people, 8 sessions, 400 password repetitions each).
Five consecutive repetitions make one "check-in" (55 key holds, 50 key-to-key intervals), so every
typist has 80 real check-ins in the order they typed them.

Question: over a real person's ordinary variation, how often does the check-in raise a false alarm,
and how large must a slowdown be before it is detected?

"Unchanged" examples are real check-ins compared with that person's previous check-ins.
"Changed" examples are the same real check-ins with a slowdown injected (key holds stretched, or
key-to-key rhythm made more uneven). The change is injected because no public typing dataset with
fatigue labels could be obtained; the noise it has to be detected over is real.

Every number is from typists the model never trained on (5 folds, split by typist).
"""
import hashlib
import io
import json
from pathlib import Path
from urllib.request import urlopen

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupKFold

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "research" / "raw" / "DSL-StrongPasswordData.csv"
URL = "https://www.cs.cmu.edu/~keystroke/DSL-StrongPasswordData.csv"
MD5 = "470235f96568f28f9ea0da62234ec857"
OUT = ROOT / "research" / "real-typing-eval.json"
LIVE_OUT = ROOT / "research" / "live-typing-model.json"
FALSE_ALARM_BUDGET = 0.10   # product choice: at most about 1 unchanged check-in in 10 is flagged
PAUSE_RULE = 1.5            # sentence pause has no real data; its weight makes 1.5x usual flag by itself
FIGS = ROOT / "web" / "public" / "eval"

REPS_PER_CHECKIN = 5
BASELINE = 5            # the app's default: median of the previous check-ins
FIRST_TEST = 20         # every baseline size is scored on the same check-ins (20..79)
HOLD_RULE, RHYTHM_RULE = 1.15, 1.25   # the hand-set thresholds in src/config.js
SIMULATION_WEIGHTS = [-2.18840285, 7.62038916, 6.63902206, 6.61257756]   # the earlier model, trained on simulated typists
RNG = np.random.default_rng(360)


def load():
    if RAW.exists():
        data = RAW.read_bytes()
    else:
        with urlopen(URL, timeout=60) as response:
            data = response.read()
        RAW.parent.mkdir(parents=True, exist_ok=True)
        RAW.write_bytes(data)
    if hashlib.md5(data).hexdigest() != MD5:
        raise ValueError("CMU file does not match the publisher checksum")
    return pd.read_csv(io.BytesIO(data))


def checkins(frame):
    """Per typist: arrays of raw holds and key-to-key intervals (ms) for each of 80 check-ins."""
    hold_cols = [c for c in frame.columns if c.startswith("H.")]
    dd_cols = [c for c in frame.columns if c.startswith("DD.")]
    typists = {}
    for subject, rows in frame.groupby("subject", sort=True):
        rows = rows.sort_values(["sessionIndex", "rep"])
        holds = rows[hold_cols].to_numpy() * 1000
        gaps = rows[dd_cols].to_numpy() * 1000
        n = len(rows) // REPS_PER_CHECKIN
        typists[subject] = {
            "holds": holds[: n * REPS_PER_CHECKIN].reshape(n, -1),
            "gaps": gaps[: n * REPS_PER_CHECKIN].reshape(n, -1),
            "session": rows["sessionIndex"].to_numpy()[::REPS_PER_CHECKIN][:n],
        }
    return typists


def measures(holds, gaps, hold_factor=1.0, rhythm_factor=1.0):
    """The app's two measures that exist in this data: median key hold and rhythm (SD of gaps)."""
    gaps = gaps.mean() + (gaps - gaps.mean()) * rhythm_factor
    return np.median(holds * hold_factor), gaps.std()


def build(typists, baseline_size=BASELINE, hold_factor=None, rhythm_factor=None):
    """One unchanged and one changed example per real check-in from FIRST_TEST onward."""
    rows = []
    for subject, t in typists.items():
        base = np.array([measures(h, g) for h, g in zip(t["holds"], t["gaps"])])
        for i in range(FIRST_TEST, len(base)):
            prior = base[i - baseline_size:i]
            usual = np.median(prior, axis=0)
            spread = np.maximum(prior.std(axis=0), 0.02 * usual) if baseline_size > 1 else 0.05 * usual
            new_session = t["session"][i] != t["session"][i - 1]
            for changed in (0, 1):
                hf = rf = 1.0
                kind = "none"
                if changed:
                    if hold_factor is None and rhythm_factor is None:
                        kind = "hold" if RNG.random() < 0.5 else "rhythm"
                        size = RNG.uniform(1.1, 1.6)
                        hf, rf = (size, 1.0) if kind == "hold" else (1.0, size)
                    else:
                        hf, rf = hold_factor or 1.0, rhythm_factor or 1.0
                        kind = "hold" if hold_factor else "rhythm"
                now = np.array(measures(t["holds"][i], t["gaps"][i], hf, rf))
                ratio = now / usual
                rows.append({
                    "typist": subject, "changed": changed, "kind": kind, "new_session": bool(new_session),
                    "hold_ratio": ratio[0], "rhythm_ratio": ratio[1],
                    "hold_up": max(0.0, np.log1p(now[0]) - np.log1p(usual[0])),
                    "rhythm_up": max(0.0, np.log1p(now[1]) - np.log1p(usual[1])),
                    "hold_z": (now[0] - usual[0]) / spread[0],
                    "rhythm_z": (now[1] - usual[1]) / spread[1],
                })
    return pd.DataFrame(rows)


def rule(frame):
    return ((frame.hold_ratio > HOLD_RULE) | (frame.rhythm_ratio > RHYTHM_RULE)).to_numpy()


def rule_score(frame):
    return np.maximum(frame.hold_ratio / HOLD_RULE, frame.rhythm_ratio / RHYTHM_RULE).to_numpy()


def live_score(frame):
    # The earlier live model (trained on simulated typists). No sentence pause in this data.
    w = SIMULATION_WEIGHTS
    return w[0] + w[1] * frame.hold_up.to_numpy() + w[3] * frame.rhythm_up.to_numpy()


MODELS = {
    "ratio_model": ["hold_up", "rhythm_up"],          # same inputs as the live model, trained on real typing
    "personal_spread_model": ["hold_z", "rhythm_z"],  # change measured in units of that person's own spread
}


def fit(train, columns):
    return LogisticRegression(C=1.0, max_iter=1000).fit(train[columns], train.changed)


def reliability(typists):
    """Is each candidate measure steady for the same person? Less wobble means fewer false alarms."""
    candidates = {
        "median key hold": lambda h, g: np.median(h),
        "spread of key holds (IQR)": lambda h, g: np.subtract(*np.percentile(h, [75, 25])),
        "median key-to-key time (speed)": lambda h, g: np.median(g),
        "rhythm: SD of key-to-key times (the app's measure)": lambda h, g: g.std(),
        "rhythm: robust spread of key-to-key times (IQR)": lambda h, g: np.subtract(*np.percentile(g, [75, 25])),
    }
    table = {}
    for name, f in candidates.items():
        within, across, above = [], [], []
        for t in typists.values():
            v = np.array([f(h, g) for h, g in zip(t["holds"], t["gaps"])])[FIRST_TEST - BASELINE:]
            sess = t["session"][FIRST_TEST - BASELINE:]
            within.append(np.mean([v[sess == k].std() / v[sess == k].mean() for k in np.unique(sess)]))
            across.append(v.std() / v.mean())
            usual = np.array([np.median(v[i - BASELINE:i]) for i in range(BASELINE, len(v))])
            above.append(np.mean(v[BASELINE:] / usual > 1.15))
        table[name] = {"wobble_within_a_sitting_pct": round(100 * float(np.median(within)), 1),
                       "wobble_across_sittings_pct": round(100 * float(np.median(across)), 1),
                       "untouched_check_ins_more_than_15pct_above_usual": round(float(np.mean(above)), 4)}
    return table


def at_budget(data, score, folds):
    """Set each method's threshold on the training typists so about 10% of unchanged check-ins flag,
    then count on the held-out typists. Puts every method on the same false-alarm footing."""
    flagged = np.zeros(len(data), bool)
    for train, test in folds:
        calm = score[train][data.changed.to_numpy()[train] == 0]
        flagged[test] = score[test] > np.quantile(calm, 1 - FALSE_ALARM_BUDGET)
    return flagged


def counts(truth, flagged):
    tp = int((flagged & (truth == 1)).sum()); fn = int((~flagged & (truth == 1)).sum())
    fp = int((flagged & (truth == 0)).sum()); tn = int((~flagged & (truth == 0)).sum())
    return {"true_positives": tp, "false_negatives": fn, "false_positives": fp, "true_negatives": tn,
            "accuracy": round((tp + tn) / len(truth), 4), "false_positive_rate": round(fp / (fp + tn), 4),
            "false_negative_rate": round(fn / (tp + fn), 4)}


def typist_interval(frame, flagged, column_value, draws=1000):
    """95% interval from resampling whole typists (check-ins from one person are not independent)."""
    frame = frame.assign(flagged=flagged)
    per = frame[frame.changed == column_value].groupby("typist").flagged.agg(["sum", "count"]).to_numpy()
    rates = []
    for _ in range(draws):
        pick = per[RNG.integers(0, len(per), len(per))]
        rates.append(pick[:, 0].sum() / pick[:, 1].sum())
    return [round(float(np.percentile(rates, 2.5)), 4), round(float(np.percentile(rates, 97.5)), 4)]


def main():
    typists = checkins(load())
    data = build(typists)
    folds = list(GroupKFold(n_splits=5).split(data, groups=data.typist))

    flagged = {"always_usual": np.zeros(len(data), bool), "hand_set_rule": rule(data),
               "live_model_trained_on_simulation": live_score(data) >= 0}
    scores = {"hand_set_rule": rule_score(data), "live_model_trained_on_simulation": live_score(data)}
    fitted = {}
    for name, columns in MODELS.items():
        score = np.zeros(len(data))
        for train, test in folds:
            model = fit(data.iloc[train], columns)
            score[test] = model.decision_function(data.iloc[test][columns])
        scores[name], flagged[name] = score, score >= 0
        fitted[name] = fit(data, columns)
    # A more flexible learner on every input, to see whether the simple model leaves accuracy behind.
    everything = ["hold_up", "rhythm_up", "hold_z", "rhythm_z", "hold_ratio", "rhythm_ratio"]
    boosted = np.zeros(len(data))
    for train, test in folds:
        gb = GradientBoostingClassifier(n_estimators=150, max_depth=3, learning_rate=0.05, random_state=0)
        gb.fit(data.iloc[train][everything], data.changed.iloc[train])
        boosted[test] = gb.predict_proba(data.iloc[test][everything])[:, 1] - 0.5
    scores["gradient_boosting_all_inputs"], flagged["gradient_boosting_all_inputs"] = boosted, boosted >= 0

    truth = data.changed.to_numpy()
    results = {}
    for name, flag in flagged.items():
        entry = counts(truth, flag)
        entry["false_positive_rate_95ci"] = typist_interval(data, flag, 0)
        entry["false_negative_rate_95ci"] = [round(1 - x, 4) for x in typist_interval(data, flag, 1)[::-1]]
        if name in scores:
            entry["roc_auc"] = round(float(roc_auc_score(truth, scores[name])), 4)
        results[name] = entry
    same_footing = {}
    for name, score in scores.items():
        flag = at_budget(data, score, folds)
        entry = counts(truth, flag)
        entry["detection_rate"] = round(1 - entry["false_negative_rate"], 4)
        entry["detection_rate_95ci"] = typist_interval(data, flag, 1)
        same_footing[name] = entry

    # Where false alarms come from: the first check-in of a new sitting vs later ones, and per typist.
    unchanged = data[data.changed == 0]
    drift = {}
    for name in ("hand_set_rule", "personal_spread_model"):
        f = pd.Series(flagged[name], index=data.index)[unchanged.index]
        per_typist = f.groupby(unchanged.typist).mean()
        drift[name] = {
            "first_check_in_of_a_new_session": round(float(f[unchanged.new_session].mean()), 4),
            "later_check_ins_same_session": round(float(f[~unchanged.new_session].mean()), 4),
            "per_typist_false_alarm_rate": {"lowest": round(float(per_typist.min()), 4), "median": round(float(per_typist.median()), 4),
                                            "highest": round(float(per_typist.max()), 4),
                                            "typists_above_20_percent": int((per_typist > 0.2).sum())},
        }

    # How large must a slowdown be? Detection rate by injected size, on held-out typists.
    sizes = [1.05, 1.10, 1.15, 1.20, 1.30, 1.50]
    sensitivity = {"sizes": sizes}
    for kind in ("hold", "rhythm"):
        sensitivity[kind] = {name: [] for name in ("hand_set_rule", "ratio_model", "personal_spread_model")}
        for size in sizes:
            frame = build(typists, **{f"{kind}_factor": size})
            changed = frame[frame.changed == 1]
            sensitivity[kind]["hand_set_rule"].append(round(float(rule(changed).mean()), 4))
            for name, columns in MODELS.items():
                hits = np.zeros(len(changed), bool)
                for train, test in GroupKFold(n_splits=5).split(changed, groups=changed.typist):
                    held_out = changed.iloc[test]
                    model = fit(data[~data.typist.isin(held_out.typist.unique())], columns)
                    hits[test] = model.decision_function(held_out[columns]) >= 0
                sensitivity[kind][name].append(round(float(hits.mean()), 4))

    # Week one: how do false alarms and detection change with the number of earlier check-ins?
    cold_start = {"baseline_check_ins": [1, 2, 3, 5, 10, 20], "false_positive_rate": {}, "detection_rate": {}}
    for name in ("hand_set_rule", "personal_spread_model"):
        cold_start["false_positive_rate"][name], cold_start["detection_rate"][name] = [], []
    for size in cold_start["baseline_check_ins"]:
        frame = build(typists, baseline_size=size)
        flag = {"hand_set_rule": rule(frame)}
        score = np.zeros(len(frame))
        for train, test in GroupKFold(n_splits=5).split(frame, groups=frame.typist):
            columns = MODELS["personal_spread_model"]
            score[test] = fit(frame.iloc[train], columns).decision_function(frame.iloc[test][columns])
        flag["personal_spread_model"] = score >= 0
        for name, f in flag.items():
            cold_start["false_positive_rate"][name].append(round(float(f[frame.changed == 0].mean()), 4))
            cold_start["detection_rate"][name].append(round(float(f[frame.changed == 1].mean()), 4))

    report = {
        "source": URL,
        "what_is_real": "Every check-in is real typing by one of 51 people. Unchanged examples are untouched.",
        "what_is_injected": "Changed examples are the same real check-ins with key holds stretched or rhythm made more uneven by 1.1x to 1.6x. No fatigue-labelled public typing data could be obtained.",
        "typists": len(typists), "check_ins_per_typist": 80, "repetitions_per_check_in": REPS_PER_CHECKIN,
        "scored_check_ins": int(len(data) / 2), "examples": int(len(data)),
        "baseline": f"median of the previous {BASELINE} check-ins",
        "validation": "5 folds split by typist; every number is from typists the model never trained on",
        "measures": "median key hold and key-to-key rhythm (the fixed password has no sentence pause)",
        "results_at_default_thresholds": results,
        "false_alarm_budget": FALSE_ALARM_BUDGET,
        "results_at_10pct_false_alarm_budget": same_footing,
        "measure_reliability": reliability(typists),
        "false_alarm_sources": drift,
        "sensitivity": sensitivity,
        "cold_start": cold_start,
        "deployable_weights": {name: {"intercept": round(float(m.intercept_[0]), 6),
                                      **{c: round(float(w), 6) for c, w in zip(MODELS[name], m.coef_[0])}}
                               for name, m in fitted.items()},
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n")

    # The model the app runs: ratio inputs trained on all 51 real typists, threshold moved so about
    # 10% of unchanged real check-ins flag. Sentence pause is absent from this data, so its weight is
    # set so that a pause 1.5x usual flags by itself, the same point as the hand-set rule.
    m = fitted["ratio_model"]
    calm = m.decision_function(data.loc[data.changed == 0, MODELS["ratio_model"]])
    intercept = float(m.intercept_[0]) - float(np.quantile(calm, 1 - FALSE_ALARM_BUDGET))
    hold_w, rhythm_w = (float(w) for w in m.coef_[0])
    pause_w = -intercept / (np.log1p(PAUSE_RULE * 1000) - np.log1p(1000))
    LIVE_OUT.write_text(json.dumps({
        "method": "Logistic regression trained on real typing (CMU Keystroke Dynamics Benchmark, 51 typists)",
        "inputs": "max(0, log(1 + current) - log(1 + usual)) for key hold, sentence pause and rhythm",
        "weights": [round(intercept, 6), round(hold_w, 6), round(float(pause_w), 6), round(rhythm_w, 6)],
        "threshold": f"moved so about {int(FALSE_ALARM_BUDGET * 100)}% of unchanged real check-ins flag",
        "sentence_pause": "not present in the training data; weight set so a pause 1.5x usual flags by itself",
        "evaluation": "research/real-typing-eval.json (held-out typists)",
    }, indent=2) + "\n")

    FIGS.mkdir(parents=True, exist_ok=True)
    label = {"hand_set_rule": "Hand-set rule", "ratio_model": "Model, ratio inputs", "personal_spread_model": "Model, personal-spread inputs"}
    color = {"hand_set_rule": "#888888", "ratio_model": "#3b82c4", "personal_spread_model": "#111111"}
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.6), sharey=True)
    for ax, kind, title in zip(axes, ("hold", "rhythm"), ("Key holds made longer", "Rhythm made more uneven")):
        for name in label:
            ax.plot([(s - 1) * 100 for s in sizes], [v * 100 for v in sensitivity[kind][name]], marker="o", color=color[name], label=label[name])
        ax.set_title(title, fontsize=11); ax.set_xlabel("Injected change (%)"); ax.grid(alpha=0.25)
    axes[0].set_ylabel("Changes detected (%)"); axes[0].legend(fontsize=8, frameon=False)
    fig.suptitle("How large must a change be? Real typists, held-out", fontsize=11)
    fig.tight_layout(); fig.savefig(FIGS / "real-sensitivity.png", dpi=160); plt.close(fig)

    fig, ax = plt.subplots(figsize=(5.2, 3.6))
    for name in ("hand_set_rule", "personal_spread_model"):
        ax.plot(cold_start["baseline_check_ins"], [v * 100 for v in cold_start["false_positive_rate"][name]], marker="o", color=color[name], label=f"{label[name]}: false alarms")
        ax.plot(cold_start["baseline_check_ins"], [v * 100 for v in cold_start["detection_rate"][name]], marker="s", linestyle="--", color=color[name], label=f"{label[name]}: detected")
    ax.set_xscale("log"); ax.set_xticks(cold_start["baseline_check_ins"]); ax.set_xticklabels(cold_start["baseline_check_ins"])
    ax.set_xlabel("Earlier check-ins in the baseline"); ax.set_ylabel("% of check-ins"); ax.grid(alpha=0.25); ax.legend(fontsize=7, frameon=False)
    ax.set_title("Week one: baseline size", fontsize=11)
    fig.tight_layout(); fig.savefig(FIGS / "real-cold-start.png", dpi=160); plt.close(fig)

    for name, r in same_footing.items():
        print(f"{name:36s} false alarms {r['false_positive_rate']:.3f}  detected {r['detection_rate']:.3f} {r['detection_rate_95ci']}  AUC {results[name].get('roc_auc')}")
    print(json.dumps(report["measure_reliability"], indent=1))
    print(LIVE_OUT.read_text())


if __name__ == "__main__":
    main()
