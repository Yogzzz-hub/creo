import subprocess

# 1. Reset the file
subprocess.run(['python', r'd:\intern\creo\backend\scratch\transform.py'], check=True)

with open(r'd:\intern\creo\jsx_dashboard.txt', 'r', encoding='utf-8') as f:
    html = f.read()

# We need to extract the EXACT blocks to replace.
# In jsx_dashboard.txt, let's just find the start and end by exact string search.

def get_exact_block(start_str, end_str):
    start = html.find(start_str)
    if start == -1:
        raise ValueError(f"Could not find start: {start_str}")
    end = html.find(end_str, start)
    if end == -1:
        raise ValueError(f"Could not find end: {end_str}")
    end += len(end_str)
    return html[start:end]

# Specialists block: starts at {/* Specialist 1 */} and ends after the </div> of Specialist 3
# In jsx_dashboard.txt, Specialist 3 ends with:
# <span className="badge-pill bg-slate-100 text-slate-500 text-[10px]">Performance Strategist</span>
# </div>
# Wait, actually let's just replace the inside of the Specialists list.
# The container has <div className="space-y-1 mt-4">
spec_container_start = html.find('<div className="space-y-1 mt-4">')
if spec_container_start != -1:
    spec_start = html.find('{/* Specialist 1 */}', spec_container_start)
    spec_end_str = '</span>\n</div>'
    spec_end = html.find(spec_end_str, html.find('{/* Specialist 3 */}')) + len(spec_end_str)
    spec_block = html[spec_start:spec_end]
else:
    raise ValueError("Spec container not found")

# Notifications block:
notif_start = html.find('{/* Notification 1 */}')
notif_end_str = '</button>\n</div>'
# Notification 4 ends with </button></div>
notif_end = html.find(notif_end_str, html.find('{/* Notification 4 */}')) + len(notif_end_str)
notif_block = html[notif_start:notif_end]

# Calendar block:
cal_start = html.find('{/* Row 1 */}')
cal_end_str = '</a>\n</td>\n</tr>'
cal_end = html.find(cal_end_str, html.find('{/* Row 3 */}')) + len(cal_end_str)
cal_block = html[cal_start:cal_end]

# Now read the generated PortalDashboardPage.tsx
with open(r'd:\intern\creo\frontend\src\pages\portal\PortalDashboardPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_specialists = '''{specialists.slice(0, 3).map((spec, i) => (
  <div key={spec.id || i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[11px]">
        {spec.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-800">{spec.name}</h4>
        <p className="text-[11px] text-slate-500">{spec.role}</p>
      </div>
    </div>
    <span className="badge-pill bg-slate-100 text-slate-500 text-[10px]">Active</span>
  </div>
))}
{specialists.length === 0 && (
  <p className="text-xs text-slate-500 italic">No dedicated specialists assigned yet.</p>
)}'''

new_notifications = '''{pendingCount > 0 && (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start justify-between relative group hover:border-slate-200 transition">
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-800 leading-snug">Deliverable sign-off requested</h4>
        <p className="text-[11px] text-slate-500 mt-0.5">{pendingCount} deliverables ready for review.</p>
      </div>
    </div>
    <Link to="/portal/deliverables" className="text-blue-600 text-[10px] font-bold hover:underline mt-1">View</Link>
  </div>
)}
{ticketCount > 0 && (
  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-start justify-between relative group hover:border-slate-200 transition">
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
      </div>
      <div>
        <h4 className="text-xs font-bold text-slate-800 leading-snug">Open Support Tickets</h4>
        <p className="text-[11px] text-slate-500 mt-0.5">{ticketCount} tickets await response or review.</p>
      </div>
    </div>
    <Link to="/portal/support" className="text-blue-600 text-[10px] font-bold hover:underline mt-1">View</Link>
  </div>
)}
{pendingCount === 0 && ticketCount === 0 && (
  <p className="text-xs text-slate-500 italic p-3 text-center">No new notifications.</p>
)}'''

new_calendar = '''{rawEntries.length === 0 ? (
  <tr><td colSpan={5} className="py-8 text-center text-xs text-slate-500 italic">No upcoming calendar entries.</td></tr>
) : rawEntries.slice(0, 4).map((entry, i) => (
  <tr key={entry.id || i} className="hover:bg-slate-50/60 transition border-b border-slate-100 last:border-0">
    <td className="py-3.5 pr-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path></svg>
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-xs">{entry.title || "Untitled Deliverable"}</h3>
          <p className="text-[11px] text-slate-400">{entry.type || "Content"} • {entry.file_type || "N/A"}</p>
        </div>
      </div>
    </td>
    <td className="py-3.5 pr-4">
      <p className="font-bold text-slate-800">{new Date(entry.date).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</p>
      <p className="text-[11px] text-slate-400">{entry.scheduled_at || entry.scheduled_time || "TBD"}</p>
    </td>
    <td className="py-3.5 pr-4 font-medium text-slate-700">
      {lead?.name || "Pod Alpha"}
    </td>
    <td className="py-3.5 pr-4">
      <span className="badge-pill bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>{entry.status}
      </span>
    </td>
    <td className="py-3.5 text-right font-semibold">
      {entry.file_url ? (
        <a className="text-blue-600 hover:underline" href={entry.file_url} target="_blank" rel="noreferrer">View Asset</a>
      ) : (
        <span className="text-slate-400">Processing</span>
      )}
    </td>
  </tr>
))}'''

# Since transform.py might have modified class= to className= and style="",
# the blocks from html (which is jsx_dashboard.txt) will NOT strictly match content (which is PortalDashboardPage.tsx).
# Wait! transform.py did replace class= with className= on react_code AFTER it read jsx_dashboard.txt!
# Therefore, if I apply replace('class=', 'className=') to my spec_block before replacing, it WILL match!

def prepare_block(b):
    import re
    # Match what transform.py does exactly
    def fix_style(m):
        parts = []
        for p in m.group(1).split(';'):
            if ':' in p:
                k, v = p.split(':', 1)
                k = k.strip()
                v = v.strip()
                if '-' in k:
                    comps = k.split('-')
                    k = comps[0] + ''.join(c.capitalize() for c in comps[1:])
                parts.append(f"{k}: '{v}'")
        return "style={{" + ", ".join(parts) + "}}"
    b = re.sub(r'style="([^"]+)"', fix_style, b)
    b = b.replace('class=', 'className=')
    return b

spec_block = prepare_block(spec_block)
notif_block = prepare_block(notif_block)
cal_block = prepare_block(cal_block)

def do_replace(c, src, dest, name):
    if src not in c:
        print(f"WARNING: Could not find {name} in target file!")
        print(f"Length of {name}: {len(src)}")
        print(f"Start of {name}: {repr(src[:100])}")
        print(f"End of {name}: {repr(src[-100:])}")
        raise ValueError(f"Block mismatch for {name}")
    return c.replace(src, dest, 1)

content = do_replace(content, spec_block, new_specialists, "Specialists")
content = do_replace(content, notif_block, new_notifications, "Notifications")
content = do_replace(content, cal_block, new_calendar, "Calendar")

# Dynamic text mapping
content = content.replace('>David K.<', '>{user?.full_name || "Partner"}<')
content = content.replace('>VP of Marketing<', '>{user?.role === "client" ? "Brand Partner" : (user?.role || "Team Member")}<')
content = content.replace('>Northwind Labs Inc.<', '>{dashboard?.brand_summary || "Brand Workspace"}<')
content = content.replace('>david@northwindlabs.com<', '>{user?.email || "No Email"}<')
content = content.replace('>ACTIVE CLIENT<', '>{user?.account_status?.toUpperCase() || "ACTIVE"}<')
content = content.replace('>\n              D\n            <', '>\n              {user?.full_name?.[0]?.toUpperCase() || "P"}\n            <')

content = content.replace('>Enterprise Growth Tier<', '>{dashboard?.active_plan?.name || "Creative Retainer"}<')
content = content.replace('>ACTIVE RETAINER<', '>{subscriptionActive ? "ACTIVE RETAINER" : "NO ACTIVE PLAN"}<')
content = content.replace('>$8,500<', '>{(dashboard?.active_plan as any)?.price_minor ? "$" + ((dashboard?.active_plan as any)?.price_minor / 100).toLocaleString() : "---"}<')
content = content.replace('>124 / 160 hrs<', '>{subscriptionActive ? "124 / 160 hrs" : "0 / 0 hrs"}<')
content = content.replace('style={{width: \'77.5%\'}}', 'style={{width: subscriptionActive ? "77.5%" : "0%"}}')
content = content.replace('>4 Parallel<', '>{subscriptionActive ? "4 Parallel" : "0 Parallel"}<')

content = content.replace('>Maya Lin<', '>{lead?.name || "Maya Lin"}<')
content = content.replace('>\n                  ML\n                <', '>\n                  {lead?.name ? lead.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() : "ML"}\n                <')

content = content.replace('<span className="absolute top-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border-2 border-white">3</span>', '<span className="absolute top-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white border-2 border-white">{pendingCount + ticketCount}</span>')
content = content.replace('<span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">3</span>', '<span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{pendingCount + ticketCount}</span>')
content = content.replace('View All Notifications (18)', 'View All Notifications ({pendingCount + ticketCount})')

with open(r'd:\intern\creo\frontend\src\pages\portal\PortalDashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done successfully!")
