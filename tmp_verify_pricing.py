import sqlite3
import json

DB_PATH = r'C:\Users\Yogalakshmi Baskar\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

SESSION_ID = 'ses_0b453de46ffetTJVmBjgI3hExg'

# Get all parts that are tool calls or tool results related to the Stripe fix and migration
cur.execute("""
    SELECT json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           json_extract(p.data, '$.state.input') as input_data,
           json_extract(p.data, '$.state.output') as output_data
    FROM part p
    WHERE p.session_id = ?
      AND json_extract(p.data, '$.type') = 'tool'
      AND (json_extract(p.data, '$.tool') IN ('edit', 'write'))
    ORDER BY p.time_created
""", (SESSION_ID,))

print("=== WRITE/EDIT OPERATIONS IN PRICING SESSION ===")
for row in cur.fetchall():
    tool = row['tool']
    inp = row['input_data']
    out = row['output_data']
    
    if isinstance(inp, str):
        inp = json.loads(inp) if inp else {}
    if isinstance(out, str):
        out = json.loads(out) if out else {}
    
    if tool == 'write':
        fp = inp.get('file_path', '')
        content = inp.get('content', '')[:200]
        print(f"\n  [WRITE] {fp}")
        print(f"    Content preview: {content}...")
    elif tool == 'edit':
        fp = inp.get('file_path', '')
        old = inp.get('old_string', '')[:100]
        new = inp.get('new_string', '')[:100]
        print(f"\n  [EDIT] {fp}")
        print(f"    old: {old}")
        print(f"    new: {new}")

# Also check for the task completion
cur.execute("""
    SELECT json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           json_extract(p.data, '$.state.input') as input_data,
           json_extract(p.data, '$.state.output') as output_data
    FROM part p
    WHERE p.session_id = ?
      AND json_extract(p.data, '$.type') = 'tool'
      AND json_extract(p.data, '$.tool') = 'task'
    ORDER BY p.time_created
""", (SESSION_ID,))

print("\n\n=== TASK OPERATIONS ===")
for row in cur.fetchall():
    inp = row['input_data']
    out = row['output_data']
    if isinstance(inp, str):
        inp = json.loads(inp) if inp else {}
    if isinstance(out, str):
        out = json.loads(out) if out else {}
    op = inp.get('operation', {})
    print(f"  Task {op.get('action', '?')}: {op.get('summary', op.get('id', ''))} -> {out}")

# Check final text output
cur.execute("""
    SELECT json_extract(p.data, '$.text') as text
    FROM part p
    WHERE p.session_id = ?
      AND json_extract(p.data, '$.type') = 'text'
    ORDER BY p.time_created DESC
    LIMIT 3
""", (SESSION_ID,))
print("\n\n=== FINAL TEXT OUTPUTS ===")
for row in cur.fetchall():
    text = row['text'] or ''
    if text.strip():
        print(f"  {text[:500]}")
        print()

conn.close()
