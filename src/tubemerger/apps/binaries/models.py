"""Domain models for binary dependencies."""

from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class BinaryInfo:
    """Represents the status, path, and version of an external tool binary."""
    name: str
    status: str  # 'ok' or 'missing'
    path: Optional[str] = None
    version: Optional[str] = None

    @property
    def is_available(self) -> bool:
        return self.status == "ok" and self.path is not None
