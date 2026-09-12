# 🚀 Creo — Digital Marketing Agency & Operations Platform

Creo is an end-to-end full-stack SaaS platform designed for high-growth direct-to-consumer (D2C) brands and digital agencies. It streamlines client onboarding, brand DNA analysis, recurring monthly retainers, social content calendar dispatch, and internal creative operations (video editing, static posters, motion stories, and QA review).

---

## 🏛 Canonical Production Architecture

| Component | Final Choice | Purpose / Role |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite + TypeScript | High-performance SPA with client-side routing & micro-animations |
| **Frontend Hosting** | **Cloudflare Pages** | Worldwide edge delivery, $0 bandwidth fees, instant git deploys |
| **DNS / CDN / WAF** | **Cloudflare Free** | Global DDoS mitigation, free SSL, edge caching, and fast routing |
| **Backend** | **FastAPI (Python 3.11+)** | High-throughput async API, Pydantic v2 validation, AI pipelines |
| **Backend Hosting** | **Render** (`creo-dsxr.onrender.com`) | Managed Python container hosting with continuous git deploy |
| **Database** | **Supabase PostgreSQL** | Relational data, RLS security, transaction pooler (`ap-southeast-1`) |
| **Authentication** | **Supabase Auth + Google OAuth** | Dual-redirect authentication, JWT sessions with role-based access |
| **Cache & Queue** | **Upstash Redis Free** | Ephemeral cache, token revocation, rate limiting & message queue |
| **Media Storage** | **Cloudflare R2** (Bucket `creo`) | 5 TB media storage with **$0 network egress fees** |
| **Upload Flow** | **Direct Browser-to-R2 (Pre-signed PUT)** | Offloads large video/reel uploads from backend server |
| **Media Delivery** | **Private Pre-Signed GET (15-min TTL)** | Strict multi-tenant security with zero public bucket exposure |
| **Background Jobs** | **FastAPI Background Tasks & Celery** | Async notification dispatch, email delivery, and media indexing |
| **Payments** | **Razorpay** | Monthly retainer subscriptions and instant add-on credits |
| **CI / CD** | **GitHub Actions** | Automated linting, type validation, unit tests, and build checks |
| **Monitoring** | **UptimeRobot Free + Provider Logs** | Continuous endpoint health tracking (`/health` & `/api/v1/health`) |

---

### 💰 Monthly Operating Cost Breakdown (2,000 Active Clients)

| Infrastructure Item | Monthly Cost | Budget Tier (< ₹4,000/mo) |
| :--- | :--- | :--- |
| Cloudflare Pages | **₹0** (Free tier) | ₹0 |
| Cloudflare DNS / CDN / WAF | **₹0** (Free tier) | ₹0 |
| FastAPI Backend (Render) | **₹600 – ₹1,500** | ₹600 |
| Supabase PostgreSQL & Auth | **₹0 – ₹2,500** | ₹0 (Free tier / Pro when scaled) |
| Upstash Redis (Cache / Queue) | **₹0** (Free tier 10k cmd/day) | ₹0 |
| Cloudflare R2 Media Storage | **~₹7,100** (5 TB media) | **~₹1,500 – ₹2,000** (1 TB media) |
| UptimeRobot Monitoring | **₹0** (Free tier) | ₹0 |
| **Total Estimated Operating Cost** | **₹8,000 – ₹11,000 / month** | **< ₹4,000 / month** |

---

## 🏗 Directory Structure

```
creo/
├── frontend/                 # React 19 + Vite + Tailwind CSS v4 + @dnd-kit
│   ├── public/               # Static assets & Cloudflare Pages _redirects
│   ├── src/
│   │   ├── components/       # Reusable UI, Portal Header/Sidebar, Public Navbar/Footer
│   │   ├── features/         # Admin Dashboard, Kanban Pipeline, Deliverables Review, Onboarding
│   │   ├── pages/            # Public marketing pages, Client portal suite, Auth pages
│   │   └── lib/              # API clients, Razorpay integration, Auth context
│   └── package.json
├── backend/                  # FastAPI (Python 3.11+) + SQLAlchemy 2.0 (async)
│   ├── app/
│   │   ├── routers/          # Admin, Auth, Calendar, Deliverables, Payments, Portal, Teams, Tickets
│   │   ├── models/           # User, Plan, Subscription, Deliverable, Ticket, Leave, Task
│   │   ├── services/         # Storage (R2/S3), Quota, SLA, Notifications, Brand DNA
│   │   └── workers/          # Background tasks (Celery/Redis worker & beat publisher)
│   ├── alembic/              # Database schema migrations
│   └── requirements.txt
├── .github/workflows/        # GitHub Actions CI pipeline
├── docker-compose.yml        # Local PostgreSQL & Redis infrastructure services
├── render.yaml               # Render blueprint for FastAPI backend & Celery worker
└── README.md
```

---

## ✨ Key Platform Features

### 1. Operations & Admin Management Suite
- **Interactive Executive Dashboard**: Live KPIs, monthly recurring revenue (MRR), turnaround SLAs, and staff capacity monitoring.
- **Team Lead Pod Controllers**: Assign daily task quotas (posters, reels, carousels) and triage staff leave requests.
- **Real-Time Client Roster**: Comprehensive directory of client subscription tiers, onboarding milestones, and dedicated manager assignments.
- **SLA Breach & Escalation Watch**: Automated detection of delayed review cycles and imminent delivery deadlines.

### 2. Creative Production Pipeline (Kanban)
- **5-Stage Drag-and-Drop Board**: Seamless task progression through `Backlog`, `In Production`, `Internal QA`, `Client Review`, and `Ready to Publish`.
- **Dynamic Workload Balancing**: Intelligent task auto-dispatch based on editor and designer active bandwidth.
- **Optimistic State Updates**: Instant visual UI updates with rollback handling on network latency.

### 3. Client Portal Suite
- **Deliverables Review & Approval Dock**: Full-screen 9:16 vertical reels and high-res poster inspection with 1-click approvals and feedback markup.
- **Publishing Calendar**: Multi-platform publishing schedules, quota allocation meters, and date inspection agendas.
- **Transparent Retainers & Payments**: Razorpay checkout integration for monthly subscription retainers and instant add-on packs.
- **Client Support Desk**: Dedicated ticketing system with 4-hour enterprise response SLAs and direct WhatsApp concierge integration.

### 4. Client Onboarding Flow
- **5-Stage Setup Journey**: Email verification (OTP), service terms sign-off, retainer activation, and AI Brand DNA profiling.

### 5. Public Marketing Experience
- **High-Converting Luminous Hero**: Engaging typography, live workstation deliverable cards, and social proof badges.
- **Verified Client Case Studies**: Authentic performance metrics across *Astra Living*, *Urban Bakes*, *Zenith Fitness*, *Kaya Botanicals*, and *Pulse Mobility*.
- **Interactive Pricing Calculator**: Transparent monthly retainers with detailed deliverable quotas and feature comparisons.

---

## 🛠 Local Development Setup

### Prerequisites
- **Node.js**: v20+ & npm
- **Python**: 3.11+
- **PostgreSQL**: 15+ (or Supabase Postgres)
- **Redis**: 7+ (optional for background workers)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start FastAPI dev server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```

The frontend will run on `http://localhost:5173` (or `http://localhost:5174`), proxying `/api` requests to `http://localhost:8000`.

### 3. Build & Verify

```bash
cd frontend
npm run build
```

---

## 🔒 Security & Secrets

Environment configuration is isolated using `.env` files (never committed to version control). Refer to `.env.example` for all required database connection strings, Razorpay API credentials, and JWT secret tokens.

---

## 📄 License

Proprietary © Creo Marketing Technologies. All rights reserved.
