
import json
import torch

from FlagEmbedding import BGEM3FlagModel
from backend.database.connection import get_connection


MODEL_NAME = "BAAI/bge-m3"

DENSE_TOP_K = 50
SPARSE_TOP_K = 50
RRF_K = 60
FUSION_TOP_K = 20


def main():

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is not available.")

    print("GPU:", torch.cuda.get_device_name(0))
    print("\nLoading BGE-M3...")

    model = BGEM3FlagModel(
        MODEL_NAME,
        use_fp16=True,
        devices="cuda:0"
    )

    print("BGE-M3 loaded successfully.")

    question = input("\nEnter farmer's question: ").strip()

    if not question:
        print("Question cannot be empty.")
        return

    print("\nGenerating dense and sparse query representations...")

    output = model.encode(
        [question],
        batch_size=1,
        max_length=512,
        return_dense=True,
        return_sparse=True,
        return_colbert_vecs=False
    )

    dense_vector = output["dense_vecs"][0]
    sparse_vector = output["lexical_weights"][0]

    vector_text = "[" + ",".join(
        format(float(value), ".8g")
        for value in dense_vector
    ) + "]"

    sparse_json = json.dumps({
        str(token_id): float(weight)
        for token_id, weight in sparse_vector.items()
    })

    connection = get_connection()

    try:

        with connection.cursor() as cursor:

            # 1. Dense retrieval
            cursor.execute(
                "SET hnsw.ef_search = 100;"
            )

            cursor.execute("""
                SELECT
                    c.chunk_id,
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

            # 2. Sparse retrieval
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
                        SUM(e.weight * q.query_weight) AS sparse_score

                    FROM public.chunk_sparse_embeddings e

                    JOIN query_tokens q
                        ON e.token_id = q.token_id

                    GROUP BY e.chunk_id
                )

                SELECT
                    c.chunk_id,
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

        # 3. Reciprocal Rank Fusion
        fused = {}

        def add_results(results, retrieval_name):

            for rank, result in enumerate(results, start=1):

                chunk_id, scheme, section, chunk_text, original_score = result

                if chunk_id not in fused:

                    fused[chunk_id] = {
                        "chunk_id": chunk_id,
                        "scheme": scheme,
                        "section": section,
                        "text": chunk_text,
                        "rrf_score": 0.0,
                        "dense_rank": None,
                        "sparse_rank": None
                    }

                fused[chunk_id]["rrf_score"] += (
                    1.0 / (RRF_K + rank)
                )

                fused[chunk_id][retrieval_name] = rank

        add_results(dense_results, "dense_rank")
        add_results(sparse_results, "sparse_rank")

        ranked_results = sorted(
            fused.values(),
            key=lambda item: item["rrf_score"],
            reverse=True
        )

        final_candidates = ranked_results[:FUSION_TOP_K]

        # 4. Display results
        print("\n========== HYBRID RRF RESULTS ==========")

        print("Dense candidates:", len(dense_results))
        print("Sparse candidates:", len(sparse_results))
        print("Unique fused candidates:", len(fused))
        print("Final candidates:", len(final_candidates))

        for index, item in enumerate(final_candidates, start=1):

            print(f"\n--- Hybrid Result {index} ---")

            print("Chunk ID:", item["chunk_id"])
            print("Scheme:", item["scheme"])
            print("Section:", item["section"])

            print(
                "Dense rank:",
                item["dense_rank"]
            )

            print(
                "Sparse rank:",
                item["sparse_rank"]
            )

            print(
                "RRF score:",
                round(item["rrf_score"], 6)
            )

            print("Text:", item["text"][:500])

    finally:
        connection.close()


if __name__ == "__main__":
    main()
