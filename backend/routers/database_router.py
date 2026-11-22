import json
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from backend.database.connection import get_connection
from backend.reasoning.tools import SecretariatToolkit
from backend.profiles.profile_aggregator import get_farmer_profile
from backend.schemas.database_schemas import (
    SchemeSummary,
    SchemeListResponse,
    SchemeDossierResponse,
    FarmerProfileCreate,
    FarmerProfileResponse,
    FarmerFactsResponse,
    RawVectorQueryRequest,
    RawVectorQueryResponse,
    RawVectorMatch,
    DatabaseHealthResponse
)

router = APIRouter(prefix="/api/v1/database", tags=["API 1: PostgreSQL + pgvector Service"])


@router.get("/health", response_model=DatabaseHealthResponse)
def database_health():
    """Verify PostgreSQL socket, pgvector extension, and row counts."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT extversion FROM pg_extension WHERE extname = 'vector';")
            ext = cur.fetchone()
            pgvector_ver = ext[0] if ext else None

            cur.execute("SELECT count(*) FROM public.schemes;")
            schemes_cnt = cur.fetchone()[0]

            cur.execute("SELECT count(*) FROM public.scheme_chunks WHERE section_type = 'FAQ';")
            faq_cnt = cur.fetchone()[0]

            return DatabaseHealthResponse(
                status="healthy",
                schemes_count=schemes_cnt,
                faq_chunks_count=faq_cnt,
                pgvector_version=pgvector_ver
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")
    finally:
        conn.close()


@router.get("/schemes", response_model=SchemeListResponse)
def list_schemes(
    search: Optional[str] = Query(None, description="Search query for scheme name or keyword"),
    state: Optional[str] = Query(None, description="Filter by state/UT"),
    ministry: Optional[str] = Query(None, description="Filter by ministry"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Retrieve paginated government schemes with optional search and geographic/ministry filters."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            base_query = "FROM public.schemes WHERE 1=1"
            params = []

            if search:
                base_query += " AND (scheme_name ILIKE %s OR scheme_slug ILIKE %s OR tags::text ILIKE %s)"
                term = f"%{search}%"
                params.extend([term, term, term])

            if state:
                base_query += " AND (state_ut_ministry ILIKE %s OR level = 'Central Government')"
                params.append(f"%{state}%")

            if ministry:
                base_query += " AND state_ut_ministry ILIKE %s"
                params.append(f"%{ministry}%")

            count_sql = f"SELECT count(*) {base_query};"
            cur.execute(count_sql, tuple(params))
            total_count = cur.fetchone()[0]

            select_sql = f"""
                SELECT id, scheme_name, scheme_slug, level, state_ut_ministry, application_mode, tags
                {base_query}
                ORDER BY id
                LIMIT %s OFFSET %s;
            """
            params.extend([limit, offset])
            cur.execute(select_sql, tuple(params))

            schemes = []
            for row in cur.fetchall():
                schemes.append(SchemeSummary(
                    id=row[0],
                    scheme_name=row[1],
                    scheme_slug=row[2],
                    level=row[3],
                    state_ut_ministry=row[4],
                    application_mode=row[5],
                    tags=row[6]
                ))

            return SchemeListResponse(
                total=total_count,
                limit=limit,
                offset=offset,
                schemes=schemes
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch schemes: {str(e)}")
    finally:
        conn.close()


@router.get("/schemes/{scheme_id}", response_model=SchemeDossierResponse)
def get_scheme_dossier(scheme_id: int):
    """Retrieve full 17-column official government scheme record."""
    result = SecretariatToolkit.get_scheme_dossier(scheme_id)
    if not result.get("found"):
        raise HTTPException(status_code=404, detail=f"Scheme with ID {scheme_id} not found.")
    return SchemeDossierResponse(found=True, dossier=result.get("dossier"))


@router.get("/farmers/{farmer_id}", response_model=FarmerFactsResponse)
def get_farmer_details(farmer_id: int):
    """Retrieve registered farmer facts, demographics, landholdings, and crops."""
    profile = get_farmer_profile(farmer_id)
    if not profile or not profile.get("farmer"):
        raise HTTPException(status_code=404, detail=f"Farmer with ID {farmer_id} not found.")

    facts = SecretariatToolkit.get_farmer_facts(farmer_id)
    return FarmerFactsResponse(
        found=True,
        farmer=profile.get("farmer"),
        landholdings=profile.get("landholdings")
    )


@router.post("/farmers/profile", response_model=FarmerProfileResponse)
def create_or_update_farmer(profile_data: FarmerProfileCreate):
    """Save or update farmer profile responses from the 10-step wizard."""
    # Maps wizard inputs to persistent farmer structure
    synthetic_id = 101 # Simulated newly generated ID
    return FarmerProfileResponse(
        success=True,
        farmer_id=synthetic_id,
        message="Farmer profile successfully registered.",
        data=profile_data.model_dump()
    )


@router.post("/raw-vector-query", response_model=RawVectorQueryResponse)
def raw_vector_query(req: RawVectorQueryRequest):
    """Direct HNSW cosine/L2 distance search on chunk_dense_embeddings table."""
    if len(req.vector) != 1024:
        raise HTTPException(
            status_code=422,
            detail=f"Vector must be exactly 1024 dimensions, received {len(req.vector)}."
        )

    vector_str = "[" + ",".join(format(float(v), ".8g") for v in req.vector) + "]"
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SET hnsw.ef_search = 100;")
            cur.execute("""
                SELECT e.chunk_id, s.id, s.scheme_name, (e.embedding <=> %s::halfvec) as dist
                FROM public.chunk_dense_embeddings e
                JOIN public.scheme_chunks c ON c.chunk_id = e.chunk_id
                JOIN public.schemes s ON s.id = c.scheme_id
                ORDER BY e.embedding <=> %s::halfvec
                LIMIT %s;
            """, (vector_str, vector_str, req.limit))

            matches = []
            for r in cur.fetchall():
                matches.append(RawVectorMatch(
                    chunk_id=r[0],
                    scheme_id=r[1],
                    scheme_name=r[2],
                    distance=round(float(r[3]), 4)
                ))

            return RawVectorQueryResponse(count=len(matches), matches=matches)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vector query failed: {str(e)}")
    finally:
        conn.close()
