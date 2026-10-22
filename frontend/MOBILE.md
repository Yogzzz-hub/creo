# Creo mobile apps (Android and iOS)

The apps are the same React build as the website, wrapped with [Capacitor 8](https://capacitorjs.com/docs).
`npm run build` produces `dist/`, and `cap sync` copies it into the native projects in `android/` and `ios/`.
There is no separate mobile codebase: a change to the web app ships to the apps on the next build.

| | |
|---|---|
| App id | `com.creo.app` |
| Name | Creo |
| Native config | `capacitor.config.ts` |
| Native shell code | `src/lib/native.ts`, `src/app/NativeShell.tsx`, `src/lib/app-oauth.ts` |
| Icon and splash sources | `resources/` (made from `creo_icon_1024.jpg`) |

## How the app differs from the website

- **API.** Inside the app the page is served from the device (`https://localhost` on Android,
  `capacitor://localhost` on iOS), so there is no `/api` proxy. The app calls the website's API proxy at
  `VITE_PUBLIC_WEB_URL` (default `https://creo.yogalakshmibaskar20.workers.dev`), the same route the website
  uses, and loads media from the Render API. `VITE_API_URL` is ignored in the app; set `VITE_NATIVE_API_URL`
  to point an app build at another backend (for example `http://10.0.2.2:8000` for a local backend from the
  Android emulator).
- **Sign-in tokens** stay in `localStorage` (`creo_access_token`, `creo_refresh_token`), which persists in the
  app's WebView like it does in a browser.
- **Google sign-in and Meta (Facebook/Instagram) connect** run in the system browser, because Google blocks
  sign-in inside embedded WebViews and both providers redirect to the website:
  1. The app opens `<website>/app-oauth?to=<consent URL>` in the system browser (only Google, Facebook and
     Instagram consent hosts are accepted).
  2. After consent, the provider returns to the website's normal callback page. That page sees the flow was
     started by the app and, instead of finishing it, shows "Open the Creo app" and opens
     `com.creo.app://app/<callback path>?code=…&state=…`.
  3. The app catches the link, closes the browser and finishes on its own callback page, checking the state
     (and Meta's verifier) it saved before leaving.
- **Links for other people** (share links, copied ticket links, onboarding links) use the website's address,
  not the app's local one.
- **Android back button** closes an open dialog first, then goes back, then leaves the app in the background.
- **System bars.** The page stays clear of the status bar, notch and home indicator; the strips behind them
  follow the light/dark theme through the page's `theme-color` (the small `SystemChrome` plugin in
  `android/app/src/main/java/com/creo/app/` and `ios/App/App/MainViewController.swift`).
- **Razorpay** uses the same Checkout script as the website. `*.razorpay.com` pages stay inside the app; other
  external links open in the system browser, and UPI links open the UPI app.

## Prerequisites

- Node 22 or newer, then `npm ci` in `frontend/`.
- **Android:** JDK 21 (Capacitor 8 compiles Java 21) and the Android SDK with platform 36. Android Studio
  includes both. Without it, install a JDK 21 (for example Temurin 21) and the SDK command-line tools, and set
  `JAVA_HOME` and `ANDROID_HOME`.
- **iOS:** a Mac with the latest Xcode from the App Store. iOS cannot be built on Windows or Linux.

## Everyday commands (run in `frontend/`)

```bash
npm run cap:sync         # build the web app and copy it into android/ and ios/
npm run cap:android      # sync, then open the project in Android Studio
npm run cap:run:android  # sync, then build and install on a connected device or emulator
npm run cap:ios          # sync, then open the project in Xcode (Mac only)
npm run cap:assets       # regenerate icons and splash screens from resources/
```

Run `cap:sync` after every web change and after adding or updating a Capacitor plugin.

## Android

Debug APK from the command line:

```bash
cd android
./gradlew assembleDebug        # Windows: gradlew.bat assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`; install it with
`adb install -r app/build/outputs/apk/debug/app-debug.apk`.

Troubleshooting on Windows:

- `jlink executable … does not exist`: `JAVA_HOME` points at a runtime without `jlink` (for example an IDE's
  bundled runtime). Point it at a full JDK 21.
- `Unable to establish loopback connection`: Java cannot create its local socket in the temp folder. Set
  `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\some\short\folder` and run Gradle again.

### Release (Google Play)

1. Raise `versionCode` (by one each upload) and `versionName` in `android/app/build.gradle`.
2. Create an upload key once and keep it outside the repository (`*.jks` and `*.keystore` are git-ignored):
   `keytool -genkey -v -keystore creo-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias creo`
3. Build a signed App Bundle, either from Android Studio (**Build → Generate Signed App Bundle**) or with
   `npx cap build android --keystorepath <path> --keystorepass <pass> --keystorealias creo --keystorealiaspass <pass> --androidreleasetype AAB`.
4. Upload the `.aab` to the Play Console. Enrol in Play App Signing, so Google holds the app signing key.

## iOS (on a Mac)

1. `npm ci && npm run cap:ios` in `frontend/`. Xcode opens `ios/App/App.xcodeproj` and resolves the Swift
   packages (Capacitor and its plugins) on first open.
2. In **Signing & Capabilities**, choose the team and keep the bundle identifier `com.creo.app`
   (register it in the Apple Developer account if needed).
3. Run on a simulator or a device with ⌘R.
4. Release: raise the version and build in the target's **General** tab, then **Product → Archive** and
   **Distribute App → App Store Connect**. Submit through TestFlight and App Review.

Check on a real iPhone with a notch before the first release that the page sits below the status bar
(`ios.contentInset: "always"` in `capacitor.config.ts`), and that light/dark theme switching recolours the
strips above and below the page.

## Before the apps can sign in against production

- **Backend:** deploy `backend/app/main.py` with this change. Its CORS rule now accepts `https://localhost`
  (Android) and `capacitor://localhost` (iOS); until it is live, every API call from the app is blocked.
- **Website:** deploy the web build from this branch to Cloudflare. The `/app-oauth` page and the hand-back
  on the Google and Meta callback pages run on the website, so the app's Google and Meta flows need it.
- **Google Cloud console and Meta app settings: no change needed.** The redirect URIs stay the website's
  (`<website>/auth/google/callback` and `INSTAGRAM_REDIRECT_URI`), which are already registered.

## Known gaps and follow-ups

- **Verified app links.** The custom scheme `com.creo.app://` can in principle be claimed by another app on
  the same phone. For production, add Android App Links and iOS Universal Links for the website's domain
  (host `/.well-known/assetlinks.json` with the release key's SHA-256, and `apple-app-site-association`
  with the team id), then return to `https://<website>/app/...` instead of the custom scheme. Adding PKCE to
  the Google code exchange in the backend would also make an intercepted code useless.
- **Razorpay** has only been checked in the browser. Test card (3-D Secure), UPI and netbanking payments on a
  device in test mode. If a method fails inside the WebView, switch the app to Razorpay's native SDK
  (`capacitor-razorpay`).
- **File downloads** made in the browser (PDF invoices and proposals via `jsPDF`, ZIP downloads) do not save
  inside an Android WebView. They need `@capacitor/filesystem` plus `@capacitor/share` in the app.
- **Email links** (verification, password reset) open the website, not the app, until app links exist.
- **Push notifications** are not set up.
