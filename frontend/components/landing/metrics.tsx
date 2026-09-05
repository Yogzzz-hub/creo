const STATS = [
  { value: "50+", label: "Brands Grown" },
  { value: "1,200+", label: "Reels Delivered" },
  { value: "12+", label: "Industries Served" },
  { value: "3+", label: "Years of Experience" },
  { value: "98%", label: "Approval Rate" },
];

export function MetricsSection() {
  return (
    <section className="py-16 border-y border-slate-100 bg-slate-50/50" id="stats">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          {STATS.map((stat, idx) => (
            <div
              key={stat.label}
              className={`p-4 rounded-xl bg-white border border-slate-100 shadow-sm flex flex-col justify-center items-center ${
                idx === 4 ? "col-span-2 md:col-span-1" : ""
              }`}
            >
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
