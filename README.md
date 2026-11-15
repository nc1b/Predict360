<div align="center">

<img src="web/public/logo.svg" alt="Predict 360 logo" width="72" />

# Predict 360

**A daily view of your typing rhythm.**
Write two sentences in the morning, or opt into all-day tracking on your computer. Switch whenever you want.

[Live site](https://predict360.vercel.app) · [Model evaluation](https://predict360.vercel.app/evaluation) · [Sources & limits](https://predict360.vercel.app/sources) · [Technical reference](docs/TECHNICAL.md)

![Track](https://img.shields.io/badge/Track-AI%20%2B%20Health-111111)
![Status](https://img.shields.io/badge/Status-Prototype-555555)
![Tests](https://img.shields.io/badge/Tests-73%20backend%20%C2%B7%2019%20frontend-111111)

</div>

> **This project is a prototype and is not medical advice.** It describes changes in typing timing relative to your own usual. It does not detect, diagnose, or distinguish any illness.

---

## Overview

Built for the **Veritas AI International High School Hackathon 2026 — AI + Health track**.

Some days feel off before you can say why. Predict 360 gives one person — for example, a remote worker managing a chronic condition — a private way to notice that, using signals a computer already sees: how you type and how active you are. Every result is compared with **your own baseline**, never with other people.

## Two ways to track

| | **Morning check-in** | **All-day tracking** |
|---|---|---|
| Where | Any desktop browser | Opt-in desktop app (Windows, macOS) |
| What you do | Type two sentences | Turn tracking on; pause anytime |
| What it measures | Key-hold time, pause between sentences, rhythm | Aggregate activity: clicks, key presses, scroll, active vs idle |
| What it never keeps | Your words (they never leave the text box) | Words, key values, window titles, screenshots, raw keystroke logs |
| Result | Score and flags right after you finish | A daily trend once there is enough data |

Results are labelled by mode, and a **"Gathering data"** state is shown until there is enough input.

## The AI

The core model is a **scikit-learn classifier trained on the public [SWELL-KW](https://doi.org/10.17026/dans-x55-69zp) dataset** (25 participants, 2,686 labelled minutes). From one minute of keyboard and mouse activity, it predicts whether a person was working in a **neutral** condition or a **strained** one (interrupted or under time pressure). This is work context, not a diagnosis.

An optional assistant (Hack Club AI proxy) explains results and answers questions about your trends. It receives **numbers only**, never your words.

## Measured results

All numbers are on **people the model never trained on** (leave-participants-out, 5-fold). False positives and false negatives are reported separately, as the brief requires.

| Model | Accuracy | Catches strain | False alarms (FPR) | Missed strain (FNR) | ROC-AUC |
|---|---|---|---|---|---|
| Baseline (always "strained") | 62% | 100% | 100% | 0% | 0.50 |
| Logistic regression | 56% | 55% | 42% | 45% | **0.59** |
| Random forest | 60% | 70% | 58% | 30% | 0.60 |

**The honest read:** the signal is real but weak. The model beats the baseline at telling calm from strained minutes, but it is not reliable on its own. Accuracy is misleading here — the baseline looks more accurate only because most minutes are strained, while flagging every calm minute.

**Where it fails:** 42% of genuinely calm minutes are still flagged. In the morning check-in, a distraction produces the same "longer pause" flag as a deliberate pause — the tool detects a change from your usual, never its cause.

Graphs (confusion matrix, ROC, precision–recall, feature weights, flagged rate by condition) are on the [evaluation page](https://predict360.vercel.app/evaluation). Full fixture, confounder and sensitivity results are in the [technical reference](docs/TECHNICAL.md#measured-results).

## Scoring rules

The morning check-in compares three timing features with your baseline (the median of at least three earlier check-ins). Points are deducted only when a feature rises above your usual:

| Feature | Flag | No deduction up to | Full deduction at | Max points |
|---|---|---|---|---|
| Key-hold time | `long_key_hold` | 1.15× usual | 2.0× | 35 |
| Pause between sentences | `long_sentence_pause` | 1.5× usual | 4.0× | 35 |
| Rhythm variation | `uneven_typing_rhythm` | 1.25× usual | 3.0× | 30 |

`score = clamp(round(100 − points), 0, 100)`. Typing faster or more evenly than usual scores 100. Details: [technical reference](docs/TECHNICAL.md#scoring-rules).

## Datasets

| Dataset | Collection | Used for | Licence |
|---|---|---|---|
| [SWELL-KW](https://doi.org/10.17026/dans-x55-69zp) | 25 office workers, per-minute keyboard/mouse activity under neutral, interrupted and time-pressure conditions | Training and evaluating the all-day strain model | CC BY-NC-SA 4.0 |
| [CMU Keystroke Dynamics](https://www.cs.cmu.edu/~keystroke/) | 51 people typing a fixed password | Key-hold reference ranges (context only) | Public research dataset |
| [Tappy](https://physionet.org/content/tappy/1.0.0/) | 192 people, free typing over time | Key-hold reference ranges (context only) | ODC-By 1.0 |
| [Open-Meteo](https://open-meteo.com) | Modelled barometric pressure | Optional weather context | CC BY 4.0 |

No single dataset validates both modes. The morning check-in pipeline is tested on clearly labelled **synthetic** typing sessions.

## Architecture

```
web/        React + Vite + Tailwind frontend (Clerk sign-in)
src/        Node/Express API: feature extraction, scoring, AI explain + chat
api/        Vercel serverless entry
desktop/    Electron app for all-day tracking (Windows + macOS)
scripts/    Model training (swell-strain-model.py), evaluation, packaging
research/   Public-dataset reference ranges and model metrics
supabase/   Account sync for check-in and activity summaries
```

## Getting started

Requires Node.js 20+ and Python 3.10+ (for the model).

```bash
npm install
npm install --prefix web
npm run build
npm start
```

Then open http://localhost:3000.

| Command | Purpose |
|---|---|
| `npm test` | Backend tests |
| `npm run test:web` | Frontend tests |
| `python scripts/swell-strain-model.py` | Train and evaluate the strain model (downloads SWELL-KW and verifies its checksum) |
| `npm start --prefix desktop` | Run the desktop app |
| `npm run dist --prefix desktop` / `dist:mac` | Build the Windows / macOS app |

## Privacy

- The analysis API accepts only key kind and timing. Requests with text, key values or user IDs are rejected.
- All-day tracking is opt-in, asks for permission, starts paused, and stores counts only.
- The AI assistant receives numeric summaries, never typed words.
- [Privacy Policy](https://predict360.vercel.app/privacy) · [Terms of Use](https://predict360.vercel.app/terms)

## Limitations

- Trained and tested on public and synthetic data only; no clinical validation.
- One minute of activity is a weak signal; the model should not be trusted on its own.
- Typing changes with keyboards, devices and context. Compare like with like.

## Credits

Datasets listed above · scikit-learn, pandas, matplotlib · React, Express, Electron · Clerk · Supabase · Hack Club AI · Arcade (demo video) · Claude (AI coding assistant; every part reviewed by the team).

<div align="center">
<sub>Predict 360 · Veritas AI High School Hackathon 2026 · This project is a prototype and is not medical advice.</sub>
</div>
