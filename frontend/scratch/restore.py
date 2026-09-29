import re

FILE_PATH = "d:/intern/creo/frontend/src/pages/portal/PortalCalendarPage.tsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Main Calendar Container entirely
main_start = content.find('{/* ── Main Calendar Container ──────────────────────────────────────── */}')
main_end = content.find('{/* \u2500\u2500 Creative Intelligence Blueprint & Deliverable Review Modal')

if main_start == -1 or main_end == -1:
    print(f"Error finding markers. start={main_start}, end={main_end}")
    exit(1)

new_main = r'''{/* ── Main Calendar Container ──────────────────────────────────────── */}
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
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day: string) => (
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
                    <div key={cell.key} className="border-r border-b border-slate-100 bg-slate-50/20 p-2 sm:p-3 min-h-[140px] overflow-hidden">
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
                    className={`relative border-r border-b border-slate-100 p-2 sm:p-3 transition-colors min-h-[140px] overflow-hidden ${
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
      </div>

      '''

content = content[:main_start] + new_main + content[main_end:]

# Re-apply the daysInMonth, calendarCells logic above the monthEntries useMemo
# Wait, let's find `const monthEntries` and add calendarCells if missing.
if "const calendarCells = useMemo" not in content:
    month_entries_start = content.find('  const monthEntries = useMemo(() => {')
    helper_code = '''  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
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

'''
    content = content[:month_entries_start] + helper_code + content[month_entries_start:]

# Replace the outer container height
content = content.replace(
    '<div className="flex flex-col h-[calc(100vh-104px)] max-w-[1440px] mx-auto px-4 md:px-8 w-full animate-page-in space-y-6 pb-6">',
    '<div className="flex flex-col min-h-[calc(100vh-104px)] max-w-[1440px] mx-auto px-4 md:px-8 w-full animate-page-in space-y-6 pb-6">'
)

# Update Modal alignment and styling
content = content.replace(
    'className="w-full max-w-2xl max-h-[92vh] card-surface card-interactive shadow-2xl overflow-y-auto animate-page-in my-auto"',
    'className="w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-y-auto animate-page-in my-auto border border-slate-100"'
)

# Replace the toggle to ONLY have Month and List (and ensure it looks exactly like the one the user liked)
toggle_old = '''          {/* Month / Week Navigator & Today */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white shadow-xs">
              <button
                type="button"
                onClick={() => navigateMonth(-1)}
                className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors rounded-l-xl cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="h-4 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => navigateMonth(1)}
                className="p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors rounded-r-xl cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#0D2137]">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Today
            </button>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              {filteredEntries.length} items visible
            </span>
          </div>
'''
toggle_new = '''          {/* Month / Week Navigator & Today */}
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
'''
if "Month / Week Navigator & Today" in content:
    content = content.replace(toggle_old, toggle_new)

# Clean up any leftover top level div wrappers
content = content.replace(
    '<div className="flex flex-col h-[calc(100vh-104px)] max-w-[1440px] mx-auto px-4 md:px-8 w-full animate-page-in space-y-6 pb-6">',
    '<div className="flex flex-col min-h-[calc(100vh-104px)] max-w-[1440px] mx-auto px-4 md:px-8 w-full animate-page-in space-y-6 pb-6">'
)

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Restored.")
