#!/usr/bin/env python3
"""Measure baseline drift and task differences in two public typing datasets."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
from statistics import median
from urllib.request import urlopen
from zipfile import ZipFile

CMU_URL = "https://www.cs.cmu.edu/~keystroke/DSL-StrongPasswordData.csv"
INPUTLOG_URL = "https://zenodo.org/records/5803401/files/sub-dataset_EN_21-25year.zip"
OUTPUT = Path(__file__).resolve().parents[1] / "research" / "public-typing-audit.json"


def publisher_file(path, url, expected_md5):
    if path is None:
        with urlopen(url, timeout=30) as response:
            data = response.read()
    else:
        data = path.read_bytes()
    if hashlib.md5(data).hexdigest() != expected_md5:
        raise ValueError(f"Publisher checksum mismatch for {url}")
    return data


def describe(ratios, threshold):
    count = sum(ratio > threshold for ratio in ratios)
    return {
        "observations": len(ratios),
        "above_threshold": count,
        "above_threshold_rate": round(count / len(ratios), 4),
        "median_ratio": round(median(ratios), 4),
    }


def cmu_audit(data):
    rows = csv.DictReader(io.StringIO(data.decode("utf-8-sig")))
    hold_columns = [key for key in rows.fieldnames if key.startswith("H.")]
    subjects = {}
    for row in rows:
        session = subjects.setdefault(row["subject"], {}).setdefault(int(row["sessionIndex"]), {})
        session[int(row["rep"])] = [float(row[key]) for key in hold_columns]

    same_session = []
    later_sessions = []
    for sessions in subjects.values():
        blocks = {}
        for index, repetitions in sessions.items():
            blocks[index] = [
                median(hold for rep in range(start, start + 5) for hold in repetitions[rep])
                for start in range(1, 51, 5)
            ]
        baseline = median(blocks[1][:3])
        same_session.extend(value / baseline for value in blocks[1][3:])
        later_sessions.extend(value / baseline for index in sorted(blocks) if index > 1 for value in blocks[index])

    return {
        "source": CMU_URL,
        "typists": len(subjects),
        "password_repetitions": sum(len(reps) for sessions in subjects.values() for reps in sessions.values()),
        "repetitions_per_block": 5,
        "baseline_blocks": 3,
        "dwell_ratio_threshold": 1.15,
        "same_session": describe(same_session, 1.15),
        "later_sessions": describe(later_sessions, 1.15),
    }


def inputlog_audit(data):
    def read_table(archive, path):
        with archive.open(f"corpus/data/{path}.csv") as source:
            return {row["id"]: row for row in csv.DictReader(io.TextIOWrapper(source, encoding="utf-8-sig"))}

    with ZipFile(io.BytesIO(data)) as archive:
        sessions = read_table(archive, "session")
        words = [read_table(archive, f"components/words{i}") for i in range(1, 5)]
        sentences = read_table(archive, "components/sentence")

    word_ratios = []
    sentence_ratios = []
    for session_id, session in sessions.items():
        if session["keyboard"] != "QWERTY" or session["computer"].lower() not in {"desktop", "laptop"}:
            continue
        task_rows = [table.get(session_id) for table in [*words, sentences]]
        if any(row is None or int(row["targetted"]) < 20 or not row["stdev"] for row in task_rows):
            continue
        spreads = [float(row["stdev"]) for row in task_rows]
        if any(spread <= 0 for spread in spreads):
            continue
        baseline = median(spreads[:3])
        word_ratios.append(spreads[3] / baseline)
        sentence_ratios.append(spreads[4] / baseline)

    return {
        "source": "https://doi.org/10.5281/zenodo.5803401",
        "published_english_copy_tasks": len(sessions),
        "complete_qwerty_computer_copy_tasks": len(word_ratios),
        "interkey_spread_ratio_threshold": 1.25,
        "fourth_word_block_vs_first_three": describe(word_ratios, 1.25),
        "sentence_block_vs_first_three_word_blocks": describe(sentence_ratios, 1.25),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cmu", type=Path, help="Local copy of the original CMU CSV")
    parser.add_argument("--inputlog", type=Path, help="Local copy of the original Inputlog ZIP")
    args = parser.parse_args()
    cmu = publisher_file(args.cmu, CMU_URL, "470235f96568f28f9ea0da62234ec857")
    inputlog = publisher_file(args.inputlog, INPUTLOG_URL, "096cdbd402d4f9ba784a3f335f9fbc1a")
    report = json.dumps({"cmu": cmu_audit(cmu), "inputlog": inputlog_audit(inputlog)}, indent=2) + "\n"
    OUTPUT.write_text(report, encoding="utf-8")
    print(report, end="")


if __name__ == "__main__":
    main()
