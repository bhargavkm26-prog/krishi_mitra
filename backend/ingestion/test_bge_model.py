import torch
from FlagEmbedding import BGEM3FlagModel

print("Loading BGE-M3 on NVIDIA GPU...")

model = BGEM3FlagModel(
    "BAAI/bge-m3",
    use_fp16=True,
    devices="cuda:0"
)

print("\nModel loaded successfully!")

print("GPU:", torch.cuda.get_device_name(0))
print("Allocated VRAM:",
      round(torch.cuda.memory_allocated(0) / 1024**3, 2), "GB")

test_texts = [
    "What government schemes are available for farmers?",
    "Financial assistance for small and marginal farmers."
]

print("\nGenerating test embeddings...")

output = model.encode(
    test_texts,
    batch_size=1,
    max_length=512,
    return_dense=True,
    return_sparse=True,
    return_colbert_vecs=True
)

torch.cuda.synchronize()

print("\n========== GPU VERIFICATION ==========")

print(
    "Model parameter device:",
    next(model.model.parameters()).device
)

print(
    "GPU memory allocated:",
    round(torch.cuda.memory_allocated(0) / 1024**3, 2),
    "GB"
)

print(
    "GPU memory reserved:",
    round(torch.cuda.memory_reserved(0) / 1024**3, 2),
    "GB"
)

print("\n========== RESULTS ==========")

print("Dense vector shape:", output["dense_vecs"].shape)

print("Sparse vectors:", len(output["lexical_weights"]))

print("\n========== SPARSE VECTOR INSPECTION ==========")

for index, sparse_vector in enumerate(output["lexical_weights"]):
    print(f"\nText {index + 1}")
    print("Number of non-zero terms:", len(sparse_vector))
    print("First 10 entries:", list(sparse_vector.items())[:10])

    if sparse_vector:
        token_ids = [int(token_id) for token_id in sparse_vector.keys()]
        print("Minimum token ID:", min(token_ids))
        print("Maximum token ID:", max(token_ids))

print("ColBERT vectors:", len(output["colbert_vecs"]))

print("\nBGE-M3 GPU test PASSED!")