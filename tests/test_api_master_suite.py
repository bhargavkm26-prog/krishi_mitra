import sys
import time
from pathlib import Path

# Ensure root is in sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from backend.app import app

client = TestClient(app)

GREEN = "\033[92m"
RED = "\033[91m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

results = []

def record(suite: str, test_name: str, passed: bool, dur: float, details: str = ""):
    st = f"{GREEN}PASSED{RESET}" if passed else f"{RED}FAILED{RESET}"
    print(f"[{st}] ({dur:.2f}s) {BOLD}{suite}:{RESET} {test_name}")
    if details:
        print(f"       {CYAN}↳ {details}{RESET}")
    results.append({"suite": suite, "name": test_name, "passed": passed, "duration": dur, "details": details})


def test_gateway():
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}SUITE 1: GATEWAY & CONSOLIDATED HEALTH{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")

    # 1.1 Root Overview
    t0 = time.time()
    res = client.get("/")
    passed = res.status_code == 200 and "services" in res.json()
    record("Gateway", "Root Catalog & Endpoint Overview", passed, time.time() - t0, f"Status: {res.status_code}, Services: {list(res.json().get('services', {}).keys())}")

    # 1.2 Master Consolidated Health
    t0 = time.time()
    res = client.get("/health")
    data = res.json()
    passed = res.status_code == 200 and "subsystems" in data
    record("Gateway", "Consolidated Subsystem Health Telemetry", passed, time.time() - t0, f"Status: {data.get('status')}, GPU: {data.get('subsystems', {}).get('bge_m3_embedding_engine', {}).get('device')}")


def test_database_router():
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}SUITE 2: API 1 - POSTGRESQL + PGVECTOR SERVICE (/api/v1/database/*){RESET}")
    print(f"{BOLD}{'='*70}{RESET}")

    # 2.1 DB Health
    t0 = time.time()
    res = client.get("/api/v1/database/health")
    data = res.json()
    passed = res.status_code == 200 and data.get("schemes_count", 0) > 0
    record("API 1 (DB)", "Database Health & pgvector Status", passed, time.time() - t0, f"Schemes: {data.get('schemes_count')}, FAQ Chunks: {data.get('faq_chunks_count')}")

    # 2.2 Paginated Schemes
    t0 = time.time()
    res = client.get("/api/v1/database/schemes?limit=5&offset=0")
    data = res.json()
    passed = res.status_code == 200 and len(data.get("schemes", [])) == 5 and data.get("total") >= 2000
    record("API 1 (DB)", "Paginated Scheme Catalog (limit=5)", passed, time.time() - t0, f"Total Schemes in DB: {data.get('total')}, Returned: {len(data.get('schemes', []))}")

    # 2.3 Single Scheme Dossier (Valid ID 1421)
    t0 = time.time()
    res = client.get("/api/v1/database/schemes/1421")
    data = res.json()
    passed = res.status_code == 200 and data.get("found") is True and "dossier" in data
    record("API 1 (DB)", "17-Column Scheme Dossier (ID 1421)", passed, time.time() - t0, f"Scheme: {data.get('dossier', {}).get('scheme_name')}")

    # 2.4 Scheme Dossier 404 (Invalid ID 999999)
    t0 = time.time()
    res = client.get("/api/v1/database/schemes/999999")
    passed = res.status_code == 404
    record("API 1 (DB)", "Scheme Not Found 404 Error Boundary", passed, time.time() - t0, f"Expected 404, received {res.status_code}")

    # 2.5 Farmer Details (ID 1)
    t0 = time.time()
    res = client.get("/api/v1/database/farmers/1")
    data = res.json()
    passed = res.status_code == 200 and data.get("found") is True
    farmer = data.get("farmer", {})
    record("API 1 (DB)", "Farmer Facts Hydration (Farmer ID 1)", passed, time.time() - t0, f"Farmer: {farmer.get('full_name')}, State: {farmer.get('state')}, Category: {farmer.get('social_category')}")

    # 2.6 Farmer 404 (Invalid Farmer ID 999999)
    t0 = time.time()
    res = client.get("/api/v1/database/farmers/999999")
    passed = res.status_code == 404
    record("API 1 (DB)", "Farmer Not Found 404 Error Boundary", passed, time.time() - t0, f"Expected 404, received {res.status_code}")

    # 2.7 Farmer Profile Registration (Wizard Payload)
    t0 = time.time()
    payload = {
        "district": "Mandya",
        "land_size_acres": 2.5,
        "land_ownership": "owned",
        "crop": "Ragi",
        "irrigation": "rainfed",
        "category": "obc",
        "age_group": "young",
        "gender": "male",
        "has_bank_account": True,
        "has_fruits_id": True
    }
    res = client.post("/api/v1/database/farmers/profile", json=payload)
    passed = res.status_code == 200 and res.json().get("success") is True
    record("API 1 (DB)", "Farmer Wizard Profile Registration", passed, time.time() - t0, f"Generated Farmer ID: {res.json().get('farmer_id')}")

    # 2.8 Raw Vector Query (1024-dim dummy vector)
    t0 = time.time()
    dummy_vec = [0.01] * 1024
    res = client.post("/api/v1/database/raw-vector-query", json={"vector": dummy_vec, "limit": 3})
    data = res.json()
    passed = res.status_code == 200 and data.get("count") == 3
    record("API 1 (DB)", "Direct HNSW pgvector Distance Search", passed, time.time() - t0, f"Matches: {data.get('count')}, Closest: '{data.get('matches', [{}])[0].get('scheme_name')}'")

    # 2.9 Raw Vector 422 Validation Error (Invalid dimensions)
    t0 = time.time()
    res = client.post("/api/v1/database/raw-vector-query", json={"vector": [0.1, 0.2], "limit": 3})
    passed = res.status_code == 422
    record("API 1 (DB)", "Vector Dimension Validation (422 Error)", passed, time.time() - t0, f"Expected 422, received {res.status_code}")


def test_bge_router():
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}SUITE 3: API 2 - BGE-M3 DENSE EMBEDDING & SEARCH SERVICE (/api/v1/bge/*){RESET}")
    print(f"{BOLD}{'='*70}{RESET}")

    # 3.1 BGE Health
    t0 = time.time()
    res = client.get("/api/v1/bge/health")
    data = res.json()
    passed = res.status_code == 200 and data.get("dim") == 1024
    record("API 2 (BGE)", "BGE-M3 Model Health & GPU Device", passed, time.time() - t0, f"Device: {data.get('device')}, Dim: {data.get('dim')}")

    # 3.2 Dense Embedding Generation
    t0 = time.time()
    res = client.post("/api/v1/bge/embed", json={"text": "high speed tractor subsidy"})
    data = res.json()
    passed = res.status_code == 200 and data.get("dim") == 1024 and len(data.get("vector", [])) == 1024
    record("API 2 (BGE)", "Text-to-Dense Vector Embedding (1024-dim)", passed, time.time() - t0, f"Generated {data.get('dim')}-dim vector for query '{data.get('text_sample')}'")

    # 3.3 Semantic Scheme Search
    t0 = time.time()
    res = client.post("/api/v1/bge/search/schemes", json={"query": "tractor machinery subsidy", "state": "Assam", "limit": 3})
    data = res.json()
    passed = res.status_code == 200 and data.get("count") > 0
    top = data.get("schemes", [{}])[0]
    record("API 2 (BGE)", "Dense Vector Semantic Scheme Search", passed, time.time() - t0, f"Retrieved {data.get('count')} schemes. Top: '{top.get('scheme_name')}' (Score: {top.get('relevance_score')})")

    # 3.4 Semantic FAQ Precedent Search
    t0 = time.time()
    res = client.post("/api/v1/bge/search/faqs", json={"issue": "Aadhaar bank account block", "limit": 3})
    data = res.json()
    passed = res.status_code == 200 and data.get("count") > 0
    top_faq = data.get("faqs", [{}])[0]
    record("API 2 (BGE)", "Dense Semantic Administrative FAQ Search", passed, time.time() - t0, f"Retrieved {data.get('count')} FAQs. Top scheme: '{top_faq.get('scheme')}' (Score: {top_faq.get('relevance_score')})")


def test_gemma_router():
    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}SUITE 4: API 3 - GEMMA 4 REASONING & DECISION SERVICE (/api/v1/gemma/*){RESET}")
    print(f"{BOLD}{'='*70}{RESET}")

    # 4.1 Gemma Health
    t0 = time.time()
    res = client.get("/api/v1/gemma/health")
    data = res.json()
    passed = res.status_code == 200 and data.get("healthy") is True
    record("API 3 (Gemma)", "Local llama-server Health Ping", passed, time.time() - t0, f"Server URL: {data.get('server_url')}, Healthy: {data.get('healthy')}")

    # 4.2 Raw Chat Completion
    t0 = time.time()
    messages = [
        {"role": "system", "content": "Respond in JSON format: {\"greeting\": \"text\"}"},
        {"role": "user", "content": "Hello"}
    ]
    res = client.post("/api/v1/gemma/chat", json={"messages": messages, "temperature": 0.1})
    passed = res.status_code == 200 and res.json().get("status") == "success"
    record("API 3 (Gemma)", "Direct Prompt & Structured JSON Response", passed, time.time() - t0, f"Response: {res.json().get('response')}")

    # 4.3 Wing 1 Statutory 4-State Eligibility Evaluation
    t0 = time.time()
    # Farmer 1 (Assam) vs Meghalaya Rice Mission (Scheme ID 1814) -> Must be INELIGIBLE
    res = client.post("/api/v1/gemma/evaluate", json={"farmer_id": 1, "scheme_id": 1814})
    data = res.json()
    passed = res.status_code == 200 and data.get("status") == "INELIGIBLE"
    record("API 3 (Gemma)", "Wing 1 Statutory 4-State Evaluation (Assam vs Meghalaya)", passed, time.time() - t0, f"Status: {data.get('status')}, Disqualifiers: {data.get('disqualifying_factors')}")

    # 4.4 Wing 2 Chief Secretary Autonomous ReAct Consultation
    t0 = time.time()
    res = client.post("/api/v1/gemma/consult", json={
        "inquiry": "What financial subsidy or machinery pool can an SC farmer in Assam get for farm equipment?",
        "farmer_id": 1,
        "max_turns": 3
    })
    data = res.json()
    passed = res.status_code == 200 and len(data.get("deliberation", "")) > 0 and "directive" in data
    directive = data.get("directive", {})
    record("API 3 (Gemma)", "Wing 2 Chief Secretary Autonomous Consultation", passed, time.time() - t0, f"Deliberation recorded: {bool(data.get('deliberation'))}, Steps: {len(directive.get('administrative_action_plan', []))}")


def main():
    print(f"\n{BOLD}{'*'*70}{RESET}")
    print(f"{BOLD}STARTING KRISHI MITRA COMPREHENSIVE BACKEND API TEST SUITE{RESET}")
    print(f"{BOLD}Scope: Gateway + API 1 (Postgres) + API 2 (BGE-M3) + API 3 (Gemma 4){RESET}")
    print(f"{BOLD}{'*'*70}{RESET}\n")

    t_start = time.time()
    test_gateway()
    test_database_router()
    test_bge_router()
    test_gemma_router()
    total_time = time.time() - t_start

    total_tests = len(results)
    passed_cnt = sum(1 for r in results if r["passed"])
    failed_cnt = total_tests - passed_cnt

    print(f"\n{BOLD}{'='*70}{RESET}")
    print(f"{BOLD}BACKEND API MASTER SUITE EXECUTION SUMMARY{RESET}")
    print(f"{BOLD}{'='*70}{RESET}")
    print(f"Total API Endpoints & Contract Tests: {BOLD}{total_tests}{RESET}")
    print(f"Passed: {GREEN}{passed_cnt}{RESET} / {total_tests} ({passed_cnt/total_tests*100:.1f}%)")
    print(f"Failed: {RED}{failed_cnt}{RESET}")
    print(f"Total Execution Time: {BOLD}{total_time:.2f} seconds{RESET}")
    print(f"{BOLD}{'='*70}{RESET}\n")

    if failed_cnt > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()
