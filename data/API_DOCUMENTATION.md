# Krishi Mitra — Master API Catalog & Specification

This document provides the complete, authoritative documentation for all **Krishi Mitra Backend APIs**.
The backend runs on **FastAPI** and is organized into **three completely decoupled, standalone micro-services**:

1. **API 1: PostgreSQL + pgvector Core Database Service** (`/api/v1/database/*`)
2. **API 2: BGE-M3 Dense Embedding & Semantic Search Service** (`/api/v1/bge/*`)
3. **API 3: Gemma 4 E4B Cognitive Reasoning & Decision Service** (`/api/v1/gemma/*`)

---

## Gateway Quick Reference

- **Base URL:** `http://127.0.0.1:8000`
- **Interactive Swagger UI (Testing Console):** `http://127.0.0.1:8000/docs`
- **ReDoc Technical Specification:** `http://127.0.0.1:8000/redoc`
- **Consolidated Health Endpoint:** `http://127.0.0.1:8000/health`
- **Start Backend Command:** `.venv\Scripts\uvicorn.exe backend.app:app --host 127.0.0.1 --port 8000 --reload`
- **Run Verification Test Suite:** `.venv\Scripts\python.exe tests/test_api_master_suite.py`
- **Test Certification Status:** **19 / 19 Tests Passed (100.0%)**

---

### Verification & Performance Telemetry (Certified 100% PASS)

| Subsystem API | Endpoint Tested | Measured Latency | Verification Status |
| :--- | :--- | :---: | :---: |
| **Gateway** | `GET /` & `GET /health` | ~30ms | **PASS** |
| **API 1: PostgreSQL** | `GET /schemes`, `/schemes/{id}`, `/farmers/{id}`, `/raw-vector-query` | ~3ms to ~28ms | **PASS (9/9)** |
| **API 2: BGE-M3 GPU** | `POST /embed`, `POST /search/schemes`, `POST /search/faqs` | ~40ms to ~330ms | **PASS (4/4)** |
| **API 3: Gemma 4 Brain** | `POST /chat`, `POST /evaluate`, `POST /consult`, `/consult-stream` | ~0.75s to ~19.5s | **PASS (4/4)** |

---

## 1. API 1: PostgreSQL + pgvector Database Service (`/api/v1/database`)

*Operates purely on PostgreSQL without loading any AI weights into memory. Extremely fast (~3ms to ~8ms latency).*

### 1.1 Check Database Subsystem Health
- **Endpoint:** `GET /api/v1/database/health`
- **Example Response:**
  ```json
  {
    "status": "healthy",
    "schemes_count": 2066,
    "faq_chunks_count": 20110,
    "pgvector_version": "0.8.7"
  }
  ```

### 1.2 Paginated Scheme Catalog
- **Endpoint:** `GET /api/v1/database/schemes`
- **Query Parameters:**
  - `state` (optional, string): e.g. `"Assam"`, `"Karnataka"`
  - `ministry` (optional, string): e.g. `"Agriculture"`
  - `limit` (integer, default: 20, max: 100)
  - `offset` (integer, default: 0)
- **Example Response:**
  ```json
  {
    "total": 2066,
    "limit": 5,
    "offset": 0,
    "schemes": [
      {
        "id": 1,
        "scheme_name": "Gramin Bhandaran Yojana",
        "scheme_slug": "gramin-bhandaran-yojana",
        "level": "Central Government",
        "state_ut_ministry": "Ministry of Agriculture & Farmers Welfare",
        "application_mode": "Offline",
        "tags": ["Agriculture", "Storage", "Infrastructure"]
      }
    ]
  }
  ```

### 1.3 Full 17-Column Scheme Dossier
- **Endpoint:** `GET /api/v1/database/schemes/{id}`
- **Path Parameter:** `id` (e.g., `1421` for PM-KISAN)
- **Example Response:**
  ```json
  {
    "found": true,
    "dossier": {
      "id": 1421,
      "scheme_name": "Pradhan Mantri Kisan Samman Nidhi",
      "level": "Central Government",
      "state_ut_ministry": "Ministry of Agriculture and Farmers Welfare",
      "application_mode": "Online / Offline",
      "description": "Income support of Rs. 6000 per year...",
      "eligibility_criteria": "Small and marginal farmers holding cultivable land...",
      "exclusions_ineligibility": "Institutional landholders, income tax payees...",
      "benefits": "Rs. 6000 per annum payable in three equal installments...",
      "application_process": "Apply via PM-Kisan portal or nearest CSC...",
      "documents_required": "Aadhaar Card, Land Records (RoR), Bank Passbook...",
      "official_link": "https://pmkisan.gov.in"
    }
  }
  ```

### 1.4 Farmer Profile Facts & Demographics
- **Endpoint:** `GET /api/v1/database/farmers/{id}`
- **Path Parameter:** `id` (e.g. `1` to `100`)
- **Example Response:**
  ```json
  {
    "found": true,
    "farmer": {
      "farmer_id": 1,
      "full_name": "Suresh Hegde",
      "state": "Assam",
      "district": "Dhemaji",
      "social_category": "SC",
      "farmer_category": "Medium"
    },
    "landholdings": [
      {
        "landholding_id": 1,
        "total_area_hectares": 6.37,
        "ownership_type": "owned"
      }
    ]
  }
  ```

### 1.5 Register Farmer Wizard Profile
- **Endpoint:** `POST /api/v1/database/farmers/profile`
- **Request Body:**
  ```json
  {
    "district": "Mandya",
    "land_size_acres": 2.5,
    "land_ownership": "owned",
    "crop": "Ragi",
    "irrigation": "rainfed",
    "category": "obc",
    "age_group": "young",
    "gender": "male",
    "has_bank_account": true,
    "has_fruits_id": true
  }
  ```
- **Example Response:**
  ```json
  {
    "success": true,
    "farmer_id": 101,
    "message": "Farmer profile successfully registered."
  }
  ```

### 1.6 Raw Vector Search (HNSW Distance)
- **Endpoint:** `POST /api/v1/database/raw-vector-query`
- **Request Body:**
  ```json
  {
    "vector": [0.012, -0.045, 0.089, ...], // Must be exactly 1024 floats
    "limit": 3
  }
  ```
- **Example Response:**
  ```json
  {
    "count": 3,
    "matches": [
      {
        "chunk_id": 4821,
        "scheme_id": 1742,
        "scheme_name": "Sub-mission On Agriculture Mechanization",
        "distance": 0.1872
      }
    ]
  }
  ```

---

## 2. API 2: BGE-M3 Dense Embedding & Search Service (`/api/v1/bge`)

*Runs dedicated GPU inference on `cuda:0` in FP16. Latency is ~40ms to ~90ms.*

### 2.1 Check BGE Model & GPU Status
- **Endpoint:** `GET /api/v1/bge/health`
- **Example Response:**
  ```json
  {
    "status": "active",
    "device": "cuda:0",
    "model_name": "BAAI/bge-m3",
    "dim": 1024
  }
  ```

### 2.2 Text-to-Dense Vector Embedding
- **Endpoint:** `POST /api/v1/bge/embed`
- **Request Body:**
  ```json
  {
    "text": "high-speed tractor subsidy for scheduled caste farmer"
  }
  ```
- **Example Response:**
  ```json
  {
    "dim": 1024,
    "text_sample": "high-speed tractor subsidy for scheduled caste farmer",
    "vector": [0.0381, -0.0124, 0.0492, ...] // 1024 floats
  }
  ```

### 2.3 Semantic Scheme Search
- **Endpoint:** `POST /api/v1/bge/search/schemes`
- **Request Body:**
  ```json
  {
    "query": "solar powered water pump subsidy",
    "state": "Assam",
    "limit": 3
  }
  ```
- **Example Response:**
  ```json
  {
    "count": 3,
    "query": "solar powered water pump subsidy",
    "schemes": [
      {
        "scheme_id": 1650,
        "scheme_name": "Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan (PM-KUSUM)",
        "level": "Central Government",
        "state_ut_ministry": "Ministry of New and Renewable Energy",
        "section": "Benefits",
        "evidence": "Component B provides standalone solar water pumping system subsidy...",
        "relevance_score": 0.8419
      }
    ]
  }
  ```

### 2.4 Administrative FAQ Semantic Precedent Search
- **Endpoint:** `POST /api/v1/bge/search/faqs`
- **Request Body:**
  ```json
  {
    "issue": "Aadhaar linked bank account block",
    "limit": 3
  }
  ```
- **Example Response:**
  ```json
  {
    "count": 3,
    "issue": "Aadhaar linked bank account block",
    "faqs": [
      {
        "scheme": "Pradhan Mantri Kisan Samman Nidhi",
        "ministry": "Ministry of Agriculture and Farmers Welfare",
        "faq_text": "Ensure Aadhaar seeding with bank account for direct benefit transfer...",
        "relevance_score": 0.7812
      }
    ]
  }
  ```

---

## 3. API 3: Gemma 4 E4B Cognitive Reasoning Service (`/api/v1/gemma`)

*Interfaced with local `llama-server.exe` on port 8080. Powers eligibility verdicts, cross-ministerial synthesis, and live thought streaming.*

### 3.1 Check Local Gemma LLM Server Status
- **Endpoint:** `GET /api/v1/gemma/health`
- **Example Response:**
  ```json
  {
    "status": "live",
    "server_url": "http://127.0.0.1:8080",
    "healthy": true
  }
  ```

### 3.2 Direct Chat Completion
- **Endpoint:** `POST /api/v1/gemma/chat`
- **Request Body:**
  ```json
  {
    "messages": [
      {"role": "user", "content": "What documents are required for KCC?"}
    ],
    "temperature": 0.1,
    "max_tokens": 1000
  }
  ```

### 3.3 Wing 1 Statutory 4-State Eligibility Evaluation
- **Endpoint:** `POST /api/v1/gemma/evaluate`
- **Request Body:**
  ```json
  {
    "farmer_id": 1,
    "scheme_id": 1814
  }
  ```
- **Example Response:**
  ```json
  {
    "scheme_id": 1814,
    "scheme_name": "State Rice Mission Scheme",
    "status": "INELIGIBLE",
    "confidence_score": 0.98,
    "disqualifying_factors": [
      "State Mismatch (Applicant from Assam applying for Meghalaya scheme)"
    ],
    "priority_tier": "LOW",
    "target_quota": null,
    "fit_score": 0.0
  }
  ```

### 3.4 Wing 2 Chief Secretary Autonomous Consultation
- **Endpoint:** `POST /api/v1/gemma/consult`
- **Request Body:**
  ```json
  {
    "inquiry": "What financial subsidy or machinery pool can an SC farmer in Assam get for farm equipment?",
    "farmer_id": 1,
    "max_turns": 3
  }
  ```
- **Example Response:**
  ```json
  {
    "status": "completed",
    "deliberation": "1. Jurisdictional analysis confirms SMAM applies in Assam...",
    "directive": {
      "has_sufficient_data": true,
      "executive_summary": "As Chief Secretary, I assure you that agricultural mechanization is prioritized for SC farmers in Assam...",
      "inter_ministerial_package": [
        {
          "ministry": "Ministry of Agriculture and Farmers Welfare",
          "scheme_name": "Sub-Mission on Agriculture Mechanization (SMAM)",
          "provisions": "Up to 50% subsidy on approved farm equipment"
        }
      ],
      "administrative_action_plan": [
        "Step 1: Register on the central DBT Farm Machinery portal (agrimachinery.nic.in).",
        "Step 2: Submit quotation of empanelled tractor manufacturer to District Agriculture Officer in Dhemaji.",
        "Step 3: Await physical inspection by Assistant Agricultural Engineer."
      ]
    }
  }
  ```

### 3.5 Futuristic Server-Sent Events (SSE) Live Thought Stream
- **Endpoint:** `GET /api/v1/gemma/consult-stream?inquiry=...&farmer_id=1`
- **Protocol:** `text/event-stream` (HTTP Server-Sent Events)
- **Event Flow:**
  - `event: start` -> Emits confirmation of received inquiry.
  - `event: thought` -> Emits Chief Secretary's preliminary hypothesis.
  - `event: deliberation` -> Streams the raw `<executive_deliberation>` scratchpad.
  - `event: final_directive` -> Emits the structured JSON citizen action plan.
  - `event: complete` -> Emits stream completion event.
