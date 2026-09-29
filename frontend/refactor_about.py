import re

filepath = 'src/pages/public/AboutPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Hero Metrics Snippet
old_metrics = """            {/* 4 Stat Pods */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><Building className="size-5" /></div>
                <div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">50+</div>
                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">Agencies <br/>Operating Live</div>
              </div>
              <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><TrendingUp className="size-5" /></div>
                <div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">₹4.8Cr+</div>
                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">Deliverables <br/>Tracked</div>
              </div>
              <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><Percent className="size-5" /></div>
                <div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">41.25%</div>
                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">Avg. Contribution <br/>Margin</div>
              </div>
              <div className="bg-[#161F2D] border border-[#2A3446] rounded-xl p-4 flex flex-col justify-center">
                <div className="text-[#97A0B3] mb-2"><MessageSquare className="size-5" /></div>
                <div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">0</div>
                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">WhatsApp <br/>Revision Delays</div>
              </div>
            </div>"""

new_metrics = """            {/* 3 Stat Pods */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center">
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1.5">48h</div>
                <div className="text-xs text-[#97A0B3] uppercase tracking-wider font-semibold">Average SLA Turnaround</div>
              </div>
              <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center">
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1.5">99.4%</div>
                <div className="text-xs text-[#97A0B3] uppercase tracking-wider font-semibold">On-Time Delivery Rate</div>
              </div>
              <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center">
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1.5">1-Click</div>
                <div className="text-xs text-[#97A0B3] uppercase tracking-wider font-semibold">Frictionless Sign-Off</div>
              </div>
            </div>"""

content = content.replace(old_metrics, new_metrics)

# 2. Left card (Chaos) - Remove red
content = content.replace('text-red-500', 'text-[#D8BF9B]')
content = content.replace('border-red-500/50 shadow-[0_0_20px_-10px_rgba(239,68,68,0.3)]', 'border-[#D8BF9B]/30 shadow-[0_0_20px_-10px_rgba(216,191,155,0.1)]')
content = content.replace('border-red-500/20', 'border-[#D8BF9B]/20')
content = content.replace('bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow', 'bg-[#D8BF9B]/10 border border-[#D8BF9B]/20 text-[#D8BF9B] rounded-full flex items-center justify-center text-[10px] font-bold shadow')
content = content.replace('size-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 shadow-sm text-white text-xs font-bold', 'size-5 rounded-full bg-[#D8BF9B]/10 border border-[#D8BF9B]/20 flex items-center justify-center shrink-0 shadow-sm text-[#D8BF9B] text-xs font-bold')

# Left card - Remove harsh icons
content = content.replace('bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366]', 'bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3]')
content = content.replace('bg-[#0F9D58]/20 border border-[#0F9D58]/40 text-[#0F9D58]', 'bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3]')
content = content.replace('bg-[#4285F4]/20 border border-[#4285F4]/40 text-[#4285F4]', 'bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3]')
content = content.replace('bg-[#FFFFFF]/10 border border-white/20 text-white font-serif font-bold text-lg', 'bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3] font-serif font-bold text-lg')

# Right card - Glow Blue 
content = content.replace('text-cyan-400', 'text-[#7FA0D6]')
content = content.replace('#22d3ee', '#7FA0D6')

# 3. Polish Layout & Spacing
content = content.replace('py-20 lg:py-24', 'py-24 lg:py-32')

# General card styling updates
content = content.replace('bg-[#161F2D] border border-[#2A3446] rounded-3xl', 'backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/40 rounded-3xl')
content = content.replace('bg-[#161F2D] border border-[#2A3446] rounded-2xl p-6 shadow-2xl', 'backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/40 rounded-2xl p-6 shadow-2xl')

# Right Card in "Why CREO Exists"
content = content.replace('hoverSection === \'creo\' ? \'border-[#7FA0D6]/60 shadow-[0_0_40px_-15px_rgba(127,160,214,0.3)]\' : \'border-[#7FA0D6]/30 shadow-[0_0_40px_-15px_rgba(127,160,214,0.1)]\'', 
                          'hoverSection === \'creo\' ? \'border-[#7FA0D6]/60 shadow-[0_0_40px_-15px_rgba(127,160,214,0.3)]\' : \'border-[#2A3446]/50 shadow-[0_0_40px_-15px_rgba(127,160,214,0.05)]\'')


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
