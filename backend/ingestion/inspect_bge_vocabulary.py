
from transformers import AutoTokenizer

MODEL_NAME = "BAAI/bge-m3"

print("Loading BGE-M3 tokenizer...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

print("\n========== VOCABULARY REPORT ==========")

print("Tokenizer vocabulary size:", tokenizer.vocab_size)
print("Full vocabulary including added tokens:", len(tokenizer))

print("Maximum possible token ID:", len(tokenizer) - 1)

print("\nVocabulary inspection complete.")
