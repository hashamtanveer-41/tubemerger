"""Brevo (Sendinblue) email integration and GitHub feedback dispatcher."""

import logging
import os
import threading
from typing import Dict, Any, Optional
import urllib.parse

try:
    import httpx
except ImportError:
    httpx = None

from tubemerger.core import settings
from tubemerger.core.config import BREVO_API_KEY
from tubemerger.apps.telemetry.service import TelemetryService

logger = logging.getLogger(__name__)

GITHUB_REPO = "hashamtanveer-41/tubemerger"
DEFAULT_TARGET_EMAIL = "hashamtanveer41@gmail.com"


class FeedbackService:
    """Service to deliver user reviews and cancellation complaints to maintainers."""

    @staticmethod
    def _send_brevo_email(
        subject: str,
        html_body: str,
        user_email: Optional[str] = None,
    ) -> bool:
        """Send transactional email via Brevo API in non-blocking manner."""
        api_key = os.environ.get("BREVO_API_KEY") or BREVO_API_KEY
        if not api_key or not httpx:
            logger.info("Brevo API key not set or httpx missing; skipping direct email.")
            return False

        try:
            payload = {
                "sender": {
                    "name": "TubeMerger Feedback",
                    "email": "feedback@tubemerger.com",
                },
                "to": [
                    {
                        "email": DEFAULT_TARGET_EMAIL,
                        "name": "Hasham Tanveer",
                    }
                ],
                "replyTo": {
                    "email": user_email if user_email else DEFAULT_TARGET_EMAIL,
                },
                "subject": subject,
                "htmlContent": html_body,
            }

            headers = {
                "api-key": api_key.strip(),
                "Content-Type": "application/json",
                "accept": "application/json",
            }

            with httpx.Client(timeout=10.0) as client:
                resp = client.post(
                    "https://api.brevo.com/v3/smtp/email",
                    headers=headers,
                    json=payload,
                )
                if resp.status_code in (200, 201, 202):
                    logger.info("Feedback successfully delivered via Brevo.")
                    return True
                else:
                    logger.info("Brevo API key disabled/blocked (%d); using mailto/gmail delivery fallback.", resp.status_code)
                    return False
        except Exception as exc:
            logger.info("Direct Brevo dispatch unavailable (%s); using mailto/gmail fallback.", exc)
            return False

    @classmethod
    def submit_review(
        cls,
        rating: int,
        review_text: str,
        user_email: Optional[str] = None,
        system_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Process user review, generate direct mailto/Gmail URLs, send via Brevo if available, track telemetry, and generate GitHub issue URL."""
        # 1. Track event to Aptabase telemetry
        TelemetryService.track_custom_event(
            "user_review_submitted",
            {
                "rating": int(rating),
                "has_notes": bool(review_text and review_text.strip()),
                "has_email": bool(user_email and user_email.strip()),
            },
        )

        # 2. Build email links (mailto & web Gmail) and GitHub fallback URL
        stars_str = "⭐" * max(1, min(5, rating))
        title = f"[TubeMerger Review] {stars_str} ({rating}/5)"
        email_body = (
            f"TubeMerger User Review ({rating}/5 Stars)\n"
            f"Rating: {stars_str} ({rating}/5)\n"
            f"Version: {settings.VERSION}\n"
            f"Platform: {system_info.get('platform') if system_info else 'Desktop'}\n"
            f"From: {user_email or 'Anonymous User'}\n\n"
            f"Feedback / Comments:\n"
            f"{review_text.strip() if review_text else '(No additional comments)'}\n"
        )
        mailto_url = f"mailto:{DEFAULT_TARGET_EMAIL}?subject={urllib.parse.quote(title)}&body={urllib.parse.quote(email_body)}"
        gmail_url = f"https://mail.google.com/mail/?view=cm&fs=1&to={DEFAULT_TARGET_EMAIL}&su={urllib.parse.quote(title)}&body={urllib.parse.quote(email_body)}"

        body_lines = [
            f"### User Review ({rating}/5 Stars)",
            f"- **Rating**: {stars_str} ({rating}/5)",
            f"- **Version**: {settings.VERSION}",
            f"- **Platform**: {system_info.get('platform') if system_info else 'Desktop'}",
            "",
            "#### Review / Feedback",
            review_text.strip() if review_text else "*(No additional comments)*",
        ]
        body_text = "\n".join(body_lines)
        github_url = f"https://github.com/{GITHUB_REPO}/issues/new?title={urllib.parse.quote(title)}&body={urllib.parse.quote(body_text)}"

        # 3. Send email asynchronously via Brevo if API key is active
        html_content = f"""
        <h2>TubeMerger User Review</h2>
        <p><strong>Rating:</strong> {stars_str} ({rating}/5)</p>
        <p><strong>From:</strong> {user_email or 'Anonymous User'}</p>
        <p><strong>App Version:</strong> {settings.VERSION}</p>
        <hr/>
        <h3>Feedback:</h3>
        <p>{review_text or 'No text provided.'}</p>
        """

        threading.Thread(
            target=cls._send_brevo_email,
            args=(f"[TubeMerger Review] {rating} Stars", html_content, user_email),
            daemon=True,
        ).start()

        return {
            "status": "ok",
            "mailto_url": mailto_url,
            "gmail_url": gmail_url,
            "github_url": github_url,
            "target_email": DEFAULT_TARGET_EMAIL,
        }

    @classmethod
    def submit_cancellation_complaint(
        cls,
        reason: str,
        complaint_text: Optional[str] = None,
        job_details: Optional[Dict[str, Any]] = None,
        user_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Record why user cancelled a playlist or video download."""
        # 1. Track in telemetry
        details = job_details or {}
        TelemetryService.track_custom_event(
            "cancellation_complaint_submitted",
            {
                "reason": reason,
                "overall_percent": details.get("overall_percent", 0),
                "clip_count": details.get("clip_count", 0),
                "preset": details.get("preset", "unknown"),
                "has_notes": bool(complaint_text and complaint_text.strip()),
            },
        )

        # 2. Build email links and GitHub issue URL for troubleshooting
        title = f"[TubeMerger Complaint]: {reason}"
        email_body = (
            f"TubeMerger Cancellation Complaint\n"
            f"Reason: {reason}\n"
            f"Percent at Cancel: {details.get('overall_percent', 0)}%\n"
            f"Clip Count: {details.get('clip_count', 0)}\n"
            f"Preset: {details.get('preset', 'unknown')}\n"
            f"Version: {settings.VERSION}\n"
            f"User Email: {user_email or 'Anonymous'}\n\n"
            f"User Notes:\n"
            f"{complaint_text.strip() if complaint_text else '(No notes provided)'}\n"
        )
        mailto_url = f"mailto:{DEFAULT_TARGET_EMAIL}?subject={urllib.parse.quote(title)}&body={urllib.parse.quote(email_body)}"
        gmail_url = f"https://mail.google.com/mail/?view=cm&fs=1&to={DEFAULT_TARGET_EMAIL}&su={urllib.parse.quote(title)}&body={urllib.parse.quote(email_body)}"

        body_lines = [
            "### Cancellation Complaint",
            f"- **Reason**: {reason}",
            f"- **Percent when cancelled**: {details.get('overall_percent', 0)}%",
            f"- **Clip Count**: {details.get('clip_count', 0)}",
            f"- **Preset**: {details.get('preset', 'unknown')}",
            f"- **App Version**: {settings.VERSION}",
            "",
            "#### User Details / Notes",
            complaint_text.strip() if complaint_text else "*(None provided)*",
        ]
        body_text = "\n".join(body_lines)
        github_url = f"https://github.com/{GITHUB_REPO}/issues/new?title={urllib.parse.quote(title)}&body={urllib.parse.quote(body_text)}"

        # 3. Send email asynchronously via Brevo if configured
        html_content = f"""
        <h2>TubeMerger Cancellation Complaint</h2>
        <p><strong>Reason:</strong> {reason}</p>
        <p><strong>Percent at Cancel:</strong> {details.get('overall_percent', 0)}%</p>
        <p><strong>Clip Count:</strong> {details.get('clip_count', 0)}</p>
        <p><strong>Preset:</strong> {details.get('preset', 'unknown')}</p>
        <p><strong>User Email:</strong> {user_email or 'Anonymous'}</p>
        <hr/>
        <h3>User Notes:</h3>
        <p>{complaint_text or 'No notes provided.'}</p>
        """

        threading.Thread(
            target=cls._send_brevo_email,
            args=(f"[TubeMerger Complaint] {reason}", html_content, user_email),
            daemon=True,
        ).start()

        return {
            "status": "ok",
            "mailto_url": mailto_url,
            "gmail_url": gmail_url,
            "github_url": github_url,
            "target_email": DEFAULT_TARGET_EMAIL,
        }
