import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings

log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
logging.basicConfig(level=log_level, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

from routers.auth import router as auth_router
from routers.plans import router as plans_router
from routers.onboarding import router as onboarding_router
from routers.public_settings import router as public_settings_router
from routers.questionnaires import router as questionnaires_router
from routers.portal_dashboard import router as portal_dashboard_router
from routers.deliverables import router as deliverables_router
from routers.calendar import router as calendar_router
from routers.payments import router as payments_router
from routers.addons import router as addons_router
from routers.notifications import router as notifications_router
from routers.tasks import router as tasks_router
from routers.tickets import router as tickets_router
from routers.account import router as account_router
from routers.team_dashboard import router as team_dashboard_router
from routers.team_tickets import router as team_tickets_router
from routers.leave import router as leave_router
from routers.team_calendar import router as team_calendar_router
from routers.team_overview import router as team_overview_router
from routers.sales import router as sales_router
from routers.admin_dashboard import router as admin_dashboard_router
from routers.admin_clients import router as admin_clients_router
from routers.admin_team import router as admin_team_router
from routers.admin_leave import router as admin_leave_router
from routers.admin_escalations import router as admin_escalations_router
from routers.admin_announcements import router as admin_announcements_router
from routers.admin_settings import router as admin_settings_router
from routers.admin_kpi import router as admin_kpi_router
from routers.admin_sales import router as admin_sales_router
from routers.admin_calendar import router as admin_calendar_router
from routers.admin_reports import router as admin_reports_router
from routers.admin_deliverables import router as admin_deliverables_router
from routers.admin_tasks import router as admin_tasks_router
from routers.admin_support import router as admin_support_router
from routers.admin_addons import router as admin_addons_router
from routers.admin_subscriptions import router as admin_subscriptions_router
from routers.client_assignments import router as client_assignments_router
from routers.content_plans import router as content_plans_router
from routers.lead_magnet import router as lead_magnet_router
from routers.email import router as email_router
from routers.brand_summary import router as brand_summary_router
from routers.webhooks import router as webhooks_router
from routers.webhook import router as webhook_router
from routers.chatbot import router as chatbot_router
from core.exceptions import setup_global_middleware_and_exceptions
from core.security import role_router

is_production = settings.ENVIRONMENT.lower() == "production"

app = FastAPI(
    title="Creo API",
    description="Digital Marketing Agency Platform — Backend API",
    version="1.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)

# CORS must be the outermost middleware so headers are added to ALL responses,
# including those from exception handlers registered below.
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if settings.FRONTEND_URL:
    origins.append(settings.FRONTEND_URL)
    if settings.FRONTEND_URL.endswith("/"):
        origins.append(settings.FRONTEND_URL[:-1])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Strictly whitelist legitimate Creo and team project domains, blocking arbitrary Vercel sites
    allow_origin_regex=r"^https://(creo(-[a-z0-9-]+)?-yogzzz-hubs-projects|creo(-[a-z0-9-]+)?)\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

setup_global_middleware_and_exceptions(app)

app.include_router(auth_router)
app.include_router(plans_router)
app.include_router(public_settings_router)
app.include_router(onboarding_router)
app.include_router(questionnaires_router)
app.include_router(portal_dashboard_router)
app.include_router(deliverables_router)
app.include_router(calendar_router)
app.include_router(payments_router)
app.include_router(addons_router)
app.include_router(notifications_router)
app.include_router(tasks_router)
app.include_router(tickets_router)
app.include_router(account_router)
app.include_router(team_dashboard_router)
app.include_router(team_tickets_router)
app.include_router(leave_router)
app.include_router(team_calendar_router)
app.include_router(team_overview_router)
app.include_router(sales_router)
app.include_router(admin_dashboard_router)
app.include_router(admin_clients_router)
app.include_router(admin_team_router)
app.include_router(admin_leave_router)
app.include_router(admin_escalations_router)
app.include_router(admin_announcements_router)
app.include_router(admin_settings_router)
app.include_router(admin_kpi_router)
app.include_router(admin_sales_router)
app.include_router(admin_calendar_router)
app.include_router(admin_reports_router)
app.include_router(admin_deliverables_router)
app.include_router(admin_tasks_router)
app.include_router(admin_support_router)
app.include_router(admin_addons_router)
app.include_router(admin_subscriptions_router)
app.include_router(client_assignments_router)
app.include_router(content_plans_router)
app.include_router(lead_magnet_router)
app.include_router(email_router)
app.include_router(brand_summary_router)
app.include_router(webhooks_router)
app.include_router(webhook_router)
app.include_router(chatbot_router)
app.include_router(role_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}