import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="hero-bg-gradient relative overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32 text-white" id="hero">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Content & Copy */}
          <div className="lg:col-span-6 z-10 reveal-element">
            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-blue-200">
              Your brand.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-cyan-300">Growing.</span> Every<br />
              week.
            </h1>
            {/* Subtitle */}
            <p className="mt-8 text-xl sm:text-2xl text-blue-50/90 font-normal leading-relaxed max-w-xl">
              Onboarded in 7 days. Content delivered every week.
            </p>
            
            {/* Call to Actions */}
            <div className="mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
              <Link
                href="/pricing#plans"
                className="shimmer-btn group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-blue-700 bg-white hover:bg-slate-50 hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-black/15 active:shadow-sm cursor-pointer transition-all duration-200 rounded-full shadow-lg shadow-black/5 w-full sm:w-auto"
              >
                <span>See Our Plans</span>
                <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/contact"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-md hover:scale-105 active:scale-95 hover:shadow-xl hover:shadow-blue-900/30 active:shadow-sm cursor-pointer transition-all duration-200 rounded-full shadow-sm w-full sm:w-auto"
              >
                <span>Book a Call</span>
                <svg className="w-5 h-5 transition-transform duration-200 group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M7 17L17 7M17 7H7M17 7V17"></path>
                </svg>
              </Link>
            </div>
          </div>

          {/* Right Column: Glassmorphic Visual Layout Mockup */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end reveal-element" style={{ transitionDelay: '150ms' }}>
            <div className="w-full max-w-lg lg:max-w-none p-6 sm:p-8 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl relative transition-transform duration-500 hover:shadow-blue-400/20">
              {/* Subtle Background Light Beam with pulse */}
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/25 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-blue-300/30 rounded-full blur-2xl pointer-events-none"></div>
              
              {/* Inner Multi-Card Grid Structure */}
              <div className="grid grid-cols-3 gap-4 relative z-10">
                {/* Stat Card 1 */}
                <div className="glass-card rounded-2xl p-6 h-40 flex flex-col justify-center items-center shadow-inner group transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:bg-white/30 cursor-pointer animate-float">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-white transition-transform duration-300 group-hover:scale-110">50+</span>
                  <span className="text-xs uppercase font-medium tracking-wider text-blue-100 mt-1">Partners</span>
                </div>
                
                {/* Abstract Visual Box 1: Radar glow & spinner */}
                <div className="glass-card rounded-2xl p-6 h-40 flex items-center justify-center transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:bg-white/30 cursor-pointer group animate-float-delayed">
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-white/60 animate-spin-slow group-hover:border-white flex items-center justify-center transition-colors radar-pulse-ring">
                    <div className="w-4 h-4 bg-white/80 rounded-full group-hover:scale-125 transition-transform shadow-lg shadow-white/50"></div>
                  </div>
                </div>
                
                {/* Stat Card 2 */}
                <div className="glass-card rounded-2xl p-6 h-40 flex flex-col justify-center items-center shadow-inner group transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:bg-white/30 cursor-pointer animate-float">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight text-white transition-transform duration-300 group-hover:scale-110">98%</span>
                  <span className="text-xs uppercase font-medium tracking-wider text-blue-100 mt-1">Satisfaction</span>
                </div>
                
                {/* Abstract Visual Box 2: Progress Bars */}
                <div className="glass-card rounded-2xl p-6 h-44 flex flex-col justify-between group transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:bg-white/30 cursor-pointer animate-float-slow">
                  <div className="space-y-2.5">
                    <div className="w-8 h-2 bg-white/40 rounded-full transition-all duration-300 group-hover:w-14 group-hover:bg-white/70"></div>
                    <div className="w-14 h-2 bg-white/30 rounded-full transition-all duration-300 group-hover:w-16 group-hover:bg-white/60"></div>
                  </div>
                  <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-white rounded-full transition-all duration-700 ease-out group-hover:w-full"></div>
                  </div>
                </div>
                
                {/* Stat Card 3: Large Multiplier Accent */}
                <div className="glass-card rounded-2xl p-6 h-44 flex flex-col justify-center items-center group transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:bg-white/30 cursor-pointer animate-float">
                  <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white transition-transform duration-300 group-hover:scale-110">3x</span>
                  <span className="text-xs uppercase font-semibold tracking-wider text-blue-100 mt-1">ROI Boost</span>
                </div>
                
                {/* Abstract Visual Box 3 */}
                <div className="glass-card rounded-2xl p-6 h-44 flex flex-col justify-center items-center group transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:bg-white/30 cursor-pointer animate-float-delayed">
                  <svg className="w-10 h-10 text-white/75 transition-transform duration-300 group-hover:scale-125 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
