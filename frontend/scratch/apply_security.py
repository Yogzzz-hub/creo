import pathlib

FILE_PATH = "src/pages/portal/PortalAccountPage.tsx"

content = pathlib.Path(FILE_PATH).read_text(encoding='utf-8')

start_str = '{/* ═══════════════ TAB 3: Security ═══════════════ */}'
end_str = '{/* ═══════════════ TAB 4: Social Integrations ═══════════════ */}'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find start or end block")
    exit(1)

new_jsx = r'''{/* ═══════════════ TAB 3: Security ═══════════════ */}
          {activeTab === "security" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-24">
              
              {/* ── Left Column: Change Password ── */}
              <div className="lg:col-span-5">
                <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">Change Password</h2>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Update your password regularly to keep your account secure.</p>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Last changed 45 days ago</span>
                  </div>

                  {passwordMsg && (
                    <div className={`mb-5 p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 ${
                      passwordMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}>
                      {passwordMsg.type === "success" ? <CheckCircle2 className="size-4" /> : <X className="size-4" />}
                      {passwordMsg.text}
                    </div>
                  )}

                  <form onSubmit={(e) => { e.preventDefault(); changePasswordMutation.mutate(); }} className="space-y-4 flex-1">
                    <div>
                      <label className="block text-[11px] font-bold text-[#0F172A] mb-1.5">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-[#0F172A] pr-10 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 py-3 px-4 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                        />
                        <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors">
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#0F172A] mb-1.5">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-[#0F172A] pr-10 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 py-3 px-4 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium"
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors">
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#0F172A] mb-1.5">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className={`w-full rounded-xl border bg-white text-[13px] font-semibold text-[#0F172A] pr-10 py-3 px-4 outline-none transition-all placeholder:text-slate-400 placeholder:font-medium ${
                            confirmPassword && confirmPassword === newPassword
                              ? "border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                              : "border-slate-200 focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20"
                          }`}
                        />
                        {confirmPassword && confirmPassword === newPassword && (
                          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-emerald-500 pointer-events-none">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Password Strength Indicator */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Password Strength: <span className="text-emerald-600">Strong</span></span>
                        <span className="text-[9px] text-slate-400 font-semibold">Meets requirements</span>
                      </div>
                      <div className="flex gap-1.5 mb-3">
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                        <div className="h-1 flex-1 bg-emerald-500 rounded-full" />
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-1">
                        <div className="flex items-center gap-1.5">
                          <Check className="size-3 text-emerald-500" />
                          <span className="text-[10px] font-medium text-emerald-700">At least 8 characters</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Check className="size-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-[10px] font-medium text-emerald-700 leading-tight">Includes uppercase & lowercase letters</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="size-3 text-emerald-500" />
                          <span className="text-[10px] font-medium text-emerald-700">Includes at least one number</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <Check className="size-3 text-emerald-500 mt-0.5 shrink-0" />
                          <span className="text-[10px] font-medium text-emerald-700 leading-tight">Includes special character (#, !, @, etc.)</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 mt-auto flex items-center justify-between">
                      <button type="submit" disabled={changePasswordMutation.isPending || !currentPassword || !newPassword}
                        className="bg-[#0052FF] hover:bg-[#0045D8] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer">
                        {changePasswordMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
                        Update Password
                      </button>
                      <button type="button" className="text-[11px] font-bold text-[#0052FF] hover:underline cursor-pointer">
                        Forgot your password?
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* ── Right Column: 2FA, Sessions & SSO ── */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* 1. Two-Factor Authentication (2FA) Card */}
                <div className="card-surface p-6 sm:p-7 border border-slate-100 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5 border-b border-slate-100 pb-5">
                    <div className="flex items-start gap-3.5">
                      <div className="size-10 rounded-xl bg-blue-50 border border-blue-100/50 flex items-center justify-center text-[#0052FF] shrink-0">
                        <Shield className="size-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Two-Factor Authentication (2FA)</h2>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold mt-1 ${
                          twoFactorEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}>
                          {twoFactorEnabled ? "Active via Authenticator App" : "Disabled"}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          Requires a 6-digit authentication code from your authenticator app (Google Authenticator, 1Password, or Authy) when signing in from an unrecognized device.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                      <span className="text-[11px] font-bold text-slate-700">{twoFactorEnabled ? "Enabled" : "Disabled"}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={twoFactorEnabled}
                        onClick={() => toggle2FAMutation.mutate(!twoFactorEnabled)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 ${
                          twoFactorEnabled ? "bg-[#0052FF]" : "bg-slate-300"
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          twoFactorEnabled ? "translate-x-4" : "translate-x-0"
                        }`} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-[11px] font-bold text-slate-700 transition-colors shadow-xs cursor-pointer">
                      <svg className="size-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                      Reconfigure Authenticator App
                    </button>
                    <button className="text-[11px] font-bold text-[#0052FF] hover:underline flex items-center gap-1.5 cursor-pointer">
                      <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                      View Backup Recovery Codes (8 Remaining)
                    </button>
                  </div>
                </div>

                {/* 2. Active Sessions & Devices */}
                <div className="card-surface border border-slate-100 overflow-hidden">
                  <div className="p-6 sm:p-7 border-b border-slate-100">
                    <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Active Sessions & Devices</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Manage devices and active browsers currently authorized to access your Creo workspace.</p>
                  </div>
                  <div className="divide-y divide-slate-100/80">
                    
                    <div className="p-5 sm:px-7 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <svg className="size-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <h3 className="text-[13px] font-bold text-slate-900">MacBook Pro 16" • San Francisco, CA, USA</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Chrome v122 • Active Now • IP 172.56.21.89</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Current Session
                      </span>
                    </div>

                    <div className="p-5 sm:px-7 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <svg className="size-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <h3 className="text-[13px] font-bold text-slate-900">iPhone 15 Pro • San Francisco, CA, USA</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Creo Mobile App v2.4 • Last active 2 hours ago</p>
                        </div>
                      </div>
                      <button className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer">
                        Log Out
                      </button>
                    </div>

                    <div className="p-5 sm:px-7 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="size-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <svg className="size-4.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div>
                          <h3 className="text-[13px] font-bold text-slate-900">iPad Pro 12.9" • Austin, TX, USA</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Safari • Last active 3 days ago</p>
                        </div>
                      </div>
                      <button className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer">
                        Log Out
                      </button>
                    </div>

                  </div>
                  <div className="p-5 sm:px-7 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <span className="text-[10px] text-slate-400 font-medium">Need to revoke access everywhere?</span>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-50 text-[10px] font-bold rounded-lg transition-colors cursor-pointer">
                      <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Log Out All Other Device Sessions
                    </button>
                  </div>
                </div>

                {/* 3. Single Sign-On (SSO) & SAML */}
                <div className="card-surface p-6 sm:p-7 border border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className="size-10 rounded-xl bg-purple-50 border border-purple-100/50 flex items-center justify-center text-purple-600 shrink-0">
                        <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold text-[#0F172A] tracking-tight">Single Sign-On (SSO) & SAML</h2>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-[#0052FF] border border-blue-100">Okta Verified</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm leading-relaxed">
                          Your enterprise workspace has active SAML authentication linked with <strong className="text-slate-700">identity.creocreative.io</strong>.
                        </p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold rounded-lg shadow-xs cursor-pointer whitespace-nowrap">
                      Audit SAML Logs
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}
          
          {/* ═══════════════ TAB 4: Social Integrations ═══════════════ */}'''

content = content[:start_idx] + new_jsx + content[end_idx:]

pathlib.Path(FILE_PATH).write_text(content, encoding='utf-8')
