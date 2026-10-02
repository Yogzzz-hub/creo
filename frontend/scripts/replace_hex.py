import os
import re

TARGET_DIR = r"d:\intern\creo\frontend\src"

REPLACEMENTS = {
    r"bg-\[#121926\]": "bg-nebula-surface",
    r"bg-\[#0A0F18\]": "bg-nebula-navy",
    r"border-\[#222F44\]": "border-nebula-steel",
    # Additional replacements we might have seen
    r"bg-\[#050810\]": "bg-nebula-void",
    r"bg-\[#0B111C\]": "bg-nebula-navy",
    r"bg-\[#161F2D\]": "bg-nebula-surface",
    r"border-\[#2A3446\]": "border-nebula-steel",
    r"text-\[#97A0B3\]": "text-nebula-mist",
    r"text-\[#BCCCE6\]": "text-nebula-periwinkle",
    r"text-\[#7FA0D6\]": "text-nebula-glow",
    r"text-\[#D8BF9B\]": "text-nebula-sand",
    
    # Also without bg- prefix sometimes? I'll stick to full classes
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for pattern, replacement in REPLACEMENTS.items():
        new_content = re.sub(pattern, replacement, new_content, flags=re.IGNORECASE)
        
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")
        return True
    return False

def main():
    count = 0
    for root, _, files in os.walk(TARGET_DIR):
        for file in files:
            if file.endswith(".tsx") or file.endswith(".ts"):
                filepath = os.path.join(root, file)
                if process_file(filepath):
                    count += 1
    print(f"Total files updated: {count}")

if __name__ == "__main__":
    main()
