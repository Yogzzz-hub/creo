from pydantic import BaseModel, ConfigDict


class BrandSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    brand_summary: str
    source: str  # "ai" or "mock"


class GenerateBrandSummaryRequest(BaseModel):
    pass
