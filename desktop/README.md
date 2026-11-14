# Predict 360 desktop

An opt-in activity tracker across applications, connected to your website account. The app and Windows installer use the website's logo.

## Use it

1. Download the Windows installer from the website. It is served from Supabase Storage; you stay on the website.
2. Install and open Predict 360. Tracking starts **paused**.
3. Choose **Connect account**. Your browser opens the website's sign-in page.
4. Sign in with your usual account, choose **Connect this account**, then **Return to desktop**. Allow the browser to open Predict 360.
5. Choose **Start tracking**. Pause at any time in the window or system tray.

The dashboard shows clicks, key presses, scroll counts, and active/idle time. Activity is grouped by local day and hour, saved locally, and synced about once a minute. The website dashboard refreshes about once a minute. **Explain my day** uses the existing Hack Club AI integration on the website, with numeric summaries and public research context.

The app never saves typed words, key values, pointer coordinates, screenshots, or application names. Mouse movement marks activity. No input for 60 seconds counts as idle. Tracking pauses on sleep or screen lock, and remains paused when the app restarts. Closing the window while tracking leaves the app in the system tray; **Quit and stop tracking** ends it.

Desktop credentials are encrypted using the operating system's credential facility when one is available. If secure storage is unavailable, the app requires sign-in again after restart. Disconnecting first syncs your activity and revokes this desktop session. Deleting activity revokes every desktop connection; reconnecting starts from the cloud's remaining history so deleted local queues do not restore deleted data.

## Develop

From the repository root:

```sh
npm ci
npm ci --prefix desktop
npm start --prefix desktop
```

For a local website/backend, set `PREDICT360_URL=http://localhost:3000` before starting. The hosted Supabase sync service allows `localhost:3000` and `localhost:5173` website origins; the local website still uses the same Clerk account instance.

A desktop environment is required for the global hook. Windows is the supported packaged target. macOS requires Accessibility permission. Linux requires X11; Wayland global input capture is not supported. A failed permission check leaves recording paused.

```sh
npm run dist --prefix desktop
```

This generates the website-derived icon and shared local analytics module, then builds `desktop/release/Predict360-<version>-Windows.exe`. The NSIS installer registers the `predict360://` sign-in callback. The app does not enable automatic startup at login.

## Release

Run **Desktop app (Windows)** in GitHub Actions. It installs locked dependencies, builds the installer, saves a workflow artifact, then publishes it to Supabase Storage. GitHub OIDC authenticates the upload; no Supabase service-role key is stored in GitHub. The Edge Function permits only this repository and release workflow, with a push or manual-dispatch event.

Release files are split into 40 MiB objects so the free Supabase per-object limit is respected. The manifest is updated after every chunk succeeds. The website assembles and SHA-256 checks the installer before saving it. Old versioned chunks remain available for rollback and should be removed when no longer needed.

The website's `/desktop/connect` route and `/api/activity/explain` endpoint must be deployed from the same change before distributing the new desktop app. Production defaults to `https://predict360.vercel.app`.

## Verification limits

The native hook was tested on isolated Linux X11 input and counted three synthetic key presses and one click. The Electron UI was exercised for paused startup and logo rendering. Windows packaging is checked by the release workflow. Full sign-in with a real website account requires a release check; no live test account or credential was created.
