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
# Since regex is tricky here, let's just find it by index.
start_idx = content.find('  // Calendar cells for grid\n  const calendarCells = useMemo(() => {\n    const cells: (number | null)[] = [];')
if start_idx != -1:
    end_idx = content.find('  }, [firstDay, daysInMonth, currentYear, currentMonth]);', start_idx)
    if end_idx != -1:
        end_idx += len('  }, [firstDay, daysInMonth, currentYear, currentMonth]);\n')
        content = content[:start_idx] + content[end_idx:]

# 2. Insert the Month Navigator and View Toggle at line 486 (before Format Filter Tabs)
target = '{/* Format Filter Tabs */}'
replacement = '''{/* Month / Week Navigator & Today */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-full shadow-xs px-2 py-1">
              <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer">
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-[13px] font-bold text-slate-900 px-3 min-w-[140px] text-center">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </span>
              <button onClick={() => navigateMonth(1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <button onClick={goToToday} className="px-4 py-1.5 text-[13px] font-bold bg-white border border-slate-200 rounded-full shadow-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              Today
            </button>
            <span className="text-[13px] font-semibold text-slate-400 hidden lg:block ml-2">
              {filteredEntries.length} items visible
            </span>
          </div>

          {/* View Toggle */}
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
          </div>

          {/* Format Filter Tabs */}'''
if "{/* Month / Week Navigator & Today */}" not in content:
    content = content.replace(target, replacement)

# 3. Remove the old toggle and format filter block that is currently stuck down at line 538
old_toggle_start = content.find('{/* Grid vs List View Mode */}')
if old_toggle_start != -1:
    old_toggle_end = content.find('</div>\n      </div>\n\n      {/* ── Main Calendar Container', old_toggle_start)
    if old_toggle_end != -1:
        content = content[:old_toggle_start] + content[old_toggle_end:]

# 4. Remove `selectedDayEntries` as it's not used anymore.
selected_day_match = re.search(r'  const selectedDayEntries = useMemo\(\(\) => \{.*?\}, \[filteredEntries, selectedDay\]\);\n', content, re.DOTALL)
if selected_day_match:
    content = content.replace(selected_day_match.group(0), '')

# 5. Make sure ChevronLeft/Right are imported. They were deleted by fix_calendar.py!
# We can just add them back.
imports = "import { useState, useMemo } from \"react\";\nimport { useQuery, useQueryClient } from \"@tanstack/react-query\";\nimport { Link } from \"react-router\";\nimport {\n  ChevronLeft,\n  ChevronRight,"
content = content.replace('import {\n  Calendar as CalendarIcon,', 'import {\n  ChevronLeft,\n  ChevronRight,\n  Calendar as CalendarIcon,')

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)
