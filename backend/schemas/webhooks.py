from pydantic import BaseModel
from typing import Optional

class SupabaseSmsPayload(BaseModel):
    phone: str
    otp: str
    message: Optional[str] = None
