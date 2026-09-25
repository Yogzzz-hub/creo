import re

def refactor_stage_questionnaire():
    filepath = r"d:\intern\creo\frontend\src\features\onboarding\StageQuestionnaire.tsx"
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace the main wrapper and then each section.
    
    # 1. Replace the main wrapper start
    content = content.replace(
        """      {/* Main Section Content Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">""",
        """      {/* Main Section Content Form */}
      <div className="w-full">"""
    )
    
    # Let's do Section by Section replacements.
    
    # SECTION A
    sec_a_old = """        {/* SECTION A: IDENTITY */}
        {activeSection === "a" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section A: Brand Identity</h2>
              <p className="text-xs text-slate-500">Required · Takes ~2 min to complete</p>
            </div>"""
    
    sec_a_new = """        {/* SECTION A: IDENTITY */}
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
                </div>"""
    
    content = content.replace(sec_a_old, sec_a_new)
    
    # SECTION B
    sec_b_old = """        {/* SECTION B: AUDIENCE & POSITIONING */}
        {activeSection === "b" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section B: Audience & Positioning</h2>
              <p className="text-xs text-slate-500">Required · Defines hooks and angles (~3 min)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                B1: Describe your ideal customer *
              </label>"""
              
    sec_b_new = """        {/* SECTION B: AUDIENCE & POSITIONING */}
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                B1: Describe your ideal customer *
              </label>"""
              
    content = content.replace(sec_b_old, sec_b_new)
    
    # Close out Section A and B forms correctly.
    # Where does B's first card end? After B4 objections.
    b_mid_old = """              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  B6: Primary Audience Languages (Select all that apply) *
                </label>"""
                
    b_mid_new = """              />
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
                </label>"""
    
    content = content.replace(b_mid_old, b_mid_new)
    
    
    # End of B, C starts
    b_end_old = """              </div>
            </div>
          </div>
        )}

        {/* SECTION C: VOICE (NIELSEN NORMAN GROUP FRAMEWORK) */}
        {activeSection === "c" && ("""
        
    b_end_new = """              </div>
            </div>
            </div>
            </div>
          </div>
        )}

        {/* SECTION C: VOICE (NIELSEN NORMAN GROUP FRAMEWORK) */}
        {activeSection === "c" && ("""
        
    content = content.replace(b_end_old, b_end_new)
    
    # Close out Section A
    a_end_old = """              />
            </div>
          </div>
        )}

        {/* SECTION B: AUDIENCE & POSITIONING */}"""
        
    a_end_new = """              />
            </div>
            </div>
            </div>
          </div>
        )}

        {/* SECTION B: AUDIENCE & POSITIONING */}"""
        
    content = content.replace(a_end_old, a_end_new)
    
    
    # SECTION C
    sec_c_old = """        {/* SECTION C: VOICE (NIELSEN NORMAN GROUP FRAMEWORK) */}
        {activeSection === "c" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section C: Voice & Tone Framework</h2>
              <p className="text-xs text-slate-500">
                Four validated bipolar scales (NN/g) + anti-tone negative constraints (~2 min)
              </p>
            </div>"""
            
    sec_c_new = """        {/* SECTION C: VOICE (NIELSEN NORMAN GROUP FRAMEWORK) */}
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
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">"""
              
    content = content.replace(sec_c_old, sec_c_new)
    
    # Close out Section C
    c_end_old = """              />
            </div>
          </div>
        )}

        {/* SECTION D: LOOK & ASSETS */}"""
        
    c_end_new = """              />
            </div>
            </div>
            </div>
          </div>
        )}

        {/* SECTION D: LOOK & ASSETS */}"""
        
    content = content.replace(c_end_old, c_end_new)
    
    # SECTION D
    sec_d_old = """        {/* SECTION D: LOOK & ASSETS */}
        {activeSection === "d" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section D: Visual Direction & Assets</h2>
              <p className="text-xs text-slate-500">Required · Supplies our graphic designers & animators (~2 min)</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">"""
            
    sec_d_new = """        {/* SECTION D: LOOK & ASSETS */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">"""
            
    content = content.replace(sec_d_old, sec_d_new)
    
    d_mid1_old = """            {/* D2: Brand Colours */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">"""
              
    d_mid1_new = """            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                <h3 className="text-sm font-bold text-slate-900">Chromatic Color Matrix (D2)</h3>
              </div>
            {/* D2: Brand Colours */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">"""
              
    content = content.replace(d_mid1_old, d_mid1_new)
    
    d_mid2_old = """            {/* D6: Visual Direction */}
            <div>
              <div className="flex justify-between items-center mb-1.5">"""
              
    d_mid2_new = """            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <ShieldAlert className="w-4 h-4 text-[#2B7BC4]" />
                <h3 className="text-sm font-bold text-slate-900">Visual Direction & Negative Restrictions (D6 & D7)</h3>
              </div>
            {/* D6: Visual Direction */}
            <div>
              <div className="flex justify-between items-center mb-1.5">"""
              
    content = content.replace(d_mid2_old, d_mid2_new)
    
    # Close out Section D
    d_end_old = """              />
            </div>
          </div>
        )}

        {/* SECTION E: PRODUCTION REALITY */}"""
        
    d_end_new = """              />
            </div>
            </div>
            </div>
          </div>
        )}

        {/* SECTION E: PRODUCTION REALITY */}"""
        
    content = content.replace(d_end_old, d_end_new)
    
    # SECTION E
    sec_e_old = """        {/* SECTION E: PRODUCTION REALITY */}
        {activeSection === "e" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Section E: Production Reality & Constraints</h2>
              <p className="text-xs text-slate-500">
                Required · The facts an editor, shoot coordinator, and producer need before Tuesday (~3 min)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">"""
            
    sec_e_new = """        {/* SECTION E: PRODUCTION REALITY */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">"""
            
    content = content.replace(sec_e_old, sec_e_new)
    
    e_mid1_old = """            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E8: Where should content send viewers? *
                </label>"""
                
    e_mid1_new = """            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Conversion Routing & Target Destinations (E8 & E9)</h3>
                </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E8: Where should content send viewers? *
                </label>"""
                
    content = content.replace(e_mid1_old, e_mid1_new)
    
    e_mid2_old = """            {/* E11: Approval speed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E11: Who approves content and how fast? *
                </label>"""
                
    e_mid2_new = """            {/* E11: Approval speed */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <ShieldAlert className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Approval SLA & Excluded Formats (E11 & E7)</h3>
                </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  E11: Who approves content and how fast? *
                </label>"""
                
    content = content.replace(e_mid2_old, e_mid2_new)
    
    # Close out Section E
    e_end_old = """              </div>
            </div>
          </div>
        )}

        {/* SECTION F: HISTORY (OPTIONAL) */}"""
        
    e_end_new = """              </div>
            </div>
            </div>
            </div>
          </div>
        )}

        {/* SECTION F: HISTORY (OPTIONAL) */}"""
        
    content = content.replace(e_end_old, e_end_new)
    
    # SECTION F
    sec_f_old = """        {/* SECTION F: HISTORY (OPTIONAL) */}
        {activeSection === "f" && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Section F: Historical Content Data</h2>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Optional Enrichment</span>
              </div>
              <p className="text-xs text-slate-500">Helps our team avoid repeating what flopped before (~2 min)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                F4: Anything that has clearly NOT worked before?
              </label>"""
              
    sec_f_new = """        {/* SECTION F: HISTORY (OPTIONAL) */}
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                F4: Anything that has clearly NOT worked before? *
              </label>"""
              
    content = content.replace(sec_f_old, sec_f_new)
    
    # Close out Section F
    f_end_old = """              />
            </div>
          </div>
        )}

        {/* SECTION G: STORY (THE FOUR QUESTIONS WHERE WORDS MATTER) */}"""
        
    f_end_new = """              />
            </div>
            </div>
            </div>
          </div>
        )}

        {/* SECTION G: STORY (THE FOUR QUESTIONS WHERE WORDS MATTER) */}"""
        
    content = content.replace(f_end_old, f_end_new)
    
    # SECTION G
    sec_g_old = """        {/* SECTION G: STORY (THE FOUR QUESTIONS WHERE WORDS MATTER) */}
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
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                G1: Why was the brand started?
              </label>"""
              
    sec_g_new = """        {/* SECTION G: STORY (THE FOUR QUESTIONS WHERE WORDS MATTER) */}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                G1: Why was the brand started? *
              </label>"""
              
    content = content.replace(sec_g_old, sec_g_new)
    
    g_mid_old = """            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  G3: What do you want people to remember you for?
                </label>"""
                
    g_mid_new = """            </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Sparkles className="w-4 h-4 text-[#2B7BC4]" />
                  <h3 className="text-sm font-bold text-slate-900">Reputation Legacy & Horizon Goals (G3 & G4)</h3>
                </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  G3: What do you want people to remember you for? *
                </label>"""
                
    content = content.replace(g_mid_old, g_mid_new)
    
    # Close out Section G
    g_end_old = """              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8">"""
        
    g_end_new = """              />
            </div>
            </div>
            </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="w-full flex items-center justify-between pt-6 border-t border-slate-100 mt-8">"""
        
    content = content.replace(g_end_old, g_end_new)
    
    # End of Main Section Content Form wrapper
    main_end_old = """          </div>
        </div>
      </div>
    </div>
  );
}"""
    main_end_new = """          </div>
        </div>
      </div>
    </div>
  );
}"""
    # Wait, the closing tags might be slightly different now. Let's make sure we only removed one <div> at the top and replaced it with a w-full wrapper.
    # We replaced `<div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">` with `<div className="w-full">`
    # The closing `</div>` should be fine.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done refactoring StageQuestionnaire.tsx")

refactor_stage_questionnaire()
