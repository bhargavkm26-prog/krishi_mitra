
from transformers import AutoTokenizer

from backend.ingestion.chunker import (
    parse_faqs,
    build_scheme_chunks
)

sample = """
Q: What is Startup India Seed Fund Scheme?
A: Startup India Seed Fund Scheme provides financial assistance to startups.

Q: Is there a Management Fee provisioned?
A: Yes, a component of Management Fee @ 5% of Seed Fund grant will be provisioned.
What can the incubator use this Grant of up to ₹ 5 Cr.

Q: for?
A: Incubators shall use the grant for disbursal of seed fund to eligible startups.
"""

print("Loading BGE-M3 tokenizer...")
tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-m3")
print("Tokenizer loaded.")

# Test 1: FAQ parsing
print("\n========== FAQ PARSING ==========")

results = parse_faqs(sample)

for index, item in enumerate(results, start=1):
    print(f"\nFAQ {index}")
    print("Question:", item["question"])
    print("Answer:", item["answer"])
    print("Status:", item["parse_status"])


# Test 2: Actual FAQ chunk generation
print("\n========== FAQ CHUNK GENERATION ==========")

scheme = {
    "id": 999999,
    "scheme_name": "Test Scheme",
    "description": "Test description.",
    "eligibility_criteria": "Farmers can apply.",
    "eligibility_general": "Farmers can apply.",
    "exclusions_ineligibility": "",
    "benefits": "",
    "application_process": "",
    "documents_required": "",
    "faqs": sample
}

chunks = build_scheme_chunks(scheme, tokenizer)

faq_chunks = [
    chunk for chunk in chunks
    if chunk["section_type"] == "FAQ"
]

for index, chunk in enumerate(faq_chunks, start=1):
    print(f"\nChunk {index}")
    print(chunk["chunk_text"])
    print("Tokens:", tokenizer(
        chunk["chunk_text"],
        add_special_tokens=False
    )["input_ids"].__len__())

    assert chunk["question"] if "question" in chunk else (
        chunk["metadata"].get("question")
    ), "FAQ question missing"

    assert chunk["metadata"]["question"] in chunk["chunk_text"], (
        "Question context missing from FAQ chunk"
    )

print("\nTotal FAQ chunks:", len(faq_chunks))
print("FAQ chunk context test passed.")
