# Predict 360

**Track:** Health
**Team:** Details go in the submission form.

This project is a prototype and is not medical advice.

## The problem

Maya, a fictional 35-year-old remote worker who manages chronic migraine, wants a quick way to notice when her workday starts differently. She types two sentences before work. If her typing pattern changes, she can check how she feels and add a note to the symptom log she already uses. On days she wants a broader view, she can opt into desktop tracking and pause it at any time.

## What we built

After three previous check-ins, the web app takes timing from two typed sentences and returns **close to usual** or **different**. It also shows a score and the underlying measurements. The optional Windows and macOS app shows daily trends from activity counts. Typed check-in sentences stay in the browser.

## What we added

Our own idea. The two-sentence check-in gives Maya a brief, repeatable way to compare today's timing with her own routine.

## How it works

The model uses changes in key-hold duration, the pause between sentences, and variation between keys relative to the median of earlier check-ins. We fit logistic regression on 720 generated sessions from 12 simulated typists so the effect of each measure is inspectable. We test on 360 sessions from six different simulated typists. A positive means a scripted timing change.

## Results

| Method | False positives | False negatives |
|---|---:|---:|
| Always predict usual | 0/180 (0%) | 180/180 (100%) |
| Live timing model | 19/180 (10.6%) | 45/180 (25.0%) |

In the [public model demo](https://predict360.vercel.app/evaluation), a four-second pause measures 4,000 ms against a usual 700 ms and flags a change. For a held-out failure, select **Missed timing change**. Keys were held for 100 ms versus the usual 79 ms, but the model classified the result as close to usual. The more even rhythm partly canceled the longer holds in the model. The model has been tested on simulated timing changes. It cannot identify the cause or predict a migraine.

We separately evaluated an offline model using public SWELL-KW computer-activity data. Logistic regression reached ROC-AUC 0.59 on held-out participants, with 42% false positives and 45% false negatives. The always-strained baseline had 100% false positives and 0% false negatives.

## What we'd do next

Test against public typing data with comparable measurements and see whether several check-ins give a more stable signal than one.

## Sources

- **Data:** [SWELL-KW](https://doi.org/10.17026/dans-x55-69zp), [CMU Keystroke Dynamics](https://www.cs.cmu.edu/~keystroke/), [Tappy](https://physionet.org/content/tappy/1.0.0/), [Open-Meteo](https://open-meteo.com/), and our [synthetic generator](fixtures/synthetic.js).
- **AI:** [scikit-learn](https://scikit-learn.org/) for the offline experiments, [GPT-4o mini](https://platform.openai.com/docs/models/gpt-4o-mini) through [Hack Club AI](https://ai.hackclub.com/) for optional explanations, and [Claude](https://claude.ai/) and [ChatGPT](https://chatgpt.com/) for development assistance.
- **Project:** [Public code](https://github.com/nc1b/Predict360), [sources and limits](SOURCES.md), and [technical reference](docs/TECHNICAL.md).

