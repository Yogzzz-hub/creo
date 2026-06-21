import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, ThumbsUp, TrendingUp } from "lucide-react";
import { TestimonialsCarousel } from "@/components/public/testimonials-carousel";

export const metadata: Metadata = {
  title: "Our Clients | Creo - Digital Marketing Agency",
  description:
    "See why 50+ brands trust Creo. Read client testimonials, explore success stats, and meet the team behind your growth.",
  openGraph: {
    title: "Our Clients - Creo Digital Marketing Agency",
    description:
      "Trusted by 50+ growing brands. Real testimonials and results from real businesses.",
    url: "https://www.getcreo.in/clients",
    siteName: "Creo",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Clients - Creo Digital Marketing Agency",
    description:
      "Trusted by 50+ growing brands. Real testimonials and results from real businesses.",
  },
};

const CLIENT_LOGOS = [
  { name: "StyleNest", industry: "Fashion" },
  { name: "SpiceRoute", industry: "Food & Beverage" },
  { name: "FitForge", industry: "Health & Wellness" },
  { name: "GreenLeaf", industry: "Sustainability" },
  { name: "UrbanEdge", industry: "Real Estate" },
  { name: "PetPals", industry: "Pet Care" },
  { name: "TechNova", industry: "Technology" },
  { name: "ArtisanBrew", industry: "Coffee & Cafe" },
  { name: "GlowUp", industry: "Beauty" },
  { name: "FreshBite", industry: "Food Delivery" },
  { name: "ZenSpace", industry: "Interior Design" },
  { name: "PlayZone", industry: "Kids & Family" },
];

const SUCCESS_STATS = [
  {
    icon: TrendingUp,
    value: "1,200+",
    label: "Reels Delivered",
    description: "Professionally crafted and published across client accounts.",
  },
  {
    icon: Users,
    value: "50+",
    label: "Clients Served",
    description: "Growing businesses across 12+ industries nationwide.",
  },
  {
    icon: ThumbsUp,
    value: "98%",
    label: "Approval Rate",
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
              <span className="text-brand">50+ Growing Brands</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-neutral sm:text-xl">
              From local startups to established businesses — we partner with
              brands that are ready to grow.
            </p>
          </div>
        </div>
      </section>

      {/* Logo Wall */}
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

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {CLIENT_LOGOS.map((logo) => (
              <div
                key={logo.name}
                className="flex flex-col items-center justify-center rounded-xl border border-border bg-neutral-light p-6 transition-all hover:border-brand/30 hover:shadow-md"
              >
                <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-brand-light text-brand">
                  <span className="text-lg font-bold">
                    {logo.name.charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-semibold text-brand-dark">
                  {logo.name}
                </span>
                <span className="text-xs text-neutral/50">{logo.industry}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
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

          <TestimonialsCarousel />
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
                    <Users className="size-8" />
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
                  "border-white/30 text-deep navy hover:bg-white/10 rounded-lg h-12 px-8 text-base font-semibold",
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
