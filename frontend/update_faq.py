import re

filepath = r'd:\creo-main\frontend\src\pages\public\FAQPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Pulsing Header Badge
old_badge = """        <div className="inline-flex items-center justify-center bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 rounded-full mb-6">
          ⚡ AGENCY OS KNOWLEDGE BASE
        </div>"""
new_badge = """        <div className="inline-flex items-center justify-center bg-[#161F2D] border border-[#2A3446] text-[#7FA0D6] text-[11px] font-bold px-3 py-1 rounded-full mb-6 gap-2">
          <div className="relative size-2 flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-30"></span>
            <span className="relative size-1.5 rounded-full bg-[#7FA0D6]"></span>
          </div>
          AGENCY OS KNOWLEDGE BASE
        </div>"""
content = content.replace(old_badge, new_badge)

# 2. Accordion Chevron & Active Row Motion
old_chevron = """                    <div className={`w-8 h-8 rounded-full border border-[#2A3446] flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-[#0A0F18] text-[#F8FAFC]' : 'text-[#97A0B3] hover:bg-[#0A0F18]'}`}>
                      {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </div>"""
new_chevron = """                    <div className={`w-8 h-8 rounded-full border border-[#2A3446] flex items-center justify-center shrink-0 transition-colors ${isOpen ? 'bg-[#0A0F18] text-[#F8FAFC]' : 'text-[#97A0B3] hover:bg-[#0A0F18]'}`}>
                      <ChevronDown className={`size-4 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`} />
                    </div>"""
content = content.replace(old_chevron, new_chevron)

old_row = """              <div 
                key={idx} 
                className={`bg-[#161F2D] border ${isOpen ? 'border-[#7FA0D6] shadow-[0_0_20px_rgba(127,160,214,0.05)]' : 'border-[#2A3446] hover:border-[#2A3446]/80'} rounded-2xl p-5 sm:p-6 transition-all`}
              >"""
new_row = """              <div 
                key={idx} 
                className={`bg-[#161F2D] border ${isOpen ? 'border-[#7FA0D6] shadow-[0_0_20px_rgba(127,160,214,0.05)] border-l-2 border-l-[#7FA0D6]' : 'border-[#2A3446] hover:border-[#2A3446]/80 border-l-2 border-l-transparent'} rounded-2xl p-5 sm:p-6 transition-all`}
              >"""
content = content.replace(old_row, new_row)

# 3. Support Card Telemetry Wave
old_support_icon = """            <div className="w-14 h-14 rounded-2xl bg-[#0A0F18] border border-[#2A3446] flex items-center justify-center text-[#7FA0D6] shrink-0 mx-auto sm:mx-0">
              <Headset className="size-6" />
            </div>"""
new_support_icon = """            <div className="px-4 h-14 rounded-2xl bg-[#0A0F18] border border-[#2A3446] flex items-center justify-center gap-3 text-[#7FA0D6] shrink-0 mx-auto sm:mx-0 relative">
              <Headset className="size-6" />
              <svg className="w-5 h-5 opacity-60 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>"""
content = content.replace(old_support_icon, new_support_icon)

# 4. Palette & Button Standards
old_button = """          <button className="bg-[#BCCCE6] hover:bg-white text-[#050810] font-bold text-xs sm:text-sm px-6 py-3.5 rounded-full shrink-0 transition flex items-center justify-center gap-2 w-full sm:w-auto">
            Speak with an OS Specialist <ArrowRight className="size-4" />
          </button>"""
new_button = """          <button className="bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] text-xs sm:text-sm px-6 py-3.5 rounded-full shrink-0 flex items-center justify-center gap-2 w-full sm:w-auto">
            Speak with an OS Specialist <ArrowRight className="size-4" />
          </button>"""
content = content.replace(old_button, new_button)

# Also fix the unused ChevronUp import by replacing it
content = content.replace("Globe, ShieldCheck, ChevronUp, ChevronDown,", "Globe, ShieldCheck, ChevronDown,")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
