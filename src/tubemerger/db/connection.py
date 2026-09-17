"""SQLite WAL Database Connection — Local task history only.

The licensing tables (licenses, device_activations) have been completely
removed. TubeMerge is free and open-source — no license keys, no device
slots, no hardware fingerprinting.

Active tables:
  merge_history     — completed merge job records (for the History UI tab)
  merge_queues      — pending / in-progress queue entries
  request_telemetry — lightweight local API timing log (optional)
"""

import sqlite3
import threading
from tubemerger.core import settings

DB_FILE = settings.APP_DATA_DIR / "tubemerge.db"
legacy_db = settings.APP_DATA_DIR / "tubemerge.db"
if legacy_db.exists() and not DB_FILE.exists():
    try:
        import shutil
        shutil.copy2(legacy_db, DB_FILE)
    except Exception:
        pass
_local = threading.local()


def get_db_connection() -> sqlite3.Connection:
    """Returns a thread-local SQLite connection configured with WAL mode."""
    if not hasattr(_local, "connection") or _local.connection is None:
        DB_FILE.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(
            str(DB_FILE),
            timeout=10.0,
            check_same_thread=False,
        )
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA busy_timeout=5000;")
        _local.connection = conn
    return _local.connection


def init_db() -> None:
    """Initialize schema — history and queue tables only."""
    conn = get_db_connection()
    with conn:
        # ── Merge history (completed jobs) ───────────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS merge_history (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id          TEXT UNIQUE,
                playlist_title  TEXT NOT NULL,
                playlist_url    TEXT NOT NULL,
                channel_name    TEXT,
                video_count     INTEGER NOT NULL,
                duration_seconds INTEGER DEFAULT 0,
                resolution      TEXT DEFAULT '1080p',
                output_path     TEXT NOT NULL,
                file_size_bytes INTEGER DEFAULT 0,
                status          TEXT DEFAULT 'completed',
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # ── Merge queue (pending / active jobs) ──────────────────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS merge_queues (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_url    TEXT NOT NULL,
                playlist_title  TEXT,
                channel_name    TEXT,
                video_count     INTEGER DEFAULT 0,
                canvas_preset   TEXT DEFAULT 'auto',
                crf             INTEGER DEFAULT 21,
                status          TEXT DEFAULT 'pending',
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # ── Local API timing log (optional, for debugging) ───────────────────
        conn.execute("""
            CREATE TABLE IF NOT EXISTS request_telemetry (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint        TEXT NOT NULL,
                request_type    TEXT DEFAULT 'merge_job',
                duration_seconds INTEGER DEFAULT 0,
                status_code     INTEGER NOT NULL,
                timestamp       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Drop legacy licensing tables if they exist from previous installs
        conn.execute("DROP TABLE IF EXISTS licenses;")
        conn.execute("DROP TABLE IF EXISTS device_activations;")

        # Clean up any leftover seed data from prototype builds
        conn.execute("DELETE FROM merge_history WHERE job_id = 'job_demo_init_01';")
        conn.execute("DELETE FROM merge_queues WHERE playlist_title = 'Python FastAPI Masterclass';")
        conn.execute("DELETE FROM request_telemetry WHERE endpoint NOT LIKE '%start-merge%';")
