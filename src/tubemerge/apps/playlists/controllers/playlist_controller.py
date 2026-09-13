from fastapi import HTTPException
from tubemerge.apps.binaries.services import BinaryService
from tubemerge.apps.playlists.services import PlaylistMetadataService, MediaFetchError
from tubemerge.apps.playlists.schemas import FetchPlaylistRequest, FetchPlaylistResponse, VideoClipSchema

class PlaylistController:
    def __init__(self):
        self.binary_service = BinaryService()

    def _get_service(self) -> PlaylistMetadataService:
        try:
            ytdlp_path = self.binary_service.get_ytdlp_path()
        except Exception:
            ytdlp_path = None
        return PlaylistMetadataService(ytdlp_path=ytdlp_path)

    def fetch_playlist(self, payload: FetchPlaylistRequest) -> FetchPlaylistResponse:
        service = self._get_service()
        try:
            playlist = service.fetch_playlist(payload.url)
        except MediaFetchError as exc:
            raise HTTPException(
                status_code=exc.status_code,
                detail={"error": exc.message, "title": exc.title}
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail={"error": str(exc), "title": "Invalid Request"})
        except TimeoutError as exc:
            raise HTTPException(status_code=504, detail={"error": str(exc), "title": "Request Timed Out"})
        except Exception as exc:
            clean_err = str(exc)
            if clean_err.startswith("Failed to fetch playlist:"):
                clean_err = clean_err.replace("Failed to fetch playlist:", "").strip()
            raise HTTPException(status_code=400, detail={"error": clean_err, "title": "Fetch Error"})

        clips_schema = [
            VideoClipSchema(
                id=c.id,
                title=c.title,
                url=c.url,
                duration_seconds=c.duration_seconds,
                duration_formatted=c.duration_formatted,
                duration=c.duration_formatted,
                thumbnail_url=c.thumbnail_url,
                thumbnail=c.thumbnail_url,
                width=c.width,
                height=c.height,
                fps=c.fps,
                resolution_label=c.resolution_label,
            )
            for c in playlist.entries
        ]

        return FetchPlaylistResponse(
            playlist_id=playlist.playlist_id,
            title=playlist.title,
            channel=playlist.channel,
            webpage_url=playlist.webpage_url,
            total_duration_seconds=playlist.total_duration_seconds,
            total_duration_formatted=playlist.total_duration_formatted,
            total_duration=playlist.total_duration_formatted,
            thumbnail=playlist.thumbnail,
            video_count=playlist.video_count,
            entries=clips_schema,
            videos=clips_schema,
        )
