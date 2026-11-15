
from collections import Counter

from transformers import AutoTokenizer
from psycopg2.extras import execute_values, Json

from backend.database.connection import get_connection
from backend.ingestion.chunker import build_scheme_chunks
from backend.ingestion.validator import validate_chunks, print_validation_report


MAX_TOKENS = 450
EXPECTED_CHUNKS = 32410
BATCH_SIZE = 500


def main():

    print("Loading BGE-M3 tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-m3")
    print("Tokenizer loaded.\n")

    connection = get_connection()

    try:
        # Check the destination table before doing any work.
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*)
                FROM public.scheme_chunks
            """)
            existing_count = cursor.fetchone()[0]

        if existing_count != 0:
            raise RuntimeError(
                f"scheme_chunks already contains {existing_count} rows. "
                "Stopping to prevent duplicate insertion."
            )

        print("Destination table is empty. Starting ingestion.")

        # Fetch all source schemes.
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT *
                FROM public.schemes
                ORDER BY id
            """)

            schemes = cursor.fetchall()
            column_names = [
                description[0]
                for description in cursor.description
            ]

        print(f"Schemes fetched: {len(schemes)}")

        all_chunks = []
        failed_schemes = []

        # Generate chunks using the existing validated chunker.
        for index, row in enumerate(schemes, start=1):

            scheme = dict(zip(column_names, row))

            try:
                chunks = build_scheme_chunks(scheme, tokenizer)
                all_chunks.extend(chunks)

            except Exception as error:
                failed_schemes.append({
                    "scheme_id": scheme.get("id"),
                    "scheme_name": scheme.get("scheme_name"),
                    "error": str(error)
                })

            if index % 100 == 0:
                print(f"Processed {index}/{len(schemes)} schemes")

        print("\n========== GENERATION RESULTS ==========")
        print("Schemes fetched:", len(schemes))
        print("Schemes failed:", len(failed_schemes))
        print("Chunks generated:", len(all_chunks))

        # Do not insert if any scheme failed.
        if failed_schemes:
            raise RuntimeError(
                "Some schemes failed during chunk generation. "
                "No records will be inserted."
            )

        # Verify expected dataset size.
        if len(all_chunks) != EXPECTED_CHUNKS:
            raise RuntimeError(
                f"Expected {EXPECTED_CHUNKS} chunks, "
                f"but generated {len(all_chunks)}. "
                "No records will be inserted."
            )

        # Structural validation.
        report = validate_chunks(
            all_chunks,
            max_tokens=MAX_TOKENS
        )

        print_validation_report(report)

        if not report["passed"]:
            raise RuntimeError(
                "Chunk validation failed. No records will be inserted."
            )

        # Independent token verification.
        oversized = []

        for position, chunk in enumerate(all_chunks):

            actual_count = len(
                tokenizer.encode(
                    chunk["chunk_text"],
                    add_special_tokens=False
                )
            )

            if actual_count > MAX_TOKENS:
                oversized.append(position)

        print("\nOversized chunks:", len(oversized))

        if oversized:
            raise RuntimeError(
                "Token verification failed. No records will be inserted."
            )

        # Prepare database records.
        records = [
            (
                chunk["scheme_id"],
                chunk["section_type"],
                chunk["chunk_index"],
                chunk["chunk_text"],
                Json(chunk["metadata"]),
                chunk["content_hash"]
            )
            for chunk in all_chunks
        ]

        insert_sql = """
            INSERT INTO public.scheme_chunks (
                scheme_id,
                section_type,
                chunk_index,
                chunk_text,
                metadata,
                content_hash
            )
            VALUES %s
        """

        print("\n========== DATABASE INSERTION ==========")

        # One transaction: either every batch commits or none does.
        with connection:

            with connection.cursor() as cursor:

                inserted = 0

                for start in range(0, len(records), BATCH_SIZE):

                    batch = records[start:start + BATCH_SIZE]

                    execute_values(
                        cursor,
                        insert_sql,
                        batch,
                        page_size=BATCH_SIZE
                    )

                    inserted += len(batch)

                    print(
                        f"Inserted {inserted}/{len(records)} chunks"
                    )

                cursor.execute("""
                    SELECT COUNT(*)
                    FROM public.scheme_chunks
                """)

                final_count = cursor.fetchone()[0]

                if final_count != EXPECTED_CHUNKS:
                    raise RuntimeError(
                        f"Expected {EXPECTED_CHUNKS} database rows, "
                        f"found {final_count}. Rolling back."
                    )

        print("\n========== INGESTION SUCCESS ==========")
        print("Expected chunks:", EXPECTED_CHUNKS)
        print("Inserted chunks:", inserted)
        print("Verified database rows:", final_count)

    finally:
        connection.close()


if __name__ == "__main__":
    main()
