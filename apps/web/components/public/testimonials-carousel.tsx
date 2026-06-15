"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Quote } from "lucide-react";

const TESTIMONIALS = [
  {
    quote:
      "Creo transformed our social media from a chore into our biggest growth channel. We went from inconsistent posts to a full content engine in weeks.",
    name: "Ananya Reddy",
    business: "StyleNest — Fashion & Apparel",
    result: "3x engagement in 60 days",
  },
  {
    quote:
      "The team truly understands our brand voice. Every piece of content feels like it came from inside our company — but better.",
    name: "Vikram Patel",
    business: "SpiceRoute Kitchen — Food & Beverage",
    result: "1,200+ new followers in 3 weeks",
  },
  {
    quote:
      "We tried two agencies before Creo. The difference? They actually care about results, not just deliverables. Our membership sign-ups doubled.",
    name: "Neha Kapoor",
    business: "FitForge Studio — Health & Wellness",
    result: "40% increase in foot traffic",
  },
  {
    quote:
      "From onboarding to the first content drop, everything was seamless. Creo feels like an extension of our team, not an external vendor.",
    name: "Rohit Menon",
    business: "GreenLeaf — Sustainability",
    result: "85% content approval rate",
  },
  {
    quote:
      "The weekly content cadence is a game-changer. We never have to worry about what to post — it just shows up, on time, on brand.",
    name: "Meera Joshi",
    business: "GlowUp — Beauty & Skincare",
    result: "Consistent 5K+ reel views",
  },
];

export function TestimonialsCarousel() {
  return (
    <div className="mt-12">
      <Carousel opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent className="-ml-4">
          {TESTIMONIALS.map((testimonial, index) => (
            <CarouselItem
              key={index}
              className="pl-4 md:basis-1/2 lg:basis-1/3"
            >
              <Card className="h-full border-border bg-white">
                <CardContent className="flex h-full flex-col p-6">
                  <Quote className="mb-4 size-8 text-brand/30" />
                  <p className="flex-1 text-sm leading-relaxed text-neutral/70">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                    <div className="flex size-10 items-center justify-center rounded-full bg-brand-light text-brand">
                      <span className="text-sm font-bold">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-brand-dark">
                        {testimonial.name}
                      </p>
                      <p className="text-xs text-neutral/50">
                        {testimonial.business}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-success-light px-3 py-2">
                    <p className="text-xs font-semibold text-success">
                      {testimonial.result}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
}
