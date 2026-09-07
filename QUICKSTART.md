# Creo Platform - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop)
- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 18+** - [Download](https://nodejs.org/)

### One-Command Setup

Simply double-click `creo.bat` or run from command prompt:

```cmd
creo.bat
```

You'll see an interactive menu with all available options.

## 📋 Menu Options

### 1. Start All Services (Full Setup) ⭐ **RECOMMENDED FIRST TIME**
Performs complete setup and starts all services:
- ✅ Checks prerequisites (Docker, Python, Node.js)
- ✅ Creates `.env` file from template
- ✅ Starts PostgreSQL and Redis in Docker
- ✅ Creates Python virtual environment
- ✅ Installs backend dependencies
- ✅ Runs database migrations
- ✅ Seeds database with test data
- ✅ Installs frontend dependencies
- ✅ Starts Backend API (http://localhost:8000)
- ✅ Starts Celery Worker
- ✅ Starts Celery Beat Scheduler
- ✅ Starts Frontend (http://localhost:5173)
- ✅ Opens browser automatically

**Services will run in separate windows. Don't close them!**

### 2. Stop All Services
Cleanly stops all running services:
- Stops Docker containers (PostgreSQL, Redis)
- Stops Backend API
- Stops Celery workers
- Stops Frontend dev server

### 3. Restart All Services
Stops and starts all services (useful after code changes)

### 4. Run Backend Tests
Runs:
- Ruff linter
- MyPy type checker
- Pytest test suite

### 5. Run Frontend Tests
Runs:
- Biome linter
- TypeScript compiler check

### 6. Run All Tests
Runs both backend and frontend tests

### 7. Reset Database (DELETE ALL DATA) ⚠️
**WARNING: Destructive operation!**
- Drops all database tables
- Re-runs migrations from scratch
- Re-seeds test data

Requires typing "YES" to confirm.

### 8. View Docker Logs
Interactive log viewer for:
- PostgreSQL logs
- Redis logs
- All services logs (follow mode)
- Last 100 lines

### 9. Open Database Shell
Opens PostgreSQL `psql` shell for direct database access.

**Useful commands:**
- `\dt` - List all tables
- `\d+ table_name` - Describe table structure
- `\q` - Exit shell

### 10. Check Service Status
Shows which services are currently running:
- Docker services (PostgreSQL, Redis)
- Backend API
- Celery workers
- Frontend

### 11. Build Frontend for Production
Creates optimized production build in `frontend/dist/`

### 12. Install/Update Dependencies
Updates all dependencies:
- Backend Python packages
- Frontend npm packages

### 0. Exit
Closes the menu (does NOT stop services)

## 🌐 Service URLs

After starting services (Option 1):

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | Main application UI |
| **Backend API** | http://localhost:8000 | REST API |
| **API Docs** | http://localhost:8000/docs | Interactive Swagger docs |
| **Health Check** | http://localhost:8000/api/v1/health | System health status |
| **PostgreSQL** | localhost:5432 | Database (use pgAdmin/DBeaver) |
| **Redis** | localhost:6379 | Cache/Queue |

## 📝 Default Credentials

### Database
- **Host:** localhost
- **Port:** 5432
- **Database:** creo
- **User:** postgres
- **Password:** postgrespassword

### Test Users (after seeding)
See `backend/scripts/seed.py` for seeded users

## 🔧 Manual Commands

If you prefer running commands manually:

### Start Docker Only
```cmd
docker compose up -d
```

### Backend Development
```cmd
cd backend
.venv\Scripts\activate
uvicorn app.main:app --reload
```

### Frontend Development
```cmd
cd frontend
npm run dev
```

### Run Tests
```cmd
cd backend
.venv\Scripts\activate
pytest

cd ..\frontend
npm run lint
```

## 🐛 Troubleshooting

### Services won't start
1. Ensure Docker Desktop is running
2. Check ports 5432, 6379, 8000, 5173 are not in use
3. Run `creo.bat` → Option 2 (Stop All) → Option 1 (Start All)

### Database errors
Run `creo.bat` → Option 7 (Reset Database)

### Frontend not loading
1. Check if frontend window is still open
2. Try `http://127.0.0.1:5173` instead of localhost
3. Clear browser cache

### Backend API not responding
1. Check if Backend API window is still open
2. Look for errors in the Backend API window
3. Check logs: `creo.bat` → Option 8

### "Port already in use" error
Stop services using that port:
```cmd
netstat -ano | findstr :8000
taskkill /F /PID <pid_number>
```

## 📦 Project Structure

```
creo/
├── creo.bat              ← All-in-one management script
├── .env                  ← Environment variables (auto-generated)
├── docker-compose.yml    ← Docker services configuration
├── backend/              ← FastAPI backend
│   ├── app/
│   ├── alembic/          ← Database migrations
│   ├── tests/
│   └── pyproject.toml
├── frontend/             ← React frontend
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── QUICKSTART.md        ← This file
```

## 🎯 Development Workflow

### Daily Development
1. Double-click `creo.bat`
2. Select Option 1 (first time) or Option 3 (restart)
3. Code in your editor
4. Changes auto-reload in browser
5. Before committing: Option 6 (Run All Tests)
6. When done: Option 2 (Stop All)

### After Pulling Changes
1. `creo.bat` → Option 12 (Update Dependencies)
2. `creo.bat` → Option 1 (Start All)

### Database Schema Changes
1. Create new migration: `cd backend && alembic revision -m "description"`
2. Edit migration file in `backend/alembic/versions/`
3. Apply: `creo.bat` → Option 1 or run `alembic upgrade head` manually

## 🚨 Important Notes

- **Don't close service windows** - Each service runs in its own command window
- **First run takes longer** - Downloads Docker images, installs dependencies
- **`.env` file** - Auto-generated with dev defaults, customize for production
- **Port conflicts** - Stop other services using ports 5432, 6379, 8000, 5173
- **Windows firewall** - May ask for permissions first time

## 📚 Next Steps

1. ✅ Start services with `creo.bat` → Option 1
2. ✅ Open http://localhost:5173 in browser
3. ✅ Check API docs at http://localhost:8000/docs
4. ✅ Read `CLAUDE.md` for architecture details
5. ✅ Read `BUILD-PROMPTS.md` for phase information

## 💡 Pro Tips

- Keep service windows visible to monitor logs
- Use Option 10 regularly to check service status
- Option 8 is your friend for debugging
- Database shell (Option 9) is great for quick queries
- Use Option 7 to reset database if things get messy

## 🆘 Need Help?

1. Check service windows for error messages
2. Run `creo.bat` → Option 8 (View Logs)
3. Verify environment: `creo.bat` → Option 10
4. Try reset: `creo.bat` → Option 7
5. Check `CLAUDE.md` for architecture details

---

**Happy coding! 🚀**
