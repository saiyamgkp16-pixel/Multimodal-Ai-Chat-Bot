import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.schemas import TTSRequest, STTResponse
from app.services.tts_service import text_to_speech
from app.services.stt_service import speech_to_text
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/tts")
def tts_endpoint(request: TTSRequest):
    """
    Converts text to speech and streams back MP3 audio.
    Zero-external-key required (uses gTTS).
    """
    text = request.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    try:
        audio_stream = text_to_speech(text, lang=request.voice or "en")
        return StreamingResponse(
            audio_stream,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )
    except Exception as e:
        logger.error(f"TTS error: {e}")
        raise HTTPException(status_code=500, detail="Failed to synthesize speech audio.")

@router.post("/stt", response_model=STTResponse)
async def stt_endpoint(file: UploadFile = File(...)):
    """
    Converts uploaded audio file into transcribed text.
    """
    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is empty.")

    if len(audio_bytes) > settings.MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Audio file exceeds size limit.")

    success, transcript = await speech_to_text(audio_bytes, file.filename or "audio.wav")
    if not success:
        raise HTTPException(status_code=500, detail=transcript)

    return STTResponse(text=transcript)
