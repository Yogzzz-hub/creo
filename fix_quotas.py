import re

file_path = 'D:/intern/creo/frontend/src/features/admin/AdminSubPages.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

def replace_plan(text, tier_name, fee, total, posts, reels, stories):
    parts = text.split('tier: "')
    new_parts = [parts[0]]
    for i in range(1, len(parts)):
        part = parts[i]
        if part.startswith(f'{tier_name} Retainer"') or part.startswith(f'{tier_name}"'):
            part = re.sub(r'monthlyFee:\s*\d+', f'monthlyFee: {fee}', part)
            part = re.sub(r'totalAssetsQuota:\s*\d+', f'totalAssetsQuota: {total}', part)
            part = re.sub(r'postsQuota:\s*\d+', f'postsQuota: {posts}', part)
            part = re.sub(r'reelsQuota:\s*\d+', f'reelsQuota: {reels}', part)
            part = re.sub(r'storiesQuota:\s*\d+', f'storiesQuota: {stories}', part)
        new_parts.append(part)
    return 'tier: "'.join(new_parts)

content = replace_plan(content, 'Starter', 25000, 22, 8, 4, 10)
content = replace_plan(content, 'Growth', 50000, 48, 18, 10, 20)
content = replace_plan(content, 'Scale', 95000, 96, 36, 20, 40)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated metrics in AdminSubPages.tsx.')
