import re

def refactor_portfolio():
    filepath = 'src/pages/public/PortfolioPage.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Colors - Green
    content = content.replace('#10B981', '#7FA0D6')
    content = content.replace('#22C55E', '#7FA0D6')
    content = content.replace('emerald-', '[#7FA0D6]-')
    content = content.replace('green-', '[#7FA0D6]-')
    
    # 2. Colors - Red / Yellow / Amber
    content = content.replace('text-red-400', 'text-[#D8BF9B]')
    content = content.replace('bg-red-400', 'bg-[#D8BF9B]')
    content = content.replace('text-amber-500', 'text-[#D8BF9B]')
    content = content.replace('bg-amber-500', 'bg-[#D8BF9B]')
    content = content.replace('bg-red-500/20 text-red-400', 'bg-[#D8BF9B]/10 border border-[#D8BF9B]/30 text-[#D8BF9B]')
    content = content.replace('bg-amber-500/15', 'bg-[#D8BF9B]/15')
    content = content.replace('bg-red-400/15', 'bg-[#D8BF9B]/15')
    content = content.replace('bg-red-400/20', 'bg-[#D8BF9B]/20')
    content = content.replace('bg-amber-500/20', 'bg-[#D8BF9B]/20')
    content = content.replace('border-red-400', 'border-[#D8BF9B]')
    content = content.replace('border-amber-500', 'border-[#D8BF9B]')
    content = content.replace('#EF4444', '#D8BF9B')

    # Specific requested badge formats
    content = content.replace('bg-[#7FA0D6]/15 text-[#7FA0D6] px-1.5 py-0.5 rounded font-bold border border-[#7FA0D6]/20', 'text-[#7FA0D6] bg-[#7FA0D6]/10 border border-[#7FA0D6]/30 px-1.5 py-0.5 rounded font-bold')
    content = content.replace('bg-[#0A0F18] border border-[#222F44] px-2 py-1 rounded-md shadow-sm', 'bg-[#0A0F18] border border-[#2A3446] px-2 py-1 rounded-md shadow-sm')
    content = content.replace('bg-[#7FA0D6]/10 border border-[#7FA0D6]/20 rounded-xl', 'bg-[#0A0F18] border border-[#7FA0D6]/40 rounded-xl')
    
    # 3. Primary CTA Button Styles
    content = content.replace('bg-[#BCCCE6] text-[#050810] font-bold text-xs sm:text-sm px-6 py-3 rounded-full hover:bg-white transition w-full sm:w-auto text-center shadow-sm', 
                              'bg-[#BCCCE6] text-[#050810] font-semibold text-xs sm:text-sm px-6 py-3 rounded-full transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)] hover:bg-[#D5E1F2] w-full sm:w-auto text-center')
    
    # Update action buttons with standard CTA style
    # "Approve Asset"
    content = content.replace('bg-[#7FA0D6] hover:bg-[#D5E1F2] text-[#050810] font-bold', 'bg-[#BCCCE6] hover:bg-[#D5E1F2] text-[#050810] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)]')
    # Resolve
    content = content.replace('bg-[#7FA0D6] hover:bg-[#D5E1F2] text-[#050810] text-[10px] font-bold', 'bg-[#BCCCE6] hover:bg-[#D5E1F2] text-[#050810] text-[10px] font-semibold transition-all shadow-sm hover:shadow-[0_0_20px_rgba(188,204,230,0.25)]')

    # 4. Spacing and layout
    content = content.replace('pt-16 lg:pt-24 pb-16 lg:pb-20', 'py-28 lg:py-36')
    content = content.replace('pt-8 pb-16', 'py-24')
    content = content.replace('py-8', 'py-24')
    
    # 5. Glassmorphism and softened borders
    content = content.replace('bg-[#161F2D] border border-[#2A3446]', 'backdrop-blur-md bg-[#161F2D]/60 border border-[#2A3446]/50')
    content = content.replace('border-[#222F44]', 'border-[#2A3446]/50')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

refactor_portfolio()
