import re

filepath = 'src/pages/public/HomePage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Mojibake Artifacts on Pricing Cards
# Starter
content = content.replace('â‚¹25,000', '$2,500')
content = content.replace('(â‚¹1,136/asset)', '($113/asset)')
# Growth
content = content.replace('â‚¹50,000', '$5,000')
content = content.replace('(â‚¹1,042/asset)', '($104/asset)')
# Scale
content = content.replace('â‚¹95,000', '$9,500')
content = content.replace('(â‚¹990/asset)', '($99/asset)')

# 2. Upgrade "Try Us Before You Pay Us" Lead Section
old_lead_section = """          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto">
            <button 
              onClick={(e) => {
                if (localStorage.getItem('creo_auth') !== 'true') {
                  e.preventDefault();
                  alert("Please sign in to message the team.");
                  navigate("/login?redirect=contact");
                } else {
                  alert("Contact Modal Triggered");
                }
              }}
              className="w-full sm:w-auto bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] text-sm px-8 py-4 rounded-xl shrink-0 flex items-center justify-center gap-2"
            >
              Contact via Mail <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="text-[10px] font-semibold text-[#97A0B3] mt-6">
            Spots are limited to 10 brands per week to ensure quality.
          </div>"""

new_lead_section = """          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-2xl mx-auto backdrop-blur-md bg-[#161F2D]/30 p-2 rounded-2xl border border-[#2A3446]/40">
            <input 
              type="email" 
              placeholder="Enter work email for a sample deliverable..." 
              className="bg-[#0A0F18] border border-[#2A3446] text-[#F8FAFC] rounded-xl px-4 py-3 text-sm focus:border-[#7FA0D6] focus:outline-none w-full sm:w-80 transition-colors" 
            />
            <button 
              onClick={(e) => {
                if (localStorage.getItem('creo_auth') !== 'true') {
                  e.preventDefault();
                  alert("Please sign in to message the team.");
                  navigate("/login?redirect=contact");
                } else {
                  alert("Contact Modal Triggered");
                }
              }}
              className="w-full sm:w-auto bg-[#BCCCE6] text-[#050810] hover:bg-[#D5E1F2] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] text-sm px-6 py-3 rounded-xl shrink-0 flex items-center justify-center gap-2"
            >
              Request Sample Batch <ArrowRight className="size-4" />
            </button>
          </div>
          <div className="text-[10px] font-semibold text-[#97A0B3] mt-6">
            No commitment. 48-hour pilot turnaround for qualified creative agencies.
          </div>"""

content = content.replace(old_lead_section, new_lead_section)

# 3. Polish Hero Media Bento Cards
content = content.replace('w-full h-full object-cover block', 'w-full h-full object-cover rounded-xl border border-[#2A3446]/40 transition-transform duration-500 hover:scale-[1.02] block')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
