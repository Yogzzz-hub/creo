import { useState } from "react";
import { Link } from "react-router";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  FileText,
  ChevronRight,
  CreditCard,
  RefreshCw,
  X,
} from "lucide-react";

const TERMS_SECTIONS = [
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
      "Pro Plan — For established brands requiring full-stack marketing. Includes the highest content quota, a dedicated brand team, priority support with guaranteed SLAs, advanced content strategy, and access to all platform features including Instagram publishing.",
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
      "Your subscription is billed on a recurring monthly or annual basis, depending on the billing cycle you selected at sign-up. Failed payments are retried automatically for up to 5 business days before the subscription is marked as lapsed.",
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
      "New Content Delivery — Content deliverables are produced and submitted for client approval within the turnaround time specified by your subscription plan. Standard turnaround is 3 business days for Starter, 2 business days for Growth, and 1 business day for Pro.",
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

const PRIVACY_SECTIONS = [
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

export function TermsPage() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const filtered = TERMS_SECTIONS.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.content.some((c) => c.toLowerCase().includes(q));
  });

  return (
    <div className="w-full bg-[#FAFAF8] text-[#0D2137]">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F4FD] via-[#F4F9FD] to-[#FAFAF8] pt-10 pb-8 sm:pt-14 sm:pb-10 border-b border-slate-200/80">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-[#2B7BC4]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-xs font-bold text-[#2B7BC4] shadow-2xs border border-[#C9DFF0] mb-3">
            <ShieldCheck className="size-3.5" />
            <span>Official Legal Governance</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#0D2137] sm:text-5xl">
            Terms & Conditions
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium">
            Last updated: June 29, 2026 &bull; Effective for all active client retainers
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Transparent, founder-friendly terms governing our monthly production retainers, guaranteed turnaround SLAs, revision cycles, and client portal access.
          </p>

          {/* Quick SLA Highlights */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs">
              <Clock className="size-3.5 text-[#2B7BC4]" /> 7-Day First Batch SLA
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs">
              <RefreshCw className="size-3.5 text-[#2B7BC4]" /> 2 Revision Rounds Included
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs">
              <CreditCard className="size-3.5 text-emerald-600" /> Month-to-Month. Cancel Anytime.
            </span>
          </div>

          {/* In-Page Search */}
          <div className="mt-8 max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search terms, SLAs, revisions, quotas..."
              className="w-full rounded-2xl border border-[#C9DFF0] bg-white pl-11 pr-10 py-3 text-sm text-[#0D2137] shadow-xs focus:ring-2 focus:ring-[#2B7BC4]/30 focus:border-[#2B7BC4] outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area: TOC + Sections */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Table of Contents Sidebar */}
            <aside className="lg:col-span-4 sticky top-24 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hidden lg:block">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2B7BC4]">
                  Table of Contents
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {TERMS_SECTIONS.length} Clauses
                </span>
              </div>
              <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                {TERMS_SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setActiveSection(s.id)}
                    className={`block px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeSection === s.id
                        ? "bg-[#E8F4FD] text-[#2B7BC4] font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-[#0D2137]"
                    }`}
                  >
                    {s.title}
                  </a>
                ))}
              </nav>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  to="/privacy"
                  className="inline-flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-[#E8F4FD] hover:text-[#2B7BC4] transition-colors"
                >
                  <span>View Privacy Policy</span>
                  <ChevronRight className="size-3.5" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  <span>Explore Retainer Plans</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </aside>

            {/* Clauses Content */}
            <main className="lg:col-span-8 space-y-6">
              {filtered.length === 0 ? (
                <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
                  <FileText className="size-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-[#0D2137]">No matching clauses found</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Try searching with another keyword or reset the search filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold cursor-pointer"
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                filtered.map((section) => (
                  <article
                    key={section.id}
                    id={section.id}
                    className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs hover:border-[#2B7BC4]/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
                      <h2 className="text-lg sm:text-xl font-bold text-[#0D2137]">
                        {section.title}
                      </h2>
                      {section.badge && (
                        <span className="rounded-full bg-blue-50 border border-blue-200/80 px-3 py-0.5 text-[10px] font-bold text-[#2B7BC4]">
                          {section.badge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                      {section.content.map((p, idx) => (
                        <p key={idx}>{p}</p>
                      ))}
                    </div>
                  </article>
                ))
              )}

              {/* Bottom Support Banner */}
              <div className="rounded-3xl border border-[#C9DFF0] bg-gradient-to-r from-[#E8F4FD] to-sky-50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-[#0D2137]">
                    Need Clarification on Our Retainer Terms?
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Our team is available to explain deliverable SLAs, revision cycles, or custom enterprise contracts.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <Link
                    to="/faq"
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  >
                    Read FAQ
                  </Link>
                  <a
                    href="https://wa.me/919941999415"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
                  >
                    Contact Legal Desk
                  </a>
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PrivacyPage() {
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const filtered = PRIVACY_SECTIONS.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.content.some((c) => c.toLowerCase().includes(q));
  });

  return (
    <div className="w-full bg-[#FAFAF8] text-[#0D2137]">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#E8F4FD] via-[#F4F9FD] to-[#FAFAF8] pt-10 pb-8 sm:pt-14 sm:pb-10 border-b border-slate-200/80">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-xs font-bold text-[#2B7BC4] shadow-2xs border border-[#C9DFF0] mb-3">
            <Lock className="size-3.5" />
            <span>Zero-Trust Data Protection</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#0D2137] sm:text-5xl">
            Privacy Policy & Data Security
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 font-medium">
            Last updated: June 29, 2026 &bull; Compliant with Global Privacy Regulations
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            How Creo encrypts, isolates, and protects your brand assets, Instagram tokens, and financial records with multi-tenant database isolation.
          </p>

          {/* Quick Security Highlights */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs">
              <ShieldCheck className="size-3.5 text-[#2B7BC4]" /> PostgreSQL Row-Level Security
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs">
              <Lock className="size-3.5 text-[#2B7BC4]" /> AES-256 Storage & Fernet Tokens
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-2xs">
              <CheckCircle2 className="size-3.5 text-emerald-600" /> Never Sold. Never Scraped.
            </span>
          </div>

          {/* In-Page Search */}
          <div className="mt-8 max-w-lg mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search encryption, tokens, retention, rights..."
              className="w-full rounded-2xl border border-[#C9DFF0] bg-white pl-11 pr-10 py-3 text-sm text-[#0D2137] shadow-xs focus:ring-2 focus:ring-[#2B7BC4]/30 focus:border-[#2B7BC4] outline-none transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Table of Contents Sidebar */}
            <aside className="lg:col-span-4 sticky top-24 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hidden lg:block">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-[#2B7BC4]">
                  Privacy Index
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {PRIVACY_SECTIONS.length} Clauses
                </span>
              </div>
              <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                {PRIVACY_SECTIONS.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={() => setActiveSection(s.id)}
                    className={`block px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeSection === s.id
                        ? "bg-[#E8F4FD] text-[#2B7BC4] font-bold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-[#0D2137]"
                    }`}
                  >
                    {s.title}
                  </a>
                ))}
              </nav>

              <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <Link
                  to="/terms"
                  className="inline-flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-[#E8F4FD] hover:text-[#2B7BC4] transition-colors"
                >
                  <span>View Terms & Conditions</span>
                  <ChevronRight className="size-3.5" />
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:brightness-110 active:scale-95 transition-all"
                >
                  <span>Explore Retainer Plans</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </aside>

            {/* Clauses Content */}
            <main className="lg:col-span-8 space-y-6">
              {filtered.length === 0 ? (
                <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-xs">
                  <Lock className="size-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-[#0D2137]">No matching clauses found</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Try searching with another keyword or reset the search filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#2B7BC4] text-white text-xs font-bold cursor-pointer"
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                filtered.map((section) => (
                  <article
                    key={section.id}
                    id={section.id}
                    className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs hover:border-[#2B7BC4]/40 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
                      <h2 className="text-lg sm:text-xl font-bold text-[#0D2137]">
                        {section.title}
                      </h2>
                      {section.badge && (
                        <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-0.5 text-[10px] font-bold text-emerald-700">
                          {section.badge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3.5 text-xs sm:text-sm leading-relaxed text-slate-600">
                      {section.content.map((p, idx) => (
                        <p key={idx}>{p}</p>
                      ))}
                    </div>
                  </article>
                ))
              )}

              {/* Bottom Privacy Banner */}
              <div className="rounded-3xl border border-[#C9DFF0] bg-gradient-to-r from-[#E8F4FD] to-sky-50 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-[#0D2137]">
                    Questions Regarding Your Data or Instagram Access?
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Contact our dedicated Privacy and Security Officer for data exports, token revocations, or compliance audits.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <a
                    href="mailto:privacy@getcreo.in"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2B7BC4] to-[#1E609A] text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
                  >
                    Email Privacy Officer
                  </a>
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}
