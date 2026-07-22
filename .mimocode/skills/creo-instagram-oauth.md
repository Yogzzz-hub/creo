---
description: Debug and verify Instagram OAuth integration across frontend, Next.js route handler, and FastAPI backend
---

# Instagram OAuth Debug

Debug the Instagram OAuth flow across three layers: frontend → Next.js route handler → FastAPI backend.

## Flow Architecture

```
Frontend (IntegrationsTab)
  → Facebook OAuth Dialog (v21.0)
  → Redirect to /api/auth/callback/instagram
  → Next.js Route Handler (apps/web/app/api/auth/callback/instagram/route.ts)
  → POST to ${NEXT_PUBLIC_API_URL}/api/v1/account/instagram
  → FastAPI routers/account.py
  → services/instagram.py (token exchange + encryption)
  → Store in DB (users.instagram_access_token)
```

## Environment Variables

| Layer | Variable | Purpose |
|-------|----------|---------|
| Frontend | `NEXT_PUBLIC_INSTAGRAM_APP_ID` | Facebook App ID for OAuth dialog |
| Frontend | `NEXT_PUBLIC_API_URL` | Backend URL for callback POST |
| Backend | `INSTAGRAM_APP_ID` | Facebook App ID for token exchange |
| Backend | `INSTAGRAM_APP_SECRET` | Facebook App Secret for token exchange |
| Backend | `INSTAGRAM_REDIRECT_URI` | Must match Facebook app settings |

## Common Issues

### 1. Callback Returns 404

**Symptoms:** User clicks "Connect Instagram", redirected to callback URL, sees 404.

**Check:**
- Route file exists at `apps/web/app/api/auth/callback/instagram/route.ts`
- Middleware not crashing on API routes (check `middleware.ts` matcher)
- Supabase `getUser()` not throwing on API route requests

**Fix:**
```typescript
// route.ts must handle errors gracefully
export async function GET(request: Request) {
  try {
    // ... exchange code for token
  } catch (error) {
    return NextResponse.redirect(new URL('/portal/account?error=connection_failed', request.url));
  }
}
```

### 2. Backend Returns 401

**Symptoms:** Callback POST to backend fails with 401 Unauthorized.

**Check:**
- Next.js route handler sends `Authorization: Bearer ${session.access_token}`
- Backend `RequireActiveClient` dependency not blocking
- Supabase session exists in cookies

**Fix:**
```typescript
// route.ts must forward JWT
const supabase = await createClient();
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(`${apiUrl}/api/v1/account/instagram`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ code, redirect_uri }),
});
```

### 3. Token Not Persisted

**Symptoms:** Instagram shows "Connected" but disconnects on page refresh.

**Check:**
- Backend `services/instagram.py` encrypts token before storage
- DB column `users.instagram_access_token` has value
- Frontend reads from DB endpoint, not `user_metadata`

**Fix:**
- Use `GET /api/v1/account/instagram/status` endpoint
- Don't read from `user.user_metadata?.instagram_access_token`

### 4. Scope Mismatch

**Symptoms:** Token exchange succeeds but API calls fail with permission errors.

**Check:**
- Frontend requests `pages_read_engagement` (not just `pages_show_list`)
- Facebook App has Instagram Basic Display + Instagram Graph API permissions
- Token has required scopes

**Required scopes:**
- `pages_show_list`
- `pages_read_engagement`
- `instagram_basic`
- `instagram_content_publish`

### 5. Redirect URI Mismatch

**Symptoms:** Facebook OAuth dialog shows "Redirect URI does not match" error.

**Check:**
- Frontend constructs: `${window.location.origin}/api/auth/callback/instagram`
- Next.js route handler: `${new URL(request.url).origin}/api/auth/callback/instagram`
- Backend env: `INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/callback/instagram`
- Facebook App settings: Valid OAuth Redirect URIs includes callback URL

**All three must match exactly.**

## Debugging Steps

1. **Check browser network tab** — Look for failed requests to callback URL
2. **Check Next.js server logs** — Route handler logs errors to console
3. **Check FastAPI logs** — Backend logs `logger.error()` for failures
4. **Check database** — Query `users.instagram_access_token IS NOT NULL`
5. **Test with curl** — Manually test backend endpoint with valid JWT

## Verification

After fixing:
1. Click "Connect Instagram" in IntegrationsTab
2. Complete Facebook OAuth dialog
3. Verify redirect to `/portal/account` with no error params
4. Verify "Connected" status shows immediately (no flash)
5. Refresh page — verify "Connected" persists
6. Click "Disconnect" — verify token removed from DB
