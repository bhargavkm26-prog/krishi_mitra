
import json
import torch
import numpy as np

from FlagEmbedding import BGEM3FlagModel
from backend.database.connection import get_connection


MODEL_NAME = "BAAI/bge-m3"
CANDIDATE_COUNT = 20
TOP_K = 10
BATCH_SIZE = 4
MAX_LENGTH = 512


def colbert_maxsim(query_vectors, document_vectors):
    """
    Calculate ColBERT MaxSim score.

    Each query token finds its most similar
    document token. The similarities are summed.
    """

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


def main():

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

    question = input(
        "\nEnter farmer's question: "
    ).strip()

    if not question:
        print("Question cannot be empty.")
        return

    print("\nGenerating dense query embedding...")

    query_output = model.encode(
        [question],
        batch_size=1,
        max_length=MAX_LENGTH,
        return_dense=True,
        return_sparse=False,
        return_colbert_vecs=True
    )

    query_dense = query_output["dense_vecs"][0]
    query_colbert = query_output["colbert_vecs"][0]

    vector_text = "[" + ",".join(
        format(float(value), ".8g")
        for value in query_dense
    ) + "]"

    connection = get_connection()

    try:
        with connection.cursor() as cursor:

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
                CANDIDATE_COUNT
            ))

            candidates = cursor.fetchall()

    finally:
        connection.close()

    if not candidates:
        print("No candidates found.")
        return

    print(
        f"\nRetrieved {len(candidates)} dense candidates."
    )

    candidate_texts = [
        candidate[3]
        for candidate in candidates
    ]

    print("\nGenerating ColBERT document vectors...")

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

    results = []

    for candidate, doc_vectors in zip(
        candidates,
        document_vectors
    ):

        chunk_id, scheme, section, text, distance = candidate

        score = colbert_maxsim(
            query_colbert,
            doc_vectors
        )

        results.append({
            "chunk_id": chunk_id,
            "scheme": scheme,
            "section": section,
            "text": text,
            "dense_distance": float(distance),
            "colbert_score": score
        })

    results.sort(
        key=lambda item: item["colbert_score"],
        reverse=True
    )

    print("\n========== COLBERT RERANKED RESULTS ==========")

    for rank, result in enumerate(
        results[:TOP_K],
        start=1
    ):

        print(f"\n--- Result {rank} ---")
        print("Scheme:", result["scheme"])
        print("Section:", result["section"])
        print("Dense distance:", round(
            result["dense_distance"], 4
        ))
        print("ColBERT MaxSim:", round(
            result["colbert_score"], 4
        ))
        print("Text:", result["text"][:500])

    print("\nColBERT reranking test completed.")


if __name__ == "__main__":
    main()
