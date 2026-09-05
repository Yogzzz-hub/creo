export const dynamic = "force-static";
export const revalidate = 3600;

import {
  HeroSection,
  MetricsSection,
  HowItWorksSection,
  LeadMagnetSection,
} from "@/components/landing";

const LOCAL_BUSINESS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Creo",
  description:
    "Full-service digital marketing agency helping local businesses grow with weekly content, social media management, and performance marketing.",
  url: "https://www.getcreo.in",
  telephone: "+91-9941999415",
  email: "hello@getcreo.in",
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.instagram.com/getcreo",
    "https://www.linkedin.com/company/getcreo",
    "https://twitter.com/getcreo",
  ],
  priceRange: "$$",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "50",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(LOCAL_BUSINESS_SCHEMA),
        }}
      />

      <HeroSection />
      <MetricsSection />
      <HowItWorksSection />
      <LeadMagnetSection />
    </>
  );
}
