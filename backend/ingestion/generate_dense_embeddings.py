
import time
import numpy as np
import torch

from FlagEmbedding import BGEM3FlagModel
from psycopg2.extras import execute_values

from backend.database.connection import get_connection


MODEL_NAME = "BAAI/bge-m3"
BATCH_SIZE = 8
MAX_LENGTH = 512

# First run: process only one batch as a smoke test.
# Change to None after verifying the first batch.
MAX_BATCHES = None



def vector_to_halfvec(values):
    """Convert a dense embedding to PostgreSQL halfvec format."""

    values = np.asarray(values, dtype=np.float32)

    if values.shape != (1024,):
        raise ValueError(
            f"Expected 1024 dimensions, got {values.shape}"
        )

    if not np.isfinite(values).all():
        raise ValueError("Embedding contains NaN or infinity.")

    return "[" + ",".join(
        format(float(value), ".8g") for value in values
    ) + "]"


def main():

    print("Checking CUDA...")

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

    connection = get_connection()

    total_processed = 0
    batch_number = 0
    start_time = time.time()

    try:

        while True:

            # Fetch chunks without existing dense embeddings.
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT
                        c.chunk_id,
                        c.chunk_text
                    FROM public.scheme_chunks c
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM public.chunk_dense_embeddings e
                        WHERE e.chunk_id = c.chunk_id
                    )
                    ORDER BY c.chunk_id
                    LIMIT %s
                """, (BATCH_SIZE,))

                rows = cursor.fetchall()

            if not rows:
                print("\nNo remaining chunks.")
                break

            chunk_ids = [row[0] for row in rows]
            texts = [row[1] for row in rows]

            # Generate dense embeddings only.
            output = model.encode(
                texts,
                batch_size=BATCH_SIZE,
                max_length=MAX_LENGTH,
                return_dense=True,
                return_sparse=False,
                return_colbert_vecs=False
            )

            dense_vectors = output["dense_vecs"]

            if len(dense_vectors) != len(chunk_ids):
                raise RuntimeError(
                    "Embedding count does not match chunk count."
                )

            records = []

            for chunk_id, embedding in zip(
                chunk_ids, dense_vectors
            ):
                records.append((
                    chunk_id,
                    vector_to_halfvec(embedding),
                    MODEL_NAME
                ))

            # Each batch commits independently.
            # If a later batch fails, completed batches remain saved.
            with connection:

                with connection.cursor() as cursor:

                    execute_values(
                        cursor,
                        """
                        INSERT INTO public.chunk_dense_embeddings (
                            chunk_id,
                            embedding,
                            model_name
                        )
                        VALUES %s
                        ON CONFLICT (chunk_id) DO NOTHING
                        """,
                        records,
                        template="(%s, %s::halfvec, %s)"
                    )

            total_processed += len(records)
            batch_number += 1

            print(
                f"Batch {batch_number}: "
                f"processed {total_processed} new embeddings"
            )

            if (
                MAX_BATCHES is not None
                and batch_number >= MAX_BATCHES
            ):
                print("\nSmoke test batch limit reached.")
                break

        # Verify database counts.
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM public.chunk_dense_embeddings
            """)
            embedding_count = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COUNT(*)
                FROM public.scheme_chunks
            """)
            chunk_count = cursor.fetchone()[0]

        elapsed = time.time() - start_time

        print("\n========== EMBEDDING RESULTS ==========")
        print("Chunks in database:", chunk_count)
        print("Dense embeddings stored:", embedding_count)
        print("New embeddings this run:", total_processed)
        print("Remaining:", chunk_count - embedding_count)
        print("Time:", round(elapsed, 2), "seconds")

        print(
            "Status:",
            "COMPLETE" if embedding_count == chunk_count
            else "IN PROGRESS"
        )

        print(
            "GPU memory allocated:",
            round(torch.cuda.memory_allocated(0) / 1024**3, 2),
            "GB"
        )

    finally:
        connection.close()


if __name__ == "__main__":
    main()
