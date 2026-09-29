import re

FILE_PATH = "d:/intern/creo/frontend/src/pages/portal/PortalCalendarPage.tsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove duplicate calendarCells block starting at line 249
# Look for:
#  // Calendar cells for grid
#  const calendarCells = useMemo(() => {
#    ...
#  }, [firstDay, daysInMonth, currentYear, currentMonth]);
calendar_cells_match = re.search(r'  // Calendar cells for grid\n  const calendarCells = useMemo\(\(\) => \{.*?\}, \[firstDay, daysInMonth, currentYear, currentMonth\]\);\n', content, re.DOTALL)
if calendar_cells_match:
    content = content.replace(calendar_cells_match.group(0), '')
else:
    # Try another pattern just in case
    calendar_cells_match = re.search(r'  const calendarCells = useMemo\(\(\) => \{\n    const cells: \(number \| null\)\[\] = \[\];.*?\}, \[firstDay, daysInMonth, currentYear, currentMonth\]\);\n', content, re.DOTALL)
    if calendar_cells_match:
        content = content.replace(calendar_cells_match.group(0), '')

# 2. Fix 'cell' is possibly 'null' in the month grid
# Oh wait, my NEW calendarCells doesn't have nulls, but since I didn't delete the OLD calendarCells, TS was confused.
# Deleting the old one (above) should fix it.

# 3. Replace the toggle that I missed.
# The toggle in the file is currently:
toggle_old = '''          {/* Grid vs List View Mode */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "month"
                  ? "bg-white text-[#2B7BC4] shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="Month Grid View"
            >
              <Grid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-white text-[#2B7BC4] shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="List View"
            >
              <List className="size-4" />
            </button>
          </div>'''

toggle_new = '''          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setViewMode("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Grid className="size-3.5" />
              Month
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <List className="size-3.5" />
              List
            </button>
          </div>'''

if toggle_old in content:
    content = content.replace(toggle_old, toggle_new)

# 4. Remove unused imports and constants to pass TSC
content = content.replace("ChevronLeft,\n", "")
content = content.replace("ChevronRight,\n", "")

# The Month navigation is actually already above that toggle in a slightly different format (with ChevronLeft/Right).
# Wait, if ChevronLeft is used in the page (line 579: <ChevronLeft className="size-4" />) why does TS say it's never read?
# Ah! When I replaced the "Main Calendar Container" in `restore.py`, I replaced everything from `<div className="rounded-2xl border...` down!
# Let me look closely at what `restore.py` replaced.

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)
