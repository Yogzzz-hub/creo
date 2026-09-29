import re

filepath = r'd:\creo-main\frontend\src\pages\public\AboutPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Architecture Blueprint Terminal Header Dot
old_header_dot = """              <div className="text-[#7FA0D6] text-xs font-semibold flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#7FA0D6] animate-pulse"></span> System Status: Autonomous Ops
              </div>"""

new_header_dot = """              <div className="text-[#7FA0D6] text-xs font-semibold flex items-center gap-2">
                <div className="relative size-2 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-30"></span>
                  <span className="relative size-1.5 rounded-full bg-[#7FA0D6]"></span>
                </div>
                System Status: Autonomous Ops
              </div>"""

content = content.replace(old_header_dot, new_header_dot)

# 2. Hero Telemetry Row pulsing node accent
old_hero_pod1 = """              <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center">
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1.5">48h</div>"""

new_hero_pod1 = """              <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center relative">
                <div className="absolute top-4 right-4 size-1.5 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-40"></span>
                  <span className="relative size-1.5 rounded-full bg-[#7FA0D6]"></span>
                </div>
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1.5">48h</div>"""

old_hero_pod2 = """              <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center">
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1.5">99.4%</div>"""

new_hero_pod2 = """              <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center relative">
                <div className="absolute top-4 right-4 size-1.5 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-40"></span>
                  <span className="relative size-1.5 rounded-full bg-[#7FA0D6]"></span>
                </div>
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1.5">99.4%</div>"""

old_hero_pod3 = """              <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center">
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1.5">1-Click</div>"""

new_hero_pod3 = """              <div className="backdrop-blur-md bg-[#161F2D]/40 border border-[#2A3446]/40 rounded-xl px-6 py-4 flex flex-col justify-center relative">
                <div className="absolute top-4 right-4 size-1.5 flex items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-[#7FA0D6] animate-ping opacity-40"></span>
                  <span className="relative size-1.5 rounded-full bg-[#7FA0D6]"></span>
                </div>
                <div className="text-2xl font-black text-[#F8FAFC] leading-none mb-1.5">1-Click</div>"""

content = content.replace(old_hero_pod1, new_hero_pod1)
content = content.replace(old_hero_pod2, new_hero_pod2)
content = content.replace(old_hero_pod3, new_hero_pod3)

# 3. The CREO Advantage Card line graph / checkmarks
# Replace checkmarks with custom SVG
old_checkmark = """<CheckCircle2 className="size-5 text-[#7FA0D6] shrink-0 mt-0.5" />"""
new_checkmark = """<svg className="size-5 text-[#7FA0D6] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="animate-[dash_1s_ease-out_forwards]" strokeDasharray="60" strokeDashoffset="0" /></svg>"""
content = content.replace(old_checkmark, new_checkmark)

# Replace line graph
old_line_graph = """                  <path d="M0,35 L10,32 L20,34 L30,28 L40,30 L50,22 L60,25 L70,18 L80,20 L90,10 L100,5" fill="none" stroke="#7FA0D6" strokeWidth="2" />"""
new_line_graph = """                  <path d="M0,35 L10,32 L20,34 L30,28 L40,30 L50,22 L60,25 L70,18 L80,20 L90,10 L100,5" fill="none" stroke="#7FA0D6" strokeWidth="2" className="animate-[dash_1.5s_ease-out_forwards]" strokeDasharray="150" strokeDashoffset="0" />"""
content = content.replace(old_line_graph, new_line_graph)

# Also update the donut chart stroke to have animation
old_donut = """<path className="text-[#7FA0D6]" strokeWidth="4" strokeDasharray="41.25, 100" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />"""
new_donut = """<path className="text-[#7FA0D6] animate-[dash_1.5s_ease-out_forwards]" strokeWidth="4" strokeDasharray="41.25, 100" strokeDashoffset="0" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />"""
content = content.replace(old_donut, new_donut)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
