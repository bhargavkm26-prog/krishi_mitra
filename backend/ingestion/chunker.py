
import hashlib
import re
from typing import Any


# Initial chunking configuration
MAX_CHUNK_TOKENS = 450
CHUNK_OVERLAP_TOKENS = 60


def calculate_hash(text: str) -> str:
    """Generate a SHA-256 hash for identifying duplicate content."""
    return hashlib.sha256(
        text.encode("utf-8")
    ).hexdigest()


def normalize_for_comparison(text: str) -> str:
    """Normalize text only for duplicate comparison, not storage."""
    return re.sub(r"\s+", " ", text).strip().casefold()


def get_token_count(text: str, tokenizer) -> int:
    """Count tokens using the supplied model tokenizer."""
    return len(
        tokenizer.encode(
            text,
            add_special_tokens=False
        )
    )


def split_long_text(
    text,
    tokenizer,
    max_tokens=MAX_CHUNK_TOKENS,
    overlap_tokens=CHUNK_OVERLAP_TOKENS
):
    if not text:
        return []

    if not tokenizer.is_fast:
        raise ValueError(
            "A fast tokenizer is required for exact source-text splitting."
        )

    # Get token IDs and their original character positions.
    encoded = tokenizer(
        text,
        add_special_tokens=False,
        return_offsets_mapping=True
    )

    offsets = encoded["offset_mapping"]

    if not offsets:
        return []

    chunks = []
    start_token = 0

    while start_token < len(offsets):

        # Keep a small safety margin because re-tokenizing
        # an extracted substring can produce slightly more tokens.
        safe_max_tokens = max(1, max_tokens - 5)

        end_token = min(
           start_token + safe_max_tokens,
           len(offsets)
        )

        # Prefer ending at a sentence or paragraph boundary.
        if end_token < len(offsets):
            candidate_start = max(
                start_token + 1,
                end_token - 50
            )

            for token_index in range(end_token - 1, candidate_start - 1, -1):
                char_end = offsets[token_index][1]

                if char_end > 0 and text[char_end - 1] in ".!?\n":
                    end_token = token_index + 1
                    break

        char_start = offsets[start_token][0]
        char_end = offsets[end_token - 1][1]

        chunk_text = text[char_start:char_end]

        if chunk_text:
            chunks.append(chunk_text)

        if end_token >= len(offsets):
            break

        # Move backwards to create token overlap.
        actual_overlap = min(
             overlap_tokens,
             max(0, (end_token - start_token) // 4)
        )

        next_start = end_token - actual_overlap

        start_token = next_start

    return chunks

def validate_faq_question(question: str) -> str:
    """
    Identify suspicious or incomplete FAQ questions.
    Never modify the original question.
    """

    question = question.strip()

    suspicious_fragments = {
        "for?", "to?", "with?", "about?",
        "from?", "by?", "in?", "on?"
    }

    if question.casefold() in suspicious_fragments:
        return "needs_review"

    if len(question.split()) <= 2 and question.endswith("?"):
        return "needs_review"

    return "complete"

def validate_faq_answer(answer: str) -> str:
    """
    Detect possible questions accidentally included in answers.
    Does not modify the original answer.
    """

    suspicious_patterns = [
        r"\bwhat\s+(can|is|are|does|do|would|will)\b",
        r"\bhow\s+(can|is|are|does|do|would|will)\b",
        r"\bwhy\s+(is|are|does|do|would|will)\b",
        r"\bwhich\s+(is|are|can|would)\b",
    ]

    for pattern in suspicious_patterns:
        if re.search(pattern, answer, re.IGNORECASE):
            return "needs_review"

    return "complete"

def parse_faqs(text: str) -> list[dict[str, str]]:
    if not text or not text.strip():
        return []

    lines = text.splitlines()

    faqs = []
    current_question = None
    current_answer = []

    def save_current():
        if current_question:
            answer = "\n".join(current_answer).strip()

            if not answer:
                status = "missing_answer"
            elif validate_faq_question(current_question) == "needs_review":
                status = "needs_review"
            elif validate_faq_answer(answer) == "needs_review":
                status = "needs_review"
            else:
                status = "complete"

            faqs.append({
                "question": current_question.strip(),
                "answer": answer,
                "parse_status": status
            })

    for line in lines:
        stripped = line.strip()

        if re.match(r"^Q\s*:", stripped, re.IGNORECASE):
            save_current()

            current_question = re.sub(
                r"^Q\s*:\s*",
                "",
                stripped,
                flags=re.IGNORECASE
            )

            current_answer = []

        elif re.match(r"^A\s*:", stripped, re.IGNORECASE):
            if current_question:
                answer_start = re.sub(
                    r"^A\s*:\s*",
                    "",
                    stripped,
                    flags=re.IGNORECASE
                )
                current_answer.append(answer_start)

        elif current_question:
            current_answer.append(line)

    save_current()

    return faqs



def build_section_chunks(
    scheme_id: int,
    section_type: str,
    text: str,
    tokenizer,
    source_fields: list[str],
    max_tokens: int = MAX_CHUNK_TOKENS
) -> list[dict[str, Any]]:
    """Create traceable chunks for one scheme section."""

    if not text or not text.strip():
        return []

    text_chunks = split_long_text(
        text,
        tokenizer,
        max_tokens=max_tokens
    )

    results = []

    for index, chunk_text in enumerate(text_chunks):

        results.append({
            "scheme_id": scheme_id,
            "section_type": section_type,
            "chunk_index": index,
            "chunk_text": chunk_text,
            "content_hash": calculate_hash(chunk_text),
            "metadata": {
                "source_fields": source_fields,
                "token_count": get_token_count(
                    chunk_text,
                    tokenizer
                )
            }
        })

    return results


def build_scheme_chunks(
    scheme: dict,
    tokenizer
) -> list[dict[str, Any]]:
    """
    Convert one database scheme record into traceable chunks.
    Does not write anything to PostgreSQL.
    """

    scheme_id = scheme["id"]
    chunks = []

    
    # Process ordinary scheme sections.
    section_mapping = {
        "DESCRIPTION": ["description"],
        "EXCLUSIONS": ["exclusions_ineligibility"],
        "BENEFITS": ["benefits"],
        "APPLICATION": ["application_process"],
        "DOCUMENTS": ["documents_required"]
    }

    for section_type, source_fields in section_mapping.items():
        for field in source_fields:
            text = scheme.get(field)

            if not text or not text.strip():
                continue

            chunks.extend(
                build_section_chunks(
                    scheme_id=scheme_id,
                    section_type=section_type,
                    text=text,
                    tokenizer=tokenizer,
                    source_fields=[field]
                )
            )

    # Process eligibility fields separately.
    criteria = scheme.get("eligibility_criteria") or ""
    general = scheme.get("eligibility_general") or ""

    criteria = criteria.strip()
    general = general.strip()

    if criteria and general:
        if normalize_for_comparison(criteria) == normalize_for_comparison(general):
            # Identical content: generate only one chunk set.
            chunks.extend(
                build_section_chunks(
                    scheme_id=scheme_id,
                    section_type="ELIGIBILITY",
                    text=criteria,
                    tokenizer=tokenizer,
                    source_fields=[
                        "eligibility_criteria",
                        "eligibility_general"
                    ]
                )
            )
        else:
            # Different content: preserve both independently.
            chunks.extend(
                build_section_chunks(
                    scheme_id=scheme_id,
                    section_type="ELIGIBILITY_CRITERIA",
                    text=criteria,
                    tokenizer=tokenizer,
                    source_fields=["eligibility_criteria"]
                )
            )

            chunks.extend(
                build_section_chunks(
                    scheme_id=scheme_id,
                    section_type="ELIGIBILITY_GENERAL",
                    text=general,
                    tokenizer=tokenizer,
                    source_fields=["eligibility_general"]
                )
            )

    elif criteria or general:
        field = (
            "eligibility_criteria"
            if criteria else "eligibility_general"
        )

        text = criteria or general

        chunks.extend(
            build_section_chunks(
                scheme_id=scheme_id,
                section_type="ELIGIBILITY",
                text=text,
                tokenizer=tokenizer,
                source_fields=[field]
            )
        )


    # Parse FAQs separately, retaining question-answer relationships.
    faq_text = scheme.get("faqs")

    if faq_text and faq_text.strip():
        faq_pairs = parse_faqs(faq_text)

        
        for index, faq in enumerate(faq_pairs):
             # Skip unreliable FAQs.
            if faq["parse_status"] != "complete":
               continue
            question_prefix = f"Q: {faq['question']}\nA: "

            # Reserve tokens for the question in every chunk.
            available_tokens = (
                MAX_CHUNK_TOKENS
                - get_token_count(question_prefix, tokenizer)
            )

            if available_tokens <= 0:
                raise ValueError(
                    f"FAQ question exceeds chunk limit: {faq['question']}"
                )

            answer_chunks = split_long_text(
                faq["answer"],
                tokenizer,
                max_tokens=available_tokens
            )

            if not answer_chunks:
                answer_chunks = [""]

            for sub_index, answer_chunk in enumerate(answer_chunks):

                # Repeat the question in every answer chunk.
                chunk_text = question_prefix + answer_chunk

                chunks.append({
                    "scheme_id": scheme_id,
                    "section_type": "FAQ",
                    "chunk_index": index * 1000 + sub_index,
                    "chunk_text": chunk_text,
                    "content_hash": calculate_hash(chunk_text),
                    "metadata": {
                        "source_fields": ["faqs"],
                        "question": faq["question"],
                        "faq_index": index,
                        "faq_sub_index": sub_index,
                        "faq_parse_status": faq["parse_status"],
                        "token_count": get_token_count(
                            chunk_text,
                            tokenizer
                        )
                    }
                })


    return chunks
