import re

FILE_PATH = "d:/intern/creo/frontend/src/pages/portal/PortalCalendarPage.tsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update outermost container
content = content.replace(
    '<div className="space-y-6">',
    '<div className="flex flex-col h-[calc(100vh-104px)] max-w-[1440px] mx-auto px-4 md:px-8 w-full animate-page-in space-y-6 pb-6">'
)

# 2. Update Top Banner (7-Day Strategy Indicator)
top_banner_old = """        {/* 7-Day Creative Strategy & Warmup Indicator */}
        <div className="rounded-xl border border-blue-200 bg-[#F0F7FD] p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-[#0052FF] text-white shrink-0 mt-0.5">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="font-bold text-[#0F172A] flex items-center gap-2">
                <span>7-Day Strategy & Production Lock Phase Active</span>
                <span className="px-2 py-0.5 rounded-full bg-[#0052FF]/10 text-[#0052FF] text-[10px] font-extrabold uppercase">
                  Days 1–7
                </span>
              </p>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                Days 1 to 7 are dedicated to brand research, scripting, and creative alignment. No deliverables are published during this warmup period. All Reels, Posters, and Stories are allocated from <strong>Day 8</strong> onwards across your 30-day production cycle based on your plan quota.
              </p>
            </div>
          </div>
        </div>"""

top_banner_new = """        {/* 1. TOP BANNER */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center gap-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent pointer-events-none" />
          <div className="size-10 rounded-xl bg-white border border-blue-100 flex items-center justify-center shrink-0 shadow-sm relative z-10">
            <ShieldCheck className="size-5 text-[#0052FF]" />
          </div>
          <div className="flex-1 relative z-10">
            <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2 flex-wrap">
              7-Day Strategy & Production Lock Phase Active
              <span className="bg-[#0052FF] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                DAYS 1-7
              </span>
            </h2>
            <p className="text-[13px] text-slate-500 mt-0.5 max-w-4xl leading-relaxed">
              Days 1 to 7 are dedicated to brand research, scripting, and creative alignment. Deliverables are published from Day 8 onwards across your 30-day production cycle based on your active plan quota.
            </p>
          </div>
        </div>"""

content = content.replace(top_banner_old, top_banner_new)

# 3. Replace View Switcher & Quick Filters (and everything down to the month grid)
# The old file has a huge chunk for filters and grid/list views.
# We will use regex to find the section and replace it.

start_marker = "{/* View Switcher & Quick Filters */}"
end_marker = "{/* ── Selected Day Summary Drawer ───────────────────────────────────── */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_controls_and_main = """{/* 2. FILTER & VIEW TOGGLE BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={() => setSelectedFormat("all")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedFormat === "all" ? "bg-slate-900 text-white shadow-md" : "bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200"
            }`}>
              All ({quota.total})
            </button>
            
            <button 
              onClick={() => setSelectedFormat("reel")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedFormat === "reel" ? "bg-slate-900 text-white shadow-md" : "bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200"
            }`}>
              <Video className="size-3.5" />
              <span>Reels ({quota.reel})</span>
            </button>

            <button 
              onClick={() => setSelectedFormat("poster")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedFormat === "poster" ? "bg-slate-900 text-white shadow-md" : "bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200"
            }`}>
              <ImageIcon className="size-3.5" />
              <span>Posters ({quota.poster})</span>
            </button>

            <button 
              onClick={() => setSelectedFormat("story")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedFormat === "story" ? "bg-slate-900 text-white shadow-md" : "bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200"
            }`}>
              <Layers className="size-3.5" />
              <span>Stories ({quota.story})</span>
            </button>
          </div>

          {/* Month Navigator & Today */}
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
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden flex flex-col relative z-10">
        {viewMode === "list" ? (
          /* --- LIST VIEW --- */
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
                        {/* Asset & Type */}
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
                            {isFlex ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-[#FDF0D5] text-[#D97706] uppercase tracking-wider">
                                <Zap className="size-3" />
                                Flex Slot
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                                Anchor (70%)
                              </span>
                            )}
                          </div>
                        </td>
                        
                        {/* Scheduled Date */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-500">
                            <Clock className="size-3.5 text-slate-400" />
                            {entry.date} · {entry.scheduled_time || "07:00 AM"}
                          </span>
                        </td>

                        {/* Hook Concept */}
                        <td className="px-6 py-4">
                          <h4 className="text-[13px] font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors truncate max-w-[400px]">
                            {entry.topic}
                          </h4>
                          {entry.blueprint?.premise && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[400px]">
                              {entry.blueprint.premise}
                            </p>
                          )}
                          {!entry.blueprint?.premise && isUnlockedFlex && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[400px]">
                              Unlocked reserve buffer for reactive market commentary and trends.
                            </p>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6F8F3] text-[#059669] border border-[#A7F3D0]">
                              <CheckCircle2 className="size-3.5" />
                              Approved
                            </span>
                          ) : isUnlockedFlex ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                              <span className="size-1.5 bg-[#2563EB] rounded-full" />
                              Unlocked Slot
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                              <span className="size-1.5 bg-[#D97706] rounded-full" />
                              Concept Pending
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {isUnlockedFlex ? (
                            <button 
                              onClick={() => openEntryModal(entry)}
                              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#0052FF] hover:bg-[#1A5EA8] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                            >
                              Submit Topic
                            </button>
                          ) : (
                            <button 
                              onClick={() => openEntryModal(entry)}
                              className="inline-flex items-center gap-1 text-[13px] font-bold text-[#0052FF] hover:text-[#1A5EA8] hover:underline cursor-pointer"
                            >
                              {isApproved ? "View Asset" : "Inspect Hook"}
                              <ExternalLink className="size-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* --- GRID VIEW --- */
          <div className="flex flex-col flex-1">
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 flex-1 border-b border-slate-100 last:border-b-0 auto-rows-fr">
              {calendarCells.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="border-r border-b border-slate-100 bg-slate-50/30 min-h-[120px]" />;
                }

                const dayEntries = getDayEntries(day);
                const isToday = isCurrentMonth && today.getDate() === day;
                const isLockDay = day <= 7;
                
                return (
                  <div 
                    key={day} 
                    className={`relative border-r border-b border-slate-100 last:border-r-0 p-2 sm:p-3 transition-colors min-h-[120px] ${
                      isLockDay ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#f8fafc_10px,#f8fafc_20px)]" : "bg-white hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[13px] font-semibold ${isToday ? "size-7 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold" : "text-slate-600"}`}>
                        {day}
                      </span>
                      {isLockDay && (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          LOCK
                        </span>
                      )}
                      {!isLockDay && dayEntries.length > 0 && (
                        <span className="text-[10px] font-semibold text-slate-400">
                          {dayEntries.length} {dayEntries.length === 1 ? 'item' : 'items'}
                        </span>
                      )}
                    </div>
                    
                    {/* Strategy Warmup Labels for days 1-7 */}
                    {day === 1 && <span className="absolute bottom-2 left-3 text-[11px] font-medium text-slate-400 italic">Strategy warmup</span>}
                    {day === 2 && <span className="absolute bottom-2 left-3 text-[11px] font-medium text-slate-400 italic">Hook ideation</span>}
                    {day === 3 && <span className="absolute bottom-2 left-3 text-[11px] font-medium text-slate-400 italic">Brief assembly</span>}
                    {day === 4 && <span className="absolute bottom-2 left-3 text-[11px] font-medium text-slate-400 italic">Creative alignment</span>}
                    {day === 5 && <span className="absolute bottom-2 left-3 text-[11px] font-medium text-slate-400 italic">Production setup</span>}
                    {day === 6 && <span className="absolute bottom-2 left-3 text-[11px] font-medium text-slate-400 italic">Asset pre-flight</span>}
                    {day === 7 && <span className="absolute top-3 right-3 text-[10px] font-extrabold text-[#0052FF] uppercase tracking-wider">FINAL DAY</span>}
                    {day === 7 && <span className="absolute bottom-2 left-3 text-[11px] font-medium text-slate-400 italic">Sprint kickoff lock</span>}
                    
                    {/* Deliverable Badges */}
                    <div className="space-y-1 mt-1 z-10 relative">
                      {dayEntries.slice(0, 3).map((entry) => {
                        const config = getTypeConfig(entry.type);
                        const isFlex = entry.slot_strategy === "flex" || entry.slot_strategy === "swapped";
                        return (
                          <div
                            key={entry.id}
                            onClick={() => openEntryModal(entry)}
                            className={`w-full rounded-md px-2 py-1 text-left text-[11px] font-bold flex items-center justify-between cursor-pointer transition-all hover:opacity-80 shadow-xs ${
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
                                <span className="text-[8px] bg-amber-400 text-amber-900 px-1 rounded-sm uppercase tracking-wider font-extrabold mt-0.5">Flex</span>
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
    
    content = content[:start_idx] + new_controls_and_main + content[end_idx:]

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)

print("Calendar UI successfully updated.")
