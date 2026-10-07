# Consistent dropdown UI — 7 October 2026

All single-value dropdowns now use the shared Radix Select primitives and `frontend/src/ui/select.css`. The existing `CustomSelect` API remains compatible. Native select usage in 14 admin, team, client and onboarding files is migrated to `NativeSelect`, retaining the original options, values and change handlers.

The shared UI uses the existing palette: Night navy triggers, Surface menus, Steel borders, Periwinkle selection/checkmarks and Glow blue focus indicators. Triggers and options have 44px minimum targets, consistent spacing and corners. Long menu labels wrap rather than disappear; selected labels truncate within their field with a title tooltip. Menus are portalled above modals, constrained to the viewport and scroll when needed. Keyboard navigation, typeahead, Escape and focus return use Radix behaviour. Motion respects reduced-motion preferences.

`NativeSelect` retains a visually hidden native control so existing form submission, named FormData values, controlled change events, required validation, disabled options and reset continue to work. Required validation focuses the visible trigger and shows a field error. Multi-value/list controls retain native semantics; no existing single-value dropdown remains outside the shared component.

Validation: production TypeScript/Vite build; standalone component browser checks at 320, 768 and 1440 pixels for required validation/focus, exact submitted values, reset, disabled options, controlled changes, keyboard selection, reduced motion and viewport bounds. Additional checks in the actual team-member modal at 375 and 1440 verify portal layering, option selection, continued modal visibility and Escape dismissal. Evidence: `dropdown-ui-browser-2026-10-07.json` and `dropdown-team-browser-2026-10-07.json`.

Browser fixtures were isolated test content and API interception, not production business data. Temporary fixture pages were removed. This change does not change dropdown choices, stored data, pricing or page layouts.
