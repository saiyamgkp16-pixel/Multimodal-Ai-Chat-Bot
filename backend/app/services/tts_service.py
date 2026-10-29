import io
import logging
from gtts import gTTS

logger = logging.getLogger(__name__)

def text_to_speech(text: str, lang: str = "en") -> io.BytesIO:
    """
    Converts text to speech using gTTS and returns an in-memory BytesIO stream of MP3 audio.
    Zero-key requirement for the MVP.
    """
    try:
        # Limit text to 1000 characters to prevent excessive generation latency
        truncated_text = text[:1000] if len(text) > 1000 else text
        tts = gTTS(text=truncated_text, lang=lang, slow=False)
        audio_fp = io.BytesIO()
        tts.write_to_fp(audio_fp)
        audio_fp.seek(0)
        return audio_fp
    except Exception as e:
        logger.error(f"TTS generation error: {e}")
        raise RuntimeError(f"Text-to-speech conversion failed: {str(e)}")
