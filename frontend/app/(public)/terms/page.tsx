import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Terms & Conditions | Creo - Digital Marketing Agency",
  description:
    "Read Creo's terms of service covering subscription plans, payment policies, SLAs, and creative deliverable obligations.",
  openGraph: {
    title: "Terms & Conditions | Creo",
    description:
      "Understand Creo's subscription plans, payment routing, onboarding workflow, and creative SLA obligations.",
    url: "https://www.getcreo.in/terms",
    siteName: "Creo",
    locale: "en_IN",
    type: "website",
  },
}

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    content: [
      "By accessing or using the Creo platform (the \"Service\"), you agree to be bound by these Terms and Conditions (\"Terms\"). If you do not agree to these Terms, you may not access or use the Service.",
      "These Terms constitute a legally binding agreement between you (\"Client\", \"you\", or \"your\") and Creo (\"we\", \"us\", or \"our\"), a digital marketing agency management platform.",
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
      "If the onboarding workflow is not completed within 7 calendar days, your account status will be set to \"Pending Onboarding\" and access to the client portal will be restricted until the remaining steps are completed.",
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
      "Revisions are limited to 2 rounds per deliverable for subscription content. If content remains unapproved after 2 rounds of revisions, the deliverable is marked as \"Final\" and counted against your monthly quota.",
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
      "Upon cancellation, your account status changes to \"Lapsed\" and access to the client portal is restricted. Content deliverables in progress at the time of cancellation will be completed and delivered.",
      "Creo reserves the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or abuse platform features. Suspended accounts are notified via email with details of the violation.",
      "Upon account termination, your data is retained for 30 days for recovery purposes, after which it is permanently deleted from our active databases.",
    ],
  },
  {
    title: "10. Limitation of Liability",
    content: [
      "Creo provides the Service on an \"as is\" basis. We make no warranties regarding uninterrupted access, error-free operation, or specific business outcomes from our marketing services.",
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
]

export default function TermsPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-light">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
              Terms & Conditions
            </h1>
            <p className="mt-4 text-lg text-neutral/60">
              Last updated: June 29, 2026
            </p>
            <p className="mt-6 text-lg leading-relaxed text-neutral/70">
              These terms govern your use of the Creo platform. Please read
              them carefully before creating an account or subscribing to our
              services.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="text-sm font-medium text-brand hover:underline"
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
          <Card className="border-border bg-white rounded-xl shadow-[var(--shadow-card)]">
            <CardContent className="p-8 sm:p-12 space-y-10">
              {SECTIONS.map((section) => (
                <div key={section.title}>
                  <h2 className="text-xl font-bold text-brand-dark">
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4">
                    {section.content.map((paragraph, i) => (
                      <p
                        key={i}
                        className="text-sm leading-relaxed text-neutral/70"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="mt-12 text-center">
            <p className="text-sm text-neutral/50">
              Questions about our terms?{" "}
              <Link
                href="/support"
                className="text-brand hover:underline font-medium"
              >
                Contact our support team
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
