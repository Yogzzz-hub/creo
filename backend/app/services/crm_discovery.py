"""Adapter contract for an agency-authorized, licensed company-data provider."""

from urllib.parse import urlparse
import httpx
from pydantic import BaseModel, Field, ValidationError
from app.config import settings
from app.core.errors import Conflict


class SourceCompany(BaseModel):
    source_id: str = Field(min_length=1, max_length=255)
    company_name: str = Field(min_length=1, max_length=255)
    contact_name: str | None = Field(default=None, max_length=255)
    website: str = Field(default="", max_length=500)
    location: str = Field(default="", max_length=255)
    industry: str = Field(default="", max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=255)
    contact_verified: bool = False
    storage_permitted: bool = False
    source_url: str = Field(default="", max_length=1000)


def connection(agency_id):
    values = settings.CRM_LEAD_PROVIDER_CONNECTIONS.get(str(agency_id), {})
    if not values.get("url") or not values.get("token") or not values.get("name"):
        return None
    url = urlparse(values["url"])
    return (
        values
        if url.scheme == "https" and url.hostname and not url.username and not url.password
        else None
    )


async def search(agency_id, query, location, limit):
    config = connection(agency_id)
    if not config:
        raise Conflict(
            "Connect an agency-authorized licensed lead-data provider first.",
            code="DISCOVERY_NOT_CONFIGURED",
        )
    try:
        async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
            response = await client.post(
                config["url"],
                headers={"Authorization": f"Bearer {config['token']}"},
                json={"query": query, "location": location, "limit": limit},
            )
        response.raise_for_status()
        records = response.json()["companies"]
        if not isinstance(records, list) or len(records) > 100:
            raise ValueError("Invalid provider response")
        return [SourceCompany.model_validate(record) for record in records[:limit]], config["name"]
    except (httpx.HTTPError, ValueError, KeyError, ValidationError):
        raise Conflict(
            "The licensed provider could not complete this search. Check connection, quota and response format.",
            code="DISCOVERY_PROVIDER_ERROR",
        ) from None
