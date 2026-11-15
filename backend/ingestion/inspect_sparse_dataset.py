
import torch
import numpy as np
from FlagEmbedding import BGEM3FlagModel
from backend.database.connection import get_connection

MODEL_NAME = "BAAI/bge-m3"
SAMPLE_SIZE = 1000
BATCH_SIZE = 8
MAX_LENGTH = 512


def main():
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA GPU is not available.")

    print("Loading BGE-M3 on GPU...")

    model = BGEM3FlagModel(
        MODEL_NAME,
        use_fp16=True,
        devices="cuda:0"
    )

    print("Model loaded successfully.")

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT chunk_id, chunk_text
                FROM public.scheme_chunks
                ORDER BY chunk_id
                LIMIT %s;
            """, (SAMPLE_SIZE,))

            rows = cursor.fetchall()

    finally:
        connection.close()

    if not rows:
        raise RuntimeError("No scheme chunks found.")

    chunk_ids = [row[0] for row in rows]
    texts = [row[1] for row in rows]

    print(f"\nLoaded {len(texts)} actual scheme chunks.")

    all_counts = []
    all_token_ids = []
    total_entries = 0
    total_weight_bytes = 0

    print("\nGenerating sparse embeddings...")

    for start in range(0, len(texts), BATCH_SIZE):
        batch_texts = texts[start:start + BATCH_SIZE]

        output = model.encode(
            batch_texts,
            batch_size=BATCH_SIZE,
            max_length=MAX_LENGTH,
            return_dense=False,
            return_sparse=True,
            return_colbert_vecs=False
        )

        for sparse_vector in output["lexical_weights"]:
            token_ids = [
                int(token_id)
                for token_id in sparse_vector.keys()
            ]

            count = len(sparse_vector)

            all_counts.append(count)
            all_token_ids.extend(token_ids)

            total_entries += count
            total_weight_bytes += count * 2

        processed = min(start + BATCH_SIZE, len(texts))

        print(
            f"Processed {processed}/{len(texts)} chunks",
            end="\r"
        )

    counts = np.array(all_counts)

    print("\n\n========== SPARSE DATASET REPORT ==========")

    print("Chunks inspected:", len(texts))
    print("Total sparse entries:", total_entries)

    print("Minimum terms per chunk:", int(counts.min()))
    print("Maximum terms per chunk:", int(counts.max()))
    print("Average terms per chunk:", round(float(counts.mean()), 2))
    print("Median terms per chunk:", float(np.median(counts)))

    print("\n========== TOKEN ID RANGE ==========")

    print("Minimum token ID:", min(all_token_ids))
    print("Maximum token ID:", max(all_token_ids))

    print("\n========== STORAGE ESTIMATE ==========")

    print(
        "Raw float16 weight bytes:",
        total_weight_bytes
    )

    average_entries = float(counts.mean())

    estimated_entries = average_entries * 32410

    estimated_weight_bytes = estimated_entries * 2

    print(
        "Estimated entries for 32,410 chunks:",
        round(estimated_entries)
    )

    print(
        "Estimated raw float16 weight storage:",
        round(estimated_weight_bytes / 1024 / 1024, 2),
        "MB"
    )

    print("\nSparse dataset inspection PASSED!")


if __name__ == "__main__":
    main()
