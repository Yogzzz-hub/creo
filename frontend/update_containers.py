import os
import re

PORTAL_DIR = "d:/intern/creo/frontend/src/pages/portal"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We want to replace common patterns that look like top-level wrappers with the exact one from the Dashboard.
    
    # 1. max-w-[1600px] or max-w-6xl or max-w-7xl
    # We will look for <div className="... max-w-[1600px] ..." and replace the sizing with max-w-[1440px] mx-auto px-4 md:px-8
    
    # PortalSupportPage.tsx
    content = content.replace(
        'className="mx-auto max-w-[1600px] animate-page-in space-y-6"',
        'className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8"'
    )
    content = content.replace(
        'className="mx-auto max-w-[1600px] animate-page-in space-y-6 pb-10"',
        'className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8 pb-10"'
    )
    
    # PortalCreativePodPage.tsx
    content = content.replace(
        'className="space-y-5 animate-page-in max-w-[1600px] mx-auto"',
        'className="animate-page-in space-y-5 max-w-[1440px] mx-auto px-4 md:px-8"'
    )
    content = content.replace(
        'className="space-y-6 animate-page-in mx-auto max-w-[1600px] pb-10"',
        'className="animate-page-in space-y-6 max-w-[1440px] mx-auto px-4 md:px-8 pb-10"'
    )

    # PortalPaymentsPage.tsx
    content = content.replace(
        'className="relative mx-auto max-w-6xl space-y-5 pb-6"',
        'className="relative animate-page-in space-y-5 max-w-[1440px] mx-auto px-4 md:px-8 pb-6"'
    )

    # PortalDeliverablesPage.tsx
    content = content.replace(
        'className="mx-auto max-w-6xl space-y-4 sm:space-y-5 animate-page-in"',
        'className="animate-page-in space-y-4 sm:space-y-5 max-w-[1440px] mx-auto px-4 md:px-8"'
    )

    # PortalCalendarPage.tsx
    content = content.replace(
        'className="flex flex-col h-[calc(100vh-104px)] max-w-7xl mx-auto w-full animate-page-in"',
        'className="flex flex-col h-[calc(100vh-104px)] max-w-[1440px] mx-auto px-4 md:px-8 w-full animate-page-in"'
    )

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for filename in os.listdir(PORTAL_DIR):
    if filename.endswith(".tsx") and filename != "PortalDashboardPage.tsx":
        process_file(os.path.join(PORTAL_DIR, filename))

print("Containers updated successfully")
