<div align="center">

<img src="web/public/logo.svg" alt="Predict 360 logo" width="72" />

# Predict 360

**A private, two-sentence typing check-in for nurses near the end of a long shift.**
Compare your typing with your personal baseline without saving the words you type. Optional desktop tracking shows activity trends across the day.

[Live site](https://predict360.vercel.app) · [Model evaluation](https://predict360.vercel.app/evaluation) · [Sources & limits](https://predict360.vercel.app/sources) · [Technical reference](docs/TECHNICAL.md)

![Track](https://img.shields.io/badge/Track-AI%20%2B%20Health-111111)
![Status](https://img.shields.io/badge/Status-Prototype-555555)
![Tests](https://img.shields.io/badge/Tests-73%20backend%20%C2%B7%2019%20frontend-111111)

</div>

> **This project is a prototype and is not medical advice.** It describes changes in typing timing relative to your own usual. It does not detect, diagnose, or distinguish any illness.

---

## Overview

Built for the **Veritas AI International High School Hackathon 2026 — AI + Health track**.

**Predict 360** is designed for a nurse who wants to compare their typing rhythm with their usual pattern during a break near the end of a 12-hour shift. The check-in takes about 30 seconds and uses a personal baseline after at least three usable prior sessions.

Neither mode ever logs what you type: typed words stay in your browser and are cleared immediately. Users can also opt into desktop activity tracking to see aggregate workload patterns across their shift or day.

[One-page project write-up](WRITEUP.md)

## Two ways to track

| | **Morning check-in** | **All-day tracking** |
|---|---|---|
| Where | Any desktop browser | Opt-in desktop app (Windows, macOS) |
| What you do | Type two sentences | Turn tracking on; pause anytime |
| What it measures | Key-hold time, pause between sentences, rhythm | Aggregate activity: clicks, key presses, scroll, active vs idle |
| What it never keeps | Your words (they never leave the text box) | Words, key values, window titles, screenshots, raw keystroke logs |
| Result | Model classification, score and flags | A daily trend once there is enough data |

Results are labelled by mode, and a **"Gathering data"** state is shown until there is enough input.

## The AI

The live morning check-in uses **logistic regression** to classify timing as close to usual or different. It uses three changes relative to a personal baseline: key-hold duration, sentence pause and typing rhythm. The model was trained on simulated sessions and runs without an AI service key. [Try the examples without signing in](https://predict360.vercel.app/evaluation).

An optional assistant explains the numbers using [GPT-4o mini](https://platform.openai.com/docs/models/gpt-4o-mini) through the [Hack Club AI proxy](https://ai.hackclub.com/). The assistant receives numeric results and messages entered in its chat box. The sentences typed during check-ins stay in the browser.

## Measured results

**Live check-in model.** On 360 generated sessions from six unseen simulated profiles, accuracy was **82.2% vs. 50.0%** for the always-usual baseline. The model flagged **19 of 180 unchanged sessions (10.6% false positives)** and missed **45 of 180 scripted changes (25.0% false negatives)**. An always-usual baseline had zero false positives and missed all 180 changes. A distraction can trigger the same flag as a deliberate pause. These results measure timing changes in simulated data.

**All-day tracking research.** We separately tested offline classifiers for neutral versus interrupted or time-pressured work minutes in the public SWELL-KW dataset. The numbers below are from held-out participants (five grouped folds). The desktop app shows descriptive trends in activity counts.

| Model | Accuracy | Catches strain | False alarms (FPR) | Missed strain (FNR) | ROC-AUC |
|---|---|---|---|---|---|
| Baseline (always "strained") | 62% | 100% | 100% | 0% | 0.50 |
| Logistic regression | 56% | 55% | 42% | 45% | **0.59** |
| Random forest | 60% | 70% | 58% | 30% | 0.60 |

Logistic regression ranked interrupted or time-pressured minutes above neutral minutes only slightly better than chance (0.59 ROC-AUC). At the tested threshold, it had lower accuracy than the majority baseline and flagged fewer neutral minutes. These results describe office-task conditions.

**Where it fails:** 42% of genuinely calm minutes are still flagged. In the morning check-in, a distraction produces the same "longer pause" flag as a deliberate pause — the tool detects a change from your usual, never its cause.

Graphs (confusion matrix, ROC, precision–recall, feature weights, flagged rate by condition) are on the [evaluation page](https://predict360.vercel.app/evaluation). Full fixture, confounder and sensitivity results are in the [technical reference](docs/TECHNICAL.md#measured-results).

**Public typing audit.** We checked real recorded timing in two public datasets. On the CMU benchmark, key holds exceeded the 15% baseline tolerance in 6.7% of remaining first-session blocks and 23.3% of later-session blocks. On 73 Inputlog copy tasks, the share exceeding the 25% rhythm tolerance changed from 82.2% in the fourth word block to 21.9% in the sentence block, each compared with the first three word blocks. [Method, counts, and reproduction](SOURCES.md#5-public-typing-audit).

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
| [SWELL-KW](https://doi.org/10.17026/dans-x55-69zp) | 25 office workers, per-minute keyboard/mouse activity under neutral, interrupted and time-pressure conditions | Offline work-context research | CC BY-NC-SA 4.0 |
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
| `node scripts/train-typing-model.js` | Reproduce the check-in model and held-out synthetic results |
| `python scripts/swell-strain-model.py` | Train and evaluate the strain model (downloads SWELL-KW and verifies its checksum) |
| `npm start --prefix desktop` | Run the desktop app |
| `npm run dist --prefix desktop` / `dist:mac` | Build the Windows / macOS app |

## Privacy

- The analysis API accepts only key kind and timing. Requests with text, key values or user IDs are rejected.
- All-day tracking is opt-in, asks for permission, starts paused, and stores counts only.
- The optional AI assistant receives numeric summaries and messages explicitly entered in its chat box.
- [Privacy Policy](https://predict360.vercel.app/privacy) · [Terms of Use](https://predict360.vercel.app/terms)

## Limitations

- Trained and tested on public and synthetic data only; no clinical validation.
- One minute of activity is a weak signal; the model should not be trusted on its own.
- Typing changes with keyboards, devices and context. Compare like with like.

## Credits

[Datasets and research limits](SOURCES.md), [scikit-learn](https://scikit-learn.org/), [pandas](https://pandas.pydata.org/), [Matplotlib](https://matplotlib.org/), [React](https://react.dev/), [Express](https://expressjs.com/), [Electron](https://www.electronjs.org/), [Clerk](https://clerk.com/), [Supabase](https://supabase.com/), [Arcade](https://www.arcade.software/) (demo), [GPT-4o mini](https://platform.openai.com/docs/models/gpt-4o-mini) via [Hack Club AI](https://ai.hackclub.com/) (optional explanations), and [Claude](https://claude.ai/) and [ChatGPT](https://chatgpt.com/) (development assistance).

<div align="center">
<sub>Predict 360 · Veritas AI High School Hackathon 2026 · This project is a prototype and is not medical advice.</sub>
</div>
