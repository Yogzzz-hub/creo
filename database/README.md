# 🗄️ Creo Database Architecture & Management

This directory contains the complete database definition, schema DDL, seed data, Docker orchestration, and management scripts for the **Creo Digital Marketing & Operations Platform**.

---

## 📍 Where Is The Database?

The Creo platform uses **PostgreSQL 15+** (or Supabase / Neon / AWS RDS Postgres) as its primary relational data store.

- **Engine:** PostgreSQL (with `pgcrypto`, `citext`, `pg_trgm`, and `btree_gist` extensions)
- **Backend ORM:** SQLAlchemy 2.0 (async via `asyncpg`) located in `backend/app/models/` and `backend/app/db/`
- **Schema Migrations:** Alembic (`backend/alembic/`)
- **Direct SQL Definitions:** `database/schema.sql` (Tables, ENUMs, triggers, and indexes)
- **Starter Demo Data:** `database/seed_data.sql`

---

## 📂 Directory Contents

| File | Description |
| :--- | :--- |
| [`schema.sql`](./schema.sql) | Full PostgreSQL DDL (enums, tables, constraints, foreign keys, triggers). |
| [`seed_data.sql`](./seed_data.sql) | Initial starter data for Admin, Team Leads, Creatives, Clients, and Plans. |
| [`docker-compose.db.yml`](./docker-compose.db.yml) | Standalone Docker Compose for running PostgreSQL 16 & pgAdmin 4. |
| [`init.py`](./init.py) | Python script to initialize and seed any PostgreSQL instance. |

---

## 🚀 Quick Start (Local Docker Database)

To run a clean local PostgreSQL database with automatic schema setup:

```bash
# From project root:
docker compose -f database/docker-compose.db.yml up -d
```

This starts:
1. **PostgreSQL 16**: Port `5432`
   - **Database:** `creo_db`
   - **User:** `creo_user`
   - **Password:** `creo_password`
   - **URL:** `postgresql://creo_user:creo_password@localhost:5432/creo_db`
2. **pgAdmin 4 (Web GUI)**: Port `5050`
   - Open [http://localhost:5050](http://localhost:5050)
   - **Email:** `admin@creo.agency`
   - **Password:** `admin`

---

## ⚡ Running Migrations / Seeding an Existing Database

If you already have PostgreSQL running (or a remote database on Supabase/Render):

```bash
# Install psycopg2 and python-dotenv
pip install psycopg2-binary python-dotenv

# Run initialization script
python database/init.py
```

Or execute directly with `psql`:

```bash
psql "postgresql://creo_user:creo_password@localhost:5432/creo_db" -f database/schema.sql
psql "postgresql://creo_user:creo_password@localhost:5432/creo_db" -f database/seed_data.sql
```

---

## 📊 Entity Relationship Diagram (Summary)

```
[ users ]
   ├── client_profiles (1:1)
   ├── subscriptions   (1:N) ──> [ plans ]
   ├── team_members    (1:1)
   ├── tasks           (1:N)
   ├── deliverables    (1:N)
   ├── calendar_entries(1:N)
   ├── support_tickets (1:N) ──> ticket_messages (1:N)
   └── leave_requests  (1:N)
```

---

## 🔑 Demo User Credentials (from `seed_data.sql`)

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@creo.agency` | `password123` | Full Operations & Agency Management |
| **Team Lead** | `lead@creo.agency` | `password123` | Creative Pod & Workload Dispatch |
| **Video Editor** | `editor@creo.agency` | `password123` | Kanban Pipeline & 9:16 Video Uploads |
| **Designer** | `designer@creo.agency` | `password123` | Static Posters & Editorial Carousels |
| **Client** | `client@creo.agency` | `password123` | Deliverables Approval Dock & Calendar |
