import io
import re
from pathlib import Path
from typing import List
from pypdf import PdfReader
from docx import Document as DocxDocument
from app.config import settings

def clean_text(text: str) -> str:
    """
    Cleans extracted text by normalizing whitespace, stripping non-printable characters,
    and removing excessive blank lines.
    """
    if not text:
        return ""
    # Replace carriage returns and excessive whitespace
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Replace non-breaking spaces
    text = text.replace("\xa0", " ")
    # Collapse multiple consecutive newlines to max 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse horizontal spaces
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()

def parse_pdf(file_bytes: bytes) -> str:
    """Extracts text from PDF bytes."""
    reader = PdfReader(io.BytesIO(file_bytes))
    extracted = []
    for idx, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        if page_text.strip():
            extracted.append(f"[Page {idx + 1}]\n{page_text.strip()}")
    return "\n\n".join(extracted)

def parse_docx(file_bytes: bytes) -> str:
    """Extracts text from DOCX bytes."""
    doc = DocxDocument(io.BytesIO(file_bytes))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    # Also extract table text
    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                paragraphs.append(row_text)
    return "\n\n".join(paragraphs)

def parse_plain_text(file_bytes: bytes) -> str:
    """Extracts text from TXT or MD bytes with encoding fallback."""
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            return file_bytes.decode(encoding)
        except UnicodeDecodeError:
            continue
    return file_bytes.decode("utf-8", errors="replace")

def parse_document_file(filename: str, file_bytes: bytes) -> str:
    """
    Dispatches file parsing according to file extension.
    Returns cleaned raw string content.
    """
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        raw = parse_pdf(file_bytes)
    elif ext == ".docx":
        raw = parse_docx(file_bytes)
    elif ext in (".txt", ".md"):
        raw = parse_plain_text(file_bytes)
    else:
        raise ValueError(f"Unsupported document format: {ext}")
        
    return clean_text(raw)

def chunk_text(text: str, chunk_size: int = None, chunk_overlap: int = None) -> List[str]:
    """
    Chunks text into manageable segments preserving sentence or paragraph boundaries where practical.
    """
    if not text:
        return []
        
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
    
    # Split primarily into paragraphs
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []
    current_chunk = ""
    
    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{para}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            
            # If a single paragraph is larger than chunk_size, split by sentences or chunks
            if len(para) > chunk_size:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                sub_chunk = ""
                for s in sentences:
                    if len(sub_chunk) + len(s) + 1 <= chunk_size:
                        sub_chunk = f"{sub_chunk} {s}".strip()
                    else:
                        if sub_chunk:
                            chunks.append(sub_chunk)
                        sub_chunk = s
                if sub_chunk:
                    current_chunk = sub_chunk
            else:
                current_chunk = para
                
    if current_chunk:
        chunks.append(current_chunk)
        
    # If no paragraphs were split (e.g. one solid block of text), do sliding window slice
    if not chunks:
        step = max(1, chunk_size - chunk_overlap)
        for i in range(0, len(text), step):
            chunks.append(text[i:i + chunk_size].strip())
            
    return chunks
