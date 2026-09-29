import re

filepath = r'd:\creo-main\frontend\src\pages\public\ClientsPage.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the Creative Workflows array
old_workflows = """          {[
            { title: 'Motion & 3D Pod', desc: '3D motion, CGI, virtual production, product demos.', img: 'https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=600&q=80', badge: 'VIDEO' },
            { title: 'High-Velocity DTC Creative', desc: 'Short-form, social, paid media, performance creative.', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80', badge: 'VIDEO' },
            { title: 'Brand & Design Architecture', desc: 'Visual identity, brand systems, motion design.', img: 'https://images.unsplash.com/photo-1502672260266-1c1c24240f38?auto=format&fit=crop&w=600&q=80', badge: 'DESIGN' },
            { title: 'Performance Ad Operations', desc: 'Creative testing, scaling, reporting, optimization.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80', badge: 'OPS' },
            { title: 'Enterprise Creative Ops', desc: 'Workflow management, stakeholder sync, delivery.', img: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80', badge: 'OPS' },
            { title: 'Post-Production House', desc: 'Edit, color, sound, VFX, final mastering.', img: 'https://images.unsplash.com/photo-1579227114347-15d08fc37cae?auto=format&fit=crop&w=600&q=80', badge: 'POST' }
          ].map(card => ("""

new_workflows = """          {[
            { title: 'Motion & 3D Pod', desc: '3D motion, CGI, virtual production, product demos.', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80', badge: 'VIDEO' },
            { title: 'High-Velocity DTC Creative', desc: 'Short-form, social, paid media, performance creative.', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', badge: 'VIDEO' },
            { title: 'Brand & Design Architecture', desc: 'Visual identity, brand systems, motion design.', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80', badge: 'DESIGN' },
            { title: 'Performance Ad Operations', desc: 'Creative testing, scaling, reporting, optimization.', img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80', badge: 'OPS' },
            { title: 'Enterprise Creative Ops', desc: 'Workflow management, stakeholder sync, delivery.', img: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80', badge: 'OPS' },
            { title: 'Post-Production House', desc: 'Edit, color, sound, VFX, final mastering.', img: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80', badge: 'POST' }
          ].map(card => ("""

content = content.replace(old_workflows, new_workflows)

# Update card preview images style
old_card_img = """              <div className="relative h-40 rounded-xl overflow-hidden mb-5">
                <img src={card.img} alt={card.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute top-3 right-3 bg-[#050810]/80 backdrop-blur-sm border border-[#2A3446] px-2 py-1 rounded text-[9px] font-bold text-[#F8FAFC]">
                  {card.badge}
                </div>
              </div>"""

new_card_img = """              <div className="relative mb-5">
                <img src={card.img} alt={card.title} className="w-full h-44 object-cover rounded-xl border border-[#2A3446]/40 transition-transform duration-500 hover:scale-[1.02]" />
                <div className="absolute top-3 right-3 bg-[#050810]/80 backdrop-blur-sm border border-[#2A3446] px-2 py-1 rounded text-[9px] font-bold text-[#F8FAFC]">
                  {card.badge}
                </div>
              </div>"""

content = content.replace(old_card_img, new_card_img)

# 2. Add Cinematic Backdrop to Video Deliverable Review Cockpit
old_video_player = """            <div className="bg-[#050810] border border-[#2A3446]/50 rounded-2xl overflow-hidden relative group aspect-video">
              <img src="https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=1200&q=80" alt="Video Player" className="w-full h-full object-cover opacity-80" />"""

new_video_player = """            <div className="bg-[#050810] border border-[#2A3446]/50 rounded-2xl overflow-hidden relative group aspect-video">
              <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80" alt="Video Player" className="absolute inset-0 w-full h-full object-cover opacity-80" />"""

content = content.replace(old_video_player, new_video_player)

# Also check the 3 "Related Assets" thumbnails at the bottom right
old_assets = """                {[
                  { name: 'NOSTIC_Logo_v2.png', size: '2.4 MB', img: 'https://images.unsplash.com/photo-1614729939124-03290b5609ce?auto=format&fit=crop&w=100&q=80' },
                  { name: 'Behind the Scenes.mp4', size: '1.2 GB', img: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=100&q=80' },
                  { name: 'Final Cut v3.mov', size: '890 MB', img: 'https://images.unsplash.com/photo-1502672260266-1c1c24240f38?auto=format&fit=crop&w=100&q=80' }
                ].map(asset => ("""

new_assets = """                {[
                  { name: 'NOSTIC_Logo_v2.png', size: '2.4 MB', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80' },
                  { name: 'Behind the Scenes.mp4', size: '1.2 GB', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80' },
                  { name: 'Final Cut v3.mov', size: '890 MB', img: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=100&q=80' }
                ].map(asset => ("""

content = content.replace(old_assets, new_assets)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
