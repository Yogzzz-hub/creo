# 🚀 Creo — Digital Marketing Agency & Operations Platform

Creo is an end-to-end full-stack SaaS platform designed for high-growth direct-to-consumer (D2C) brands and digital agencies. It streamlines client onboarding, brand DNA analysis, recurring monthly retainers, social content calendar dispatch, and internal creative operations (video editing, static posters, motion stories, and QA review).

---

## 🏗 System Architecture

```
creo/
├── frontend/                 # React 19 + Vite + Tailwind CSS v4 + @dnd-kit
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
│   │   ├── services/         # State machines, Quota tracking, SLA monitor, Notification dispatcher
│   │   └── workers/          # Background tasks (Celery/Redis worker & beat publisher)
│   ├── alembic/              # Database schema migrations
│   └── requirements.txt
├── docker-compose.yml        # PostgreSQL & Redis infrastructure services
├── render.yaml               # Render blueprint for FastAPI backend & Celery worker
├── vercel.json               # Vercel configuration for Vite SPA frontend
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
