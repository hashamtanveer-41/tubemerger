"""API router for client-dispatched anonymous telemetry events."""

from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter
from tubemerger.apps.telemetry.service import TelemetryService

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


class TelemetryEventPayload(BaseModel):
    event_name: str
    props: Optional[Dict[str, Any]] = None
    properties: Optional[Dict[str, Any]] = None


@router.post("/event")
def report_client_event(payload: TelemetryEventPayload):
    """Dispatch an anonymous client telemetry event to Aptabase."""
    event_props = payload.props if payload.props is not None else (payload.properties or {})
    TelemetryService.track_custom_event(payload.event_name, event_props)
    return {"status": "ok"}
