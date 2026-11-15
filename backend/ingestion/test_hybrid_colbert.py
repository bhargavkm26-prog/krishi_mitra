
import json
import torch
import numpy as np

from FlagEmbedding import BGEM3FlagModel
from backend.database.connection import get_connection


# --------------------------------
# CONFIGURATION
# --------------------------------

MODEL_NAME = "BAAI/bge-m3"

DENSE_TOP_K = 50
SPARSE_TOP_K = 50
RRF_K = 60

CANDIDATE_COUNT = 20
TOP_K = 10

BATCH_SIZE = 4
MAX_LENGTH = 512


# --------------------------------
# COLBERT MAXSIM
# --------------------------------

def colbert_maxsim(query_vectors, document_vectors):

    query_vectors = np.asarray(
        query_vectors,
        dtype=np.float32
    )

    document_vectors = np.asarray(
        document_vectors,
        dtype=np.float32
    )

    similarities = query_vectors @ document_vectors.T

    best_matches = similarities.max(axis=1)

    return float(best_matches.sum())


# --------------------------------
# MAIN PIPELINE
# --------------------------------

def main():

    # --------------------------------
    # 1. LOAD MODEL
    # --------------------------------

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is unavailable.")

    print("GPU:", torch.cuda.get_device_name(0))
    print("\nLoading BGE-M3...")

    model = BGEM3FlagModel(
        MODEL_NAME,
        use_fp16=True,
        devices="cuda:0"
    )

    print("BGE-M3 loaded successfully.")

    # --------------------------------
    # 2. FARMER QUESTION
    # --------------------------------

    question = input(
        "\nEnter farmer's question: "
    ).strip()

    if not question:
        print("Question cannot be empty.")
        return

    # --------------------------------
    # 3. GENERATE QUERY REPRESENTATIONS
    # --------------------------------

    print("\nGenerating query representations...")

    query_output = model.encode(
        [question],
        batch_size=1,
        max_length=MAX_LENGTH,
        return_dense=True,
        return_sparse=True,
        return_colbert_vecs=True
    )

    query_dense = query_output["dense_vecs"][0]
    query_sparse = query_output["lexical_weights"][0]
    query_colbert = query_output["colbert_vecs"][0]

    vector_text = "[" + ",".join(
        format(float(value), ".8g")
        for value in query_dense
    ) + "]"

    sparse_json = json.dumps({
        str(token_id): float(weight)
        for token_id, weight in query_sparse.items()
    })

    print("Dense dimensions:", len(query_dense))
    print("Sparse query terms:", len(query_sparse))
    print("ColBERT query vectors:", len(query_colbert))

    # --------------------------------
    # 4. DATABASE RETRIEVAL
    # --------------------------------

    connection = get_connection()

    try:

        with connection.cursor() as cursor:

            # --------------------------------
            # 4A. DENSE RETRIEVAL
            # --------------------------------

            print("\nRunning dense retrieval...")

            cursor.execute(
                "SET hnsw.ef_search = 100;"
            )

            cursor.execute("""
                SELECT
                    c.chunk_id,
                    s.id AS scheme_id,
                    s.scheme_name,
                    c.section_type,
                    c.chunk_text,
                    e.embedding <=> %s::halfvec AS distance

                FROM public.chunk_dense_embeddings e

                JOIN public.scheme_chunks c
                    ON c.chunk_id = e.chunk_id

                JOIN public.schemes s
                    ON s.id = c.scheme_id

                ORDER BY e.embedding <=> %s::halfvec

                LIMIT %s;

            """, (
                vector_text,
                vector_text,
                DENSE_TOP_K
            ))

            dense_results = cursor.fetchall()

            # --------------------------------
            # 4B. SPARSE RETRIEVAL
            # --------------------------------

            print("Running sparse retrieval...")

            cursor.execute("""
                WITH query_tokens AS (

                    SELECT
                        key::INTEGER AS token_id,
                        value::REAL AS query_weight

                    FROM jsonb_each_text(%s::jsonb)
                ),

                sparse_scores AS (

                    SELECT
                        e.chunk_id,

                        SUM(
                            e.weight * q.query_weight
                        ) AS sparse_score

                    FROM public.chunk_sparse_embeddings e

                    JOIN query_tokens q
                        ON e.token_id = q.token_id

                    GROUP BY e.chunk_id
                )

                SELECT
                    c.chunk_id,
                    s.id AS scheme_id,
                    s.scheme_name,
                    c.section_type,
                    c.chunk_text,
                    ss.sparse_score

                FROM sparse_scores ss

                JOIN public.scheme_chunks c
                    ON c.chunk_id = ss.chunk_id

                JOIN public.schemes s
                    ON s.id = c.scheme_id

                ORDER BY ss.sparse_score DESC

                LIMIT %s;

            """, (
                sparse_json,
                SPARSE_TOP_K
            ))

            sparse_results = cursor.fetchall()

    finally:
        connection.close()

    # --------------------------------
    # 5. RECIPROCAL RANK FUSION
    # --------------------------------

    print("\nApplying Reciprocal Rank Fusion...")

    fused = {}

    def add_results(results, retrieval_name):

        for rank, result in enumerate(
            results,
            start=1
        ):

            (
                chunk_id,
                scheme_id,
                scheme,
                section,
                text,
                original_score
            ) = result

            if chunk_id not in fused:

                fused[chunk_id] = {
                    "chunk_id": chunk_id,
                    "scheme_id": scheme_id,
                    "scheme": scheme,
                    "section": section,
                    "text": text,
                    "rrf_score": 0.0,
                    "dense_rank": None,
                    "sparse_rank": None
                }

            fused[chunk_id]["rrf_score"] += (
                1.0 / (RRF_K + rank)
            )

            fused[chunk_id][retrieval_name] = rank

    add_results(
        dense_results,
        "dense_rank"
    )

    add_results(
        sparse_results,
        "sparse_rank"
    )

    fused_results = sorted(
        fused.values(),
        key=lambda item: item["rrf_score"],
        reverse=True
    )

    candidates = fused_results[:CANDIDATE_COUNT]

    print("\nHybrid retrieval statistics:")
    print("Dense candidates:", len(dense_results))
    print("Sparse candidates:", len(sparse_results))
    print("Unique fused candidates:", len(fused))
    print("Candidates sent to ColBERT:", len(candidates))

    if not candidates:
        print("No hybrid candidates found.")
        return

    # --------------------------------
    # 6. COLBERT DOCUMENT EMBEDDINGS
    # --------------------------------

    print("\nGenerating ColBERT document vectors...")

    candidate_texts = [
        candidate["text"]
        for candidate in candidates
    ]

    document_vectors = []

    for start in range(
        0,
        len(candidate_texts),
        BATCH_SIZE
    ):

        batch = candidate_texts[
            start:start + BATCH_SIZE
        ]

        output = model.encode(
            batch,
            batch_size=BATCH_SIZE,
            max_length=MAX_LENGTH,
            return_dense=False,
            return_sparse=False,
            return_colbert_vecs=True
        )

        document_vectors.extend(
            output["colbert_vecs"]
        )

    # --------------------------------
    # 7. COLBERT MAXSIM RERANKING
    # --------------------------------

    print("\nCalculating ColBERT MaxSim scores...")

    for candidate, doc_vectors in zip(
        candidates,
        document_vectors
    ):

        candidate["colbert_score"] = colbert_maxsim(
            query_colbert,
            doc_vectors
        )

    final_results = sorted(
        candidates,
        key=lambda item: item["colbert_score"],
        reverse=True
    )

    # --------------------------------
    # 8. SCHEME-LEVEL AGGREGATION
    # --------------------------------

    print("\nAggregating evidence by scheme...")

    scheme_groups = {}

    for result in final_results:

        scheme_id = result["scheme_id"]

        if scheme_id not in scheme_groups:

            scheme_groups[scheme_id] = {
                "scheme_id": scheme_id,
                "scheme": result["scheme"],
                "best_colbert_score": result["colbert_score"],
                "evidence_chunks": []
            }

        scheme_groups[scheme_id]["best_colbert_score"] = max(
            scheme_groups[scheme_id]["best_colbert_score"],
            result["colbert_score"]
        )

        scheme_groups[scheme_id]["evidence_chunks"].append(
            result
        )

    scheme_results = sorted(
        scheme_groups.values(),
        key=lambda item: item["best_colbert_score"],
        reverse=True
    )

    print("Unique schemes:", len(scheme_results))

    if not scheme_results:
        print("No schemes found.")
        return

    # --------------------------------
    # 9. FETCH COMPLETE ORIGINAL SCHEME RECORDS
    # --------------------------------

    print("\nFetching complete scheme records...")

    scheme_ids = [
        scheme["scheme_id"]
        for scheme in scheme_results
    ]

    connection = get_connection()

    try:

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT
                    id,
                    scheme_name,
                    scheme_slug,
                    level,
                    state_ut_ministry,
                    application_mode,
                    tags,
                    description,
                    eligibility_criteria,
                    eligibility_general,
                    exclusions_ineligibility,
                    benefits,
                    application_process,
                    documents_required,
                    faqs,
                    official_link,
                    myscheme_url

                FROM public.schemes

                WHERE id = ANY(%s);

            """, (scheme_ids,))

            rows = cursor.fetchall()

            columns = [
                column[0]
                for column in cursor.description
            ]

            scheme_records = {
                row[0]: dict(zip(columns, row))
                for row in rows
            }

    finally:
        connection.close()

    # --------------------------------
    # 10. ATTACH ORIGINAL RECORDS
    # --------------------------------

    for scheme in scheme_results:

        scheme["scheme_record"] = scheme_records.get(
            scheme["scheme_id"]
        )

    print("\nFull scheme retrieval statistics:")
    print("Schemes expected:", len(scheme_ids))
    print("Schemes retrieved:", len(scheme_records))

    missing_scheme_ids = [
        scheme_id
        for scheme_id in scheme_ids
        if scheme_id not in scheme_records
    ]

    if missing_scheme_ids:

        print(
            "WARNING: Missing scheme records:",
            missing_scheme_ids
        )

    # --------------------------------
    # 11. DISPLAY SCHEME-LEVEL RESULTS
    # --------------------------------

    print("\n========== SCHEME-LEVEL RESULTS ==========")

    for rank, scheme in enumerate(
        scheme_results[:TOP_K],
        start=1
    ):

        print(f"\n{'=' * 60}")
        print(f"SCHEME {rank}")
        print(f"{'=' * 60}")

        print("Scheme ID:", scheme["scheme_id"])
        print("Scheme:", scheme["scheme"])

        print(
            "Best ColBERT score:",
            round(scheme["best_colbert_score"], 4)
        )

        print(
            "Evidence chunks:",
            len(scheme["evidence_chunks"])
        )

        # --------------------------------
        # ORIGINAL SCHEME INFORMATION
        # --------------------------------

        record = scheme["scheme_record"]

        if record is None:

            print("WARNING: Original scheme record not found.")
            continue

        print("\n---------- ORIGINAL SCHEME RECORD ----------")

        print("\nScheme Level:")
        print(record["level"])

        print("\nMinistry / State:")
        print(record["state_ut_ministry"])

        print("\nApplication Mode:")
        print(record["application_mode"])

        print("\nDescription:")
        print(record["description"])

        print("\nEligibility Criteria:")
        print(record["eligibility_criteria"])

        print("\nGeneral Eligibility:")
        print(record["eligibility_general"])

        print("\nExclusions / Ineligibility:")
        print(record["exclusions_ineligibility"])

        print("\nBenefits:")
        print(record["benefits"])

        print("\nApplication Process:")
        print(record["application_process"])

        print("\nDocuments Required:")
        print(record["documents_required"])

        print("\nFAQs:")
        print(record["faqs"])

        print("\nOfficial Link:")
        print(record["official_link"])

        print("\nMyScheme URL:")
        print(record["myscheme_url"])

        # --------------------------------
        # RETRIEVED EVIDENCE CHUNKS
        # --------------------------------

        print("\n---------- RETRIEVED EVIDENCE ----------")

        for evidence in scheme["evidence_chunks"]:

            print("\nSection:", evidence["section"])
            print("Chunk ID:", evidence["chunk_id"])

            print(
                "RRF score:",
                round(evidence["rrf_score"], 6)
            )

            print(
                "ColBERT score:",
                round(evidence["colbert_score"], 4)
            )

            print("\nEvidence text:")
            print(evidence["text"])

    print("\n========== PIPELINE COMPLETED ==========")

    print("Question:", question)
    print("Retrieved schemes:", len(scheme_results))
    print("Displayed schemes:", min(TOP_K, len(scheme_results)))


if __name__ == "__main__":
    main()
