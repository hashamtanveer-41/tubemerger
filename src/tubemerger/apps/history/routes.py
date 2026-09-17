"""API routes for Merge History."""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException

from tubemerger.apps.history.services import HistoryService

router = APIRouter(prefix="/api/history", tags=["Merge History"])

@router.get("", response_model=List[Dict[str, Any]])
def list_history():
    """Returns chronological merge history."""
    return HistoryService.get_all_history()

@router.delete("/{history_id}")
def delete_history_item(history_id: int):
    """Deletes a single history record."""
    success = HistoryService.delete_history_item(history_id)
    if not success:
        raise HTTPException(status_code=404, detail="History record not found.")
    return {"status": "deleted", "id": history_id}

@router.delete("")
def clear_all_history():
    """Clears all history records."""
    HistoryService.clear_all_history()
    return {"status": "cleared", "message": "All history records purged."}
