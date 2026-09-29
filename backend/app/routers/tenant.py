"""Tenant resolution and branding endpoints."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.tenant import Agency
from app.core.cache import get_redis

router = APIRouter(prefix="/tenant", tags=["Tenant"])

@router.get("/resolve")
async def resolve_tenant(
    host: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Resolve the tenant from the host (custom domain or subdomain slug).
    Cached in Redis for 5 minutes.
    """
    cache_key = f"tenant:resolve:{host}"
    
    try:
        r = await get_redis()
        cached = await r.get(cache_key)
        if cached:
            from typing import cast
            return cast(dict[str, Any], json.loads(cached))
    except Exception:
        pass
            
    # 1. Try custom domain
    stmt = select(Agency).where(Agency.custom_domain == host)
    agency = (await db.execute(stmt)).scalar_one_or_none()
    
    # 2. Try subdomain slug (e.g., host is ryzeworks.creo.app, so slug is ryzeworks)
    if not agency:
        # Very basic subdomain extraction, assuming *.creo.app or similar
        parts = host.split('.')
        if len(parts) >= 3: # ryzeworks.creo.app
            slug = parts[0]
            stmt = select(Agency).where(Agency.slug == slug)
            agency = (await db.execute(stmt)).scalar_one_or_none()
            
    # 3. Fallback to slug equal to host (for testing like localhost:5173?tenant=ryzeworks)
    if not agency:
        stmt = select(Agency).where(Agency.slug == host)
        agency = (await db.execute(stmt)).scalar_one_or_none()

    if not agency:
        raise HTTPException(404, "Tenant not found")
        
    result = {
        "agency_id": str(agency.id),
        "name": agency.name,
        "slug": agency.slug,
        "custom_domain": agency.custom_domain,
        "branding": agency.branding,
        "status": agency.status,
    }
    
    try:
        r = await get_redis()
        await r.setex(cache_key, 300, json.dumps(result))
    except Exception:
        pass
        
    return result
