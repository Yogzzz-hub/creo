import sqlite3
import json
import os

DB_PATH = r'C:\Users\Yogalakshmi Baskar\.local\share\mimocode\mimocode.db'
MEMORY_ROOT = r'C:\Users\Yogalakshmi Baskar\.local\share\mimocode\memory\sessions'
PROJECT_ID = 'b154e7f5-cd95-4096-b8ae-993a14397faf'

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# Get all real sessions for this project (not checkpoint-writer, not dream)
cur.execute("""
    SELECT id, title, time_created
    FROM session
    WHERE project_id = ?
      AND title NOT LIKE 'checkpoint-writer%'
      AND title NOT LIKE 'Auto Dream%'
    ORDER BY time_created DESC
    LIMIT 20
""", (PROJECT_ID,))
sessions = cur.fetchall()

print("=== CHECKING SESSION NOTES FOR DURABLE KNOWLEDGE ===")
for s in sessions:
    sid = s['id']
    notes_path = os.path.join(MEMORY_ROOT, sid, 'notes.md')
    if os.path.exists(notes_path):
        with open(notes_path, 'r', encoding='utf-8') as f:
            content = f.read()
        if len(content) > 100:  # Has actual content beyond header
            print(f"\n--- {sid[:20]}... ({s['title'][:50]}) ---")
            print(f"  Notes size: {len(content)} bytes")
            # Print first 500 chars
            print(f"  Preview: {content[:500]}")

# Also check task progress files
print("\n\n=== CHECKING TASK PROGRESS FILES ===")
for s in sessions:
    sid = s['id']
    tasks_dir = os.path.join(MEMORY_ROOT, sid, 'tasks')
    if os.path.exists(tasks_dir):
        for task_dir in os.listdir(tasks_dir):
            progress_path = os.path.join(tasks_dir, task_dir, 'progress.md')
            if os.path.exists(progress_path):
                with open(progress_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                print(f"\n--- {sid[:20]}/tasks/{task_dir} ---")
                print(f"  Size: {len(content)} bytes")
                print(f"  Preview: {content[:300]}")

conn.close()
