"""Unit tests for error categorization, telemetry tracking, and fault-tolerance logic."""

import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from tubemerge.apps.telemetry.service import TelemetryService
from fastapi.testclient import TestClient
from tubemerge.server.app import create_app

app = create_app()
client = TestClient(app)


class TestErrorCategorization(unittest.TestCase):
    def test_rate_limited_categorization(self):
        err = "ERROR: [youtube] 12345: HTTP Error 429: Too Many Requests"
        subtype = TelemetryService.categorize_ytdlp_error(err)
        self.assertEqual(subtype, "rate_limited_429")
        self.assertTrue(TelemetryService.is_resolvable_error(subtype))

    def test_bot_detection_categorization(self):
        err = "Sign in to confirm you’re not a bot. Use --cookies-from-browser to authenticate."
        subtype = TelemetryService.categorize_ytdlp_error(err)
        self.assertEqual(subtype, "bot_detection")
        self.assertTrue(TelemetryService.is_resolvable_error(subtype))

    def test_video_unavailable_categorization(self):
        err = "ERROR: [youtube] abcde: Private video. Sign in if you've been granted access to this video"
        subtype = TelemetryService.categorize_ytdlp_error(err)
        self.assertEqual(subtype, "video_unavailable")
        self.assertFalse(TelemetryService.is_resolvable_error(subtype))

    def test_copyright_takedown_categorization(self):
        err = "This video contains content from Sony Music Entertainment, who has blocked it on copyright grounds"
        subtype = TelemetryService.categorize_ytdlp_error(err)
        self.assertEqual(subtype, "copyright_takedown")
        self.assertFalse(TelemetryService.is_resolvable_error(subtype))

    def test_geo_restriction_categorization(self):
        err = "The uploader has not made this video available in your country."
        subtype = TelemetryService.categorize_ytdlp_error(err)
        self.assertEqual(subtype, "geo_restricted")
        self.assertFalse(TelemetryService.is_resolvable_error(subtype))

    def test_ffmpeg_missing_categorization(self):
        err = "ERROR: ffmpeg not found. Please install ffmpeg or specify path with --ffmpeg-location"
        subtype = TelemetryService.categorize_ytdlp_error(err)
        self.assertEqual(subtype, "missing_ffmpeg_binary")
        self.assertFalse(TelemetryService.is_resolvable_error(subtype))

    def test_timeout_categorization(self):
        err = "ReadTimeout: HTTPSConnectionPool(host='googlevideo.com', port=443): Read timed out."
        subtype = TelemetryService.categorize_ytdlp_error(err)
        self.assertEqual(subtype, "network_timeout")
        self.assertTrue(TelemetryService.is_resolvable_error(subtype))

    def test_disk_full_categorization(self):
        err = "[Errno 28] No space left on device"
        subtype = TelemetryService.categorize_ytdlp_error(err)
        self.assertEqual(subtype, "disk_full")
        self.assertFalse(TelemetryService.is_resolvable_error(subtype))

    def test_size_bucketing(self):
        self.assertEqual(TelemetryService._bucket_size(50), "<100MB")
        self.assertEqual(TelemetryService._bucket_size(350), "100-500MB")
        self.assertEqual(TelemetryService._bucket_size(850), "500MB-1GB")
        self.assertEqual(TelemetryService._bucket_size(3500), "1-5GB")
        self.assertEqual(TelemetryService._bucket_size(8000), "5GB+")


class TestTelemetryRoutes(unittest.TestCase):
    def test_post_custom_event(self):
        response = client.post(
            "/api/telemetry/event",
            json={
                "event_name": "issue_report_opened",
                "props": {
                    "error_subtype": "rate_limited_429",
                    "clip_count": 96,
                },
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")


if __name__ == "__main__":
    unittest.main()
