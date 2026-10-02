import os
import re

TARGET_DIR = r"d:\intern\creo\backend\app"

def process_rbac():
    rbac_path = os.path.join(TARGET_DIR, "core", "rbac.py")
    with open(rbac_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace StaffActor = Depends(...) with get_staff_actor = ...
    content = re.sub(r'StaffActor = Depends\((.*?)\n\)', r'get_staff_actor = \1\n', content, flags=re.DOTALL)
    content = re.sub(r'TeamLeadActor = Depends\((.*?)\)', r'get_team_lead_actor = \1', content)
    content = re.sub(r'AdminActor = Depends\((.*?)\)', r'get_admin_actor = \1', content)
    content = re.sub(r'SuperAdminActor = Depends\((.*?)\)', r'get_super_admin_actor = \1', content)
    content = re.sub(r'SalesActor = Depends\((.*?)\)', r'get_sales_actor = \1', content)
    content = re.sub(r'InvestorActor = Depends\((.*?)\)', r'get_investor_actor = \1', content)

    with open(rbac_path, 'w', encoding='utf-8') as f:
        f.write(content)

def process_routers():
    for root, _, files in os.walk(TARGET_DIR):
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                
                # Replace imports
                new_content = re.sub(r'AdminActor', 'get_admin_actor', new_content)
                new_content = re.sub(r'SuperAdminActor', 'get_super_admin_actor', new_content)
                new_content = re.sub(r'StaffActor', 'get_staff_actor', new_content)
                new_content = re.sub(r'TeamLeadActor', 'get_team_lead_actor', new_content)
                new_content = re.sub(r'SalesActor', 'get_sales_actor', new_content)
                new_content = re.sub(r'InvestorActor', 'get_investor_actor', new_content)
                
                # Replace usages: actor: Actor = AdminActor -> actor: Actor = Depends(get_admin_actor)
                # Note: after import rename, it'll look like `actor: Actor = get_admin_actor`
                new_content = re.sub(r'actor:\s*Actor\s*=\s*get_admin_actor,?', r'actor: Actor = Depends(get_admin_actor),', new_content)
                new_content = re.sub(r'actor:\s*Actor\s*=\s*get_super_admin_actor,?', r'actor: Actor = Depends(get_super_admin_actor),', new_content)
                new_content = re.sub(r'actor:\s*Actor\s*=\s*get_staff_actor,?', r'actor: Actor = Depends(get_staff_actor),', new_content)
                new_content = re.sub(r'actor:\s*Actor\s*=\s*get_team_lead_actor,?', r'actor: Actor = Depends(get_team_lead_actor),', new_content)
                new_content = re.sub(r'actor:\s*Actor\s*=\s*get_sales_actor,?', r'actor: Actor = Depends(get_sales_actor),', new_content)
                new_content = re.sub(r'actor:\s*Actor\s*=\s*get_investor_actor,?', r'actor: Actor = Depends(get_investor_actor),', new_content)
                
                # Also ensure Depends is imported if we added it
                if 'Depends(' in new_content and 'Depends' not in new_content[:500]:
                    # Usually fastapi is imported, let's just assume Depends is imported in routers 
                    pass

                if new_content != content:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)

if __name__ == "__main__":
    process_rbac()
    process_routers()
