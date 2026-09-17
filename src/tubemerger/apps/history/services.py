"""History Service - SQLite-backed operational persistence for completed merges."""

import os
from pathlib import Path
from typing import List, Dict, Any, Optional

from tubemerger.db.connection import get_db_connection

class HistoryService:
    """Manages reading, writing, and purging merge history records."""

    @staticmethod
    def _format_duration(seconds: int) -> str:
        if seconds <= 0:
            return "0s"
        hours = seconds // 3600
        mins = (seconds % 3600) // 60
        secs = seconds % 60
        if hours > 0:
            return f"{hours}h {mins}m"
        if mins > 0:
            return f"{mins}m {secs}s"
        return f"{secs}s"

    @staticmethod
    def _format_file_size(size_bytes: int) -> str:
        if size_bytes <= 0:
            return "0 MB"
        units = ["B", "KB", "MB", "GB", "TB"]
        size = float(size_bytes)
        unit_idx = 0
        while size >= 1024.0 and unit_idx < len(units) - 1:
            size /= 1024.0
            unit_idx += 1
        return f"{size:.1f} {units[unit_idx]}"

    @classmethod
    def get_all_history(cls) -> List[Dict[str, Any]]:
        """Retrieves all merge history records in reverse chronological order."""
        conn = get_db_connection()
        cur = conn.execute("""
            SELECT id, job_id, playlist_title, playlist_url, channel_name,
                   video_count, duration_seconds, resolution, output_path,
                   file_size_bytes, status, created_at
            FROM merge_history
            ORDER BY created_at DESC
        """)
        rows = cur.fetchall()

        results: List[Dict[str, Any]] = []
        for r in rows:
            out_path = r["output_path"]
            actual_size = r["file_size_bytes"]
            file_exists = False

            if out_path:
                p = Path(out_path)
                if p.exists() and p.is_file():
                    file_exists = True
                    try:
                        actual_size = p.stat().st_size
                    except Exception:
                        pass

            results.append({
                "id": r["id"],
                "job_id": r["job_id"],
                "playlist_title": r["playlist_title"],
                "playlist_url": r["playlist_url"],
                "channel_name": r["channel_name"] or "YouTube Creator",
                "video_count": r["video_count"],
                "duration_seconds": r["duration_seconds"],
                "duration_formatted": cls._format_duration(r["duration_seconds"]),
                "resolution": r["resolution"] or "1080p",
                "output_path": out_path,
                "file_size_bytes": actual_size,
                "file_size_formatted": cls._format_file_size(actual_size),
                "status": r["status"],
                "created_at": r["created_at"],
                "file_exists": file_exists,
            })
        return results

    @classmethod
    def add_history_entry(
        cls,
        job_id: str,
        playlist_title: str,
        playlist_url: str,
        channel_name: Optional[str],
        video_count: int,
        duration_seconds: int,
        resolution: str,
        output_path: str,
        file_size_bytes: int = 0,
        status: str = "completed",
    ) -> int:
        """Records a completed or failed playlist merge into SQLite."""
        # Check actual file size if output exists
        if output_path and file_size_bytes <= 0:
            try:
                p = Path(output_path)
                if p.exists() and p.is_file():
                    file_size_bytes = p.stat().st_size
            except Exception:
                pass

        conn = get_db_connection()
        with conn:
            cur = conn.execute(
                """
                INSERT INTO merge_history (
                    job_id, playlist_title, playlist_url, channel_name,
                    video_count, duration_seconds, resolution, output_path,
                    file_size_bytes, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    job_id,
                    playlist_title,
                    playlist_url,
                    channel_name or "YouTube Creator",
                    video_count,
                    duration_seconds,
                    resolution,
                    output_path,
                    file_size_bytes,
                    status,
                )
            )
            return cur.lastrowid

    @classmethod
    def delete_history_item(cls, item_id: int) -> bool:
        """Deletes a single history record from SQLite."""
        conn = get_db_connection()
        with conn:
            cur = conn.execute("DELETE FROM merge_history WHERE id = ?", (item_id,))
            return cur.rowcount > 0

    @classmethod
    def clear_all_history(cls) -> bool:
        """Clears all records from merge_history table."""
        conn = get_db_connection()
        with conn:
            conn.execute("DELETE FROM merge_history")
            return True
