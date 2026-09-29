import re

with open(r'd:\intern\creo\frontend\src\components\portal\CreoTopNavbar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update Nav Links hover
content = content.replace(
    '"text-slate-500 hover:text-slate-900 hover:bg-slate-100"',
    '"text-slate-500 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:-translate-y-0.5 active:translate-y-0 transition-all"'
)
content = content.replace(
    'bg-white text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
    'bg-white text-[#0D2137] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
)

# Update Logo hover
content = content.replace(
    'hover:opacity-80 transition-opacity',
    'hover:scale-105 hover:drop-shadow-sm transition-all'
)

# Update Notification Button
content = content.replace(
    'className="w-10 h-10 rounded-full border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition relative"',
    'className="w-10 h-10 rounded-full border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:border-[#0052FF]/30 hover:scale-105 active:scale-95 transition-all relative shadow-xs"'
)

# Update Settings Button
content = content.replace(
    'className="w-10 h-10 hidden xl:flex items-center justify-center text-slate-400 hover:text-slate-900 transition"',
    'className="w-10 h-10 hidden xl:flex items-center justify-center text-slate-400 hover:text-[#0052FF] hover:bg-[#EBF3FF] hover:scale-105 active:scale-95 rounded-full transition-all"'
)

# Update User Avatar
content = content.replace(
    'className="w-10 h-10 rounded-full bg-[#0052FF] text-white font-bold flex items-center justify-center text-sm shadow-sm hover:opacity-90 transition-opacity block"',
    'className="w-10 h-10 rounded-full bg-[#0052FF] text-white font-bold flex items-center justify-center text-sm shadow-sm hover:scale-105 hover:shadow-md hover:ring-2 hover:ring-[#0052FF]/30 active:scale-95 transition-all block"'
)

with open(r'd:\intern\creo\frontend\src\components\portal\CreoTopNavbar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Hover effects updated.")
