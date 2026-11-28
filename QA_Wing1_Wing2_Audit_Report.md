# Krishi Mitra — Full-Stack Verification, Bug-Fix & Audit Report (Wing 1 & Wing 2)

**Audit Date:** 2026-11-28  
**Environment Verified Live:**
- FastAPI Gateway: `http://127.0.0.1:8000` (`/health` healthy)
- PostgreSQL + pgvector (`0.8.7`): `2,066` indexed schemes, `20,110` FAQ chunks, `101` registered farmer profiles (`KM26@0001`..`KM26@0100` + `KM26@1980`)
- Embedding Engine (`BAAI/bge-m3`): `cuda:0` (`NVIDIA GeForce RTX 5060 Laptop GPU`, `fp16`, 1024-dim)
- LLM Reasoning Engine (`llama-server` Gemma 4 E4B `Q4_0`): `http://127.0.0.1:8080` (`healthy: true`)

---

## 1. Executive Summary (Before Fixes vs. Final Post-Fix State)

| Audit Track | Baseline Result | Post-Fix Final Result | Notes / Status |
|---|---|---|---|
| **Master API Suite** (`tests/test_api_master_suite.py`) | `19 / 19` (`42.03s`) | **`19 / 19` (`32.79s` suite, `43.63s` wrapper)** | Ran after final edit |
| **Part 1 — All 101 Farmer Logins + Child Hydration + Stage 1** | `101 / 101` (`0` state leaks, `18.04` avg BGE schemes) | **`101 / 101` (`0` state leaks, `31.15` avg BGE schemes)** | Wrong password -> `401`; avg login `0.151s`, avg Stage 1 `0.424s`; ran after final edit |
| **Part 1b — Frontend Stage 1 Card Ranking (`10` Farmers)** | `#235` SC Term Loan hijacked Top-3 for OBC/ST farmers; `KM26@0031` had `0` Eligible Top-3 cards | **`10 / 10` (`30–33` distinct schemes, `0` conflicting SC/ST Top-3 hijackers)** | Verified after final edit (`8.69s`) |
| **Part 2 — Deep Wing 1 Statutory Audit (`10` Farmers, Modal + Cards)** | `111 / 111` HTTP `200`, `51 / 57` deterministic checks passed (`6` failed + verdict/disqualifier contradictions) | **`112 / 112` HTTP `200` (`13.37s` avg), `59 / 59` deterministic checks passed (`0` failed), `0` empty Top-3 Eligible farmers** | Verified after `prompts.py`, `eligibility_evaluator.py`, `api.js`, `app.js` edits (`1,512.68s`); Wing 1 evaluator untouched afterwards |
| **Modal 17-Column Dossiers & BGE FAQs** | `22 / 22` HTTP `200` | **`20 / 20` (`>=17` cols + FAQ BGE `20/20`)** | Verified after final edit |
| **Part 3 — Deep Wing 2 Chief Secretary (`28` Q&A + SSE Battery)** | `17 / 28` passed (`11` failed, avg `18.74s`, including empty `W2-26` directive & skipped `W2-01` profile) | **`26 / 28` passed (`28 / 28` HTTP `200`, avg `16.78s`, `0` JSON crashes, `4/4` SSE + multilingual)** | Ran after final edit (`470.06s`); remaining `2` nuances documented transparently in §5 |
| **Frontend Static, Profile Modules, & DOM UI Checks** | Pass (`py_compile`, `node --check`, UI DOM) | **All Exit `0` (`5/5` UI DOM + inline JS + `3/3` `backend/profiles` checks)** | Ran after final edit (`frontend_ui_audit` `17.23s`; `index.html` & `ai_chat.html` VM checks passed too) |
| **PostgreSQL Integrity & Cleanliness** | Clean baseline | **`101` farmers, `2,066` schemes, `20,110` FAQ chunks, `0` NULL passwords (`clean: true`)** | Zero test mutations left behind |

---

## 2. Root-Cause Bugs Discovered & Fixes Implemented

### Bug 1 — Wing 1 Verdict vs. Disqualifier & Statutory Mismatch (`backend/reasoning/prompts.py`, `backend/reasoning/eligibility_evaluator.py`)
- **Findings in Baseline (`111` evaluations):**
  - `KM26@0031` on `#235` (*Credit Based Schemes For SC - Term Loan*) returned `ELIGIBLE` while listing `"Annual family income exceeds Rs. 3.00 Lakh limit specified in official FAQ"` inside `disqualifying_factors`.
  - `KM26@0007` (ST), `KM26@0010` (ST), `KM26@0028` (ST) on `#235` (SC-only), and `KM26@0031` (SC) on `#1844` (ST-only) returned `UNCERTAIN_NEEDS_INFO` instead of `INELIGIBLE` even after listing category/income disqualifiers.
  - `KM26@0001` (`farmer_category = Medium`, `6.37 ha`, `kcc_holder = False`) received `ELIGIBLE` on `#1120` (*Mukhya Mantri Krishi Sa Sajuli Yozana - Assam*), which explicitly restricts eligibility to `"Only small and marginal farmers"`.
  - `KM26@0028` (`LEASED`-only land, `0` owned plots) received `UNCERTAIN_NEEDS_INFO` on `#1421` (*PM-KISAN*), whereas farmers holding `OWNED + LEASED/TENANT` (`KM26@0003`, `KM26@0005`, `KM26@0010`) were downgraded from `ELIGIBLE` to `UNCERTAIN_NEEDS_INFO` because of their secondary leased plot.
- **Root-Cause Fixes:**
  - Updated `build_eligibility_prompt` in `backend/reasoning/prompts.py` with an explicit 4-state verdict matrix, hard statutory `FAIL -> INELIGIBLE` enforcement, multi-plot ownership rules (qualify on `OWNED` plots when `OWNED + LEASED`, fail only when `0` owned/shared plots exist), and a rule keeping `disqualifying_factors` empty on `ELIGIBLE` verdicts.
  - Added `EligibilityEvaluator._reconcile_verdict` in `backend/reasoning/eligibility_evaluator.py` enforcing State/UT domicile checks, SC/ST scheme title checks, `"only small and marginal farmers"` checks against `Medium`/`Large`/`Semi-medium`, PM-KISAN `LEASED`-only checks, `Udyogini` gender checks, and reconciling any `FAIL` condition or hard-fail disqualifier regex cleanly to `INELIGIBLE`.

### Bug 2 — Stage 1 Chunk Flooding & Non-SC Ranking Interference (`backend/reasoning/tools.py`, `frontend/js/api.js`, `frontend/js/app.js`)
- **Findings in Baseline (`101` + `10` farmers):**
  - `SecretariatToolkit.search_schemes` returned un-deduplicated chunks (`LIMIT %s` over `scheme_chunks`), causing single schemes with multiple high-similarity chunks to occupy 3–4 slots and dropping distinct flagship schemes (`avg 18.04` distinct schemes; `PMFBY #1439` missed for 3 stratified farmers).
  - Injecting bare `profile.social_category` tokens (`OBC`, `ST`) into `buildFarmerSearchQuery` pulled `#235 Credit Based Schemes For SC` into Top-3 for almost all OBC/ST farmers, causing `runGemmaEvaluationQueue(3)` to spend its initial budget auditing ineligible SC loans (`KM26@0031` ended up with `0` Eligible cards in Top-3).
- **Root-Cause Fixes:**
  - Rewrote `SecretariatToolkit.search_schemes` (`backend/reasoning/tools.py`) to oversample (`max(limit * 5, 30)` at `hnsw.ef_search = 250`) and deduplicate strictly by `scheme_id`, pushing distinct BGE yield from `14–24` (avg `18.04`) to **`30–35` (avg `31.15`)** distinct schemes per farmer.
  - Removed bare caste tokens from `ApiService.buildFarmerSearchQuery`, prioritized flagship agrarian retrieval alongside personalized context, and demoted conflicting SC/ST exclusive titles below matched agrarian schemes in `ApiService.getSchemes` (`frontend/js/api.js`).
  - Updated `_updateEngineStatusBar` in `frontend/js/app.js` to display both `Eligible` and `Ineligible` audited counts on the dashboard status bar.

### Bug 3 — Wing 2 ReAct Retrieval Misses, Profile Skipping & JSON Crashes (`backend/reasoning/tools.py`, `backend/reasoning/chief_secretary_agent.py`)
- **Findings in Baseline (`28` queries -> `11` initial failures):**
  - **Profile Skipping (`W2-01`):** Passing only `FARMER ID: 1` without hydrated facts allowed Gemma to emit a Turn 1 `final_directive` hallucinating `"I have reviewed your profile..."` with `0` factual farmer fields (`Assam`, `6.37 ha`, `SHARED`, `Mango`, `Cow/Pig`, `KCC=False`).
  - **Brittle `ministry` Filtering & HNSW Global Eviction (`W2-03`, `W2-04`, `W2-07`, `W2-09`, `W2-10`, `W2-14`, `W2-27`):** When Gemma guessed composite ministry names (`'Agriculture/Finance'`, `'Agriculture | Finance | Rural Development'`, `'Minority Welfare'`) on State schemes stored under `state_ut_ministry = 'Karnataka'`/`'Gujarat'`, SQL `AND s.state_ut_ministry ILIKE` returned `0` rows `[]`, causing the Chief Secretary to falsely state existing database schemes (`Ganga Kalyana #668`, `Udyogini #1983`, `Gujarat Milch Farm #1842/1843`, `PM-KISAN #1421`, `KCC #919`, `PM-KUSUM #1422`) had "no verified notification".
  - **Premature Loop Exit & Truncation (`W2-07` `2.35s`, `W2-26` `{}` empty directive, `W2-16` HTTP `500`):** Omitted `"action"` fields hit the old `else:` branch and broke out on Turn 1 returning raw `"thought"`, truncated JSON exceeded `max_tokens=2000` raising HTTP `500`, and truncated tool observations dropped eligibility ceilings.
- **Root-Cause Fixes:**
  - Added hybrid exact title/slug/acronym lookup (`_SYNONYM_TITLE_PATTERNS` + `_lexical_scheme_candidates`) alongside `hnsw.ef_search = 250` and resilient tokenized `ministry` filtering (preserving matching State/UT schemes and auto-falling back to `state`-only on zero rows) in `SecretariatToolkit.search_schemes`, plus scheme-aware FAQ prioritization in `SecretariatToolkit.search_faqs`.
  - Pre-hydrated `SecretariatToolkit.get_farmer_facts(farmer_id)` directly into Turn 1 in `ChiefSecretaryAgent.consult`, raised observation slice from `3000` to `5500` chars, added Case B tool-inference fallback + Case D nudge (instead of aborting on Turn 1), normalized Option B wrappers (`_normalize_final_result`), and added `_chat_json_resilient` (`max_tokens=2600/2800` with single-shot JSON recovery).

---

## 3. Part 1 — All 101 Farmer Logins, Hydration & Stage 1 Audit

Executed via `.venv\Scripts\python.exe` against live `http://127.0.0.1:8000` after final edits (`part1_login_stage1_audit.py`, `58.67s`):
- **Registered Profiles Tested:** `101 / 101` (`KM26@0001`..`KM26@0100` + `KM26@1980`).
- **Negative Auth Boundary:** Wrong password (`INVALID_PASSWORD_999`) returned HTTP **`401`**.
- **Valid Logins + Exact SQL Child Hydration Match (`farmer_landholdings`, `farmer_crops`, `farmer_trees`, `farmer_livestock`):** **`101 / 101` Passed (`100.0%`)**, avg login latency **`0.151s`**.
- **Stage 1 Retrieval (`POST /api/v1/bge/search/schemes` personalized + flagship + `GET /api/v1/database/schemes`):** **`101 / 101` HTTP `200`**, avg latency **`0.4238s`**.
- **State Isolation Leaks:** **`0 / 101`** (no out-of-state State/UT schemes returned for Assam, Goa, Gujarat, Karnataka, or Meghalaya accounts).
- **Distinct Scheme Yield per Farmer:** min `30`, avg `31.15`, max `35` distinct schemes.
- **Target State Scheme Distribution in `public.schemes`:** `Gujarat: 118`, `Goa: 116`, `Meghalaya: 63`, `Assam: 49`, `Karnataka: 22` (`527` Central Government + `1,539` State/UT Government = `2,066` total).

---

## 4. Part 2 — Deep Wing 1 Statutory Eligibility & Modal Audit (`10` Stratified Farmers)

Verified across `112` Wing 1 evaluations (`POST /api/v1/gemma/evaluate`, `0` errors, avg **`13.37s`**) covering all Top-5 Stage 1 cards plus trap schemes (`1421` PM-KISAN, `919` KCC, `1439` PMFBY, `668` Ganga Kalyana, `1814` Meghalaya Rice Mission, `911` KAPY, `1983` Udyogini), plus post-final-edit modal verification on all **`20` unique schemes** (`20/20` `GET /database/schemes/{id}` 17-col dossiers + `20/20` `POST /bge/search/faqs`).
- **Deterministic Statutory Assertions:** **`59 / 59` Passed (`100.0%`)**, **`0` Failed**.
- **Farmers With Empty Top-3 Eligible Cards:** **`0 / 10` (`top3_zero_eligible_farmers: []`)**.

| Farmer ID | Name & Edge Profile | Ownership / Assets | Top-3 Dashboard Tab Outcomes | Total Audited (`Elig` / `Almost` / `Inelig`) | Key Verified Trap Outcomes |
|---|---|---|---|---|---|
| `KM26@0001` (`#1`) | Suresh Hegde • Assam • Male • SC • Medium (`6.37 ha`, ₹5.99L, `KCC=False`) | `SHARED`-only • Rice/Mustard • Mango (37) • Cow (5), Pig (6) | `eligible`, `almost`, `ineligible_hidden` | `11` (`3` / `2` / `6`) | `#1120` MMKSSY Assam (`Medium`/`No KCC`) -> `INELIGIBLE`; `#668`, `#1814`, `#911`, `#1983` -> `INELIGIBLE`; `#919`, `#1421` -> `ELIGIBLE` |
| `KM26@0002` (`#2`) | Vijay Gowda • Karnataka • Male • OBC • Small (`1.17 ha`, ₹5.54L, `KCC=True`) | `OWNED, SHARED` • Arecanut/Cotton | `almost`, `eligible`, `ineligible_hidden` | `11` (`5` / `2` / `4`) | `#668` Ganga Kalyana (OBC/₹5.54L) -> `INELIGIBLE`; `#235` SC Term Loan -> `INELIGIBLE`; `#911` KAPY (`disq=[]`) -> `ELIGIBLE` |
| `KM26@0003` (`#3`) | Ravi Borah • Karnataka • Male • SC • Marginal (`0.54 ha`, ₹2.78L, `KCC=False`) | `LEASED, OWNED` • Rice/Ragi/Coffee • Tamarind/Jackfruit • Buffalo | `eligible`, `eligible`, `eligible` | `10` (`7` / `0` / `3`) | `#1421` PM-KISAN (`OWNED` plot qualifies) -> `ELIGIBLE`; `#235` SC Loan -> `ELIGIBLE`; `#668` (Age 62 > 55) -> `INELIGIBLE` |
| `KM26@0005` (`#5`) | Pooja Sharma • Karnataka • Female • OBC • Semi-medium (`3.25 ha`, ₹2.84L) | `OWNED, TENANT` • Maize/Arecanut/Cane • Teak • Goat/Sheep | `eligible`, `eligible`, `ineligible_hidden` | `11` (`7` / `0` / `4`) | `#1421` PM-KISAN (`OWNED` plot qualifies despite `TENANT` plot) -> `ELIGIBLE`; `#1983` Udyogini (₹2.84L > ₹1.5L) -> `INELIGIBLE` |
| `KM26@0007` (`#7`) | Manjunath Joshi • Meghalaya • **DB `Female`** • ST • Semi-medium (`3.18 ha`, ₹4.51L) | `OWNED` • Turmeric/Maize/Potato • Orange • Goat | `almost`, `eligible`, `eligible` | `12` (`7` / `1` / `4`) | `#1814` Meghalaya Rice Mission -> `ELIGIBLE`; `#235` SC Loan (`ST`, ₹4.51L) -> `INELIGIBLE`; `#911`, `#668` -> `INELIGIBLE` |
| `KM26@0010` (`#10`) | Lakshmi Sharma • Karnataka • **DB `Male`** • ST • Medium (`4.14 ha`, ₹91.5k) | `OWNED, TENANT` • Arecanut • Mango • Sheep/Buffalo | `eligible`, `almost`, `eligible` | `11` (`6` / `1` / `4`) | `#1983` Udyogini (`DB Male` honored) -> `INELIGIBLE`; `#235` SC Loan -> `INELIGIBLE`; `#1421` -> `ELIGIBLE` |
| `KM26@0016` (`#16`) | Kiran Hegde • Goa • Male • OBC • Marginal (`0.57 ha`, ₹4.60L, `KCC=True`) | `LEASED, OWNED` • Vegetables/Coconut/Cashew/Ragi | `almost`, `eligible`, `ineligible_hidden` | `12` (`6` / `1` / `5`) | `#1092` NHM, `#919` KCC, `#1421` PM-KISAN -> `ELIGIBLE`; `#668`, `#911`, `#1814`, `#1983`, `#235` -> `INELIGIBLE` |
| `KM26@0028` (`#28`) | Deepak Kulkarni • Karnataka • Male • ST • Large (`10.9 ha`, ₹5.92L, `KCC=False`) | **`LEASED`-only** • Arecanut/Coconut/Rice/Tur • Tamarind • Goat/Sheep | `eligible`, `almost`, `eligible` | `11` (`2` / `2` / `7`) | `#1421` PM-KISAN (`LEASED`-only) -> `INELIGIBLE`; `#919` KCC (covers lessees) -> `ELIGIBLE`; `#668`, `#235`, `#1983` -> `INELIGIBLE` |
| `KM26@0031` (`#31`) | Bharat Hegde • Gujarat • **DB `Female`** • SC • Small (`1.19 ha`, ₹5.59L, `KCC=True`) | `LEASED, OWNED` • Cumin • Cow (6), Poultry (2) | `eligible`, `eligible`, `eligible` | `12` (`6` / `0` / `6`) | `#1842`, `#1843` Gujarat Milch (`SC`) -> `ELIGIBLE`; `#1844` ST Milch -> `INELIGIBLE`; `#235` (₹5.59L > ₹3L) -> `INELIGIBLE` |
| `KM26@1980` (`#104`) | Rajkumar • Mandya, Karnataka • Male • OBC • Marginal (`1.0 ha`, ₹1.00L, `KCC=False`) | `OWNED` • Paddy | `eligible`, `eligible`, `eligible` | `11` (`7` / `0` / `4`) | `#919`, `#1421`, `#1439`, `#1447`, `#1422`, `#911` -> `ELIGIBLE`; `#668` (₹1.00L > ₹96k), `#1814`, `#1983` -> `INELIGIBLE` |

---

## 5. Part 3 — Deep Wing 2 Chief Secretary Q&A & SSE Battery (`28` Cases Post-Final-Edit)

Executed against live `/api/v1/gemma/consult` & `/api/v1/gemma/consult-stream` after final backend edits (`470.06s`, **`28 / 28` HTTP `200`**, **`0` JSON errors**, avg latency **`16.78s`**, **`0` suspicious/unverified portal domains**, **`26 / 28` programmatic passes**):

| Category | Cases | Passed | Details & Remaining Nuances |
|---|---|---|---|
| **(a) DB Fact Grounding** | `W2-01`..`W2-05` | **`5 / 5`** | `W2-01` (`7.23s` Assam/Shared/6.37ha/Mango/Cow/Pig/No KCC), `W2-02` (Meghalaya Female/ST/Turmeric/Orange), `W2-03` (Karnataka DB Male vs Udyogini refusal), `W2-04` (`KM26@0028` Leased-only PM-KISAN denial + KCC recommendation), `W2-05` (Mandya Marginal Paddy convergence) |
| **(b) Boundary & Ceiling Refusals** | `W2-06`..`W2-10` | **`5 / 5`** | `W2-06` (Assam vs Meghalaya Rice Mission), `W2-07` (`Ganga Kalyana` + SC Credit denial for OBC ₹5.54L), `W2-08` (Goa vs Karnataka/Gujarat), `W2-09` (Gujarat SC vs ST Milch Farm), `W2-10` (Karnataka ₹2.84L income ceiling vs Ganga Kalyana/Udyogini) |
| **(c) Multi-Ministerial Convergence** | `W2-11`..`W2-15` | **`5 / 5`** | `W2-11` (Assam `3` pkgs), `W2-12` (Karnataka agroforestry+rainfed+irrigation+insurance `4` pkgs), `W2-13` (Goa horticulture+drip+power `2` pkgs), `W2-14` (Gujarat 6-cow SC dairy+insurance `3` pkgs), `W2-15` (Mandya income+credit+insurance+irrigation `4` pkgs) |
| **(d) FAQ Troubleshooting** | `W2-16`..`W2-20` | **`4 / 5`** | `W2-17` (PMFBY 72-hour intimation passed `9.59s`), `W2-18` (KCC procedure), `W2-19` (PM-KISAN + PMKSY docs/portals), `W2-20` (tenant KCC/PMFBY eligibility). **`W2-16` nuance (`http=200`, `pkgs=1` PM-KISAN, `missing=[]`):** Gemma correctly matched PM-KISAN and returned bank/Aadhaar administrative guidance, while setting `has_sufficient_data=false` because the scraped MyScheme FAQ chunks for `#1421` in PostgreSQL genuinely lack a step-by-step technical Aadhaar/NPCI stoppage troubleshooting article. |
| **(e) Anti-Hallucination Refusals** | `W2-21`..`W2-24` | **`3 / 4`** | `W2-21` (Fake PM-KISAN Tractor Giveaway -> refused, `suff=False`), `W2-23` (Fake ₹2L Monthly Salary -> refused, `suff=False`), `W2-24` (Fake Mars Hydroponic -> refused, `suff=False`). **`W2-22` nuance (`http=200`, `pkgs=0`, `missing=[]`):** Gemma explicitly refused the fabricated *"Assam Universal Rs 50,000 Monsoon Crypto Farming Token Grant"* (`"no officially documented scheme titled..."`, `inter_ministerial_package: []`), though it emitted `has_sufficient_data: true` on the JSON flag despite a clean text refusal and empty package list. |
| **(f) Multilingual & SSE Streaming** | `W2-25`..`W2-28` | **`4 / 4`** | `W2-25` (Hinglish PM-KISAN+KCC `2` pkgs), `W2-26` (Kannada transliteration PMFBY+Per Drop `2` pkgs), `W2-27` & `W2-28` (`GET /consult-stream` verified all 5 named SSE events: `start`, `thought`, `deliberation`, `final_directive`, `complete`). |

---

## 6. Files Modified During Audit & Remediation

- **Backend Reasoning & Retrieval:**
  - `backend/reasoning/tools.py`
  - `backend/reasoning/prompts.py`
  - `backend/reasoning/eligibility_evaluator.py`
  - `backend/reasoning/chief_secretary_agent.py`
- **Frontend Stage 1 & Engine Status Telemetry:**
  - `frontend/js/api.js`
  - `frontend/js/app.js`
- **Audit Report Added:**
  - `QA_Wing1_Wing2_Audit_Report.md`
