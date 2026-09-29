import pathlib

FILE_PATH = "src/pages/portal/PortalAccountPage.tsx"

content = pathlib.Path(FILE_PATH).read_text(encoding='utf-8')

start_str = '{/* ═══════════════ TAB 1: Company & Contact ═══════════════ */}'
end_str = '{/* ═══════════════ TAB 2: Brand Profile ═══════════════ */}'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find start or end block")
    exit(1)

new_jsx = r'''{/* ═══════════════ TAB 1: Company & Contact ═══════════════ */}
          {activeTab === "business" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-24">
              
              {/* ── Left Column: Profile & Pod ── */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* 1. Profile Details Card */}
                <div className="card-surface p-6 border border-slate-100 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">Profile</h2>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        ACTIVE CLIENT
                      </span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                      <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="size-14 rounded-full bg-[#0052FF] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-500/20 shrink-0">
                      {fullName?.charAt(0)?.toUpperCase() || "D"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold text-slate-900 leading-tight truncate">{fullName || "David K."}</h3>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">VP of Marketing</p>
                      <p className="text-[10px] text-slate-400 truncate">{businessName || "Northwind Labs Inc."}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-slate-600">
                      <svg className="size-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                      <span className="text-[12px] font-medium truncate">{user?.email || profile?.email || "david@northwindlabs.com"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <svg className="size-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                      <span className="text-[12px] font-medium">{phone || "+1 415 890-2410"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <svg className="size-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                      <span className="text-[12px] font-medium">San Francisco, CA</span>
                    </div>
                  </div>

                  {/* Connect Instagram Embedded Block */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-[11px] font-bold text-slate-700">Connect Instagram ID</label>
                      {igConnected ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">Live</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">Not Connected</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                          <div className="size-6 rounded-[7px] bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center text-white shadow-sm shrink-0">
                            <Instagram className="size-3.5" />
                          </div>
                        </div>
                        <input
                          className="w-full pl-10 pr-3 py-2 text-[12px] bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] outline-none transition-all placeholder:font-medium placeholder:text-slate-400 truncate"
                          placeholder="@northwindlabs"
                          type="text"
                          value={instagram || igUsername}
                          onChange={(e) => setInstagram(e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (instagram) connectInstagramMutation.mutate(instagram); }}
                        className="px-4 py-2 bg-[#0052FF] hover:bg-[#0045D8] text-white text-[11px] font-bold rounded-lg transition-all active:scale-95 shrink-0 shadow-sm"
                      >
                        Connect
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                      <RefreshCw className="size-3" /> Reset Password
                    </button>
                    <button className="text-[11px] font-bold text-[#0052FF] hover:underline cursor-pointer">
                      Edit Details
                    </button>
                  </div>
                </div>

                {/* 2. Creative Pod Summary Card */}
                {profile?.assigned_team && profile.assigned_team.length > 0 && (
                  <div className="card-surface p-6 border border-slate-100">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">Creative Pod</span>
                        <span className="bg-blue-50 text-[#0052FF] border border-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-md">Pod Alpha</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">#creo-northwind-labs</span>
                    </div>
                    
                    {profile.assigned_team.filter((m) => m.is_primary).map((lead) => (
                      <div key={lead.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="size-9 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300">
                              {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <span className="absolute bottom-0 right-0 size-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12px] font-bold text-slate-900 truncate">{lead.name}</span>
                              <span className="bg-[#0052FF] text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm whitespace-nowrap">POD LEAD</span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{lead.role || "Creative Director"} • Fast triage</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50/50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100 shrink-0 self-start sm:self-auto">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Active in Slack
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Right Column: Company Information ── */}
              <div className="lg:col-span-8 flex flex-col">
                <div className="card-surface p-6 sm:p-8 border border-slate-100 flex-1 flex flex-col relative overflow-hidden">
                  <div className="mb-8">
                    <h2 className="text-[18px] font-bold text-slate-900 tracking-tight leading-tight">Company Information</h2>
                    <p className="text-[11px] text-slate-500 mt-1">Manage your legal business entity, primary contact details, and billing registry.</p>
                  </div>
                  
                  <form onSubmit={handleSaveBusinessProfile} className="space-y-5 flex-1 flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Business / Legal Name</label>
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Official Website URL</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                            <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[11px] font-bold text-slate-700">Tax ID / EIN</label>
                          <span className="text-[10px] text-slate-400 font-medium">(Optional)</span>
                        </div>
                        <input
                          type="text"
                          placeholder="US-94-3829104"
                          className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Industry & Sector</label>
                        <input
                          type="text"
                          value={industry || "AI & Creative Technology"}
                          onChange={(e) => setIndustry(e.target.value)}
                          className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Primary Business Address</label>
                      <input
                        type="text"
                        placeholder="440 Brannan St, Suite 300, San Francisco, CA 94107"
                        className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">Billing Registry Email</label>
                      <input
                        type="email"
                        value={user?.email || profile?.email || "billing@northwindlabs.com"}
                        onChange={() => {}}
                        className="w-full text-[13px] font-semibold text-slate-900 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] outline-none transition-all placeholder:font-medium placeholder:text-slate-400"
                      />
                      <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Monthly statements and VAT invoices will be dispatched to this address.</p>
                    </div>

                    {/* Retainer Status Block */}
                    <div className="mt-auto pt-8">
                      <div className="border border-emerald-100 bg-emerald-50/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-md uppercase tracking-wider">ACTIVE RETAINER</span>
                            <span className="text-[10px] text-slate-500 font-medium">Renews Nov 1, 2024</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-bold text-slate-900">Enterprise Growth Tier</span>
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[18px] font-black text-[#0052FF] leading-none tracking-tight">$8,500 <span className="text-[11px] text-slate-400 font-medium">/mo</span></div>
                          <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">Unlimited revisions included</p>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>

              {/* ── Fixed Bottom Bar ── */}
              <div className="fixed bottom-0 inset-x-0 sm:left-64 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-end gap-4">
                <button className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer w-full sm:w-auto">
                  Discard Changes
                </button>
                <button
                  onClick={() => updateProfileMutation.mutate({})}
                  disabled={updateProfileMutation.isPending}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  Save Company Details
                </button>
              </div>

            </div>
          )}
          
          {/* ═══════════════ TAB 2: Brand Profile ═══════════════ */}'''

content = content[:start_idx] + new_jsx + content[end_idx:]

pathlib.Path(FILE_PATH).write_text(content, encoding='utf-8')
