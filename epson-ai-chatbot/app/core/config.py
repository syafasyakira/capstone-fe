from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Epson AI Chatbot API"
    VERSION: str = "1.0.0"
    GEMINI_API_KEY: str
    GEMINI_MODEL_ID: str = "gemini-3-flash-preview"
    
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
 
    class Config:
        env_file = ".env"
        case_sensitive = True
 
settings = Settings()