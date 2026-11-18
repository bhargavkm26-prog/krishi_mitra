"""
Krishi Mitra — Secretariat Toolkit for the Chief Secretary.
Powered by BGE-M3 Semantic Search + PostgreSQL pgvector.
"""

import json
from typing import Any, Optional
from FlagEmbedding import BGEM3FlagModel
import numpy as np
import torch

from backend.database.connection import get_connection
from backend.profiles.profile_aggregator import get_farmer_profile
from backend.profiles.profile_context_builder import build_farmer_context


class SecretariatToolkit:
    """The tools available to the Chief Secretary to gather official evidence."""

    _model = None

    @classmethod
    def get_model(cls):
        """Lazy-load BGE-M3 on GPU once for high-speed retrieval."""
        if cls._model is None:
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
            cls._model = BGEM3FlagModel("BAAI/bge-m3", use_fp16=True, devices=device)
        return cls._model

    @staticmethod
    def get_farmer_facts(farmer_id: int) -> dict[str, Any]:
        """Tool: Fetches registered farmer details, landholdings, crops, and livestock."""
        try:
            profile = get_farmer_profile(farmer_id)
            if not profile:
                return {"found": False, "message": f"Farmer ID {farmer_id} not registered."}
            context = build_farmer_context(profile)
            return {
                "found": True,
                "farmer_context": context["farmer_context"],
                "landholdings": context["landholdings"],
                "retrieval_text": context["retrieval_text"]
            }
        except Exception as e:
            return {"found": False, "error": str(e)}

    @staticmethod
    def get_scheme_dossier(scheme_id: int) -> dict[str, Any]:
        """Tool: Retrieves the full 17-column official government record for a scheme."""
        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, scheme_name, scheme_slug, level, state_ut_ministry,
                           application_mode, tags, description, eligibility_criteria,
                           eligibility_general, exclusions_ineligibility, benefits,
                           application_process, documents_required, faqs, official_link, myscheme_url
                    FROM public.schemes
                    WHERE id = %s;
                """, (scheme_id,))
                row = cur.fetchone()
                if not row:
                    return {"found": False, "message": f"Scheme ID {scheme_id} not found."}

                cols = [desc[0] for desc in cur.description]
                return {"found": True, "dossier": dict(zip(cols, row))}
        finally:
            conn.close()

    @classmethod
    def search_faqs(cls, issue_keywords: Any, limit: int = 4) -> list[dict[str, Any]]:
        """
        Tool: Semantically searches official scheme FAQs using BGE-M3 + pgvector
        to find administrative unblocking procedures (Aadhaar, DBT, bank mismatch).
        """
        if isinstance(issue_keywords, list):
            query_text = " ".join(str(k) for k in issue_keywords)
        else:
            query_text = str(issue_keywords or "").strip()

        model = cls.get_model()
        output = model.encode([query_text], batch_size=1, return_dense=True, return_sparse=False)
        dense_vec = output["dense_vecs"][0]
        vector_text = "[" + ",".join(format(float(v), ".8g") for v in dense_vec) + "]"

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SET hnsw.ef_search = 100;")
                cur.execute("""
                    SELECT s.scheme_name, s.state_ut_ministry, c.chunk_text,
                           (e.embedding <=> %s::halfvec) AS distance
                    FROM public.chunk_dense_embeddings e
                    JOIN public.scheme_chunks c ON c.chunk_id = e.chunk_id
                    JOIN public.schemes s ON s.id = c.scheme_id
                    WHERE c.section_type = 'FAQ'
                    ORDER BY e.embedding <=> %s::halfvec
                    LIMIT %s;
                """, (vector_text, vector_text, limit))

                rows = cur.fetchall()
                return [
                    {
                        "scheme": r[0],
                        "ministry": r[1],
                        "faq_text": r[2],
                        "relevance_score": round(1.0 - float(r[3]), 4)
                    }
                    for r in rows
                ]
        finally:
            conn.close()

    @classmethod
    def search_schemes(
        cls,
        keywords: Any,
        ministry: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 4
    ) -> list[dict[str, Any]]:
        """
        Tool: Semantically searches official schemes using BGE-M3 dense embeddings
        with optional geographic / ministry filtering.
        """
        if isinstance(keywords, list):
            query_text = " ".join(str(k) for k in keywords)
        else:
            query_text = str(keywords or "").strip()

        model = cls.get_model()
        output = model.encode([query_text], batch_size=1, return_dense=True, return_sparse=False)
        dense_vec = output["dense_vecs"][0]
        vector_text = "[" + ",".join(format(float(v), ".8g") for v in dense_vec) + "]"

        conn = get_connection()
        try:
            query = """
                SELECT s.id, s.scheme_name, s.level, s.state_ut_ministry,
                       c.section_type, c.chunk_text,
                       (e.embedding <=> %s::halfvec) AS distance
                FROM public.chunk_dense_embeddings e
                JOIN public.scheme_chunks c ON c.chunk_id = e.chunk_id
                JOIN public.schemes s ON s.id = c.scheme_id
                WHERE 1=1
            """
            params = [vector_text]

            if state:
                query += " AND (s.state_ut_ministry ILIKE %s OR s.level = 'Central Government')"
                params.append(f"%{state}%")

            if ministry:
                query += " AND s.state_ut_ministry ILIKE %s"
                params.append(f"%{ministry}%")

            query += " ORDER BY e.embedding <=> %s::halfvec LIMIT %s;"
            params.extend([vector_text, limit])

            with conn.cursor() as cur:
                cur.execute("SET hnsw.ef_search = 100;")
                cur.execute(query, tuple(params))
                rows = cur.fetchall()

                return [
                    {
                        "scheme_id": r[0],
                        "scheme_name": r[1],
                        "level": r[2],
                        "state_ut_ministry": r[3],
                        "section": r[4],
                        "evidence": r[5][:350] + "...",
                        "relevance_score": round(1.0 - float(r[6]), 4)
                    }
                    for r in rows
                ]
        finally:
            conn.close()