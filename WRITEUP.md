# Predict 360

**Track** — Health  
**Team** — Divij Velagapudi and Sahaj Kalia

This project is a prototype and is not medical advice.

## The problem

Imagine you're near the end of a 12-hour nursing shift and still have medication records to enter. By then, it can be hard to tell how much your pace has changed since the start of the day. We wanted to give nurses and other hospital staff a quick, private way to check in with themselves. The same idea can help anyone who spends a lot of time at a keyboard.

## What we built

Predict 360 gives you two ways to check in. In the browser, you type two sentences on a physical keyboard. It takes about 30 seconds. We measure how long you hold each key, how long you pause between sentences, and how steady your typing rhythm is. The words stay in the browser and are cleared after the check-in. The optional Windows and macOS app counts key presses, clicks, scrolls, and active and idle time to show patterns across the day. It starts paused, and you can pause it again anytime.

## What we added

The idea is to compare your typing today with how you usually type. After at least three check-ins, Predict 360 uses your earlier sessions to build a personal baseline. It gives you a 0–100 score and shows what changed, such as a longer pause between sentences. A separate model classifies your timing as close to usual or different.

## How it works

We trained the check-in model with logistic regression on 720 simulated typing sessions from 12 typist profiles. We tested it on 360 sessions from six other simulated profiles. We also ran a separate experiment on 2,686 one-minute keyboard and mouse activity records from 25 people in the public SWELL-KW dataset. We used five test splits, each holding out entire participants, to see how well the model could tell ordinary work minutes from minutes with interruptions or time pressure.

## Results

- **Two-sentence check-in.** The model caught 135 of 180 scripted timing changes (75%) and flagged 19 of 180 unchanged sessions (10.6%). The simple baseline that always guessed “usual” had zero false alarms and missed all 180 changes.
- **SWELL-KW experiment.** Always guessing “strained” was 61.8% accurate and flagged every calm minute. Our logistic regression model reached a ROC-AUC of 0.59, flagged 42.0% of calm minutes, and missed 45.3% of minutes labeled as strained.
- **Where it fails.** In the **Missed timing change** example, the simulated typist held keys about 27% longer than usual, and the model still called it “usual.” In **Distracted typist**, a brief interruption triggered the same flag as a deliberate pause. A flag tells you what changed in your typing. Its cause could be something as ordinary as a phone call. [Interactive evaluation](https://predict360.vercel.app/evaluation)

## What we'd do next

We'd ask hospital staff who volunteer to try the check-in on day and night shifts. We'd also see whether averaging several check-ins cuts down on false alarms from one-off interruptions.

## Sources

- **Research data.** We used [SWELL-KW](https://doi.org/10.17026/dans-x55-69zp) for the offline experiment. The [CMU Keystroke Dynamics Benchmark](https://www.cs.cmu.edu/~keystroke/) and [Tappy](https://physionet.org/content/tappy/1.0.0/) provided reference ranges for key-hold times. [Open-Meteo](https://open-meteo.com/en/docs/historical-weather-api) provided optional weather context.
- **Tools.** We used scikit-learn for the SWELL-KW experiment, GPT-4o mini through Hack Club AI for optional summaries of the results, and Claude and ChatGPT for development help.
- **Project links.** [GitHub](https://github.com/nc1b/Predict360) · [Live app](https://predict360.vercel.app) · [Sources and licenses](https://github.com/nc1b/Predict360/blob/main/SOURCES.md)
