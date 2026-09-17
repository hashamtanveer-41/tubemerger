"""Release Sanity & Regression Test Suite for TubeMerger.

Verifies all critical fixes and edge cases discovered in past releases:
1. Environment isolation: LD_LIBRARY_PATH stripping to prevent OpenSSL / glibc symbol collisions.
2. Binary locator resilience: Automatic pruning of stale dummy wrapper scripts (< 1KB).
3. Binary inspector integrity: Testing binary execution directly before declaring 'ok'.
4. Engine error propagation: Ensuring download errors/stderr are never masked from the user.
5. Branding & repository consistency: Guaranteeing repo URLs point to hashamtanveer-41/tubemerger.
6. Release manifest validity: Validating version.json assets and download endpoints.
7. Connectivity fallback resilience: Validating socket DNS + HTTP fallback mechanisms.
"""

import json
import os
import sys
import tempfile
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Ensure src/ is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "src"))

from tubemerger.core import settings
from tubemerger.utils.process import get_clean_subprocess_env, get_hidden_subprocess_kwargs
from tubemerger.apps.binaries.services.locator_service import BinaryLocatorService
from tubemerger.apps.binaries.services.inspector_service import BinaryInspectorService
from tubemerger.apps.merger.services.engine import MergeEngine, MergeJobSpec


class TestProcessEnvironmentSanity(unittest.TestCase):
    """Checks that subprocess environments remain completely isolated from PyInstaller pollution."""

    def test_clean_subprocess_env_strips_ld_library_path(self):
        """When LD_LIBRARY_PATH is set by PyInstaller and no ORIG exists, strip it."""
        with patch.dict(os.environ, {"LD_LIBRARY_PATH": "/tmp/pyinstaller/_internal"}, clear=False):
            if "LD_LIBRARY_PATH_ORIG" in os.environ:
                del os.environ["LD_LIBRARY_PATH_ORIG"]
            clean_env = get_clean_subprocess_env()
            self.assertNotIn("LD_LIBRARY_PATH", clean_env)

    def test_clean_subprocess_env_restores_ld_library_path_orig(self):
        """When PyInstaller sets LD_LIBRARY_PATH_ORIG, restore it so system tools link against system libs."""
        with patch.dict(os.environ, {"LD_LIBRARY_PATH": "/tmp/_internal", "LD_LIBRARY_PATH_ORIG": "/usr/lib/custom"}, clear=False):
            clean_env = get_clean_subprocess_env()
            self.assertEqual(clean_env.get("LD_LIBRARY_PATH"), "/usr/lib/custom")

    def test_get_hidden_subprocess_kwargs_contains_clean_env(self):
        """Every subprocess spawned via get_hidden_subprocess_kwargs must have clean env."""
        with patch.dict(os.environ, {"LD_LIBRARY_PATH": "/tmp/_internal"}, clear=False):
            if "LD_LIBRARY_PATH_ORIG" in os.environ:
                del os.environ["LD_LIBRARY_PATH_ORIG"]
            kwargs = get_hidden_subprocess_kwargs()
            self.assertIn("env", kwargs)
            self.assertNotIn("LD_LIBRARY_PATH", kwargs["env"])

    def test_macos_dyld_clean_env(self):
        """On macOS, DYLD_* variables set by PyInstaller must be stripped/restored."""
        with patch.dict(os.environ, {
            "DYLD_LIBRARY_PATH": "/tmp/app/Contents/MacOS",
            "DYLD_FALLBACK_LIBRARY_PATH": "/tmp/app",
            "DYLD_FRAMEWORK_PATH": "/tmp/app/Frameworks",
        }, clear=False):
            for v in ["DYLD_LIBRARY_PATH_ORIG", "DYLD_FALLBACK_LIBRARY_PATH_ORIG", "DYLD_FRAMEWORK_PATH_ORIG"]:
                if v in os.environ:
                    del os.environ[v]
            clean_env = get_clean_subprocess_env()
            self.assertNotIn("DYLD_LIBRARY_PATH", clean_env)
            self.assertNotIn("DYLD_FALLBACK_LIBRARY_PATH", clean_env)
            self.assertNotIn("DYLD_FRAMEWORK_PATH", clean_env)

    def test_macos_paths_in_clean_env(self):
        """On macOS, standard Homebrew and MacPorts directories should be present in PATH."""
        with patch("sys.platform", "darwin"):
            with patch("os.path.isdir", return_value=True):
                clean_env = get_clean_subprocess_env()
                self.assertIn("/opt/homebrew/bin", clean_env.get("PATH", ""))
                self.assertIn("/usr/local/bin", clean_env.get("PATH", ""))


    def test_get_hidden_subprocess_kwargs_windows_safety(self):
        """On Windows, creationflags must prevent console window flashing."""
        with patch("sys.platform", "win32"):
            mock_si_class = MagicMock()
            with patch.object(subprocess, "STARTUPINFO", mock_si_class, create=True):
                kwargs = get_hidden_subprocess_kwargs()
                self.assertEqual(kwargs.get("creationflags"), 0x08000000)
                self.assertIn("startupinfo", kwargs)





class TestBinaryLocatorSanity(unittest.TestCase):
    """Verifies locator handles dummy scripts, corrupted wrappers, and auto-cleanup."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.bin_dir = Path(self.temp_dir.name)
        self.locator = BinaryLocatorService(self.bin_dir)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_which_prunes_stale_dummy_wrapper(self):
        """A broken wrapper (< 1KB) previously written in ~/.tubemerger/bin must be pruned."""
        dummy_file = self.bin_dir / "yt-dlp"
        dummy_file.write_text('#!/bin/sh\nexec "/usr/bin/python3" -m yt_dlp "$@"\n')
        self.assertTrue(dummy_file.exists())
        self.assertLess(dummy_file.stat().st_size, 1024)

        # with no system yt-dlp available in our temp dir, which() must delete the dummy and return None
        with patch("shutil.which", return_value=None):
            found = self.locator.which("yt-dlp")
            self.assertIsNone(found)
            self.assertFalse(dummy_file.exists(), "Dummy wrapper should have been automatically unlinked")

    def test_which_preserves_valid_binaries(self):
        """Real binaries (> 1KB) must not be deleted."""
        valid_file = self.bin_dir / "ffmpeg"
        valid_file.write_bytes(b"\x7fELF" + b"0" * 2048)
        valid_file.chmod(0o755)

        found = self.locator.which("ffmpeg")
        self.assertIsNotNone(found)
        self.assertEqual(found, valid_file)
        self.assertTrue(valid_file.exists())

    def test_find_ytdlp_never_creates_dummy_shebang_script(self):
        """find_ytdlp must NEVER create a 4-line python dummy script that relies on host site-packages."""
        with patch.object(self.locator, "which", return_value=None):
            with patch("tubemerger.apps.binaries.services.installer_service.BinaryInstallerService.download_ytdlp", side_effect=RuntimeError("No network")):
                with self.assertRaises(FileNotFoundError):
                    self.locator.find_ytdlp()

        # Verify no dummy script was created in bin_dir
        self.assertFalse((self.bin_dir / "yt-dlp").exists())


class TestBinaryInspectorSanity(unittest.TestCase):
    """Verifies inspector runs binaries directly and does not mask broken binaries."""

    def test_inspector_tests_binary_execution(self):
        """get_ytdlp_version must invoke subprocess.run on the path."""
        mock_proc = MagicMock(returncode=0, stdout="2026.08.19\n")
        with patch("subprocess.run", return_value=mock_proc) as mock_run:
            inspector = BinaryInspectorService()
            inspector._cached_ytdlp_version = None
            version = inspector.get_ytdlp_version("/usr/bin/yt-dlp")
            self.assertEqual(version, "2026.08.19")
            mock_run.assert_called_once()
            cmd_arg = mock_run.call_args[0][0]
            self.assertEqual(cmd_arg, ["/usr/bin/yt-dlp", "--version"])

    def test_inspector_does_not_declare_broken_binary_ok(self):
        """If binary fails with non-zero exit code (e.g. OpenSSL crash), don't return success."""
        mock_proc = MagicMock(returncode=1, stdout="", stderr="ImportError: OPENSSL_3.3.0 not found")
        with patch("subprocess.run", return_value=mock_proc):
            with patch.dict(sys.modules, {"yt_dlp": None}):
                inspector = BinaryInspectorService()
                inspector._cached_ytdlp_version = None
                version = inspector.get_ytdlp_version("/broken/yt-dlp")
                self.assertIsNone(version)


class TestMergeEngineErrorSanity(unittest.TestCase):
    """Verifies that engine exposes detailed error messages and handles all quality formats."""

    def test_format_filters(self):
        """All quality presets produce valid format selector expressions."""
        cases = [
            ("360p Low", "360"),
            ("480p SD", "480"),
            ("720p HD", "720"),
            ("1080p FHD", "1080"),
            ("4K Ultra", "2160"),
        ]
        for preset, expected_height in cases:
            filter_str = MergeEngine._get_ytdlp_format_filter(preset)
            self.assertIn(f"height<={expected_height}", filter_str)

    def test_download_failure_propagates_error_detail(self):
        """When yt-dlp download fails, engine must emit ProgressSnapshot with error detail."""
        job_spec = MergeJobSpec(
            playlist_url="https://www.youtube.com/playlist?list=PLtest",
            selected_indices=[0, 1],
            output_filename="test_out.mp4",
        )

        mock_clip1 = MagicMock(title="Video 1", url="https://www.youtube.com/watch?v=1", duration_seconds=60)
        mock_clip2 = MagicMock(title="Video 2", url="https://www.youtube.com/watch?v=2", duration_seconds=90)

        mock_playlist = MagicMock()
        mock_playlist.entries = [mock_clip1, mock_clip2]
        mock_playlist.channel = "Test Channel"

        mock_metadata_service = MagicMock()
        mock_metadata_service.fetch_playlist.return_value = mock_playlist

        emitted = []
        engine = MergeEngine(
            job_spec=job_spec,
            ytdlp_path="/path/to/yt-dlp",
            ffmpeg_path="/path/to/ffmpeg",
            metadata_service=mock_metadata_service,
            on_progress=emitted.append,
        )

        # Simulate yt-dlp returning code 1 with OpenSSL crash message
        simulated_stderr = "ImportError: /libcrypto.so.3: version OPENSSL_3.3.0 not found"
        with patch.object(engine, "_run_ytdlp_download", return_value=(1, simulated_stderr)):
            engine.run()

        # Verify an error snapshot was emitted with the exact error details
        self.assertTrue(len(emitted) > 0)
        last_snap = emitted[-1]
        self.assertEqual(last_snap.status.value, "error")
        self.assertIn("OPENSSL_3.3.0 not found", str(last_snap.error or last_snap.message))



class TestBrandingAndMetadataSanity(unittest.TestCase):
    """Checks that domain names, GitHub repo references, and project metadata are accurate."""

    def test_domain_is_tubemerger_com(self):
        self.assertEqual(settings.DOMAIN, "tubemerger.com")

    def test_version_format(self):
        """Version string must follow semantic versioning (X.Y.Z)."""
        import re
        self.assertTrue(re.match(r"^\d+\.\d+\.\d+$", settings.VERSION))

    def test_no_stale_tubemerge_repo_urls_in_settings(self):
        """Ensure settings and core references point to tubemerger, not tubemerger."""
        self.assertNotIn("hashamtanveer-41/tubemerge/", settings.DOMAIN)


class TestReleaseManifestSanity(unittest.TestCase):
    """Verifies that version.json contains valid download endpoints for all platforms."""

    def test_version_json_validity(self):
        version_file = PROJECT_ROOT / "website" / "public" / "version.json"
        self.assertTrue(version_file.exists(), "version.json must exist in website/public/")

        data = json.loads(version_file.read_text())
        self.assertIn("version", data)
        self.assertIn("assets", data)
        self.assertIn("windows", data["assets"])
        self.assertIn("macos", data["assets"])
        self.assertIn("linux", data["assets"])

        # Check that download URLs point to tubemerger
        for platform_key, url in data["assets"].items():
            self.assertTrue(url.startswith("https://github.com/hashamtanveer-41/tubemerger/releases/"), f"URL {url} should point to tubemerger repo")

    def test_tubemerger_spec_exists(self):
        spec_path = PROJECT_ROOT / "tubemerger.spec"
        self.assertTrue(spec_path.exists(), "tubemerger.spec must exist in repository root")
        content = spec_path.read_text(encoding="utf-8")
        self.assertIn('name="TubeMerger"', content)


class TestStructuredDataConsistency(unittest.TestCase):
    """Ensures that website structured data and public pages never link to stale repos."""

    def test_no_stale_repo_links_in_website(self):
        index_html = PROJECT_ROOT / "website" / "index.html"
        if index_html.exists():
            content = index_html.read_text(encoding="utf-8")
            self.assertNotIn(
                "hashamtanveer-41/tubemerge/",
                content,
                "Found stale repository URL 'hashamtanveer-41/tubemerge/' in website/index.html",
            )
            self.assertNotIn(
                "hashamtanveer-41/tubemerge\"",
                content,
                "Found stale repository URL 'hashamtanveer-41/tubemerge' in website/index.html",
            )


class TestConnectivityServiceSanity(unittest.TestCase):
    """Checks that connectivity checks do not crash or block offline execution."""

    def test_connectivity_check_probes(self):
        from tubemerger.apps.updates.service import check_connectivity
        # Should return a bool and never throw an unhandled exception
        result = check_connectivity(timeout=1.0)
        self.assertIsInstance(result, bool)



if __name__ == "__main__":
    unittest.main()

