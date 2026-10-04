file_path = 'D:/intern/creo/frontend/src/features/admin/AdminSubPages.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start = -1
for i, line in enumerate(lines):
    if 'w-72 border-r' in line or 'clientList.map' in line:
        start = i - 10
        break

if start != -1:
    for i in range(max(0, start), min(len(lines), start + 60)):
        print(f"{i+1}: {lines[i].strip()}")
