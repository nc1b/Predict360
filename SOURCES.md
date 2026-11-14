# Sources and research limits

Predict 360 uses **public datasets only for its research reference pipeline**. Private app-user records are never training inputs. `scripts/build-research.py` downloads public files, verifies publisher checksums, converts units, aggregates by participant, and writes `research/benchmarks.json`. Raw downloads are gitignored; the app and AI receive aggregate references only.

These are descriptive reference distributions, not a trained disease classifier. The existing experimental score still compares a check-in with that same person's earlier check-ins. Its scoring thresholds are hand chosen and synthetic tested; they were **not** fitted to these public datasets. No clinical accuracy improvement, universal millisecond cutoff, migraine aura detection, or hydration inference has been established.

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

## Why unspecified Kaggle/Hugging Face datasets were not imported

Kaggle and Hugging Face are hosting platforms. “Keystroke biometrics,” “fatigue,” or “cognitive fatigue” do not identify a specific licensed, compatible dataset. Research located generic processed typing data and fatigue reproduction results, but did not establish an additional source with verified keystroke event definitions, suitable clinical labels, and demonstrated external validity for this app. Original CMU, Tappy, and SWELL sources were preferred over unverified reuploads.

Additional sources should be added only after checking their license, collection protocol, participant independence, label quality, compatible feature definitions, and a held-out participant evaluation. Do not split rows from the same participant between training and test sets or present public-source citations as proof of clinical accuracy.

## Reproduce

```sh
python scripts/build-research.py
npm test
```

Python uses the standard library only. Downloads include the approximately 85 MB Tappy archive. The generated artifact contains hashes, filters, sample counts, methods, references, and explicit limitations. Clinical validation is `false` by design. The website exposes the same information at `/sources` and `GET /api/research`.
