import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Privacy Policy | Creo - Digital Marketing Agency",
  description:
    "Learn how Creo collects, uses, stores, and protects your personal and business data across our platform.",
  openGraph: {
    title: "Privacy Policy | Creo",
    description:
      "Understand how Creo handles your data with enterprise-grade security, encryption, and strict workspace isolation.",
    url: "https://www.getcreo.in/privacy",
    siteName: "Creo",
    locale: "en_IN",
    type: "website",
  },
}

const SECTIONS = [
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
]

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-brand-light">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
              Privacy Policy
            </h1>
            <p className="mt-4 text-lg text-neutral/60">
              Last updated: June 29, 2026
            </p>
            <p className="mt-6 text-lg leading-relaxed text-neutral/70">
              At Creo, we take your privacy seriously. This policy explains how
              we collect, use, store, and protect your personal and business
              data across our platform.
            </p>
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
              Questions about our privacy practices?{" "}
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
