"""FastAPI Application Factory — local desktop sidecar server.

Mounts only the routers needed for the FOSS desktop client:
  - binaries   → yt-dlp / ffmpeg install & health check
  - playlists  → playlist metadata fetch
  - merger     → start-merge, progress SSE, cancel
  - history    → local merge history log
  - queues     → merge queue management
  - system     → system info, output directory
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from tubemerger.core import settings
from tubemerger.db import init_db
from tubemerger.apps.binaries.routes import router as binaries_router
from tubemerger.apps.playlists.routes import router as playlists_router
from tubemerger.apps.merger.routes import router as merger_router
from tubemerger.apps.system.routes import router as system_router
from tubemerger.apps.history.routes import router as history_router
from tubemerger.apps.queues.routes import router as queues_router
from tubemerger.apps.updates.routes import router as updates_router
from tubemerger.apps.telemetry.routes import router as telemetry_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Boot-time initialization — directories, DB schema, telemetry ping."""
    settings.BINARIES_DIR.mkdir(parents=True, exist_ok=True)
    settings.TEMP_WORKDIR.mkdir(parents=True, exist_ok=True)
    settings.DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Initialize local SQLite WAL (history + queue tables only)
    init_db()

    # Fire anonymous App_Launch telemetry (async, non-blocking)
    try:
        from tubemerger.apps.telemetry.service import TelemetryService
        TelemetryService.track_app_launch()
    except Exception:
        pass

    yield


def create_app() -> FastAPI:
    """Instantiate and configure the local FastAPI sidecar."""
    app = FastAPI(
        title=settings.APP_NAME,
        description=settings.APP_TAGLINE,
        version=settings.VERSION,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Lightweight ping endpoint for instant readiness check without binary probing
    @app.get("/api/ping")
    async def ping():
        return JSONResponse({"status": "ok", "app": settings.APP_NAME})

    # Core desktop app routers
    app.include_router(updates_router)
    app.include_router(binaries_router)
    app.include_router(playlists_router)
    app.include_router(merger_router)
    app.include_router(system_router)
    app.include_router(history_router)
    app.include_router(queues_router)
    app.include_router(telemetry_router)

    # Static assets (logo.png, icons)
    assets_dir = settings.PROJECT_ROOT / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # Serve compiled React + Vite frontend
    frontend_dist = settings.PROJECT_ROOT / "frontend" / "dist"
    if frontend_dist.exists():
        static_dir = frontend_dist / "static"
        if static_dir.exists():
            app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

        @app.get("/")
        async def serve_index():
            return FileResponse(frontend_dist / "index.html")

        @app.get("/{catchall:path}")
        async def serve_spa(catchall: str):
            file_path = frontend_dist / catchall
            if file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(frontend_dist / "index.html")

    return app
