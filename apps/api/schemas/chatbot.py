from pydantic import BaseModel, Field


class ChatbotRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    conversation_id: str | None = Field(None, description="Dify conversation_id for continuing a session")


class ChatbotResponse(BaseModel):
    reply: str
    conversation_id: str | None = None
    escalate: bool = False
