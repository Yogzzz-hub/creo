FILE_PATH = "d:/intern/creo/frontend/src/pages/portal/PortalCalendarPage.tsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. Change default viewMode to "month" and add "week"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
content = content.replace(
    'const [viewMode, setViewMode] = useState<"month" | "list">("month");',
    'const [viewMode, setViewMode] = useState<"month" | "week" | "list">("month");'
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. Reduce HOUR_PX from 110 to 70 for compact weekly view
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
content = content.replace('const HOUR_PX = 110;', 'const HOUR_PX = 75;')

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. Re-add monthly grid helpers (daysInMonth, firstDay, etc.)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Add them right before the monthEntries useMemo
content = content.replace(
    '  // Filter entries by current month\n  const monthEntries',
    '''  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  // Calendar cells for month grid
  const calendarCells = useMemo(() => {
    const cells: { day: number; isCurrentMonth: boolean; key: string }[] = [];
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: daysInPrevMonth - firstDay + i + 1, isCurrentMonth: false, key: `prev-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, isCurrentMonth: true, key: `curr-${d}` });
    }
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ day: nextDay, isCurrentMonth: false, key: `next-${nextDay}` });
      nextDay++;
    }
    return cells;
  }, [firstDay, daysInMonth, currentYear, currentMonth]);

  const getDayEntries = (day: number) => {
    return filteredEntries.filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d.getDate() === day;
    });
  };

  // Filter entries by current month
  const monthEntries'''
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 4. Update navigation: month nav for month view, week nav for week view
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
content = content.replace(
    'viewMode === "month" ? setWeekOffset(o => o - 1) : navigateMonth(-1)',
    'viewMode === "week" ? setWeekOffset(o => o - 1) : navigateMonth(-1)'
)
content = content.replace(
    'viewMode === "month" ? setWeekOffset(o => o + 1) : navigateMonth(1)',
    'viewMode === "week" ? setWeekOffset(o => o + 1) : navigateMonth(1)'
)
content = content.replace(
    '''viewMode === "month"
                  ? `${MONTH_NAMES[weekDays[0]?.getMonth() ?? 0]} ${weekDays[0]?.getFullYear() ?? currentYear}`
                  : `${MONTH_NAMES[currentMonth]} ${currentYear}`''',
    '''viewMode === "week"
                  ? `${MONTH_NAMES[weekDays[0]?.getMonth() ?? 0]} ${weekDays[0]?.getFullYear() ?? currentYear}`
                  : `${MONTH_NAMES[currentMonth]} ${currentYear}`'''
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 5. Update view toggle to Month/Week/List
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
old_toggle = '''          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setViewMode("month")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "month" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Grid className="size-3.5" />
              Grid
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

new_toggle = '''          {/* View Toggle */}
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
              onClick={() => setViewMode("week")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "week" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CalendarIcon className="size-3.5" />
              Week
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

content = content.replace(old_toggle, new_toggle)

# Re-add Calendar import
content = content.replace(
    '''  ChevronLeft,
  ChevronRight,

  Clock,''',
    '''  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,'''
)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 6. Replace main content: list | month grid | week view
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Find the main content section
main_start = content.find('{/* 3. MAIN CONTENT */}')
main_end = content.find('{/* \u2500\u2500 Creative Intelligence Blueprint')

if main_start == -1 or main_end == -1:
    print(f"ERROR: markers not found. start={main_start}, end={main_end}")
    exit(1)

WEEKDAYS_MONTH = '["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]'

new_main = r'''{/* 3. MAIN CONTENT */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden flex flex-col relative z-10">
        
        {/* ═══ LIST VIEW ═══ */}
        {viewMode === "list" && (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white sticky top-0 z-10 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Asset & Type</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Scheduled Date & Time</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest min-w-[280px]">Hook Concept & Strategic Angle</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Approval Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">
                      No deliverables found for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const config = getTypeConfig(entry.type);
                    const Icon = config.icon;
                    const isApproved = entry.status === "approved" || entry.concept_status === "concept_approved";
                    const isFlex = entry.slot_strategy === "flex" || entry.slot_strategy === "swapped";
                    const isUnlockedFlex = isFlex && entry.concept_status !== "concept_approved" && entry.concept_status !== "concept_pending";

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-100 ${
                              entry.type === "reel" ? "bg-[#F3E8FF] text-[#6B21A8]" :
                              entry.type === "story" ? "bg-[#FEF3C7] text-[#B45309]" :
                              "bg-[#E0F2FE] text-[#0369A1]"
                            }`}>
                              <Icon className="size-3.5" />
                              {config.label}
                            </span>
                            {isFlex && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FDF0D5] text-[#D97706] uppercase tracking-wider">
                                <Zap className="size-3" />
                                Flex
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
                            <Clock className="size-3.5 text-slate-400" />
                            {entry.date} · {entry.scheduled_time || "07:00 AM"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <h4 className="text-[13px] font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors truncate max-w-[400px]">
                            {entry.topic}
                          </h4>
                          {entry.blueprint?.premise && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[400px]">{entry.blueprint.premise}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F8F3] text-[#059669] border border-[#A7F3D0]">
                              <CheckCircle2 className="size-3.5" /> Approved
                            </span>
                          ) : isUnlockedFlex ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                              Unlocked Slot
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                              Concept Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button 
                            onClick={() => openEntryModal(entry)}
                            className="inline-flex items-center gap-1 text-[13px] font-bold text-[#0052FF] hover:text-[#1A5EA8] hover:underline cursor-pointer"
                          >
                            {isApproved ? "View" : "Inspect"} <ExternalLink className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ═══ MONTH GRID VIEW ═══ */}
        {viewMode === "month" && (
          <div className="flex flex-col flex-1">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {''' + WEEKDAYS_MONTH + r'''.map((day: string) => (
                <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {calendarCells.map((cell) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div key={cell.key} className="border-r border-b border-slate-100 bg-slate-50/20 p-2 sm:p-3 min-h-[100px]">
                      <span className="text-[13px] font-semibold text-slate-300">{cell.day}</span>
                    </div>
                  );
                }

                const day = cell.day;
                const dayEntries = getDayEntries(day);
                const isTodayCell = isCurrentMonth && today.getDate() === day;
                const isLockDay = day <= 7;

                return (
                  <div
                    key={cell.key}
                    className={`relative border-r border-b border-slate-100 p-2 sm:p-3 transition-colors min-h-[100px] ${
                      isTodayCell ? "ring-2 ring-inset ring-[#0052FF]/40 bg-[#F0F7FD]/40"
                        : isLockDay ? "bg-slate-50/40"
                        : "bg-white hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[13px] leading-none ${
                        isTodayCell
                          ? "size-7 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold shadow-sm"
                          : "font-semibold text-slate-600"
                      }`}>
                        {day}
                      </span>
                      {isTodayCell && <span className="text-[9px] font-bold text-[#0052FF] uppercase tracking-wider">TODAY</span>}
                      {isLockDay && !isTodayCell && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">LOCK</span>}
                      {!isLockDay && !isTodayCell && dayEntries.length > 0 && (
                        <span className="text-[9px] font-semibold text-slate-400">{dayEntries.length}</span>
                      )}
                    </div>

                    {/* Lock phase labels */}
                    {isLockDay && !isTodayCell && day === 1 && <span className="absolute bottom-1 left-2 text-[9px] text-slate-400 italic">Strategy warmup</span>}
                    {isLockDay && !isTodayCell && day === 7 && <span className="absolute bottom-1 left-2 text-[9px] text-[#0052FF] font-bold italic">FINAL DAY</span>}
                    {isTodayCell && dayEntries.length === 0 && <span className="absolute bottom-1 left-2 text-[9px] text-[#0052FF] italic">Pipeline active</span>}

                    {/* Deliverable Badges */}
                    <div className="space-y-1 mt-0.5">
                      {dayEntries.slice(0, 2).map((entry) => {
                        const config = getTypeConfig(entry.type);
                        const isFlex = entry.slot_strategy === "flex" || entry.slot_strategy === "swapped";
                        return (
                          <div
                            key={entry.id}
                            onClick={() => openEntryModal(entry)}
                            className={`w-full rounded-md px-2 py-0.5 text-left text-[10px] font-bold flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${
                              entry.type === "reel" ? "bg-[#F3E8FF] text-[#7C3AED]" :
                              entry.type === "story" ? "bg-[#FEF3C7] text-[#B45309]" :
                              "bg-[#DBEAFE] text-[#1D4ED8]"
                            }`}
                          >
                            <div className="flex items-center gap-1 overflow-hidden">
                              <config.icon className="size-3 shrink-0" />
                              <span className="truncate">{config.label}</span>
                            </div>
                            {isFlex && <span className="text-[7px] bg-[#FCD34D] text-[#92400E] px-1 rounded-sm uppercase font-extrabold">FLEX</span>}
                          </div>
                        );
                      })}
                      {dayEntries.length > 2 && (
                        <div className="text-[9px] font-semibold text-slate-400 cursor-pointer hover:text-slate-600">
                          +{dayEntries.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ WEEKLY TIME-BLOCK VIEW ═══ */}
        {viewMode === "week" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Day Column Headers */}
            <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-slate-200/60 bg-white">
              <div className="p-2 border-r border-slate-100" />
              {weekDays.map((date, i) => {
                const isTodayCol = date.toDateString() === today.toDateString();
                const dayNum = date.getDate();
                const isLockDay = dayNum <= 7;
                return (
                  <div key={i} className={`px-2 py-3 text-center border-r border-slate-100 last:border-r-0 ${isTodayCol ? "bg-[#F0F7FD]/50" : ""}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{WEEK_DAY_LABELS[i]}</span>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      {isLockDay && <span className="text-[8px] font-bold text-slate-400 uppercase">LOCK</span>}
                      <span className={`text-[14px] leading-none ${
                        isTodayCol
                          ? "size-7 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold shadow-sm"
                          : "font-semibold text-slate-700"
                      }`}>{dayNum}</span>
                      {isTodayCol && <span className="text-[8px] font-bold text-[#0052FF] uppercase">TODAY</span>}
                      {dayNum === 7 && !isTodayCol && <span className="text-[8px] font-bold text-[#0052FF] uppercase">FINAL</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Grid Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="grid grid-cols-[56px_repeat(7,1fr)] relative" style={{ minHeight: `${TIME_HOURS.length * HOUR_PX}px` }}>
                {/* Time Labels */}
                <div className="relative border-r border-slate-100">
                  {TIME_HOURS.map((hour, idx) => (
                    <div key={hour} className="absolute left-0 right-0 flex items-start justify-end pr-2 pt-1 border-b border-slate-100" style={{ top: `${idx * HOUR_PX}px`, height: `${HOUR_PX}px` }}>
                      <span className="text-[10px] font-semibold text-slate-400 tabular-nums">{String(hour).padStart(2, "0")}:00</span>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDays.map((date, dayIdx) => {
                  const dayEntries = getWeekDayFilteredEntries(date);
                  const isTodayCol = date.toDateString() === today.toDateString();

                  return (
                    <div key={dayIdx} className={`relative border-r border-slate-100 last:border-r-0 ${isTodayCol ? "bg-[#EFF6FF]/30" : ""}`}>
                      {TIME_HOURS.map((hour, idx) => (
                        <div key={hour} className="absolute left-0 right-0 border-b border-slate-100" style={{ top: `${idx * HOUR_PX}px`, height: `${HOUR_PX}px` }} />
                      ))}
                      {isTodayCol && <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#0052FF] rounded-full z-20" />}

                      {/* Event Cards — no avatar circles */}
                      {dayEntries.map((entry) => {
                        const startH = parseTimeToHours(entry.scheduled_time);
                        const duration = entry.type === "reel" ? 1.8 : entry.type === "story" ? 1.2 : 1.5;
                        const topPx = Math.max(0, (startH - 7) * HOUR_PX);
                        const heightPx = duration * HOUR_PX;
                        const style = getWeekCardStyle(entry);

                        return (
                          <div
                            key={entry.id}
                            onClick={() => openEntryModal(entry)}
                            className={`absolute left-1 right-1 rounded-xl p-2.5 cursor-pointer transition-all duration-200 hover:scale-[1.015] hover:shadow-lg hover:z-30 overflow-hidden ${style.bg}`}
                            style={{ top: `${topPx}px`, height: `${Math.max(60, heightPx)}px` }}
                          >
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${style.badge} shadow-xs`}>
                              {style.label}
                            </span>
                            <p className="text-[10px] font-semibold text-slate-800 leading-snug mt-1 line-clamp-2">{entry.topic}</p>
                            <p className="text-[9px] font-medium text-slate-500 mt-0.5">{entry.scheduled_time || "7:00 AM"}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      '''

content = content[:main_start] + new_main + content[main_end:]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 7. Fix the modal — proper alignment, rounded, clean
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
content = content.replace(
    'className="w-full max-w-2xl max-h-[92vh] card-surface card-interactive shadow-2xl overflow-y-auto animate-page-in my-auto"',
    'className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-y-auto animate-page-in my-auto border border-slate-100"'
)

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Calendar updated: Month/Week/List views, removed circles, fixed modal.")
