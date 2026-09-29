FILE_PATH = "d:/intern/creo/frontend/src/pages/portal/PortalCalendarPage.tsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. Add weekly time-block helpers after queryClient
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WEEKLY_HELPERS = r'''  const queryClient = useQueryClient();

  // === Weekly Time-Block View ===
  const [weekOffset, setWeekOffset] = useState(0);

  const WEEK_DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const TIME_HOURS = [7, 8, 9, 10, 11, 12, 13];
  const HOUR_PX = 110;

  const weekDays = useMemo(() => {
    const anchor = new Date(today);
    const dow = anchor.getDay();
    const toMonday = dow === 0 ? -6 : 1 - dow;
    anchor.setDate(anchor.getDate() + toMonday + weekOffset * 7);
    anchor.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  function parseTimeToHours(timeStr?: string): number {
    if (!timeStr) return 7;
    const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return 7;
    let h = parseInt(m[1]);
    const mins = parseInt(m[2]);
    const p = m[3]?.toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h + mins / 60;
  }

  function getWeekCardStyle(entry: CalendarEntry) {
    const t = entry.type || "poster";
    const ok = entry.concept_status === "concept_approved" || entry.status === "approved";
    if (t === "poster") return { bg: "bg-[#C8E6C9]", badge: "bg-[#43A047] text-white", label: "Design (Poster)" };
    if (t === "reel") return ok
      ? { bg: "bg-[#BBDEFB]", badge: "bg-[#1565C0] text-white", label: "Development (Reel)" }
      : { bg: "bg-[#F8BBD0]", badge: "bg-[#C2185B] text-white", label: "Research (Reel)" };
    return { bg: "bg-[#FFE0B2]", badge: "bg-[#EF6C00] text-white", label: "Content" };
  }

  const getWeekDayFilteredEntries = (date: Date) => {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const da = String(date.getDate()).padStart(2, "0");
    const ds = `${y}-${mo}-${da}`;
    let res = entries.filter((e) => e.date === ds);
    if (selectedFormat !== "all") res = res.filter((e) => (e.type || "").toLowerCase() === selectedFormat);
    return res;
  };

  const DOT_COLORS: Record<string, string> = { reel: "bg-[#E91E63]", poster: "bg-[#43A047]", story: "bg-[#FB8C00]" };
  const AVATAR_PALETTE = ["#66BB6A","#42A5F5","#FFA726","#AB47BC","#EF5350","#26C6DA","#8D6E63","#5C6BC0"];
  const getAvatarInfo = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
    const n = 2 + (Math.abs(h) % 2);
    const s = Math.abs(h) % AVATAR_PALETTE.length;
    return { colors: Array.from({ length: n }, (_, i) => AVATAR_PALETTE[(s + i) % AVATAR_PALETTE.length]), extra: 1 + (Math.abs(h >> 3) % 5) };
  };
'''

content = content.replace('  const queryClient = useQueryClient();', WEEKLY_HELPERS)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. Update navigation to be week-aware in grid mode
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

old_nav = r'''          {/* Month Navigator & Today */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-full shadow-xs px-2 py-1">
              <button onClick={() => navigateMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer">
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-[13px] font-bold text-slate-900 px-3 min-w-[120px] text-center">
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
          </div>'''

new_nav = r'''          {/* Month / Week Navigator & Today */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-slate-200 rounded-full shadow-xs px-2 py-1">
              <button onClick={() => viewMode === "month" ? setWeekOffset(o => o - 1) : navigateMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer">
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-[13px] font-bold text-slate-900 px-3 min-w-[140px] text-center">
                {viewMode === "month"
                  ? `${MONTH_NAMES[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`
                  : `${MONTH_NAMES[currentMonth]} ${currentYear}`}
              </span>
              <button onClick={() => viewMode === "month" ? setWeekOffset(o => o + 1) : navigateMonth(1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer">
                <ChevronRight className="size-4" />
              </button>
            </div>
            <button onClick={() => { goToToday(); setWeekOffset(0); }} className="px-4 py-1.5 text-[13px] font-bold bg-white border border-slate-200 rounded-full shadow-xs text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
              Today
            </button>
            <span className="text-[13px] font-semibold text-slate-400 hidden lg:block ml-2">
              {filteredEntries.length} items visible
            </span>
          </div>'''

content = content.replace(old_nav, new_nav)

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. Replace the GRID VIEW with the weekly time-block
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

grid_start = content.find("/* --- GRID VIEW --- */")
grid_end = content.find("{/* \u2500\u2500 Creative Intelligence Blueprint")

if grid_start == -1 or grid_end == -1:
    print("ERROR: Could not find grid view markers!")
    exit(1)

# Go back to find the `(` before the comment
# The structure is `) : (\n          /* --- GRID VIEW --- */`
# We want to replace from `/* --- GRID VIEW --- */` to just before `{/* ── Creative`
# But we need to keep the ternary structure intact.
# Current structure:
# ) : (
#   /* --- GRID VIEW --- */
#   <div>...</div>
# )}
# </div>
#
# {/* ── Creative...

# Find the `)}\n      </div>` that closes the main content before the modal
# This is on lines 802-803 based on our view

new_grid = r'''/* --- WEEKLY TIME-BLOCK VIEW --- */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Day Column Headers */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-slate-200/60 bg-white">
              <div className="p-2 border-r border-slate-100" />
              {weekDays.map((date, i) => {
                const isToday = date.toDateString() === today.toDateString();
                const dayNum = date.getDate();
                const isLockDay = dayNum <= 7;
                // Check if this day has any deliverables to show colored dots
                const dayEnts = getWeekDayFilteredEntries(date);
                const dotType = dayEnts.length > 0 ? dayEnts[0].type : null;
                return (
                  <div key={i} className={`px-2 py-3 text-center border-r border-slate-100 last:border-r-0 ${isToday ? "bg-[#F0F7FD]/50" : ""}`}>
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                        {WEEK_DAY_LABELS[i]}
                      </span>
                      {dotType && (
                        <span className={`size-2 rounded-full ${DOT_COLORS[dotType || "poster"] || "bg-slate-300"}`} />
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1.5">
                      {isLockDay && (
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">LOCK</span>
                      )}
                      <span className={`text-[15px] leading-none ${
                        isToday
                          ? "size-8 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold shadow-sm mx-auto"
                          : "font-semibold text-slate-700"
                      }`}>
                        {dayNum}
                      </span>
                      {isToday && <span className="text-[10px] font-bold text-[#0052FF] uppercase tracking-wider">TODAY</span>}
                      {dayNum === 7 && !isToday && <span className="text-[10px] font-bold text-[#0052FF] uppercase tracking-wider">FINAL DAY</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time Grid Body */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ minHeight: `${TIME_HOURS.length * HOUR_PX}px` }}>
                {/* Time Labels Column */}
                <div className="relative border-r border-slate-100">
                  {TIME_HOURS.map((hour, idx) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 flex items-start justify-end pr-3 pt-1 border-b border-slate-100"
                      style={{ top: `${idx * HOUR_PX}px`, height: `${HOUR_PX}px` }}
                    >
                      <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    </div>
                  ))}
                </div>

                {/* Day Columns with Events */}
                {weekDays.map((date, dayIdx) => {
                  const dayEntries = getWeekDayFilteredEntries(date);
                  const isToday = date.toDateString() === today.toDateString();
                  const dayNum = date.getDate();
                  const isLockDay = dayNum <= 7;

                  return (
                    <div key={dayIdx} className={`relative border-r border-slate-100 last:border-r-0 ${isToday ? "bg-[#EFF6FF]/30" : ""}`}>
                      {/* Hour grid lines */}
                      {TIME_HOURS.map((hour, idx) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 border-b border-slate-100"
                          style={{ top: `${idx * HOUR_PX}px`, height: `${HOUR_PX}px` }}
                        />
                      ))}

                      {/* Today vertical blue accent */}
                      {isToday && (
                        <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#0052FF] rounded-full z-20" />
                      )}

                      {/* Pipeline Active label for today */}
                      {isToday && dayEntries.length === 0 && (
                        <div className="absolute top-4 left-0 right-0 text-center">
                          <span className="text-[11px] text-[#0052FF] font-medium italic">Pipeline active</span>
                        </div>
                      )}

                      {/* Event Cards */}
                      {dayEntries.map((entry) => {
                        const startH = parseTimeToHours(entry.scheduled_time);
                        const duration = entry.type === "reel" ? 2 : entry.type === "story" ? 1.5 : 1.75;
                        const topPx = Math.max(0, (startH - 7) * HOUR_PX);
                        const heightPx = duration * HOUR_PX;
                        const style = getWeekCardStyle(entry);
                        const avatars = getAvatarInfo(entry.id);

                        return (
                          <div
                            key={entry.id}
                            onClick={() => openEntryModal(entry)}
                            className={`absolute left-1 right-1 rounded-2xl p-3 cursor-pointer transition-all duration-200 hover:scale-[1.015] hover:shadow-lg hover:z-30 overflow-hidden group ${style.bg}`}
                            style={{ top: `${topPx}px`, height: `${Math.max(80, heightPx)}px` }}
                          >
                            {/* Category Badge */}
                            <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${style.badge} shadow-xs`}>
                              {style.label}
                            </span>

                            {/* Description */}
                            <p className="text-[11px] font-semibold text-slate-800 leading-snug mt-1.5 line-clamp-2 group-hover:text-slate-900 transition-colors">
                              {entry.topic}
                            </p>

                            {/* Time */}
                            <p className="text-[10px] font-medium text-slate-600 mt-1">
                              {entry.scheduled_time || "7:00 AM"}
                            </p>

                            {/* Avatars */}
                            <div className="flex items-center mt-2">
                              {avatars.colors.map((color, aIdx) => (
                                <div
                                  key={aIdx}
                                  className="size-6 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-[8px] font-bold text-white"
                                  style={{ backgroundColor: color, marginLeft: aIdx > 0 ? "-6px" : "0" }}
                                />
                              ))}
                              <div
                                className="size-6 rounded-full bg-slate-200 border-2 border-white shadow-xs flex items-center justify-center text-[9px] font-bold text-slate-600"
                                style={{ marginLeft: "-6px" }}
                              >
                                +{avatars.extra}
                              </div>
                            </div>
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

# Replace from grid_start to grid_end
content = content[:grid_start] + new_grid + content[grid_end:]

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Weekly time-block calendar view applied successfully.")
