import json
import math
import hashlib
import logging
from typing import List, Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session
from app.config import settings
from app.models.models import Document, DocumentChunk
from app.utils.document_parser import chunk_text

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 256

def fallback_local_embedding(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    """
    Fast, deterministic term-frequency & character-ngram embedding.
    Ensures RAG works out-of-the-box locally even if no external API key is configured.
    Normalizes vector to unit length for accurate cosine similarity.
    """
    vector = [0.0] * dim
    words = text.lower().split()
    if not words:
        return vector

    for word in words:
        # Hash word into vector slot
        h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        slot = h % dim
        vector[slot] += 1.0
        
        # Also hash 3-grams for substring similarity
        if len(word) >= 3:
            for i in range(len(word) - 2):
                gram = word[i:i+3]
                gh = int(hashlib.md5(gram.encode("utf-8")).hexdigest(), 16)
                gslot = gh % dim
                vector[gslot] += 0.4

    # Normalize vector to unit length
    magnitude = math.sqrt(sum(v * v for v in vector))
    if magnitude > 0:
        vector = [v / magnitude for v in vector]
    return vector

async def generate_gemini_embedding(text: str, api_key: str) -> Optional[List[float]]:
    """Generates embedding using Google Gemini embedding API."""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
        payload = {
            "model": "models/text-embedding-004",
            "content": {"parts": [{"text": text[:2000]}]}
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("embedding", {}).get("values", [])
    except Exception as e:
        logger.warning(f"Gemini embedding API call failed: {e}")
    return None

async def generate_openai_embedding(text: str, api_key: str) -> Optional[List[float]]:
    """Generates embedding using OpenAI text-embedding-3-small."""
    try:
        url = "https://api.openai.com/v1/embeddings"
        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "model": "text-embedding-3-small",
            "input": text[:2000]
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("data", [{}])[0].get("embedding", [])
    except Exception as e:
        logger.warning(f"OpenAI embedding API call failed: {e}")
    return None

async def generate_embedding(text: str) -> List[float]:
    """
    Provider-agnostic embedding generator with seamless local fallback.
    """
    if settings.LLM_API_KEY:
        if settings.LLM_PROVIDER == "openai":
            vec = await generate_openai_embedding(text, settings.LLM_API_KEY)
            if vec:
                return vec
        elif settings.LLM_PROVIDER == "gemini":
            vec = await generate_gemini_embedding(text, settings.LLM_API_KEY)
            if vec:
                return vec

    # Fallback to local semantic embedding
    return fallback_local_embedding(text)

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Computes cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

async def index_document_chunks(doc: Document, db: Session) -> int:
    """
    Chunks document content, generates embeddings, and persists to database.
    """
    # Remove existing chunks for this document if re-indexing
    db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).delete()
    db.commit()

    chunks = chunk_text(doc.content, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
    chunk_objs = []
    
    for idx, chunk_str in enumerate(chunks):
        embedding_vec = await generate_embedding(chunk_str)
        chunk_obj = DocumentChunk(
            document_id=doc.id,
            chunk_text=chunk_str,
            embedding=json.dumps(embedding_vec),
            chunk_index=idx
        )
        chunk_objs.append(chunk_obj)

    db.bulk_save_objects(chunk_objs)
    db.commit()
    logger.info(f"Indexed {len(chunk_objs)} chunks for document {doc.filename} (ID: {doc.id})")
    return len(chunk_objs)

async def search_relevant_chunks(
    query: str,
    db: Session,
    document_id: Optional[str] = None,
    document_ids: Optional[List[str]] = None,
    top_k: int = 4
) -> List[Dict[str, Any]]:
    """
    RAG Similarity Search:
    Generates query embedding, calculates similarity with stored chunks,
    and returns top-K grounded matches.
    """
    query_vector = await generate_embedding(query)
    
    # Query chunks from database
    chunk_query = db.query(DocumentChunk, Document.filename).join(
        Document, DocumentChunk.document_id == Document.id
    )
    
    if document_id:
        chunk_query = chunk_query.filter(DocumentChunk.document_id == document_id)
    elif document_ids:
        chunk_query = chunk_query.filter(DocumentChunk.document_id.in_(document_ids))
        
    records = chunk_query.all()
    if not records:
        return []

    scored_chunks = []
    for chunk, filename in records:
        if not chunk.embedding:
            continue
        try:
            chunk_vec = json.loads(chunk.embedding)
            score = cosine_similarity(query_vector, chunk_vec)
            scored_chunks.append({
                "chunk_id": chunk.id,
                "document_id": chunk.document_id,
                "filename": filename,
                "chunk_text": chunk.chunk_text,
                "similarity_score": round(score, 4),
                "chunk_index": chunk.chunk_index
            })
        except Exception:
            continue

    # Sort descending by similarity score
    scored_chunks.sort(key=lambda x: x["similarity_score"], reverse=True)
    return scored_chunks[:top_k]
