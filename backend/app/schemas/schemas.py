from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field, ConfigDict

# --- Conversation Schemas ---

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    modality: str
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

class ConversationListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

class MessageCreate(BaseModel):
    role: str
    content: str
    modality: str = "text"
    sources: Optional[str] = None

# --- Chat Request & Response ---

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User text message or prompt")
    conversation_id: Optional[str] = Field(None, description="Existing conversation ID or empty for new")
    image_data: Optional[str] = Field(None, description="Base64 encoded image string or file path")
    file_ids: Optional[List[str]] = Field(default=[], description="List of uploaded document IDs for RAG")
    audio_data: Optional[str] = Field(None, description="Base64 encoded audio string for speech input")
    enable_web_search: Optional[bool] = Field(None, description="Force web search or auto-detect")

class ChatResponse(BaseModel):
    answer: str
    modality: str = "text"
    sources: List[Dict[str, Any]] = []
    conversation_id: str
    document_action: Optional[Dict[str, Any]] = None

# --- File & Document Schemas ---

class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    file_type: str
    file_size_bytes: int
    chunk_count: int
    message: str

class DocumentCreate(BaseModel):
    filename: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    file_type: str = "txt"

class DocumentUpdate(BaseModel):
    content: str = Field(..., min_length=1)
    filename: Optional[str] = None

class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    file_type: str
    content: str
    version: int
    created_at: datetime
    updated_at: datetime

class DocumentVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    document_id: str
    content: str
    version_number: int
    created_at: datetime

# --- RAG Schemas ---

class RAGSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    document_id: Optional[str] = None
    top_k: int = 4

class RAGChunkResponse(BaseModel):
    chunk_id: str
    document_id: str
    filename: str
    chunk_text: str
    similarity_score: float
    chunk_index: int

class RAGSearchResponse(BaseModel):
    query: str
    results: List[RAGChunkResponse]
    total_results: int

# --- Web Search Schemas ---

class WebSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    num_results: int = 5

class SearchResultItem(BaseModel):
    title: str
    url: str
    snippet: str

class WebSearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]

# --- Audio Schemas ---

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice: Optional[str] = "en"

class STTResponse(BaseModel):
    text: str
    confidence: Optional[float] = 1.0
