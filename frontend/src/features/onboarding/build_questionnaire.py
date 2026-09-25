import os

def build_file():
    filepath = r"d:\intern\creo\frontend\src\features\onboarding\StageQuestionnaire.tsx"
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    out = []
    
    # 0 to 472: everything before the main section content wrapper
    for i in range(0, 472):
        out.append(lines[i])
        
    out.append('      <div className="w-full">\n')  # replaces 473
    
    # helper for section boundaries
    def write_original(start, end):
        for i in range(start, end):
            out.append(lines[i])

    # SECTION A (474 to 650)
    out.append('''        {/* SECTION A: IDENTITY */}
        {activeSection === "a" && (
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            <div className="w-full lg:w-[320px] shrink-0 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Section A: Brand Identity</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold bg-[#EBF3FF] text-[#2B7BC4] px-2 py-0.5 rounded-full">Required</span>
                  <span className="text-[10px] font-bold text-slate-500">Core Setup (~2 min)</span>
                </div>
                
                <div className="mt-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 mb-2">Creative Director Guidance</h3>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex gap-3">
                    <Sparkles className="w-4 h-4 text-[#2B7BC4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Brand Foundations</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Your brand name and one-liner configure the fundamental metadata for all generated assets.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#2B7BC4]" />
                  <span className="text-[10px] font-medium text-slate-500">SLA Rev 2026.09 · Enforced</span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Building2 className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Brand Basics & Category</h3>
                </div>
''')
    write_original(481, 648) # from A1 Brand Name to A7 goal notes
    out.append('''            </div>
              </div>
            </div>
          </div>
        )}\n\n''')


    # SECTION B (652 to 770)
    out.append('''        {/* SECTION B: AUDIENCE & POSITIONING */}
        {activeSection === "b" && (
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            <div className="w-full lg:w-[320px] shrink-0 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Section B: Audience & Positioning</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold bg-[#EBF3FF] text-[#2B7BC4] px-2 py-0.5 rounded-full">Required</span>
                  <span className="text-[10px] font-bold text-slate-500">Defines hooks and angles (~3 min)</span>
                </div>
                
                <div className="mt-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 mb-2">Creative Director Guidance</h3>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex gap-3">
                    <Sparkles className="w-4 h-4 text-[#2B7BC4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Hook Synthesis</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">B1 (ideal customer) and B2 (friction point) configure the creative scriptwriters for opening 3-second reel hooks.</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex gap-3">
                    <ShieldAlert className="w-4 h-4 text-[#2B7BC4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Objection Conversion Framework</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">B4 hesitations become high-converting video rebuttals and carousels.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#2B7BC4]" />
                  <span className="text-[10px] font-medium text-slate-500">SLA Rev 2026.09 · Enforced</span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Users className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Target Demographics & Friction Points</h3>
                </div>
''')
    write_original(660, 722) # B1 to B4 objections
    out.append('''              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Localization & Scripting Format</h3>
                </div>
''')
    write_original(722, 768) # B6 to B7
    out.append('''              </div>
            </div>
          </div>
        )}\n\n''')


    # SECTION C (772 to 955)
    out.append('''        {/* SECTION C: VOICE (NIELSEN NORMAN GROUP FRAMEWORK) */}
        {activeSection === "c" && (
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            <div className="w-full lg:w-[320px] shrink-0 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Section C: Voice & Tone Framework</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold bg-[#EBF3FF] text-[#2B7BC4] px-2 py-0.5 rounded-full">Required</span>
                  <span className="text-[10px] font-bold text-slate-500">NN/g Framework (~2 min)</span>
                </div>
                
                <div className="mt-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 mb-2">Creative Director Guidance</h3>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex gap-3">
                    <Sliders className="w-4 h-4 text-[#2B7BC4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Tone Calibration</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">These sliders automatically prompt our copywriters and dictate the on-screen talent's delivery energy.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#2B7BC4]" />
                  <span className="text-[10px] font-medium text-slate-500">SLA Rev 2026.09 · Enforced</span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
''')
    write_original(782, 953) # Live Preview Box to C7 Forbidden Phrases
    out.append('''              </div>
            </div>
          </div>
        )}\n\n''')


    # SECTION D (957 to 1118)
    out.append('''        {/* SECTION D: LOOK & ASSETS */}
        {activeSection === "d" && (
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            <div className="w-full lg:w-[320px] shrink-0 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Section D: Visual Direction & Assets</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold bg-[#EBF3FF] text-[#2B7BC4] px-2 py-0.5 rounded-full">Required</span>
                  <span className="text-[10px] font-bold text-slate-500">Supplies our graphic designers & animators (~2 min)</span>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div className="bg-[#0D2137] rounded-xl p-4 border border-slate-800 text-white flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                      <p className="text-xs font-bold">Motion & Color Palette Engine</p>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed mb-2">Your selected hex colours (#0D2137 & #2B7BC4) will automatically calibrate typography overlays, poster templates, and reel end-cards.</p>
                    <div className="flex gap-2">
                      <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded text-[10px] font-mono"><div className="w-2 h-2 rounded-full bg-[#0D2137] border border-white/20"></div>#0D2137</div>
                      <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded text-[10px] font-mono"><div className="w-2 h-2 rounded-full bg-[#2B7BC4] border border-white/20"></div>#2B7BC4</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex gap-3">
                    <ShieldAlert className="w-4 h-4 text-[#2B7BC4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Negative Filter Quarantine</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Your D7 restrictions enforce strict hard-coded bans during video rendering & storyboard approvals.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#2B7BC4]" />
                  <span className="text-[10px] font-medium text-slate-500">SLA Rev 2026.09 · Enforced</span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Palette className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Foundational Typography & Brand Guidelines (D1 & D3)</h3>
                </div>
''')
    write_original(964, 994) # D1 to D3
    out.append('''              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Chromatic Color Matrix (D2)</h3>
                </div>
''')
    write_original(995, 1065) # D2 Brand Colours
    out.append('''              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <ShieldAlert className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Visual Direction & Negative Restrictions (D6 & D7)</h3>
                </div>
''')
    write_original(1066, 1116) # D6 to D7
    out.append('''              </div>
            </div>
          </div>
        )}\n\n''')


    # SECTION E (1120 to 1311)
    out.append('''        {/* SECTION E: PRODUCTION REALITY */}
        {activeSection === "e" && (
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            <div className="w-full lg:w-[320px] shrink-0 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Section E: Production Reality & Constraints</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold bg-[#EBF3FF] text-[#2B7BC4] px-2 py-0.5 rounded-full">Required</span>
                  <span className="text-[10px] font-bold text-slate-500">Pre-production lock (~2 min)</span>
                </div>
                
                <div className="mt-6 space-y-4">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex gap-3">
                    <Camera className="w-4 h-4 text-[#2B7BC4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Shoot Crew Allocation</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed mb-2">Your E1 & E3 selections trigger equipment dispatch (teleprompters, mobile lighting, or crew travel to E4 Mumbai).</p>
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Live Logistics
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex gap-3">
                    <Sparkles className="w-4 h-4 text-[#2B7BC4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Turnaround SLA Lock</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed mb-2">Your E11 (Founder - Same Day) syncs directly into the creative sprint approval pipeline.</p>
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2B7BC4] border border-[#2B7BC4]/30 px-2 py-0.5 rounded-full bg-blue-50">
                        <ShieldAlert className="w-3 h-3" /> SLA Enabled
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#2B7BC4]" />
                  <span className="text-[10px] font-medium text-slate-500">SLA Rev 2026.09 · Enforced</span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Camera className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">On-Camera Talent & Location Logistics (E1, E2, E3, E4)</h3>
                </div>
''')
    write_original(1129, 1213) # E1 to E4
    out.append('''              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Conversion Routing & Target Destinations (E8 & E9)</h3>
                </div>
''')
    write_original(1213, 1262) # E8 to E10 constraints
    out.append('''              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <ShieldAlert className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Approval SLA & Excluded Formats (E11 & E7)</h3>
                </div>
''')
    write_original(1263, 1309) # E11 to E7
    out.append('''              </div>
            </div>
          </div>
        )}\n\n''')


    # SECTION F (1313 to 1337)
    out.append('''        {/* SECTION F: HISTORY (OPTIONAL) */}
        {activeSection === "f" && (
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            <div className="w-full lg:w-[320px] shrink-0 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Section F: Historical Content Data</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Optional Enrichment</span>
                  <span className="text-[10px] font-bold text-[#2B7BC4] bg-[#EBF3FF] px-2 py-0.5 rounded-full">De-Risking Audit (~2 min)</span>
                </div>
                <p className="text-[11px] text-slate-500">Helps our team avoid repeating what flopped before (~2 min)</p>
                
                <div className="mt-6 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 flex gap-3 shadow-xs">
                    <ShieldAlert className="w-4 h-4 text-[#2B7BC4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Algorithmic Pitfall Filter</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">How past campaign post-mortems allow the CREO editorial team to blacklist low-performing hooks and wasted ad spend immediately.</p>
                      <div className="mt-2 text-right"><ArrowRight className="w-3 h-3 inline text-[#2B7BC4]" /></div>
                    </div>
                  </div>
                  <div className="bg-[#FAF5FF] border border-purple-100 rounded-xl p-3 flex gap-3">
                    <Users className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-purple-900 mb-1">Audience Fatigue Safeguard</p>
                      <p className="text-[10px] text-purple-700 leading-relaxed">Ensures formats that previously resulted in unfollows or negative engagement are quarantined before pre-production.</p>
                      <div className="mt-2 text-right"><ArrowRight className="w-3 h-3 inline text-purple-500" /></div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#2B7BC4]" />
                  <span className="text-[10px] font-medium text-slate-500">SLA Rev 2026.09 · Enforced</span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <History className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Content Blacklist & Fatigue Matrix</h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">Documenting previous marketing pitfalls gives our creative directors an immediate de-risking advantage during week 1 ideation.</p>
''')
    write_original(1323, 1335) # F4
    out.append('''              </div>
            </div>
          </div>
        )}\n\n''')


    # SECTION G (1339 to 1406)
    out.append('''        {/* SECTION G: STORY (THE FOUR QUESTIONS WHERE WORDS MATTER) */}
        {activeSection === "g" && (
          <div className="flex flex-col lg:flex-row gap-6 w-full">
            <div className="w-full lg:w-[320px] shrink-0 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-2">Section G: Founder Story & Long-Term Vision</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Optional Enrichment</span>
                  <span className="text-[10px] font-bold text-[#2B7BC4] bg-[#EBF3FF] px-2 py-0.5 rounded-full">Narrative Engine (~3 min)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                  Keep these in your own authentic words — they inform our copywriters more than any questionnaire scale.
                </p>
                
                <h3 className="text-xs font-bold text-[#2B7BC4] mb-2">Creative Director Guidance</h3>
                
                <div className="mt-2 space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-3 shadow-xs">
                    <Sparkles className="w-4 h-4 text-[#2B7BC4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Authentic Origin Synthesis</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Your raw founder wording feeds long-form founder talking heads and high-converting storytelling carousel carousels.</p>
                      <div className="mt-2 text-right"><ArrowRight className="w-3 h-3 inline text-[#2B7BC4]" /></div>
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex gap-3">
                    <ShieldAlert className="w-4 h-4 text-[#2B7BC4] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 mb-1">Vision Horizon Mapping</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed">G4 answers directly establish narrative arc milestones for the next 12 months of content campaigns.</p>
                      <div className="mt-2 text-right"><ArrowRight className="w-3 h-3 inline text-[#2B7BC4]" /></div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-[#2B7BC4]" />
                  <span className="text-[10px] font-medium text-slate-500">SLA Rev 2026.09 · Enforced</span>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <BookOpen className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Origin & Core Convictions (G1 & G2)</h3>
                </div>
''')
    write_original(1437, 1463) # G1 and G2
    out.append('''              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Reputation Legacy & Horizon Goals (G3 & G4)</h3>
                </div>
''')
    write_original(1463, 1491) # G3 and G4
    out.append('''              </div>
            </div>
          </div>
        )}\n\n''')


    # 1408 to EOF: Footer Actions
    for i in range(1408, len(lines)):
        out.append(lines[i])
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(out)

build_file()
print("Rebuilt flawlessly.")
