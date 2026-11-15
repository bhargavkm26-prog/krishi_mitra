
import time
import torch

from FlagEmbedding import BGEM3FlagModel
from psycopg2.extras import execute_values

from backend.database.connection import get_connection


MODEL_NAME = "BAAI/bge-m3"

BATCH_SIZE = 8
MAX_LENGTH = 512

# First run: process only 1 batch of 8 chunks.
# After verifying, change this to None.
MAX_BATCHES = None


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

    connection = get_connection()

    total_processed = 0
    batch_number = 0
    start_time = time.time()

    try:

        while True:

            with connection.cursor() as cursor:

                cursor.execute("""
                    SELECT
                        c.chunk_id,
                        c.chunk_text
                    FROM public.scheme_chunks c
                    WHERE NOT EXISTS (
                        SELECT 1
                        FROM public.chunk_sparse_embeddings e
                        WHERE e.chunk_id = c.chunk_id
                    )
                    ORDER BY c.chunk_id
                    LIMIT %s;
                """, (BATCH_SIZE,))

                rows = cursor.fetchall()

            if not rows:
                print("\nNo remaining chunks.")
                break

            chunk_ids = [row[0] for row in rows]
            texts = [row[1] for row in rows]

            output = model.encode(
                texts,
                batch_size=BATCH_SIZE,
                max_length=MAX_LENGTH,
                return_dense=False,
                return_sparse=True,
                return_colbert_vecs=False
            )

            records = []

            for chunk_id, sparse_vector in zip(
                chunk_ids,
                output["lexical_weights"]
            ):

                for token_id, weight in sparse_vector.items():

                    records.append((
                        chunk_id,
                        int(token_id),
                        float(weight)
                    ))

            if records:

                with connection:

                    with connection.cursor() as cursor:

                        execute_values(
                            cursor,
                            """
                            INSERT INTO public.chunk_sparse_embeddings
                                (chunk_id, token_id, weight)
                            VALUES %s
                            ON CONFLICT (chunk_id, token_id)
                            DO NOTHING;
                            """,
                            records,
                            page_size=2000
                        )

            total_processed += len(rows)
            batch_number += 1

            print(
                f"Batch {batch_number}: "
                f"processed {len(rows)} chunks, "
                f"generated {len(records)} sparse entries"
            )

            if (
                MAX_BATCHES is not None
                and batch_number >= MAX_BATCHES
            ):
                print("\nSmoke test batch limit reached.")
                break

        with connection.cursor() as cursor:

            cursor.execute("""
                SELECT COUNT(DISTINCT chunk_id)
                FROM public.chunk_sparse_embeddings;
            """)

            embedded_chunks = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COUNT(*)
                FROM public.chunk_sparse_embeddings;
            """)

            total_entries = cursor.fetchone()[0]

            cursor.execute("""
                SELECT COUNT(*)
                FROM public.scheme_chunks;
            """)

            total_chunks = cursor.fetchone()[0]

        remaining = total_chunks - embedded_chunks

        elapsed = time.time() - start_time

        print("\n========== SPARSE EMBEDDING RESULTS ==========")

        print("Total chunks:", total_chunks)
        print("Chunks with sparse embeddings:", embedded_chunks)
        print("Total sparse entries:", total_entries)
        print("New chunks processed this run:", total_processed)
        print("Remaining chunks:", remaining)
        print("Time:", round(elapsed, 2), "seconds")

        if remaining == 0:
            print("Status: COMPLETE")
        else:
            print("Status: IN PROGRESS")

        print(
            "GPU memory allocated:",
            round(
                torch.cuda.memory_allocated(0) / 1024**3,
                2
            ),
            "GB"
        )

    finally:
        connection.close()


if __name__ == "__main__":
    main()
