import re

# 1. AdminSubPages.tsx
file_path = 'D:/intern/creo/frontend/src/features/admin/AdminSubPages.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove `clientsData` dictionary entirely
# It starts at `const clientsData: Record<string, ClientDetailData> = {` and ends before `const mergedClientsData:`
new_content = re.sub(
    r'const clientsData: Record<string, ClientDetailData> = \{.*?\n  };\n\n  const mergedClientsData:',
    r'const mergedClientsData:',
    content,
    flags=re.DOTALL
)

# Remove `...clientsData, ` from `mergedClientsData`
new_content = new_content.replace(
    'const mergedClientsData: Record<string, ClientDetailData> = { ...clientsData, ...customClients };',
    'const mergedClientsData: Record<string, ClientDetailData> = { ...customClients };'
)

# Remove fallback to ryze
new_content = new_content.replace(
    'mergedClientsData.ryze ||\n      clientList[0]',
    'clientList[0]'
)

# We also need to fix ryze in Link tags, e.g. `activeClient?.id || "ryze"` -> `activeClient?.id || ""`
new_content = new_content.replace(
    'activeClient?.id || "ryze"',
    'activeClient?.id || ""'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Updated AdminSubPages.tsx')

# 2. AdminSupportTicketsPage.tsx
file2 = 'D:/intern/creo/frontend/src/features/admin/AdminSupportTicketsPage.tsx'
with open(file2, 'r', encoding='utf-8') as f:
    content2 = f.read()

# Remove DEFAULT_INITIAL_TICKETS mock list
content2 = re.sub(
    r'const DEFAULT_INITIAL_TICKETS: TicketItem\[\] = \[.*?\n\];\n',
    'const DEFAULT_INITIAL_TICKETS: TicketItem[] = [];\n',
    content2,
    flags=re.DOTALL
)

with open(file2, 'w', encoding='utf-8') as f:
    f.write(content2)
print('Updated AdminSupportTicketsPage.tsx')
