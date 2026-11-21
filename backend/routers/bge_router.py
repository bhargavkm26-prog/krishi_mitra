from fastapi import APIRouter, HTTPException
import torch
from backend.reasoning.tools import SecretariatToolkit
from backend.schemas.bge_schemas import (
    EmbedRequest,
    EmbedResponse,
    SchemeSearchRequest,
    SchemeSearchResponse,
    SchemeSearchResultItem,
    FaqSearchRequest,
    FaqSearchResponse,
    FaqSearchResultItem,
    BgeHealthResponse
)

router = APIRouter(prefix="/api/v1/bge", tags=["API 2: BGE-M3 Dense Embedding & Search Service"])


@router.get("/health", response_model=BgeHealthResponse)
def bge_health():
    """Check GPU availability and BGE-M3 embedding model status."""
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    return BgeHealthResponse(
        status="active",
        device=device,
        model_name="BAAI/bge-m3",
        dim=1024
    )


@router.post("/embed", response_model=EmbedResponse)
def generate_embedding(req: EmbedRequest):
    """Encode an arbitrary text string into a 1024-dimensional dense vector."""
    try:
        model = SecretariatToolkit.get_model()
        output = model.encode([req.text], batch_size=1, return_dense=True, return_sparse=False)
        dense_vec = output["dense_vecs"][0]
        vec_list = [float(v) for v in dense_vec]
        return EmbedResponse(
            dim=len(vec_list),
            text_sample=req.text[:60],
            vector=vec_list
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


@router.post("/search/schemes", response_model=SchemeSearchResponse)
def search_schemes(req: SchemeSearchRequest):
    """Conduct dense vector semantic search across all 32,410 scheme chunks with filters."""
    try:
        results = SecretariatToolkit.search_schemes(
            keywords=req.query,
            ministry=req.ministry,
            state=req.state,
            limit=req.limit
        )

        items = []
        for r in results:
            items.append(SchemeSearchResultItem(
                scheme_id=r.get("scheme_id"),
                scheme_name=r.get("scheme_name"),
                level=r.get("level"),
                state_ut_ministry=r.get("state_ut_ministry"),
                section=r.get("section"),
                evidence=r.get("evidence", ""),
                relevance_score=r.get("relevance_score", 0.0)
            ))

        return SchemeSearchResponse(
            count=len(items),
            query=req.query,
            schemes=items
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scheme semantic search failed: {str(e)}")


@router.post("/search/faqs", response_model=FaqSearchResponse)
def search_faqs(req: FaqSearchRequest):
    """Conduct dense semantic search across 20,110 administrative FAQs for troubleshooting precedents."""
    try:
        results = SecretariatToolkit.search_faqs(
            issue_keywords=req.issue,
            limit=req.limit
        )

        items = []
        for r in results:
            items.append(FaqSearchResultItem(
                scheme=r.get("scheme"),
                ministry=r.get("ministry"),
                faq_text=r.get("faq_text", ""),
                relevance_score=r.get("relevance_score", 0.0)
            ))

        return FaqSearchResponse(
            count=len(items),
            issue=req.issue,
            faqs=items
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FAQ semantic search failed: {str(e)}")
