import { ArrowRight, Check, Search, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";
import { Reveal } from "../../components/motion";
import { ScrollFlipText } from "../../components/motion/ScrollFlipText";
import { SEOHead } from "../../components/public/SEOHead";
import { DISPLAY, PillLink } from "../../components/public/StagePieces";

interface LegalSection {
  id: string;
  title: string;
  badge?: string;
  content: string[];
}

const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    badge: "Binding Agreement",
    content: [
      'By accessing or using the Creo platform (the "Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you may not access or use the Service.',
      'These Terms constitute a legally binding agreement between you ("Client", "you", or "your") and Creo ("we", "us", or "our"), a digital marketing agency management platform.',
    ],
  },
  {
    id: "plans",
    title: "2. Subscription Plans and Quotas",
    badge: "Month-to-Month Retainers",
    content: [
      "Creo offers three subscription tiers, each with defined content deliverable quotas:",
      "Starter Plan — Designed for small businesses beginning their digital marketing journey. Includes a fixed monthly quota of social media content pieces, one dedicated content creator, and standard turnaround times.",
      "Growth Plan — For businesses scaling their online presence. Includes an increased monthly content quota, a dedicated content team (writer + designer), priority turnaround times, and access to advanced analytics.",
      "Scale Plan — For established brands requiring full-stack marketing. Includes the highest content quota, a dedicated brand team, priority support with guaranteed SLAs, advanced content strategy, and access to all platform features including Instagram publishing.",
      "Quota limits are enforced on a calendar-month basis. Unused content quotas do not roll over to the next month. If you exceed your plan's quota, additional content can be requested as Add-on orders (see Section 8).",
      "Plan pricing is displayed on our Pricing page and may be updated periodically. Existing subscribers are notified of pricing changes at least 30 days before they take effect.",
    ],
  },
  {
    id: "payments",
    title: "3. Payment Processing",
    badge: "PCI DSS Level 1",
    content: [
      "All subscription payments are processed through secure, PCI DSS-compliant payment gateways:",
      "Domestic (India) Transactions — Payments are processed via authorized PCI DSS-compliant payment gateways supporting UPI, net banking, credit/debit cards, and digital wallets.",
      "International Transactions — Payments are processed via global PCI DSS-compliant payment gateways supporting major international cards and localized payment methods.",
      "Your subscription is billed on a recurring monthly basis. Failed payments are retried automatically for up to 5 business days before the subscription is marked as lapsed.",
      "All prices are displayed in Indian Rupees (INR) for domestic subscribers and US Dollars (USD) for international subscribers, inclusive of applicable taxes unless otherwise stated.",
    ],
  },
  {
    id: "onboarding",
    title: "4. Onboarding Workflow",
    badge: "Guaranteed 7-Day Sprint",
    content: [
      "Upon completing payment, every new client enters a structured onboarding workflow that must be completed within 7 calendar days:",
      "Step 1 — Email Verification: Verify your email address to activate your account.",
      "Step 2 — Terms Acceptance: Review and accept Creo's Terms & Conditions.",
      "Step 3 — Payment Confirmation: Complete your initial subscription payment.",
      "Step 4 — Brand Questionnaire: Complete a detailed brand questionnaire covering your business goals, target audience, brand voice, visual preferences, and social media handles.",
      "Upon questionnaire submission, our AI system generates an initial brand analysis and content strategy. A dedicated account manager reviews the analysis and confirms your onboarding within 2 business days.",
      'If the onboarding workflow is not completed within 7 calendar days, your account status will be set to "Pending Onboarding" and access to the client portal will be restricted until the remaining steps are completed.',
    ],
  },
  {
    id: "sla",
    title: "5. Service Level Agreements (SLAs)",
    badge: "Strict Business SLAs",
    content: [
      "All service level agreements are measured in business days (Monday through Friday, excluding Indian public holidays):",
      "New Content Delivery — Content deliverables are produced and submitted for client approval within the turnaround time specified by your subscription plan. Standard turnaround is 3 business days for Starter, 2 business days for Growth, and 1 business day for Scale.",
      "Revision Turnaround — When a client requests revisions on a submitted deliverable, the creative team will deliver the revised version within 24 business hours of the revision request.",
      "Support Ticket Response — Our support team responds to all tickets within 8 business hours during standard working hours (10:00 AM to 7:00 PM IST, Monday through Friday).",
      "Escalation Response — High-priority escalations are acknowledged within 4 business hours and resolved within 1 business day.",
    ],
  },
  {
    id: "revisions",
    title: "6. Content Approval and Revisions",
    badge: "2 Rounds Included",
    content: [
      "All content deliverables are submitted through the Creo client portal for your review and approval. You have the option to approve, reject, or request revisions for each deliverable.",
      'Revisions are limited to 2 rounds per deliverable for subscription content. If content remains unapproved after 2 rounds of revisions, the deliverable is marked as "Final" and counted against your monthly quota.',
      "Content that is not reviewed within 5 business days of submission is automatically approved to maintain production cadence. You will receive a notification before auto-approval takes effect.",
      "You may reject a deliverable with mandatory feedback. Rejected deliverables are replaced at no additional cost within the standard turnaround time for your plan.",
    ],
  },
  {
    id: "instagram",
    title: "7. Instagram Integration",
    badge: "Encrypted Fernet Tokens",
    content: [
      "If you connect your Instagram Business account to Creo, you authorize Creo to publish approved content directly to your Instagram account through Meta's Graph API.",
      "This integration is optional and can be disconnected at any time from your Account Settings. Disconnecting does not affect your subscription or content delivery — it only stops automated publishing.",
      "Creo stores your Instagram access token encrypted at rest using Fernet symmetric encryption. The token is used exclusively for publishing content you have explicitly approved.",
      "Creo is not responsible for any changes to Meta's API, Instagram's terms of service, or Instagram's content policies that may affect the publishing integration.",
    ],
  },
  {
    id: "addons",
    title: "8. Add-on Orders",
    badge: "Flexible Top-Ups",
    content: [
      "Add-on orders allow you to purchase additional content deliverables beyond your subscription plan's monthly quota.",
      "Add-on pricing is configured by Creo administrators and displayed in the Add-ons section of your portal. Prices are exclusive of applicable taxes.",
      "Each Add-on order includes 1 round of revision. Additional revision rounds on Add-on orders are billed separately at the per-piece rate specified in your Add-on order.",
      "Add-on orders are billed immediately upon purchase and are non-refundable once the creative team has begun production.",
    ],
  },
  {
    id: "termination",
    title: "9. Account Termination",
    badge: "Zero Cancellation Fees",
    content: [
      "You may cancel your subscription at any time from your Account Settings. Cancellation takes effect at the end of your current billing cycle.",
      'Upon cancellation, your account status changes to "Lapsed" and access to the client portal is restricted. Content deliverables in progress at the time of cancellation will be completed and delivered.',
      "Creo reserves the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or abuse platform features. Suspended accounts are notified via email with details of the violation.",
      "Upon account termination, your data is retained for 30 days for recovery purposes, after which it is permanently deleted from our active databases.",
    ],
  },
  {
    id: "liability",
    title: "10. Limitation of Liability",
    badge: "Commercial Boundaries",
    content: [
      'Creo provides the Service on an "as is" basis. We make no warranties regarding uninterrupted access, error-free operation, or specific business outcomes from our marketing services.',
      "Creo's total liability for any claims arising from or related to the Service is limited to the amount you paid for the Service during the 12-month period preceding the claim.",
      "Creo is not liable for indirect, incidental, consequential, or punitive damages, including lost profits, data loss, or business interruption.",
    ],
  },
  {
    id: "governing",
    title: "11. Governing Law",
    badge: "Bengaluru Jurisdiction",
    content: [
      "These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be resolved in the courts of Bengaluru, Karnataka, India.",
    ],
  },
  {
    id: "changes",
    title: "12. Changes to These Terms",
    badge: "14-Day Notice",
    content: [
      "We may update these Terms from time to time. Material changes will be communicated via email and a notification in the Creo portal at least 14 days before they take effect.",
      "Your continued use of Creo after the effective date of any changes constitutes acceptance of the updated Terms.",
    ],
  },
  {
    id: "contact",
    title: "13. Contact Us",
    badge: "Legal Desk",
    content: [
      "If you have questions about these Terms & Conditions, please contact us at legal@getcreo.in or through the support portal within your Creo account.",
    ],
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "collection",
    title: "1. Information We Collect",
    badge: "Explicit Scope",
    content: [
      "When you create a Creo account, we collect your full name, business name, email address, and phone number. This information is required to provision your workspace and communicate with you about your subscription and deliverables.",
      "If you register using Google OAuth, we receive your name, email address, and profile picture from Google's authentication service. We do not store your Google password — authentication is handled entirely by Google's OAuth 2.0 protocol.",
      "If you register using phone-based OTP, we collect your phone number and verify it through our SMS provider (MSG91). The OTP code is transient and is never stored after verification.",
      "We also collect billing information necessary to process your subscription payments through secure PCI DSS Level 1 payment gateways. Payment card details are never stored on our servers — they are tokenized and managed securely by the payment gateway.",
    ],
  },
  {
    id: "usage",
    title: "2. How We Use Your Information",
    badge: "No Unsolicited Spam",
    content: [
      "Your personal and business information is used exclusively to operate and improve the Creo platform. This includes managing your subscription, delivering content through your dedicated agency team, processing payments, and providing customer support.",
      "We use your email address and phone number to send transactional communications — payment receipts, subscription renewals, deliverable notifications, and support ticket updates. We do not send unsolicited marketing communications.",
      "Business profile data (business name, industry, social media handles) is used by your assigned content team to create tailored marketing strategies and content calendars for your brand.",
    ],
  },
  {
    id: "isolation",
    title: "3. Data Isolation and Multi-Tenant Security",
    badge: "PostgreSQL Row-Level Security",
    content: [
      "Creo operates a strict multi-tenant architecture. Each agency workspace is completely isolated from every other workspace on the platform. Your business data, content deliverables, financial records, team communications, and integrations are accessible only to users explicitly assigned to your workspace.",
      "No user, team member, or administrator can access data belonging to another agency's workspace. This isolation is enforced at the database level through Row-Level Security (RLS) policies on every table in our PostgreSQL database, as well as through role-based access control in our API layer.",
      "Your content calendars, deliverables, payment history, support tickets, and onboarding data are logically and physically separated from all other tenants on the platform.",
    ],
  },
  {
    id: "uploads",
    title: "4. File Uploads and Storage",
    badge: "AES-256 Storage",
    content: [
      "When you upload files through the Creo portal — including creative assets, brand guidelines, logos, and deliverable submissions — these files are stored in Supabase Storage, a secure cloud object storage service built on Amazon S3 infrastructure.",
      "Files are encrypted at rest using AES-256 encryption. Access to your files is governed by signed URLs with time-limited tokens, ensuring that only authenticated users within your workspace can retrieve uploaded content.",
      "We do not scan, analyze, or use your uploaded files for any purpose other than delivering the services outlined in your subscription plan.",
    ],
  },
  {
    id: "instagram-privacy",
    title: "5. Instagram Integration and Token Security",
    badge: "Fernet Encrypted (AES-128-CBC)",
    content: [
      "If you choose to connect your Instagram Business account to Creo, we initiate a standard OAuth 2.0 flow through Meta's Graph API. This allows Creo to publish approved content directly to your Instagram account on your behalf.",
      "During this process, Meta provides us with an access token that grants Creo permission to publish content to your Instagram account. This token is encrypted at rest using Fernet symmetric encryption (AES-128-CBC) before being stored in our database.",
      "The encryption key used to protect your Instagram access token is stored separately from the encrypted data and is never exposed in API responses, logs, or client-side code. Only our backend services can decrypt the token, and only for the specific purpose of publishing content you have approved.",
      "You can revoke Creo's access to your Instagram account at any time from your Account Settings page. Revoking access immediately deletes the encrypted token from our database and stops all automated publishing to your Instagram account.",
    ],
  },
  {
    id: "third-party",
    title: "6. Third-Party Services",
    badge: "SOC 2 Type II Partners",
    content: [
      "Creo integrates with the following third-party services to operate our platform:",
      "Cloud Infrastructure & Database — SOC 2 Type II compliant cloud hosting, encrypted storage, and real-time event streaming.",
      "Payment Gateways — Domestic and international payment processing via PCI DSS Level 1 certified processors.",
      "Meta Graph API — Instagram content publishing governed by Meta's Platform Terms.",
      "Transactional Messaging — Verified transactional email delivery and carrier-grade SMS/WhatsApp verification.",
      "AI Strategic Intelligence — Enterprise AI architecture for brand persona synthesis and content strategy formulation.",
      "Each third-party service operates under its own privacy policy and data processing agreements. We select service providers that maintain industry-standard security certifications.",
    ],
  },
  {
    id: "retention",
    title: "7. Data Retention",
    badge: "30-Day Recovery Period",
    content: [
      "We retain your account information for as long as your account is active. If you delete your account or your subscription lapses, we retain your data for 30 days to allow for account recovery, after which it is permanently deleted from our active databases.",
      "Encrypted Instagram access tokens are deleted immediately upon account deletion or explicit disconnection.",
      "Payment transaction records are retained for 7 years as required by Indian tax and accounting regulations.",
      "Support ticket history is retained for 2 years after the last message in a ticket thread.",
    ],
  },
  {
    id: "rights",
    title: "8. Your Rights",
    badge: "Full Data Ownership",
    content: [
      "You have the right to access, correct, or delete your personal information at any time. You can update your profile information directly from your Account Settings page.",
      "You can request a complete export of your data by contacting our support team. We will provide a machine-readable export within 7 business days.",
      "You can request deletion of your account and all associated data by contacting support. Account deletion is irreversible and will be completed within 14 business days.",
    ],
  },
  {
    id: "security",
    title: "9. Security Measures",
    badge: "TLS 1.3 & Zero Trust",
    content: [
      "All data transmitted between your browser and our servers is encrypted using TLS 1.3 (HTTPS).",
      "Database connections use SSL/TLS encryption. All sensitive fields (payment tokens, Instagram access tokens, API keys) are encrypted at rest using Fernet or AES-256 encryption.",
      "We enforce role-based access control (RBAC) across all platform surfaces — client portal, team dashboard, and admin panel. Every API request is authenticated via JWT tokens validated against Supabase's JWT secret.",
      "Session timeouts are enforced per role: 30 days for client accounts, 8 hours for team members, and 4 hours for administrators.",
    ],
  },
  {
    id: "policy-changes",
    title: "10. Changes to This Policy",
    badge: "14-Day Notice",
    content: [
      "We may update this Privacy Policy from time to time. Material changes will be communicated via email and a notification in the Creo portal at least 14 days before they take effect.",
      "Your continued use of Creo after the effective date of any changes constitutes acceptance of the updated policy.",
    ],
  },
  {
    id: "privacy-contact",
    title: "11. Contact Us",
    badge: "Privacy Officer",
    content: [
      "If you have questions about this Privacy Policy or how Creo handles your data, please contact us at privacy@getcreo.in or through the support portal within your Creo account.",
    ],
  },
];

const EYEBROW = "text-sm font-bold uppercase tracking-[0.18em] text-site-mist";

/** "3. Payment Terms" → ["03", "Payment Terms"] */
function splitTitle(title: string): [string, string] {
  const match = /^(\d+)\.\s*(.*)$/.exec(title);
  return match ? [match[1]?.padStart(2, "0") ?? "", match[2] ?? title] : ["", title];
}

/** Id of the clause nearest the top of the reading area, for the contents list. */
function useActiveClause(ids: string[]) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  const key = ids.join(",");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" },
    );
    for (const id of key.split(",")) {
      const el = id && document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [key]);
  return active;
}

/**
 * Shared shell for the legal pages in the 3D pages' style: a dark hero with the
 * flip headline, numbered ruled clauses beside a sticky search and contents
 * list, and a midnight closing band with ways to reach us.
 */
function LegalPage({
  seoTitle,
  seoDescription,
  title,
  lead,
  highlights,
  sections,
  searchPlaceholder,
  related,
  closingTitle,
  closingText,
  closingActions,
}: {
  seoTitle: string;
  seoDescription: string;
  title: string;
  lead: string;
  highlights: string[];
  sections: LegalSection[];
  searchPlaceholder: string;
  related: { to: string; label: string };
  closingTitle: string;
  closingText: string;
  closingActions: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const filtered = q
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(q) || s.content.some((c) => c.toLowerCase().includes(q)),
      )
    : sections;
  const active = useActiveClause(filtered.map((s) => s.id));

  return (
    <div className="w-full font-sans text-site-ink">
      <SEOHead title={seoTitle} description={seoDescription} />

      {/* 1. Hero */}
      <section className="st-tone st-hero relative -mt-[76px] overflow-hidden px-6 pb-16 pt-[calc(76px+10svh)] sm:-mt-[84px] sm:px-8 sm:pb-20 sm:pt-[calc(84px+12svh)] lg:px-12">
        <div className="mx-auto max-w-[1240px]">
          <p className={EYEBROW}>Legal &middot; Last updated June 29, 2026</p>
          <ScrollFlipText
            as="h1"
            playOnMount
            delay={0.2}
            text={title}
            className={`creo-display mt-6 block max-w-[14ch] text-[clamp(3rem,8vw,7.5rem)] leading-[0.92] ${DISPLAY}`}
          />
          <Reveal delay={0.5}>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-site-mist">{lead}</p>
          </Reveal>
          <Reveal delay={0.6}>
            <ul className="mt-12 grid gap-4 border-t border-hi/20 pt-6 sm:grid-cols-3">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-base font-medium text-site-ink"
                >
                  <Check
                    className="mt-1 size-4 shrink-0 text-[var(--tone-accent)]"
                    strokeWidth={3}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* 2. The clauses */}
      <section className="st-tone st-base px-6 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-12 lg:gap-16">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <label className="flex items-center gap-3 border-b-2 border-hi/15 transition-colors duration-300 focus-within:border-[var(--tone-accent)]">
                <Search className="size-5 shrink-0 text-site-mist" />
                <span className="sr-only">Search this page</span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full min-w-0 bg-transparent py-3 text-lg font-medium text-site-ink placeholder:text-site-mist/50 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-site-mist transition-colors hover:text-site-ink"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </label>

              {/* Phones: a collapsed contents list */}
              <details className="mt-8 border-y border-hi/10 lg:hidden">
                <summary className="flex min-h-12 cursor-pointer items-center justify-between text-base font-semibold text-site-ink">
                  Jump to a section
                  <span className="text-sm font-medium text-site-mist">{filtered.length}</span>
                </summary>
                <nav aria-label="Page sections" className="pb-3">
                  {filtered.map((section) => {
                    const [num, name] = splitTitle(section.title);
                    return (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className="flex min-h-11 items-baseline gap-3 py-1.5 text-base text-site-mist hover:text-site-ink"
                      >
                        <span className="w-6 shrink-0 font-mono text-xs text-[var(--tone-accent)]">
                          {num}
                        </span>
                        {name}
                      </a>
                    );
                  })}
                </nav>
              </details>

              <nav aria-label="Page sections" className="mt-10 hidden lg:block">
                <p className={EYEBROW}>Contents</p>
                <ol
                  className="mt-4 max-h-[calc(100svh-22rem)] overflow-y-auto overscroll-contain pr-2"
                  data-lenis-prevent
                >
                  {filtered.map((section) => {
                    const [num, name] = splitTitle(section.title);
                    const isActive = active === section.id;
                    return (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          aria-current={isActive ? "location" : undefined}
                          className={`flex items-baseline gap-3 border-l-2 py-1.5 pl-4 text-[15px] transition-colors duration-300 ${
                            isActive
                              ? "border-[var(--tone-accent)] font-semibold text-site-ink"
                              : "border-hi/10 text-site-mist hover:text-site-ink"
                          }`}
                        >
                          <span className="w-6 shrink-0 font-mono text-xs text-[var(--tone-accent)]">
                            {num}
                          </span>
                          {name}
                        </a>
                      </li>
                    );
                  })}
                </ol>
                <Link
                  to={related.to}
                  className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-site-ink underline decoration-hi/30 underline-offset-4 hover:decoration-current"
                >
                  {related.label}
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </nav>
            </div>
          </aside>

          <div className="lg:col-span-8">
            {filtered.length === 0 ? (
              <div className="border-y border-hi/10 py-16 text-center">
                <p className="text-2xl font-medium tracking-[-0.02em] text-site-ink">
                  Nothing matches &ldquo;{search.trim()}&rdquo;.
                </p>
                <p className="mt-3 text-base text-site-mist">
                  Try another word, or clear the search to see every clause.
                </p>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-6 cursor-pointer text-base font-semibold text-[var(--tone-accent)] underline decoration-current/30 underline-offset-4 hover:decoration-current"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="border-b border-hi/10">
                {filtered.map((section) => {
                  const [num, name] = splitTitle(section.title);
                  return (
                    <article
                      key={section.id}
                      id={section.id}
                      className="scroll-mt-28 border-t border-hi/10 py-12 first:border-t-2 first:border-hi/80 first:pt-10"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
                        <span className="font-mono text-sm text-[var(--tone-accent)]">{num}</span>
                        <h2 className="text-3xl font-medium leading-tight tracking-[-0.03em] text-site-ink sm:text-4xl">
                          {name}
                        </h2>
                      </div>
                      {section.badge && (
                        <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-site-mist">
                          {section.badge}
                        </p>
                      )}
                      <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-site-mist sm:text-lg">
                        {section.content.map((paragraph) => (
                          <p key={paragraph}>{paragraph}</p>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Closing — how to reach us */}
      <section className="st-tone st-midnight px-6 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto max-w-[1240px]">
          <ScrollFlipText
            as="h2"
            text={closingTitle}
            className={`block max-w-4xl text-[clamp(2.6rem,5.5vw,5rem)] leading-[0.95] ${DISPLAY}`}
          />
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-site-mist">{closingText}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-wrap gap-3">{closingActions}</div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

export function TermsPage() {
  return (
    <LegalPage
      seoTitle="Terms & Conditions | Creo"
      seoDescription="The terms behind Creo's month-to-month content retainers: plans and quotas, turnaround SLAs, revisions, payments and cancellation."
      title="Terms & Conditions"
      lead="Plain terms for our monthly production retainers: turnaround SLAs, revision rounds, quotas, payments and portal access."
      highlights={[
        "First batch within 7 days",
        "Revision rounds included",
        "Month-to-month, cancel anytime",
      ]}
      sections={TERMS_SECTIONS}
      searchPlaceholder="Search SLAs, revisions, quotas..."
      related={{ to: "/privacy", label: "Read the Privacy Policy" }}
      closingTitle="Questions about these terms?"
      closingText="We're happy to walk you through SLAs, revision rounds or a custom contract before you sign up."
      closingActions={
        <>
          <PillLink href="https://wa.me/919941999415">Ask us on WhatsApp</PillLink>
          <PillLink href="mailto:legal@getcreo.in">Email legal@getcreo.in</PillLink>
          <PillLink to="/pricing">Compare plans</PillLink>
        </>
      }
    />
  );
}

export function PrivacyPage() {
  return (
    <LegalPage
      seoTitle="Privacy Policy | Creo"
      seoDescription="How Creo collects, stores and protects your account details, brand assets, Instagram access and billing records."
      title="Privacy Policy"
      lead="How Creo collects, stores and protects your account details, brand assets, Instagram access and billing records."
      highlights={[
        "Row-level data isolation",
        "Encrypted storage and tokens",
        "Never sold, never scraped",
      ]}
      sections={PRIVACY_SECTIONS}
      searchPlaceholder="Search data, Instagram, deletion..."
      related={{ to: "/terms", label: "Read the Terms & Conditions" }}
      closingTitle="Questions about your data?"
      closingText="Ask our privacy officer about data exports, revoking Instagram access, deleting your account or compliance reviews."
      closingActions={
        <>
          <PillLink href="mailto:privacy@getcreo.in">Email privacy@getcreo.in</PillLink>
          <PillLink href="https://wa.me/919941999415">Ask us on WhatsApp</PillLink>
        </>
      }
    />
  );
}
