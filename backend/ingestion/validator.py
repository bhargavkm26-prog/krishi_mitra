
import hashlib
from collections import Counter, defaultdict
from typing import Any


def validate_chunks(
    chunks: list[dict[str, Any]],
    max_tokens: int = 450
) -> dict[str, Any]:

    errors = []
    warnings = []

    invalid_positions = set()
    seen_hashes = defaultdict(list)
    section_counts = Counter()

    required_fields = [
        "scheme_id",
        "section_type",
        "chunk_index",
        "chunk_text",
        "content_hash",
        "metadata"
    ]

    for position, chunk in enumerate(chunks):

        prefix = f"Chunk at position {position}"
        chunk_has_error = False

        for field in required_fields:
            if field not in chunk:
                errors.append(f"{prefix}: Missing field '{field}'")
                chunk_has_error = True

        if chunk_has_error:
            invalid_positions.add(position)
            continue

        text = chunk["chunk_text"]

        if not isinstance(text, str) or not text.strip():
            errors.append(f"{prefix}: Empty or invalid chunk text")
            invalid_positions.add(position)
            continue

        expected_hash = hashlib.sha256(
            text.encode("utf-8")
        ).hexdigest()

        if chunk["content_hash"] != expected_hash:
            errors.append(f"{prefix}: Content hash mismatch")
            chunk_has_error = True

        metadata = chunk["metadata"]

        if not isinstance(metadata, dict):
            errors.append(f"{prefix}: Metadata must be a dictionary")
            invalid_positions.add(position)
            continue

        if not isinstance(metadata.get("source_fields"), list) or not metadata["source_fields"]:
            errors.append(f"{prefix}: Invalid source_fields")
            chunk_has_error = True

        token_count = metadata.get("token_count")

        if not isinstance(token_count, int):
            errors.append(f"{prefix}: Token count unavailable or invalid")
            chunk_has_error = True

        elif token_count > max_tokens:
            errors.append(
                f"{prefix}: {token_count} tokens exceeds limit "
                f"of {max_tokens}"
            )
            chunk_has_error = True

        elif token_count <= 0:
            errors.append(f"{prefix}: Invalid token count")
            chunk_has_error = True

        if chunk["section_type"] == "FAQ":

            question = metadata.get("question")
            status = metadata.get("faq_parse_status")

            if not question:
                errors.append(f"{prefix}: FAQ question missing")
                chunk_has_error = True

            elif question not in text:
                errors.append(f"{prefix}: FAQ question missing from chunk")
                chunk_has_error = True

            if status == "missing_answer":
                warnings.append(f"{prefix}: FAQ answer missing")

            elif status == "reconstructed_question":
                warnings.append(
                    f"{prefix}: Reconstructed FAQ needs manual review"
                )

        if chunk_has_error:
            invalid_positions.add(position)

        section_counts[chunk["section_type"]] += 1

        seen_hashes[chunk["content_hash"]].append({
            "scheme_id": chunk["scheme_id"],
            "position": position
        })

    # Separate within-scheme and cross-scheme duplicates.
    within_scheme_duplicates = []
    cross_scheme_duplicates = []

    for content_hash, occurrences in seen_hashes.items():

        if len(occurrences) <= 1:
            continue

        scheme_ids = {
            item["scheme_id"] for item in occurrences
        }

        if len(scheme_ids) == 1:
            within_scheme_duplicates.append(content_hash)
        else:
            cross_scheme_duplicates.append(content_hash)

    if within_scheme_duplicates:
        warnings.append(
            f"{len(within_scheme_duplicates)} duplicate hashes "
            "found within the same scheme"
        )

    if cross_scheme_duplicates:
        warnings.append(
            f"{len(cross_scheme_duplicates)} identical content hashes "
            "found across different schemes"
        )

    return {
        "total_chunks": len(chunks),
        "valid_chunks": len(chunks) - len(invalid_positions),
        "invalid_chunks": len(invalid_positions),
        "error_count": len(errors),
        "warning_count": len(warnings),
        "section_counts": dict(section_counts),
        "within_scheme_duplicate_count": len(within_scheme_duplicates),
        "cross_scheme_duplicate_count": len(cross_scheme_duplicates),
        "errors": errors,
        "warnings": warnings,
        "passed": len(errors) == 0
    }


def print_validation_report(report: dict[str, Any]) -> None:

    print("\n" + "=" * 55)
    print("KRISHI MITRA - CHUNK VALIDATION REPORT")
    print("=" * 55)

    print(f"Total chunks:       {report['total_chunks']}")
    print(f"Valid chunks:       {report['valid_chunks']}")
    print(f"Invalid chunks:     {report['invalid_chunks']}")
    print(f"Errors:             {report['error_count']}")
    print(f"Warnings:           {report['warning_count']}")

    print(
        "Within-scheme duplicates:",
        report["within_scheme_duplicate_count"]
    )

    print(
        "Cross-scheme duplicates:",
        report["cross_scheme_duplicate_count"]
    )

    print("\nSECTION COUNTS")

    for section, count in sorted(report["section_counts"].items()):
        print(f"{section:<25} {count}")

    if report["errors"]:
        print("\nERRORS")
        for error in report["errors"]:
            print("-", error)

    if report["warnings"]:
        print("\nWARNINGS")
        for warning in report["warnings"]:
            print("-", warning)

    print("\nFINAL STATUS")
    print("PASSED" if report["passed"] else "FAILED")
    print("=" * 55)
