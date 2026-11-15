
from transformers import AutoTokenizer

from backend.ingestion.chunker import (
    parse_faqs,
    split_long_text,
    calculate_hash,
    normalize_for_comparison
)

MODEL_NAME = "BAAI/bge-m3"

print("Loading BGE-M3 tokenizer...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

print("Tokenizer loaded successfully.")


# Test 1: Token counting and text splitting
sample_text = """
Farmers must own agricultural land.

Tenant farmers may also apply if they provide valid cultivation records.

The scheme provides financial assistance to eligible applicants.
"""

chunks = split_long_text(
    sample_text,
    tokenizer,
    max_tokens=30
)

print("\nTEST 1: Text splitting")

for index, chunk in enumerate(chunks):
    print(f"\nChunk {index + 1}:")
    print(chunk)
    print("Tokens:", len(tokenizer.encode(
        chunk,
        add_special_tokens=False
    )))


# Test 2: FAQ parsing
sample_faq = """
Q: Who can apply?

A: Farmers residing in Karnataka can apply.

Q: What documents are required?

A: Aadhaar card and land records are required.
"""

faqs = parse_faqs(sample_faq)

print("\nTEST 2: FAQ parsing")
for faq in faqs:
    print(faq)


# Test 3: Duplicate eligibility detection
text_a = "Farmers must own agricultural land."
text_b = "Farmers   must own agricultural land."

print("\nTEST 3: Duplicate comparison")
print(
    "Identical after normalization:",
    normalize_for_comparison(text_a)
    == normalize_for_comparison(text_b)
)


# Test 4: Content hashing
print("\nTEST 4: SHA-256")
print(calculate_hash(text_a))

print("\nAll basic tests completed.")


print("\nTEST 5: Source preservation")

original_text = """
Farmers must own agricultural land.

Tenant farmers may also apply if they provide valid cultivation records.

The scheme provides financial assistance to eligible applicants.
"""

chunks = split_long_text(original_text, tokenizer)

# Check that every chunk comes directly from the original text.
for index, chunk in enumerate(chunks, start=1):
    assert chunk in original_text, (
        f"Chunk {index} is not an exact source substring"
    )

# Check that all non-whitespace source characters are covered.
covered = [False] * len(original_text)

search_position = 0

for chunk in chunks:
    position = original_text.find(chunk, search_position)

    assert position != -1, "Chunk order or source text is incorrect"

    for char_index in range(position, position + len(chunk)):
        covered[char_index] = True

    search_position = position + 1

missing = [
    original_text[i]
    for i in range(len(original_text))
    if not original_text[i].isspace() and not covered[i]
]

assert not missing, f"Source characters were lost: {missing}"

print("All chunks are exact source substrings.")
print("All original non-whitespace characters are covered.")
