export function MetricsSection() {
  return (
    <section className="py-16 sm:py-20 border-y bg-blue-50" id="stats">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 lg:gap-8 text-center items-stretch">
          {/* Metric 1 */}
          <div className="reveal-element bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 flex flex-col justify-center items-center cursor-default transition-all duration-300" style={{ transitionDelay: '0ms' }}>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-2 transition-all duration-300">
              <span className="counter-number" data-suffix="+" data-target="50">50+</span>
            </div>
            <div className="text-sm font-medium text-slate-600 transition-colors">Brands Grown</div>
          </div>
          {/* Metric 2 */}
          <div className="reveal-element bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 flex flex-col justify-center items-center cursor-default transition-all duration-300" style={{ transitionDelay: '75ms' }}>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-2 transition-all duration-300">
              <span className="counter-number" data-comma="true" data-suffix="+" data-target="1200">1,200+</span>
            </div>
            <div className="text-sm font-medium text-slate-600 transition-colors">Reels Delivered</div>
          </div>
          {/* Metric 3 */}
          <div className="reveal-element bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 flex flex-col justify-center items-center cursor-default transition-all duration-300" style={{ transitionDelay: '150ms' }}>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-2 transition-all duration-300">
              <span className="counter-number" data-suffix="+" data-target="12">12+</span>
            </div>
            <div className="text-sm font-medium text-slate-600 transition-colors">Industries Served</div>
          </div>
          {/* Metric 4 */}
          <div className="reveal-element bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 flex flex-col justify-center items-center cursor-default transition-all duration-300" style={{ transitionDelay: '225ms' }}>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-2 transition-all duration-300">
              <span className="counter-number" data-suffix="+" data-target="3">3+</span>
            </div>
            <div className="text-sm font-medium text-slate-600 transition-colors">Years of Experience</div>
          </div>
          {/* Metric 5 */}
          <div className="reveal-element col-span-2 md:col-span-1 bg-white/70 backdrop-blur-md border border-white/50 rounded-2xl p-6 flex flex-col justify-center items-center cursor-default transition-all duration-300" style={{ transitionDelay: '300ms' }}>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-2 transition-all duration-300">
              <span className="counter-number" data-suffix="%" data-target="98">98%</span>
            </div>
            <div className="text-sm font-medium text-slate-600 transition-colors">Approval Rate</div>
          </div>
        </div>
      </div>
    </section>
  );
}
