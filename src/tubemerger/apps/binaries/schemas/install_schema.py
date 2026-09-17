from pydantic import BaseModel
from tubemerger.apps.binaries.schemas.item_schema import BinaryItemSchema

class InstallBinariesResponseSchema(BaseModel):
    status: str
    message: str
    ffmpeg: BinaryItemSchema
    ytdlp: BinaryItemSchema
