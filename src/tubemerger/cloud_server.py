"""TubeMerge Cloud API Gateway — auth + admin only.

The billing and licensing subsystems have been removed (FOSS pivot).
This server is only needed if you deploy a separate cloud auth service.
For the desktop app, use server/app.py instead.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

def create_cloud_app() -> FastAPI:
    app = FastAPI(
        title="TubeMerge Cloud Gateway",
        version="1.0.0",
        description="Cloud auth gateway (billing and licensing removed).",
    )
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])

    @app.get("/health")
    def health():
        return {"status": "ok", "service": "tubemerge-cloud-gateway"}

    return app

app = create_cloud_app()

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("tubemerger.cloud_server:app", host="0.0.0.0", port=port, reload=False)
