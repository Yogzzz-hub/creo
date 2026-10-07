# Google account password setup and recovery — 7 October 2026

A Google-created account initially has no Creo password. Returning users can select Continue with Google and the same Google email to access the existing account. They can also set a Creo password through the recovery flow; this does not create another client account or change its team assignments, subscription, or onboarding progress.

## Frontend flow

1. On `/login`, select **Forgot password?** and enter the account email, including the same email used for Google signup. Signed-in clients can select **Set or reset password** in Account settings instead.
2. Send the verification code. The screen advances only after the API reports successful delivery. It explains the 10-minute expiry and checking spam.
3. Enter the six-digit code. Failed codes remain retryable; resend has a 60-second UI cooldown, and the user can change the email. Backend rate limits and OTP attempt/expiry validation remain authoritative.
4. Successful verification issues a restricted recovery token and opens the password setup dialog. Protected pages do not mount until setup finishes. Refreshing the page restores this state through the authenticated profile.
5. Enter and confirm a password with 8–128 characters, including a letter and a number. The backend stores a hash and returns an unrestricted access token. The frontend replaces the recovery token before opening the user's role-specific workspace.
6. Later, either Continue with Google or the same email and the new Creo password accesses this account.

The OTP verification and password setup responses include the saved onboarding stage to prevent returning clients from being sent back through signup.

## Validation

- Frontend production build passed.
- Backend suite after integrating the current main branch: 85 tests passed, 1 skipped. Recovery regressions cover account identity, onboarding state, restricted/unrestricted token claims, hashing, missing/expired/invalid codes, and excessive attempts.
- Controlled browser checks passed at 320px and 1440px, covering failed delivery retry, invalid code retry, refresh during recovery, mismatched passwords, password API failure retry, token replacement, and no protected dashboard requests before setup. [Evidence](password-recovery-browser-2026-10-07.json).
- The same recovery sequence also passed from the signed-in Account settings entry point at 320px. [Settings evidence](password-setup-settings-browser-2026-10-07.json).
- Browser requests were intercepted for deterministic testing. Actual mailbox delivery and Google provider login were not verified in these checks.
