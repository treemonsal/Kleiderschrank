import base64
import binascii
import io
import json
from typing import Literal
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, ConfigDict, Field

MAX_BODY = 7 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 8_000_000

class Attributes(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    name: str = Field(min_length=1, max_length=100)
    category: Literal['Oberteile', 'Hosen', 'Kleider', 'Jacken', 'Schuhe', 'Accessoires']
    color: Literal['', 'Schwarz', 'Weiss', 'Grau', 'Beige', 'Braun', 'Blau', 'Grün', 'Rot', 'Rosa', 'Gelb', 'Violett', 'Bunt']
    brand: str = Field(max_length=100)
    seasons: list[Literal['Frühling', 'Sommer', 'Herbst', 'Winter']] = Field(max_length=4)
    styles: list[Literal['Casual', 'Minimalistisch', 'Elegant', 'Sportlich', 'Streetwear', 'Vintage']] = Field(max_length=6)
    notes: str = Field(max_length=2000)


def decode_photo(value):
    if not isinstance(value, str) or not value.startswith('data:image/jpeg;base64,') or len(value) > MAX_BODY:
        raise ValueError('Invalid photo')
    try:
        raw = base64.b64decode(value.split(',', 1)[1], validate=True)
        if len(raw) > 5 * 1024 * 1024:
            raise ValueError('Photo too large')
        image = Image.open(io.BytesIO(raw))
        if image.format != 'JPEG' or max(image.size) > 1600 or min(image.size) < 16:
            raise ValueError('Invalid dimensions')
        image.load()
        return ImageOps.exif_transpose(image).convert('RGB')
    except (binascii.Error, UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
        raise ValueError('Invalid photo') from e


def parse_prediction(text):
    text = text.strip()
    if text.startswith('```'):
        text = text.split('\n', 1)[1].rsplit('```', 1)[0].strip()
    return Attributes.model_validate(json.loads(text)).model_dump()
