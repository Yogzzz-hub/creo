import re

# Remove footer from PortalPaymentsPage
with open(r'd:\intern\creo\frontend\src\pages\portal\PortalPaymentsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the footer section
pattern = r'\s*\{\/\* ── Footer ──.*?\}\n\s*<div className="pt-6 border-t border-slate-200\/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">[\s\S]*?<\/div>\s*'
content = re.sub(pattern, '\n', content)

with open(r'd:\intern\creo\frontend\src\pages\portal\PortalPaymentsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

# Remove footer from PortalDeliverablesPage
with open(r'd:\intern\creo\frontend\src\pages\portal\PortalDeliverablesPage.tsx', 'r', encoding='utf-8') as f:
    content2 = f.read()

content2 = re.sub(pattern, '\n', content2)

with open(r'd:\intern\creo\frontend\src\pages\portal\PortalDeliverablesPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content2)

# Now fix the calendar header controls to match the image in PortalCalendarPage.tsx
with open(r'd:\intern\creo\frontend\src\pages\portal\PortalCalendarPage.tsx', 'r', encoding='utf-8') as f:
    content3 = f.read()

old_calendar_controls = """            <div className="flex items-center gap-3">
              <div className="flex items-center bg-[#F8F9FC] border border-slate-100/60 rounded-full px-1.5 py-1.5 shadow-inner">
                <button onClick={() => { setSelectedDate(null); navigateMonth(-1); }} className="p-1 hover:bg-white rounded-full text-slate-500 hover:shadow-sm transition-all cursor-pointer">
                  <ChevronLeft className="size-4" />
                </button>
                <button onClick={() => { setSelectedDate(null); goToToday(); }} className="px-3 py-1 text-[12px] font-bold text-slate-700 hover:text-[#0052FF] transition-colors cursor-pointer">
                  Today
                </button>
                <button onClick={() => { setSelectedDate(null); navigateMonth(1); }} className="p-1 hover:bg-white rounded-full text-slate-500 hover:shadow-sm transition-all cursor-pointer">
                  <ChevronRight className="size-4" />
                </button>
              </div>
              {isCurrentMonth && (
                <span className="inline-flex items-center rounded-full bg-[#F4F8FF] px-4 py-2 text-[12px] font-bold text-[#0052FF] shadow-sm border border-blue-100/50">
                  {today.getDate()}th Today
                </span>
              )}
            </div>"""

new_calendar_controls = """            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white border border-slate-100/60 rounded-full px-1.5 py-1 shadow-sm">
                <button onClick={() => { setSelectedDate(null); navigateMonth(-1); }} className="p-1 text-slate-500 hover:text-[#0052FF] transition-all cursor-pointer">
                  <ChevronLeft className="size-3.5" strokeWidth={2.5} />
                </button>
                <button onClick={() => { setSelectedDate(null); goToToday(); }} className="px-3 py-1 text-[13px] font-bold text-[#0D2137] hover:text-[#0052FF] transition-colors cursor-pointer">
                  Today
                </button>
                <button onClick={() => { setSelectedDate(null); navigateMonth(1); }} className="p-1 text-slate-500 hover:text-[#0052FF] transition-all cursor-pointer">
                  <ChevronRight className="size-3.5" strokeWidth={2.5} />
                </button>
              </div>
              {isCurrentMonth && (
                <button onClick={() => setSelectedDate(today.getDate())} className="inline-flex items-center rounded-full bg-white px-4 py-2 text-[13px] font-bold text-[#0052FF] shadow-sm border border-blue-100/50 hover:bg-[#F4F8FF] transition-colors cursor-pointer">
                  {today.getDate()}th Today
                </button>
              )}
            </div>"""

content3 = content3.replace(old_calendar_controls, new_calendar_controls)

# Fix calendar layout padding/margins to match dashboard
# Dashboard uses: className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8"
old_calendar_layout = """    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-10">"""
new_calendar_layout = """    <div className="flex flex-col gap-6 w-full max-w-[1440px] mx-auto px-4 md:px-8 pb-10">"""
content3 = content3.replace(old_calendar_layout, new_calendar_layout)

with open(r'd:\intern\creo\frontend\src\pages\portal\PortalCalendarPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content3)

print("Updates applied successfully.")
