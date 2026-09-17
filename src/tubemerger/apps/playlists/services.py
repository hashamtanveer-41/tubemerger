"""Playlist Metadata Service facade.

Re-exports domain diagnostics and extraction services for 100% backward compatibility.
"""

from tubemerger.apps.playlists.diagnostics import (
    MediaFetchError,
    diagnose_extraction_error,
)
from tubemerger.apps.playlists.extractor import PlaylistMetadataService

__all__ = [
    "MediaFetchError",
    "diagnose_extraction_error",
    "PlaylistMetadataService",
]
