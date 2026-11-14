# Google mobile sign-in: compatible rollout

## Source change

Only optional PKCE fields are added to the existing Google authentication endpoints in backend/app/routers/auth.py:

- GET /api/v1/auth/google/url: optional code_challenge and code_challenge_method=S256. Mobile requests receive pkce_supported:true and the same challenge in the Google authorization URL.
- POST /api/v1/auth/google/callback: optional code_verifier, validated to the RFC length/alphabet and forwarded to Google's token exchange.
- Requests without these optional fields retain their existing response shape, redirect fallback and code-exchange calls. The GET browser callback, account linking, role assignment, password login, database schema and dependencies are unchanged.
- PKCE code exchange uses the exact original redirect only; it does not try different redirects after an error.

## Required deployment order

1. Review/deploy the optional backend change to the Render service that serves https://creo-api-singapore.onrender.com.
2. Check the Google URL endpoint using the existing registered web callback https://creo.yogalakshmibaskar20.workers.dev/auth/google/callback and a valid S256 challenge. The response must advertise pkce_supported:true and echo the challenge/method in its Google URL.
3. Install the normal Flutter APK built from lib/main.dart.
4. Complete a real Google test-account journey: web /app-oauth bridge, Google consent, com.creo.app://app/auth/google/callback return, state check, one-use code/verifier exchange, secure session adoption, and role/onboarding destination.
5. Verify the unchanged legacy web Google login and password login against staging before production rollout. No live deployment or real-account consent has been performed by this task.

No new Google client secret is placed in Flutter. Existing Render environment values and Google Cloud registrations are not modified by this patch. The existing web callback reached Google's account-selection page in the previous read-only provider check. The current deployed web bundle contains the expected handoff. Neither observation alone proves a completed sign-in.

## Verification and limitations

- Full Flutter regression checkpoint: 288 tests passed.
- Backend isolated source-function compatibility tests: 10 passed (tests/test_google_pkce_isolated.py).
- The complete backend router suite could not collect because the local Python environment lacks the declared structlog dependency. No dependencies were installed or mocked to claim full backend startup coverage.
- Android normal-app APK and separate credential-free native-probe APK compiled. The emulator remained offline after a transport reconnect, so native runtime/key-generation verification was not executed.
- Normal APK is preserved/restored at frontend/app_flutter/build/app/outputs/flutter-apk/app-debug.apk. The probe is kept only under ignored build/google-native-qa/probe-app-debug.apk and was not installed.
- iOS callback source is included but cannot be compiled or executed on this Windows machine.

## Live readiness check after resuming

The web handoff was found in the current deployed web bundle. The hosted Render API returned hosted_backend_mobile_pkce_ready=False. Therefore deployment is still required; the app deliberately blocks mobile Google sign-in with a clear message on an old backend instead of downgrading PKCE.

## Latest-main review

Remote backend blob 1b18f340d69602875bd337beb17d25ca7a41e361 differs from the older checkout. The five OAuth definitions affected by this patch are semantically identical in that remote source; the prepared latest-main patch preserves all newer non-OAuth code. All 10 isolated compatibility checks passed against that patched remote source as well. No push or deployment has been performed.

## Native Android account picker

The optional GET /api/v1/auth/google/android/config returns only the existing public server client ID. POST /api/v1/auth/google/android/callback accepts a one-use Google SDK server authorization code as JSON with the code field. The backend exchanges it with Google using the existing server credentials and an empty redirect, then runs the existing account-linking, suspension, role and session processor. Native exchanges have no browser redirect fallback. Existing browser endpoints retain their contracts. No database or environment changes are needed.

Flutter uses google_sign_in 7.2.0. Google identifies the Android OAuth client from the installed applicationId and signing certificate. The supplied Android client ID and backend server client must be in the same Cloud project. The SDK uses the Web client as serverClientId. Only public registration metadata is bundled.

Deploy this extension before testing the new Android app. A missing config endpoint produces an explicit setup-pending error before opening account selection. Verify a real native account selection and server exchange on a Google-enabled Android device, existing web sign-in, cancellation, logout and role gates. Local fixtures and compilation do not prove provider registration.
