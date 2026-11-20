# Predict 360 — technical reference

Predict 360 is an opt-in desktop activity tracker and website dashboard for a hackathon prototype. The desktop app counts clicks, key presses, scroll events, and active/idle time across applications. It syncs hourly summaries to the same Clerk account used on the website, through a protected Supabase Edge Function. The website also includes a short typing check-in that compares timing with your own earlier check-ins.

The desktop app starts paused. It never saves typed words, key values, pointer coordinates, screenshots, or application names. Tracking is visible in the system tray and pauses on screen lock or sleep.

AI explanations and chat use **Claude Sonnet 5.5**, and the daily analysis uses **Claude Opus 5.5**, through the Anthropic API with `ANTHROPIC_API_KEY` set in Vercel. Requests enable server-side refusal fallbacks. The key stays server-side, and explanation requests require a verified website or desktop account. Public CMU, Tappy, and SWELL-KW reference summaries are reproducible from public data; optional Open-Meteo pressure is contextual only. See [Sources and research limits](SOURCES.md). No disease detector was trained, no clinical accuracy improvement is established, and computer activity cannot establish hydration or readiness to work.

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
  a server-side call to the [Anthropic API](https://docs.anthropic.com/) (`src/ai.js`). Only the numeric result
  summary is sent (score and the three feature values vs. the user's usual) — never text or
  keystrokes. The key lives only on the server as `ANTHROPIC_API_KEY` (see `.env.example`); it is
  never in the browser bundle. Without the key the feature is simply unavailable.
- **Capture**: `web/src/lib/capture.ts` pairs keydown and keyup, drops modifier keys, shortcuts
  and auto-repeat, and keeps only `kind`, `downMs` and `upMs`. The typed text is never stored
  or sent, and the box is cleared when a check-in finishes.
- **History**: check-in feature summaries are cached per account on this device and synced to Supabase through a verified Clerk session. New offline check-ins are queued and retried on the next visit. Only summaries are stored; typed words and raw key timing are never persisted in the database. The latest 30 cached check-ins are available; baselines use only the current browser's device id so keyboards are not mixed.
- **Simulated sessions**: buttons on the check-in page replay the synthetic fixtures so the
  scoring can be shown without typing.
- **Phones**: on-screen keyboards usually do not report per-key timing, so a physical keyboard
  is needed.

### Deploying to Vercel

`vercel.json` builds `web/` as a static site and runs the Express app as one serverless
function (`api/index.js`) behind `/api/*` and `/health`. The Clerk publishable key for deployed
builds is in `web/.env.production`; the `ANTHROPIC_API_KEY` secret is set in the Vercel project
environment (never committed).

### Desktop app

`desktop/` is an Electron app for opt-in activity tracking across applications. Its logo and installer icon come from the website SVG assets. Install the Windows app, choose **Connect account**, sign in on the website, choose **Connect this account**, then **Return to desktop**. Choose **Start tracking** to begin. See [desktop/README.md](desktop/README.md).

### Supabase sync and downloads

The public project configuration is in `config/public.json`. The `Predict360` Supabase project was provisioned in `us-east-2` on the quoted $0/month project tier. Usage limits and future plan changes remain subject to Supabase's terms. Migrations and the deployed function source are in `supabase/`.

The Edge Function verifies Clerk JWT signatures, issuer, expiry, and allowed website origins. Desktop login uses a two-minute, single-use code with PKCE and random state. Desktop sessions last 30 days and are stored encrypted with the OS credential facility where available; otherwise they last only for the current app process. No service-role key is shipped to the website, desktop, or CI.

All private tables have RLS enabled and no anonymous/authenticated table access. Only the verified service can access them. Every query is scoped to the verified account. Activity writes are idempotent per device/day and revision. Deleting activity revokes desktop sessions transactionally so stale offline queues cannot recreate deleted history.

Run the **Desktop app (Windows)** GitHub Actions workflow to build an NSIS installer and publish it directly to the public Supabase `app-releases` bucket. GitHub OIDC authorizes publishing for this repository and workflow; no publishing secret is required. Downloads are split into objects below the Free tier's 50 MB limit, assembled by the browser, and SHA-256 verified before saving. Users stay on the website instead of being redirected to GitHub.

## Privacy

- The typing API accepts timing categories only; it rejects text, key values, and user identifiers.
- The desktop persists hourly counts and durations only, capped locally at 30 daily summaries. It ignores key repeats and keeps only a transient key-pairing set. Paused input is discarded.
- Private Supabase records contain the verified account id and feature/activity summaries. Raw typing and mouse event logs are not uploaded.
- Activity history reads cover the last 30 days. Older activity is pruned on subsequent writes. Check-in reads return the latest 30 summaries.
- Logs contain matched route names, status, and duration. Arbitrary URL paths, request bodies, provider errors, and credentials are not logged.
- Optional weather lookups send the city you enter to Open-Meteo. Only pressure numbers may reach the AI; location is not added to activity history.
- AI explanations use numeric summaries and public research aggregates. App-user records are never used by the public-data reference pipeline.

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

`POST /api/analyze` also returns `typingPattern` (`usual`, `different`, or `null` when the baseline or samples are insufficient). The classifier is logistic regression on `max(0, log(1 + current) - log(1 + baseline))` for each of the three timing measures, so only increases count. Its weights are trained on real typing from the CMU benchmark by `python scripts/real-typing-eval.py` and stored in [research/live-typing-model.json](../research/live-typing-model.json); the threshold is set so about 10% of unchanged real check-ins flag. Sentence pause is absent from that dataset, so its weight is set to flag at 1.5x usual. Held-out results are in [research/real-typing-eval.json](../research/real-typing-eval.json).

- **Baseline**: for each feature, the median across prior sessions that met that feature's
  minimum samples. At least 3 such sessions are required per feature.
- **Ratio**: `session value / baseline value`, using the unrounded ratio for deductions. Display ratios are rounded to two decimals. If both values are zero, the ratio is 1; an increase from zero uses `ratio: null` and the maximum feature deduction. Zero-variation baselines remain usable.
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
- All numbers live in [src/config.js](../src/config.js).

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
| fast | longer_key_holds | 300 | 300/300 | 0/300 | 300/300 | 73.3 |
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
| key holds x1.5 | long_key_hold | 300/300 | 85.7 |
| sentence pause x1.2 | long_sentence_pause | 0/300 | 100 |
| sentence pause x1.4 | long_sentence_pause | 0/300 | 100 |
| sentence pause x1.6 | long_sentence_pause | 300/300 | 99 |
| sentence pause x2 | long_sentence_pause | 300/300 | 93 |
| sentence pause x3 | long_sentence_pause | 300/300 | 79 |
| flight jitter x1.1 | uneven_typing_rhythm | 2/300 | 100 |
| flight jitter x1.2 | uneven_typing_rhythm | 83/300 | 99.8 |
| flight jitter x1.4 | uneven_typing_rhythm | 295/300 | 97.3 |
| flight jitter x1.7 | uneven_typing_rhythm | 300/300 | 92.1 |
| flight jitter x2 | uneven_typing_rhythm | 300/300 | 86.9 |

Changes near a threshold are detected inconsistently (for example, 83 of 300 at jitter x1.2).

### Automated tests

`npm test` covers scoring, strict validation, HTTP errors, explanation timeout/concurrency, source summaries, weather normalization, the desktop aggregate recorder, account isolation, PKCE code replay/expiry, revision ordering, deletion/revocation, and cloud check-in privacy. `npm run test:web` covers capture, history recovery and download manifest validation. The production build type-checks the frontend. CI runs application checks on Node 20 and 24.

The native global hook was exercised on an isolated Linux X11 display using three synthetic key presses and one mouse click, and returned exactly those counts. The actual Electron window was checked for its logo, paused startup, and hidden start control before sign-in. Authentication/storage tests use isolated repositories; a real-account browser-to-desktop sign-in is still a required release check. A temporary live test credential was blocked by automatic approval review and was not created.

### Additional APIs

- `POST /api/activity/analyze`: `{ day: { date: "YYYY-MM-DD", buckets: [{ hour, clicks, keyPresses, scrollEvents, trackedMs, activeMs }] }, baseline?: { days: [...] } }`. Up to 24 unique local-hour buckets and 30 earlier days. Returns totals, hourly activity, and descriptive baseline differences after 3 earlier days with at least 15 tracked minutes and 1 active minute. Idle begins after 60 seconds without input. Multiple devices are shown as combined computer-hours on the website.
- `POST /api/activity/explain`: the same day shape (32 KB maximum), explained with the existing Hack Club AI provider and public SWELL-KW context.
- `GET /api/research`: public source provenance, computed aggregate reference distributions, methods, and limitations.
- `POST /api/weather/context`: `{ city, date }`; modeled surface-pressure context from Open-Meteo, never a migraine predictor.
- Hosted sync: `config/public.json` → `cloudUrl?route=authorize|exchange|session|activity|checkins`. All private routes require a verified Clerk bearer token or a valid desktop session. `exchange` requires a one-time code and matching PKCE verifier. Release publishing additionally requires the expected GitHub Actions OIDC identity.

Explanation errors include 429 `ai_busy`, 502 `ai_error`, 503 `ai_unconfigured`, and 504 `ai_timeout`. Uncompressed UTF-8 JSON is required. Analyze and health responses are not cacheable. Unknown assets return 404 instead of the SPA HTML document.

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
