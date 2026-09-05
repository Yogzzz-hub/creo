import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32 bg-gradient-to-b from-blue-50/50 via-white to-white" id="hero">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Copy & CTAs */}
          <div className="lg:col-span-7 z-10">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Full-Service Digital Marketing
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.1]">
              Your brand.<br />
              <span className="text-blue-600">Growing.</span> Every week.
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-xl">
              Onboarded in 7 days. High-impact social media, reels, and performance marketing delivered directly to your portal every week.
            </p>

            {/* Call to Actions */}
            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all duration-200 rounded-xl shadow-lg shadow-blue-500/25"
              >
                <span>See Our Plans</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 active:scale-95 transition-all duration-200 rounded-xl shadow-sm"
              >
                <span>Learn More</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Feature Grid */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-xl shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="font-bold text-slate-900">Weekly Deliverables</div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">Active</span>
              </div>
              
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">4x High-Retention Reels</span>
                  <span className="text-xs font-semibold text-blue-600">Ready</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Carousel Graphics</span>
                  <span className="text-xs font-semibold text-blue-600">Ready</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">Ad Copy &amp; Captions</span>
                  <span className="text-xs font-semibold text-blue-600">Ready</span>
                </div>
              </div>

              <div className="pt-2 text-center text-xs text-slate-400">
                Reviewed and approved in 1 click from your client portal.
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
