export const dynamic = "force-static";
export const revalidate = 3600;

import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, ThumbsUp, TrendingUp, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Clients | Creo - Digital Marketing Agency",
  description:
    "See why brands trust Creo. Explore client success stories, stats, and the team behind your growth.",
  openGraph: {
    title: "Our Clients - Creo Digital Marketing Agency",
    description:
      "Trusted by growing brands. Real testimonials and results from real businesses.",
    url: "https://www.getcreo.in/clients",
    siteName: "Creo",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Clients - Creo Digital Marketing Agency",
    description:
      "Trusted by growing brands. Real testimonials and results from real businesses.",
  },
};

const SUCCESS_STATS = [
  {
    icon: TrendingUp,
    value: "3x",
    label: "Average Engagement Boost",
    description: "Typical improvement in social media engagement within 60 days.",
  },
  {
    icon: Users,
    value: "50+",
    label: "Clients Served",
    description: "Growing businesses across multiple industries nationwide.",
  },
  {
    icon: ThumbsUp,
    value: "98%",
    label: "Content Approval Rate",
    description: "Content that clients love — first time, every time.",
  },
];

const TEAM = [
  {
    name: "Arjun Mehta",
    role: "Founder & CEO",
    description: "Leads vision and client strategy.",
  },
  {
    name: "Priya Sharma",
    role: "Head of Content",
    description: "Oversees creative direction and quality.",
  },
  {
    name: "Ravi Kumar",
    role: "Head of Growth",
    description: "Drives performance and analytics.",
  },
  {
    name: "Sneha Iyer",
    role: "Client Success Lead",
    description: "Ensures every client hits their goals.",
  },
];

const TESTIMONIALS_PLACEHOLDER = [
  {
    quote:
      "Creo transformed our social media from a chore into our biggest growth channel.",
    name: "Client A",
    business: "Fashion & Apparel",
    result: "3x engagement in 60 days",
  },
  {
    quote:
      "The team truly understands our brand voice. Every piece of content feels authentic.",
    name: "Client B",
    business: "Food & Beverage",
    result: "1,200+ new followers in 3 weeks",
  },
  {
    quote:
      "We tried two agencies before Creo. The difference? They actually care about results.",
    name: "Client C",
    business: "Health & Wellness",
    result: "40% increase in foot traffic",
  },
];

export default function ClientsPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-light">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
              Trusted by
              <br />
              <span className="text-brand">Growing Brands</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral sm:text-xl">
              From local startups to established businesses — we partner with
              brands that are ready to grow.
            </p>
          </div>
        </div>
      </section>

      {/* Client Logos — Placeholder */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-brand">
              Our Clients
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              Brands that trust Creo
            </h2>
          </div>

          <div className="mt-12 flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-12">
            <div className="text-center">
              <Building2 className="mx-auto size-10 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-400">
                Client logos coming soon
              </p>
              <p className="mt-1 text-xs text-gray-300">
                Real client logos will be displayed here after launch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials — Placeholder */}
      <section className="bg-neutral-light py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-brand">
              Testimonials
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              What our clients say
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS_PLACEHOLDER.map((t, i) => (
              <Card
                key={i}
                className="border-border bg-white"
              >
                <CardContent className="flex h-full flex-col p-6">
                  <p className="flex-1 text-sm leading-relaxed text-neutral/70 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="text-sm font-semibold text-brand-dark">
                      {t.name}
                    </p>
                    <p className="text-xs text-neutral/50">{t.business}</p>
                  </div>
                  <div className="mt-3 rounded-lg bg-success-light px-3 py-2">
                    <p className="text-xs font-semibold text-success">
                      {t.result}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-neutral/40">
            Real client testimonials will replace these placeholders after launch.
          </p>
        </div>
      </section>

      {/* Success Stats */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-brand">
              Results That Matter
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              Numbers that tell the story
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {SUCCESS_STATS.map((stat) => (
              <Card
                key={stat.label}
                className="border-border bg-white text-center transition-shadow hover:shadow-lg"
              >
                <CardContent className="p-8">
                  <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-light text-brand">
                    <stat.icon className="size-7" />
                  </div>
                  <p className="text-4xl font-extrabold text-brand-dark">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-base font-semibold text-brand">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-sm text-neutral/60">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Profiles */}
      <section className="bg-neutral-light py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-brand">
              Meet the Team
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              The faces behind the success
            </h2>
            <p className="mt-4 text-lg text-neutral/60">
              A tight-knit team obsessed with your growth.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member) => (
              <Card
                key={member.name}
                className="border-border bg-white text-center transition-shadow hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-brand-light text-brand">
                    <span className="text-xl font-bold">
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-brand-dark">
                    {member.name}
                  </h3>
                  <p className="text-sm font-medium text-brand">
                    {member.role}
                  </p>
                  <p className="mt-2 text-xs text-neutral/60">
                    {member.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-brand-dark py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to join our growing family?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Start your brand&apos;s growth journey with Creo today.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className={buttonVariants({
                className:
                  "bg-brand text-white hover:bg-brand/90 rounded-lg h-12 px-8 text-base font-semibold",
              })}
            >
              Get Started
            </Link>
            <Link
              href="/pricing"
              className={buttonVariants({
                variant: "outline",
                className:
                  "border-white/30 text-bg-brand hover:bg-white/10 rounded-lg h-12 px-8 text-base font-semibold",
              })}
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
