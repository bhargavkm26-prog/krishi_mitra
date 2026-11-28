# Krishi Mitra — Complete Backend API Reference & Frontend Integration Plan

> **Scope:** Read-only architecture and API-linking blueprint covering `backend/` FastAPI microservices and `frontend/index.html`, `frontend/dashboard_app.html`, and `frontend/ai_chat.html`.  
> **Note:** No source code was modified when authoring this specification. Every route, SQL query, schema field, DOM ID, and JavaScript handler documented below was verified directly in the repository files.

---

## 1. System Architecture & Port Map

```
+-------------------------------------------------------------------------+
|                       FRONTEND (Static / Local HTTP)                    |
|  - frontend/index.html            (js/krishi-nexus.js)                  |
|  - frontend/dashboard_app.html    (js/app.js, js/api.js, profileEditor) |
|  - frontend/ai_chat.html          (inline <script>)                     |
|  - frontend/page-login.html       (assets/js/auth.js, assets/js/api.js) |
+-----------------------------------+-------------------------------------+
                                    | HTTP / JSON / SSE (Port 8000)
                                    v
+-------------------------------------------------------------------------+
|                 FASTAPI GATEWAY — backend/app.py (Port 8000)            |
|  Mounts /ui -> frontend/          CORS: allow_origins=["*"]             |
|                                                                         |
|  1. /api/v1/database/*  (database_router.py) -> PostgreSQL + pgvector   |
|  2. /api/v1/bge/*       (bge_router.py)      -> BAAI/bge-m3 (CUDA/CPU)  |
|  3. /api/v1/gemma/*     (gemma_router.py)    -> llama-server (:8080)    |
+-------------------------------------------------------------------------+
          |                                   |
          v                                   v
+--------------------------+      +---------------------------------------+
| PostgreSQL + pgvector    |      | Local LLM Server (llama-server :8080) |
| - schemes (2,066 rows)   |      | - GET  /v1/models                     |
| - scheme_chunks (FAQs)   |      | - POST /v1/chat/completions (JSON)    |
| - chunk_dense_embeddings |      |   Gemma 4 E4B cognitive engine        |
| - india_locations (LGD)  |      +---------------------------------------+
| - farmer_profiles        |
| - farmer_landholdings    |
| - farmer_crops           |
| - farmer_trees           |
| - farmer_livestock       |
+--------------------------+
```

---

## 2. Detailed Breakdown of Every Backend API Connection ("What Each Connection Does")

### A. Gateway & System Telemetry (`backend/app.py`)

#### 1. `GET /` — Gateway Overview
* **Handler:** `root_overview()` (`backend/app.py:57-83`)
* **What it does internally:** Returns static JSON metadata describing API version (`1.0.0`), docs URLs (`/docs`, `/redoc`), service prefixes (`/api/v1/database`, `/api/v1/bge`, `/api/v1/gemma`), and a summary list of endpoints.
* **UI Purpose:** Developer diagnostics / connectivity smoke check.

#### 2. `GET /health` — Master Consolidated Health Check
* **Handler:** `consolidated_health()` (`backend/app.py:94-135`)
* **What it does internally:**
  1. Opens a PostgreSQL connection via `get_connection()` (`backend/database/connection.py:16`) and runs `SELECT count(*) FROM public.schemes;` to confirm DB availability (`db_ok`) and exact indexed scheme count (`schemes_indexed`).
  2. Checks `torch.cuda.is_available()` and reads `torch.cuda.get_device_name(0)` (`CUDA:0` or `CPU`) to report BGE-M3 hardware readiness (`fp16` precision).
  3. Instantiates `GemmaClient()` (`backend/reasoning/gemma_client.py:13`) and calls `is_healthy()`, which issues `GET http://127.0.0.1:8080/v1/models` with a 3-second timeout.
  4. Aggregates `status` as `"healthy"` only when both `db_ok` and `gemma_ok` are true, otherwise `"degraded"`.
* **Response JSON:**
  ```json
  {
    "status": "healthy",
    "subsystems": {
      "postgresql_pgvector": { "healthy": true, "schemes_indexed": 2066 },
      "bge_m3_embedding_engine": { "device": "cuda:0", "gpu_name": "...", "precision": "fp16" },
      "gemma_4_e4b_reasoning_server": { "healthy": true, "server_url": "http://127.0.0.1:8080" }
    }
  }
  ```
* **Frontend Purpose:** Drives live telemetry badges and counters on `index.html`, the top offline/degraded alert banner on `dashboard_app.html`, and the live engine indicator on `ai_chat.html`.

---

### B. Service 1: PostgreSQL + pgvector Database API (`backend/routers/database_router.py`, prefix `/api/v1/database`)

#### 3. `GET /api/v1/database/health` — Database & Vector Extension Telemetry
* **Handler:** `database_health()` (`database_router.py:30-55`)
* **What it does internally:** Queries `pg_extension` (`extname = 'vector'`) for the installed `pgvector` version, counts rows in `public.schemes`, and counts `public.scheme_chunks WHERE section_type = 'FAQ'`.
* **Response JSON:** `{ status, schemes_count, faq_chunks_count, pgvector_version }`.
* **Frontend Purpose:** Populates exact live counters (`schemes_count` and `faq_chunks_count`) in `#proof` on `index.html` instead of hardcoded `2,066` / `20,110`.

#### 4–7. LGD Location Hierarchy (`public.india_locations`)
* `GET /api/v1/database/locations/states` (`database_router.py:62-80`) → `SELECT DISTINCT state_name, state_code FROM public.india_locations ORDER BY state_name`
* `GET /api/v1/database/locations/districts?state=` (`database_router.py:83-102`) → case-insensitive match on `state_name`, returns `{districts: [{district_name, district_code}]}`
* `GET /api/v1/database/locations/sub-districts?state=&district=` (`database_router.py:105-128`) → filters by state + district, returns `{sub_districts: [{sub_district_name, sub_district_code}]}`
* `GET /api/v1/database/locations/villages?state=&district=&sub_district=` (`database_router.py:131-163`) → returns `{villages: [{location_id, village_name, village_code, state_code, district_code, sub_district_code}]}`
* **What each connection does:** Cascades Local Government Directory (LGD) dropdowns so selecting a village binds the exact foreign-key integer `location_id` for `farmer_profiles` and `farmer_landholdings`.
* **Current Status:** **Already connected** inside `dashboard_app.html` (`ProfileEditor._hydrateLgdDropdowns()` & `_on*Change()` in `frontend/js/profileEditor.js`) and inside `page-login.html` (`frontend/assets/js/auth.js`).

#### 8. `GET /api/v1/database/schemes` — Paginated SQL Schemes Catalog
* **Handler:** `list_schemes(search, state, ministry, limit=20, offset=0)` (`database_router.py:170-232`)
* **Constraints:** `limit` min `1`, max `100`; `offset >= 0`.
* **What it does internally:**
  * Dynamically constructs `WHERE 1=1`:
    * If `search` is provided: `AND (scheme_name ILIKE %term% OR scheme_slug ILIKE %term% OR tags::text ILIKE %term%)`
    * If `state` is provided: `AND (state_ut_ministry ILIKE %state% OR level = 'Central Government')` (automatically includes both State schemes and Central schemes)
    * If `ministry` is provided: `AND state_ut_ministry ILIKE %ministry%`
  * Executes `SELECT count(*)` for `total`, then fetches `{id, scheme_name, scheme_slug, level, state_ut_ministry, application_mode, tags}` ordered strictly `ORDER BY id LIMIT %s OFFSET %s`.
* **Response JSON:** `SchemeListResponse { total, limit, offset, schemes: SchemeSummary[] }`.
* **Frontend Purpose:** Browsable/paginated scheme discovery and exact keyword search in `dashboard_app.html` (`refreshData()`, `#scheme-search-input`, pagination).

#### 9. `GET /api/v1/database/schemes/{scheme_id}` — Official 17-Column Scheme Dossier
* **Handler:** `get_scheme_dossier(scheme_id)` (`database_router.py:235-241`) → delegates to `SecretariatToolkit.get_scheme_dossier(scheme_id)` (`backend/reasoning/tools.py:48-68`).
* **What it does internally:** Queries `public.schemes WHERE id = %s` returning all 17 columns:
  `id`, `scheme_name`, `scheme_slug`, `level`, `state_ut_ministry`, `application_mode`, `tags`, `description`, `eligibility_criteria`, `eligibility_general`, `exclusions_ineligibility`, `benefits`, `application_process`, `documents_required`, `faqs`, `official_link`, `myscheme_url`.
* **Response JSON:** `SchemeDossierResponse { found, dossier, message }`.
* **Frontend Purpose:** Hydrates `#scheme-detail-modal` in `dashboard_app.html` when a farmer opens a scheme card (replacing static `MOCK_DATA` checklist/steps/apply link with official gazette text and portal URLs).

#### 10. `GET /api/v1/database/farmers/check-id/{farmer_unique_id}` — Unique User ID Validator
* **Handler:** `check_farmer_unique_id()` (`database_router.py:248-293`)
* **What it does internally:** Validates `farmer_unique_id` against `validate_unique_id_rules` (`^[A-Za-z0-9@#$_-]{8,20}$`, requires ≥1 letter, ≥1 digit, and ≥1 symbol from `@ # $ _ -` matching PostgreSQL check constraint `farmer_unique_id_format`), then runs case-insensitive lookup `WHERE LOWER(farmer_unique_id) = LOWER(%s)` on `public.farmer_profiles`.
* **Response JSON:** `CheckUniqueIdResponse { farmer_unique_id, valid_format, available, message }`.
* **Frontend Purpose:** Used during sign-up on `page-login.html` (`auth.js:227`) and recommended if wizard guest completion in `dashboard_app.html` creates a new PostgreSQL farmer account.

#### 11. `POST /api/v1/database/farmers/login` — Credential Authentication & 6-Table Load
* **Handler:** `login_farmer(FarmerLoginRequest)` (`database_router.py:296-336`)
* **Request Body:** `{ farmer_unique_id, password }`
* **What it does internally:**
  1. Looks up `farmer_id, password` in `public.farmer_profiles WHERE LOWER(farmer_unique_id) = LOWER(%s)`.
  2. Verifies exact password match (`401 Unauthorized` on mismatch).
  3. Calls `get_farmer_profile(farmer_id)` (`backend/profiles/profile_aggregator.py:31-195`), which joins `farmer_profiles` + `india_locations` and aggregates nested `farmer_landholdings`, `farmer_crops`, `farmer_trees`, `farmer_livestock`, and `unassigned_crops` (converting PostgreSQL `Decimal`/`date`/`datetime` values via `make_json_serializable()`).
* **Response JSON:** `FarmerFactsResponse { found, farmer, landholdings, unassigned_crops }`.
* **Current Status:** **Already connected** in `index.html` (`authenticateFarmerOffcanvas()` in `krishi-nexus.js:439`), `dashboard_app.html` (`ApiService.loginWithCredentials()` in `api.js:150`), and `page-login.html` (`auth.js:160`).

#### 12. `POST /api/v1/database/farmers/register` — 6-Table Transactional Farmer Registration
* **Handler:** `register_new_farmer(NewFarmerRegisterRequest)` (`database_router.py:613-730`)
* **What it does internally:**
  1. Validates `farmer_unique_id` rules and non-empty `password`; enforces uniqueness (`409 Conflict` on duplicate).
  2. Resolves LGD `location_id` via `_resolve_location_from_db()` against `india_locations`.
  3. Inside one PostgreSQL transaction (`with conn:`), inserts into `public.farmer_profiles` (`RETURNING farmer_id`), then invokes `_sync_farmer_child_tables()` (`database_router.py:367-610`) to insert `farmer_landholdings` and resolve `plot_index` foreign keys for `farmer_crops`, `farmer_trees` (requires `landholding_id` & `tree_count > 0`), and `farmer_livestock` (requires `landholding_id` & `animal_count > 0`). Blank optional strings coerce to SQL `NULL` (`empty_to_none`).
* **Response JSON:** `NewFarmerRegisterResponse { success, farmer_id, farmer_unique_id, landholdings_created, crops_created, trees_created, livestock_created, message }`.
* **Frontend Purpose:** Used by `page-login.html?tab=register` (`auth.js:1049`), and target endpoint if an unauthenticated wizard user in `dashboard_app.html` registers at the end of `completeWizard()`.

#### 13. `GET /api/v1/database/farmers/{identifier}` — Full Farmer Dossier Lookup
* **Handler:** `get_farmer_details(identifier)` (`database_router.py:899-933`)
* **What it does internally:** Accepts either numeric `farmer_id` (`ident.isdigit()`) or string `farmer_unique_id` (case-insensitive query on `farmer_profiles`), then aggregates all 6 tables via `get_farmer_profile(target_id)`.
* **Current Status:** **Already connected** in `dashboard_app.html` via `ApiService.loadFarmerFromBackend()` on `?farmer=` URL parameter (`app.js:45`) and when opening `#edit-profile-modal` (`app.js:1217`).

#### 14. `PUT /api/v1/database/farmers/{identifier}` — Atomic 6-Table Profile Update
* **Handler:** `update_farmer_profile(identifier, FarmerProfileUpdateRequest)` (`database_router.py:755-896`)
* **What it does internally:**
  1. Resolves numeric `farmer_id` or string `farmer_unique_id` via `_resolve_target_farmer_id()`.
  2. Resolves `india_locations.location_id` if provided.
  3. Updates `public.farmer_profiles` (only overwrites `password` if a non-blank password is sent; sets `updated_at = NOW()`).
  4. Runs `_sync_farmer_child_tables(..., is_update=True)`: deletes leaf `farmer_trees`, `farmer_livestock`, `farmer_crops`, updates existing `landholding_id` plots or inserts new plots, removes deleted plots, re-inserts crops/trees/livestock, and reloads the full profile via `get_farmer_profile(farmer_id)`.
* **Current Status:** **Already connected** to `#btn-save-edit-profile` in `dashboard_app.html` (`app.js:1284` → `api.js:250` using `ProfileEditor.buildPayload()`). Also target endpoint for logged-in wizard completion (`completeWizard()`).

#### 15. `POST /api/v1/database/farmers/profile` — Legacy Wizard Stub
* **Handler:** `create_or_update_farmer(FarmerProfileCreate)` (`database_router.py:936-945`)
* **What it does internally:** **Stub only** — validates input and returns `{ success: true, farmer_id: 101, message: "Legacy profile wizard stub..." }` **without touching PostgreSQL**.
* **Integration Action:** Do **not** wire `completeWizard()` here unless replaced with real PostgreSQL persistence; use `PUT /farmers/{identifier}` or `POST /farmers/register` instead.

#### 16. `POST /api/v1/database/raw-vector-query` — Raw 1024-d HNSW Search
* **Handler:** `raw_vector_query(RawVectorQueryRequest)` (`database_router.py:948-984`)
* **What it does internally:** Sets `hnsw.ef_search = 100` and runs cosine distance `embedding <=> %s::halfvec` over `public.chunk_dense_embeddings` joined with `scheme_chunks` and `schemes`. Primarily for direct vector testing (UI should prefer `/api/v1/bge/search/schemes`).

---

### C. Service 2: BGE-M3 Dense Embedding & Semantic Retrieval (`backend/routers/bge_router.py`, prefix `/api/v1/bge`)

#### 17. `GET /api/v1/bge/health`
* **Handler:** `bge_health()` (`bge_router.py:19-28`)
* **What it does internally:** Returns GPU/CPU device, model `BAAI/bge-m3`, vector dimension `1024`.

#### 18. `POST /api/v1/bge/embed`
* **Handler:** `generate_embedding(EmbedRequest)` (`bge_router.py:31-45`)
* **Request:** `{ text: string }`
* **What it does internally:** Lazy-loads `BGEM3FlagModel("BAAI/bge-m3", use_fp16=True)` via `SecretariatToolkit.get_model()` (`tools.py:23-28`), encodes `text`, returns the 1024-float dense embedding (`dim`, `text_sample`, `vector`). (Utility endpoint; not needed directly in UI if `/search/schemes` and `/search/faqs` are used.)

#### 19. `POST /api/v1/bge/search/schemes` — Semantic Scheme Search
* **Handler:** `search_schemes(SchemeSearchRequest)` (`bge_router.py:48-77`) → `SecretariatToolkit.search_schemes()` (`tools.py:115-178`).
* **Request Schema (`bge_schemas.py:15-19`):**
  ```json
  { "query": "drip irrigation subsidy dryland", "state": "Karnataka", "ministry": null, "limit": 10 }
  ```
  *(Note: `limit` valid range is `1..20`; parameter name is `limit`, **not** `top_k`.)*
* **What it does internally:**
  1. Encodes `query` into a 1024-d dense vector on GPU/CPU with BGE-M3.
  2. Sets `hnsw.ef_search = 100` in PostgreSQL.
  3. Searches `chunk_dense_embeddings` (`halfvec` cosine distance `<=>`) joined to `scheme_chunks` and `schemes`, optionally filtering `(state_ut_ministry ILIKE %state% OR level = 'Central Government')` and `state_ut_ministry ILIKE %ministry%`.
  4. Returns top `limit` matching scheme chunks with `scheme_id`, `scheme_name`, `level`, `state_ut_ministry`, `section`, `evidence` (350-char snippet), and `relevance_score = round(1.0 - distance, 4)`.
* **Frontend Purpose:**
  1. Personalized discovery on `dashboard_app.html` load (building a semantic query string from farmer crops, landholdings, state, irrigation, category).
  2. Natural-language semantic search when user types free text into `#scheme-search-input` / clicks `#btn-discover-search`.
  3. Context retrieval inside `ai_chat.html` if displaying fast cited scheme snippets alongside LLM deliberation.

#### 20. `POST /api/v1/bge/search/faqs` — Semantic Administrative FAQ Search
* **Handler:** `search_faqs(FaqSearchRequest)` (`bge_router.py:80-104`) → `SecretariatToolkit.search_faqs()` (`tools.py:70-112`).
* **Request Schema (`bge_schemas.py:38-40`):**
  ```json
  { "issue": "PM-KISAN Aadhaar NPCI DBT seeding bank failure", "limit": 3 }
  ```
  *(Note: `limit` valid range is `1..10`; required body field is `issue`, **not** `query`.)*
* **What it does internally:** Encodes `issue` with BGE-M3 and queries HNSW nearest neighbors strictly where `scheme_chunks.section_type = 'FAQ'`, returning `{scheme, ministry, faq_text, relevance_score}`.
* **Frontend Purpose:**
  1. Troubleshooting / edge-case FAQs inside `#scheme-detail-modal` in `dashboard_app.html`.
  2. Live FAQ search bar inside `#subpage-docs` / `#subpage-tips` (e.g., querying NPCI/e-KYC/FRUITS/RTC blockers).

---

### D. Service 3: Gemma 4 E4B Cognitive & Reasoning Service (`backend/routers/gemma_router.py`, prefix `/api/v1/gemma`)

#### 21. `GET /api/v1/gemma/health`
* **Handler:** `gemma_health()` (`gemma_router.py:27-36`) → calls `GemmaClient().is_healthy()` (`GET http://127.0.0.1:8080/v1/models`).
* **Response:** `{ status: "live" | "unavailable", server_url, healthy }`.
* **Frontend Purpose:** Drives the Gemma AI availability indicator in `ai_chat.html` (`.project-tag`) and `dashboard_app.html` (`#offline-alert-bar` / evaluation buttons).

#### 22. `POST /api/v1/gemma/chat` — Direct Multi-Turn JSON Chat
* **Handler:** `gemma_chat(ChatRequest)` (`gemma_router.py:39-48`)
* **Request:** `{ messages: [{role, content}], temperature: 0.1, max_tokens: 1500 }`.
* **What it does internally:** Forwards `messages` directly to `GemmaClient.chat()` (`gemma_client.py:35-72`), enforcing `response_format: {"type": "json_object"}` on `http://127.0.0.1:8080/v1/chat/completions` and parsing the returned JSON string into `{status: "success", response}`. (Notice `response_format: json_object` requires prompts/system messages instructing JSON output so `json.loads()` succeeds.)
* **Frontend Purpose:** Optional follow-up conversational turns in `ai_chat.html` after an initial Chief Secretary `consult` dossier is loaded.

#### 23. `POST /api/v1/gemma/evaluate` — Wing 1 Statutory 4-State Eligibility Evaluator
* **Handler:** `evaluate_eligibility(EligibilityEvaluateRequest)` (`gemma_router.py:51-85`)
* **Request Schema:** `{ farmer_id: int, scheme_id: int }`
* **What it does internally:**
  1. Calls `get_farmer_profile(req.farmer_id)` (`404` if missing) and converts all 6 tables into structured profile + plain-text `retrieval_text` via `build_farmer_context()` (`backend/profiles/profile_context_builder.py:2-166`).
  2. Calls `SecretariatToolkit.get_scheme_dossier(req.scheme_id)` (`404` if missing) to get all 17 scheme columns.
  3. Calls `EligibilityEvaluator.evaluate_single_scheme()` (`backend/reasoning/eligibility_evaluator.py:18-57`), which builds the Stage 1 + Stage 2 prompt (`backend/reasoning/prompts.py:57-120`) and calls `GemmaClient.generate_json()` (`temperature=0.1, max_tokens=1500`) to evaluate each condition (`PASS`, `FAIL`, `UNKNOWN`, `NOT_APPLICABLE`), producing verdict (`ELIGIBLE`, `INELIGIBLE`, `UNCERTAIN_NEEDS_INFO`), `confidence_score`, `disqualifying_factors`, and `priority_level`.
* **Response JSON:**
  ```json
  {
    "scheme_id": 12,
    "scheme_name": "...",
    "status": "ELIGIBLE | INELIGIBLE | UNCERTAIN_NEEDS_INFO",
    "confidence_score": 0.92,
    "disqualifying_factors": [],
    "priority_tier": "HIGH | MEDIUM | NORMAL | LOW",
    "target_quota": null,
    "fit_score": null
  }
  ```
* **Frontend Purpose:** Powers real AI eligibility classification on `dashboard_app.html` (`ELIGIBLE` → Eligible tab/green badge, `UNCERTAIN_NEEDS_INFO` → Almost Eligible tab/amber badge, `INELIGIBLE` → filtered out or shown with `disqualifying_factors` in detail modal).

#### 24. `POST /api/v1/gemma/consult` — Wing 2 Chief Secretary Autonomous ReAct Agent (Blocking JSON)
* **Handler:** `consult_chief_secretary(ConsultRequest)` (`gemma_router.py:88-112`)
* **Request Schema:** `{ inquiry: string, farmer_id?: int | null, max_turns: 3 (1..5) }`
* **What it does internally:**
  1. Instantiates `ChiefSecretaryAgent(max_turns=req.max_turns)` (`backend/reasoning/chief_secretary_agent.py:66-169`).
  2. Runs a multi-turn loop with `AGENT_SYSTEM_PROMPT` giving Gemma 4 access to 4 server-side tools:
     * `get_farmer_facts(farmer_id)`
     * `search_schemes(keywords, ministry, state, limit)`
     * `search_faqs(issue_keywords, limit)`
     * `get_scheme_dossier(scheme_id)`
  3. Gemma iteratively calls tools (`action: "call_tool"`), receives truncated JSON observations (`[:3000]` chars), performs internal auditing in `executive_deliberation`, and emits `action: "final_directive"`.
* **Response JSON (`ConsultResponse`):**
  ```json
  {
    "status": "completed",
    "deliberation": "...",
    "directive": {
      "has_sufficient_data": true,
      "executive_summary": "...",
      "inter_ministerial_package": [{ "ministry": "...", "scheme_name": "...", "provisions": "..." }],
      "faq_and_procedural_resolutions": ["..."],
      "mandatory_document_checklist": ["..."],
      "administrative_action_plan": ["Step 1: ..."],
      "official_portals": ["https://..."],
      "insufficient_data_notice": ""
    }
  }
  ```
* **Frontend Purpose:** Non-streaming fallback for `ai_chat.html` consultation (or quick simulations).

#### 25. `GET /api/v1/gemma/consult-stream` — Live SSE Chief Secretary Stream
* **Handler:** `consult_stream(inquiry, farmer_id=None)` (`gemma_router.py:115-166`)
* **Query Params:** `?inquiry=<url_encoded>&farmer_id=<int>`
* **What it does internally:** Uses `EventSourceResponse` (`sse_starlette`) to stream **named SSE events** while executing `ChiefSecretaryAgent(max_turns=3)` in a background thread executor (`loop.run_in_executor`):
  1. `event: start` → `{"status": "initiated", "inquiry": "...", "farmer_id": ...}`
  2. `event: thought` → `{"message": "Analyzing inquiry: ... and cross-referencing ministerial records."}`
  3. `event: deliberation` → `{"scratchpad": "..."}` (once agent completes)
  4. `event: final_directive` → `{"directive": { ...ChiefSecretaryAgent directive JSON... }}`
  5. `event: complete` → `{"status": "done"}`
* **Frontend Purpose:** Primary real-time consultation transport for `#sendBtn` / `Enter` and quick-action pills in `ai_chat.html`.

---

## 3. Page-by-Page & Button-by-Button Integration Map

### Page 1: `frontend/index.html` (`frontend/js/krishi-nexus.js`)

| UI Element / Selector / Location | Current State | Target API & Detailed Behavior |
| :--- | :--- | :--- |
| **Page Load Counters (`#proof` section, lines 173–190)** | Hardcoded static `.pnum` text (`2,066`, `20,110`) | Call `GET /api/v1/database/health` on `DOMContentLoaded`. Animate `[data-target="2066"]` with `schemes_count` and `[data-target="20110"]` with `faq_chunks_count`. |
| **Telemetry Badges (`#benchmark` lines 541–569) & Footer Status (line 659 `"All 3 Subsystems Active"`)** | Static badges & text | Call `GET /health` on `DOMContentLoaded`. Reflect real state of `subsystems.postgresql_pgvector.healthy`, `subsystems.bge_m3_embedding_engine.device`, and `subsystems.gemma_4_e4b_reasoning_server.healthy` (show `"2/3 Subsystems Active"` or degraded badge if Gemma `llama-server` on `:8080` is offline). |
| **Offcanvas Login Form `#offcanvasLoginForm` / `#offcanvasLoginBtn` (lines 690–705)** | **Connected** (`krishi-nexus.js:417-466`) | Submits `POST /api/v1/database/farmers/login` `{farmer_unique_id, password}` → saves `krishi_farmer_profile` in `localStorage` → redirects to `dashboard_app.html?view=farmer`. **Fix during wiring:** also save `krishi_farmer_id` (`data.farmer.farmer_id`) and redirect to `dashboard_app.html?farmer=${encodeURIComponent(data.farmer.farmer_unique_id)}` for deterministic session hydration. |
| **Offcanvas Quick-Fill Farmer Cards (`KM26@0001`, `0002`, `0003`, `0007` at lines 716–746)** | Inline `onclick` only sets `#offcanvasFarmerId` (leaves password blank, unlike `quickLoginFarmer()`) | Route card clicks to `quickLoginFarmer(id)` so both `#offcanvasFarmerId` and demo password prefill cleanly (or user enters password and clicks `#offcanvasLoginBtn`). |
| **Register Link (line 707 `href="page-login.html?tab=register"`)** | Client navigation | Keep as-is (`page-login.html` calls `checkUniqueId`, `locations/*`, and `POST /api/v1/database/farmers/register`). |
| **AI Chat CTAs (Navbar lines 42 & 53, Mobile lines 89 & 96, Hero line 136, Architecture line 310, CTA line 596, Footer line 633, Floating FAB line 760)** | Plain `<a href="ai_chat.html">` | Keep navigation; if farmer already logged in (`localStorage.krishi_farmer_profile`), `ai_chat.html` reads `farmer_id` automatically on load. |
| **Orphaned Handlers in `krishi-nexus.js` (`SAMPLE_FARMERS`, `SAMPLE_DIRECTIVES`, `.sim-chip`, `.farmer-chip-card`, lines 12–408, 591–610)** | Dead code (HTML cards were removed from `index.html`) | Clean up dead handlers or re-expose interactive demo cards wired to `POST /api/v1/gemma/consult`. |

---

### Page 2: `frontend/dashboard_app.html` (`app.js`, `api.js`, `profileEditor.js`)

#### Already Connected Controls
* **Sign In Button `#btn-send-otp` & `Enter` key in `#login-phone` / `#login-password`** (`app.js:256, 1478-1507`) → `ApiService.loginWithCredentials()` (`api.js:140`) → `POST /api/v1/database/farmers/login` (falls back to offline demo mock for `KM26@*` only on network `TypeError`).
* **Direct URL `?farmer=<id>` on Load** (`app.js:42-49`) → `ApiService.loadFarmerFromBackend()` (`api.js:219`) → `GET /api/v1/database/farmers/{identifier}`.
* **Register Link `#btn-login-signup`** (`app.js:1490-1495`) → navigates to `page-login.html?tab=register`.
* **Edit Profile Drawer Button `#btn-edit-profile-menu`** (`app.js:1205-1226, 1575`) → refreshes `GET /api/v1/database/farmers/{identifier}` and mounts `ProfileEditor`.
* **LGD Location Dropdowns (`#epLgdState`, `#epLgdDistrict`, `#epLgdSubDistrict`, `#epLgdVillage`)** (`profileEditor.js:531-534, 547-740`) → `GET /api/v1/database/locations/{states,districts,sub-districts,villages}`.
* **Save Edit Profile `#btn-save-edit-profile`** (`app.js:1261-1316`) → `ApiService.updateFarmerProfile()` (`api.js:249`) → `PUT /api/v1/database/farmers/{identifier}` updating all 6 tables atomically, then refreshes UI.

#### Controls Currently Mock / Unwired → Target API Plan

| UI Element / Selector / Location | Current State | Target API & Step-by-Step Behavior |
| :--- | :--- | :--- |
| **Alert Bar `#offline-alert-bar` (`dashboard_app.html:33`, `app.js:1599-1606`)** | Listens only to browser `window.online` / `offline` | On `init()`, call `GET /health`. If backend is unreachable or `postgresql_pgvector.healthy === false`, reveal `#offline-alert-bar`. Track `gemma_4_e4b_reasoning_server.healthy` flag so UI gracefully degrades when GPU LLM is off. |
| **Login Demo Chips `.demo-id-chip` (`dashboard_app.html:168-170`)** | Prefills `#login-phone` and `#login-password` | Keep prefill; auto-call `handleSendOtp()` (`POST /api/v1/database/farmers/login`) or let user click `#btn-send-otp`. |
| **Legacy OTP Controls `#btn-verify-otp`, `#demo-otp-btn`, `#btn-change-number` (`dashboard_app.html:185-215`)** | Mock OTP `1234` in `ApiService.login()` (`api.js:27-46`) | Deprecate/hide OTP fallback (not backed by SMS/PostgreSQL), or only allow if backend adds a phone OTP endpoint later. |
| **Voice / Step Wizard `#wizard-next-btn` (`completeWizard()`, `app.js:679-684`)** | Calls `ApiService.saveProfile()` (`localStorage` only; `/farmers/profile` backend is a stub) | Map wizard answers (`district`, `land_size`, `land_ownership`, `crop`, `irrigation`, `category`, `age`, `gender`) to `FarmerProfileUpdateRequest` (`land_size` in acres × `0.404686` → `HECTARE`, uppercase enums):<br>- **If logged in (`session.farmer_unique_id`):** call `PUT /api/v1/database/farmers/{identifier}`.<br>- **If guest/new user:** prompt for `farmer_unique_id` + `password` (`GET /farmers/check-id/{id}`) and call `POST /api/v1/database/farmers/register`, then sign in. |
| **Dashboard Initialization `refreshData()` (`app.js:177-186` → `ApiService.getSchemes()`)** | Evaluates 6 hardcoded `MOCK_DATA.schemes` (`api.js:413-610`) | **Two-Stage Hybrid Pipeline (never evaluate all 2,066 schemes synchronously):**<br>1. **Stage 1 — Candidate Retrieval (fast, <1s):** If `this.profile` exists, compose a semantic query from farmer attributes (state, district, crops, landholdings, irrigation, category, livestock) and call `POST /api/v1/bge/search/schemes` (`{query, state: farmer.state, limit: 20}`), merged/supplemented with paginated `GET /api/v1/database/schemes?state=<farmer.state>&limit=20&offset=0`.<br>2. **Stage 2 — Wing 1 Statutory Scoring:** For the top candidate schemes (e.g., top 5–10 or visible viewport cards, queued sequentially so GPU does not OOM), call `POST /api/v1/gemma/evaluate` (`{farmer_id: profile.farmer_id, scheme_id}`).<br>   • `status === "ELIGIBLE"` → `eligible = true` (`#top-nav-eligible`, `.scheme-tab-btn[data-tab="eligible"]`)<br>   • `status === "UNCERTAIN_NEEDS_INFO"` → `almost = true` (`#top-nav-almost`, `.scheme-tab-btn[data-tab="almost"]`)<br>   • `status === "INELIGIBLE"` → hidden from Eligible/Almost (or inspectable with `disqualifying_factors`). |
| **Search Box `#scheme-search-input`, `#btn-discover-search`, `#scheme-category-select`, `#schemes-sort-select`, `.filter-chip` (`dashboard_app.html:366-433`, `app.js:1450-1555`)** | Filters local `MOCK_DATA` array in memory | - **Keyword Browse (fast SQL):** Call `GET /api/v1/database/schemes?search=<q>&state=<farmer.state>&limit=20&offset=0`.<br>- **Semantic AI Search (`#btn-discover-search` click / `Enter`):** Call `POST /api/v1/bge/search/schemes` (`{query, state: farmer.state, limit: 20}`) to search all 32,410 embeddings semantically (handles farmer intents like `"borewell subsidy"`, `"tractor loan"`).<br>- **Category Select & Filter Chips (`income`, `insurance`, `credit`, `irrigation`, `pension`):** Currently no `scheme_type` column in `GET /schemes`; map each chip either to BGE semantic query/keywords or `tags`/`ministry` filter until backend adds a category column. |
| **Hero Primary Button `#btn-hero-explore` (`dashboard_app.html:328`)** | Scrolls to `#schemes-main-anchor` and selects Eligible tab | Keep scroll + ensure Stage 1/Stage 2 eligible schemes are loaded & rendered. |
| **Hero Secondary Button `#btn-hero-share` (`dashboard_app.html:331`, `app.js:1444`)** | Opens WhatsApp (`wa.me`) share | Keep WhatsApp summary (populated from real evaluated eligible schemes), plus optionally add an "Ask AI Chief Secretary" shortcut linking to `ai_chat.html?farmer_id=<farmer_id>`. |
| **Scheme Card Click → `#scheme-detail-modal` (`openSchemeDetailModal()` in `app.js:956-1043`)** | Renders static `MOCK_DATA` fields | 1. **Immediately on click:** Call `GET /api/v1/database/schemes/{scheme_id}` → render official `benefits`, `eligibility_criteria`, `exclusions_ineligibility`, `documents_required`, `application_process` (`#modal-steps-list`), and portal URLs (`official_link` / `myscheme_url`).<br>2. **Lazy AI Verdict:** If this scheme was only retrieved by BGE/SQL and not yet Gemma-scored, trigger `POST /api/v1/gemma/evaluate` (`{farmer_id, scheme_id}`) and update `#modal-scheme-status-tag`, `confidence_score`, `disqualifying_factors`, `priority_tier`, `target_quota`, `fit_score`.<br>3. **Troubleshooting Precedents (optional tab/panel):** Call `POST /api/v1/bge/search/faqs` (`{issue: scheme.scheme_name, limit: 3}`). |
| **Modal Official Site `#modal-btn-go-site` (`dashboard_app.html:588`)** | Opens static `scheme.apply_link` | Open `dossier.official_link || dossier.myscheme_url` fetched from `GET /api/v1/database/schemes/{scheme_id}`. |
| **Card Star `.star-btn`, `#modal-btn-mark-applied`, `#modal-doc-checklist` checkboxes** | `localStorage` only (`km_saved_schemes`, `km_applied_schemes`, `km_doc_checklist`) | Keep `localStorage` short-term; **Backend Gap:** add PostgreSQL tables + endpoints (`POST /farmers/{id}/saved-schemes`, `applied-schemes`, `checklist`) if cross-device persistence is required. |
| **Bottom Nav Tabs `#subpage-docs` & `#subpage-tips` (`app.js:1055-1115`)** | Static `MOCK_DATA.documentsGuide` & `MOCK_DATA.tipsAndReminders` | Keep local bilingual guides for instant offline use; optionally add a live FAQ troubleshooting search bar wired to `POST /api/v1/bge/search/faqs` (`{issue, limit: 5}`) and a deep-link button `"Ask AI Chief Secretary"` → `ai_chat.html`. |
| **Profile Drawer `#btn-logout-menu` & `#btn-delete-data-menu` (`app.js:1323-1343`)** | Clears `localStorage` keys only | `#btn-logout-menu` stays client-side session clear. **Backend Gap:** `#btn-delete-data-menu` only clears browser `localStorage`; if it should erase database rows, add `DELETE /api/v1/database/farmers/{identifier}`. |

---

### Page 3: `frontend/ai_chat.html` (Inline `<script>`)

| UI Element / Event | Current State | Target API & Detailed Behavior |
| :--- | :--- | :--- |
| **Page Load & `.project-tag` Telemetry ([ai_chat.html:371-374](file:///d:/krisi%20mitra/frontend/ai_chat.html#L371-L374))** | Static green dot + `"SOVEREIGN AGRI-OS // LOCAL CUDA:0 ENGINE"` | 1. Call `GET /health` and `GET /api/v1/gemma/health` to verify PostgreSQL, BGE-M3 (`cuda:0` vs `cpu`), and `llama-server` on port `8080`. Show live indicator if Gemma is offline.<br>2. Read `localStorage.getItem("krishi_farmer_profile")` to extract numeric `farmer.farmer_id` (`int`) and `farmer_unique_id` for display in header/context chip.<br>3. Check `URLSearchParams(window.location.search)` for `?q=` (pre-fill and auto-consult when navigated from dashboard/index). |
| **Consult Button `#sendBtn` & `Enter` Key in `#queryInput` ([ai_chat.html:487-547](file:///d:/krisi%20mitra/frontend/ai_chat.html#L487-L547))** | Simulated 600ms `setTimeout` stub | **Primary Connection (`EventSource` SSE):**<br>`GET /api/v1/gemma/consult-stream?inquiry=<encoded>&farmer_id=<int_if_logged_in>`<br>Attach **named** listeners (`addEventListener`, **not** `onmessage`):<br>1. `start` → create bot message card in `#chatThread` showing `"Consultation Initiated"`.<br>2. `thought` → update live status line (`JSON.parse(e.data).message`).<br>3. `deliberation` → populate collapsible Executive Audit Scratchpad (`JSON.parse(e.data).scratchpad`).<br>4. `final_directive` → parse `JSON.parse(e.data).directive` and render structured cards for: `executive_summary`, `inter_ministerial_package` (`ministry`, `scheme_name`, `provisions`), `faq_and_procedural_resolutions`, `mandatory_document_checklist`, `administrative_action_plan`, clickable `official_portals`, and `insufficient_data_notice` (when `has_sufficient_data === false`).<br>5. `complete` → close `EventSource` cleanly and re-enable `#sendBtn`.<br><br>**Fallback Connection:** If SSE fails (`onerror` before `complete`), fall back to `POST /api/v1/gemma/consult` (`{inquiry, farmer_id, max_turns: 3}`).<br>**Optional Follow-up / Fast Citation:** Use `POST /api/v1/bge/search/faqs` (`{issue, limit: 3}`) and `POST /api/v1/bge/search/schemes` (`{query, limit: 5}`) for immediate sub-second context cards while Gemma is deliberating, or `POST /api/v1/gemma/chat` for multi-turn clarification. |
| **8 Quick Action Pills `.quick-btn` ([ai_chat.html:417-457](file:///d:/krisi%20mitra/frontend/ai_chat.html#L417-L457))** | Calls `applyQuickAction(text)` to fill `#queryInput` | Keep `applyQuickAction(text)` (optionally call `sendMessage()` immediately or focus `#queryInput`), routing each preset prompt into `GET /api/v1/gemma/consult-stream` with the logged-in `farmer_id`. |

---

## 4. Known Contract Bugs & Backend Gaps to Resolve First

1. **Buggy Helper Methods in `frontend/assets/js/api.js` (if reused anywhere):**
   * `searchSchemesBGE` (`assets/js/api.js:167-175`) sends `{query, top_k}` instead of `{query, state, ministry, limit}` (`bge_schemas.py:15-19`).
   * `searchFaqsBGE` (`assets/js/api.js:177-185`) sends `{query, top_k}` instead of `{issue, limit}` (`bge_schemas.py:38-40`) — triggers HTTP **422** on FastAPI validation.
   * `streamChiefSecretary` (`assets/js/api.js:218-243`) uses `eventSource.onmessage` and checks `data.type === 'complete'`, which **never fires** for `sse_starlette` named events (`start`, `thought`, `deliberation`, `final_directive`, `complete`) emitted by `gemma_router.py:125-164`.
2. **Farmer ID Type Handoff (`int` vs `string`):**
   * `POST /api/v1/gemma/evaluate` and `POST /api/v1/gemma/consult` / `consult-stream` require numeric integer `farmer_id` (`gemma_schemas.py:22, 39`), whereas `js/api.js` stores `farmer_unique_id` (string) in `km_user_session` and only stores numeric `farmer_id` inside `profile.farmer_id` (`api.js:101`). Session state should consistently carry both `farmer_id` (`int`) and `farmer_unique_id` (`str`), and `krishi-nexus.js:455` should write `krishi_farmer_id` on offcanvas login.
3. **Catalog Metadata Gaps in `GET /api/v1/database/schemes`:**
   * Current PostgreSQL `schemes` response has no structured `category` / `scheme_type` enum, numeric `benefit_amount`, or Kannada fields (`kn`), and always sorts `ORDER BY id` (capped at `limit <= 100`). UI filters (`income`, `insurance`, `credit`, `irrigation`, `pension`) and sorting (`benefit_desc`, `benefit_asc`, `name`) will need either backend SQL support or client-side keyword/tag inference.
4. **LLM Latency Constraint for Mass Evaluation:**
   * `POST /api/v1/gemma/evaluate` runs one `GemmaClient.generate_json()` inference per `(farmer_id, scheme_id)` pair (`eligibility_evaluator.py:18-45`). Evaluating 2,066 schemes in parallel would saturate `llama-server`. Always filter down first via `POST /api/v1/bge/search/schemes` (Stage 1) and run `POST /api/v1/gemma/evaluate` (Stage 2) sequentially in small batches (top 5–10) or lazily on scheme card open.
5. **User Tracking Persistence Gaps:**
   * Saved bookmarks, "Marked Applied" flags, per-scheme document checkboxes, and "Delete My Data" (`#btn-delete-data-menu`) currently mutate browser `localStorage` only; PostgreSQL persistence requires new backend endpoints.

---

## 5. Recommended Implementation Sequence

1. **Phase 1 — Unified API Client (`frontend/js/api.js` & `frontend/assets/js/api.js`):** Fix the `bge` (`limit`, `issue`) and SSE named-event (`addEventListener`) contract bugs; add `/health`, `/schemes`, `/schemes/{id}`, `/bge/search/*`, `/gemma/evaluate`, and `/gemma/consult-stream` wrappers; keep integer `farmer_id` in session storage.
2. **Phase 2 — Live Consultation (`frontend/ai_chat.html`):** Wire `/health` + `/api/v1/gemma/health`, `farmer_id` context from `localStorage`, and `EventSource` SSE streaming from `/api/v1/gemma/consult-stream` with structured directive rendering.
3. **Phase 3 — Landing Page (`frontend/index.html`, `frontend/js/krishi-nexus.js`):** Replace static `2,066` / `20,110` / `"All 3 Subsystems Active"` with `/health` + `/api/v1/database/health`, fix demo card `quickLoginFarmer()` password fill, unify redirect URL (`?farmer=`), and prune dead DOM handlers.
4. **Phase 4 — Farmer Dashboard (`frontend/dashboard_app.html`, `frontend/js/app.js`):** Wire `/health` banner, two-stage BGE-M3 + `GET /schemes` discovery, sequential/lazy `/gemma/evaluate` badges, `/schemes/{id}` dossier modal + `/bge/search/faqs`, and route `completeWizard()` to `PUT /farmers/{identifier}` or `POST /farmers/register`.
