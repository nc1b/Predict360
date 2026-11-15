# Predict 360

**Track** — AI + Health  
**Team** — Divij Velagapudi and Sahaj Kalia

This project is a prototype and is not medical advice. It is not affiliated with 360factors' Predict360 software.

**Try it in under a minute.** Open the [interactive evaluation](https://predict360.vercel.app/evaluation) and choose **Longer key holds**, then **Missed timing change**. The examples run through the live model and include five prior check-ins, so you can see a result without an account. The model flags the longer key holds and misses a 55% change in rhythm.

## The problem

Imagine you're near the end of a 12-hour nursing shift. You still have notes to chart, and it's hard to notice when your typing feels different from usual. We wanted to give nurses a 30-second way to check in privately during a break, so a shift-to-shift change is easier to notice and reflect on.

## What we built

Type two sentences on a physical keyboard. After three usable prior check-ins, Predict360 compares how long you hold keys, how long you pause between sentences, and how steady your rhythm is with your personal baseline. A logistic regression model labels the pattern **usual** or **different**. A separate 0–100 score uses fixed rules to show which measures changed. The words stay in the browser and are cleared after the check-in. The optional desktop app shows trends in keyboard and mouse activity counts.

## What we added

**Our own idea, and our own question.** Two people type very differently on an ordinary day, so we compare each person only with their own earlier check-ins. Our question was: *over a real person's normal variation, how big does a change in typing have to be before a personal baseline can see it, and how often does it cry wolf?*

## How it works

- **Data.** The public [CMU Keystroke Dynamics Benchmark](https://www.cs.cmu.edu/~keystroke/): 51 people, 8 sittings each. We grouped it into 80 real check-ins per person and compared each with that person's previous five.
- **Labels.** "Unchanged" check-ins are untouched real typing. For "changed" ones we stretched key holds or made rhythm more uneven by 10–60% in a copy of each real check-in. The change is injected because we could not obtain public typing data with fatigue labels; the variation it must be detected over is real.
- **Model.** Logistic regression on how far key hold and rhythm rose above the person's usual. It has four readable weights and runs in the app with no external AI service. Sentence pause is not in this dataset, so its weight is set to flag at 1.5× usual, like the rule.
- **Testing.** Five folds split by person, so every result is from typists the model never saw.

## Results

On 3,060 real check-ins from held-out typists, with every method set to about 10% false alarms:

| Method | False alarms | Changes detected | Missed | ROC-AUC |
|---|---|---|---|---|
| Always "usual" (baseline) | 0% | 0% | 100% | 0.50 |
| Hand-set rule (baseline) | 10% | 37% | 63% | 0.79 |
| Our first model, trained on simulated typists | 10% | 37% | 63% | 0.79 |
| **Live model, trained on real typing** | 10% | **59%** (95% interval 57–61%) | 41% | **0.83** |

- **What we learned.** Our first model was trained on typists we simulated, and it looked good there (88% accuracy). On real people it was no better than the rule. The rule itself, at its original thresholds, flagged **25%** of untouched real check-ins, where the simulation had suggested 4%.
- **Which measures can be trusted.** Median key hold wobbles about 4% for the same person; our rhythm measure wobbles about 26%. So the model weights key hold about five times more than rhythm. A 2015 MIT study found key hold time changed in 14 people typing just after being woken at night, which is why we kept it.
- **How big a change.** Key holds 20% longer are detected about 90% of the time; 10% longer, about half the time. A gradient-boosted model with more inputs gained almost nothing (AUC 0.84), so we kept the simple one.
- **Where it fails.** The model misses 41% of injected changes, including most rhythm changes: in *Missed timing change*, rhythm is 55% more uneven and it still says **usual**. The first check-in after a break between sittings is flagged more often. A distraction flags the same way as a real change. Nothing here shows a flagged change means fatigue.
- **Separate experiment.** On the public SWELL-KW office dataset (25 people, held out by person), one minute of keyboard and mouse counts barely separated calm from pressured work: ROC-AUC 0.59, with 42% of calm minutes flagged. We report it as a weak result and show users no label from it.

Graphs, intervals, per-typist results and the week-one curve are on the [evaluation page](https://predict360.vercel.app/evaluation). Reproduce with `python scripts/real-typing-eval.py`.

## What we'd do next

Collect check-ins from consenting nurses before and after day and night shifts, with their own tiredness ratings, so the change we detect is a real one and not injected. We'd also replace the rhythm measure with a steadier one.

## Sources

- **Data.** [CMU Keystroke Dynamics Benchmark](https://www.cs.cmu.edu/~keystroke/) (live model and evaluation), [SWELL-KW](https://doi.org/10.17026/dans-x55-69zp) (office experiment), [Inputlog Copy Task Corpus](https://doi.org/10.5281/zenodo.5803401) (timing audit), [Tappy](https://physionet.org/content/tappy/1.0.0/) (reference ranges), [Open-Meteo](https://open-meteo.com/en/docs/historical-weather-api) (optional weather context), and our own [synthetic session generator](fixtures/synthetic.js) (demo examples).
- **Research.** Giancardo et al., [Psychomotor impairment detection via finger interactions with a computer keyboard during natural typing](https://doi.org/10.1038/srep09678), *Scientific Reports* 2015. Killourhy and Maxion, [Comparing anomaly-detection algorithms for keystroke dynamics](https://www.cs.cmu.edu/~keystroke/), DSN 2009.
- **Tools.** [scikit-learn](https://scikit-learn.org/), [pandas](https://pandas.pydata.org/) and [Matplotlib](https://matplotlib.org/) for training and graphs, [GPT-4o mini](https://platform.openai.com/docs/models/gpt-4o-mini) via [Hack Club AI](https://ai.hackclub.com/) for optional explanations, and [Claude](https://claude.ai/) and [ChatGPT](https://chatgpt.com/) as coding assistants.
- [Sources and licenses](SOURCES.md) · [Full project credits](README.md#credits) · [Live app](https://predict360.vercel.app)
