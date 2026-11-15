# Predict 360

**Track:** Health
**Team:** <add every member's full name here>

> This project is a prototype and is not medical advice.

## The problem

A 35-year-old remote worker managing a chronic condition — and really anyone — wants a quick, private way to notice when a day is going sideways before it piles up. They won't wear a device or fill out a long survey every morning. We wanted a check-in that takes a minute and uses signals a computer already sees: how you type and move.

## What we built

- **A one-minute morning check-in (web).** You type two sentences. We measure only typing **timing** — how long keys are held, the pause between sentences, and how even the rhythm is — **never the words**, which stay in your browser and are cleared when you finish. We compare today with *your own usual* and show a 0–100 score and plain-language flags.
- **An optional Windows desktop app.** It tracks activity **counts** across your apps (clicks, key presses, scroll, active vs idle minutes) — counts only, never words, key values, or screenshots — and syncs to your account.
- **The AI core.** A classifier trained on public data that tells a **strained** work minute (interrupted / under time pressure) from a **neutral** one, from that activity.
- **An AI assistant** that explains your numbers and answers questions about your trends, receiving numbers only, never your words.

## What we added

Our own idea. Our own **user** (a remote worker with a chronic condition), our own **data pipeline** (browser keystroke-timing capture plus the activity model), and our own **question**: *can one minute of ordinary keyboard and mouse activity tell a strained workday from a calm one — and how badly does it fail?* We answer that honestly rather than claiming to detect any illness.

## How it works

- **Data.** Public **SWELL-KW** computer-interaction dataset (25 participants; 2,686 labeled minutes after dropping the "relax" condition; CC BY-NC-SA). Features: 16 per-minute keyboard and mouse activity counts. Label: neutral (0) vs strained = interrupted or time-pressure (1). We also compute descriptive reference ranges from the **CMU** and **Tappy** keystroke datasets, and use **Open-Meteo** for optional barometric-pressure context.
- **Model.** scikit-learn **logistic regression** (standardised, class-balanced) and a **random forest**, chosen because the dataset is small and we need a readable, honest baseline. We evaluate **leave-participants-out** (5-fold StratifiedGroupKFold), so the model is always tested on people it never trained on.

## Results

All numbers are on held-out participants.

| Model | Accuracy | Catches strain | False alarms (FPR) | Missed strain (FNR) | ROC-AUC |
|---|---|---|---|---|---|
| Baseline (always "strained") | 62% | 100% | 100% | 0% | 0.50 |
| Logistic regression | 56% | 55% | 42% | 45% | **0.59** |
| Random forest | 60% | 70% | 58% | 30% | 0.60 |

The signal is **real but weak**: above chance (ROC-AUC ≈ 0.60), nowhere near reliable. **Accuracy is the wrong score here** — the "always strained" baseline looks more accurate only because most minutes are strained, yet it flags *every* calm minute (100% false alarms). That is exactly why we report false positives and false negatives separately.

**Where it fails.** The model flags 42% of genuinely calm minutes, and flags time-pressure minutes (58%) more than interruptions (53%) more than neutral (42%) — but the overlap is large, so a single minute can't be trusted. In the typing check-in, a distraction such as a doorbell produces the *same* "longer pause" flag as a deliberate pause: the tool detects a **change from your usual, never its cause**.

## What we'd do next

1. Use a **sequence of minutes** instead of one. Strain likely shows over 10–15 minutes of context, not a single sample.
2. **Calibrate the decision threshold** to how many false alarms a user will tolerate, and validate on a second dataset (or our own consented recordings) before any flag is shown as meaningful.

## Sources

- **Datasets:** SWELL-KW (https://doi.org/10.17026/dans-x55-69zp); CMU Keystroke Dynamics Benchmark (https://www.cs.cmu.edu/~keystroke/); Tappy Keystroke Data, PhysioNet (https://physionet.org/content/tappy/1.0.0/); Open-Meteo (https://open-meteo.com).
- **Libraries / tools:** scikit-learn, pandas, matplotlib; React, Node/Express; Clerk (sign-in); Supabase (sync); Hack Club AI proxy (explanations and chat); Arcade (demo video).
- **AI coding assistant:** Claude (code, evaluation and this write-up). Every part was reviewed by the team.
- **Code:** https://github.com/nc1b/Predict360 · **Live:** https://predict360.vercel.app · **Model evaluation:** https://predict360.vercel.app/evaluation
