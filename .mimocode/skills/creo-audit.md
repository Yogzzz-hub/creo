---
description: Perform a full-stack audit of the Creo codebase covering security, performance, and correctness
---

# Creo Full-Stack Audit

Systematic audit of the Creo codebase. Read-only by default — fixes require explicit user authorization.

## Audit Scope

### 1. Backend Security (`apps/api/`)

**Files to check:**
- `core/security.py` — JWT validation, auth dependencies, token revocation
- `core/exceptions.py` — Error handlers, rate limiting, debug leaks
- `core/config.py` — Environment variable handling, secret exposure
- `routers/` — All route handlers for auth bypass, input validation

**Look for:**
- Debug `print()` statements dumping headers/tokens
- Missing `RequireActiveClient` / `RequireAdmin` dependencies
- Hardcoded secrets or credentials
- Rate limiting gaps on public endpoints
- CORS misconfiguration

### 2. Backend Performance (`apps/api/`)

**Files to check:**
- `models/user.py` — Relationship loading strategy (`lazy="selectin"` vs `lazy="raise"`)
- `core/database.py` — Connection pooling, async session handling
- `workers/` — Celery task patterns, `_run_async` usage

**Look for:**
- N+1 query patterns from `lazy="selectin"` on high-traffic models
- Missing `AsyncSession` usage in route handlers
- Synchronous blocking calls in async context

### 3. Frontend Auth Flow (`apps/web/`)

**Files to check:**
- `middleware.ts` — Route protection, role-based redirects
- `lib/supabase/client.ts` — Singleton pattern, token handling
- `lib/portal-api.ts` — `portalFetch<T>()` error handling
- `store/auth.ts` — Zustand state management

**Look for:**
- Auth bypass via missing middleware matcher
- Token refresh race conditions
- Inconsistent error handling (401 vs 403)
- Multiple Supabase client instances

### 4. Portal Components (`apps/web/app/(portal)/`)

**Files to check:**
- `layout.tsx` — Provider nesting, guard placement
- `portal/page.tsx` — Dashboard data loading
- `portal/account/page.tsx` — Profile, security, integrations tabs
- `portal/deliverables/[id]/page.tsx` — Detail page auth

**Look for:**
- Missing loading states (flash of wrong content)
- Missing `AbortController` in `useEffect` cleanup
- Auth errors not caught (causing 401 redirects)
- Duplicate API calls across providers

### 5. Instagram Integration

**Files to check:**
- `services/instagram.py` — Token exchange, container publishing
- `routers/account.py` — OAuth callback handling
- `app/api/auth/callback/instagram/route.ts` — Next.js route handler
- `components/portal/account/page.tsx` — IntegrationsTab

**Look for:**
- Scope mismatches (Facebook vs Instagram permissions)
- Token storage disconnect (metadata vs DB column)
- Missing auth header in callback POST
- Container polling timeout handling

## Output Format

```
## Audit Report — [DATE]

### Critical (C)
- [C1] Description — File:Line — Impact

### High (H)
- [H1] Description — File:Line — Impact

### Medium (M)
- [M1] Description — File:Line — Impact

### Good Practices (G)
- [G1] Description — File:Line — Note
```

## Rules

1. **Read-only unless authorized** — Do not modify files unless user explicitly requests fixes
2. **Cite specific files and lines** — Every finding must reference exact location
3. **Prioritize by impact** — C = crashes/security, H = performance/correctness, M = code quality
4. **Check memory first** — Read `MEMORY.md` to avoid re-reporting known issues
