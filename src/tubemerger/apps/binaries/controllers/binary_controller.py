from tubemerger.apps.binaries.services import BinaryService
from tubemerger.apps.binaries.schemas import (
    HealthResponseSchema,
    InstallBinariesResponseSchema,
    BinaryItemSchema,
)

class BinaryController:
    def __init__(self, binary_service: BinaryService):
        self.binary_service = binary_service

    def get_health(self) -> HealthResponseSchema:
        status_map = self.binary_service.check_all()
        return HealthResponseSchema(
            ffmpeg=BinaryItemSchema(
                status=status_map["ffmpeg"].status,
                path=status_map["ffmpeg"].path,
                version=status_map["ffmpeg"].version,
            ),
            ytdlp=BinaryItemSchema(
                status=status_map["ytdlp"].status,
                path=status_map["ytdlp"].path,
                version=status_map["ytdlp"].version,
            ),
        )

    def install_binaries(self) -> InstallBinariesResponseSchema:
        status_map = self.binary_service.check_all()

        if not status_map["ytdlp"].is_available:
            try:
                self.binary_service.download_ytdlp()
            except Exception:
                pass

        if not status_map["ffmpeg"].is_available:
            try:
                self.binary_service.download_ffmpeg()
            except Exception:
                pass

        updated = self.binary_service.check_all()
        return InstallBinariesResponseSchema(
            status="ok",
            message="Binary installation process finished.",
            ffmpeg=BinaryItemSchema(
                status=updated["ffmpeg"].status,
                path=updated["ffmpeg"].path,
                version=updated["ffmpeg"].version,
            ),
            ytdlp=BinaryItemSchema(
                status=updated["ytdlp"].status,
                path=updated["ytdlp"].path,
                version=updated["ytdlp"].version,
            ),
        )
