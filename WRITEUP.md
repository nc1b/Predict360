# Predict 360

**Track:** Health

This project is a prototype and is not medical advice.

## Who it helps

Maya, a fictional 35-year-old remote worker who manages chronic migraine, wants a quick way to notice when her workday starts differently. She types two sentences before work. If her typing pattern changes, she can check how she feels and add a note to the symptom log she already uses. On days she wants a broader view, she can opt into desktop tracking and pause it at any time.

## What we built

The browser extracts three measurements: key-hold duration, the pause between sentences, and variation in the time between keys. After three previous check-ins, a logistic regression model compares these measurements with Maya's usual timing and outputs **close to usual** or **different**. The website also shows a rule-based score and the underlying measurements. The optional Windows and macOS app shows daily trends from activity counts. Typed check-in sentences stay in the browser.

## How it performed

We trained the check-in model on 720 generated sessions from 12 simulated typists. We evaluated it on 360 sessions from six different simulated typists. A positive is a scripted timing change.

| Method | False positives | False negatives |
|---|---:|---:|
| Always predict usual | 0/180 (0%) | 180/180 (100%) |
| Live timing model | 19/180 (10.6%) | 45/180 (25.0%) |

In the [public model demo](https://predict360.vercel.app/evaluation), the ordinary example compares with its generated baseline. A four-second pause measures 4,000 ms against a usual 700 ms and flags a change. The distracted example also flags a change: a doorbell can alter timing as readily as a deliberate pause. The model has been tested on simulated changes. It cannot identify the cause or predict a migraine.

We separately evaluated an offline model using public SWELL-KW computer-activity data. Logistic regression reached ROC-AUC 0.59 on held-out participants, with 42% false positives and 45% false negatives. The always-strained baseline had 100% false positives and 0% false negatives.

## Credits

- **Data:** [SWELL-KW](https://doi.org/10.17026/dans-x55-69zp), [CMU Keystroke Dynamics](https://www.cs.cmu.edu/~keystroke/), [Tappy](https://physionet.org/content/tappy/1.0.0/), [Open-Meteo](https://open-meteo.com/), and our [synthetic generator](fixtures/synthetic.js).
- **AI:** [scikit-learn](https://scikit-learn.org/) for the offline experiments, [GPT-4o mini](https://platform.openai.com/docs/models/gpt-4o-mini) through [Hack Club AI](https://ai.hackclub.com/) for optional explanations, and [Claude](https://claude.ai/) and [ChatGPT](https://chatgpt.com/) for development assistance.
- **Project:** [Public code](https://github.com/nc1b/Predict360), [sources and limits](SOURCES.md), and [technical reference](docs/TECHNICAL.md).

