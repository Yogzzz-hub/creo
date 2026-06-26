import os
import ast
import re
import sys
import importlib
from pathlib import Path

API_DIR = Path("d:/Muksid/Ryze/creo/apps/api")
sys.path.insert(0, str(API_DIR))

results = {
    "violations": [],
    "orphans": [],
    "mocks": [],
    "endpoints": []
}

# PHASE 3: Mock Hunter
print("Running Phase 3...")
for root, dirs, files in os.walk(API_DIR):
    if "tests" in root or "__pycache__" in root or "venv" in root:
        continue
    for file in files:
        if not file.endswith(".py"):
            continue
        filepath = Path(root) / file
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                lines = f.readlines()
                for i, line in enumerate(lines):
                    if re.search(r'(mock|dummy|todo|fixme)', line, re.IGNORECASE):
                        results["mocks"].append(f"{filepath.relative_to(API_DIR)}:{i+1} - {line.strip()}")
        except Exception as e:
            pass

# PHASE 2: Orphaned logic
print("Running Phase 2...")
service_funcs = set()
worker_funcs = set()

# Find all defined functions in services/ and workers/
for folder, s_set in [("services", service_funcs), ("workers", worker_funcs)]:
    folder_path = API_DIR / folder
    if not folder_path.exists(): continue
    for root, dirs, files in os.walk(folder_path):
        if "__pycache__" in root: continue
        for file in files:
            if not file.endswith(".py") or file == "__init__.py": continue
            filepath = Path(root) / file
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    tree = ast.parse(f.read())
                    for node in ast.walk(tree):
                        if isinstance(node, ast.AsyncFunctionDef) or isinstance(node, ast.FunctionDef):
                            if not node.name.startswith("_"):
                                s_set.add(node.name)
            except Exception:
                pass

# Find all called functions in routers/
called_funcs = set()
routers_dir = API_DIR / "routers"
if routers_dir.exists():
    for root, dirs, files in os.walk(routers_dir):
        if "__pycache__" in root: continue
        for file in files:
            if not file.endswith(".py"): continue
            filepath = Path(root) / file
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    tree = ast.parse(f.read())
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Call):
                            if isinstance(node.func, ast.Name):
                                called_funcs.add(node.func.id)
                            elif isinstance(node.func, ast.Attribute):
                                called_funcs.add(node.func.attr)
            except Exception:
                pass

orphaned_services = service_funcs - called_funcs
orphaned_workers = worker_funcs - called_funcs
for func in orphaned_services:
    results["orphans"].append(f"Service function '{func}' is never called by any router.")
for func in orphaned_workers:
    results["orphans"].append(f"Worker function '{func}' is never called by any router.")

# Write output to json
import json
with open(API_DIR / "audit_output.json", "w") as f:
    json.dump(results, f, indent=2)

print("Done")
