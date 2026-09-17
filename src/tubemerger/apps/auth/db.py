"""Supabase PostgreSQL connection manager."""

import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
from typing import Generator

from tubemerger.core import settings

logger = logging.getLogger(__name__)

def get_supabase_connection():
    """Create a connection to Supabase PostgreSQL."""
    return psycopg2.connect(
        settings.SUPABASE_DB_URL,
        connect_timeout=8,
        cursor_factory=RealDictCursor,
    )

@contextmanager
def get_supabase_cursor() -> Generator:
    """Context manager providing a transactional cursor for Supabase."""
    conn = None
    try:
        conn = get_supabase_connection()
        with conn:
            with conn.cursor() as cur:
                yield cur
    except Exception as exc:
        logger.error("Supabase PostgreSQL error: %s", exc)
        raise
    finally:
        if conn and not conn.closed:
            conn.close()
