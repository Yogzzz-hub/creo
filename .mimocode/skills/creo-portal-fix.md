---
description: Fix common issues in Creo portal pages following established patterns
---

# Creo Portal Page Fix

Apply consistent fixes to Creo portal pages. Follows patterns established across 30+ sessions.

## Common Fix Patterns

### 1. Add Loading State

Every portal page with async data fetching needs a loading state to prevent flash of wrong content.

```tsx
// Pattern: Loading state in portal page
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);

useEffect(() => {
  const controller = new AbortController();
  
  async function fetchData() {
    try {
      const result = await portalFetch<T>('/endpoint', { signal: controller.signal });
      setData(result);
    } catch (err) {
      if (err.name !== 'AbortError') {
        // Handle error (see pattern 2)
      }
    } finally {
      setLoading(false);
    }
  }
  
  fetchData();
  return () => controller.abort();
}, []);

if (loading) return <SkeletonLoader />;
```

### 2. Auth Error Handling

Portal pages must handle 401/403 gracefully without causing redirect loops.

```tsx
// Pattern: Auth error handling
try {
  const data = await portalFetch<T>('/endpoint');
} catch (err) {
  // Filter auth errors to stay in loading state
  if (err.message?.includes('401') || err.message?.includes('403')) {
    // Don't set error state — let redirect happen
    return;
  }
  setError(err.message);
}
```

### 3. AbortController Cleanup

Every `useEffect` with async operations must clean up with `AbortController`.

```tsx
// Pattern: Proper cleanup
useEffect(() => {
  const controller = new AbortController();
  
  async function load() {
    await fetch(url, { signal: controller.signal });
  }
  
  load();
  return () => controller.abort();
}, [deps]);
```

### 4. Tab Loading States

Multi-tab pages (like Account) need per-tab loading states.

```tsx
// Pattern: Tab loading
function IntegrationsTab() {
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const controller = new AbortController();
    // Fetch integration status
    return () => controller.abort();
  }, []);
  
  if (loading) return <Spinner />;
  return <IntegrationsContent />;
}
```

## Files Commonly Fixed

| File | Common Issues |
|------|---------------|
| `portal/page.tsx` | Dashboard data loading, auth errors |
| `portal/account/page.tsx` | Tab loading states, Instagram status |
| `portal/deliverables/[id]/page.tsx` | Detail page auth, publish button |
| `portal/support/[id]/page.tsx` | Real-time subscription, message loading |
| `portal/header.tsx` | Avatar upload, notification bell |
| `portal/sidebar.tsx` | Active state, logout button |

## Verification

After applying fixes:
1. Run `npx tsc --noEmit` to verify types
2. Run `npm run build` to verify production build
3. Test navigation flow: login → portal → affected page
4. Verify loading states appear during data fetch
5. Verify no flash of wrong content or 401 redirects

## Rules

1. **Check MEMORY.md first** — Avoid re-fixing known issues
2. **Follow existing patterns** — Match code style of surrounding files
3. **Preserve existing functionality** — Don't break working features
4. **Test auth flow** — Verify protected routes still require login
