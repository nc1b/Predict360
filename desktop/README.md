# Predict 360 desktop app

A downloadable desktop version of Predict 360 for Windows. It opens a dedicated
window showing the check-in, and you do a check-in by typing your two sentences
into that window, exactly as on the website.

## What it does and does not do

- It measures the timing of the keys you press **in the check-in box**, while that
  box is focused — the same as the web app.
- It does **not** run in the background, and it does **not** record or monitor
  anything you type in other applications. It is a focused check-in app, not a
  system-wide keyboard monitor.

## Run it (needs Node.js)

```bash
npm install
```

```bash
npm start
```

This opens the window pointed at the live app (https://predict360.vercel.app), so
it needs an internet connection. To point it at a local backend instead:

```bash
set PREDICT360_URL=http://localhost:3000 && npm start
```

## Build a downloadable `.exe`

```bash
npm run dist
```

This produces, in `desktop/release/`:

- `Predict 360 <version>.exe` — a portable single file you can double-click.
- `Predict 360 Setup <version>.exe` — an installer.

`electron-builder` downloads its Windows build tools on first run, so the first
build needs an internet connection and a few minutes.
