from typing import Optional
from pydantic import BaseModel

class BinaryItemSchema(BaseModel):
    status: str
    path: Optional[str] = None
    version: Optional[str] = None
