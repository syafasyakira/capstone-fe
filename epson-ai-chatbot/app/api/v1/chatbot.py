from fastapi import APIRouter, HTTPException
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.llm_service import llm_service

router = APIRouter()

@router.post("/ai-chatbot", response_model=ChatResponse)
async def chat_with_epson_ai(request: ChatRequest):
    """Endpoint for the Epson AI Chatbot."""
    try:
        reply_text, needs_ticket, tokens = await llm_service.generate_response(request)
        
        return ChatResponse(
            status="success", 
            reply=reply_text, 
            tokens_used=tokens,
            requires_support_ticket=needs_ticket
        )
    except Exception as e:
        import traceback
        print("\n" + "="*60)
        print("RAG ENDPOINT ERROR:")
        traceback.print_exc()
        print("="*60 + "\n")
        raise HTTPException(status_code=500, detail=str(e))