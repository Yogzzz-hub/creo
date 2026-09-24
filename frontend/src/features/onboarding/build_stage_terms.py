import os

filepath = r'd:\intern\creo\frontend\src\features\onboarding\StageTerms.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_lines(start, end):
    return "".join(lines[start:end])

# Let's find the start of the return statement
return_start = -1
for i, l in enumerate(lines):
    if 'return (' in l:
        return_start = i
        break

new_imports = '''import { Clock, Check, FileText, ChevronRight, Lock } from "lucide-react";\n'''

# Insert imports at line 10
lines.insert(10, new_imports)

return_start = -1
for i, l in enumerate(lines):
    if 'return (' in l:
        return_start = i
        break

# Rebuild the render block
render_block = '''  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] w-full mx-auto space-y-4 pb-12"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="rounded-2xl border border-[#C9DFF0] bg-white p-6 sm:p-8 shadow-sm">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider mb-4 shadow-sm">
              Step 2 of 5
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-[#0D2137] tracking-tight mb-2">
              Master Service Agreement
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] mb-6 leading-relaxed">
              Please review the terms of service below. Scroll to the bottom of the agreement to unlock the acceptance button.
            </p>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 mb-4">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0D2137]">
                  <FileText className="w-4 h-4 text-[#2B7BC4]" />
                  Document Highlights
                </div>
                <div className="text-[9px] font-bold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> SLA Rev 2026.09 • Enforced
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-2xs">
                  <div>
                    <p className="text-[11px] font-bold text-[#0D2137]">01. Scope of Services</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Content creation, identity, campaigns</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-lg shadow-2xs">
                  <div>
                    <p className="text-[11px] font-bold text-[#0D2137]">02. Payment Terms</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Billing cycles & 7-day grace period</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            {!hasScrolled ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800">Reading in progress...</p>
                  <p className="text-[11px] text-amber-700/80 font-medium mt-0.5">Scroll document to unlock</p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Reading complete</p>
                  <p className="text-[11px] text-emerald-700/80 font-medium mt-0.5">You can now accept the agreement</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="rounded-2xl border border-[#C9DFF0] bg-white p-6 sm:p-8 shadow-sm flex flex-col h-full relative overflow-hidden">
            
            {/* PDF Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#F0F7FD] flex items-center justify-center text-[#2B7BC4] shrink-0 border border-[#C9DFF0]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0D2137]">creo_master_agreement_2026.pdf</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Last updated: January 2025</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-32">
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-[#2B7BC4] transition-all duration-300 ${hasScrolled ? 'w-full' : 'w-[5%]'}`} />
                </div>
                <span className="text-[10px] font-bold text-[#0D2137]">{hasScrolled ? '100%' : '0%'}</span>
              </div>
            </div>

            {/* Scroll container */}
            <div
              ref={scrollContainerRef}
              className="flex-1 min-h-[300px] h-[50vh] max-h-[600px] overflow-y-auto bg-slate-50/50 border border-slate-200/60 rounded-xl p-6 sm:p-8 mb-6 font-mono text-[11px] sm:text-xs text-slate-600 leading-relaxed whitespace-pre-wrap select-text scroll-smooth shadow-inner relative"
            >
              <div className="absolute right-2 top-2 bottom-2 w-1.5 bg-slate-200/50 rounded-full hidden sm:block">
                {/* Custom scrollbar track visual */}
              </div>
              {MSA_TEXT}
              {/* IntersectionObserver sentinel */}
              <div ref={sentinelRef} className="h-1 mt-6" aria-hidden="true" />
            </div>

            {hasScrolled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-xl flex items-center gap-2 mt-auto"
              >
                <div className="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span>You have read and scrolled through the full agreement.</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="rounded-2xl border border-[#C9DFF0] bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto py-3 px-6 rounded-full bg-white border border-[#C9DFF0] text-sm font-bold text-[#64748B] hover:text-[#0D2137] hover:bg-[#F8FAFC] shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 shrink-0"
          >
            <span>← Back to Step 1</span>
          </button>
        ) : <div />}

        <motion.button
          id="accept-terms-btn"
          type="button"
          onClick={onAccepted}
          disabled={!hasScrolled || isSubmitting}
          whileHover={hasScrolled && !isSubmitting ? { scale: 1.02 } : {}}
          whileTap={hasScrolled && !isSubmitting ? { scale: 0.98 } : {}}
          className={`w-full sm:w-auto min-w-[280px] py-3 px-8 rounded-full font-bold text-sm transition-all shadow-md ${
            hasScrolled && !isSubmitting
              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white cursor-pointer hover:shadow-blue-500/30"
              : "bg-[#A2B4C8] text-white cursor-not-allowed shadow-none"
          }`}
        >
          {isSubmitting ? "Accepting Terms…" : "Accept Agreement & Continue to Payment →"}
        </motion.button>
      </div>
    </motion.div>
  );
}
'''

out = "".join(lines[:return_start]) + render_block

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(out)

print("Rebuilt StageTerms.tsx")
