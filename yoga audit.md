AI Assistant need to be included

Have to set an eye opener in password in the sign up page 

Have to set the log out option






# Creo Platform — Full Audit Report

---

# Domain 1 Health Report — Public Website & Acquisition Funnel

---

## Phase 1: The Funnel (Landing Page → Signup → Plan Selection)

### The Gap

1. **Plan selection is a no-op.** Line 131: `// Phase 5: Wire to payment gateway` — clicking any plan skips payment entirely and navigates to the portal. Users get free access.

2. **Scarcity counter is fetched but invisible.** The `getPublicSettings()` call retrieves `scarcity_slots_available` and uses it for pre-selecting a plan, but the plan selection cards never display a scarcity badge or slot count.

3. **"Most Popular" is hardcoded to the Growth plan name.** If the admin renames or adds a plan, the badge logic (`plan.name === "growth"`) breaks silently.

4. **Lead magnet form is completely dead.** `onSubmit={(e) => e.preventDefault()}` — the "Get the Template" button does nothing. No API call, no email capture, no file delivery.

5. **Hero video area is a placeholder.** An empty `div` with text "Looping video / creative collage" and a Rocket icon. No actual media.

6. **WhatsApp link is empty.** `href="https://wa.me/"` — no phone number. The "Book a Call" CTA leads nowhere.

7. **Landing page is `"use client"` with zero client-side logic.** The entire page is static JSX but marked as a client component, which defeats Next.js SSG/SSR optimizations for the most important page on the site.

### Why it Matters

The funnel's conversion chain has a critical break at plan selection — users can bypass payment entirely. The dead lead magnet form means zero email capture from the homepage. The empty WhatsApp link means the secondary CTA converts to nothing. The client-side rendering of the homepage adds unnecessary JavaScript payload to every visitor.

### Required Action

1. Wire `handleSelectPlan` to the Razorpay/Stripe checkout flow before any traffic hits the site.
2. Display the scarcity counter on plan selection cards.
3. Implement the lead magnet form with a real API endpoint (or remove it).
4. Replace the hero video placeholder with actual media.
5. Populate the WhatsApp phone number.
6. Convert the homepage to a Server Component.

---

## Phase 2: API Integration (Pricing & Plans)

### The Gap

**Good:** The pricing page and plan selection page genuinely fetch from the live API. The pricing page uses ISR with 60-second revalidation, which is production-appropriate.

**Bad:** The `planHighlights` map on the pricing page is a hardcoded feature description array keyed by plan name. If a plan is renamed in the DB, the feature bullets break.

**Bad:** The payments page (portal) uses a hardcoded plan catalog (`AVAILABLE_PLANS`) to look up prices and features by `plan_id` from the API response. This means the portal's "Change Plan" dialog shows stale prices if the admin updates plan pricing in the database.

**Bad:** All social proof elements (testimonials, case studies, client logos, gallery, team) are entirely hardcoded mock data. The portfolio gallery renders empty colored boxes with no images.

### Why it Matters

The pricing page is correctly wired, but the payments page (where users manage subscriptions) uses stale hardcoded plan data. A plan price change in the admin panel would not reflect in the client portal's change-plan dialog. The social proof sections present fabricated data — testimonials from non-existent clients, case studies with invented metrics.

### Required Action

1. Move `planHighlights` to the API response or a CMS, or at minimum document that plan names are stable.
2. Fetch plan details dynamically on the payments page instead of using `AVAILABLE_PLANS`.
3. Either source gallery/testimonials/case studies from the API/CMS or remove them before launch.
4. Replace empty gallery placeholders with real portfolio images.

---

## Phase 3: Conversion UI (Exit Intent Popup & Sticky CTA Bar)

### The Gap

**Exit Intent — Mostly Correct:**
- The mouse velocity check (`dt > 500` throttle) prevents false triggers from slow mouse drift.
- The `sessionStorage` flag correctly prevents repeated showing within the same browser session.
- The desktop-only guard is properly implemented.
- **Minor gap:** No timeout-based fallback. If a user navigates via keyboard or taps the back button without moving the mouse, the popup never fires. Some implementations add a 30-45 second timer as a secondary trigger.

**Sticky CTA — Functional but has a dependency:**
- Relies on a `[data-footer]` attribute on the footer element. If the footer component is ever refactored to remove this attribute, the sticky bar will never hide and will overlap footer content.

**Both components link to dead pages:**
- Exit intent popup links to `/contact` — this page does not exist in the codebase. Users see a 404.
- Sticky CTA links to `/signup` which works correctly.

### Why it Matters

The exit intent popup is the last chance to convert a bouncing visitor. Linking to a non-existent `/contact` page means every exit-intent conversion attempt results in a 404. The sticky CTA's hidden-on-mobile behavior means mobile users (likely 60%+ of traffic) never see the persistent CTA.

### Required Action

1. Replace `/contact` links in the exit intent popup with `/pricing` or `/signup`.
2. Add a `[data-footer]` attribute to the footer component, or refactor the sticky bar to use a `ref`-based approach.
3. Consider adding a timer-based secondary trigger for the exit intent popup.

---

## Phase 4: OTP Security & Verification Flow

### The Gap

1. **Resend is faked.** Line 41: `// TODO: Wire to API — POST /api/v1/auth/resend-verification`. The button appears functional (shows spinner, countdown resets) but sends no request. Users who don't receive the email are stuck.

2. **Dev bypass is production-visible.** The `[DEV] Simulate Verification` button (line 107-113) is rendered unconditionally — no environment check, no feature flag. Any user can skip email verification.

3. **Onboarding steps are not gate-protected.** The step indicator renders all steps as clickable `<Link>` elements. A user can navigate directly to `/onboarding/payment` or `/onboarding/questionnaire` without completing prior steps. There is no middleware or server-side check enforcing step completion order.

4. **No phone OTP flow exists.** The signup page has a disabled "Phone" button. The login page also has a disabled "Phone" button. MSG91 OTP integration is not implemented on the frontend.

### Why it Matters

The dev verification bypass is a critical security gap — any visitor can skip email verification and access the onboarding flow. The lack of step gating means users can jump to payment or questionnaire without verifying their email or accepting terms. The fake resend button means users who don't receive the verification email have no self-service recovery path.

### Required Action

1. Wrap the dev bypass button in `process.env.NODE_ENV === "development"` check, or remove it entirely.
2. Wire the resend button to `POST /api/v1/auth/resend-verification`.
3. Add server-side or middleware-based step gating to enforce the onboarding sequence.
4. Implement MSG91 OTP flow for phone-based signup/login.

---

## Phase 5: Web Vitals & Performance

### The Gap

1. **Homepage is a Client Component for no reason.** `(public)/page.tsx` has `"use client"` but contains zero hooks, zero state, zero event handlers. It is pure static JSX. This forces the entire homepage to be client-rendered, defeating Next.js static generation and adding unnecessary JavaScript to the largest contentful paint.

2. **No images anywhere — not even placeholders with `next/image`.** The hero area, team section, gallery, testimonials, and case studies all use either Lucide icons or empty colored `<div>` boxes. There are no raster images to optimize. However, this means the site has **zero visual proof** — no portfolio screenshots, no team photos, no client logos, no product images.

3. **Gallery renders empty boxes.** The gallery-grid component renders a `<div>` with a text label ("Brand Launch Poster") on a colored background. These are visual placeholders that look broken in production.

4. **Team section uses identical icons for all members.** Both about and clients pages render a generic `<Users>` icon in a circle for every team member. No photos.

5. **No lazy loading implemented.** Below-the-fold sections (How It Works, Stats, FAQ, etc.) load eagerly with no `loading="lazy"` or dynamic imports.

6. **Sticky CTA bar adds a fixed DOM element on all public pages** even though it's `hidden md:flex` on mobile — it still mounts and runs its scroll listener on mobile devices.

### Why it Matters

The missing `"use client"` fix on the homepage directly impacts Core Web Vitals — the page ships as client-rendered JavaScript instead of static HTML. The absence of real images across the entire public site means the portfolio, testimonials, and team sections provide no visual credibility. The gallery literally shows empty boxes. The site's Lighthouse Performance score will be artificially penalized by the unnecessary client-side rendering on the homepage.

### Required Action

1. Remove `"use client"` from `(public)/page.tsx` — it has no client-side logic.
2. Add real images to the hero, gallery, team, and testimonial sections using `next/image` with proper `width`/`height`/`alt`/`priority` props.
3. Implement `loading="lazy"` for below-the-fold images.
4. Conditionally mount the sticky CTA bar only on desktop (check `window.innerWidth` before rendering the scroll listener, or use CSS media queries to avoid mounting the DOM node on mobile).
5. Consider dynamic imports for the exit intent popup and testimonials carousel to reduce initial bundle size.

---

## Summary Scorecard

| Phase | Status | Blocking Issues |
|---|---|---|
| **1. The Funnel** | 🔴 Broken | Plan selection skips payment; lead magnet is a no-op; hero video is placeholder; WhatsApp link is empty |
| **2. API Integration** | 🟡 Partial | Pricing page is live; payments page uses hardcoded plans; all social proof is mock data |
| **3. Conversion UI** | 🟡 Minor Issues | Exit intent logic is solid but links to nonexistent `/contact`; sticky bar has fragile footer dependency |
| **4. OTP Security** | 🔴 Critical | Dev bypass visible in production; resend is faked; onboarding steps are not gated; no phone OTP |
| **5. Web Vitals** | 🟠 Needs Work | Homepage is unnecessarily client-rendered; zero images across entire public site; gallery shows empty boxes |

<!-- explanation of domain 1 -->

1. The Revenue & Lead Leaks (Phase 1 & 3)
The Issue: When a client clicks a pricing plan, it skips the Stripe/Razorpay payment gateway entirely and drops them right into the portal. Additionally, the "Lead Magnet" email form on the homepage and the "Book a Call" WhatsApp link are completely dead buttons. Furthermore, the "Exit Intent" popup (the box that tries to save a leaving visitor) links to a /contact page that doesn't exist.

Why it Matters: You are giving away the service for free. Dead buttons mean zero email captures, zero WhatsApp leads, and a 404 error page for anyone trying to contact you before leaving. This is a direct loss of revenue and client acquisition.

What You Need to Do: Wire the plan selection directly to the real payment checkout flow. Connect the lead magnet to your actual email database, update the WhatsApp link with your real business number, and change the exit popup to point to the /signup page instead of a broken link.

2. The Security & Authentication Holes (Phase 4)
The Issue: There is a "[DEV] Simulate Verification" button visible on the live site that lets absolutely anyone skip email verification. Also, the "Resend Email" button is just a fake visual timer—it doesn't actually trigger your server to send a new email.

Why it Matters: The dev bypass means your system is wide open to spam, bots, and fake accounts. The fake resend button means legitimate clients who didn't get the first email will be permanently locked out of onboarding with no way to fix it themselves.

What You Need to Do: Hide the Dev Bypass button so it only shows up for engineers testing locally, not on the live web. Connect the "Resend Email" button to the real FastAPI endpoint that triggers the email server.

3. The Brand Trust & Portfolio Gaps (Phase 2)
The Issue: Your public portfolio gallery is just rendering empty colored boxes with text labels. The case studies, client logos, and testimonials are all 100% hardcoded fake data. Inside the client portal, the "Upgrade Plan" page uses a hardcoded, outdated list of prices instead of checking the live database.

Why it Matters: As a creative agency, your visual proof is your strongest selling point. Empty gallery boxes and fake testimonials instantly destroy brand credibility for premium clients. Using hardcoded prices in the portal means if you change a plan's price in your backend, existing clients won't see the new price.

What You Need to Do: Remove the fake data and connect the gallery and testimonials to your actual CMS or database so it pulls in real, high-quality images of your work. Update the internal portal payments page to fetch the live, accurate prices from the API.

4. The Performance Penalties (Phase 5)
The Issue: The main homepage is tagged with "use client", which forces the visitor's browser to do all the heavy lifting to render the page, rather than your server sending a clean, fast, pre-built page.

Why it Matters: This slows down the initial load time of your homepage. Slow load times frustrate users, increase bounce rates, and severely penalize your SEO ranking on Google.

What You Need to Do: Remove the unnecessary "use client" tag so the Next.js server can optimize the page properly and deliver lightning-fast load speeds.

<!-- Completion of Domain 1  -->

---

# Domain 2 Health Report — Client Portal & UI State Architecture

---

## Phase 1: Onboarding Tracker (7-Day Auto-Unmount)

### Current State

The onboarding progress tracker lives in `apps/web/app/(portal)/portal/page.tsx:239-289`. It renders a 4-step visual progress bar (Account Created → Terms Accepted → Payment Done → Active) inside a Card component. The progress is driven by `data.onboarding_stage` from the `GET /api/v1/portal/dashboard` API response. Completed steps are filled green; incomplete steps remain gray circles.

### The Gap

1. **No 7-day auto-unmount logic exists.** The tracker never checks the user's `created_at` timestamp against the current date. There is no `useEffect` that calculates elapsed days and sets a visibility flag. The tracker renders unconditionally on every page load regardless of how long the user has been active.

2. **No visibility flag or conditional rendering.** The tracker component has no state like `isVisible` or `showTracker` that could be toggled. It is always present in the DOM.

3. **The tracker persists even after onboarding completes.** When `onboarding_stage === 4` (Active), the tracker still renders showing all 4 steps as completed. There is no logic to hide the tracker once the user is fully onboarded.

4. **The tracker does not account for incomplete onboarding.** If a user stalls at stage 1 or 2 for weeks, the tracker still shows indefinitely with no urgency messaging or escalation.

### Why it Matters

The onboarding tracker is designed as a temporary UI element to guide new users through their first 7 days. Without the auto-unmount logic, long-tenured clients see an onboarding progress bar permanently — this is confusing ("why am I still seeing onboarding steps?") and wastes valuable dashboard real estate. The tracker should disappear once onboarding is complete or after 7 days, whichever comes first.

### Required Action

1. Add a `useEffect` that compares `user.created_at` (or `onboarding_stage` completion timestamp) against the current date.
2. Set a visibility flag: `showTracker = elapsedDays < 7 && onboarding_stage < 4`.
3. Render the tracker conditionally based on this flag.
4. Consider showing a "You're all set!" completion state before auto-hiding, rather than abrupt removal.

---

## Phase 2: AI Brand Summary (Dynamic vs Hardcoded)

### Current State

The AI brand summary card lives in `apps/web/app/(portal)/portal/page.tsx:212-236`. It fetches from `GET /api/v1/portal/dashboard` and extracts `data.ai_summary_line` from the response. The rendering logic at line 222-225:

```
{data.ai_summary_line
  ? `\u201C${data.ai_summary_line}\u201D`
  : "\u201CYour brand analysis will appear here after onboarding.\u201D"}
```

### The Gap

**This is correctly implemented.** The component:
- Fetches from the live API endpoint with Bearer token auth.
- Renders the dynamic `ai_summary_line` when present.
- Shows a meaningful fallback message when the summary is null (i.e., before AI analysis completes).
- No hardcoded text is used for the summary content.

**Minor concern:** The fallback text ("Your brand analysis will appear here after onboarding.") is hardcoded in the frontend, not from the API. This is acceptable for a fallback but should be localized if the platform supports multiple languages.

### Why it Matters

The AI brand summary is a key differentiator — it shows clients that Creo's AI has analyzed their brand. If this were hardcoded, every client would see the same generic text, destroying the personalized experience. The current implementation correctly delivers dynamic, per-client AI-generated content.

### Required Action

No action needed. This phase is production-ready. Consider adding a loading skeleton while the dashboard data fetches, and an error state if the API call fails (currently the page shows `EMPTY_DASHBOARD` with null summary on failure — acceptable but could be more explicit).

---

## Phase 3: Empty States (Designed vs Blank Screens)

### Current State

| Page | File | Empty State Quality |
|---|---|---|
| Deliverables | `(portal)/portal/deliverables/page.tsx:278-291` | **Designed.** Icon (`FileImage`), heading ("No content yet"), descriptive copy ("Your team is working on your first batch. Check back soon!") |
| Support/Tickets | `(portal)/portal/support/page.tsx:289-300` | **Designed.** Icon (`MessageSquare`), heading ("No tickets yet"), copy ("When you raise a ticket, it will appear here.") |
| Payments | `(portal)/portal/payments/page.tsx:340-343` | **Minimal.** Just text: "No payment history yet." — no icon, no heading hierarchy |
| Payments (no plan) | `(portal)/portal/payments/page.tsx:258-268` | **Designed.** Icon (`AlertCircle`), heading ("No active subscription"), copy with CTA direction |
| Calendar | `(portal)/portal/calendar/page.tsx:314-325` | **Designed.** Icon (`CalendarDays`), heading ("No scheduled content"), copy ("Your content calendar is empty. Check back soon!") |
| Add-ons | `(portal)/portal/addons/page.tsx` | **None.** If `addonTypes` is empty after loading, the page shows the header and empty grid with no message |
| Notifications | `components/portal/notification-bell.tsx:166-169` | **Minimal.** Just text: "No notifications yet." — no icon |

### The Gap

1. **Payments page has a weak empty state.** The payment history empty state (line 340-343) is just a paragraph of text centered in a div. No icon, no structured card, no visual consistency with other empty states. Compare this to the deliverables empty state which has an icon, heading, and description in a proper Card component.

2. **Add-ons page has no empty state at all.** If the API returns an empty active pricing list, the user sees the page header ("Add-ons — Purchase additional content beyond your plan quota") followed by a completely blank area with no explanation. There should be a designed empty state explaining that add-ons are not currently available.

3. **Notification bell has a minimal empty state.** Just plain text "No notifications yet." without an icon or any visual treatment. This is inconsistent with the designed empty states elsewhere in the portal.

4. **No empty state for the deliverables detail page.** If a user navigates to `/portal/deliverables/{id}` and the deliverable doesn't exist, the page renders a "Deliverable not found" message (line 274-296) — this is adequate but uses raw text rather than a designed empty state card.

5. **Support ticket detail has no empty state for messages.** When a ticket has zero messages, it shows "No messages yet. Start the conversation." (line 365-368) — acceptable but plain.

### Why it Matters

Empty states are critical UX touchpoints. When a new client logs in and has no deliverables, no tickets, and no payment history, they see a sequence of blank or minimally-treated pages. This creates a feeling that the platform is broken or empty. Designed empty states with icons, helpful copy, and CTAs (e.g., "Create your first ticket" or "Browse add-ons") guide users toward their next action instead of leaving them at a dead end.

### Required Action

1. Redesign the payments history empty state to match the card-based pattern used by deliverables and support (icon + heading + description).
2. Add an empty state to the add-ons page when no active pricing is returned.
3. Add an icon to the notification bell empty state.
4. Audit all portal pages for consistent empty state treatment — every list/grid should have a designed empty state.

---

## Phase 4: Lapsed Account Lockdown (Read-Only Enforcement)

### Current State

| Layer | File | What It Does |
|---|---|---|
| Portal layout | `(portal)/layout.tsx:1-26` | Renders `DesktopSidebar`, `PortalHeader`, and `{children}` — **no subscription status check** |
| Route guards | None found | No middleware, no layout-level auth/status check beyond Supabase session |
| Deliverables page | `(portal)/portal/deliverables/page.tsx` | Fetches and renders deliverables — **no account status check before rendering** |
| Support page | `(portal)/portal/support/page.tsx` | "Raise a Ticket" button is always enabled — **no lapsed check** |
| Deliverable detail | `(portal)/portal/deliverables/[id]/page.tsx` | Approve/Reject buttons are always enabled — **no lapsed check** |
| Payments page | `(portal)/portal/payments/page.tsx` | "Change Plan" button is always enabled — **no lapsed check** |
| Add-ons page | `(portal)/portal/addons/page.tsx` | "Pay Now" button is always enabled — **no lapsed check** |

### The Gap

1. **No global renewal banner exists.** The portal layout (`layout.tsx`) does not check the user's subscription status. There is no component that renders a "Your subscription has lapsed — please renew" banner at the top of every portal page.

2. **No read-only enforcement.** When a user's subscription status is `lapsed` or `past_due`, all mutation buttons remain active:
   - "Buy Add-ons" → visible and clickable
   - "Raise a Ticket" → visible and clickable
   - "Approve"/"Reject" on deliverables → visible and clickable
   - "Change Plan" on payments → visible and clickable

3. **No route-level protection.** There is no middleware or layout guard that checks `account_status` before rendering portal pages. A lapsed user can navigate freely to every portal section.

4. **The backend may reject mutations**, but the frontend provides no preemptive UX signal. The user fills out a form, clicks submit, and only then sees a 403/400 error — a poor experience compared to preemptively disabling the action.

### Why it Matters

A lapsed client who cannot pay should see a clear, non-dismissible renewal banner and have mutation actions disabled. Without this, lapsed users will attempt to request revisions, buy add-ons, or raise tickets — all of which will fail at the API level. This creates frustration, support tickets, and a perception that the platform is broken. The business also loses the opportunity to prompt renewal at the right moment.

### Required Action

1. Create a `SubscriptionGuard` component that fetches `account_status` from the dashboard API and renders a renewal banner when status is `lapsed` or `past_due`.
2. Mount this guard in `(portal)/layout.tsx` so it appears on every portal page.
3. Pass the subscription status down via context or prop drilling to disable mutation buttons (Add-ons, Support ticket creation, Deliverable approve/reject, Plan change).
4. Alternatively, implement this as a layout-level check that wraps children in a read-only mode when the account is lapsed.

---

## Phase 5: Accessibility Tokens (Focus Rings & Keyboard Navigation)

### Current State

| Check | File | Finding |
|---|---|---|
| CSS focus tokens | `globals.css:154-163` | Base layer applies `outline-ring/50` via `@apply` — sets outline color but **no visible ring utility** |
| Button focus | `components/ui/button.tsx:7` | Uses `focus-visible:ring-3 focus-visible:ring-ring/50` — **ring-3** (not ring-2), uses `ring-ring/50` (not the accent color) |
| Ring color token | `globals.css:103` | `--ring: #0EA5E9` — correctly set to the Ocean Accent blue |
| Focus offset | `button.tsx:7` | **No `focus-visible:ring-offset-2`** — focus ring has no spacing from the element edge |
| Input focus | `globals.css` | Inputs use `focus-visible:border-ring` from base styles — **border-only, no ring** |
| Link focus | `navbar.tsx`, `sidebar.tsx` | Links use standard `<a>` / `<Link>` — **no custom focus styles** beyond browser defaults |
| Skip-to-content | Not found | **No skip navigation link** for keyboard users |
| ARIA labels | `exit-intent-popup.tsx:63-65` | Has `role="dialog"`, `aria-modal="true"`, `aria-label` — **correctly implemented** |
| Reduced motion | Not found | **No `prefers-reduced-motion` media query** — animations run for all users |

### The Gap

1. **Focus ring uses `ring-3` instead of `ring-2`.** The button component applies `focus-visible:ring-3` which creates a thicker-than-standard focus indicator. While not incorrect, it deviates from the expected `ring-2` specified in the audit requirements.

2. **Focus ring color uses `ring-ring/50` instead of the accent color directly.** The `ring-ring` token resolves to `#0EA5E9` (correct), but the `/50` opacity makes it 50% transparent. This may be insufficient contrast on light backgrounds, failing WCAG 2.1 SC 1.4.11 (non-text contrast requires 3:1 minimum).

3. **No `focus-visible:ring-offset-2` on buttons.** The focus ring sits directly on the element border with no offset spacing. This reduces visual clarity, especially on buttons with dark backgrounds where the ring blends into the border.

4. **Inputs lack focus ring styles.** The base layer applies `outline-ring/50` but does not use `focus-visible:ring-*` utilities. Input fields get a subtle outline but no visible ring, making keyboard navigation difficult for form-heavy pages (signup, questionnaire, support ticket creation).

5. **No skip-to-content link.** Keyboard users navigating with Tab must tab through the entire sidebar (6+ links) before reaching main content. There is no skip link to bypass navigation.

6. **No `prefers-reduced-motion` support.** The exit intent popup uses `animate-in fade-in zoom-in-95`, the loading spinners use `animate-spin`, and skeleton loaders use `animate-pulse`. None of these respect the user's motion preference setting.

7. **Interactive elements in the sidebar lack visible focus indicators.** The sidebar links (`sidebar.tsx:53-66`) have hover styles but no explicit focus-visible styles beyond browser defaults.

### Why it Matters

Keyboard-only users (approximately 2-4% of the population, plus power users) cannot navigate the portal effectively without visible focus indicators. The 50% opacity focus ring may not meet WCAG contrast requirements, meaning the site could fail an accessibility audit. The missing skip link forces keyboard users to tab through 6+ sidebar links on every page navigation. The lack of reduced-motion support can cause vestibular disorders for sensitive users.

### Required Action

1. Change `focus-visible:ring-3` to `focus-visible:ring-2` on the button component for standard focus indicator thickness.
2. Increase focus ring opacity from `/50` to `/80` or use full opacity to meet WCAG contrast requirements.
3. Add `focus-visible:ring-offset-2` to buttons for clear visual separation between the ring and the element.
4. Add `focus-visible:ring-2 focus-visible:ring-ring` to the base input styles in `globals.css`.
5. Add a skip-to-content link as the first focusable element in the portal layout.
6. Add `@media (prefers-reduced-motion: reduce)` to disable animations for users who prefer reduced motion.
7. Add explicit `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to sidebar links.

---

## Summary Scorecard

| Phase | Status | Blocking Issues |
|---|---|---|
| **1. Onboarding Tracker** | 🔴 Broken | No 7-day auto-unmount; tracker persists forever; no timestamp comparison |
| **2. AI Brand Summary** | 🟢 Working | Correctly fetches and renders dynamic AI summary from API |
| **3. Empty States** | 🟡 Partial | Deliverables/Support/Calendar are good; Payments/Add-ons/Notifications are weak or missing |
| **4. Lapsed Account Lockdown** | 🔴 Missing | No global banner; no read-only enforcement; all mutation buttons active for lapsed users |
| **5. Accessibility Tokens** | 🟠 Needs Work | Focus rings exist but use wrong thickness/opacity; no skip link; no reduced-motion support; inputs lack ring styles |


<!-- Explanation of domain 2  -->

This report is all about the actual experience your clients have after they pay you. If Domain 1 was your storefront, Domain 2 is the actual service they are paying for.

Overall, the backend connections here are decent, but the frontend logic is missing some critical "business rules."

Here is the plain-English breakdown of exactly what is going wrong, why it hurts your business, and how we fix it.

1. The "Forever" Onboarding Bar (Phase 1)
The Issue: You have a nice progress bar designed to help new clients get set up in their first 7 days. However, the developer forgot to give it an expiration date. Right now, that progress bar will stay on the client's screen forever, even if they've been with you for two years.

Why it Matters: It makes the dashboard look cluttered and makes your platform feel a bit "dumb." A client will wonder, "Why is it still telling me to onboard?"

The Fix: Add a simple rule that hides the bar either when the client finishes all the steps, or when their account is older than 7 days.

2. The Big Win: AI Summaries (Phase 2)
The Good News: This part is working perfectly! Your app is successfully taking the unique AI brand analysis from your backend and displaying it beautifully on the client's dashboard. No fake text here—it is 100% real and personalized.

3. The "Broken Page" Feeling (Phase 3)
The Issue: When a client has no data (like zero past payments, or no available Add-ons), the screen just goes blank or shows a tiny line of plain text.

Why it Matters: If a client clicks "Add-ons" and sees a blank white screen, they don't think "Oh, I have no add-ons." They think, "The app is broken."

The Fix: Create nice "Empty States" for every page. If they have no add-ons, show a nice illustration of a shopping cart with text that says, "No add-ons available right now. Check back later!"

4. The "Free Ride" for Expired Accounts (Phase 4) [🚨 CRITICAL]
The Issue: If a client's credit card declines and their account becomes "lapsed," the portal doesn't actually lock them out of anything. They don't see a "Please Renew" banner, and they can still click buttons to request revisions, buy add-ons, or raise support tickets.

Why it Matters: Even though your backend will eventually block these actions, the client doesn't know that. They will spend 10 minutes typing out a revision request, hit submit, and then get an error. This causes angry support emails.

The Fix: Build a "Read-Only Mode." If a client hasn't paid, put a big red banner at the top of the screen and visually disable/gray out all the action buttons until they update their card.

5. The Keyboard & Accessibility Fumbles (Phase 5)
The Issue: Your app is currently very hard to use for people navigating with a keyboard instead of a mouse. The little blue "focus rings" (the outlines that show you what button you are currently selecting) are too faint, missing on text boxes, and sitting too tightly against the buttons.

Why it Matters: Accessibility isn't just a nice-to-have; it's a standard requirement for professional software. If your app is hard to navigate, clients will get frustrated.

The Fix: Make the blue highlight rings thicker, brighter, and give them a little bit of spacing from the button so it is incredibly obvious what the user is clicking on.

<!-- Completion of domain 2 -->

---



<!-- explanation of domain 3 -->

This report shows that the core "rules" of your agency are mostly holding up well, but a massive piece of the actual product delivery is missing.If Domain 3 is where the actual work gets handed to the client, here is the plain-English breakdown of what is working, what is clumsy, and what is completely broken.1. The Big Wins: Approvals & Locks (Phases 1, 2, & 3)The Good News: Your most important business rules are actually coded perfectly!The Approvals: If a client clicks "Reject," they can't just walk away. The app successfully forces them to write at least a 10-character explanation before it alerts your team.The Download Lock: The app successfully locks the "Download" button until a deliverable is officially approved. Clients cannot secretly download and use a draft version.The Calendar: Toggling between different calendar views is smooth and doesn't spam your database with unnecessary requests.2. The Clumsy Errors (Phase 4)The Issue: Your backend successfully blocks clients from viewing other people's files (which is great for security). However, the frontend doesn't know how to explain this. If the server says "Access Denied" (403), the frontend just shrugs and tells the user "Deliverable Not Found."Why it Matters: If a link breaks or a client gets confused, telling them "Not Found" makes them think you deleted their work. You need the app to tell the truth: "You don't have permission to view this." It saves your support team from answering confused emails.The Fix: Have the developer add specific error messages so the app can tell the difference between a missing file and a security block.3. The Fake Video Player (Phase 5) [🚨 CRITICAL]The Issue: Your app currently has no way to play videos. The "Play" button on a Reel deliverable is essentially a decorative sticker. Clicking it does absolutely nothing.Why it Matters: If you are an agency selling Reels, your clients must be able to watch them to approve them. Right now, they are being asked to approve a video they literally cannot see inside the portal.The Fix: Your team needs to actually build a "Video Lightbox" (a pop-up video player) that loads the video file, lets the user watch it, and cleanly stops the audio when they close it.The VerdictThe foundation of your deliverable system is surprisingly solid—your teammate nailed the complex logic for the approval loops and file locking. But you cannot launch until that video player is built.


<!-- completion of domain 3 -->

---

# Domain 4 Health Report — Ticketing & Live Chat UI

---

## Phase 1: Routing (Ticket Type Dispatch)

### Current State

The ticket creation drawer in `apps/web/app/(portal)/portal/support/page.tsx:360-453` uses a `Sheet` component with a `Select` dropdown offering 4 ticket types: `deliverable_revision`, `billing_issue`, `general_support`, `content_brief_update`. These map to a `TYPE_CONFIG` object (lines 52-69) that provides label and styling per type. The `handleSubmit` function (lines 188-255) sends the selected `ticket_type` in the POST body to `POST /api/v1/tickets`.

The backend `TicketCreate` schema (`apps/api/schemas/ticket.py:21-25`) accepts `ticket_type: TicketType` and validates against the `TicketType` enum (`apps/api/models/enums.py:53-57`) which defines exactly the same 4 values.

### The Gap

**Correctly implemented.** The frontend sends the ticket type to the backend, and the backend validates it against the enum. The ticket is created with the correct type and stored in the database.

**Status mapping — FIXED.** The `mapTicketStatus` function now correctly passes through all 5 backend statuses (`open`, `in_progress`, `awaiting_client`, `resolved`, `escalated`) to the frontend, preserving the granular status visibility from the backend.

### Why it Matters

Ticket type routing and status visibility are now both working correctly. Clients see the exact status their ticket has in the system — "In Progress" when the team is working, "Awaiting Client" when input is needed, and "Escalated" for urgent issues.

### Required Action

No further action needed. Status mapping is complete.

---

## Phase 2: Schema Integration (TicketMessageOut in Chat Thread)

### Current State

The backend `TicketMessageOut` schema (`apps/api/schemas/ticket.py:62-64`) extends `TicketMessageBase` and returns: `id`, `created_at`, `ticket_id`, `sender_id`, `message_text`, `file_url`, `file_name`, `file_size_bytes`, `is_read`.

The frontend chat thread (`apps/web/app/(portal)/portal/support/[id]/page.tsx`) now maps all file-related fields from the API response. The `ChatMessage` interface includes `fileUrl`, `fileName`, and `fileSizeBytes`. The chat bubble rendering displays image attachments inline (with click-to-open) and non-image files as downloadable cards with file name, size, and download icon. File-only messages (`message_text === null`) render correctly without empty bubbles.

### The Gap

**FIXED.** All 4 issues have been resolved:

1. **`file_url`, `file_name`, `file_size_bytes` are now consumed.** The frontend maps these from the API response in both the initial fetch and the post-send handler.

2. **Attachment rendering is implemented.** Image files (png, jpg, gif, webp, svg) render as clickable inline previews. Non-image files render as downloadable cards with file name, formatted size, and download icon.

3. **File-only messages handled.** When `message_text` is null but `file_url` is set, the attachment renders without an empty text bubble. A fallback "Empty message" is shown only when both text and file are absent.

4. **`is_read` remains unused** — read receipts are a separate feature not part of this phase.  

### Why it Matters

Clients can now see file attachments sent by the team, and the team can see files sent by clients (once the upload mechanism from Phase 3 is implemented). The chat thread is no longer a text-only system.

### Required Action

No further action needed for schema integration. Phase 3 (file upload) must still be implemented to allow clients to send files.

---

## Phase 3: File Limits (>25MB Upload Blocking)

### Current State

The support page (`page.tsx`) now has a functional file upload flow. A hidden `<input type="file">` is triggered by clicking the upload area or the Paperclip button in the chat view. Files are validated client-side against a 25MB limit before upload. Selected files are uploaded to Supabase Storage (`ticket-attachments` bucket) and the public URL is sent with the message via `POST /api/v1/tickets/{id}/messages`. The chat view (`[id]/page.tsx`) shows a file preview card with name and size before sending, and allows removal before submission.

### The Gap

**FIXED.** All 4 issues have been resolved:

1. **Real `<input type="file">` element added.** Both the ticket creation drawer and chat view now have a hidden file input that opens on click. The input accepts `.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx`.

2. **25MB client-side validation implemented.** `MAX_FILE_SIZE = 25 * 1024 * 1024` is checked before upload. Files exceeding the limit show a toast error with the file size.

3. **Supabase Storage upload implemented.** Files upload to the `ticket-attachments` bucket with path `ticket-attachments/{ticket_id}/{timestamp}-{filename}`. The public URL is sent with the message payload.

4. **Paperclip button wired.** The chat view's Paperclip icon now opens the file picker. A file preview card appears above the input showing file name, size, and a remove button.

5. **UI text updated** from "10MB" to "25MB".

### Why it Matters

Clients can now send screenshots, design references, and documents to the support team. The 25MB limit prevents abuse while allowing most creative files. The upload flows through Supabase Storage, keeping the FastAPI thread unblocked.

### Required Action

No further action needed for file upload in the client portal. The `ticket-attachments` Supabase Storage bucket must exist with appropriate RLS policies.

---

## Phase 4: Security (Tiptap Rich-Text XSS Sanitization)

### Current State

A Tiptap rich-text editor (`components/ui/rich-text-editor.tsx`) is now integrated into both the ticket creation drawer (description field) and the chat view (message input). The editor uses:

- **Tiptap StarterKit** with Underline, TextAlign, and Link extensions
- **DOMPurify** sanitization on every content change (`onUpdate` callback)
- **Allowlisted tags**: `p`, `br`, `strong`, `em`, `u`, `s`, `code`, `pre`, `ul`, `ol`, `li`, `a`, `h1`, `h2`, `h3`, `blockquote`, `hr`
- **Allowlisted attributes**: `href`, `target`, `rel`, `class`
- **Render-time sanitization**: Chat bubbles use `dangerouslySetInnerHTML` with a second `sanitizeHtml()` pass (defense in depth)
- **Prose styling**: Messages render with `prose prose-sm` Tailwind typography classes

### The Gap

**FIXED.** All security concerns have been addressed:

1. **Tiptap editor integrated.** Both the ticket creation description and chat message input now use the `RichTextEditor` component with a formatting toolbar (bold, italic, underline, lists, alignment, links).

2. **XSS sanitization on input.** DOMPurify strips all disallowed tags and attributes on every keystroke via the `onUpdate` callback. The editor cannot produce unsafe HTML.

3. **XSS sanitization on render.** Chat bubbles use `sanitizeHtml()` before `dangerouslySetInnerHTML`, providing defense-in-depth even if stored content is tampered with.

4. **Link safety.** The Tiptap Link extension is configured with `openOnClick: false` and forces `target="_blank" rel="noopener noreferrer"` on all links.

5. **No `dangerouslySetInnerHTML` without sanitization.** Every usage of `dangerouslySetInnerHTML` in the chat thread is wrapped with `sanitizeHtml()`.

### Why it Matters

The ticketing system now supports rich-text formatting (bold, italic, lists, links) while maintaining XSS protection through DOMPurify sanitization at both input and render time. Malicious HTML is stripped before storage and before display.

### Required Action

No further action needed. The sanitization layer is complete and follows defense-in-depth principles.

---

## Phase 5: Auto-scroll (Realtime Message Insertions)

### Current State

The client portal chat (`apps/web/app/(portal)/portal/support/[id]/page.tsx`) now subscribes to Supabase Realtime for `INSERT` events on the `ticket_messages` table, filtered by `ticket_id`. Incoming messages from the team are appended to `localMessages` with deduplication (skips if message ID already exists from optimistic updates). The channel is cleaned up on unmount via `supabase.removeChannel()`. The auto-scroll effect triggers on `localMessages` changes, scrolling to the bottom on new messages.

The internal team dashboard (`internal/dashboard/chat/page.tsx`) already had a working Realtime subscription. The missing `Authorization` header on the POST request has been fixed — it now retrieves the session token and includes it in the headers.

### The Gap

**FIXED.** All issues have been resolved:

1. **Supabase Realtime subscription added to client portal.** The client portal now listens for new messages via `supabase.channel('ticket:{id}').on('postgres_changes', ...)`. Team replies appear instantly without page refresh.

2. **Deduplication implemented.** When the client sends a message, it's added optimistically to `localMessages`. The Realtime handler checks `prev.some(m => m.id === newMsg.id)` before appending, preventing duplicate messages.

3. **Channel cleanup on unmount.** The `useEffect` returns a cleanup function that calls `supabase.removeChannel(channel)` and nulls the ref, preventing memory leaks and stale subscriptions.

4. **Auto-scroll works for both local and realtime messages.** The existing `useEffect` on `localMessages` triggers `scrollIntoView` for all message additions — whether from the client sending or from team replies arriving via Realtime.

5. **Internal dashboard auth fixed.** The `handleSendMessage` function now retrieves the Supabase session and includes `Authorization: Bearer {token}` in the POST headers.

### Why it Matters

The chat is now truly "live." Clients see team replies instantly without refreshing. The Realtime subscription is properly cleaned up to prevent memory leaks. The internal dashboard can now send messages without crashing in production due to missing auth.

### Required Action

No further action needed. The Supabase Realtime configuration requires that the `ticket_messages` table has Realtime enabled in the Supabase dashboard (Database → Replication).

---

## Summary Scorecard

| Phase | Component | Status | Audit Findings |
|---|---|---|---|
| **1. Routing** | Ticket type dispatch | 🟢 Working | Types correctly mapped frontend→backend; status mapping now passes through all 5 backend statuses |
| **2. Schema** | TicketMessageOut integration | 🟢 Working | `file_url`, `file_name`, `file_size_bytes` now mapped and rendered; image previews + download cards implemented; null text handled |
| **3. File Limits** | Upload blocking >25MB | 🟢 Working | Real `<input type="file">` with 25MB validation; uploads to Supabase Storage; Paperclip button wired; file preview before send |
| **4. Security** | Tiptap XSS sanitization | 🟢 Working | Tiptap editor integrated; DOMPurify sanitization on input + render; allowlisted tags/attrs; link safety configured |
| **5. Auto-scroll** | Realtime message scroll | 🟢 Working | Supabase Realtime subscription added; deduplication; channel cleanup on unmount; auto-scroll works for local + realtime messages; internal dashboard auth fixed |

---

## Additional Findings

| Finding | Severity | Location |
|---|---|---|
| Attachment display missing in internal dashboard chat UI | 🟠 High | `internal/dashboard/chat/page.tsx` |

---

<!-- explanation of domain 4 -->


This is the final piece of your client experience puzzle, and the audit results are incredibly clear.

If Domain 3 was about delivering the work, Domain 4 is about how you talk to your clients when things go wrong or need revisions. Right now, your chat system is basically a walkie-talkie with a missing battery and no way to send pictures.

Here is the plain-English breakdown of what is working, what is fake, and what will break your agency's communication loop.

1. The Big Wins: Security & Routing (Phases 1 & 4)
The Good News: Your system perfectly understands what type of ticket a client is submitting. If they select "Deliverable Revision," it tags it correctly so your creative team gets it.

The Security Shield: Because your teammate kept the chat as simple, plain text (no bolding, italics, or HTML), your chat is 100% immune to "XSS" hacker attacks. Sometimes keeping it simple is the best security.

2. The "Fake" File Uploads (Phases 2 & 3) [🚨 CRITICAL]
The Issue: The "drag and drop" file upload box on the ticket screen is just a pretty drawing. It doesn't actually connect to your computer's files. Even worse, if your team tries to send a file to the client from the backend, the chat window simply ignores it.

Why it Matters: In a creative agency, clients must be able to send you screenshots of what they want changed, and you must be able to send them reference images. Right now, this is a text-only system.

The Fix: The developer needs to replace that fake drawing with a real file input that limits uploads to 25MB, and update the chat screen to actually display file links so people can click and download them.

3. The "Ghost Town" Live Chat (Phase 5) [🚨 CRITICAL]
The Issue: A "Live Chat" is supposed to pop up instantly when someone replies. Your client portal doesn't do that. If your team replies to a client, the client's screen stays blank until they manually hit "Refresh" on their web browser.

Why it Matters: Clients will think you are ignoring them because they won't see your replies pop up. It completely ruins the "Live Support" premium feel.

The Fix: Wire up the "Supabase Realtime" connection on the client side so messages pop onto the screen instantly. (Also, the team-side chat is missing its security token and will literally crash in production, which needs a 5-minute fix to add the token).

4. The Vague Ticket Statuses (Phase 1 Minor Gap)
The Issue: Your backend has smart statuses like "In Progress" and "Awaiting Client." But the frontend lumps them all together and just says "Open."

Why it Matters: If a client sees "Open" for 3 days, they think nobody is looking at it. If they see "In Progress," they know your team is working hard.

The Fix: Tell the UI to display the exact, detailed status from the backend.

<!-- completion of domain 4 -->

## Domain 4 Summary Scorecard

| Phase | Status | Blocking Issues |
|---|---|---|
| **1. Routing** | 🟢 Working | Ticket types correctly dispatched; status mapping passes through all 5 backend states |
| **2. Schema Integration** | 🟢 Working | `TicketMessageOut` file fields now mapped and rendered in chat UI; image previews + download cards; null text handled |
| **3. File Limits** | 🟢 Working | Real file input with 25MB validation; Supabase Storage upload; Paperclip wired; file preview + remove before send |
| **4. XSS Security** | 🟢 Working | Tiptap editor with DOMPurify sanitization; allowlisted tags/attrs; defense-in-depth on render; link safety configured |
| **5. Auto-scroll** | 🟢 Working | Supabase Realtime subscription with deduplication; channel cleanup; auto-scroll for local + realtime; internal dashboard auth fixed |

