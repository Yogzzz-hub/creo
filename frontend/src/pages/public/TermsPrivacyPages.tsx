import { Link } from "react-router";

const TERMS_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    content: [
      'By accessing or using the Creo platform (the "Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you may not access or use the Service.',
      'These Terms constitute a legally binding agreement between you ("Client", "you", or "your") and Creo ("we", "us", or "our"), a digital marketing agency management platform.',
    ],
  },
  {
    title: "2. Subscription Plans and Quotas",
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
    title: "3. Payment Processing",
    content: [
      "All subscription payments are processed through secure, PCI DSS-compliant payment gateways:",
      "Domestic (India) Transactions — Payments are routed through Razorpay. Razorpay supports UPI, net banking, credit/debit cards, and popular wallets. Razorpay's terms of service govern the payment processing relationship for domestic transactions.",
      "International Transactions — Payments are routed through Stripe. Stripe supports major credit/debit cards and local payment methods in supported countries. Stripe's terms of service govern the payment processing relationship for international transactions.",
      "Your subscription is billed on a recurring monthly or annual basis, depending on the billing cycle you selected at sign-up. Failed payments are retried automatically for up to 5 business days before the subscription is marked as lapsed.",
      "All prices are displayed in Indian Rupees (INR) for domestic subscribers and US Dollars (USD) for international subscribers, inclusive of applicable taxes unless otherwise stated.",
    ],
  },
  {
    title: "4. Onboarding Workflow",
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
    title: "5. Service Level Agreements (SLAs)",
    content: [
      "All service level agreements are measured in business days (Monday through Friday, excluding Indian public holidays):",
      "New Content Delivery — Content deliverables are produced and submitted for client approval within the turnaround time specified by your subscription plan. Standard turnaround is 3 business days for Starter, 2 business days for Growth, and 1 business day for Pro.",
      "Revision Turnaround — When a client requests revisions on a submitted deliverable, the creative team will deliver the revised version within 24 business hours of the revision request.",
      "Support Ticket Response — Our support team responds to all tickets within 8 business hours during standard working hours (10:00 AM to 7:00 PM IST, Monday through Friday).",
      "Escalation Response — High-priority escalations are acknowledged within 4 business hours and resolved within 1 business day.",
    ],
  },
  {
    title: "6. Content Approval and Revisions",
    content: [
      "All content deliverables are submitted through the Creo client portal for your review and approval. You have the option to approve, reject, or request revisions for each deliverable.",
      'Revisions are limited to 2 rounds per deliverable for subscription content. If content remains unapproved after 2 rounds of revisions, the deliverable is marked as "Final" and counted against your monthly quota.',
      "Content that is not reviewed within 5 business days of submission is automatically approved to maintain production cadence. You will receive a notification before auto-approval takes effect.",
      "You may reject a deliverable with mandatory feedback. Rejected deliverables are replaced at no additional cost within the standard turnaround time for your plan.",
    ],
  },
  {
    title: "7. Instagram Integration",
    content: [
      "If you connect your Instagram Business account to Creo, you authorize Creo to publish approved content directly to your Instagram account through Meta's Graph API.",
      "This integration is optional and can be disconnected at any time from your Account Settings. Disconnecting does not affect your subscription or content delivery — it only stops automated publishing.",
      "Creo stores your Instagram access token encrypted at rest using Fernet symmetric encryption. The token is used exclusively for publishing content you have explicitly approved.",
      "Creo is not responsible for any changes to Meta's API, Instagram's terms of service, or Instagram's content policies that may affect the publishing integration.",
    ],
  },
  {
    title: "8. Add-on Orders",
    content: [
      "Add-on orders allow you to purchase additional content deliverables beyond your subscription plan's monthly quota.",
      "Add-on pricing is configured by Creo administrators and displayed in the Add-ons section of your portal. Prices are exclusive of applicable taxes.",
      "Each Add-on order includes 1 round of revision. Additional revision rounds on Add-on orders are billed separately at the per-piece rate specified in your Add-on order.",
      "Add-on orders are billed immediately upon purchase and are non-refundable once the creative team has begun production.",
    ],
  },
  {
    title: "9. Account Termination",
    content: [
      "You may cancel your subscription at any time from your Account Settings. Cancellation takes effect at the end of your current billing cycle.",
      'Upon cancellation, your account status changes to "Lapsed" and access to the client portal is restricted. Content deliverables in progress at the time of cancellation will be completed and delivered.',
      "Creo reserves the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or abuse platform features. Suspended accounts are notified via email with details of the violation.",
      "Upon account termination, your data is retained for 30 days for recovery purposes, after which it is permanently deleted from our active databases.",
    ],
  },
  {
    title: "10. Limitation of Liability",
    content: [
      'Creo provides the Service on an "as is" basis. We make no warranties regarding uninterrupted access, error-free operation, or specific business outcomes from our marketing services.',
      "Creo's total liability for any claims arising from or related to the Service is limited to the amount you paid for the Service during the 12-month period preceding the claim.",
      "Creo is not liable for indirect, incidental, consequential, or punitive damages, including lost profits, data loss, or business interruption.",
    ],
  },
  {
    title: "11. Governing Law",
    content: [
      "These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be resolved in the courts of Bengaluru, Karnataka, India.",
    ],
  },
  {
    title: "12. Changes to These Terms",
    content: [
      "We may update these Terms from time to time. Material changes will be communicated via email and a notification in the Creo portal at least 14 days before they take effect.",
      "Your continued use of Creo after the effective date of any changes constitutes acceptance of the updated Terms.",
    ],
  },
  {
    title: "13. Contact Us",
    content: [
      "If you have questions about these Terms & Conditions, please contact us at legal@getcreo.in or through the support portal within your Creo account.",
    ],
  },
];

const PRIVACY_SECTIONS = [
  {
    title: "1. Information We Collect",
    content: [
      "When you create a Creo account, we collect your full name, business name, email address, and phone number. This information is required to provision your workspace and communicate with you about your subscription and deliverables.",
      "If you register using Google OAuth, we receive your name, email address, and profile picture from Google's authentication service. We do not store your Google password — authentication is handled entirely by Google's OAuth 2.0 protocol.",
      "If you register using phone-based OTP, we collect your phone number and verify it through our SMS provider (MSG91). The OTP code is transient and is never stored after verification.",
      "We also collect billing information necessary to process your subscription payments through Razorpay (for domestic Indian transactions) or Stripe (for international transactions). Payment card details are never stored on our servers — they are tokenized and managed by the payment processor.",
    ],
  },
  {
    title: "2. How We Use Your Information",
    content: [
      "Your personal and business information is used exclusively to operate and improve the Creo platform. This includes managing your subscription, delivering content through your dedicated agency team, processing payments, and providing customer support.",
      "We use your email address and phone number to send transactional communications — payment receipts, subscription renewals, deliverable notifications, and support ticket updates. We do not send unsolicited marketing communications.",
      "Business profile data (business name, industry, social media handles) is used by your assigned content team to create tailored marketing strategies and content calendars for your brand.",
    ],
  },
  {
    title: "3. Data Isolation and Multi-Tenant Security",
    content: [
      "Creo operates a strict multi-tenant architecture. Each agency workspace is completely isolated from every other workspace on the platform. Your business data, content deliverables, financial records, team communications, and integrations are accessible only to users explicitly assigned to your workspace.",
      "No user, team member, or administrator can access data belonging to another agency's workspace. This isolation is enforced at the database level through Row-Level Security (RLS) policies on every table in our PostgreSQL database, as well as through role-based access control in our API layer.",
      "Your content calendars, deliverables, payment history, support tickets, and onboarding data are logically and physically separated from all other tenants on the platform.",
    ],
  },
  {
    title: "4. File Uploads and Storage",
    content: [
      "When you upload files through the Creo portal — including creative assets, brand guidelines, logos, and deliverable submissions — these files are stored in Supabase Storage, a secure cloud object storage service built on Amazon S3 infrastructure.",
      "Files are encrypted at rest using AES-256 encryption. Access to your files is governed by signed URLs with time-limited tokens, ensuring that only authenticated users within your workspace can retrieve uploaded content.",
      "We do not scan, analyze, or use your uploaded files for any purpose other than delivering the services outlined in your subscription plan.",
    ],
  },
  {
    title: "5. Instagram Integration and Token Security",
    content: [
      "If you choose to connect your Instagram Business account to Creo, we initiate a standard OAuth 2.0 flow through Meta's Graph API. This allows Creo to publish approved content directly to your Instagram account on your behalf.",
      "During this process, Meta provides us with an access token that grants Creo permission to publish content to your Instagram account. This token is encrypted at rest using Fernet symmetric encryption (AES-128-CBC) before being stored in our database.",
      "The encryption key used to protect your Instagram access token is stored separately from the encrypted data and is never exposed in API responses, logs, or client-side code. Only our backend services can decrypt the token, and only for the specific purpose of publishing content you have approved.",
      "You can revoke Creo's access to your Instagram account at any time from your Account Settings page. Revoking access immediately deletes the encrypted token from our database and stops all automated publishing to your Instagram account.",
    ],
  },
  {
    title: "6. Third-Party Services",
    content: [
      "Creo integrates with the following third-party services to operate our platform:",
      "Supabase — Database hosting, authentication, file storage, and real-time subscriptions. Supabase is SOC 2 Type II compliant and operates on AWS infrastructure.",
      "Razorpay — Payment processing for domestic (Indian) transactions. Razorpay is PCI DSS Level 1 compliant.",
      "Stripe — Payment processing for international transactions. Stripe is PCI DSS Level 1 compliant.",
      "Meta Graph API — Instagram content publishing. governed by Meta's Platform Terms.",
      "Resend — Transactional email delivery. Emails are sent from our verified domain.",
      "MSG91 — SMS and WhatsApp message delivery for OTP verification and notifications.",
      "OpenAI — AI-powered brand analysis and content strategy generation. Prompts are processed in compliance with OpenAI's data usage policies.",
      "Each third-party service operates under its own privacy policy and data processing agreements. We select service providers that maintain industry-standard security certifications.",
    ],
  },
  {
    title: "7. Data Retention",
    content: [
      "We retain your account information for as long as your account is active. If you delete your account or your subscription lapses, we retain your data for 30 days to allow for account recovery, after which it is permanently deleted from our active databases.",
      "Encrypted Instagram access tokens are deleted immediately upon account deletion or explicit disconnection.",
      "Payment transaction records are retained for 7 years as required by Indian tax and accounting regulations.",
      "Support ticket history is retained for 2 years after the last message in a ticket thread.",
    ],
  },
  {
    title: "8. Your Rights",
    content: [
      "You have the right to access, correct, or delete your personal information at any time. You can update your profile information directly from your Account Settings page.",
      "You can request a complete export of your data by contacting our support team. We will provide a machine-readable export within 7 business days.",
      "You can request deletion of your account and all associated data by contacting support. Account deletion is irreversible and will be completed within 14 business days.",
    ],
  },
  {
    title: "9. Security Measures",
    content: [
      "All data transmitted between your browser and our servers is encrypted using TLS 1.3 (HTTPS).",
      "Database connections use SSL/TLS encryption. All sensitive fields (payment tokens, Instagram access tokens, API keys) are encrypted at rest using Fernet or AES-256 encryption.",
      "We enforce role-based access control (RBAC) across all platform surfaces — client portal, team dashboard, and admin panel. Every API request is authenticated via JWT tokens validated against Supabase's JWT secret.",
      "Session timeouts are enforced per role: 30 days for client accounts, 8 hours for team members, and 4 hours for administrators.",
    ],
  },
  {
    title: "10. Changes to This Policy",
    content: [
      "We may update this Privacy Policy from time to time. Material changes will be communicated via email and a notification in the Creo portal at least 14 days before they take effect.",
      "Your continued use of Creo after the effective date of any changes constitutes acceptance of the updated policy.",
    ],
  },
  {
    title: "11. Contact Us",
    content: [
      "If you have questions about this Privacy Policy or how Creo handles your data, please contact us at privacy@getcreo.in or through the support portal within your Creo account.",
    ],
  },
];

export function TermsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#E8F4FD]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#0D2137] sm:text-5xl">
              Terms & Conditions
            </h1>
            <p className="mt-4 text-lg text-[#0D2137]/60">
              Last updated: June 29, 2026
            </p>
            <p className="mt-6 text-lg leading-relaxed text-[#0D2137]/70">
              These terms govern your use of the Creo platform. Please read
              them carefully before creating an account or subscribing to our
              services.
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="text-sm font-medium text-[#2B7BC4] hover:underline"
              >
                &larr; Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="border border-[#C9DFF0] bg-white rounded-xl shadow-[var(--shadow-card)] p-8 sm:p-12 space-y-10">
            {TERMS_SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-xl font-bold text-[#0D2137]">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.content.map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-sm leading-relaxed text-[#0D2137]/70"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-[#0D2137]/50">
              Questions about our terms?{" "}
              <Link
                to="/faq"
                className="text-[#2B7BC4] hover:underline font-medium"
              >
                Check our FAQ
              </Link>{" "}
              or contact our support team.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

export function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-[#E8F4FD]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-[#0D2137] sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-lg text-[#0D2137]/60">
              Last updated: June 29, 2026
            </p>
            <p className="mt-6 text-lg leading-relaxed text-[#0D2137]/70">
              At Creo, we take your privacy seriously. This policy explains how
              we collect, use, store, and protect your personal and business
              data across our platform.
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="text-sm font-medium text-[#2B7BC4] hover:underline"
              >
                &larr; Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="border border-[#C9DFF0] bg-white rounded-xl shadow-[var(--shadow-card)] p-8 sm:p-12 space-y-10">
            {PRIVACY_SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="text-xl font-bold text-[#0D2137]">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.content.map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-sm leading-relaxed text-[#0D2137]/70"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-[#0D2137]/50">
              Questions about our privacy practices?{" "}
              <Link
                to="/faq"
                className="text-[#2B7BC4] hover:underline font-medium"
              >
                Check our FAQ
              </Link>{" "}
              or contact our support team.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
