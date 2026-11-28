"""
Krishi Mitra — Secretariat Toolkit for the Chief Secretary.
Powered by BGE-M3 Semantic Search + PostgreSQL pgvector.
"""

import json
import re
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
        with scheme-title/acronym awareness to find administrative unblocking procedures.
        """
        if isinstance(issue_keywords, list):
            query_text = " ".join(str(k) for k in issue_keywords)
        else:
            query_text = str(issue_keywords or "").strip()

        model = cls.get_model()
        output = model.encode([query_text], batch_size=1, return_dense=True, return_sparse=False)
        dense_vec = output["dense_vecs"][0]
        vector_text = "[" + ",".join(format(float(v), ".8g") for v in dense_vec) + "]"

        q_lower = query_text.lower()
        scheme_hints: list[str] = []
        for k, pat in cls._SYNONYM_TITLE_PATTERNS.items():
            if k in q_lower and pat not in scheme_hints:
                scheme_hints.append(pat)

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SET hnsw.ef_search = 250;")

                lex_faqs: list[dict[str, Any]] = []
                if scheme_hints:
                    conds = " OR ".join("s.scheme_name ILIKE %s" for _ in scheme_hints)
                    pats = [f"%{h}%" for h in scheme_hints]
                    cur.execute(
                        f"""
                        SELECT s.scheme_name, s.state_ut_ministry, c.chunk_text,
                               1.0 - (e.embedding <=> %s::halfvec) AS sim
                        FROM public.chunk_dense_embeddings e
                        JOIN public.scheme_chunks c ON c.chunk_id = e.chunk_id
                        JOIN public.schemes s ON s.id = c.scheme_id
                        WHERE ({conds}) AND c.section_type IN ('FAQ', 'APPLICATION_PROCESS', 'DOCUMENTS')
                        ORDER BY (c.section_type = 'FAQ') DESC, e.embedding <=> %s::halfvec
                        LIMIT %s;
                        """,
                        (vector_text, *pats, vector_text, max(2, limit)),
                    )
                    for r in cur.fetchall():
                        lex_faqs.append({
                            "scheme": r[0],
                            "ministry": r[1],
                            "faq_text": r[2],
                            "relevance_score": round(min(0.95, float(r[3]) + 0.25), 4),
                        })

                cur.execute("""
                    SELECT s.scheme_name, s.state_ut_ministry, c.chunk_text,
                           (e.embedding <=> %s::halfvec) AS distance
                    FROM public.chunk_dense_embeddings e
                    JOIN public.scheme_chunks c ON c.chunk_id = e.chunk_id
                    JOIN public.schemes s ON s.id = c.scheme_id
                    WHERE c.section_type = 'FAQ'
                    ORDER BY e.embedding <=> %s::halfvec
                    LIMIT %s;
                """, (vector_text, vector_text, max(limit * 2, 6)))

                dense_faqs = [
                    {
                        "scheme": r[0],
                        "ministry": r[1],
                        "faq_text": r[2],
                        "relevance_score": round(1.0 - float(r[3]), 4)
                    }
                    for r in cur.fetchall()
                ]

                seen_texts: set[str] = set()
                combined: list[dict[str, Any]] = []
                for item in lex_faqs + dense_faqs:
                    sig = f"{item['scheme']}:{item['faq_text'][:120]}"
                    if sig not in seen_texts:
                        seen_texts.add(sig)
                        combined.append(item)
                return combined[:limit]
        finally:
            conn.close()

    _SYNONYM_TITLE_PATTERNS = {
        "pm-kisan": "Kisan Samman Nidhi",
        "pmkisan": "Kisan Samman Nidhi",
        "direct income": "Kisan Samman Nidhi",
        "income support": "Kisan Samman Nidhi",
        "pmfby": "Fasal Bima",
        "fasal bima": "Fasal Bima",
        "pm-kusum": "Urja Suraksha",
        "kusum": "Urja Suraksha",
        "solar pump": "Urja Suraksha",
        "water pump": "Urja Suraksha",
        "kcc": "Kisan Credit Card",
        "kisan credit": "Kisan Credit Card",
        "crop credit": "Kisan Credit Card",
        "crop loan": "Kisan Credit Card",
        "per drop": "Per Drop More Crop",
        "pmksy": "Sinchayee Yojana",
        "ganga kalyana": "Ganga Kalyana",
        "kapy": "Krushy Aranya",
        "krushy aranya": "Krushy Aranya",
        "udyogini": "Udyogini",
        "mmkssy": "Krishi Sa Sajuli",
        "sa sajuli": "Krishi Sa Sajuli",
        "milch": "Milch Animal Farm",
        "rainfed": "Rainfed Area Development",
    }

    _TITLE_STOPWORDS = {
        "scheme", "schemes", "yojana", "yojna", "subsidy", "farmer", "farmers",
        "farm", "agriculture", "agricultural", "central", "state", "india",
        "government", "grant", "loan", "credit", "support", "program", "apply",
        "eligibility", "eligible", "check", "under", "for", "and", "the", "with",
        "karnataka", "assam", "gujarat", "meghalaya", "goa", "maharashtra",
    }

    @classmethod
    def _lexical_scheme_candidates(
        cls,
        cur,
        query_text: str,
        state: Optional[str],
        ministry_tokens: list[str],
        limit: int,
    ) -> list[dict[str, Any]]:
        """High-precision lexical lookup for exact scheme titles, slugs, and acronyms."""
        q_lower = query_text.lower()
        phrases: list[str] = []

        for key, target in cls._SYNONYM_TITLE_PATTERNS.items():
            if key in q_lower and target not in phrases:
                phrases.append(target)

        # Extract quoted phrases or distinctive non-stopword tokens
        words = [w for w in re.findall(r"[a-z0-9]{4,}", q_lower) if w not in cls._TITLE_STOPWORDS]
        for idx in range(len(words) - 1):
            bg = f"{words[idx]} {words[idx + 1]}"
            if bg not in phrases:
                phrases.append(bg)
        for w in words:
            if len(w) >= 6 and w not in phrases:
                phrases.append(w)

        if not phrases:
            return []

        phrases = phrases[:8]
        where_parts = []
        params: list[Any] = []
        for ph in phrases:
            pat = f"%{ph}%"
            where_parts.append("(s.scheme_name ILIKE %s OR s.scheme_slug ILIKE %s)")
            params.extend([pat, pat])

        sql = f"""
            SELECT s.id, s.scheme_name, s.level, s.state_ut_ministry,
                   s.eligibility_criteria, s.benefits, s.official_link, s.myscheme_url
            FROM public.schemes s
            WHERE ({' OR '.join(where_parts)})
        """
        if state:
            sql += " AND (s.state_ut_ministry ILIKE %s OR s.level = 'Central Government')"
            params.append(f"%{state}%")
        if ministry_tokens:
            m_conds = []
            for tok in ministry_tokens:
                m_conds.append("s.state_ut_ministry ILIKE %s")
                params.append(f"%{tok}%")
            if state:
                sql += f" AND (({' OR '.join(m_conds)}) OR (s.level = 'State / UT Government' AND s.state_ut_ministry ILIKE %s))"
                params.append(f"%{state}%")
            else:
                sql += f" AND ({' OR '.join(m_conds)})"

        sql += " ORDER BY s.id LIMIT %s;"
        params.append(max(limit * 3, 15))
        cur.execute(sql, tuple(params))

        scored: list[dict[str, Any]] = []
        for r in cur.fetchall():
            sid, sname, lvl, smin, elig, bens, olink, murl = r
            sn_low = (sname or "").lower()
            slug_hit = any(k in q_lower and pat.lower() in sn_low for k, pat in cls._SYNONYM_TITLE_PATTERNS.items())
            tok_hits = sum(1 for w in words if w in sn_low)
            if not slug_hit and tok_hits < (1 if len(words) == 1 else 2) and not any(ph.lower() in sn_low for ph in phrases if " " in ph):
                continue
            score = round(min(0.96, 0.78 + (0.12 if slug_hit else 0.0) + 0.04 * tok_hits), 4)
            ev_text = f"{elig or ''} {bens or ''}".strip()
            scored.append({
                "scheme_id": sid,
                "scheme_name": sname,
                "level": lvl,
                "state_ut_ministry": smin,
                "section": "ELIGIBILITY & BENEFITS",
                "evidence": (ev_text[:450] + "...") if ev_text else "",
                "eligibility_summary": (elig or "")[:360],
                "official_link": olink or murl or "",
                "relevance_score": score,
            })

        scored.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored[:limit]

    @classmethod
    def search_schemes(
        cls,
        keywords: Any,
        ministry: Optional[str] = None,
        state: Optional[str] = None,
        limit: int = 4
    ) -> list[dict[str, Any]]:
        """
        Tool: Hybrid (Exact Title/Acronym + BGE-M3 Dense Vector) scheme search
        deduplicated at scheme level with resilient state/ministry filtering.
        """
        if isinstance(keywords, list):
            query_text = " ".join(str(k) for k in keywords)
        else:
            query_text = str(keywords or "").strip()

        raw_min = str(ministry or "").strip()
        ignore_mins = {"", "all", "any", "none", "central", "state", "government", "govt", "government of india"}
        ministry_tokens: list[str] = []
        if raw_min and raw_min.lower() not in ignore_mins:
            for tok in re.split(r"[/|,;]+", raw_min):
                t = tok.strip()
                if len(t) >= 3 and t.lower() not in ignore_mins:
                    ministry_tokens.append(t)

        model = cls.get_model()
        output = model.encode([query_text], batch_size=1, return_dense=True, return_sparse=False)
        dense_vec = output["dense_vecs"][0]
        vector_text = "[" + ",".join(format(float(v), ".8g") for v in dense_vec) + "]"

        def _run_dense(cur, use_ministry_tokens: list[str]) -> list[dict[str, Any]]:
            query = """
                SELECT s.id, s.scheme_name, s.level, s.state_ut_ministry,
                       c.section_type, c.chunk_text,
                       (e.embedding <=> %s::halfvec) AS distance,
                       s.eligibility_criteria, s.official_link, s.myscheme_url
                FROM public.chunk_dense_embeddings e
                JOIN public.scheme_chunks c ON c.chunk_id = e.chunk_id
                JOIN public.schemes s ON s.id = c.scheme_id
                WHERE 1=1
            """
            params: list[Any] = [vector_text]

            if state:
                query += " AND (s.state_ut_ministry ILIKE %s OR s.level = 'Central Government')"
                params.append(f"%{state}%")

            if use_ministry_tokens:
                m_conds = []
                for tok in use_ministry_tokens:
                    m_conds.append("s.state_ut_ministry ILIKE %s")
                    params.append(f"%{tok}%")
                if state:
                    query += f" AND (({' OR '.join(m_conds)}) OR (s.level = 'State / UT Government' AND s.state_ut_ministry ILIKE %s))"
                    params.append(f"%{state}%")
                else:
                    query += f" AND ({' OR '.join(m_conds)})"

            fetch_k = max(int(limit) * 5, 30)
            query += " ORDER BY e.embedding <=> %s::halfvec LIMIT %s;"
            params.extend([vector_text, fetch_k])

            cur.execute("SET hnsw.ef_search = 250;")
            cur.execute(query, tuple(params))
            rows = cur.fetchall()

            dedup: dict[int, dict[str, Any]] = {}
            for r in rows:
                sid = r[0]
                score = round(1.0 - float(r[6]), 4)
                if sid not in dedup or score > dedup[sid]["relevance_score"]:
                    dedup[sid] = {
                        "scheme_id": sid,
                        "scheme_name": r[1],
                        "level": r[2],
                        "state_ut_ministry": r[3],
                        "section": r[4],
                        "evidence": (r[5] or "")[:450] + "...",
                        "eligibility_summary": (r[7] or "")[:360],
                        "official_link": r[8] or r[9] or "",
                        "relevance_score": score,
                    }
            return list(dedup.values())

        conn = get_connection()
        try:
            with conn.cursor() as cur:
                lex_items = cls._lexical_scheme_candidates(cur, query_text, state, ministry_tokens, limit)
                dense_items = _run_dense(cur, ministry_tokens)

                # If restrictive ministry filter returned nothing, automatically retry with state-level filter
                if not lex_items and not dense_items and ministry_tokens:
                    lex_items = cls._lexical_scheme_candidates(cur, query_text, state, [], limit)
                    dense_items = _run_dense(cur, [])

                merged: dict[int, dict[str, Any]] = {}
                for item in lex_items + dense_items:
                    sid = item["scheme_id"]
                    if sid not in merged or item["relevance_score"] > merged[sid]["relevance_score"]:
                        merged[sid] = item

                ranked = sorted(merged.values(), key=lambda x: x["relevance_score"], reverse=True)
                return ranked[:limit]
        finally:
            conn.close()