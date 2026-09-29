import re

filepath = r'd:\creo-main\frontend\src\pages\public\ClientsPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Spacing updates
content = content.replace('py-24 lg:py-32', 'py-28 lg:py-36')
content = content.replace('py-24 border-t', 'py-28 lg:py-36 border-t')

# Pipeline Activity Pulse
old_activity = """            <div className="mt-8 pt-4 border-t border-[#2A3446]/50 flex items-center gap-3">
               <Activity className="size-4 text-[#97A0B3]" />
               <div>
                 <div className="text-[10px] font-bold text-[#F8FAFC]">Pipeline healthy</div>
                 <div className="text-[10px] text-[#97A0B3]">All systems operational</div>
               </div>
            </div>"""

new_activity = """            <div className="mt-8 pt-4 border-t border-[#2A3446]/50 flex items-center gap-3">
               <div className="relative size-4 flex items-center justify-center">
                 <Activity className="size-4 text-[#7FA0D6] relative z-10" />
                 <div className="absolute inset-0 bg-[#7FA0D6] rounded-full animate-ping opacity-20"></div>
               </div>
               <div>
                 <div className="text-[10px] font-bold text-[#F8FAFC]">Pipeline healthy</div>
                 <div className="text-[10px] text-[#97A0B3]">All systems operational</div>
               </div>
            </div>"""

content = content.replace(old_activity, new_activity)

# Video Scrub & Annotation Pin Wave
old_pin = """              <div className="absolute top-1/2 left-1/3">
                 <div className="relative">
                   <div className="size-6 rounded-full bg-[#0A0F18] border-2 border-[#D8BF9B] flex items-center justify-center text-[10px] font-bold text-[#F8FAFC] shadow-lg absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer">
                     1
                   </div>
                   <div className="absolute top-4 left-4 bg-[#161F2D]/90 backdrop-blur-md border border-[#2A3446] p-3 rounded-xl shadow-2xl w-48 z-20">"""

new_pin = """              <div className="absolute top-1/2 left-1/3">
                 <div className="relative">
                   <div className="size-6 rounded-full bg-[#0A0F18] border-2 border-[#7FA0D6] flex items-center justify-center text-[10px] font-bold text-[#F8FAFC] shadow-lg absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer">
                     1
                     <div className="absolute inset-0 rounded-full border-2 border-[#7FA0D6] animate-ping opacity-30"></div>
                   </div>
                   <div className="absolute top-4 left-4 backdrop-blur-md bg-[#161F2D]/90 border border-[#2A3446]/50 p-3 rounded-xl shadow-2xl w-48 z-20">"""

content = content.replace(old_pin, new_pin)

# Creative Workflows Card Padding & Glassmorphism
old_workflow_card = """          ].map(card => (
            <div key={card.title} className="bg-[#161F2D]/60 backdrop-blur-md border border-[#2A3446]/50 rounded-2xl p-4 group cursor-pointer hover:border-[#7FA0D6]/40 transition-colors flex flex-col">"""

new_workflow_card = """          ].map(card => (
            <div key={card.title} className="backdrop-blur-md bg-[#161F2D]/60 border border-[#2A3446]/50 rounded-2xl p-6 sm:p-8 group cursor-pointer hover:border-[#7FA0D6]/40 transition-colors flex flex-col">"""

content = content.replace(old_workflow_card, new_workflow_card)

# Checkmark Draw/Ease and glassmorphism inner insets (Related Assets, inner Magic Link Box)
content = content.replace('bg-[#0A0F18] border border-[#2A3446]/50 rounded-xl', 'bg-[#0A0F18]/80 border border-[#2A3446]/40 rounded-xl')
content = content.replace('bg-[#0A0F18] border border-[#2A3446] text-[#97A0B3] text-[10px] font-mono px-3 py-2 rounded-lg', 'bg-[#0A0F18]/80 border border-[#2A3446]/40 text-[#97A0B3] text-[10px] font-mono px-3 py-2 rounded-xl')

# Approve All Checkmark
old_approve_btn = """            <div className="flex justify-end mt-2">
              <button className="bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-bold text-xs px-6 py-3 rounded-full flex items-center gap-2 transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)]">
                Approve All <ChevronRight className="size-4" />
              </button>
            </div>"""

new_approve_btn = """            <div className="flex justify-end mt-2">
              <button className="bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-bold text-xs px-6 py-3 rounded-full flex items-center gap-2 transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] group">
                Approve All <svg className="size-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-[dash_0.5s_ease-out_forwards]" strokeDasharray="24" strokeDashoffset="0" /></svg>
              </button>
            </div>"""

content = content.replace(old_approve_btn, new_approve_btn)

# Ensure Magic link icon box gets inner inset styling
content = content.replace('size-10 rounded-full bg-[#0A0F18] border border-[#2A3446]', 'size-10 rounded-full bg-[#0A0F18]/80 border border-[#2A3446]/40')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
