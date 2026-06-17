from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.get("/public")
async def get_public_settings():
    return {"scarcity_slots_available": 5}
