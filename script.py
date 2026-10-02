import os
import re

replacements = {
    '#050810': 'nebula-void',
    '#0B111C': 'nebula-navy',
    '#0b111c': 'nebula-navy',
    '#161F2D': 'nebula-surface',
    '#161f2d': 'nebula-surface',
    '#2A3446': 'nebula-steel',
    '#2a3446': 'nebula-steel',
    '#97A0B3': 'nebula-mist',
    '#97a0b3': 'nebula-mist',
    '#BCCCE6': 'nebula-periwinkle',
    '#bccce6': 'nebula-periwinkle',
    '#7FA0D6': 'nebula-glow',
    '#7fa0d6': 'nebula-glow',
    '#D8BF9B': 'nebula-sand',
    '#d8bf9b': 'nebula-sand',
    '#F1F5F9': 'slate-100',
    '#f1f5f9': 'slate-100',
    '#F8FAFC': 'slate-50',
    '#f8fafc': 'slate-50'
}

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = content
    for hex_code, token in replacements.items():
        pattern = r'-\[' + re.escape(hex_code) + r'\]'
        new_content = re.sub(pattern, f'-{token}', new_content)
        new_content = new_content.replace('"' + hex_code + '"', '"var(--color-' + token + ')"')
        new_content = new_content.replace("'" + hex_code + "'", "'var(--color-" + token + ")'")

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def process_dir(dir_path):
    count = 0
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                if replace_in_file(os.path.join(root, file)):
                    count += 1
    print(f'Updated {count} files.')

process_dir('d:/intern/creo/frontend/src')
