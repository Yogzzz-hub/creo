import pathlib

FILE_PATH = "src/pages/portal/PortalAccountPage.tsx"

content = pathlib.Path(FILE_PATH).read_text(encoding='utf-8')

# The exact old string to replace. We'll use start and end indices.
start_str = '{/* ═══════════════ TAB 4: Social Integrations ═══════════════ */}'
end_str = '{/* Connect Instagram Modal */}'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find start or end block")
    exit(1)

new_jsx = r'''{/* ═══════════════ TAB 4: Social Integrations ═══════════════ */}
          {activeTab === "integrations" && (
            <div className="flex flex-col h-full space-y-6">
              
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-24">
                {/* ── Left: Meta/Facebook API ── */}
                <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                          <svg className="size-5 fill-[#1877F2]" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900 tracking-tight">Meta / Facebook API Configuration</h2>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Manage direct access tokens and permissions for Meta Business Suite & Facebook Graph API.</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 rounded-full shrink-0">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        API Active & Verified
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">App Name / Business Page</p>
                          <p className="text-[13px] font-black text-slate-900">{businessName || "Northwind Labs Official Page"}</p>
                        </div>
                        <span className="text-[10px] font-bold text-[#0052FF] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> Verified Entity
                        </span>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Meta App ID</p>
                          <div className="flex items-center gap-2">
                            <code className="text-[12px] font-bold text-slate-700 font-mono">app_9482019482</code>
                            <span className="text-[10px] font-medium text-slate-400">• v19.0 API</span>
                          </div>
                        </div>
                        <button className="text-[11px] font-bold text-[#0052FF] hover:underline whitespace-nowrap">Copy</button>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Access Token Status</p>
                          <div className="flex items-center gap-1.5">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <p className="text-[12px] font-bold text-slate-900">Valid <span className="font-semibold text-slate-500">(Expires in 58 days)</span></p>
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">Auto-rotates in 45 days</span>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Webhook Sync Mode</p>
                          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0052FF]">
                            <Zap className="size-3.5 fill-[#0052FF]" />
                            Active (Real-time listener)
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">Latency ~180ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">
                        Manage Permissions
                      </button>
                      <button className="px-4 py-2 bg-[#0052FF] text-white text-xs font-bold rounded-xl hover:bg-[#0045D8] shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all">
                        <Check className="size-3.5" /> Test Connection
                      </button>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 hidden sm:block">Last tested: 12 minutes ago</span>
                  </div>
                </div>

                {/* ── Right: Instagram Handles ── */}
                <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center shrink-0 shadow-sm shadow-pink-500/20">
                          <Instagram className="size-5" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900 tracking-tight">Connected Instagram Handles</h2>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Manage linked Instagram accounts and monitor real-time content delivery syncs.</p>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 rounded-full shrink-0">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Syncing
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Connected Account Preview */}
                      <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                          <div className="size-10 rounded-full bg-[#E2E8F0] border border-slate-200 flex items-center justify-center font-black text-xs text-[#0F172A] shrink-0">
                            {igUsername ? igUsername.charAt(0).toUpperCase() : "NL"}
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-1">
                              @{igUsername || "northwindlabs"}
                              <div className="size-3.5 rounded-full bg-[#0052FF] flex items-center justify-center text-white"><Check className="size-2.5" /></div>
                            </h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">42.5K followers • 184 posts • Connected to {businessName || "Northwind Labs Inc."}</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full whitespace-nowrap">
                          Primary Sync
                        </span>
                      </div>

                      {/* Input & Connect Action */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Connected Instagram ID / Handle</label>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-medium text-sm">@</div>
                            <input
                              type="text"
                              value={igUsername || instagram}
                              onChange={(e) => { setIgUsername(e.target.value); setInstagram(e.target.value); }}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-10 py-2.5 text-[13px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF] transition-all"
                            />
                            {igConnected && (
                              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-emerald-500">
                                <Check className="size-4" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => connectInstagramMutation.mutate(igUsername || instagram)}
                              disabled={connectInstagramMutation.isPending}
                              className="px-4 py-2.5 text-xs font-bold text-white bg-[#0052FF] hover:bg-[#0045D8] rounded-xl transition shadow-sm whitespace-nowrap disabled:opacity-50 cursor-pointer active:scale-95"
                            >
                              {connectInstagramMutation.isPending ? <Loader2 className="size-3.5 animate-spin mx-auto" /> : "Verify & Sync Handle"}
                            </button>
                            {igConnected && (
                              <button
                                type="button"
                                onClick={() => disconnectInstagramMutation.mutate()}
                                className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer whitespace-nowrap transition-colors"
                              >
                                Disconnect
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sync Statuses List */}
                      {igConnected && (
                        <div className="pt-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Sync Statuses</p>
                            <span className="text-[10px] font-bold text-[#0052FF]">Real-Time Polling</span>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl gap-2">
                              <div className="flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[11px] font-bold text-slate-700">Auto-Publishing Engine</span>
                              </div>
                              <span className="px-2 py-0.5 text-[9px] font-extrabold bg-blue-50 text-[#0052FF] rounded border border-blue-100 uppercase">ACTIVE (Every 6 hrs)</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50/50 border border-slate-100 rounded-xl gap-2">
                              <div className="flex items-center gap-2 text-slate-500">
                                <Clock className="size-3.5" />
                                <span className="text-[11px] font-bold text-slate-700">Last Media Asset Sync</span>
                              </div>
                              <span className="text-[10px] font-semibold text-slate-600">12 minutes ago (Reel & Ad #1)</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl gap-2">
                              <div className="flex items-center gap-2 text-emerald-600">
                                <ShieldCheck className="size-3.5" />
                                <span className="text-[11px] font-bold text-emerald-800">API Health Rate</span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-600">99.9% Uptime (All systems operational)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-400">Next scheduled automatic sync in <strong className="text-slate-600">2h 48m</strong></span>
                    <button className="text-[10px] font-bold text-[#0052FF] hover:underline flex items-center gap-1 cursor-pointer">
                      View Delivery Log <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Fixed Bottom Bar ── */}
              <div className="fixed bottom-0 inset-x-0 sm:left-64 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)] px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <p className="text-[12px] font-bold text-slate-900">All social integration APIs active and operating normally.</p>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                    Discard Changes
                  </button>
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
                  >
                    {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save Integration Settings"}
                  </button>
                </div>
              </div>

            </div>
          )}

          '''

content = content[:start_idx] + new_jsx + content[end_idx:]

# Ensure missing imports are added
import_patch = 'import {\n  Loader2,\n  CheckCircle2,\n  ShieldCheck,\n  X,\n  Check,\n  Info,\n  CreditCard,\n  Calendar,\n  Download,\n  ArrowRight,\n  Instagram,\n  Zap,\n  Clock\n} from "lucide-react";'

content = content.replace('import {\n  Loader2,\n  CheckCircle2,\n  X,\n  Check,\n  Info,\n  CreditCard,\n  Calendar,\n  Download,\n  ArrowRight,\n  Instagram\n} from "lucide-react";', import_patch)

pathlib.Path(FILE_PATH).write_text(content, encoding='utf-8')
