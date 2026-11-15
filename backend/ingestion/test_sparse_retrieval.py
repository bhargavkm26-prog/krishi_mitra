
import torch

from FlagEmbedding import BGEM3FlagModel
from backend.database.connection import get_connection


MODEL_NAME = "BAAI/bge-m3"
TOP_K = 10


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

    question = input(
        "\nEnter farmer's question: "
    ).strip()

    if not question:
        print("Question cannot be empty.")
        return

    print("\nGenerating sparse query representation...")

    output = model.encode(
        [question],
        batch_size=1,
        max_length=512,
        return_dense=False,
        return_sparse=True,
        return_colbert_vecs=False
    )

    query_sparse = output["lexical_weights"][0]

    print(
        "Query non-zero terms:",
        len(query_sparse)
    )

    connection = get_connection()

    try:

        with connection.cursor() as cursor:

            cursor.execute(
                "SET hnsw.ef_search = 100;"
            )

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
                __import__("json").dumps(
                    {
                        str(token_id): float(weight)
                        for token_id, weight
                        in query_sparse.items()
                    }
                ),
                TOP_K
            ))

            results = cursor.fetchall()

        print("\n========== TOP SPARSE MATCHES ==========")

        for index, result in enumerate(
            results,
            start=1
        ):

            scheme, section, chunk, score = result

            print(f"\n--- Result {index} ---")
            print("Scheme:", scheme)
            print("Section:", section)
            print(
                "Sparse score:",
                round(float(score), 6)
            )
            print("Text:", chunk[:500])

        if not results:
            print("No matching chunks found.")

    finally:
        connection.close()


if __name__ == "__main__":
    main()
