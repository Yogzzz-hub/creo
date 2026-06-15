from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app = FastAPI(
    title="Creo API",
    description="Digital Marketing Agency Platform — Backend API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/health")
async def health_check():
    return {"status": "ok"}
