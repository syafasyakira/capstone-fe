import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from app.core.config import settings
from app.schemas.chat import ChatRequest
from app.services.vector_store import vector_store
from typing import Tuple

class AgentOutput(BaseModel):
    reply: str = Field(description="Jawaban utama dari AI untuk pengguna.")
    requires_support_ticket: bool = Field(description="Set to true ONLY if the user has a valid Epson-related issue that needs human support/service center. STRICTLY set to false if the user asks about completely unrelated topics (e.g., food, other brands, general chit-chat).")
class LLMService:
    """Handles interactions with the Google Gemini API with RAG integration."""
    
    def __init__(self):
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self.model_id = settings.GEMINI_MODEL_ID

    async def generate_response(self, chat_request: ChatRequest) -> Tuple[str, bool, int]:
        """Retrieves context, generates structured AI response, and extracts ticket flag."""
        try:
            # 1. RETRIEVAL: Cari dokumen yang relevan dengan pesan user
            context_data = vector_store.search_similar_documents(chat_request.message)
            
            # 2. AUGMENTATION: Suntikkan dokumen ke dalam System Instruction
            system_prompt_with_context = (
                "You are a professional customer service AI assistant for Epson. "
                "You MUST follow these strict rules:\n"
                "1. STRICT BOUNDARY: If the user asks about completely unrelated topics (like food, other brands, politics, or general knowledge), politely decline to answer, state that you are an Epson assistant, and DO NOT suggest contacting support.\n"
                "2. EPSON QUERIES: If the question is related to Epson printers/scanners but the answer is not in the context, politely inform the user and suggest contacting Epson customer support.\n"
                "3. IN-CONTEXT: Answer valid questions based strictly on the provided context below. Do not invent technical specifications.\n\n"
                f"--- EPSON KNOWLEDGE BASE ---\n{context_data}\n--------------------------"
            )

            # Paksa model untuk mengembalikan format JSON yang valid
            config = types.GenerateContentConfig(
                system_instruction=system_prompt_with_context,
                response_mime_type="application/json",
                response_schema=AgentOutput,
            )

            # Format conversation history
            formatted_history = []
            for msg in chat_request.history:
                role = "user" if msg.role == "user" else "model"
                formatted_history.append(
                    types.Content(
                        role=role, 
                        parts=[types.Part.from_text(text=msg.content)]
                    )
                )
            
            # 3. GENERATION: Panggil Gemini API
            chat = self.client.chats.create(
                model=self.model_id,
                config=config,
                history=formatted_history
            )
            
            response = chat.send_message(chat_request.message)
            
            # 4. EXTRACTION: Parsing teks JSON menjadi dictionary Python
            output_data = json.loads(response.text)
            reply_text = output_data.get("reply", "")
            needs_ticket = output_data.get("requires_support_ticket", False)
            
            total_tokens = response.usage_metadata.total_token_count if response.usage_metadata else 0
            
            return reply_text, needs_ticket, total_tokens

        except Exception as e:
            raise Exception(f"Failed to generate AI response: {str(e)}")

llm_service = LLMService()