"""API router for client-dispatched anonymous telemetry events."""

from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter
from tubemerger.apps.telemetry.service import TelemetryService

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


class TelemetryEventPayload(BaseModel):
    event_name: str
    props: Optional[Dict[str, Any]] = None


@router.post("/event")
def report_client_event(payload: TelemetryEventPayload):
    """Dispatch an anonymous client telemetry event to Aptabase."""
    TelemetryService.track_custom_event(payload.event_name, payload.props)
    return {"status": "ok"}
