# 🚀 Creo — Digital Marketing Agency Platform

Creo is a full-stack SaaS platform designed to bridge the gap between local businesses and dedicated creative teams. It provides an end-to-end operational suite featuring client onboarding, AI-driven brand analysis, recurring subscription management, content calendar scheduling, and automated Instagram publishing.

---

## 🏗 Tech Stack

### Frontend (`frontend`)

- **Framework:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **State & Data:** TanStack Query v5 + Context
- **Forms & Validation:** React Hook Form + Zod
- **Charts:** Recharts

### Backend (`backend`)

- **Framework:** FastAPI (Python 3.12+)
- **ORM & Database:** SQLAlchemy 2.0 (async) + Alembic + PostgreSQL (Supabase)
- **Background Workers:** Celery + Redis (Task queue & beat scheduler)
- **Authentication:** Supabase Auth (JWT via FastAPI middleware)

### Infrastructure & Integrations

- **Payments:** Razorpay (Domestic) & Stripe (International)
- **Communications:** Resend (Email) & MSG91 (WhatsApp + OTP)
- **AI & Social:** OpenAI GPT-4o (Brand Analysis) & Meta Graph API (Instagram Publishing)
- **Hosting:** Vercel (Frontend) & Render / Railway (Backend + Redis)

---

## 📂 Repository Structure

```plaintext
creo/
├── frontend/                 # Next.js 15 frontend application (Vercel ready)
├── backend/                  # Python FastAPI backend & Celery workers (Render ready)
├── docker-compose.yml        # Local Redis & PostgreSQL services
└── README.md                 # Single documentation file
```

---

## 🛠 Local Development Setup

### 1. Prerequisites

- Node.js (v20+)
- Python (3.12+)
- Docker & Docker Compose (for local DB and Redis)
- Git

### 2. Environment Variables

Copy the example environment file and fill in your local and third-party keys.

```bash
cp .env.example .env
```

See the [Third-Party Services Setup](#️-third-party-services-setup) section below for instructions on getting these keys.

### 3. Spin up Local Infrastructure

Use Docker Compose to start a local PostgreSQL database and Redis instance for Celery.

```bash
docker-compose up -d
```

### 4. Start the Backend (FastAPI + Celery)

Open a new terminal window and navigate to the API directory:

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

To process background tasks (emails, webhooks, AI generation), open another terminal in `backend` and start the Celery worker:

```bash
celery -A workers.celery_app worker --loglevel=info
```

### 5. Start the Frontend (Next.js)

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at [http://localhost:3000](http://localhost:3000).

---

## ⚙️ Third-Party Services Setup

To run the full suite of Creo's features, you need to configure the following external services and add their keys to your `.env` file.

### 1. Supabase (Database & Storage)

Create a project at [Supabase](https://supabase.com).

- **Database:** Copy the `DATABASE_URL` (Transaction mode/PgBouncer for production) to your backend `.env`.
- **Auth & JWT:** Add your `SUPABASE_JWT_SECRET` to the backend `.env`. Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the frontend `.env.local`.
- **Storage:** Create the following buckets:
  - `deliverables` (Private)
  - `portfolio` (Public)
  - `avatars` (Public)
  - `announcements` (Private)
  - `ticket-attachments` (Private)

### 2. Google OAuth 2.0 (Direct Authentication)

Creo uses direct Google OAuth 2.0 for single-sign on:
- **Client ID:** Set `GOOGLE_CLIENT_ID` in `backend/.env` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.local`.
- **Client Secret:** Set `GOOGLE_CLIENT_SECRET` in `backend/.env`.
- **Authorized Redirect URIs:** Add `https://creo-ev42.onrender.com` (and `https://creo-ev42.onrender.com/api/v1/auth/google/callback`) in Google Cloud Console.

### 3. Payments (Razorpay & Stripe)

- **Razorpay:** Generate test API keys. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Set up a webhook pointing to `/api/webhooks/razorpay` and capture the `RAZORPAY_WEBHOOK_SECRET`.
- **Stripe:** Get your test publishable and secret keys. Set up a webhook pointing to `/api/webhooks/stripe` and capture the `STRIPE_WEBHOOK_SECRET`.

### 4. Communications (Resend & MSG91)

- **Resend:** Verify your sending domain. Generate an API key (`RESEND_API_KEY`) and set your `RESEND_FROM_EMAIL` (e.g., `notifications@creo.app`).
- **MSG91:** Create an account for Indian telecom OTP and WhatsApp routing. Add your `MSG91_AUTH_KEY`, `MSG91_SENDER_ID` (for SMS), and `MSG91_WHATSAPP_NUMBER`. Note: WhatsApp templates must be pre-approved by Meta via MSG91.

### 5. AI & Social (OpenAI & Instagram)

- **OpenAI:** Generate a project API key (`OPENAI_API_KEY`). Ensure your account has billing enabled for GPT-4o access.
- **Meta Graph API:** Create a Meta Developer App. Request the `instagram_basic` and `instagram_content_publish` permissions. Add your `INSTAGRAM_APP_ID` and `INSTAGRAM_APP_SECRET`.

---

## 🚀 Deployment

### Backend (Render / Railway)

The backend is deployed to Render (`https://creo-ev42.onrender.com`):

| Service | Start Command |
|---------|---------------|
| API | `uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers` |
| Celery Worker | `celery -A workers.celery_app worker --loglevel=info` |
| Celery Beat | `celery -A workers.celery_app beat --loglevel=info` |

### Frontend (Vercel)

1. Import the repository into Vercel.
2. Set the Root Directory to `frontend`.
3. Add all `NEXT_PUBLIC_*` environment variables.
4. Vercel will automatically run `npm run build` and deploy the application.

---

## 🧪 Testing

### Backend Tests (Pytest)

```bash
cd backend
pytest tests/ -v
```

### Frontend Tests (Playwright E2E)

```bash
cd frontend
npx playwright test
```

---

## 📄 License

This project is private and proprietary.
