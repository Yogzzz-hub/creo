import re

def refine_portfolio():
    filepath = 'src/pages/public/PortfolioPage.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Number Formatting
    content = content.replace('$12,48,220', '$1,248,220')
    content = content.replace('$1,20,000', '$120,000')
    
    # 2. Section spacing
    content = content.replace('className="max-w-[1240px] mx-auto px-6 py-24"', 'className="max-w-[1240px] mx-auto px-6 py-24 lg:py-32"')
    
    # 3. Simplify inner divider lines to ultra-light border-[#2A3446]/30
    # Use regex to replace border-[#2A3446] and border-[#2A3446]/50 with border-[#2A3446]/30
    content = re.sub(r'border-\[#2A3446\](?:/50)?', 'border-[#2A3446]/30', content)
    
    # 4. Main preview containers - Glassmorphism & Outlines
    content = content.replace('backdrop-blur-md bg-[#161F2D]/60 border border-[#2A3446]/30 rounded-3xl p-6 lg:p-8', 
                              'backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/50 rounded-2xl shadow-xl p-6 lg:p-8')
    content = content.replace('backdrop-blur-md bg-[#161F2D]/60 border border-[#2A3446]/30 rounded-3xl p-6 shadow-2xl', 
                              'backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/50 rounded-2xl shadow-xl p-6')

    # Also replace stat pods that might be using the old background
    content = content.replace('backdrop-blur-md bg-[#161F2D]/60', 'backdrop-blur-md bg-[#161F2D]/50')
    
    # The stat pods hero also need their border fixed if they were accidentally changed to 30
    content = content.replace('backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/30 rounded-xl p-4', 
                              'backdrop-blur-md bg-[#161F2D]/50 border border-[#2A3446]/50 rounded-xl p-4')

    # Fix specific backgrounds that need to be base #050810 or alternating #0B111C
    content = content.replace('bg-[#0A0F18]', 'bg-[#0B111C]')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

refine_portfolio()
