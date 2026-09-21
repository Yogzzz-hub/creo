import re

with open('AdminSubPages.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

pattern1 = re.compile(r'\s*<div>\s*<div className=\"flex items-center gap-[23]\">\s*<[A-Za-z0-9]+ className=\"size-5[^\"]*\" />\s*<h1[^>]*>.*?</h1>\s*</div>\s*<p[^>]*>.*?</p>\s*</div>', re.DOTALL)
text = pattern1.sub('', text)

pattern2 = re.compile(r'\s*<h1 className=\"text-2xl lg:text-3xl font-black text-\[#0F172A\] tracking-tight\">\s*[^<]*\s*</h1>', re.DOTALL)
text = pattern2.sub('', text)

with open('AdminClientBrandPage.tsx', 'r', encoding='utf-8') as f:
    text2 = f.read()

pattern3 = re.compile(r'\s*<div>\s*<div className=\"flex items-center gap-2\">\s*<h1[^>]*>.*?</h1>\s*</div>\s*<p[^>]*>.*?</p>\s*</div>', re.DOTALL)
text2 = pattern3.sub('', text2)

with open('AdminSubPages.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

with open('AdminClientBrandPage.tsx', 'w', encoding='utf-8') as f:
    f.write(text2)
