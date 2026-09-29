import re

FILE_PATH = "d:/intern/creo/frontend/src/pages/portal/PortalCalendarPage.tsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update state definition
content = content.replace(
    'const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");',
    'const [viewMode, setViewMode] = useState<"month" | "list">("month");'
)

# 2. Remove weekOffset and weekDays
week_code_start = content.find('// === Weekly Time-Block View ===')
week_code_end = content.find('  const navigateMonth = (dir: number) => {')

if week_code_start != -1 and week_code_end != -1:
    content = content[:week_code_start] + content[week_code_end:]

# 3. Update navigation arrows and title
content = content.replace(
    'onClick={() => viewMode === "week" ? setWeekOffset(o => o - 1) : navigateMonth(-1)}',
    'onClick={() => navigateMonth(-1)}'
)
content = content.replace(
    'onClick={() => viewMode === "week" ? setWeekOffset(o => o + 1) : navigateMonth(1)}',
    'onClick={() => navigateMonth(1)}'
)
content = content.replace(
    '''{viewMode === "week"
                  ? `${MONTH_NAMES[weekDays[0]?.getMonth() ?? 0]} ${weekDays[0]?.getFullYear() ?? currentYear}`
                  : `${MONTH_NAMES[currentMonth]} ${currentYear}`}''',
    '''{`${MONTH_NAMES[currentMonth]} ${currentYear}`}'''
)

# 4. Remove setWeekOffset from Today button
content = content.replace(
    'onClick={() => { goToToday(); setWeekOffset(0); }}',
    'onClick={goToToday}'
)

# 5. Remove Week toggle button
week_toggle = '''            <button
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CalendarIcon className="size-3.5" />
              Week
            </button>'''
content = content.replace(week_toggle, '')

# 6. Remove the Week View block entirely
# Find the start of the block
start = content.find('{/* ═══ WEEKLY TIME-BLOCK VIEW ═══ */}')
if start != -1:
    # Find the end of the block which is right before the modal
    end = content.find('{/* ── Creative Intelligence Blueprint & Deliverable Review Modal ────── */}', start)
    if end != -1:
        # Also remove the </div> just before the modal that closes the flex container, wait, let's look at the structure.
        # The block is wrapped in `{viewMode === "week" && ( ... )}`
        # Let's just use regex to remove the block between start and end-6 (to keep the `</div>\n\n`)
        block_to_remove = content[start:end-7]
        content = content.replace(block_to_remove, '')

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Week view removed successfully.")
