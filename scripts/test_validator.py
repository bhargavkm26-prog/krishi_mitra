
from backend.ingestion.chunker import calculate_hash
from backend.ingestion.validator import (
    validate_chunks,
    print_validation_report
)

sample_text = "Farmers must own agricultural land."

chunks = [
    {
        "scheme_id": 1,
        "section_type": "ELIGIBILITY",
        "chunk_index": 0,
        "chunk_text": sample_text,
        "content_hash": calculate_hash(sample_text),
        "metadata": {
            "source_fields": ["eligibility_criteria"],
            "token_count": 9
        }
    }
]

report = validate_chunks(chunks)

print_validation_report(report)
