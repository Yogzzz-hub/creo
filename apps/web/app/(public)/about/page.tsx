import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Target,
  Users,
  TrendingUp,
  HeartHandshake,
  BarChart3,
  Megaphone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | Creo - Digital Marketing Agency",
  description:
    "Learn about Creo — a growth-first digital marketing agency with 3+ years of experience, 50+ brands served, and a team obsessed with results.",
  openGraph: {
    title: "About Creo - Digital Marketing Agency",
    description:
      "We don't just market brands. We grow them. Meet the team behind 50+ successful brands.",
    url: "https://www.getcreo.in/about",
    siteName: "Creo",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Creo - Digital Marketing Agency",
    description:
      "We don't just market brands. We grow them. Meet the team behind 50+ successful brands.",
  },
};

const DIFFERENTIATORS = [
  {
    icon: Target,
    title: "Results-First Strategy",
    description:
      "Every piece of content is tied to a measurable growth metric — not just aesthetics.",
  },
  {
    icon: Users,
    title: "Dedicated Brand Team",
    description:
      "You get a consistent team that learns your voice, not a rotating pool of freelancers.",
  },
  {
    icon: TrendingUp,
    title: "Weekly Content Cadence",
    description:
      "Fresh, on-brand content delivered every single week — no gaps, no guesswork.",
  },
  {
    icon: HeartHandshake,
    title: "Transparent Collaboration",
    description:
      "Real-time portal access, live calendars, and direct chat with your team.",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Iteration",
    description:
      "We track what works and double down — your strategy evolves with your audience.",
  },
  {
    icon: Megaphone,
    title: "Full-Stack Marketing",
    description:
      "From social media to paid ads to content strategy — one partner, zero silos.",
  },
];

const TEAM = [
  {
    name: "Arjun Mehta",
    role: "Founder & CEO",
    description:
      "Former growth lead at a top D2C brand. Built Creo to give every business access to agency-level marketing.",
  },
  {
    name: "Priya Sharma",
    role: "Head of Content",
    description:
      "10+ years in brand storytelling. Leads the creative direction for all client accounts.",
  },
  {
    name: "Ravi Kumar",
    role: "Head of Growth",
    description:
      "Performance marketing specialist. Drives ROI-focused strategies across paid and organic channels.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-light">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-brand-dark sm:text-5xl">
              We don&apos;t just market brands.
              <br />
              <span className="text-brand">We grow them.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral sm:text-xl">
              Creo exists because every business deserves a growth partner — not
              just a vendor. We started with a simple belief: consistent,
              high-quality content delivered on time can transform a brand. Three
              years and 50+ brands later, we&apos;re still proving it every week.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-brand">
              Our Mission
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              Why we exist — not just what we do
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-neutral/70">
              Most businesses know they need to post on social media. Few know
              how to do it consistently, on-brand, and with real strategy behind
              it. Creo bridges that gap. We combine creative firepower with
              growth thinking so that every reel, every post, every story moves
              your brand forward.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-neutral/70">
              We&apos;re not here to sell you vanity metrics. We&apos;re here
              to build something that lasts — a brand people remember, a
              presence people trust, and results you can actually see.
            </p>
          </div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="bg-neutral-light py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-brand">
              Why Creo
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              What makes us different
            </h2>
            <p className="mt-4 text-lg text-neutral/60">
              We&apos;re built for businesses that want results, not just
              posts.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENTIATORS.map((item) => (
              <Card
                key={item.title}
                className="border-border bg-white transition-shadow hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-brand-light text-brand">
                    <item.icon className="size-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-brand-dark">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-neutral/60">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-brand">
              Our Team
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-brand-dark sm:text-4xl">
              The people behind your growth
            </h2>
            <p className="mt-4 text-lg text-neutral/60">
              Small team. Big experience. Obsessed with your results.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <Card
                key={member.name}
                className="border-border bg-white text-center transition-shadow hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="mx-auto mb-4 flex size-24 items-center justify-center rounded-full bg-brand-light text-brand">
                    <span className="text-2xl font-bold">
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-brand-dark">
                    {member.name}
                  </h3>
                  <p className="text-sm font-medium text-brand">
                    {member.role}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-neutral/60">
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
            Ready to grow your brand?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Join 50+ businesses that chose Creo as their growth partner.
          </p>
          <div className="mt-8">
            <Link
              href="/signup"
              className={buttonVariants({
                className:
                  "bg-brand text-white hover:bg-brand/90 rounded-lg h-12 px-8 text-base font-semibold",
              })}
            >
              Get Started Today
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
