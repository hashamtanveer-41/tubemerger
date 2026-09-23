"""API router for submitting user reviews and cancellation complaints."""

from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter
from tubemerger.apps.feedback.services.brevo_service import FeedbackService

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


class ReviewRequest(BaseModel):
    rating: int
    review_text: str
    user_email: Optional[str] = None
    system_info: Optional[Dict[str, Any]] = None


class CancellationComplaintRequest(BaseModel):
    reason: str
    complaint_text: Optional[str] = None
    job_details: Optional[Dict[str, Any]] = None
    user_email: Optional[str] = None


@router.post("/review")
def submit_review(payload: ReviewRequest):
    """Handle 3-4 video milestone review submission."""
    return FeedbackService.submit_review(
        rating=payload.rating,
        review_text=payload.review_text,
        user_email=payload.user_email,
        system_info=payload.system_info,
    )


@router.post("/cancellation")
def submit_cancellation_complaint(payload: CancellationComplaintRequest):
    """Handle user feedback/complaint when cancelling a download."""
    return FeedbackService.submit_cancellation_complaint(
        reason=payload.reason,
        complaint_text=payload.complaint_text,
        job_details=payload.job_details,
        user_email=payload.user_email,
    )
