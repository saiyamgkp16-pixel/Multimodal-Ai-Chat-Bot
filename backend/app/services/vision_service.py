import io
import base64
import logging
from typing import Tuple, Dict, Any, Optional
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

def process_image(image_bytes: bytes) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates uploaded image and prepares metadata and base64 representation.
    """
    if len(image_bytes) > settings.MAX_FILE_SIZE_BYTES:
        return False, f"Image size exceeds maximum limit of {settings.MAX_FILE_SIZE_BYTES // (1024*1024)}MB", {}

    try:
        img = Image.open(io.BytesIO(image_bytes))
        img_format = img.format.lower() if img.format else "png"
        
        # Normalize format string
        if img_format == "jpeg":
            mime_type = "image/jpeg"
        elif img_format == "png":
            mime_type = "image/png"
        elif img_format == "webp":
            mime_type = "image/webp"
        else:
            mime_type = f"image/{img_format}"

        # Safe dimensions check
        width, height = img.size
        
        # Convert to base64
        b64_str = base64.b64encode(image_bytes).decode("utf-8")
        
        metadata = {
            "format": img_format,
            "mime_type": mime_type,
            "width": width,
            "height": height,
            "size_bytes": len(image_bytes),
            "base64": b64_str
        }
        return True, "Image processed successfully", metadata
    except Exception as e:
        logger.error(f"Image processing error: {e}")
        return False, "Failed to decode image. Please ensure it is a valid JPG, PNG, or WebP file.", {}
