import re
import os

def sanitize_portfolio():
    filepath = 'src/pages/public/PortfolioPage.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Clean up encoding artifacts
    content = content.replace('⚡', '')
    content = content.replace('₹', '$')
    content = content.replace('—', '-')
    content = content.replace('──', '-')
    content = content.replace('•', '·')
    
    # 2. Hero stats replacements
    content = content.replace('<div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">18-Step</div>\\n                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">Connected <br/>Pipeline</div>', 
                              '<div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">Motion Graphics Pod</div>\\n                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">4K Pro-Res</div>')
    
    content = content.replace('<div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">2.4h</div>\\n                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">Avg. Client <br/>Sign-Off</div>',
                              '<div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">48h SLA</div>\\n                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">Turnaround</div>')
                              
    content = content.replace('<div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">82%</div>\\n                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">Optimized <br/>Team Capacity</div>',
                              '<div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">1.2 avg</div>\\n                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">Revision Cycles</div>')
                              
    content = content.replace('<div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">41.25%</div>\\n                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">Verified <br/>Retainer Margin</div>',
                              '<div className="text-lg font-black text-[#F8FAFC] leading-none mb-1">WebM / Pro-Res</div>\\n                <div className="text-[10px] text-[#97A0B3] font-medium leading-tight">Formats</div>')
                              
    # 3. Clean up fake brands
    content = content.replace('Astra Living', 'TechCorp Series B')
    content = content.replace('Zenith Fitness', 'D2C Apparel Brand')
    content = content.replace('Kaya Botanicals', 'Global Fintech')

    # 4. CTA and hover colors
    content = content.replace('hover:bg-[#059669]', 'hover:bg-[#D5E1F2]')
    content = content.replace('bg-[#059669]', 'bg-[#BCCCE6]')
    
    # 5. Add SVG animation in hero section
    svg_bg = '''<div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#7FA0D6" strokeWidth="0.5" opacity="0.5"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="10%" cy="20%" r="2" fill="#7FA0D6" className="animate-ping" />
            <circle cx="80%" cy="70%" r="3" fill="#BCCCE6" className="animate-pulse" />
            <circle cx="40%" cy="80%" r="2" fill="#7FA0D6" className="animate-ping" style={{ animationDelay: '1s' }} />
        </svg>
    </div>'''
    
    if '<section className="max-w-[1240px] mx-auto px-6 pt-16 lg:pt-24 pb-16 lg:pb-20">' in content:
        content = content.replace('<section className="max-w-[1240px] mx-auto px-6 pt-16 lg:pt-24 pb-16 lg:pb-20">', 
                                  '<section className="max-w-[1240px] mx-auto px-6 pt-16 lg:pt-24 pb-16 lg:pb-20 relative">\\n      ' + svg_bg)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def sanitize_clients():
    filepath = 'src/pages/public/ClientsPage.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Clean up encoding artifacts
    content = content.replace('⚡', '')
    content = content.replace('₹', '$')
    content = content.replace('—', '-')
    content = content.replace('──', '-')
    content = content.replace('•', '·')
    
    # 2. Clean up fake client names in ClientsPage
    content = content.replace('Vikram Malhotra', 'Alex Chen')
    content = content.replace('Velox Studio', 'Series A-C Tech')
    content = content.replace('Sarah Jenkins', 'Jordan Lee')
    content = content.replace('Hyperdrive Creative', 'D2C Brands')
    content = content.replace('Hyperdrive Agency', 'D2C Brands')
    content = content.replace('Karan Patel', 'Taylor Reed')
    content = content.replace('Northstar Agency', 'Creative Production Houses')
    content = content.replace('Northstar Studio', 'Creative Production Houses')
    content = content.replace('Loom &amp; Craft Media', 'Enterprise SaaS')
    content = content.replace('Apex Digital', 'Global Agencies')
    content = content.replace('Pulse Motion Lab', 'Web3 Protocols')
    
    # 3. Quotes -> Workflow principles
    content = content.replace('"CREO eliminated our single biggest growth bottleneck: client approval friction. Our clients love the 1-click review portal..."', '"Guaranteed Pod SLA: Seamless integration with your existing team architecture."')
    content = content.replace('"Before CREO, team utilization was guesswork on a spreadsheet. Now I can see Video Editors at 82%..."', '"Direct Slack / Portal Handoff: Zero friction from brief to final delivery."')
    content = content.replace('"Seeing our true contribution margin on clients like TechCorp Series B (41.25%) directly inside the operational dashboard..."', '"Transparent Contribution Margins: Clear visibility into project economics."')
    # If Astra Living was replaced in ClientsPage, we handle that
    content = content.replace('"Seeing our true contribution margin on clients like Astra Living (41.25%) directly inside the operational dashboard..."', '"Transparent Contribution Margins: Clear visibility into project economics."')
    
    # 4. CTA and hover colors
    content = content.replace('hover:bg-[#059669]', 'hover:bg-[#D5E1F2]')
    content = content.replace('bg-[#059669]', 'bg-[#BCCCE6]')
    
    # 5. Add lightweight SVG animations (pulsing dots on SLA / Pod availability badges)
    content = content.replace('size-1.5 rounded-full bg-[#7FA0D6]', 'size-1.5 rounded-full bg-[#7FA0D6] animate-ping')
    content = content.replace('animate-pulse bg-[#7FA0D6]', 'animate-ping bg-[#7FA0D6]')
    
    # 6. Hero bg animation
    svg_bg = '''<div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#7FA0D6" strokeWidth="0.5" opacity="0.5"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <circle cx="20%" cy="30%" r="2" fill="#7FA0D6" className="animate-ping" />
            <circle cx="70%" cy="60%" r="3" fill="#BCCCE6" className="animate-pulse" />
        </svg>
    </div>'''
    
    if '<section className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24">' in content:
        content = content.replace('<section className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24">', 
                                  '<section className="max-w-[1240px] mx-auto px-6 py-20 lg:py-24 relative">\\n      ' + svg_bg)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

sanitize_portfolio()
sanitize_clients()
