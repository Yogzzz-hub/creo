import re

FILE_PATH = "d:/intern/creo/frontend/src/pages/portal/PortalSupportPage.tsx"

with open(FILE_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to replace everything from `  return (\n    <div className="animate-page-in` to the end of the file.
start_idx = content.find('  return (\n    <div className="animate-page-in')
if start_idx == -1:
    print("Could not find start of return statement")
    exit(1)

new_jsx = r'''  return (
    <div className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8 pb-12 mt-6">
      
      {/* ── TOP ROW: 3 Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* 1. Assigned Creative Pod */}
        <div className="card-surface p-6 border border-slate-100 flex flex-col h-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Assigned Creative Pod</h2>
            <span className="bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-[#C7D2FE]">
              Pod Alpha
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-5">Your dedicated full-stack creative execution unit.</p>
          
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 flex-1 mb-5">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[#E0E7FF] text-[#4338CA] flex items-center justify-center font-bold text-sm border border-[#C7D2FE] shrink-0">
                ML
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Maya Lin
                  <span className="bg-[#0052FF] text-white text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">POD LEAD</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Creative Director • Available for fast triage</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600">Active in Slack</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 mt-auto">
            <button className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-xs">
              <MessageSquare className="size-3.5 text-slate-400" />
              Open Slack (#creo-northwind)
            </button>
            <button className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-xs">
              <CalendarIcon className="size-3.5 text-slate-400" />
              Schedule Quick Triage Call
            </button>
          </div>
        </div>

        {/* 2. Urgent Hotline & Escalation */}
        <div className="card-surface p-6 border border-slate-100 flex flex-col h-full relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-full opacity-50 -z-10 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-2 relative z-10">
            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <div className="p-1 rounded-md bg-rose-100 text-rose-600">
                <AlertCircle className="size-3.5" />
              </div>
              Urgent Hotline & Escalation
            </h2>
            <span className="bg-[#ECFDF5] text-[#059669] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
              Staffed & Live (24/7)
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed relative z-10">
            Emergency escalation line for critical production blockers & live launch outages.
          </p>

          <div className="mt-auto mb-6 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Emergency Escalation Line</p>
            <div className="flex items-end gap-3">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">+1 (800) 555-0199</h3>
              <span className="bg-rose-100 text-rose-700 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded mb-1.5">24/7 PRIORITY</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 leading-snug">
              Direct priority line to Senior Duty Engineer & Account Director.
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10 mt-auto">
            <button className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer shadow-xs">
              <PhoneCall className="size-3.5 text-rose-500" />
              Call Escalation Line
            </button>
            <button className="text-[10px] font-bold text-[#0052FF] hover:underline whitespace-nowrap">
              View Emergency SLA Guidelines →
            </button>
          </div>
        </div>

        {/* 3. Support SLA Metrics */}
        <div className="card-surface p-6 border border-slate-100 flex flex-col h-full relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full opacity-50 -z-10 transition-transform group-hover:scale-110" />
           <div className="flex items-center justify-between mb-2 relative z-10">
            <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">Support SLA Metrics</h2>
            <span className="text-[10px] font-semibold text-slate-400">Past 30 Days</span>
          </div>
          <p className="text-xs text-slate-500 mb-6 relative z-10">
            Real-time resolution speeds and compliance guarantees.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 mb-1">Average Turnaround</p>
              <h3 className="text-2xl font-black text-[#0052FF] tracking-tight">1.8 hrs</h3>
              <p className="text-[9px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Faster than 2.0h SLA guarantee
              </p>
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
              <p className="text-[10px] font-bold text-slate-500 mb-1">SLA Compliance</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">99.4%</h3>
              <p className="text-[9px] text-slate-500 mt-2 leading-tight">
                Across 38 tickets processed
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto border-t border-slate-50 pt-3 relative z-10">
            <span className="text-[10px] text-slate-400 font-semibold">Target SLA: <span className="text-slate-600">&lt; 2.0 hours</span></span>
            <span className="text-[10px] font-bold text-emerald-600">100% On-Track</span>
          </div>
        </div>

      </div>

      {/* ── BOTTOM ROW: Form & List ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[5fr_7fr] gap-5">
        
        {/* Left: Form */}
        <div className="card-surface p-6 sm:p-7 border border-slate-100 relative">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight mb-1">Submit a New Support Ticket</h2>
              <p className="text-[12px] text-slate-500">Direct triage queue assigned to your senior engineers and creative directors.</p>
            </div>
            <span className="bg-blue-50 text-[#0052FF] text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-blue-100 whitespace-nowrap">
              Priority Queue
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Subject */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ticket Subject</label>
              <input
                type="text"
                required
                placeholder="Brief description of the issue or creative request..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[13px] text-slate-900 font-semibold focus:bg-white hover:border-slate-300 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 focus:outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Priority Level</label>
              <div className="flex bg-slate-50/50 p-1 rounded-xl border border-slate-200">
                {["low", "medium", "high", "urgent"].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPriority(lvl as any)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${
                      priority === lvl
                        ? lvl === "urgent"
                          ? "bg-rose-50 text-rose-700 shadow-sm border border-rose-200"
                          : "bg-white text-slate-900 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {lvl} {lvl === "urgent" && "(2-Hour SLA)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Issue Category</label>
              <select className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[13px] font-semibold text-slate-900 focus:bg-white appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%20fill%3D%22none%22%20stroke%3D%22%2394A3B8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-no-repeat pr-10 hover:border-slate-300 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 focus:outline-none transition-all cursor-pointer">
                <option value="api">API & Webhooks</option>
                <option value="creative">Creative Revision</option>
                <option value="strategy">Strategy / Brand</option>
                <option value="technical">Technical Bug</option>
                <option value="billing">Billing</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Description & Logs</label>
              <textarea
                rows={5}
                required
                placeholder="Provide details, screen recordings, or error logs..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[13px] text-slate-900 font-semibold focus:bg-white hover:border-slate-300 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 focus:outline-none resize-none transition-all placeholder:font-medium placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center justify-between pb-3">
              <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-600 transition-colors cursor-pointer">
                <Paperclip className="size-3.5" /> Attach Files (PNG, MP4, Logs)
              </button>
              <span className="text-[10px] text-slate-400 font-medium">Up to 250MB supported</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={createTicketMutation.isPending || !title || !description}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0052FF] px-6 py-3 text-[13px] font-bold text-white hover:bg-[#0045D8] hover:shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 transition-all cursor-pointer"
              >
                {createTicketMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Submit Ticket to Triage →"}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Active Tickets List */}
        <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col h-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight mb-1">Active & Recent Tickets</h2>
              <p className="text-[12px] text-slate-500">Track your open requests and review SLA resolutions.</p>
            </div>
            
            <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl">
              <button className="px-4 py-1.5 bg-white text-[#0D2137] text-xs font-bold rounded-lg shadow-sm">All Tickets</button>
              <button className="px-4 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-lg">In Progress</button>
              <button className="px-4 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-lg">Resolved</button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1 pb-4">
            {isTicketsLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-slate-400" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-2xl">
                <p className="text-sm font-semibold text-slate-500">No active tickets.</p>
              </div>
            ) : (
              tickets.map((t) => (
                <div key={t.id} onClick={() => setActiveTicketId(t.id)} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                        #{t.id.slice(0, 8).toUpperCase()}
                      </span>
                      {getStatusBadge(t.status)}
                      {getPriorityBadge(t.priority)}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">Opened {new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-[13px] font-bold text-slate-900 group-hover:text-[#0052FF] transition-colors mb-1.5">{t.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">{t.description}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      Opened by <strong className="text-slate-600">You</strong> • Assigned to <strong className="text-slate-600">DevOps Tier 3</strong>
                    </span>
                    <span className="text-[10px] font-bold text-[#0052FF] group-hover:underline">View Discussion Thread →</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
            <span className="text-[11px] font-semibold text-slate-400">Showing {tickets.length} of 38 tickets</span>
            <button className="text-[11px] font-bold text-[#0052FF] hover:underline cursor-pointer">
              View All Resolved Tickets →
            </button>
          </div>
        </div>
      </div>

      {/* ── Chat Modal ── */}
      {activeTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6" onClick={() => setActiveTicketId(null)}>
          <div className="w-full max-w-3xl h-[85vh] card-surface flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-white shrink-0 z-10">
              <div className="flex items-center gap-3">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono font-bold">#{activeTicketId.slice(0, 8)}</span>
                <h3 className="font-bold text-[#0F172A] text-sm truncate max-w-md">{activeTicketDetail?.title || "Loading..."}</h3>
              </div>
              <button onClick={() => setActiveTicketId(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X className="size-5" />
              </button>
            </div>
            
            {/* Thread */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
              {isActiveTicketLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="size-6 animate-spin text-[#0052FF]" /></div>
              ) : activeTicketDetail?.messages?.length > 0 ? (
                activeTicketDetail.messages.map((m: any) => (
                  <div key={m.id} className={`flex gap-3 ${m.is_staff ? "justify-start" : "justify-end"}`}>
                    {m.is_staff && (
                      <div className="size-8 rounded-full bg-[#E0E7FF] text-[#4338CA] flex items-center justify-center font-bold text-xs shrink-0 border border-[#C7D2FE]">
                        M
                      </div>
                    )}
                    <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${m.is_staff ? "bg-white border border-slate-100" : "bg-[#0052FF] text-white"}`}>
                      {m.is_staff && <p className="text-[10px] font-bold text-slate-400 mb-1">Maya Lin (Support)</p>}
                      <p className={`text-sm ${m.is_staff ? "text-slate-700" : "text-white/95"}`}>{m.content}</p>
                      <span className={`block text-[9px] mt-2 ${m.is_staff ? "text-slate-400" : "text-blue-200"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <p className="text-sm text-slate-500 font-medium">No replies yet.</p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <form onSubmit={handleReplySubmit} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Type a reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm outline-none focus:border-[#0052FF] focus:bg-white transition-colors"
                />
                <button type="submit" disabled={sendReplyMutation.isPending || !replyMessage.trim()} className="rounded-full bg-[#0052FF] p-3 text-white hover:bg-[#0045D8] disabled:opacity-50 cursor-pointer shadow-sm">
                  <Send className="size-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalSupportPage;
'''

content = content[:start_idx] + new_jsx

# Make sure imports are present
import_patch = "import {\n  LifeBuoy,\n  MessageSquare,\n  Clock,\n  CheckCircle2,\n  AlertCircle,\n  Loader2,\n  Send,\n  X,\n  PhoneCall,\n  CalendarIcon,\n  Paperclip,\n  ExternalLink"
content = content.replace('import {\n  LifeBuoy', import_patch)

with open(FILE_PATH, 'w', encoding='utf-8') as f:
    f.write(content)
