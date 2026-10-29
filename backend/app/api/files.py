import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings, UPLOAD_DIR
from app.database.session import get_db
from app.schemas.schemas import FileUploadResponse
from app.utils.security import sanitize_filename, validate_file_extension
from app.utils.document_parser import parse_document_file
from app.services.rag_service import index_document_chunks
from app.services.document_service import DocumentService
from app.services.vision_service import process_image

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/files/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Uploads and processes documents (PDF, DOCX, TXT, MD) or images.
    Parses document contents, chunks them, generates embeddings, and saves to knowledge base.
    """
    raw_filename = file.filename or "uploaded_file"
    clean_name = sanitize_filename(raw_filename)
    ext = Path(clean_name).suffix.lower()

    # Read file content safely with size limit checking
    file_bytes = await file.read()
    file_size = len(file_bytes)

    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if file_size > settings.MAX_FILE_SIZE_BYTES:
        max_mb = settings.MAX_FILE_SIZE_BYTES // (1024 * 1024)
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {max_mb} MB."
        )

    # 1. Handle Document Uploads (PDF, DOCX, TXT, MD)
    if ext in settings.ALLOWED_DOCUMENT_EXTENSIONS:
        try:
            extracted_text = parse_document_file(clean_name, file_bytes)
        except Exception as e:
            logger.error(f"Error parsing document: {e}")
            raise HTTPException(
                status_code=422,
                detail=f"Failed to extract text from document: {str(e)}"
            )

        if not extracted_text.strip():
            raise HTTPException(
                status_code=422,
                detail="No readable text could be extracted from this document."
            )

        # Save document record
        doc = DocumentService.create_document(
            filename=clean_name,
            content=extracted_text,
            file_type=ext.replace(".", ""),
            db=db
        )

        # Chunk and index embeddings in database
        chunk_count = await index_document_chunks(doc, db)

        # Save raw file copy in uploads folder
        safe_path = UPLOAD_DIR / f"{doc.id}_{clean_name}"
        with open(safe_path, "wb") as f:
            f.write(file_bytes)

        return FileUploadResponse(
            file_id=doc.id,
            filename=clean_name,
            file_type=ext.replace(".", ""),
            file_size_bytes=file_size,
            chunk_count=chunk_count,
            message=f"Document successfully parsed and indexed into {chunk_count} chunks for RAG."
        )

    # 2. Handle Image Uploads (JPG, PNG, WebP)
    elif ext in settings.ALLOWED_IMAGE_EXTENSIONS:
        is_valid, msg, meta = process_image(file_bytes)
        if not is_valid:
            raise HTTPException(status_code=400, detail=msg)

        # Save image copy
        safe_path = UPLOAD_DIR / clean_name
        with open(safe_path, "wb") as f:
            f.write(file_bytes)

        return FileUploadResponse(
            file_id=clean_name,
            filename=clean_name,
            file_type="image",
            file_size_bytes=file_size,
            chunk_count=1,
            message="Image processed and ready for vision understanding."
        )

    else:
        allowed = list(settings.ALLOWED_DOCUMENT_EXTENSIONS | settings.ALLOWED_IMAGE_EXTENSIONS)
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed extensions: {', '.join(sorted(allowed))}"
        )
