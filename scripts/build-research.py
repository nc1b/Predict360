#!/usr/bin/env python3
"""Reproduce public-only, participant-weighted research reference summaries.

No app users or private logs are accepted as inputs. This is descriptive
benchmarking, not clinical model training or a diagnostic threshold generator.
"""
import csv
import hashlib
import io
import json
import math
import statistics
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'research/raw'
RAW.mkdir(parents=True, exist_ok=True)

def download(name, urls):
    target = RAW / name
    if not target.exists():
        for url in urls:
            try:
                with urllib.request.urlopen(url, timeout=60) as source:
                    target.write_bytes(source.read())
                break
            except Exception:
                continue
        else:
            raise RuntimeError(f'Could not download {name}; no fabricated substitute was generated.')
    return target

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def quantile(values, p):
    values = sorted(values)
    index = (len(values) - 1) * p
    lo, hi = math.floor(index), math.ceil(index)
    return round(values[lo] + (values[hi] - values[lo]) * (index - lo), 2)

def distribution(values):
    return {'n': len(values), 'p10': quantile(values, .1), 'median': quantile(values, .5), 'p90': quantile(values, .9)}

def cmu():
    path = download('cmu.csv', [
        'https://www.cs.cmu.edu/~keystroke/DSL-StrongPasswordData.csv',
        'https://raw.githubusercontent.com/kevinmgamboa/keystroke_dynamics/master/DSL-StrongPasswordData.csv',
    ])
    if hashlib.md5(path.read_bytes()).hexdigest() != '470235f96568f28f9ea0da62234ec857':
        raise RuntimeError('CMU file does not match the original publisher checksum.')
    rows = list(csv.DictReader(path.open()))
    subjects = defaultdict(list)
    for row in rows:
        subjects[row['subject']].extend(float(value) * 1000 for key, value in row.items() if key.startswith('H.'))
    if len(rows) != 20400 or len(subjects) != 51:
        raise RuntimeError('Unexpected CMU dataset shape.')
    return {'id': 'cmu', 'name': 'CMU Keystroke Dynamics Benchmark', 'source': 'https://www.cs.cmu.edu/~keystroke/',
            'status': 'computed', 'license': 'Public research dataset; cite Killourhy & Maxion (2009).',
            'records': len(rows), 'participants': len(subjects), 'sha256': sha(path),
            'metrics': {'dwellMs': distribution([statistics.median(values) for values in subjects.values()])},
            'method': 'Median H.* hold time per participant, then equal-weight participant percentiles; seconds converted to ms.',
            'limits': 'Fixed-password authentication task. No disease or fatigue labels. Context only; not a healthy-person or clinical threshold.'}

def tappy():
    users = download('tappy-users.zip', ['https://physionet.org/files/tappy/1.0.0/Archived-users.zip'])
    data = download('tappy-data.zip', ['https://physionet.org/files/tappy/1.0.0/Archived-Data.zip'])
    with urllib.request.urlopen('https://physionet.org/files/tappy/1.0.0/SHA256SUMS.txt', timeout=30) as source:
        expected = {name.lstrip('*'): checksum for checksum, name in (line.split() for line in source.read().decode().splitlines() if line.strip())}
    for path, name in [(users, 'Archived-users.zip'), (data, 'Archived-Data.zip')]:
        if sha(path) != expected[name]:
            raise RuntimeError(f'Tappy checksum mismatch: {name}')
    labels = {}
    with zipfile.ZipFile(users) as archive:
        for name in archive.namelist():
            if name.endswith('.txt'):
                fields = dict(line.split(':', 1) for line in archive.read(name).decode(errors='replace').splitlines() if ':' in line)
                label = fields.get('Parkinsons', '').strip()
                if label in ['True', 'False']:
                    labels[Path(name).stem.removeprefix('User_')] = label
    holds = defaultdict(list)
    rejected = 0
    with zipfile.ZipFile(data) as archive:
        for name in archive.namelist():
            if not name.endswith('.txt'):
                continue
            for line in io.TextIOWrapper(archive.open(name), encoding='utf-8', errors='replace'):
                columns = line.rstrip().split('\t')
                try:
                    subject, hold = columns[0], float(columns[4])
                    if subject not in labels or not math.isfinite(hold) or hold <= 0 or hold > 1000:
                        rejected += 1
                        continue
                    holds[subject].append(hold)
                except (ValueError, IndexError):
                    rejected += 1
    medians = {subject: statistics.median(values) for subject, values in holds.items() if len(values) >= 100}
    groups = {label: distribution([value for subject, value in medians.items() if labels[subject] == label]) for label in ['True', 'False']}
    overlap = max(0, min(groups['True']['p90'], groups['False']['p90']) - max(groups['True']['p10'], groups['False']['p10']))
    return {'id': 'tappy', 'name': 'Tappy Keystroke Data v1.0.0', 'source': 'https://physionet.org/content/tappy/1.0.0/',
            'status': 'computed', 'license': 'Open Data Commons Attribution License v1.0',
            'participants': len(medians), 'records': sum(len(holds[subject]) for subject in medians), 'rejectedEvents': rejected,
            'sha256': {'users': sha(users), 'data': sha(data)},
            'metrics': {'dwellMs': distribution(list(medians.values()))},
            'offlineAudit': {'selfReportedPd': groups['True'], 'selfReportedNoPd': groups['False'], 'central80PercentOverlapMs': round(overlap, 2)},
            'method': 'Median valid hold time per participant (at least 100 events; 0 < hold <= 1000 ms), then equal-weight participant percentiles.',
            'limits': 'Self-reported labels, uncontrolled devices and tasks, selection and medication confounders. Pooled cohort reference only in the app; no diagnostic cutoff or accuracy claim.'}

def swell():
    path = download('swell-computer.csv', ['https://ssh.datastations.nl/api/access/datafile/189419'])
    if hashlib.sha1(path.read_bytes()).hexdigest() != '2faba3261a90567f30c5120efd37cc19d56de62a':
        raise RuntimeError('SWELL file does not match the DANS publisher checksum.')
    rows = list(csv.DictReader(path.open(encoding='utf-8-sig')))
    groups = {}
    for code, label in [('N', 'neutral'), ('I', 'interruptions'), ('T', 'time_pressure')]:
        subjects = defaultdict(lambda: defaultdict(list))
        for row in rows:
            if row['Condition'] == code:
                for key, source in [('keyboardEventsPerMinute', 'SnKeyStrokes'), ('leftClicksPerMinute', 'SnLeftClicked'), ('scrollEventsPerMinute', 'SnWheel')]:
                    subjects[row['PP']][key].append(float(row[source]))
        groups[label] = {key: distribution([statistics.mean(values[key]) for values in subjects.values()]) for key in ['keyboardEventsPerMinute', 'leftClicksPerMinute', 'scrollEventsPerMinute']}
    return {'id': 'swell', 'name': 'SWELL-KW computer-interaction minute features', 'source': 'https://doi.org/10.17026/dans-x55-69zp',
            'status': 'computed', 'license': 'CC BY-NC-SA 4.0 (research benchmark artifact only; noncommercial share-alike attribution applies).',
            'records': len(rows), 'participants': len({row['PP'] for row in rows}), 'sha256': sha(path), 'conditions': groups,
            'method': 'Condition N/I/T rows only (relax R excluded); mean minute count per participant and condition, then equal-weight participant percentiles.',
            'limits': 'Task/context reference, not burnout, depression, migraine, or a millisecond flight-volatility label. Event definitions differ from this recorder; rates are not interchangeable.'}

if __name__ == '__main__':
    result = {'schemaVersion': 1, 'dataPolicy': 'Only public research datasets; no app-user records.', 'clinicalValidation': False,
              'datasets': [cmu(), tappy(), swell()],
              'notIncluded': [{'name': 'Generic Kaggle fatigue/biometrics datasets', 'reason': 'No identified, licensed dataset with matching labels and event definitions was verified.'},
                              {'name': 'Generic Hugging Face cognitive-fatigue datasets', 'reason': 'Platform listings and reproduction results are not interchangeable with verified labeled keystroke data.'}]}
    (ROOT / 'research/benchmarks.json').write_text(json.dumps(result, indent=2) + '\n')
    for dataset in result['datasets']:
        print(f"{dataset['id']}: {dataset['participants']} participants; {dataset['records']} records")
