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
