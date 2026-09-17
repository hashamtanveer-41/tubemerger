from pydantic import BaseModel
from tubemerger.apps.binaries.schemas.item_schema import BinaryItemSchema

class HealthResponseSchema(BaseModel):
    ffmpeg: BinaryItemSchema
    ytdlp: BinaryItemSchema
