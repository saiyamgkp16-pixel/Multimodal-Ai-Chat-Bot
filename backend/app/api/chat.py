import json
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Conversation, Message
from app.schemas.schemas import (
    ChatRequest, ChatResponse,
    ConversationResponse, ConversationListItem, MessageResponse
)
from app.services.llm_service import generate_ai_response
from app.services.rag_service import search_relevant_chunks
from app.services.search_service import perform_web_search, should_perform_web_search
from app.services.document_service import DocumentService
from app.utils.security import check_prompt_injection_safety

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Main multimodal conversational endpoint.
    Accepts text, image data, attached document references, and audio input.
    Coordinates RAG, Web Search, Document Actions, and Conversation Memory.
    """
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Check basic prompt injection safety
    is_safe, warning = check_prompt_injection_safety(user_message)
    if not is_safe:
        logger.warning(f"Security flag on input: {warning}")

    # 1. Retrieve or create conversation
    conversation = None
    if request.conversation_id:
        conversation = db.query(Conversation).filter(Conversation.id == request.conversation_id).first()
    
    if not conversation:
        title = user_message[:40] + ("..." if len(user_message) > 40 else "")
        conversation = Conversation(title=title)
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 2. Retrieve recent message history for memory context
    recent_msgs = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at.desc()).limit(6).all()
    recent_msgs.reverse()

    chat_history = [{"role": m.role, "content": m.content} for m in recent_msgs]

    sources_list = []
    rag_context = ""
    web_context = ""
    modality_used = "text"

    # 3. Handle Multimodal Image
    image_base64 = None
    image_mime = "image/jpeg"
    if request.image_data:
        modality_used = "image"
        # Extract base64 payload if data-URI passed
        if "," in request.image_data:
            header, image_base64 = request.image_data.split(",", 1)
            mime_match = __import__("re").search(r"data:(image/[a-zA-Z0-9.+-]+);base64", header)
            if mime_match:
                image_mime = mime_match.group(1).lower()
        else:
            image_base64 = request.image_data

    # 4. RAG Retrieval if documents are attached or present
    if request.file_ids and len(request.file_ids) > 0:
        modality_used = "document" if modality_used == "text" else "mixed"
        matched_chunks = await search_relevant_chunks(
            query=user_message,
            db=db,
            document_ids=request.file_ids,
            top_k=4
        )
        if matched_chunks:
            chunk_texts = []
            for chunk in matched_chunks:
                chunk_texts.append(f"[{chunk['filename']} - Part {chunk['chunk_index'] + 1}]:\n{chunk['chunk_text']}")
                sources_list.append({
                    "type": "document",
                    "title": chunk["filename"],
                    "snippet": chunk["chunk_text"][:150] + "...",
                    "similarity": chunk["similarity_score"]
                })
            rag_context = "\n\n".join(chunk_texts)

    # 5. Web Search Retrieval if needed
    needs_search = should_perform_web_search(user_message, request.enable_web_search)
    if needs_search:
        modality_used = "mixed" if modality_used != "text" else "web"
        search_results = await perform_web_search(user_message, num_results=3)
        if search_results:
            snippets = []
            for res in search_results:
                snippets.append(f"Title: {res['title']}\nURL: {res['url']}\nSnippet: {res['snippet']}")
                sources_list.append({
                    "type": "web",
                    "title": res["title"],
                    "url": res["url"],
                    "snippet": res["snippet"]
                })
            web_context = "\n\n".join(snippets)

    # 6. Generate AI response
    raw_answer = await generate_ai_response(
        user_query=user_message,
        rag_context=rag_context,
        web_context=web_context,
        image_base64=image_base64,
        image_mime=image_mime,
        chat_history=chat_history
    )

    # 7. Check and execute document creation/updating actions
    document_action, clean_answer = DocumentService.extract_document_action(raw_answer)
    doc_action_result = None

    if document_action:
        action_type = document_action.get("action", "create")
        doc_title = document_action.get("title", "Generated Document.md")
        doc_content = document_action.get("content", "")
        doc_id = document_action.get("doc_id")

        if action_type == "update" and doc_id:
            updated_doc = DocumentService.update_document(doc_id, doc_content, db, doc_title)
            if updated_doc:
                doc_action_result = {
                    "action": "updated",
                    "document_id": updated_doc.id,
                    "filename": updated_doc.filename,
                    "version": updated_doc.version
                }
        else:
            new_doc = DocumentService.create_document(doc_title, doc_content, "md", db)
            doc_action_result = {
                "action": "created",
                "document_id": new_doc.id,
                "filename": new_doc.filename,
                "version": new_doc.version
            }

    # 8. Save user message to database
    user_msg_record = Message(
        conversation_id=conversation.id,
        role="user",
        content=user_message,
        modality=modality_used,
        sources=None
    )
    db.add(user_msg_record)

    # 9. Save assistant message to database
    assistant_msg_record = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=clean_answer,
        modality=modality_used,
        sources=json.dumps(sources_list) if sources_list else None
    )
    db.add(assistant_msg_record)
    db.commit()

    return ChatResponse(
        answer=clean_answer,
        modality=modality_used,
        sources=sources_list,
        conversation_id=conversation.id,
        document_action=doc_action_result
    )

@router.get("/conversations", response_model=List[ConversationListItem])
def list_conversations(db: Session = Depends(get_db)):
    """Lists conversations with message counts ordered by latest activity."""
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    result = []
    for c in convs:
        result.append(ConversationListItem(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=len(c.messages)
        ))
    return result

@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
def get_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Retrieves full conversation history with parsed sources."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    
    msg_responses = []
    for m in conv.messages:
        parsed_sources = None
        if m.sources:
            try:
                parsed_sources = json.loads(m.sources)
            except Exception:
                parsed_sources = None
        msg_responses.append(MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            modality=m.modality,
            sources=parsed_sources,
            created_at=m.created_at
        ))
        
    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=msg_responses
    )

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: str, db: Session = Depends(get_db)):
    """Deletes conversation and associated messages."""
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    db.delete(conv)
    db.commit()
    return None
