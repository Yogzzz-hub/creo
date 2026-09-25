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
    if start == -1 or end == -1: return []
    return lines[start:end+1]

# Revert to original blocks using the standard start/end markers
start_idx = -1
end_idx = -1
for i, l in enumerate(lines):
    if '{/* BEGIN: Content Calendar Section */}' in l:
        if start_idx == -1: start_idx = i
    if '{/* END: Top Section */}' in l: # Since we reordered, Top Section is at the bottom now
        end_idx = i

calendar_block = get_block('{/* BEGIN: Content Calendar Section */}', '{/* END: Content Calendar Section */}')

# Extract deliverables block exactly from the current file
deliverables_start = -1
deliverables_end = -1
for i, l in enumerate(lines):
    if 'data-purpose="deliverables-card"' in l:
        deliverables_start = i
    if 'data-purpose="support-tickets-card"' in l:
        deliverables_end = i - 1
        break
deliverables_block = "".join(lines[deliverables_start:deliverables_end+1])

support_simplified = '''
          <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 sm:p-8 flex flex-col group/support hover:shadow-lg hover:border-blue-100/60 transition-all duration-500" data-purpose="support-tickets-card">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">Support Tickets</h2>
                <div className="inline-flex rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-1.5 animate-pulse"></span>
                  2-Hour SLA Guarantee
                </div>
              </div>
              <Link to="/portal/support" className="text-xs font-black text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-xs hover:shadow cursor-pointer shrink-0">
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                New Request
              </Link>
            </div>
            
            <div className="flex-1 flex flex-col justify-center items-center py-6 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              <h3 className="text-sm font-bold text-slate-900">1 Active Ticket</h3>
              <p className="text-xs text-slate-500 mt-1">API Webhook Timeout on Instagram Publisher</p>
            </div>

            <div className="mt-auto pt-5 border-t border-slate-100/90">
              <Link to="/portal/support" className="w-full py-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-2">
                View All Support Tickets
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </Link>
            </div>
          </div>
'''

pod_simplified = '''
          <div className="lg:col-span-7 card-surface card-interactive p-6 sm:p-7 flex flex-col" data-purpose="creative-pod-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Dedicated Creative Pod</h2>
                <span className="min-w-[22px] h-5.5 px-2 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold flex items-center justify-center shadow-xs">
                  3 Online
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-6">Your dedicated team of specialists for Northwind Labs.</p>
            
            <div className="flex items-center gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white relative z-30">TL</div>
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white relative z-20">VE</div>
                <div className="w-10 h-10 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center border-2 border-white relative z-10">GD</div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Vikram M., Karthik R., Ananya D.</p>
                <p className="text-[11px] text-slate-500 font-medium">Team Lead, Video Editor, Graphic Designer</p>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100/90">
              <Link to="/portal/creative-pod" className="w-full py-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-2">
                Manage Creative Pod
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </Link>
            </div>
          </div>
'''

notifications_simplified = '''
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 sm:p-7 flex flex-col relative overflow-hidden group hover:shadow-lg hover:border-blue-100/60 transition-all duration-500" data-purpose="notifications-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Notifications</h2>
                <span className="min-w-[22px] h-5.5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-extrabold flex items-center justify-center shadow-md shadow-rose-500/20">
                  {unreadCount}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-6">Real-time updates for your active projects.</p>

            <div className="flex-1 flex flex-col justify-center">
              {unreadCount > 0 ? (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100/50">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">New Deliverable Uploaded</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Northwind Enterprise 3D Tech Demo</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm font-semibold text-slate-500">All caught up!</p>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100/90">
              <button className="w-full py-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer">
                View All Notifications
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          </div>
'''

plan_simplified = '''
          <div className="lg:col-span-8 card-surface card-interactive p-6 sm:p-8 flex flex-col" data-purpose="active-retainer-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">Growth Accelerator</h2>
                <div className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider items-center justify-center bg-blue-50 text-blue-700 border border-blue-100 shadow-xs">
                  Active Retainer
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-slate-900">₹90,000<span className="text-sm text-slate-500 font-medium">/mo</span></div>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Renews Oct 1, 2026</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 font-medium mb-6 max-w-md">Comprehensive brand scaling pipeline with dedicated pod resources.</p>

            <div className="mt-auto pt-5 border-t border-slate-100/90">
              <Link to="/portal/payments" className="w-full py-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-2">
                Manage Subscription Details
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </Link>
            </div>
          </div>
'''

profile_simplified = '''
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-100/80 shadow-sm p-6 sm:p-7 flex flex-col relative overflow-hidden group hover:shadow-lg hover:border-blue-100/60 transition-all duration-500" data-purpose="user-profile-card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-blue-500/30 shrink-0 border-2 border-white">
                {user?.full_name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{user?.full_name || 'Sarah Chen'}</h2>
                <p className="text-xs text-slate-500 font-medium">{user?.email || 'sarah@northwindlabs.com'}</p>
                <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block mt-1">Northwind Labs</p>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100/90">
              <Link to="/portal/account" className="w-full py-3 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold transition-colors flex items-center justify-center gap-2">
                View Profile Settings
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </Link>
            </div>
          </div>
'''

new_layout = f"""
        {"".join(calendar_block)}
        
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" data-purpose="deliverables-support-grid">
{deliverables_block}
{support_simplified}
        </section>
        
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" data-purpose="team-and-notifications-grid">
{pod_simplified}
{notifications_simplified}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" data-purpose="top-overview-grid">
{plan_simplified}
{profile_simplified}
        </section>
"""

out = "".join(lines[:start_idx]) + new_layout + "".join(lines[end_idx+1:])

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(out)
