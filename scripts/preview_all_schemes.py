
from collections import Counter
from transformers import AutoTokenizer

from backend.database.connection import get_connection
from backend.ingestion.chunker import build_scheme_chunks
from backend.ingestion.validator import validate_chunks, print_validation_report


MAX_TOKENS = 450

print("Loading BGE-M3 tokenizer...")
tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-m3")
print("Tokenizer loaded.\n")

connection = get_connection()

try:
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

    print(f"Total schemes fetched: {len(schemes)}")

    all_chunks = []
    failed_schemes = []

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

finally:
    connection.close()


print("\n========== CHUNK GENERATION COMPLETE ==========")

print("Schemes fetched:", len(schemes))
print("Schemes failed:", len(failed_schemes))
print("Total chunks generated:", len(all_chunks))


# Run structural validation.
report = validate_chunks(
    all_chunks,
    max_tokens=MAX_TOKENS
)

print_validation_report(report)


# Independently recalculate actual token counts.
print("\n========== TOKEN VERIFICATION ==========")

token_mismatches = []
oversized_chunks = []
token_counts = []

for position, chunk in enumerate(all_chunks):

    actual_count = len(
        tokenizer.encode(
            chunk["chunk_text"],
            add_special_tokens=False
        )
    )

    token_counts.append(actual_count)

    stored_count = chunk.get("metadata", {}).get("token_count")

    if stored_count != actual_count:
        token_mismatches.append({
            "position": position,
            "stored": stored_count,
            "actual": actual_count
        })

    if actual_count > MAX_TOKENS:
        oversized_chunks.append({
            "scheme_id": chunk["scheme_id"],
            "section": chunk["section_type"],
            "actual_tokens": actual_count
        })

print("Token count mismatches:", len(token_mismatches))
print("Chunks exceeding 450 tokens:", len(oversized_chunks))

if token_counts:
    print("Maximum token count:", max(token_counts))
    print(
        "Average token count:",
        round(sum(token_counts) / len(token_counts), 2)
    )


# Section statistics.
print("\n========== SECTION STATISTICS ==========")

section_counts = Counter(
    chunk["section_type"] for chunk in all_chunks
)

for section, count in sorted(section_counts.items()):
    print(f"{section:<25} {count}")


# FAQ parsing statistics.
print("\n========== FAQ PARSING STATISTICS ==========")

faq_status_counts = Counter(
    chunk["metadata"].get("faq_parse_status", "unknown")
    for chunk in all_chunks
    if chunk["section_type"] == "FAQ"
)

for status, count in sorted(faq_status_counts.items()):
    print(f"{status:<25} {count}")


# Failed scheme details.
if failed_schemes:
    print("\n========== FAILED SCHEMES ==========")

    for item in failed_schemes[:20]:
        print(item)

    if len(failed_schemes) > 20:
        print("Additional failures:", len(failed_schemes) - 20)


# Final preview decision.
print("\n========== FINAL PREVIEW STATUS ==========")

checks = {
    "All schemes processed": len(failed_schemes) == 0,
    "Structural validation": report["passed"],
    "Token counts match": len(token_mismatches) == 0,
    "No oversized chunks": len(oversized_chunks) == 0
}

for name, passed in checks.items():
    print(f"{name}: {'PASSED' if passed else 'FAILED'}")

print(
    "\nOVERALL:",
    "PASSED" if all(checks.values()) else "FAILED"
)

print("\nNo database records were inserted or modified.")
