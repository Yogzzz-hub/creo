import sqlite3
import json

DB_PATH = r'C:\Users\Yogalakshmi Baskar\.local\share\mimocode\mimocode.db'
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

SESSION_ID = 'ses_0b453de46ffetTJVmBjgI3hExg'

# Get all messages and parts for this session
cur.execute("""
    SELECT m.id as msg_id, m.agent_id, m.time_created as msg_time,
           json_extract(m.data, '$.role') as role,
           p.id as part_id, p.time_created as part_time,
           json_extract(p.data, '$.type') as part_type,
           json_extract(p.data, '$.tool') as tool,
           p.data as part_data
    FROM message m
    JOIN part p ON p.message_id = m.id
    WHERE m.session_id = ?
    ORDER BY m.time_created, p.time_created
""", (SESSION_ID,))

print(f"=== SESSION: {SESSION_ID} ===")
current_msg = None
for row in cur.fetchall():
    if row['msg_id'] != current_msg:
        current_msg = row['msg_id']
        role = row['role'] or 'unknown'
        agent = row['agent_id'] or 'main'
        print(f"\n--- Message {current_msg} (role={role}, agent={agent}) ---")
    
    ptype = row['part_type']
    if ptype == 'text':
        data = json.loads(row['part_data'])
        text = data.get('text', '')
        if text.strip():
            print(f"  [TEXT] {text[:500]}")
    elif ptype == 'tool':
        data = json.loads(row['part_data'])
        tool = data.get('tool', '?')
        state = data.get('state', {})
        inp = state.get('input', {})
        out = state.get('output', '')
        if isinstance(out, str):
            out_preview = out[:300]
        elif isinstance(out, dict):
            out_preview = json.dumps(out)[:300]
        else:
            out_preview = str(out)[:300]
        print(f"  [TOOL:{tool}] input={json.dumps(inp)[:200]} output={out_preview}")
    elif ptype == 'step-start':
        print(f"  [STEP-START]")
    elif ptype == 'step-finish':
        data = json.loads(row['part_data'])
        tokens = data.get('tokens', '?')
        print(f"  [STEP-FINISH] tokens={tokens}")

conn.close()
