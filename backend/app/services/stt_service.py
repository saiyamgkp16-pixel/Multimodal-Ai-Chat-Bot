import logging
from typing import Tuple
import httpx
from app.config import settings

logger = logging.getLogger(__name__)

async def speech_to_text(audio_bytes: bytes, filename: str = "audio.wav") -> Tuple[bool, str]:
    """
    Transcribes audio bytes to text.
    If STT_API_KEY or OpenAI LLM_API_KEY is available, calls Whisper API.
    Otherwise provides a helpful fallback message.
    """
    api_key = settings.STT_API_KEY or (settings.LLM_API_KEY if settings.LLM_PROVIDER == "openai" else None)
    
    if api_key:
        try:
            url = "https://api.openai.com/v1/audio/transcriptions"
            headers = {"Authorization": f"Bearer {api_key}"}
            files = {
                "file": (filename, audio_bytes, "audio/wav"),
                "model": (None, "whisper-1"),
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, headers=headers, files=files)
                if resp.status_code == 200:
                    data = resp.json()
                    transcript = data.get("text", "").strip()
                    return True, transcript
                else:
                    logger.error(f"Whisper API error: {resp.text}")
                    return False, f"Transcription API failed with code {resp.status_code}."
        except Exception as e:
            logger.error(f"STT API request failed: {e}")
            return False, f"Speech-to-text service error: {str(e)}"

    # Never fabricate a transcript: callers should show a clear configuration error.
    return False, (
        "Speech-to-text is not configured. Set STT_API_KEY or configure an OpenAI "
        "LLM_API_KEY to enable uploaded-audio transcription. Browser microphone "
        "dictation can still work independently when supported."
    )
