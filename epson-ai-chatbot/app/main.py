from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import chatbot
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API prototype for Epson AI Chatbot using Google Gemini."
)

# CORS middleware agar bisa diakses dari backend Node.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, limit to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the chatbot router with the requested URL prefix
app.include_router(
    chatbot.router, 
    prefix="/epson/v1", 
    tags=["Epson Chatbot"]
)

@app.get("/health", tags=["System"])
async def health_check():
    """Simple health check endpoint to verify the API is running."""
    return {"status": "healthy", "service": settings.PROJECT_NAME, "model": settings.GEMINI_MODEL_ID}