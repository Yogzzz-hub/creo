import re

FILE_PATH = "d:/intern/creo/frontend/src/pages/portal/PortalCalendarPage.tsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace calendarCells useMemo
old_cells = """  const calendarCells = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstDay, daysInMonth]);"""

new_cells = """  const calendarCells = useMemo(() => {
    const cells: { day: number; isCurrentMonth: boolean; key: string }[] = [];
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: daysInPrevMonth - firstDay + i + 1, isCurrentMonth: false, key: `prev-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, isCurrentMonth: true, key: `curr-${d}` });
    }
    let nextMonthDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ day: nextMonthDay, isCurrentMonth: false, key: `next-${nextMonthDay}` });
      nextMonthDay++;
    }
    return cells;
  }, [firstDay, daysInMonth, currentYear, currentMonth]);"""

content = content.replace(old_cells, new_cells)

# Now, we need to replace the entire GRID VIEW section in the JSX.
# It starts at /* --- GRID VIEW --- */ and ends at {/* ── Creative Intelligence Blueprint & Deliverable Review Modal ────── */}

grid_start_marker = "{/* --- GRID VIEW --- */}"
grid_end_marker = "{/* ── Creative Intelligence Blueprint & Deliverable Review Modal ────── */}"

start_idx = content.find(grid_start_marker)
end_idx = content.find(grid_end_marker)

if start_idx != -1 and end_idx != -1:
    new_grid_jsx = """{/* --- GRID VIEW --- */}
          <div className="flex flex-col flex-1 bg-white rounded-b-3xl">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
              {calendarCells.map((cell, index) => {
                if (!cell.isCurrentMonth) {
                  return (
                    <div key={cell.key} className="border-r border-b border-slate-100 bg-slate-50/20 p-2 sm:p-3 min-h-[120px]">
                      <span className="text-[13px] font-semibold text-slate-300">{cell.day}</span>
                    </div>
                  );
                }

                const day = cell.day;
                const dayEntries = getDayEntries(day);
                const isToday = isCurrentMonth && today.getDate() === day;
                const isLockDay = day <= 7;
                
                return (
                  <div 
                    key={cell.key} 
                    className={`relative border-r border-b border-slate-100 p-2 sm:p-3 transition-colors min-h-[120px] ${
                      isLockDay ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#f8fafc_10px,#f8fafc_20px)]" : "bg-white hover:bg-slate-50/50"
                    } ${isToday ? "ring-2 ring-inset ring-[#0052FF] rounded-lg z-10 shadow-sm" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[13px] font-semibold ${isToday ? "size-6 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold shadow-xs" : "text-slate-600"}`}>
                        {day}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold text-[#0052FF] uppercase tracking-wider">
                          TODAY
                        </span>
                      )}
                      {isLockDay && !isToday && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          LOCK
                        </span>
                      )}
                      {!isLockDay && !isToday && dayEntries.length > 0 && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          {dayEntries.length} {dayEntries.length === 1 ? 'item' : 'items'}
                        </span>
                      )}
                    </div>
                    
                    {/* Strategy Warmup Labels for days 1-7 */}
                    {day === 1 && <span className="absolute bottom-2 left-3 text-[10px] font-medium text-slate-400 italic">Strategy warmup</span>}
                    {day === 2 && <span className="absolute bottom-2 left-3 text-[10px] font-medium text-slate-400 italic">Hook ideation</span>}
                    {day === 3 && <span className="absolute bottom-2 left-3 text-[10px] font-medium text-slate-400 italic">Brief assembly</span>}
                    {day === 4 && <span className="absolute bottom-2 left-3 text-[10px] font-medium text-slate-400 italic">Creative alignment</span>}
                    {day === 5 && <span className="absolute bottom-2 left-3 text-[10px] font-medium text-slate-400 italic">Production setup</span>}
                    {day === 6 && <span className="absolute bottom-2 left-3 text-[10px] font-medium text-slate-400 italic">Asset pre-flight</span>}
                    {day === 7 && <span className="absolute top-3 right-3 text-[10px] font-bold text-[#0052FF] uppercase tracking-wider">FINAL DAY</span>}
                    {day === 7 && <span className="absolute bottom-2 left-3 text-[10px] font-medium text-slate-400 italic">Sprint kickoff lock</span>}
                    {day === 8 && <span className="absolute bottom-2 left-3 text-[10px] font-medium text-slate-400 italic">Rest & Queue</span>}
                    
                    {isToday && (
                        <span className="absolute bottom-2 left-3 text-[10px] font-medium text-[#0052FF] italic">Pipeline active</span>
                    )}

                    {/* Deliverable Badges */}
                    <div className="space-y-1 mt-1 z-10 relative">
                      {dayEntries.slice(0, 3).map((entry) => {
                        const config = getTypeConfig(entry.type);
                        const isFlex = entry.slot_strategy === "flex" || entry.slot_strategy === "swapped";
                        return (
                          <div
                            key={entry.id}
                            onClick={() => openEntryModal(entry)}
                            className={`w-full rounded-md px-2 py-1 text-left text-[11px] font-bold flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-xs ${
                              entry.type === "reel" ? "bg-[#F3E8FF] text-[#6B21A8]" :
                              entry.type === "story" ? "bg-[#FEF3C7] text-[#B45309]" :
                              "bg-[#E0F2FE] text-[#0369A1]"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <config.icon className="size-3 shrink-0" />
                              <span className="truncate">{config.label}</span>
                            </div>
                            <div className="flex flex-col gap-1 items-end shrink-0">
                              <span className={`size-1.5 rounded-full ${
                                entry.type === "reel" ? "bg-[#9333EA]" :
                                entry.type === "story" ? "bg-[#D97706]" :
                                "bg-[#0284C7]"
                              }`} />
                              {isFlex && (
                                <span className="text-[8px] bg-[#FCD34D] text-[#92400E] px-1 rounded-sm uppercase tracking-wider font-extrabold mt-0.5">Flex</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {dayEntries.length > 3 && (
                        <div className="text-center text-[10px] font-semibold text-slate-400 pt-0.5">
                          +{dayEntries.length - 3} more
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

      """
    
    content = content[:start_idx] + new_grid_jsx + content[end_idx:]

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Calendar grid UI updated successfully.")
