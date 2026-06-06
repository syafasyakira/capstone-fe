from pydantic import BaseModel, Field
from typing import List, Optional

class Message(BaseModel):
    role: str = Field(..., description="The role of the message sender, e.g., 'user' or 'model'")
    content: str = Field(..., description="The actual text content of the message")

class ChatRequest(BaseModel):
    user_id: Optional[str] = Field(None, description="Optional user identifier for logging or session management")
    message: str = Field(..., description="The latest message from the user")
    history: Optional[List[Message]] = Field(default=[], description="Previous conversation context")

class ChatResponse(BaseModel):
    status: str = Field(default="success")
    reply: str = Field(..., description="The AI's response text")
    tokens_used: Optional[int] = Field(None, description="Optional field to track API usage")
    requires_support_ticket: bool = Field(default=False, description="Flag to show support ticket button")