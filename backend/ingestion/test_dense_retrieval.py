
import torch
from FlagEmbedding import BGEM3FlagModel
from backend.database.connection import get_connection

MODEL_NAME = "BAAI/bge-m3"

def main():
    print("Loading BGE-M3...")
    
    model = BGEM3FlagModel(
        MODEL_NAME,
        use_fp16=True,
        devices="cuda:0"
    )

    question = input("\nEnter farmer's question: ").strip()

    if not question:
        print("Question cannot be empty.")
        return

    print("\nGenerating query embedding...")

    output = model.encode(
        [question],
        batch_size=1,
        max_length=512,
        return_dense=True,
        return_sparse=False,
        return_colbert_vecs=False
    )

    query_vector = output["dense_vecs"][0]

    vector_text = "[" + ",".join(
        format(float(value), ".8g")
        for value in query_vector
    ) + "]"

    print("Query embedding generated:", len(query_vector))

    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SET hnsw.ef_search = 100;

                SELECT
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
                LIMIT 10;
            """, (vector_text, vector_text))

            results = cursor.fetchall()

        print("\n========== TOP 10 MATCHING CHUNKS ==========")

        for index, result in enumerate(results, start=1):
            scheme, section, chunk, distance = result

            print(f"\n--- Result {index} ---")
            print("Scheme:", scheme)
            print("Section:", section)
            print("Cosine distance:", round(float(distance), 4))
            print("Text:", chunk[:500])

    finally:
        connection.close()


if __name__ == "__main__":
    main()
