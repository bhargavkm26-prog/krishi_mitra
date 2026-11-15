
import torch
import numpy as np

from FlagEmbedding import BGEM3FlagModel
from backend.database.connection import get_connection


MODEL_NAME = "BAAI/bge-m3"
SAMPLE_SIZE = 100
BATCH_SIZE = 4
MAX_LENGTH = 512


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

    texts = [row[1] for row in rows]

    print(f"\nLoaded {len(texts)} actual scheme chunks.")

    token_counts = []
    vector_dimensions = []
    total_vectors = 0
    total_vector_bytes = 0

    print("\nGenerating ColBERT vectors...")

    for start in range(0, len(texts), BATCH_SIZE):

        batch_texts = texts[start:start + BATCH_SIZE]

        output = model.encode(
            batch_texts,
            batch_size=BATCH_SIZE,
            max_length=MAX_LENGTH,
            return_dense=False,
            return_sparse=False,
            return_colbert_vecs=True
        )

        for vectors in output["colbert_vecs"]:

            array = np.asarray(vectors)

            if array.ndim != 2:
                raise ValueError(
                    f"Unexpected ColBERT shape: {array.shape}"
                )

            token_count, dimension = array.shape

            token_counts.append(token_count)
            vector_dimensions.append(dimension)

            total_vectors += token_count
            total_vector_bytes += array.nbytes

        processed = min(start + BATCH_SIZE, len(texts))

        print(
            f"Processed {processed}/{len(texts)} chunks",
            end="\r"
        )

    counts = np.asarray(token_counts)
    dimensions = set(vector_dimensions)

    print("\n\n========== COLBERT DATASET REPORT ==========")

    print("Chunks inspected:", len(texts))

    print("Minimum token vectors:", int(counts.min()))
    print("Maximum token vectors:", int(counts.max()))
    print("Average token vectors:", round(float(counts.mean()), 2))
    print("Median token vectors:", float(np.median(counts)))

    print("\nVector dimensions:", dimensions)

    print("Total token vectors:", total_vectors)

    print(
        "Raw vector memory:",
        round(total_vector_bytes / 1024 / 1024, 2),
        "MB"
    )

    average_vectors = float(counts.mean())
    estimated_vectors = average_vectors * 32410

    print("\n========== FULL DATASET ESTIMATE ==========")

    print(
        "Estimated token vectors for 32,410 chunks:",
        round(estimated_vectors)
    )

    if vector_dimensions:
        dimension = vector_dimensions[0]

        estimated_bytes = (
            estimated_vectors * dimension * 2
        )

        print(
            "Estimated FP16 storage:",
            round(estimated_bytes / 1024 / 1024, 2),
            "MB"
        )

        print(
            "Estimated FP32 storage:",
            round(estimated_bytes * 2 / 1024 / 1024, 2),
            "MB"
        )

    print("\nColBERT inspection PASSED!")


if __name__ == "__main__":
    main()
