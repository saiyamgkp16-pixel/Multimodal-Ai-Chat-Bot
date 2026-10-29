import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    APP_NAME: str = "Multimodal AI Chatbot"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # Server configuration
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/multimodal_chatbot"
    SQLITE_FALLBACK_URL: str = f"sqlite:///{BASE_DIR}/multimodal_chatbot.db"
    
    # AI Providers & Keys
    LLM_PROVIDER: str = "gemini"  # gemini, openai, or demo
    LLM_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # Web Search
    SEARCH_API_KEY: str = ""
    SEARCH_PROVIDER: str = "duckduckgo"  # duckduckgo, tavily, serpapi
    
    # Speech & Audio
    STT_API_KEY: str = ""
    TTS_API_KEY: str = ""
    
    # Security & Upload constraints
    MAX_FILE_SIZE_BYTES: int = 15 * 1024 * 1024  # 15 MB
    MAX_AUDIO_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB
    
    ALLOWED_DOCUMENT_EXTENSIONS: set = {".pdf", ".docx", ".txt", ".md"}
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    ALLOWED_AUDIO_EXTENSIONS: set = {".mp3", ".wav", ".ogg", ".webm", ".m4a"}
    
    # RAG Settings
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    TOP_K_RAG_RESULTS: int = 4

    model_config = {
        "env_file": str(BASE_DIR / ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

settings = Settings()
