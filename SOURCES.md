# Sources and research limits

Predict 360 uses **public datasets only for its research reference pipeline**. Private app-user records are never training inputs. `scripts/build-research.py` downloads public files, verifies publisher checksums, converts units, aggregates by participant, and writes `research/benchmarks.json`. Raw downloads are gitignored; the app and AI receive aggregate references only.

The reference ranges describe each dataset. The rule-based check-in score uses hand-set thresholds. The live timing classifier is logistic regression trained on generated timing changes, and compares each check-in with the same person's earlier sessions. The public datasets provide reference context and an offline work-context experiment. No clinical accuracy improvement, universal millisecond cutoff, migraine aura detection, or hydration inference has been established.

The live check-in model is trained by the [real-typing script](scripts/real-typing-eval.py) on the CMU benchmark below. It groups each of the 51 typists' 400 password repetitions into 80 real check-ins (5 repetitions each), compares each with the median of that person's previous five, and injects a 10–60% change into a copy of each check-in to create the "changed" class. Results in the [evaluation report](research/real-typing-eval.json) are from typists held out in five folds split by person, with 95% intervals from resampling whole typists. The deployed weights are in [research/live-typing-model.json](research/live-typing-model.json). The injected change is a limitation: no public typing dataset with fatigue labels could be obtained (the MIT sleep-inertia dataset of [Giancardo et al. 2015](https://doi.org/10.1038/srep09678) was offline when we tried). The [simulated check](scripts/train-typing-model.js) scores the same live model on generated sessions from the [synthetic session generator](fixtures/synthetic.js); those sessions also power the demo examples.

## 1. CMU Keystroke Dynamics Benchmark

- Dataset: https://www.cs.cmu.edu/~keystroke/
- Original CSV: https://www.cs.cmu.edu/~keystroke/DSL-StrongPasswordData.csv
- Paper: Killourhy, K. S. & Maxion, R. A. (2009), *Comparing Anomaly-Detection Algorithms for Keystroke Dynamics*, DSN, pp. 125–134.
- Public research availability and citation requirements are described on the publisher page. The original file's published MD5 is `470235f96568f28f9ea0da62234ec857`. The script accepts a public mirror only if that checksum matches, and records a SHA-256 hash in the artifact.
- Used: all 20,400 password repetitions from 51 participants. `H.*` values are seconds, converted to milliseconds. We pool hold times per participant, take that participant's median, then calculate equal-weight cohort percentiles.
- Measured participant hold-time p10/median/p90: **60.5 / 88.1 / 110.9 ms**.
- Limit: this is a fixed-password authentication study, with no disease, depression, burnout, or migraine labels. It cannot establish a population-wide “healthy” cutoff or free-text inter-sentence pauses.

## 2. Tappy Keystroke Data v1.0.0

- Dataset: https://physionet.org/content/tappy/1.0.0/
- DOI: https://doi.org/10.13026/C2K08D
- Paper: Adams, W. R. (2017), *High-accuracy detection of early Parkinson's Disease using multiple characteristics of finger movement while typing*, PLOS ONE 12(11): e0188226. https://doi.org/10.1371/journal.pone.0188226
- Repository citation: Goldberger, A. L. et al. (2000), *PhysioBank, PhysioToolkit, and PhysioNet: Components of a New Research Resource for Complex Physiologic Signals*, Circulation 101(23), e215–e220. https://doi.org/10.1161/01.CIR.101.23.e215
- License: **Open Data Commons Attribution License v1.0**. Original users/data ZIP files are checked against the publisher's `SHA256SUMS.txt`.
- Used: **8,999,392 valid hold events from 192 participants** after requiring known self-reported PD/no-PD labels, at least 100 valid holds per participant, and `0 < hold <= 1000 ms`. This filter is documented and reproducible; it is not the paper's complete preprocessing or model. Equal-weight participant median references avoid overweighting prolific typists.
- Pooled hold-time p10/median/p90: **78.1 / 115.25 / 163.71 ms**.
- Offline label audit: 143 self-reported PD participants had a median of 117.2 ms; 49 self-reported no-PD participants had a median of 109.4 ms. Their central 80% ranges overlap by **68.38 ms**. These are descriptive cohort statistics, not a classifier evaluation or a diagnostic boundary.
- Limit: self-report, medication, devices, age, task, and recruitment can confound comparisons. Published study performance does not transfer to this app. Live explanations receive the **pooled reference**, not disease-group membership or disease probabilities.

## 3. SWELL Knowledge Work Dataset (SWELL-KW)

- Dataset DOI: https://doi.org/10.17026/dans-x55-69zp
- Publisher description: https://cs.ru.nl/~skoldijk/SWELL-KW/Dataset.html
- Selected public file: https://ssh.datastations.nl/api/access/datafile/189419
- File: *A - Computer interaction features (Ulog - All Features per minute)-Sheet_1.csv*; publisher SHA-1 `2faba3261a90567f30c5120efd37cc19d56de62a`.
- Paper: Koldijk, S., Sappelli, M., Verberne, S., Neerincx, M. & Kraaij, W. (2014), *The SWELL Knowledge Work Dataset for Stress and User Modeling Research*, ICMI 2014. https://doi.org/10.1145/2663204.2663257
- License from the DANS record: **CC BY-NC-SA 4.0**. Noncommercial, attribution, and share-alike restrictions apply to the derived SWELL benchmark content. The composite research benchmark artifact is distributed subject to those restrictions; this does not change the original datasets' terms or claim ownership of them.
- Used: 3,139 minute records from 25 participants. Neutral (`N`), interruptions (`I`), and time-pressure (`T`) rows are aggregated per participant and condition; relaxation (`R`) is excluded from condition references.
- Used features: keyboard events, left clicks, and scrolls per minute. The app does not use this dataset's documents, video, posture, physiology, or typed content.
- Limit: controlled office tasks and source-specific event counts are not identical to this recorder's counts. Minute aggregates do not provide this app's within-sentence millisecond volatility. They do not label depression, burnout, migraine, or a person's “bad day.” No diagnostic or causal threshold is derived.

## 4. Open-Meteo environmental context

- Service and attribution: https://open-meteo.com/
- Historical API: https://open-meteo.com/en/docs/historical-weather-api
- License: **CC BY 4.0**, subject to Open-Meteo's service terms and noncommercial free-API limits.
- Optional input: a city and date chosen by the user. The backend fetches hourly `surface_pressure`, reports hPa and sample count, and distinguishes modeled historical reanalysis from recent modeled forecast data. Missing values are excluded; no synthetic weather values are substituted.
- The city is not saved in activity history or sent to the AI. Explanations may receive only the numeric mean, range, and pressure change.
- Limit: weather is context, not a migraine dataset. Without prospectively collected symptom/aura outcomes, individual validation, and confounder controls, pressure changes cannot prove migraine prediction.

## 5. Public typing audit

We ran two descriptive checks on public timing measurements. Neither dataset entered the live model's training or supplied fatigue labels. Run `python scripts/audit-public-typing.py` to download the sources, verify publisher checksums, and regenerate the [aggregate results](research/public-typing-audit.json). The repository publishes only aggregate results.

| Data and comparison | Above reference threshold |
|---|---:|
| CMU · remaining blocks in the first session | 24 / 357 (6.7%) |
| CMU · blocks from the seven later sessions | 831 / 3,570 (23.3%) |
| Inputlog · fourth word block vs. first three | 60 / 73 (82.2%) |
| Inputlog · sentence block vs. first three word blocks | 16 / 73 (21.9%) |

- **CMU Keystroke Dynamics Benchmark.** From 20,400 fixed-password repetitions across 51 typists, we took the median key-hold duration of each nonoverlapping block of five repetitions. For each typist, the baseline was the median of their first three blocks. The threshold was a hold more than 15% above baseline, the live scoring rule's dwell tolerance. Blocks are repeated observations from the same typists. This design measures drift across recording sessions and includes any normal change or other unmeasured condition.
- **Inputlog Copy Task Corpus.** [Van Waes et al., Zenodo release](https://doi.org/10.5281/zenodo.5803401). We included 73 complete QWERTY desktop/laptop tasks from the 491-task English release, requiring a positive timing spread and at least 20 targeted inter-key intervals in each of five blocks. For each task, the baseline was the median standard deviation of the first three word blocks. The comparison uses the app's 25% rhythm tolerance as a reference. The corpus reports standard deviations for targeted intervals and does not provide the exact app feature set in this release. Task content and task order can both contribute to the differences.

The audit compares individual timing measures. It cannot estimate classifier accuracy, clinical false alarms, or fatigue detection.

## 6. Condition-screening research model (not deployed)

`scripts/condition-screening-eval.py` trains per-person classifiers to separate self-reported Parkinson's from no Parkinson's in the Tappy data, using seven timing features (hold, latency and flight medians and spreads, and left/right hold asymmetry). Each participant is one row, and evaluation is 5-fold stratified cross-validation repeated 10 times, so no person appears in both training and test data. Results are in [research/condition-screening-eval.json](research/condition-screening-eval.json).

| Model (192 people: 143 with, 49 without) | ROC-AUC | Detected at 90% specificity |
|---|---:|---:|
| Chance | 0.50 | 10% |
| Logistic regression | 0.52 | 14% |
| Random forest | 0.50 | 13% |

Typing timing alone did not separate the groups in this data. The model is therefore not used in the app, which shows it as "coming soon · in research". Releasing condition screening would need clinician-confirmed labels from the same typing task and independent clinical validation.

## Why unspecified Kaggle/Hugging Face datasets were not imported

Kaggle and Hugging Face are hosting platforms. “Keystroke biometrics,” “fatigue,” or “cognitive fatigue” do not identify a specific licensed, compatible dataset. Research located generic processed typing data and fatigue reproduction results, but did not establish an additional source with verified keystroke event definitions, suitable clinical labels, and demonstrated external validity for this app. Original CMU, Tappy, and SWELL sources were preferred over unverified reuploads.

Additional sources should be added only after checking their license, collection protocol, participant independence, label quality, compatible feature definitions, and a held-out participant evaluation. Do not split rows from the same participant between training and test sets or present public-source citations as proof of clinical accuracy.

## Reproduce

```sh
python scripts/build-research.py
python scripts/real-typing-eval.py
node scripts/train-typing-model.js
npm test
```

Python uses the standard library only. Downloads include the approximately 85 MB Tappy archive. The generated artifact contains hashes, filters, sample counts, methods, references, and explicit limitations. Clinical validation is `false` by design. The website exposes the same information at `/sources` and `GET /api/research`.
