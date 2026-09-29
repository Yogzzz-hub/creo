import re

filepath = r'd:\creo-main\frontend\src\pages\public\PricingPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Currency Standardization
content = content.replace("₹14,900' : '₹18,625", "$119' : '$149")
content = content.replace("₹34,900' : '₹43,625", "$279' : '$349")
content = content.replace("₹79,900' : '₹99,875", "$649' : '$799")

# 2. Table and list update
content = content.replace("Automated Auto-Chase (₹2.1L Cadence)", "Automated Auto-Chase (7-Day Cadence)")
content = content.replace('"Collections Pipeline engine (₹2.1L automated recovery cadence)",', '"Collections Pipeline engine (Automated Auto-Chase 7-Day Cadence)",')

# 3. MOST POPULAR Beacon
old_badge = """            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7FA0D6] text-[#050810] font-bold text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow-sm">
              ★ MOST POPULAR
            </div>"""

new_badge = """            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#7FA0D6] text-[#050810] font-bold text-[10px] tracking-wider uppercase px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1.5">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#050810] opacity-40"></span>
                <span className="relative inline-flex rounded-full size-2 bg-[#050810]"></span>
              </span>
              MOST POPULAR
            </div>"""
content = content.replace(old_badge, new_badge)

# 4. Checkmark Draw Animation
old_check = """                      <Check size={10} strokeWidth={3} />"""
new_check = """                      <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="animate-[dash_0.8s_ease-out_forwards]" strokeDasharray="24" strokeDashoffset="0" />
                      </svg>"""
content = content.replace(old_check, new_check)

# 5. Toggle Ease
old_toggle1 = """className={`font-medium text-xs px-4 py-1.5 transition-colors rounded-full ${"""
new_toggle1 = """className={`font-medium text-xs px-4 py-1.5 transition-all duration-300 ease-out rounded-full ${"""
content = content.replace(old_toggle1, new_toggle1)

old_toggle2 = """className={`font-semibold text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors ${"""
new_toggle2 = """className={`font-semibold text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-all duration-300 ease-out ${"""
content = content.replace(old_toggle2, new_toggle2)

# Also check for Deploy CRED typo just in case it exists in a different case
content = content.replace("Deploy CRED", "Deploy CREO")
content = content.replace("deploy CRED", "deploy CREO")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
