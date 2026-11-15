
import numpy as np
from FlagEmbedding import BGEM3FlagModel

MODEL_NAME = "BAAI/bge-m3"

model = BGEM3FlagModel(
    MODEL_NAME,
    use_fp16=True,
    devices="cuda:0"
)

query = "I am a small farmer and need financial assistance for purchasing agricultural equipment."

documents = [
    "Farm mechanization assistance for small and marginal farmers.",
    "Financial assistance for purchasing agricultural machinery."
]

query_output = model.encode(
    [query],
    return_dense=False,
    return_sparse=False,
    return_colbert_vecs=True
)

document_output = model.encode(
    documents,
    return_dense=False,
    return_sparse=False,
    return_colbert_vecs=True
)

query_vectors = query_output["colbert_vecs"][0]
document_vectors = document_output["colbert_vecs"]

def inspect_norms(name, vectors):
    norms = np.linalg.norm(vectors, axis=1)

    print(f"\n{name}")
    print("-" * 40)
    print("Shape:", vectors.shape)
    print("Data type:", vectors.dtype)
    print("Minimum norm:", float(norms.min()))
    print("Maximum norm:", float(norms.max()))
    print("Average norm:", float(norms.mean()))
    print("Median norm:", float(np.median(norms)))
    print("Vectors approximately unit-normalized:",
          bool(np.allclose(norms, 1.0, atol=0.02)))

inspect_norms("QUERY VECTORS", query_vectors)

for i, vectors in enumerate(document_vectors):
    inspect_norms(f"DOCUMENT {i + 1}", vectors)
