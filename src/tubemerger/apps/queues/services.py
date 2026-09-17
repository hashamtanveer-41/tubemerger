"""Queue Service - SQLite-backed operational persistence for batch merge queues."""

from typing import List, Dict, Any, Optional
from tubemerger.db.connection import get_db_connection

class QueueService:
    """Manages playlist queues in SQLite."""

    @classmethod
    def get_all_queued(cls) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        cur = conn.execute("""
            SELECT id, playlist_url, playlist_title, channel_name,
                   video_count, canvas_preset, crf, status, created_at
            FROM merge_queues
            ORDER BY created_at ASC
        """)
        rows = cur.fetchall()
        return [
            {
                "id": r["id"],
                "playlist_url": r["playlist_url"],
                "playlist_title": r["playlist_title"] or "Queued Playlist",
                "channel_name": r["channel_name"] or "YouTube Creator",
                "video_count": r["video_count"],
                "canvas_preset": r["canvas_preset"],
                "crf": r["crf"],
                "status": r["status"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]

    @classmethod
    def enqueue(
        cls,
        playlist_url: str,
        playlist_title: Optional[str] = None,
        channel_name: Optional[str] = None,
        video_count: int = 0,
        canvas_preset: str = "auto",
        crf: int = 21,
    ) -> Dict[str, Any]:
        conn = get_db_connection()
        with conn:
            cur = conn.execute(
                """
                INSERT INTO merge_queues (
                    playlist_url, playlist_title, channel_name,
                    video_count, canvas_preset, crf, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
                """,
                (
                    playlist_url,
                    playlist_title or "Queued Playlist",
                    channel_name or "YouTube Creator",
                    video_count,
                    canvas_preset,
                    crf,
                )
            )
            item_id = cur.lastrowid
            return {
                "id": item_id,
                "playlist_url": playlist_url,
                "playlist_title": playlist_title or "Queued Playlist",
                "status": "pending",
            }

    @classmethod
    def remove(cls, queue_id: int) -> bool:
        conn = get_db_connection()
        with conn:
            cur = conn.execute("DELETE FROM merge_queues WHERE id = ?", (queue_id,))
            return cur.rowcount > 0

    @classmethod
    def update_status(cls, queue_id: int, status: str) -> bool:
        conn = get_db_connection()
        with conn:
            cur = conn.execute("UPDATE merge_queues SET status = ? WHERE id = ?", (status, queue_id))
            return cur.rowcount > 0

    @classmethod
    def remove_by_url(cls, playlist_url: str) -> bool:
        """Remove queued entries matching playlist_url (e.g. upon completion)."""
        conn = get_db_connection()
        with conn:
            cur = conn.execute("DELETE FROM merge_queues WHERE playlist_url = ?", (playlist_url,))
            return cur.rowcount > 0
