# Predict 360

Predict 360 is a hackathon prototype for a two-sentence morning check-in. It takes keystroke
**timing** from one check-in, computes three typing features, and compares them with the same
person's earlier check-ins. It is for anyone who wants a quick way to reflect on how their
morning is going. This repo holds the backend (Node.js, Express) and the frontend (React,
Tailwind, shadcn-style components) in `web/`.

This project is a prototype and is not medical advice.

The score is an experimental comparison with the user's usual typing. The fixtures simulate
typing changes only. They cannot establish Parkinson's, depression, burnout, migraine, clinical
accuracy, or whether someone is ready to work.

## Setup

Requires Node.js 20 or newer (built and tested on Node 24.19).

Install both parts:

```bash
npm install
```

```bash
npm install --prefix web
```

Build the frontend, then start everything on one port:

```bash
npm run build
```

```bash
npm start
```

Open `http://localhost:3000` (override the port with `PORT`). Without a build, `npm start`
serves the API only.

| Command | What it does |
|---|---|
| `npm test` | Backend tests (`node:test`) |
| `npm run test:web` | Frontend unit tests (Vitest) |
| `npm run dev:web` | Frontend dev server on port 5173, proxying `/api` to port 3000 |
| `npm run evaluate` | Runs the labeled fixtures through the algorithm and the naive comparator |
| `npm run robustness` | Stress test across simulated typist profiles plus a sensitivity sweep |
| `npm run fixtures` | Regenerates `fixtures/json/*.json` (deterministic) |

Try the API directly:

```bash
curl -s -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" --data @fixtures/json/four_second_pause.request.json
```

(In PowerShell use `curl.exe` instead of `curl`.)

## Frontend

- **Design**: black-and-white theme with light and dark modes, modeled on the team's Iris Checks
  site. The logo is an original SVG (`web/public/logo.svg`, transparent background). Hero photos
  are free-to-use Unsplash images loaded from Unsplash.
- **Pages**: landing (`/`), sign in (`/login`), sign up (`/signup`), check-in (`/app`), and a 404.
- **Sign-in**: [Clerk](https://clerk.com). Set `VITE_CLERK_PUBLISHABLE_KEY` in `web/.env.local`
  for local development (see `web/.env.example`). The check-in requires signing in.
- **AI explanation**: the check-in page has an "Explain" button that calls `POST /api/explain`,
  a server-side proxy to the [Hack Club AI](https://ai.hackclub.com) API. Only the numeric result
  summary is sent (score and the three feature values vs. the user's usual) — never text or
  keystrokes. The key lives only on the server as `HACKCLUB_AI_KEY` (see `.env.example`); it is
  never in the browser bundle. Without the key the feature is simply unavailable.
- **Capture**: `web/src/lib/capture.ts` pairs keydown and keyup, drops modifier keys, shortcuts
  and auto-repeat, and keeps only `kind`, `downMs` and `upMs`. The typed text is never stored
  or sent, and the box is cleared when a check-in finishes.
- **History**: each check-in's three feature values are kept in the browser's localStorage under
  the signed-in user's id, and sent back as the `baseline` for the next check-in. Clerk user ids
  are never sent to the backend.
- **Simulated sessions**: buttons on the check-in page replay the synthetic fixtures so the
  scoring can be shown without typing.
- **Phones**: on-screen keyboards usually do not report per-key timing, so a physical keyboard
  is needed.

### Deploying to Vercel

`vercel.json` builds `web/` as a static site and runs the Express app as one serverless
function (`api/index.js`) behind `/api/*` and `/health`. The Clerk publishable key for deployed
builds is in `web/.env.production`; the `HACKCLUB_AI_KEY` secret is set in the Vercel project
environment (never committed).

### Desktop app

`desktop/` is an [Electron](https://www.electronjs.org/) app that opens the check-in in its own
window. It loads the deployed site, so you do a check-in by typing into the window, exactly as on
the web. It does not run in the background and does not record typing in other applications. See
`desktop/README.md` to run it (`npm start`) or build a downloadable `.exe` (`npm run dist`).

## Privacy

- The API accepts only `kind`, `downMs` and `upMs` per keystroke. Requests that include any
  other field (key values, text, user ids) are rejected with a 400.
- Requests are processed in memory and discarded. There is no database and no file output.
- The access log records method, path, status and duration only. Request bodies are never logged.

## API

### `GET /health`

```json
{ "status": "ok", "service": "predict360-backend", "version": "0.1.0" }
```

### `POST /api/analyze`

Header: `Content-Type: application/json`. Body limit: 256 KB.

```jsonc
{
  // Required. One check-in, ordered by downMs. 1 to 5000 events.
  "keystrokes": [
    { "kind": "character",    "downMs": 0,    "upMs": 92 },
    { "kind": "character",    "downMs": 148,  "upMs": 251 },
    { "kind": "space",        "downMs": 310,  "upMs": 398 },
    { "kind": "sentence_end", "downMs": 4630, "upMs": 4722 },
    { "kind": "space",        "downMs": 4790, "upMs": 4880 },
    { "kind": "character",    "downMs": 5330, "upMs": 5421 }
    // ...
  ],
  // Optional. Up to 30 earlier check-ins. Each entry is EITHER raw keystrokes
  // OR the `features` object returned by an earlier /api/analyze call.
  "baseline": {
    "sessions": [
      { "keystrokes": [ /* same shape as above */ ] },
      { "features": {
          "dwellMs":            { "value": 94,    "samples": 65 },
          "sentencePauseMs":    { "value": 700,   "samples": 1 },
          "flightVolatilityMs": { "value": 17.75, "samples": 62 }
      } }
    ]
  }
}
```

Field rules:

| Field | Rule |
|---|---|
| `kind` | `character`, `space`, `sentence_end` (`.` `?` `!`), or `edit` (backspace/delete) |
| `downMs`, `upMs` | Finite numbers, milliseconds relative to session start, 0 to 3,600,000 |
| `upMs` | Must be `>= downMs` |
| Order | `downMs` must not decrease. Overlapping holds (next key down before the previous key is up) are accepted |
| Frontend duties | Pair keydown/keyup, drop modifier keys and auto-repeat before sending |

The simplest frontend flow: store the `features` object from each response (three numbers and
three counts, no keystrokes) and send the stored objects back as `baseline.sessions[i].features`.

### Response (200)

Actual output for `fixtures/json/four_second_pause.request.json`:

```json
{
  "readinessScore": 65,
  "status": "some_deviation",
  "reasons": [],
  "features": {
    "dwellMs": { "value": 95, "samples": 65, "minSamples": 20, "sufficient": true },
    "sentencePauseMs": { "value": 4000, "samples": 1, "minSamples": 1, "sufficient": true },
    "flightVolatilityMs": { "value": 15.99, "samples": 62, "minSamples": 20, "sufficient": true }
  },
  "baseline": {
    "sessionsProvided": 5,
    "features": {
      "dwellMs": { "value": 94, "sessionsUsed": 5, "minSessions": 3, "valid": true },
      "sentencePauseMs": { "value": 700, "sessionsUsed": 5, "minSessions": 3, "valid": true },
      "flightVolatilityMs": { "value": 17.75, "sessionsUsed": 5, "minSessions": 3, "valid": true }
    }
  },
  "comparisons": {
    "dwellMs": { "sessionMs": 95, "baselineMs": 94, "deltaMs": 1, "ratio": 1.01, "pointsDeducted": 0, "flag": null },
    "sentencePauseMs": { "sessionMs": 4000, "baselineMs": 700, "deltaMs": 3300, "ratio": 5.71, "pointsDeducted": 35, "flag": "long_sentence_pause" },
    "flightVolatilityMs": { "sessionMs": 15.99, "baselineMs": 17.75, "deltaMs": -1.76, "ratio": 0.9, "pointsDeducted": 0, "flag": null }
  },
  "drivers": [
    { "feature": "sentencePauseMs", "flag": "long_sentence_pause", "pointsDeducted": 35, "ratio": 5.71 }
  ],
  "flags": ["long_sentence_pause"],
  "experimental": true,
  "disclaimer": "Experimental comparison with your usual typing on synthetic-tested timing features. This project is a prototype and is not medical advice."
}
```

`status` values:

| Status | `readinessScore` | Meaning |
|---|---|---|
| `near_baseline` | 80 to 100 | Close to the user's usual typing |
| `some_deviation` | 50 to 79 | One or more features above usual |
| `large_deviation` | 0 to 49 | Features well above usual |
| `insufficient_samples` | `null` | A feature in this session has too few samples |
| `baseline_missing` | `null` | No `baseline` was sent |
| `baseline_insufficient` | `null` | Fewer than 3 usable prior sessions for a feature |

When the score is `null`, `features` still contains every metric that could be computed and
`reasons` lists what was missing. `comparisons[feature]` is `null` when no valid baseline exists
for that feature.

### Errors

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The request has validation problems.",
    "details": [
      { "path": "keystrokes[1].upMs", "message": "upMs (50) must be >= downMs (100)." }
    ]
  }
}
```

| HTTP | `code` | Cause |
|---|---|---|
| 400 | `invalid_request` | Validation failed; `details` lists up to 20 problems with paths |
| 400 | `invalid_json` | Body is not valid JSON |
| 413 | `payload_too_large` | Body over 256 KB |
| 415 | `unsupported_media_type` | Missing `Content-Type: application/json` |
| 404 | `not_found` | Unknown route |

## Feature rules

All values are in milliseconds, rounded to 2 decimals.

1. **Dwell time (`dwellMs`)**: median of `upMs - downMs` over every non-edit keystroke.
2. **Inter-sentence pause (`sentencePauseMs`)**: from the keydown of a `sentence_end` to the
   keydown of the next `character`. Spaces and edits in between are skipped. A run of
   punctuation (`?!`) measures from the last mark. A final mark with no following character
   adds no sample. Median when there is more than one pause.
3. **Flight-time volatility (`flightVolatilityMs`)**: population standard deviation of
   keydown-to-keydown intervals between adjacent non-edit keystrokes inside a sentence, pooled
   across sentences. The chain runs through the `sentence_end` and restarts at the first
   character of the next sentence, so the gap between sentences is never a flight interval.
   An edit breaks the chain rather than being bridged.

Minimum samples per session: dwell 20, sentence pause 1, flight intervals 20.

## Scoring rules

- **Baseline**: for each feature, the median across prior sessions that met that feature's
  minimum samples. At least 3 such sessions are required per feature.
- **Ratio**: `session value / baseline value`.
- **Points deducted** per feature: 0 at or below the tolerance ratio, the maximum at or above
  the full ratio, linear in between.

| Feature | Flag | Tolerance ratio | Full ratio | Max points |
|---|---|---|---|---|
| `dwellMs` | `long_key_hold` | 1.15 | 2.0 | 35 |
| `sentencePauseMs` | `long_sentence_pause` | 1.5 | 4.0 | 35 |
| `flightVolatilityMs` | `uneven_typing_rhythm` | 1.25 | 3.0 | 30 |

- **Score**: `readinessScore = clamp(round(100 - total points), 0, 100)`.
- A flag is raised whenever a feature deducts more than 0 points. `drivers` lists the flagged
  features, largest deduction first.
- Only increases are penalised. Typing faster or more evenly than usual scores 100.
- All numbers live in [src/config.js](src/config.js).

## Measured results

All results below are real output from this repo on synthetic data (`npm run evaluate`,
`npm run robustness`). No real people were tested.

### Labeled fixtures vs. a naive comparator

The naive comparator always returns `100` and flags nothing. Every fixture is scored against
the same 5-session synthetic baseline (dwell 94 ms, pause 700 ms, volatility 17.75 ms).
"Matches script" means the flags equal the change that was scripted into the fixture.

| Fixture | Scripted change | Dwell ms | Pause ms | Volatility ms | Algorithm score | Algorithm flags | Algorithm matches script | Naive score | Naive flags | Naive matches script |
|---|---|---|---|---|---|---|---|---|---|---|
| ordinary | none | 95 | 700 | 15.99 | 100 (near_baseline) | none | yes | 100 | none | yes |
| longer_key_holds | long_key_hold | 172 | 700 | 15.99 | 72 (some_deviation) | long_key_hold | yes | 100 | none | no |
| four_second_pause | long_sentence_pause | 95 | 4000 | 15.99 | 65 (some_deviation) | long_sentence_pause | yes | 100 | none | no |
| uneven_typing | uneven_typing_rhythm | 95 | 700 | 58.66 | 70 (some_deviation) | uneven_typing_rhythm | yes | 100 | none | no |
| distracted_pause | long_sentence_pause | 97 | 6500 | 18.97 | 65 (some_deviation) | long_sentence_pause | yes | 100 | none | no |

The algorithm matched the script on 5 of 5 fixtures. The naive comparator matched 1 of 5 (only
the ordinary session, where returning "no change" is correct).

The four-second-pause fixture has the same dwell (95) and volatility (15.99) as the ordinary
fixture: a long sentence pause moves only the pause feature.

### Confounder

`distracted_pause` simulates a typist who gets distracted for 6.5 seconds between sentences.
It produces the same flag (`long_sentence_pause`) and the same score (65) as the deliberately
simulated four-second pause. The backend cannot tell a doorbell from any other reason for a
pause. A flag means "this timing differed from your usual", nothing more.

### Simulated typist profiles

Three synthetic profiles (fast, average, slow), each with its own 5-session baseline and 300
seeded sessions per scenario (3,600 sessions total).

| Profile | Scenario | Sessions | Expected flag fired | Sessions with an unexpected flag | Exact match | Mean score |
|---|---|---|---|---|---|---|
| fast | ordinary | 300 | n/a | 0/300 | 300/300 | 100 |
| fast | longer_key_holds | 300 | 300/300 | 0/300 | 300/300 | 73.4 |
| fast | four_second_pause | 300 | 300/300 | 0/300 | 300/300 | 65 |
| fast | uneven_typing | 300 | 300/300 | 0/300 | 300/300 | 70 |
| average | ordinary | 300 | n/a | 0/300 | 300/300 | 100 |
| average | longer_key_holds | 300 | 300/300 | 0/300 | 300/300 | 73.3 |
| average | four_second_pause | 300 | 300/300 | 0/300 | 300/300 | 65 |
| average | uneven_typing | 300 | 300/300 | 0/300 | 300/300 | 70 |
| slow | ordinary | 300 | n/a | 0/300 | 300/300 | 100 |
| slow | longer_key_holds | 300 | 300/300 | 0/300 | 300/300 | 74.8 |
| slow | four_second_pause | 300 | 300/300 | 0/300 | 300/300 | 74 |
| slow | uneven_typing | 300 | 300/300 | 0/300 | 300/300 | 70 |

These clean results reflect large scripted changes on tidy generated data. Real typing is
noisier, so expect worse on people.

### Sensitivity sweep (average profile, 300 sessions per row)

How small a simulated change still raises its flag:

| Simulated change | Flag | Fired | Mean score |
|---|---|---|---|
| key holds x1.05 | long_key_hold | 0/300 | 100 |
| key holds x1.1 | long_key_hold | 2/300 | 100 |
| key holds x1.2 | long_key_hold | 295/300 | 98 |
| key holds x1.3 | long_key_hold | 300/300 | 93.9 |
| key holds x1.5 | long_key_hold | 300/300 | 85.6 |
| sentence pause x1.2 | long_sentence_pause | 0/300 | 100 |
| sentence pause x1.4 | long_sentence_pause | 0/300 | 100 |
| sentence pause x1.6 | long_sentence_pause | 300/300 | 99 |
| sentence pause x2 | long_sentence_pause | 300/300 | 93 |
| sentence pause x3 | long_sentence_pause | 300/300 | 79 |
| flight jitter x1.1 | uneven_typing_rhythm | 2/300 | 100 |
| flight jitter x1.2 | uneven_typing_rhythm | 77/300 | 99.8 |
| flight jitter x1.4 | uneven_typing_rhythm | 295/300 | 97.3 |
| flight jitter x1.7 | uneven_typing_rhythm | 300/300 | 92.1 |
| flight jitter x2 | uneven_typing_rhythm | 300/300 | 86.9 |

Changes near a threshold are detected inconsistently (for example, 77 of 300 at jitter x1.2).

### Automated tests

`npm test` runs 39 backend tests with `node:test` and `npm run test:web` runs 15 frontend tests
with Vitest; all pass. The backend tests cover the feature maths
(including a hand-computed example), each fixture moving only its expected feature, final
punctuation, overlapping holds, edits, short sessions, missing and insufficient baselines,
score clamping, request validation and error responses, log contents, the comparator
evaluation, and the multi-profile stress test. The frontend tests cover keystroke capture
(pairing, overlapping holds, auto-repeat, modifiers, lost keyups) and history storage.

The full flow was also exercised in a browser against the running backend: three typed
check-ins built a baseline, a fourth scored 100, and a fifth with a four-second pause between
sentences scored 65 with `long_sentence_pause`. Those keystrokes were scripted, not a person.

## Known limits

- Synthetic data only. Thresholds were chosen by hand for explainability, not fitted to people.
- A two-sentence check-in gives one sentence pause, so that feature rests on a single sample.
- The backend never sees text, so an `edit` right after a `sentence_end` that deletes the
  punctuation is still treated as a sentence boundary.
- A mid-sentence distraction would raise `uneven_typing_rhythm` instead of
  `long_sentence_pause`; either way the cause is unknowable from timing.
- Keyboards, devices and browsers change timing. A baseline from one device should not be
  compared with a session from another.

## Layout

```
src/config.js       thresholds, weights, limits
src/features.js     the three features
src/scoring.js      baseline, score, flags, naive comparator
src/validate.js     request validation
src/app.js          Express routes and error handling
src/server.js       entry point
fixtures/synthetic.js   seeded fixture generator
fixtures/json/          the same fixtures as ready-to-send request bodies
scripts/            evaluate, robustness, write-fixtures
test/               node:test suites
api/index.js        Vercel serverless entry for the Express app
web/                React frontend (Vite, Tailwind, Clerk)
web/src/lib/        capture, history, API client (with tests)
web/src/components/blocks/   navbar, hero, landing sections, footer
web/src/components/ui/   buttons, cards, calendar, alerts, QR code
web/src/pages/      landing, auth, check-in, 404
```
