import os

filepath = r'd:\intern\creo\frontend\src\pages\portal\PortalDashboardPage.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_block(start_marker, end_marker):
    start = -1
    end = -1
    for i, l in enumerate(lines):
        if start_marker in l:
            start = i
        if end_marker in l and start != -1:
            end = i
            break
    if start == -1 or end == -1:
        print(f"Error finding {start_marker} or {end_marker}")
        return []
    return lines[start:end+1]

# The file structure in the return block:
# Top Section (Profile, Retainer)
# Middle Section (Pod, Notifications)
# Content Calendar
# Deliverables & Support

top_section = get_block('{/* BEGIN: Top Section - Profile & Enterprise Retainer Plan */}', '{/* END: Top Section */}')
middle_section = get_block('{/* BEGIN: Middle Section - Creative Pod & Notifications */}', '{/* END: Middle Section */}')
calendar_section = get_block('{/* BEGIN: Content Calendar Section */}', '{/* END: Content Calendar Section */}')
deliv_support_section = get_block('{/* BEGIN: Deliverables & Support Section */}', '{/* END: Deliverables & Support Section */}')

# Swap Profile and Plan Details in Top Section
# Profile: <div className="lg:col-span-4 bg-white ... data-purpose="user-profile-card"> (Starts ~222, ends before 355)
# Plan: <div className="lg:col-span-8 card-surface ... data-purpose="active-retainer-card"> (Starts ~355, ends before 569)

profile_start, profile_end = -1, -1
plan_start, plan_end = -1, -1

for i, l in enumerate(top_section):
    if 'data-purpose="user-profile-card"' in l:
        profile_start = i
    if 'data-purpose="active-retainer-card"' in l:
        profile_end = i - 1
        plan_start = i
    if '</section>' in l:
        if plan_end == -1 and plan_start != -1:
            plan_end = i - 1

if profile_start != -1 and plan_start != -1:
    profile_block = top_section[profile_start:profile_end+1]
    plan_block = top_section[plan_start:plan_end+1]
    
    # Reassemble top section with Plan first, then Profile
    new_top_section = top_section[:profile_start] + plan_block + profile_block + top_section[plan_end+1:]
else:
    new_top_section = top_section

# Reassemble main return block
start_idx = -1
end_idx = -1
for i, l in enumerate(lines):
    if '{/* BEGIN: Top Section - Profile & Enterprise Retainer Plan */}' in l:
        start_idx = i
    if '{/* END: Deliverables & Support Section */}' in l:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    prefix = lines[:start_idx]
    suffix = lines[end_idx+1:]
    
    new_lines = prefix + calendar_section + deliv_support_section + new_top_section + middle_section + suffix
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Successfully reordered dashboard")
else:
    print("Could not find start or end index for replacement")
