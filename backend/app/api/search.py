import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import (
    WebSearchRequest, WebSearchResponse, SearchResultItem,
    RAGSearchRequest, RAGSearchResponse, RAGChunkResponse
)
from app.services.search_service import perform_web_search
from app.services.rag_service import search_relevant_chunks

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/search", response_model=WebSearchResponse)
async def web_search_endpoint(request: WebSearchRequest):
    """
    Performs real-time web search.
    Returns title, URL, and snippet for external information retrieval.
    """
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")

    results_data = await perform_web_search(query, num_results=request.num_results)
    
    items = [
        SearchResultItem(
            title=item["title"],
            url=item["url"],
            snippet=item["snippet"]
        )
        for item in results_data
    ]
    
    return WebSearchResponse(query=query, results=items)

@router.post("/rag/search", response_model=RAGSearchResponse)
async def rag_search_endpoint(request: RAGSearchRequest, db: Session = Depends(get_db)):
    """
    Direct RAG similarity search against uploaded document chunks.
    Returns ranked chunks with similarity scores.
    """
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="RAG search query cannot be empty.")

    chunks = await search_relevant_chunks(
        query=query,
        db=db,
        document_id=request.document_id,
        top_k=request.top_k
    )

    chunk_responses = [
        RAGChunkResponse(
            chunk_id=c["chunk_id"],
            document_id=c["document_id"],
            filename=c["filename"],
            chunk_text=c["chunk_text"],
            similarity_score=c["similarity_score"],
            chunk_index=c["chunk_index"]
        )
        for c in chunks
    ]

    return RAGSearchResponse(
        query=query,
        results=chunk_responses,
        total_results=len(chunk_responses)
    )
