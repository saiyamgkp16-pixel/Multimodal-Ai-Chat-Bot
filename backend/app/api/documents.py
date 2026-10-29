import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import (
    DocumentCreate, DocumentUpdate, DocumentResponse, DocumentVersionResponse
)
from app.services.document_service import DocumentService
from app.services.rag_service import index_document_chunks

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(doc_in: DocumentCreate, db: Session = Depends(get_db)):
    """Creates a new document, indexes it for RAG, and registers version 1."""
    doc = DocumentService.create_document(
        filename=doc_in.filename,
        content=doc_in.content,
        file_type=doc_in.file_type or "txt",
        db=db
    )
    # Also index chunks so it can immediately be queried via RAG
    await index_document_chunks(doc, db)
    return doc

@router.get("/documents", response_model=List[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    """Lists all user documents."""
    return DocumentService.list_documents(db)

@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(document_id: str, db: Session = Depends(get_db)):
    """Retrieves document details and latest content."""
    doc = DocumentService.get_document(document_id, db)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc

@router.put("/documents/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    doc_update: DocumentUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates document content and automatically registers the new version in version history.
    Re-indexes chunks for RAG.
    """
    doc = DocumentService.update_document(
        doc_id=document_id,
        new_content=doc_update.content,
        db=db,
        new_filename=doc_update.filename
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Re-index updated content chunks for RAG
    await index_document_chunks(doc, db)
    return doc

@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: str, db: Session = Depends(get_db)):
    """Deletes document, chunks, and version history."""
    success = DocumentService.delete_document(document_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return None

@router.get("/documents/{document_id}/versions", response_model=List[DocumentVersionResponse])
def get_document_versions(document_id: str, db: Session = Depends(get_db)):
    """Retrieves version history for a given document."""
    doc = DocumentService.get_document(document_id, db)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    return DocumentService.get_document_versions(document_id, db)
