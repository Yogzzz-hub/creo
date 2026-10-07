# Client header and removal — 7 October 2026

The client detail header's unwrapped action row squeezed the name and metadata into a narrow column. Both removal controls only mutated browser state; one updated a temporary detail object and the other hid a client until refresh.

The client identity now occupies its own full-width row, followed by a wrapping action row. Both removal controls call `POST /api/v1/admin/clients/{id}/offboard`, disable duplicate submissions and display API errors without reporting success.

The endpoint requires admin/super-admin authorization and checks the client's agency and role. A transaction locks the account, cancels active/trialing subscription records, clears current quotas while retaining recorded usage, suspends access, increments the token version, removes client-team assignment rows and records an audit entry. Existing billing and content records are retained. Session and dashboard caches are invalidated after commit. A repeated request does not repeatedly increment the token version.

Suspended/cancelled accounts are excluded when reloading the active client roster. The roster removal selector uses actual client IDs.

Validation: frontend production build, four targeted backend tests, and controlled browser checks at 375 and 1440 pixels for header width/overflow, visible API failure, retry, successful removal and exclusion after refresh. Browser evidence is `client-offboard-browser-2026-10-07.json`; API responses were intercepted test fixtures. No live customer was offboarded during testing.

This endpoint changes stored subscription state. It does not issue refunds or cancel an external gateway mandate; the retained records support subsequent billing reconciliation.
