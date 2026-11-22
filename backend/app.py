"""
Krishi Mitra — Autonomous Chief Secretary & Government Scheme Reasoning Engine
Master FastAPI Application Gateway
"""

import sys
from pathlib import Path

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from backend.routers.database_router import router as database_router
from backend.routers.bge_router import router as bge_router
from backend.routers.gemma_router import router as gemma_router

from backend.reasoning.gemma_client import GemmaClient
from backend.database.connection import get_connection
import torch

app = FastAPI(
    title="Krishi Mitra API Gateway",
    description=(
        "Production-grade, modular REST & Streaming API for Krishi Mitra: "
        "Connecting PostgreSQL + pgvector, BGE-M3 Dense RAG, and Gemma 4 E4B Autonomous Reasoning."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 1. Enable CORS for all frontends (Web, Mobile, Localhost, File UI)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Mount 3 Independent Modular Routers
app.include_router(database_router)
app.include_router(bge_router)
app.include_router(gemma_router)

# Mount Frontend UI
frontend_dir = Path(__file__).parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/ui", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")


# 3. Gateway Root & Overview
@app.get("/", tags=["Gateway Overview"])
def root_overview():
    return {
        "system": "Krishi Mitra API Gateway",
        "version": "1.0.0",
        "documentation": "/docs",
        "redoc": "/redoc",
        "services": {
            "api_1_database": "/api/v1/database",
            "api_2_bge_m3": "/api/v1/bge",
            "api_3_gemma_4": "/api/v1/gemma"
        },
        "endpoints_summary": [
            "GET  /api/v1/database/schemes (Paginated schemes catalog)",
            "GET  /api/v1/database/schemes/{id} (17-col official scheme dossier)",
            "GET  /api/v1/database/farmers/{id} (Farmer profile & landholdings)",
            "POST /api/v1/database/farmers/profile (Save wizard profile)",
            "POST /api/v1/database/raw-vector-query (Direct HNSW distance query)",
            "POST /api/v1/bge/embed (Generate 1024-dim dense vector)",
            "POST /api/v1/bge/search/schemes (Dense scheme retrieval)",
            "POST /api/v1/bge/search/faqs (Dense FAQ precedent retrieval)",
            "POST /api/v1/gemma/chat (Direct prompt-response with Gemma)",
            "POST /api/v1/gemma/evaluate (Wing 1 statutory 4-state scoring)",
            "POST /api/v1/gemma/consult (Wing 2 Chief Secretary autonomous ReAct)",
            "GET  /api/v1/gemma/consult-stream (Futuristic SSE live thought stream)"
        ]
    }


@app.get("/document", include_in_schema=False)
@app.get("/documentation", include_in_schema=False)
@app.get("/swagger", include_in_schema=False)
def redirect_to_docs():
    return RedirectResponse(url="/docs")


# 4. Master Consolidated Health Check
@app.get("/health", tags=["Gateway Overview"])
def consolidated_health():
    """Aggregated health check across PostgreSQL, GPU BGE-M3, and Gemma 4."""
    # Check Database
    db_ok = False
    schemes_count = 0
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM public.schemes;")
            schemes_count = cur.fetchone()[0]
            db_ok = True
        conn.close()
    except Exception:
        db_ok = False

    # Check GPU
    gpu_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if gpu_available else "CPU"

    # Check Gemma Client
    gemma_client = GemmaClient()
    gemma_ok = gemma_client.is_healthy()

    return {
        "status": "healthy" if (db_ok and gemma_ok) else "degraded",
        "subsystems": {
            "postgresql_pgvector": {
                "healthy": db_ok,
                "schemes_indexed": schemes_count
            },
            "bge_m3_embedding_engine": {
                "device": "cuda:0" if gpu_available else "cpu",
                "gpu_name": gpu_name,
                "precision": "fp16"
            },
            "gemma_4_e4b_reasoning_server": {
                "healthy": gemma_ok,
                "server_url": gemma_client.base_url
            }
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=True)
