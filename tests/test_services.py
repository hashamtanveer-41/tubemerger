"""Unit and integration tests for TubeMerger Django-style modular backend services."""

import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from tubemerger.core import settings
from tubemerger.apps.binaries.services import BinaryService
from tubemerger.apps.playlists.models import VideoClip, Playlist
from tubemerger.apps.playlists.services import PlaylistMetadataService
from tubemerger.apps.merger.services.normalizer import VideoNormalizerService
from tubemerger.apps.merger.services.stitcher import VideoStitcherService
from tubemerger.apps.merger.models import PipelineStatus

class TestDomainModels(unittest.TestCase):
    def test_video_clip_duration_formatted(self):
        clip = VideoClip(id="123", title="Test", url="http://youtube.com", duration_seconds=125)
        self.assertEqual(clip.duration_formatted, "2m 05s")

    def test_video_clip_hours_formatted(self):
        clip = VideoClip(id="123", title="Test", url="http://youtube.com", duration_seconds=3665)
        self.assertEqual(clip.duration_formatted, "1h 01m")

    def test_video_clip_resolution_label(self):
        clip1 = VideoClip(id="1", title="T", url="u", height=1080)
        self.assertEqual(clip1.resolution_label, "1080p")
        clip2 = VideoClip(id="2", title="T", url="u", height=2160)
        self.assertEqual(clip2.resolution_label, "4K")
        clip3 = VideoClip(id="3", title="T", url="u", height=720)
        self.assertEqual(clip3.resolution_label, "720p")

    def test_playlist_total_duration(self):
        c1 = VideoClip(id="1", title="A", url="u", duration_seconds=100)
        c2 = VideoClip(id="2", title="B", url="u", duration_seconds=200)
        p = Playlist(playlist_id="p1", title="Play", channel="Chan", webpage_url="http://", entries=[c1, c2])
        self.assertEqual(p.total_duration_seconds, 300)
        self.assertEqual(p.total_duration_formatted, "5m 00s")
        self.assertEqual(p.video_count, 2)

class TestNormalizerFilterGraph(unittest.TestCase):
    def test_filter_graph_generation(self):
        fg = VideoNormalizerService.build_filter_graph(1920, 1080, 30)
        self.assertIn("scale=1920:1080:force_original_aspect_ratio=decrease", fg)
        self.assertIn("pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black", fg)
        self.assertIn("setsar=1", fg)
        self.assertIn("fps=30", fg)

class TestStitcherService(unittest.TestCase):
    def test_build_chapter_metadata(self):
        titles = ["Chapter One", "Chapter Two"]
        durations = [30.0, 45.0]
        meta = VideoStitcherService.build_chapter_metadata(titles, durations)
        self.assertIn(";FFMETADATA1", meta)
        self.assertIn("[CHAPTER]", meta)
        self.assertIn("START=0", meta)
        self.assertIn("END=30000", meta)
        self.assertIn("title=Chapter One", meta)
        self.assertIn("START=30000", meta)
        self.assertIn("END=75000", meta)
        self.assertIn("title=Chapter Two", meta)

    def test_posix_manifest_escaping(self):
        path = Path("/tmp/dir with space/video's.mp4")
        line = VideoStitcherService.write_manifest
        # Check escape logic directly
        from tubemerger.utils.file_system import escape_posix_path
        res = escape_posix_path(path)
        self.assertTrue(res.startswith("file '"))
        self.assertIn(r"'\''", res)

class TestMetadataUrlSanitization(unittest.TestCase):
    def test_sanitize_url(self):
        raw = "  'https://www.youtube.com/playlist?list=PL123'  "
        clean = PlaylistMetadataService.sanitize_url(raw)
        self.assertEqual(clean, "https://www.youtube.com/playlist?list=PL123")

class TestTelemetryService(unittest.TestCase):
    def test_telemetry_payload_structure(self):
        from tubemerger.apps.telemetry.service import TelemetryService, _SYSTEM_PROPS, _SESSION_ID
        self.assertIn("osName", _SYSTEM_PROPS)
        self.assertIn("sdkVersion", _SYSTEM_PROPS)
        self.assertTrue(len(_SESSION_ID) > 8)

class TestFOSSController(unittest.TestCase):
    def test_merge_job_spec(self):
        from tubemerger.apps.merger.services.engine import MergeJobSpec
        spec = MergeJobSpec(
            playlist_url="https://youtube.com/playlist?list=test",
            selected_indices=[0, 1],
            output_filename="test.mp4",
        )
        self.assertEqual(spec.crf, 21)
        self.assertEqual(spec.canvas_preset, "auto")

class TestProcessUtils(unittest.TestCase):
    def test_clean_subprocess_env_removes_ld_library_path(self):
        import os
        from tubemerger.utils.process import get_clean_subprocess_env, get_hidden_subprocess_kwargs
        with patch.dict(os.environ, {"LD_LIBRARY_PATH": "/some/internal/path"}, clear=False):
            if "LD_LIBRARY_PATH_ORIG" in os.environ:
                del os.environ["LD_LIBRARY_PATH_ORIG"]
            env = get_clean_subprocess_env()
            self.assertNotIn("LD_LIBRARY_PATH", env)

    def test_clean_subprocess_env_restores_ld_library_path_orig(self):
        import os
        from tubemerger.utils.process import get_clean_subprocess_env
        with patch.dict(os.environ, {"LD_LIBRARY_PATH": "/internal", "LD_LIBRARY_PATH_ORIG": "/orig/lib"}, clear=False):
            env = get_clean_subprocess_env()
            self.assertEqual(env.get("LD_LIBRARY_PATH"), "/orig/lib")


class TestPauseResume(unittest.TestCase):
    def test_engine_pause_and_resume(self):
        from tubemerger.apps.merger.services.engine import MergeEngine, MergeJobSpec, ProgressSnapshot, PipelineStatus
        emitted = []
        spec = MergeJobSpec(
            playlist_url="https://youtube.com/playlist?list=test",
            selected_indices=[0],
            output_filename="test.mp4",
        )
        engine = MergeEngine(
            job_spec=spec,
            ytdlp_path="/dummy/yt-dlp",
            ffmpeg_path="/dummy/ffmpeg",
            metadata_service=MagicMock(),
            on_progress=lambda s: emitted.append(s),
        )

        # Initial state
        self.assertFalse(engine.is_paused)

        # Test pausing
        ok = engine.pause()
        self.assertTrue(ok)
        self.assertTrue(engine.is_paused)
        self.assertEqual(len(emitted), 1)
        self.assertEqual(emitted[-1].status, PipelineStatus.PAUSED)
        self.assertIn("paused", emitted[-1].message.lower())

        # Second pause is idempotent
        ok2 = engine.pause()
        self.assertTrue(ok2)

        # Test resume
        ok_resume = engine.resume()
        self.assertTrue(ok_resume)
        self.assertFalse(engine.is_paused)
        self.assertEqual(emitted[-1].status, PipelineStatus.DOWNLOADING)
        self.assertIn("resum", emitted[-1].message.lower())

        # Second resume is idempotent
        ok_resume2 = engine.resume()
        self.assertTrue(ok_resume2)


class TestErrorDiagnostics(unittest.TestCase):
    def test_mashed_multiple_urls(self):
        from tubemerger.apps.playlists.services import diagnose_extraction_error
        url = "https://www.youtube.com/playlist?list=PLX9BFXyidv0Mhttps://music.youtube.com/playlist?list=RDCLAK5uy_nmS3YoxSwVVQk9IE"
        diag = diagnose_extraction_error(url, "")
        self.assertEqual(diag.title, "Multiple Links Detected")
        self.assertIn("Multiple URLs were detected", diag.message)

    def test_http_400_bad_request_diagnosis(self):
        from tubemerger.apps.playlists.services import diagnose_extraction_error
        err = "[youtube:tab] PLX9BFXyidv0Mhttps:: Unable to download API page: HTTP Error 400: Bad Request (caused by <HTTPError 400: Bad Request>)"
        diag = diagnose_extraction_error("https://youtube.com/playlist?list=bad", err)
        self.assertEqual(diag.title, "Invalid Link Parameter")
        self.assertIn("Bad Request 400", diag.message)
        self.assertNotIn("[youtube:tab]", diag.message)
        self.assertNotIn("HTTPError", diag.message)

    def test_sanitization_removes_raw_ytdlp_syntax(self):
        from tubemerger.apps.playlists.services import diagnose_extraction_error
        err = "ERROR: [generic] SomeCustomError:: Some stream failure (caused by <CustomException>)"
        diag = diagnose_extraction_error("https://youtube.com/watch?v=123", err)
        self.assertNotIn("ERROR:", diag.message)
        self.assertNotIn("[generic]", diag.message)
        self.assertNotIn("caused by", diag.message)


class TestSystemSettings(unittest.TestCase):
    def test_settings_persistence(self):
        import tempfile
        from tubemerger.apps.system.services import SystemService
        with tempfile.TemporaryDirectory() as tmpdir:
            test_file = Path(tmpdir) / "settings.json"
            with patch("tubemerger.core.settings.SETTINGS_FILE", test_file):
                # Initial default
                init = SystemService.get_settings()
                self.assertFalse(init.get("tour_completed", False))

                # Update setting
                updated = SystemService.update_settings({"tour_completed": True})
                self.assertTrue(updated.get("tour_completed"))

                # Read again
                read_back = SystemService.get_settings()
                self.assertTrue(read_back.get("tour_completed"))


class TestProgressParsingAndMonotonicity(unittest.TestCase):
    def test_parse_status_line_with_eta(self):
        from tubemerger.apps.merger.services.progress_parser import parse_status_line
        res = parse_status_line("STATUS| 45.0%| 5.2MiB/s| 01:25")
        self.assertIsNotNone(res)
        pct, spd, eta = res
        self.assertEqual(pct, 45.0)
        self.assertEqual(spd, "5.2MB/s")
        self.assertEqual(eta, "1m 25s left")

    def test_format_human_eta_seconds_only(self):
        from tubemerger.apps.merger.services.progress_parser import format_human_eta
        self.assertEqual(format_human_eta("00:45"), "45s left")
        self.assertEqual(format_human_eta("00:00"), "Almost done")
        self.assertEqual(format_human_eta("02:10:05"), "2h 10m left")
        self.assertIsNone(format_human_eta("NA"))
        self.assertIsNone(format_human_eta("Unknown"))

    def test_format_seconds_remaining(self):
        from tubemerger.apps.merger.services.progress_parser import format_seconds_remaining
        self.assertEqual(format_seconds_remaining(30), "30s left")
        self.assertEqual(format_seconds_remaining(150), "2m 30s left")
        self.assertEqual(format_seconds_remaining(3665), "1h 01m left")

    def test_engine_emit_strictly_monotonic(self):
        from tubemerger.apps.merger.services.engine import MergeEngine, MergeJobSpec
        from tubemerger.apps.merger.services.specs import ProgressSnapshot, PipelineStatus

        spec = MergeJobSpec(playlist_url="https://youtube.com/playlist?list=test", selected_indices=[0])
        engine = MergeEngine(
            job_spec=spec,
            ytdlp_path="dummy",
            ffmpeg_path="dummy",
            metadata_service=MagicMock(),
        )

        # Emit 35.0%
        engine._emit(ProgressSnapshot(status=PipelineStatus.DOWNLOADING, overall_percent=35.0))
        self.assertEqual(engine._last_snapshot.overall_percent, 35.0)

        # Attempt to emit lower percent (e.g. 10.0% due to stream switch)
        engine._emit(ProgressSnapshot(status=PipelineStatus.DOWNLOADING, overall_percent=10.0))
        # Monotonic invariant clamps to 35.0%
        self.assertEqual(engine._last_snapshot.overall_percent, 35.0)

        # Higher percent advances
        engine._emit(ProgressSnapshot(status=PipelineStatus.DOWNLOADING, overall_percent=42.5))
        self.assertEqual(engine._last_snapshot.overall_percent, 42.5)


class TestFeedbackService(unittest.TestCase):
    def test_submit_review_generates_github_url(self):
        from tubemerger.apps.feedback.services.brevo_service import FeedbackService
        res = FeedbackService.submit_review(
            rating=5,
            review_text="Fast and smooth downloads!",
            user_email="tester@example.com",
            system_info={"platform": "Linux"},
        )
        self.assertEqual(res["status"], "ok")
        self.assertIn("github.com/hashamtanveer-41/tubemerger/issues/new", res["github_url"])
        self.assertIn("User%20Review", res["github_url"])
        self.assertIn("mailto:hashamtanveer41@gmail.com", res["mailto_url"])
        self.assertIn("mail.google.com", res["gmail_url"])

    def test_submit_cancellation_complaint(self):
        from tubemerger.apps.feedback.services.brevo_service import FeedbackService
        res = FeedbackService.submit_cancellation_complaint(
            reason="Loading bar felt stuck",
            complaint_text="Progress stopped at 40%",
            job_details={"overall_percent": 40.0, "clip_count": 10, "preset": "1080p"},
        )
        self.assertEqual(res["status"], "ok")
        self.assertIn("Cancellation%20Complaint", res["github_url"])
        self.assertIn("mailto:hashamtanveer41@gmail.com", res["mailto_url"])
        self.assertIn("mail.google.com", res["gmail_url"])


    def test_stream_progress_preserves_speed_and_eta(self):
        import asyncio
        import json
        from tubemerger.apps.merger.controllers.merge_controller import MergeController
        from tubemerger.apps.merger.models import ProgressSnapshot, PipelineStatus

        ctrl = MergeController()
        snap1 = ProgressSnapshot(status=PipelineStatus.DOWNLOADING, overall_percent=20.0, speed="3.5MB/s", eta="1m 30s left")
        snap2 = ProgressSnapshot(status=PipelineStatus.DOWNLOADING, overall_percent=25.0, message="Connecting to media stream…", speed=None, eta=None)
        snap3 = ProgressSnapshot(status=PipelineStatus.DONE, overall_percent=100.0, message="Done")

        async def run_test():
            resp = await ctrl.stream_progress()
            q = ctrl.progress_queues[-1]
            q.put_nowait(snap1)
            q.put_nowait(snap2)
            q.put_nowait(snap3)

            events = []
            async for chunk in resp.body_iterator:
                if chunk.startswith("data: "):
                    events.append(json.loads(chunk[6:].strip()))
            return events

        events = asyncio.run(run_test())
        self.assertEqual(len(events), 3)
        self.assertEqual(events[0]["speed"], "3.5MB/s")
        self.assertEqual(events[0]["eta"], "1m 30s left")
        # snap2 had None for speed and eta, but stream_progress preserved them during DOWNLOADING
        self.assertEqual(events[1]["speed"], "3.5MB/s")
        self.assertEqual(events[1]["eta"], "1m 30s left")


class TestFolderDownloaderAndErrorHandling(unittest.TestCase):
    def test_folder_downloader_runs_without_name_error(self):
        import tempfile
        from tubemerger.apps.merger.services.downloaders.folder_downloader import FolderDownloader
        from tubemerger.apps.merger.services.specs import ProgressSnapshot, PipelineStatus

        clips = [
            VideoClip(id="c1", title="Clip One", url="https://youtube.com/watch?v=c1", duration_seconds=10),
            VideoClip(id="c2", title="Clip Two", url="https://youtube.com/watch?v=c2", duration_seconds=20),
        ]
        pl = Playlist(playlist_id="p1", title="Test Playlist", channel="Creator", webpage_url="https://youtube.com/playlist?list=p1", entries=clips)

        snapshots = []
        def emit_cb(snap: ProgressSnapshot):
            snapshots.append(snap)

        with tempfile.TemporaryDirectory() as td:
            d_dir = Path(td) / "downloads"
            t_dir = Path(td) / "temp"
            d_dir.mkdir()
            t_dir.mkdir()

            def mock_run_download(cmd, on_progress_update=None, on_status_update=None):
                if on_progress_update:
                    on_progress_update(50.0, "5.0MB/s", "10s left")
                # simulate creating output file
                # target folder is inside d_dir
                for sub in d_dir.iterdir():
                    if sub.is_dir():
                        for idx, clip in enumerate(clips, 1):
                            clean = "".join(c for c in clip.title if c.isalnum() or c in " _-")[:80].strip()
                            (sub / f"{idx:02d} - {clean}.mp4").write_bytes(b"dummy_video_data")
                return 0, ""

            fd = FolderDownloader(
                ytdlp_path="yt-dlp",
                ffmpeg_path="ffmpeg",
                run_download_fn=mock_run_download,
                emit_fn=emit_cb,
                check_pause_fn=lambda: None,
                check_cancelled_fn=lambda: False,
            )

            # This must complete without NameError: name 'last_speed' is not defined
            fd.download(
                selected_entries=clips,
                playlist=pl,
                job_id="test1234",
                is_audio=False,
                quality="1080p",
                audio_bitrate=None,
                downloads_dir=d_dir,
                temp_dir=t_dir,
            )

            self.assertTrue(len(snapshots) > 0)
            download_snaps = [s for s in snapshots if s.status == PipelineStatus.DOWNLOADING]
            self.assertTrue(len(download_snaps) >= 2)

    def test_categorize_ytdlp_error_extracts_subtype_token(self):
        from tubemerger.apps.telemetry.classifier import categorize_ytdlp_error
        # Previously returned 'other_Download_failed_for_...'
        res = categorize_ytdlp_error("Download failed for My Video (network_timeout): connection timed out")
        self.assertEqual(res, "network_timeout")

        res2 = categorize_ytdlp_error("Download failed for Film (bot_detection): Sign in to confirm you're not a bot")
        self.assertEqual(res2, "bot_detection")

        res3 = categorize_ytdlp_error("Download failed for Song (rate_limited_429): HTTP Error 429: Too Many Requests")
        self.assertEqual(res3, "rate_limited_429")


if __name__ == "__main__":
    unittest.main()




