import os

account_page_path = 'd:/intern/creo/frontend/src/pages/portal/PortalAccountPage.tsx'
brand_dna_page_path = 'd:/intern/creo/frontend/src/pages/portal/PortalBrandDNAPage.tsx'
app_tsx_path = 'd:/intern/creo/frontend/src/app/App.tsx'

with open(account_page_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will just write a simple PortalBrandDNAPage.tsx
brand_page_content = content.replace('export function PortalAccountPage()', 'export function PortalBrandDNAPage()')
brand_page_content = brand_page_content.replace('const tab = searchParams.get("tab") || "settings";', 'const tab = "brand";')
brand_page_content = brand_page_content.replace('const isBrandTab = tab === "brand" || tab === "edit-brand";', 'const isBrandTab = True;')

with open(brand_dna_page_path, 'w', encoding='utf-8') as f:
    f.write(brand_page_content)

# Update App.tsx to include PortalBrandDNAPage
with open(app_tsx_path, 'r', encoding='utf-8') as f:
    app_content = f.read()

app_content = app_content.replace('  PortalAccountPage,', '  PortalAccountPage,\n  PortalBrandDNAPage,')
app_content = app_content.replace('<Route path="account" element={<PortalAccountPage />} />', '<Route path="account" element={<PortalAccountPage />} />\n                <Route path="brand" element={<PortalBrandDNAPage />} />')

with open(app_tsx_path, 'w', encoding='utf-8') as f:
    f.write(app_content)

print("Created PortalBrandDNAPage.tsx and updated App.tsx")
