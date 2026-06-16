from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.auth import router as auth_router
from routers.payments import router as payments_router
from routers.webhooks import router as webhooks_router

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
app.include_router(payments_router)
app.include_router(webhooks_router)


@app.get("/health")
async def health_check():
    return {"status": "ok"}
