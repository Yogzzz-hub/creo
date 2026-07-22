---
description: Run TypeScript type check, Next.js build, and lint for the Creo frontend
---

# Creo Build Verification

Run the complete Creo frontend verification pipeline. Execute all three checks and report results.

## Steps

1. **TypeScript Check** — Run `npx tsc --noEmit` in `apps/web/` to catch type errors
2. **Next.js Build** — Run `npm run build` in `apps/web/` to verify production build
3. **Lint** — Run `npm run lint` in `apps/web/` to check code quality

## Usage

```bash
# Full pipeline (recommended)
npx tsc --noEmit 2>&1; if ($?) { npm run build 2>&1; if ($?) { npm run lint 2>&1 } }
```

Or run individual checks:
```bash
# Type check only
npx tsc --noEmit 2>&1

# Build only
npm run build 2>&1

# Lint only
npm run lint 2>&1
```

## Expected Output

- **TypeScript**: No errors = pass. Errors show file paths and line numbers.
- **Build**: `✓ Compiled successfully` = pass. Warnings are acceptable.
- **Lint**: No errors = pass. Warnings are acceptable.

## Common Issues

- **Type errors in portal pages**: Check `apps/web/app/(portal)/` components
- **Build fails on missing imports**: Verify all `@/` path aliases resolve correctly
- **Lint errors in new files**: Run `npm run lint -- --fix` for auto-fixable issues
