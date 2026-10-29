import re
import logging
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.models import Document, DocumentVersion
from app.utils.security import sanitize_filename

logger = logging.getLogger(__name__)

class DocumentService:
    @staticmethod
    def create_document(
        filename: str,
        content: str,
        file_type: str,
        db: Session
    ) -> Document:
        """
        Creates a new document and registers version 1 in document_versions.
        """
        clean_filename = sanitize_filename(filename)
        doc = Document(
            filename=clean_filename,
            file_type=file_type.lower().replace(".", ""),
            content=content,
            version=1
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        # Record initial version
        initial_version = DocumentVersion(
            document_id=doc.id,
            content=content,
            version_number=1,
            created_at=datetime.now(timezone.utc)
        )
        db.add(initial_version)
        db.commit()
        
        return doc

    @staticmethod
    def get_document(doc_id: str, db: Session) -> Optional[Document]:
        return db.query(Document).filter(Document.id == doc_id).first()

    @staticmethod
    def list_documents(db: Session) -> List[Document]:
        return db.query(Document).order_by(Document.updated_at.desc()).all()

    @staticmethod
    def update_document(
        doc_id: str,
        new_content: str,
        db: Session,
        new_filename: Optional[str] = None
    ) -> Optional[Document]:
        """
        Updates document content and increments version history.
        Preserves complete version history in document_versions.
        """
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return None

        # Increment version number
        new_version_num = (doc.version or 1) + 1
        doc.version = new_version_num
        doc.content = new_content
        doc.updated_at = datetime.now(timezone.utc)
        if new_filename:
            doc.filename = sanitize_filename(new_filename)

        # Record new version snapshot
        version_entry = DocumentVersion(
            document_id=doc.id,
            content=new_content,
            version_number=new_version_num,
            created_at=datetime.now(timezone.utc)
        )
        db.add(version_entry)
        db.commit()
        db.refresh(doc)
        return doc

    @staticmethod
    def delete_document(doc_id: str, db: Session) -> bool:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return False
        db.delete(doc)
        db.commit()
        return True

    @staticmethod
    def get_document_versions(doc_id: str, db: Session) -> List[DocumentVersion]:
        return db.query(DocumentVersion).filter(
            DocumentVersion.document_id == doc_id
        ).order_by(DocumentVersion.version_number.desc()).all()

    @staticmethod
    def extract_document_action(response_text: str) -> Tuple[Optional[Dict[str, Any]], str]:
        """
        Extracts structured document modification block if the AI response indicates
        a document creation or update operation.
        Format:
        ```document_action
        action: create | update
        title: <Document Title>
        doc_id: <Document ID if updating>
        content: <Full Document Content>
        ```
        """
        action_match = re.search(r"```document_action\s*([\s\S]*?)\s*```", response_text)
        if not action_match:
            return None, response_text

        raw_block = action_match.group(1).strip()
        action_data: Dict[str, Any] = {}
        content_lines = []
        in_content = False

        for line in raw_block.splitlines():
            if in_content:
                content_lines.append(line)
            elif line.lower().startswith("action:"):
                action_data["action"] = line.split(":", 1)[1].strip().lower()
            elif line.lower().startswith("title:"):
                action_data["title"] = line.split(":", 1)[1].strip()
            elif line.lower().startswith("doc_id:"):
                action_data["doc_id"] = line.split(":", 1)[1].strip()
            elif line.lower().startswith("content:"):
                in_content = True
                rem = line.split(":", 1)[1].strip()
                if rem:
                    content_lines.append(rem)

        if content_lines:
            action_data["content"] = "\n".join(content_lines).strip()

        # Remove the internal action block from the user-facing text
        clean_response = response_text.replace(action_match.group(0), "").strip()
        return action_data, clean_response
