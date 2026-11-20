"""Research-only: early Parkinson's vs controls from natural typing (neuroQWERTY, MIT-CS1PD + MIT-CS2PD).

Public PhysioNet data (Giancardo et al., Scientific Reports 2016), ODC-By 1.0. Labels are
clinician diagnoses; participants typed freely for about 15 minutes. Each person is ONE row,
so cross-validation never puts a person in both training and test sets. Nothing here is
deployed in the app.

    pip install numpy scikit-learn
    python scripts/neuroqwerty-eval.py

Writes research/neuroqwerty-eval.json.
"""

import csv
import hashlib
import io
import json
import re
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
RAW = ROOT / 'research' / 'raw' / 'nq'
BASE = 'https://physionet.org/files/nqmitcsxpd/1.0.0/'  # redirects to PhysioNet's open S3 mirror
SEED = 360
BINS = np.linspace(0, 0.5, 11)  # hold-time histogram, 50 ms bins up to 500 ms
LONG_META = re.compile(r'^"?(Shift|Alt|Control).*')
MOUSE = re.compile(r'^"?mouse')


def fetch(rel):
    path = RAW / rel
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        with urlopen(BASE + rel, timeout=60) as source:
            path.write_bytes(source.read())
    return path


def checksums():
    with urlopen(BASE + 'SHA256SUMS.txt', timeout=30) as source:
        return {name: digest for digest, name in (line.split() for line in source.read().decode().splitlines() if line.strip())}


def load_file(path):
    """Follows the official loader: drop mouse and long-held modifier keys, 0 <= hold < 5 s."""
    holds, starts = [], []
    for row in csv.reader(io.StringIO(path.read_text(errors='replace'))):
        if len(row) < 4 or MOUSE.match(row[0]) or LONG_META.match(row[0]):
            continue
        try:
            hold, start = float(row[1]), float(row[3])
        except ValueError:
            continue
        if 0 <= hold < 5 and start > 0:
            holds.append(hold); starts.append(start)
    holds = np.array(holds)
    flights = np.diff(np.array(starts))
    flights = flights[(flights > 0) & (flights < 3)]
    return holds, flights


def features(holds, flights):
    hist = np.histogram(np.clip(holds, 0, 0.4999), bins=BINS)[0] / max(1, len(holds))
    q = lambda v, p: float(np.percentile(v, p)) if len(v) else 0.0
    return [q(holds, 50), q(holds, 75) - q(holds, 25), q(holds, 90), float(np.std(holds)), q(flights, 50), q(flights, 75) - q(flights, 25), *hist.tolist()]


FEATURE_NAMES = ['hold_median', 'hold_iqr', 'hold_p90', 'hold_sd', 'flight_median', 'flight_iqr', *[f'hold_hist_{int(a*1000)}_{int(b*1000)}ms' for a, b in zip(BINS[:-1], BINS[1:])]]


def evaluate(make, X, y):
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=20, random_state=SEED)
    total, counts, aucs = np.zeros(len(y)), np.zeros(len(y)), []
    for train, test in cv.split(X, y):
        p = make().fit(X[train], y[train]).predict_proba(X[test])[:, 1]
        aucs.append(roc_auc_score(y[test], p)); total[test] += p; counts[test] += 1
    pooled = total / counts
    fpr, tpr, _ = roc_curve(y, pooled)
    return {'roc_auc_mean': round(float(np.mean(aucs)), 3),
            'roc_auc_fold_range': [round(float(np.percentile(aucs, 5)), 3), round(float(np.percentile(aucs, 95)), 3)],
            'sensitivity_at_90pct_specificity': round(float(max((t for f, t in zip(fpr, tpr) if f <= 0.10), default=0.0)), 3)}


def short_sample_eval(people, y, keystrokes, make, samples=5):
    """Train on full sessions; test held-out people on random short windows, like a check-in."""
    rng = np.random.default_rng(SEED)
    X_full = np.array([features(h, f) for h, f in people])
    cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=10, random_state=SEED)
    aucs = []
    for train, test in cv.split(X_full, y):
        model = make().fit(X_full[train], y[train])
        scores = []
        for i in test:
            h, f = people[i]
            probs = []
            for _ in range(samples):
                start = rng.integers(0, max(1, len(h) - keystrokes))
                probs.append(model.predict_proba(np.array([features(h[start:start + keystrokes], f[start:start + keystrokes])]))[0, 1])
            scores.append(probs[0])  # one check-in, not an average of several
        aucs.append(roc_auc_score(y[test], scores))
    return round(float(np.mean(aucs)), 3)


def tappy_people():
    """Per-person hold and flight arrays from the Tappy archive downloaded by condition-screening-eval.py."""
    import zipfile
    from collections import defaultdict
    users, data = ROOT / 'research/raw/tappy-users.zip', ROOT / 'research/raw/tappy-data.zip'
    if not (users.exists() and data.exists()):
        return None
    labels = {}
    with zipfile.ZipFile(users) as z:
        for name in z.namelist():
            if name.endswith('.txt'):
                fields = dict(l.split(':', 1) for l in z.read(name).decode(errors='replace').splitlines() if ':' in l)
                if fields.get('Parkinsons', '').strip() in ('True', 'False'):
                    labels[Path(name).stem.removeprefix('User_')] = fields['Parkinsons'].strip() == 'True'
    holds, flights = defaultdict(list), defaultdict(list)
    with zipfile.ZipFile(data) as z:
        for name in z.namelist():
            if not name.endswith('.txt'):
                continue
            for line in io.TextIOWrapper(z.open(name), encoding='utf-8', errors='replace'):
                c = line.rstrip().split('\t')
                try:
                    user, hold, flight = c[0], float(c[4]) / 1000, float(c[7]) / 1000
                except (ValueError, IndexError):
                    continue
                if user in labels and 0 <= hold < 5:
                    holds[user].append(hold)
                    if 0 < flight < 3:
                        flights[user].append(flight)
    keep = [u for u in holds if len(holds[u]) >= 200]
    return np.array([features(np.array(holds[u]), np.array(flights[u])) for u in keep]), np.array([labels[u] for u in keep], dtype=int)


def main():
    sums = checksums()
    rows, labels, published, people = [], [], [], []
    for cohort in ['MIT-CS1PD', 'MIT-CS2PD']:
        gt = fetch(f'{cohort}/GT_DataPD_{cohort}.csv')
        if hashlib.sha256(gt.read_bytes()).hexdigest() != sums[f'{cohort}/GT_DataPD_{cohort}.csv']:
            raise RuntimeError(f'Checksum mismatch: {cohort} labels')
        for person in csv.DictReader(io.StringIO(gt.read_text())):
            files = [person[k] for k in ('file_1', 'file_2') if person.get(k)]
            holds, flights = [], []
            for name in files:
                rel = f'{cohort}/data_{cohort}/{name}'
                path = fetch(rel)
                if hashlib.sha256(path.read_bytes()).hexdigest() != sums[rel]:
                    raise RuntimeError(f'Checksum mismatch: {rel}')
                h, f = load_file(path); holds.append(h); flights.append(f)
            holds, flights = np.concatenate(holds), np.concatenate(flights)
            if len(holds) < 200:
                continue
            rows.append(features(holds, flights)); labels.append(person['gt'] == 'True'); people.append((holds, flights))
            published.append(float(person['nqScore']) if person.get('nqScore') else np.nan)
    X, y = np.array(rows), np.array(labels, dtype=int)
    pub = np.array(published)
    ok = ~np.isnan(pub)
    external = None
    tappy = tappy_people()
    if tappy is not None:
        Xt, yt = tappy
        model = RandomForestClassifier(n_estimators=500, min_samples_leaf=3, class_weight='balanced', random_state=SEED).fit(X, y)
        external = {'participants': int(len(yt)), 'with_parkinsons': int(yt.sum()), 'roc_auc': round(float(roc_auc_score(yt, model.predict_proba(Xt)[:, 1])), 3)}
    result = {
        'dataset': 'neuroQWERTY MIT-CS1PD + MIT-CS2PD (PhysioNet)', 'license': 'ODC-By 1.0',
        'labels': "Clinician diagnosis of early Parkinson's disease vs controls",
        'participants': int(len(y)), 'with_parkinsons': int(y.sum()), 'without': int(len(y) - y.sum()),
        'features': FEATURE_NAMES,
        'validation': '5-fold stratified CV repeated 20 times; one row per person.',
        'models': {
            'chance': {'roc_auc_mean': 0.5},
            'logistic_regression': evaluate(lambda: make_pipeline(StandardScaler(), LogisticRegression(C=0.3, class_weight='balanced', max_iter=4000)), X, y),
            'random_forest': evaluate(lambda: RandomForestClassifier(n_estimators=500, min_samples_leaf=3, class_weight='balanced', random_state=SEED), X, y),
        },
        'short_sample_roc_auc': {
            f'{n}_keystrokes': short_sample_eval(people, y, n, lambda: RandomForestClassifier(n_estimators=300, min_samples_leaf=3, class_weight='balanced', random_state=SEED))
            for n in (70, 300, 1000)
        },
        'short_sample_note': 'Random forest trained on full sessions, tested on one random window per held-out person. 70 keystrokes is about one two-sentence check-in.',
        'external_test_on_tappy': external,
        'external_note': 'Random forest trained on all neuroQWERTY people, then tested unchanged on Tappy (different people, devices and self-reported labels).',
        'published_nqScore_auc': round(float(roc_auc_score(y[ok], pub[ok])), 3) if ok.sum() > 10 else None,
        'published_nqScore_note': "The authors' own nQi score from the dataset files, for reference. It was developed on this data, so it is not an independent test.",
        'deployed': False,
        'limits': 'Small cohort (85 people) from one research group; 15 minutes of free typing per session, not a two-sentence check-in; '
                  'no external validation. Not clinically validated and not used in the app.',
    }
    (ROOT / 'research' / 'neuroqwerty-eval.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: result[k] for k in ('participants', 'with_parkinsons', 'models', 'short_sample_roc_auc', 'external_test_on_tappy', 'published_nqScore_auc')}, indent=2))


if __name__ == '__main__':
    main()
