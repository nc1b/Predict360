# Predict 360

**Track:** Health  
**Team:** [Insert Your Teammate Names and High Schools]

This project is a prototype and is not medical advice.

## The problem
Inpatient hospital staff and nurses working 12-hour shifts endure acute cognitive fatigue and physical slowing, directly heightening the risk of burnout and electronic health record (EHR) medication charting errors. While everyday computer professionals also struggle with unmeasured mental fatigue, hospital personnel face immediate safety consequences if motor slowing goes unnoticed before clinical data entry. Both healthcare workers and everyday desk users lack a non-invasive, objective tool to check their own cognitive-motor rhythm without workplace surveillance or privacy invasion.

## What we built
Predict 360 is a zero-text-storage typing rhythm monitor. Before entering clinical logs or starting a shift, users complete a 30-second check-in by typing two sentences on a physical keyboard. The tool extracts three key timing dynamics—key-hold duration (`dwellMs`), pause length between sentences (`sentencePauseMs`), and keystroke rhythm volatility (`flightVolatilityMs`)—while discarding the words typed to protect clinical and personal confidentiality. After three initial sessions, it compares current timing against the individual's personal baseline and outputs an objective readiness score (0–100), deviation flags, and feature breakdowns. An optional desktop companion passively tracks aggregate daily activity (clicks, keystrokes, active/idle time) with a visible one-click pause switch.

## What we added
Our own idea. Instead of building an intrusive surveillance tool or a fragile population-level disease classifier, we engineered an $n=1$ longitudinal self-baseline. This enables shift workers entering critical medication data—and everyday professionals monitoring cognitive strain—to compare their micro-timing against their own historical baseline rather than an arbitrary group average.

## How it works
The live check-in uses a logistic regression model trained on 720 simulated typing sessions across 12 typist profiles and evaluated on 360 held-out sessions from 6 unseen profiles. The model evaluates relative changes in key-hold duration, sentence pause, and inter-key rhythm. We separately tested an offline comparative classifier on the public SWELL-KW dataset (25 participants, 2,686 minute-level keyboard/mouse activity records under neutral and stress conditions) using 5-fold leave-participants-out cross-validation (`StratifiedGroupKFold`) so the model is strictly evaluated on unseen individuals.

## Results
On held-out check-in test data (360 sessions; 180 unchanged, 180 scripted changes):
- **Naive baseline (always predict "usual"):** 0/180 false alarms (0.0%), but missed 180/180 timing changes (100.0% false negatives / 0% recall).
- **Our Model:** 19/180 false alarms (10.6% false positive rate) and caught 135/180 changes (75.0% recall, 25.0% false negative rate).

On SWELL-KW cross-person work strain:
- **Majority-class baseline ("always strained"):** Scored 61.8% accuracy but had a 100% false-alarm rate (caught 0 calm minutes).
- **Our logistic regression:** Achieved ROC-AUC 0.59, 42.0% false alarms, and 45.3% missed strain, honestly demonstrating that cross-person typing is a real but noisy signal.

**Where it fails:** In our interactive demo (`/evaluation`), selecting **Missed timing change** shows a held-out failure where key holds were 27% longer (100 ms vs 79 ms baseline), but an unusually even rhythm dampened the penalty, causing the model to misclassify it as usual. Furthermore, **Distracted typist** shows that an ordinary distraction (answering a hospital phone call or talking to a coworker) triggers the same pause flag as motor slowing—the model detects deviation from routine, never the medical or situational cause.

## What we'd do next
Pilot test the check-in with consenting hospital personnel across day and night shift rotations, and investigate whether multi-check-in rolling averages reduce false alarms caused by temporary workplace interruptions.

## Sources
- **Datasets:** SWELL-KW (CC BY-NC-SA 4.0, DANS), CMU Keystroke Dynamics Benchmark, Tappy Keystroke Data (PhysioNet, ODC-By 1.0), and Open-Meteo Historical Weather API.
- **AI & Libraries:** scikit-learn (offline model & leave-participants-out evaluation), GPT-4o mini via Hack Club AI (optional text summaries of numeric outputs), and Claude & ChatGPT for development assistance.
- **Code & Live Demo:** Public repository (https://github.com/nc1b/Predict360), Live App (https://predict360.vercel.app), and Interactive Model Evaluation (https://predict360.vercel.app/evaluation).
