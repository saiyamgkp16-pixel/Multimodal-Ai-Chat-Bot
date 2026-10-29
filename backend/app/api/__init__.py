from fastapi import APIRouter
from .chat import router as chat_router
from .files import router as files_router
from .documents import router as documents_router
from .search import router as search_router
from .audio import router as audio_router

api_router = APIRouter(prefix="/api")

api_router.include_router(chat_router, tags=["Chat & Conversations"])
api_router.include_router(files_router, tags=["Files & Uploads"])
api_router.include_router(documents_router, tags=["Documents & Knowledge"])
api_router.include_router(search_router, tags=["RAG & Web Search"])
api_router.include_router(audio_router, tags=["Audio, STT & TTS"])

__all__ = ["api_router"]
