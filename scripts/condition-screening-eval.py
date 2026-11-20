"""Research-only: can typing timing separate self-reported Parkinson's from no Parkinson's?

Trains and evaluates per-person classifiers on the public Tappy Keystroke Data
(PhysioNet, ODC-By 1.0; Adams 2017). Each participant contributes ONE row, so
cross-validation folds never share a person. Nothing here is deployed in the app:
the output feeds the "coming soon" research card and the write-up.

    pip install numpy pandas scikit-learn
    python scripts/condition-screening-eval.py

Writes research/condition-screening-eval.json.
"""

import hashlib
import io
import json
import math
import zipfile
from collections import defaultdict
from pathlib import Path
from urllib.request import urlopen

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, roc_curve
from sklearn.model_selection import RepeatedStratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'research' / 'raw'
BASE = 'https://physionet.org/files/tappy/1.0.0/'
MIN_EVENTS = 100
SEED = 360


def download(name, remote):
    RAW.mkdir(parents=True, exist_ok=True)
    path = RAW / name
    if not path.exists():
        with urlopen(BASE + remote, timeout=120) as source:
            path.write_bytes(source.read())
    return path


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load():
    users = download('tappy-users.zip', 'Archived-users.zip')
    data = download('tappy-data.zip', 'Archived-Data.zip')
    with urlopen(BASE + 'SHA256SUMS.txt', timeout=30) as source:
        expected = {n.lstrip('*'): c for c, n in (l.split() for l in source.read().decode().splitlines() if l.strip())}
    for path, name in [(users, 'Archived-users.zip'), (data, 'Archived-Data.zip')]:
        if sha(path) != expected[name]:
            raise RuntimeError(f'Checksum mismatch: {name}')

    labels = {}
    with zipfile.ZipFile(users) as archive:
        for name in archive.namelist():
            if name.endswith('.txt'):
                fields = dict(l.split(':', 1) for l in archive.read(name).decode(errors='replace').splitlines() if ':' in l)
                label = fields.get('Parkinsons', '').strip()
                if label in ('True', 'False'):
                    labels[Path(name).stem.removeprefix('User_')] = label == 'True'

    # Columns: UserKey, Date, Timestamp, Hand, Hold time, Direction, Latency time, Flight time
    events = defaultdict(lambda: {'hold': [], 'latency': [], 'flight': [], 'hold_L': [], 'hold_R': []})
    with zipfile.ZipFile(data) as archive:
        for name in archive.namelist():
            if not name.endswith('.txt'):
                continue
            for line in io.TextIOWrapper(archive.open(name), encoding='utf-8', errors='replace'):
                c = line.rstrip().split('\t')
                try:
                    user, hand, hold, latency, flight = c[0], c[3], float(c[4]), float(c[6]), float(c[7])
                except (ValueError, IndexError):
                    continue
                if user not in labels or not (0 < hold <= 1000) or not (0 < latency <= 3000) or not math.isfinite(flight):
                    continue
                e = events[user]
                e['hold'].append(hold); e['latency'].append(latency); e['flight'].append(flight)
                if hand in ('L', 'R'):
                    e[f'hold_{hand}'].append(hold)
    return labels, events, {'users': sha(users), 'data': sha(data)}


FEATURES = ['hold_median', 'hold_iqr', 'latency_median', 'latency_iqr', 'flight_median', 'flight_iqr', 'hand_hold_asymmetry']


def features(e):
    q = lambda v, p: float(np.percentile(v, p))
    left, right = e['hold_L'], e['hold_R']
    asym = abs(np.median(left) - np.median(right)) if len(left) >= 20 and len(right) >= 20 else 0.0
    return [q(e['hold'], 50), q(e['hold'], 75) - q(e['hold'], 25), q(e['latency'], 50), q(e['latency'], 75) - q(e['latency'], 25),
            q(e['flight'], 50), q(e['flight'], 75) - q(e['flight'], 25), float(asym)]


def evaluate(model_factory, X, y):
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=SEED)
    scores = np.zeros(len(y)); counts = np.zeros(len(y)); aucs = []
    for train, test in cv.split(X, y):
        model = model_factory().fit(X[train], y[train])
        p = model.predict_proba(X[test])[:, 1]
        aucs.append(roc_auc_score(y[test], p))
        scores[test] += p; counts[test] += 1
    pooled = scores / counts
    fpr, tpr, _ = roc_curve(y, pooled)
    sens_at_90_spec = float(max((t for f, t in zip(fpr, tpr) if f <= 0.10), default=0.0))
    return {'roc_auc_mean': round(float(np.mean(aucs)), 3), 'roc_auc_fold_range': [round(float(np.percentile(aucs, 5)), 3), round(float(np.percentile(aucs, 95)), 3)],
            'sensitivity_at_90pct_specificity': round(sens_at_90_spec, 3)}


def main():
    labels, events, hashes = load()
    users = sorted(u for u, e in events.items() if len(e['hold']) >= MIN_EVENTS)
    X = np.array([features(events[u]) for u in users])
    y = np.array([labels[u] for u in users], dtype=int)
    result = {
        'dataset': 'Tappy Keystroke Data v1.0.0 (PhysioNet)', 'license': 'ODC-By 1.0', 'sha256': hashes,
        'labels': 'Self-reported Parkinson\'s diagnosis (True/False)',
        'participants': int(len(y)), 'with_parkinsons': int(y.sum()), 'without': int(len(y) - y.sum()),
        'features': FEATURES,
        'validation': '5-fold stratified CV repeated 10 times; one row per person, so no person is in both train and test.',
        'models': {
            'chance': {'roc_auc_mean': 0.5},
            'logistic_regression': evaluate(lambda: make_pipeline(StandardScaler(), LogisticRegression(class_weight='balanced', max_iter=2000)), X, y),
            'random_forest': evaluate(lambda: RandomForestClassifier(n_estimators=400, min_samples_leaf=3, class_weight='balanced', random_state=SEED), X, y),
        },
        'deployed': False,
        'limits': 'Self-reported labels; uncontrolled devices, medication and age; small cohort; free typing not two-sentence check-ins. '
                  'Not clinically validated. Results do not transfer to Predict 360 users and must not be shown as a diagnosis.',
    }
    out = ROOT / 'research' / 'condition-screening-eval.json'
    out.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result['models'], indent=2))


if __name__ == '__main__':
    main()
