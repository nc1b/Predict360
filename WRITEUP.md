# Predict 360

**Track** — AI + Health  
**Team** — Divij Velagapudi and Sahaj Kalia

This project is a prototype and is not medical advice.

## The problem

Imagine you're near the end of a 12-hour nursing shift. You still have notes to chart, and it's hard to notice when your typing feels different from usual. We wanted to give nurses a 30-second way to check in privately during a break.

## What we built

Type two sentences on a physical keyboard. After three usable prior check-ins, Predict360 compares how long you hold keys, how long you pause between sentences, and how steady your rhythm is with your personal baseline. The model labels the pattern **usual** or **different**. A separate 0–100 score uses fixed rules to show which timing measures changed. The words stay in the browser and are cleared after the check-in. The optional desktop app shows trends in keyboard and mouse activity counts across the day.

## What we added

**Our own idea.** We compare each person with their own earlier check-ins. The interactive evaluation lets a judge run the same check-in model on examples, including one it gets wrong.

## How it works

We trained the live logistic regression model on 720 generated sessions from 12 simulated typist profiles. Each profile had its own baseline, and we held out six other profiles for testing. The model uses changes in the three timing measures because each can be compared with a person's usual range. In a separate offline experiment, we used 2,686 complete one-minute records from 25 participants in the public SWELL-KW dataset. We classified neutral office tasks versus tasks with interruptions or time pressure, holding out entire participants in each of five folds.

## Results

- **Live check-in, simulated data.** The model reached **82.2% accuracy vs. 50.0%** for the always-usual baseline on 360 test sessions. It flagged **19 of 180 unchanged sessions (10.6% false positives)** and missed **45 of 180 scripted changes (25.0% false negatives)**. The baseline flagged no unchanged sessions and missed all 180 changes.
- **Offline SWELL-KW experiment, public data.** Logistic regression scored **56.0% accuracy and 0.59 ROC-AUC**. The always-interrupted-or-time-pressured baseline scored **61.8% accuracy and 0.50 ROC-AUC**. Logistic regression flagged **431 of 1,027 neutral minutes (42.0%)** and missed **752 of 1,659 interrupted or time-pressured minutes (45.3%)**. This experiment measures office-task conditions.
- **Where it fails.** In the held-out *Missed timing change* example, key holds were about 27% longer than usual and the model still returned **usual**. A brief distraction can also produce the same pause flag as a deliberate pause. The check-in has yet to be validated for fatigue or clinical use. [Try the examples](https://predict360.vercel.app/evaluation)

## What we'd do next

We'd test whether averaging several check-ins cuts down on flags from one-off interruptions. We'd also evaluate the check-in with consenting nurses on day and night shifts.

## Sources

- **Data.** [Synthetic session generator](fixtures/synthetic.js) for live model training and testing, [SWELL-KW](https://doi.org/10.17026/dans-x55-69zp) for the offline experiment, [CMU Keystroke Dynamics](https://www.cs.cmu.edu/~keystroke/) and [Tappy](https://physionet.org/content/tappy/1.0.0/) for reference ranges, and [Open-Meteo](https://open-meteo.com/en/docs/historical-weather-api) for optional weather context.
- **Tools.** [scikit-learn](https://scikit-learn.org/) for the offline experiment, [GPT-4o mini](https://platform.openai.com/docs/models/gpt-4o-mini) via [Hack Club AI](https://ai.hackclub.com/) for optional explanations, and [Claude](https://claude.ai/) and [ChatGPT](https://chatgpt.com/) for development.
- [Sources and licenses](SOURCES.md) · [Full project credits](README.md#credits) · [Live app](https://predict360.vercel.app)
