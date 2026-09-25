import os

filepath = r'd:\intern\creo\frontend\src\features\onboarding\StageComplete.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_lines(start, end):
    return "".join(lines[start:end])

# Header 215 to 222 is the old motion.div wrapper
header_rewrite = '''  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-[1400px] w-full mx-auto space-y-4 pb-12"
    >
      {/* Header Container */}
      <div className="rounded-2xl border border-[#C9DFF0] bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase tracking-widest mb-4">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Stage 5 Active • Creative Pod Allocated & Brief Dispatched
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-[#0D2137] tracking-tight mb-2">
            Your Dedicated Creative Pod is Live!
          </h2>
          <p className="text-sm text-[#64748B] max-w-2xl leading-relaxed">
            Your retainer is active, your Brand Strategy DNA is synthesized, and your dedicated
            production specialists have been briefed with your 30-day content calendar.
          </p>
        </div>
        <button
          type="button"
          onClick={onLaunchPortal}
          className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2B7BC4] hover:bg-[#1A5EA8] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
        >
          Go to Client Portal <ArrowRight className="size-4" />
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column (Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
'''

pod_card = get_lines(243, 293)
# It has <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 mb-7 text-left shadow-sm hover:shadow-md transition-shadow">
# Let's fix the mb-7
pod_card = pod_card.replace(' mb-7 ', ' ')

# Combine STRATEGIC (306 to 321) and AUDIENCE (411 to 446) into one card
strat_content = get_lines(306, 321)
# Remove the outer div styling of strat to embed it
strat_content = strat_content.replace('p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#F0F7FD] via-white to-[#F0F7FD] border border-[#C9DFF0]/80 shadow-2xs', '')

aud_content = get_lines(411, 446)
aud_content = aud_content.replace('rounded-xl bg-slate-50/70 border border-slate-200/80 p-4 sm:p-5', 'pt-4 mt-4 border-t border-slate-100')

combined_strat_aud = f'''
          {{/* Core Strategic Positioning & Audience */}}
          <div className="rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 shadow-sm">
            {strat_content}
            {aud_content}
          </div>
'''

pal_content = get_lines(528, 563)
pal_content = pal_content.replace('p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3', 'rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 shadow-sm space-y-3')

left_col_end = '        </div>\n\n        {/* Right Column (Span 8) */}\n        <div className="lg:col-span-8 flex flex-col gap-4">\n'

tone_card = get_lines(322, 410)
tone_card = tone_card.replace('rounded-xl bg-slate-50/70 border border-slate-200/80 p-4 sm:p-5', 'rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 shadow-sm')

pillars_card = get_lines(447, 525)
pillars_card = pillars_card.replace('rounded-xl bg-blue-50/30 border border-[#C9DFF0] p-4 sm:p-5', 'rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 shadow-sm')

formats_card = get_lines(564, 605)
formats_card = formats_card.replace('p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3', 'rounded-2xl border border-[#C9DFF0] bg-white p-5 sm:p-6 shadow-sm space-y-3')

right_col_end = '        </div>\n      </div>\n\n      {/* Footer Area */}\n'

footer_content = get_lines(607, 664)
# Remove the old individual mb-7 etc, group into a single block
footer_content = footer_content.replace('mb-7', '')
# Let's wrap footer content in a neat container
footer_wrapper = f'''
      <div className="flex flex-col gap-3 mt-2">
{footer_content}
      </div>
    </motion.div>
'''
footer_wrapper = footer_wrapper.replace('+3 business-day', '+1 business-day')

# Re-assemble
out = get_lines(0, 215) + header_rewrite + pod_card + combined_strat_aud + pal_content + left_col_end + tone_card + pillars_card + formats_card + right_col_end + footer_wrapper + get_lines(664, 668)

with open(r'd:\intern\creo\frontend\src\features\onboarding\StageComplete.tsx', 'w', encoding='utf-8') as f:
    f.write(out)

print("Rebuilt StageComplete.tsx")
