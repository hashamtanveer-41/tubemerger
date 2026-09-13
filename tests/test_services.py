"""Unit and integration tests for TubeMerger Django-style modular backend services."""

import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from tubemerge.core import settings
from tubemerge.apps.binaries.services import BinaryService
from tubemerge.apps.playlists.models import VideoClip, Playlist
from tubemerge.apps.playlists.services import PlaylistMetadataService
from tubemerge.apps.merger.services.normalizer import VideoNormalizerService
from tubemerge.apps.merger.services.stitcher import VideoStitcherService
from tubemerge.apps.merger.models import PipelineStatus

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
        from tubemerge.utils.file_system import escape_posix_path
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
        from tubemerge.apps.telemetry.service import TelemetryService, _SYSTEM_PROPS, _SESSION_ID
        self.assertIn("osName", _SYSTEM_PROPS)
        self.assertIn("sdkVersion", _SYSTEM_PROPS)
        self.assertTrue(len(_SESSION_ID) > 8)

class TestFOSSController(unittest.TestCase):
    def test_merge_job_spec(self):
        from tubemerge.apps.merger.services.engine import MergeJobSpec
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
        from tubemerge.utils.process import get_clean_subprocess_env, get_hidden_subprocess_kwargs
        with patch.dict(os.environ, {"LD_LIBRARY_PATH": "/some/internal/path"}, clear=False):
            if "LD_LIBRARY_PATH_ORIG" in os.environ:
                del os.environ["LD_LIBRARY_PATH_ORIG"]
            env = get_clean_subprocess_env()
            self.assertNotIn("LD_LIBRARY_PATH", env)

    def test_clean_subprocess_env_restores_ld_library_path_orig(self):
        import os
        from tubemerge.utils.process import get_clean_subprocess_env
        with patch.dict(os.environ, {"LD_LIBRARY_PATH": "/internal", "LD_LIBRARY_PATH_ORIG": "/orig/lib"}, clear=False):
            env = get_clean_subprocess_env()
            self.assertEqual(env.get("LD_LIBRARY_PATH"), "/orig/lib")


class TestPauseResume(unittest.TestCase):
    def test_engine_pause_and_resume(self):
        from tubemerge.apps.merger.services.engine import MergeEngine, MergeJobSpec, ProgressSnapshot, PipelineStatus
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
        from tubemerge.apps.playlists.services import diagnose_extraction_error
        url = "https://www.youtube.com/playlist?list=PLX9BFXyidv0Mhttps://music.youtube.com/playlist?list=RDCLAK5uy_nmS3YoxSwVVQk9IE"
        diag = diagnose_extraction_error(url, "")
        self.assertEqual(diag.title, "Multiple Links Detected")
        self.assertIn("Multiple URLs were detected", diag.message)

    def test_http_400_bad_request_diagnosis(self):
        from tubemerge.apps.playlists.services import diagnose_extraction_error
        err = "[youtube:tab] PLX9BFXyidv0Mhttps:: Unable to download API page: HTTP Error 400: Bad Request (caused by <HTTPError 400: Bad Request>)"
        diag = diagnose_extraction_error("https://youtube.com/playlist?list=bad", err)
        self.assertEqual(diag.title, "Invalid Link Parameter")
        self.assertIn("Bad Request 400", diag.message)
        self.assertNotIn("[youtube:tab]", diag.message)
        self.assertNotIn("HTTPError", diag.message)

    def test_sanitization_removes_raw_ytdlp_syntax(self):
        from tubemerge.apps.playlists.services import diagnose_extraction_error
        err = "ERROR: [generic] SomeCustomError:: Some stream failure (caused by <CustomException>)"
        diag = diagnose_extraction_error("https://youtube.com/watch?v=123", err)
        self.assertNotIn("ERROR:", diag.message)
        self.assertNotIn("[generic]", diag.message)
        self.assertNotIn("caused by", diag.message)


if __name__ == "__main__":
    unittest.main()


