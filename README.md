# TrailLog

A small, free and privacy-first running tracker. Built with Vite + React, wrapped as an Android app with Capacitor. Runs are stored **on your device only** unless you export them as GPX.

> TrailLog is an original project and is not affiliated with or endorsed by Strava. No Strava code, data, branding or API is used. Map data © OpenStreetMap contributors.

## Features

- GPS run tracking with live distance, pace, time and elevation
- Interactive map with your route (OpenStreetMap tiles)
- Local run history with detail view
- Weekly chart, totals and personal bests
- GPX import-ready export (share or download)
- Kilometres/miles and weight-based calorie estimate
- No account, no ads, no cloud sync

## Get a free APK via GitHub Actions

You do **not** need the Android SDK on your own computer. GitHub builds it for you for free.

1. Create a free GitHub account if you don't have one.
2. Create a new **public** repository (e.g. `trail-log`).
3. Upload all files from this folder to that repository (or push with git):

   ```bash
   cd trail-log
   git init
   git add .
   git commit -m "Initial TrailLog"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/trail-log.git
   git push -u origin main
   ```

4. In the repo, open the **Actions** tab. The `Build Android APK` workflow runs automatically.
5. When it finishes (green check), click the run → scroll to **Artifacts** → download `trail-log-debug-apk`.
6. Unzip it and install `app-debug.apk` on your Android phone (you may need to allow "Install unknown apps" for your file manager/browser).

You can also trigger a build manually from the **Actions** tab → `Build Android APK` → **Run workflow**.

### Changing the app name or package ID

- App name: `capacitor.config.ts` → `appName`, and `android/app/src/main/res/values/strings.xml`.
- Package ID: `capacitor.config.ts` → `appId`, then run `pnpm exec cap set appId com.yourname.trailog` and rebuild.

## Local development

```bash
pnpm install
pnpm dev        # browser preview (localhost is treated as secure for GPS)
pnpm build      # typecheck + production web build into dist/
pnpm exec cap sync android
```

To build directly on a machine with the Android SDK installed:

```bash
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## Known limitations

- Recording works while the app is open. True background tracking needs a foreground service and is not included in this MVP.
- GPS accuracy depends on your device and environment; outdoor runs work best.
- The debug APK is signed with Android's default debug key. It's fine for sideloading; for the Play Store you would create your own signing key and a signed release build.
- OSM's public tile servers are for reasonable, non-bulk use. For a large user base, use your own tile provider.
