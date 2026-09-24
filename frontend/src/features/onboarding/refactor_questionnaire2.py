import re

def refactor():
    path = r"d:\intern\creo\frontend\src\features\onboarding\StageQuestionnaire.tsx"
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()
        
    # Replace the main container class
    code = code.replace(
        '<div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">',
        '<div className="w-full">'
    )

    # ------------------
    # SECTION A
    # ------------------
    a_start = '''        {/* SECTION A: IDENTITY */}
        {activeSection === "a" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section A: Brand Identity</h2>
              <p className="text-xs text-slate-500">Required · Takes ~2 min to complete</p>
            </div>'''
            
    a_start_new = '''        {/* SECTION A: IDENTITY */}
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
                </div>'''
    code = code.replace(a_start, a_start_new)
    
    a_end = '''              />
            </div>
          </div>
        )}

        {/* SECTION B: AUDIENCE & POSITIONING */}'''
        
    a_end_new = '''              />
            </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION B: AUDIENCE & POSITIONING */}'''
    code = code.replace(a_end, a_end_new)
    
    
    # ------------------
    # SECTION B
    # ------------------
    b_start = '''        {/* SECTION B: AUDIENCE & POSITIONING */}
        {activeSection === "b" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section B: Audience & Positioning</h2>
              <p className="text-xs text-slate-500">Required · Defines hooks and angles (~3 min)</p>
            </div>'''
            
    b_start_new = '''        {/* SECTION B: AUDIENCE & POSITIONING */}
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
                </div>'''
    code = code.replace(b_start, b_start_new)
    
    b_mid = '''              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  B6: Primary Audience Languages (Select all that apply) *
                </label>'''
                
    b_mid_new = '''              />
            </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Localization & Scripting Format</h3>
                </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  B6: Primary Audience Languages (Select all that apply) *
                </label>'''
    code = code.replace(b_mid, b_mid_new)
    
    b_end = '''              </div>
            </div>
          </div>
        )}

        {/* SECTION C: VOICE (NIELSEN NORMAN GROUP FRAMEWORK) */}'''
        
    b_end_new = '''              </div>
            </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION C: VOICE (NIELSEN NORMAN GROUP FRAMEWORK) */}'''
    code = code.replace(b_end, b_end_new)
    
    
    # ------------------
    # SECTION C
    # ------------------
    c_start = '''        {/* SECTION C: VOICE (NIELSEN NORMAN GROUP FRAMEWORK) */}
        {activeSection === "c" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section C: Voice & Tone Framework</h2>
              <p className="text-xs text-slate-500">
                Four validated bipolar scales (NN/g) + anti-tone negative constraints (~2 min)
              </p>
            </div>'''
            
    c_start_new = '''        {/* SECTION C: VOICE (NIELSEN NORMAN GROUP FRAMEWORK) */}
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
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">'''
    code = code.replace(c_start, c_start_new)
    
    c_end = '''              />
            </div>
          </div>
        )}

        {/* SECTION D: LOOK & ASSETS */}'''
        
    c_end_new = '''              />
            </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION D: LOOK & ASSETS */}'''
    code = code.replace(c_end, c_end_new)
    
    
    # ------------------
    # SECTION D
    # ------------------
    d_start = '''        {/* SECTION D: LOOK & ASSETS */}
        {activeSection === "d" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section D: Visual Direction & Assets</h2>
              <p className="text-xs text-slate-500">Required · Supplies our graphic designers & animators (~2 min)</p>
            </div>'''
            
    d_start_new = '''        {/* SECTION D: LOOK & ASSETS */}
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
                </div>'''
    code = code.replace(d_start, d_start_new)
    
    d_mid1 = '''            {/* D2: Brand Colours */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                D2: Brand Hex Colours *
              </label>'''
              
    d_mid1_new = '''              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Chromatic Color Matrix (D2)</h3>
                </div>
            {/* D2: Brand Colours */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                D2: Brand Hex Colours *
              </label>'''
    code = code.replace(d_mid1, d_mid1_new)
    
    d_mid2 = '''            {/* D6: Visual Direction */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">'''
                
    d_mid2_new = '''              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <ShieldAlert className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Visual Direction & Negative Restrictions (D6 & D7)</h3>
                </div>
            {/* D6: Visual Direction */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-700">'''
    code = code.replace(d_mid2, d_mid2_new)
    
    d_end = '''              />
            </div>
          </div>
        )}

        {/* SECTION E: PRODUCTION REALITY */}'''
        
    d_end_new = '''              />
            </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION E: PRODUCTION REALITY */}'''
    code = code.replace(d_end, d_end_new)
    
    
    # ------------------
    # SECTION E
    # ------------------
    e_start = '''        {/* SECTION E: PRODUCTION REALITY */}
        {activeSection === "e" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section E: Production Reality & Constraints</h2>
              <p className="text-xs text-slate-500">
                Required · The facts an editor, shoot coordinator, and producer need before Tuesday (~3 min)
              </p>
            </div>'''
            
    e_start_new = '''        {/* SECTION E: PRODUCTION REALITY */}
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
                </div>'''
    code = code.replace(e_start, e_start_new)
    
    e_mid1 = '''            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E8: Where should content send viewers? *
                </label>'''
                
    e_mid1_new = '''              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Conversion Routing & Target Destinations (E8 & E9)</h3>
                </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E8: Where should content send viewers? *
                </label>'''
    code = code.replace(e_mid1, e_mid1_new)
    
    e_mid2 = '''            {/* E11: Approval speed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E11: Who approves content and how fast? *
                </label>'''
                
    e_mid2_new = '''            {/* E11: Approval speed */}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <ShieldAlert className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Approval SLA & Excluded Formats (E11 & E7)</h3>
                </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E11: Who approves content and how fast? *
                </label>'''
    code = code.replace(e_mid2, e_mid2_new)
    
    e_end = '''              </div>
            </div>
          </div>
        )}

        {/* SECTION F: HISTORY (OPTIONAL) */}'''
        
    e_end_new = '''              </div>
            </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION F: HISTORY (OPTIONAL) */}'''
    code = code.replace(e_end, e_end_new)
    
    
    # ------------------
    # SECTION F
    # ------------------
    f_start = '''        {/* SECTION F: HISTORY (OPTIONAL) */}
        {activeSection === "f" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Section F: Historical Content Data</h2>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Optional Enrichment</span>
              </div>
              <p className="text-xs text-slate-500">Helps our team avoid repeating what flopped before (~2 min)</p>
            </div>'''
            
    f_start_new = '''        {/* SECTION F: HISTORY (OPTIONAL) */}
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
                <p className="text-xs text-slate-500 mb-4">Documenting previous marketing pitfalls gives our creative directors an immediate de-risking advantage during week 1 ideation.</p>'''
    code = code.replace(f_start, f_start_new)
    
    f_end = '''              />
            </div>
          </div>
        )}

        {/* SECTION G: STORY (THE FOUR QUESTIONS WHERE WORDS MATTER) */}'''
        
    f_end_new = '''              />
            </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION G: STORY (THE FOUR QUESTIONS WHERE WORDS MATTER) */}'''
    code = code.replace(f_end, f_end_new)
    
    
    # ------------------
    # SECTION G
    # ------------------
    g_start = '''        {/* SECTION G: STORY (THE FOUR QUESTIONS WHERE WORDS MATTER) */}
        {activeSection === "g" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Section G: Founder Story & Long-Term Vision</h2>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Optional Enrichment</span>
              </div>
              <p className="text-xs text-slate-500">
                Keep these in your own authentic words — they inform our copywriters more than any questionnaire scale.
              </p>
            </div>'''
            
    g_start_new = '''        {/* SECTION G: STORY (THE FOUR QUESTIONS WHERE WORDS MATTER) */}
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
                </div>'''
    code = code.replace(g_start, g_start_new)
    
    g_mid = '''            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  G3: What do you want people to remember you for?
                </label>'''
                
    g_mid_new = '''            </div>
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Reputation Legacy & Horizon Goals (G3 & G4)</h3>
                </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  G3: What do you want people to remember you for?
                </label>'''
    code = code.replace(g_mid, g_mid_new)
    
    g_end = '''              />
            </div>
          </div>
        )}

        {/* Footer Actions */}'''
        
    g_end_new = '''              />
            </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}'''
    code = code.replace(g_end, g_end_new)
    
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)
    
    print("Completed exact structure refactoring!")

refactor()
