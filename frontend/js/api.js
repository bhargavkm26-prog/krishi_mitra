/**
 * Krishi Mitra - Data Service & API Abstraction
 * All data operations and mock endpoints live here.
 * When the real FastAPI backend is ready, replace the mock implementations
 * with fetch() calls while preserving the exact same method signatures.
 */

const ApiService = {
  BASE_URL: (window.location.protocol && window.location.protocol.startsWith("http") && !["5500", "3000", "5173"].includes(window.location.port))
    ? window.location.origin
    : "http://127.0.0.1:8000",

  STORAGE_KEYS: {
    USER_SESSION: "km_user_session",
    PROFILE_DATA: "km_farmer_profile",
    WIZARD_PROGRESS: "km_wizard_progress",
    SAVED_SCHEMES: "km_saved_schemes",
    APPLIED_SCHEMES: "km_applied_schemes",
    DOC_CHECKLIST: "km_doc_checklist",
    LANGUAGE: "km_selected_language",
    EVAL_CACHE: "km_eval_cache_v1"
  },

  _dossierCache: new Map(),

  // Simulated latency for offline/local cache operations
  _delay(ms = 150) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  _persistFarmerIdentity(rawData, fallbackId = "") {
    const profile = this._normalizeBackendFarmerPayload(rawData, fallbackId);
    const session = {
      farmer_id: profile.farmer_id || null,
      farmer_unique_id: profile.farmer_unique_id || fallbackId,
      phone: profile.mobile_number || "",
      full_name: profile.full_name || profile.farmer_unique_id || fallbackId,
      loggedInAt: (rawData && rawData.logged_in_at) || new Date().toISOString(),
      isNewUser: false
    };
    localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
    localStorage.setItem(this.STORAGE_KEYS.PROFILE_DATA, JSON.stringify(profile));
    if (profile.farmer_id !== null && profile.farmer_id !== undefined && profile.farmer_id !== "") {
      localStorage.setItem("krishi_farmer_id", String(profile.farmer_id));
    }
    try {
      localStorage.setItem("krishi_farmer_profile", JSON.stringify({
        ...rawData,
        authenticated: true,
        logged_in_at: session.loggedInAt
      }));
    } catch (_) {}
    return { profile, session };
  },

  // -------------------------------------------------------------
  // Authentication & Session
  // -------------------------------------------------------------
  async login(phone, otp) {
    await this._delay(300);
    // Validation
    const cleanPhone = String(phone).replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      throw new Error("INVALID_PHONE");
    }
    // Accept 1234 or any 4-digit OTP for testing
    if (otp !== "1234" && otp.length !== 4) {
      throw new Error("INVALID_OTP");
    }

    const session = {
      phone: cleanPhone,
      loggedInAt: new Date().toISOString(),
      isNewUser: !localStorage.getItem(this.STORAGE_KEYS.PROFILE_DATA)
    };
    localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
    return session;
  },

  // Normalize PostgreSQL backend farmer payload (`{ farmer, landholdings, unassigned_crops }`)
  // into unified profile object compatible with legacy scheme evaluator + drawer UI
  _normalizeBackendFarmerPayload(data, fallbackId = "") {
    const f = (data && data.farmer) ? data.farmer : (data && data.profile) ? data.profile : (data || {});
    const landholdings = (data && Array.isArray(data.landholdings)) ? data.landholdings : (f.landholdings || []);
    const unassignedCrops = (data && Array.isArray(data.unassigned_crops)) ? data.unassigned_crops : [];

    // Aggregate land area (stored as hectares in PostgreSQL -> convert to acres for scheme rules)
    let totalHa = 0;
    let hasIrrigated = false;
    let primaryOwnership = "owned";
    const collectedCrops = [];

    landholdings.forEach((lh, idx) => {
      const ha = parseFloat(lh.land_area);
      if (!isNaN(ha)) totalHa += ha;
      if (lh.irrigation_available === true) hasIrrigated = true;
      if (idx === 0 && lh.ownership_type) {
        const own = String(lh.ownership_type).toUpperCase();
        primaryOwnership = (own === "LEASED" || own === "TENANT") ? "leased" : (own === "SHARED" ? "joint" : "owned");
      }
      if (Array.isArray(lh.crops)) {
        lh.crops.forEach(c => { if (c && c.crop_name) collectedCrops.push(c.crop_name); });
      }
    });
    unassignedCrops.forEach(c => { if (c && c.crop_name) collectedCrops.push(c.crop_name); });

    const totalAcres = totalHa > 0 ? +(totalHa * 2.471).toFixed(2) : 2.0;
    const rawCropStr = collectedCrops.join(" ").toLowerCase();
    let mappedCrop = "ragi";
    if (rawCropStr.includes("rice") || rawCropStr.includes("paddy")) mappedCrop = "paddy";
    else if (rawCropStr.includes("cane") || rawCropStr.includes("sugar")) mappedCrop = "sugarcane";
    else if (rawCropStr.includes("cotton")) mappedCrop = "cotton";
    else if (rawCropStr.includes("jowar") || rawCropStr.includes("maize") || rawCropStr.includes("corn")) mappedCrop = "jowar";
    else if (rawCropStr.includes("hort") || rawCropStr.includes("fruit") || rawCropStr.includes("veg") || rawCropStr.includes("spice") || rawCropStr.includes("pepper") || rawCropStr.includes("ginger") || rawCropStr.includes("areca")) mappedCrop = "horticulture";

    const rawCat = String(f.social_category || "general").toLowerCase();
    const mappedCat = rawCat.includes("sc") ? "sc" : rawCat.includes("st") ? "st" : rawCat.includes("obc") ? "obc" : "general";

    let ageGroup = "young";
    if (f.date_of_birth) {
      const yr = new Date(f.date_of_birth).getFullYear();
      if (!isNaN(yr)) {
        const ageNum = new Date().getFullYear() - yr;
        ageGroup = ageNum >= 60 ? "senior" : (ageNum > 40 ? "middle" : "young");
      }
    }

    const districtRaw = f.district ? String(f.district) : "mandya";
    const districtSlug = districtRaw.toLowerCase().replace(/\s+/g, "_");

    return {
      // Raw PostgreSQL DB fields (`farmer_profiles` + `india_locations`)
      farmer_id: f.farmer_id || null,
      farmer_unique_id: f.farmer_unique_id || fallbackId,
      full_name: f.full_name || "",
      date_of_birth: f.date_of_birth || "",
      mobile_number: f.mobile_number || "",
      state: f.state || "",
      district_display: f.district || "",
      sub_district: f.sub_district || "",
      village: f.village || "",
      pincode: f.pincode || "",
      location_id: f.location_id ?? null,
      state_code: f.state_code || "",
      district_code: f.district_code || "",
      sub_district_code: f.sub_district_code || "",
      village_code: f.village_code || "",
      social_category: f.social_category || "",
      farmer_category: f.farmer_category || "",
      annual_family_income: f.annual_family_income ?? null,
      kcc_holder: f.kcc_holder ?? null,
      farmer_registration_id: f.farmer_registration_id || "",
      profile_verification_status: f.profile_verification_status || "UNVERIFIED",
      total_land_hectares: totalHa > 0 ? +totalHa.toFixed(2) : null,
      crops_list: collectedCrops,
      landholdings: landholdings,
      unassigned_crops: unassignedCrops,
      // Legacy evaluator normalized fields
      district: districtSlug,
      land_size: String(totalAcres),
      land_ownership: primaryOwnership,
      crop: mappedCrop,
      irrigation: hasIrrigated ? "borewell" : "rainfed",
      category: mappedCat,
      age: ageGroup,
      gender: f.gender || "",
      bank_account: "yes",
      fruits_id: f.farmer_registration_id ? "yes" : "yes"
    };
  },

  async loginWithCredentials(identifier, password) {
    await this._delay(100);
    const cleanId = String(identifier || "").trim();
    const cleanPass = String(password || "").trim();

    if (!cleanId) throw new Error("Farmer User ID is required.");
    if (!cleanPass) throw new Error("Password is required.");

    // 1. Try real PostgreSQL FastAPI endpoint first
    try {
      const resp = await fetch(`${this.BASE_URL}/api/v1/database/farmers/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmer_unique_id: cleanId, password: cleanPass })
      });

      if (resp.ok) {
        const data = await resp.json();
        const { session } = this._persistFarmerIdentity(data, cleanId);
        return session;
      } else {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.detail || "Invalid Farmer User ID or password.");
      }
    } catch (netErr) {
      // Only fall back to offline demo accounts when backend HTTP request itself fails (TypeError)
      const isNetworkFailure = netErr instanceof TypeError || /fetch|network/i.test(netErr.message || "");
      if (isNetworkFailure && cleanId.toUpperCase().startsWith("KM26@") && cleanPass.toUpperCase() === cleanId.toUpperCase()) {
        const upperId = cleanId.toUpperCase();
        const mockRaw = {
          farmer: {
            farmer_unique_id: upperId,
            full_name: upperId === "KM26@0001" ? "Suresh Hegde" : (upperId === "KM26@0002" ? "Vijay Gowda" : (upperId === "KM26@0003" ? "Ravi Borah" : "Citizen Farmer")),
            mobile_number: "9845012345",
            state: upperId === "KM26@0001" ? "Assam" : "Karnataka",
            district: upperId === "KM26@0001" ? "Dhemaji" : (upperId === "KM26@0002" ? "Chitradurga" : "Vijayapura"),
            social_category: upperId === "KM26@0002" ? "OBC" : "SC",
            farmer_category: upperId === "KM26@0001" ? "Medium" : "Small",
            kcc_holder: true
          },
          landholdings: [{
            land_area: upperId === "KM26@0001" ? 6.37 : (upperId === "KM26@0002" ? 1.8 : 0.9),
            ownership_type: "OWNED",
            irrigation_available: true,
            crops: [{ crop_name: upperId === "KM26@0001" ? "Paddy" : "Maize", crop_season: "Kharif" }]
          }]
        };
        const { session } = this._persistFarmerIdentity(mockRaw, upperId);
        return session;
      }
      throw netErr;
    }
  },

  async loadFarmerFromBackend(farmerId) {
    try {
      const resp = await fetch(`${this.BASE_URL}/api/v1/database/farmers/${encodeURIComponent(farmerId)}`);
      if (resp.ok) {
        const data = await resp.json();
        const { profile } = this._persistFarmerIdentity(data, farmerId);
        return profile;
      }
    } catch (e) {
      console.warn("Could not load farmer profile from backend:", e);
    }
    return null;
  },

  async checkUniqueId(uniqueId) {
    const resp = await fetch(`${this.BASE_URL}/api/v1/database/farmers/check-id/${encodeURIComponent(uniqueId)}`);
    if (!resp.ok) throw new Error("Unable to check Farmer User ID availability.");
    return await resp.json();
  },

  async registerFarmer(payload) {
    const resp = await fetch(`${this.BASE_URL}/api/v1/database/farmers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      let msg = data.detail || "Failed to register farmer profile in PostgreSQL.";
      if (Array.isArray(data.detail)) {
        msg = data.detail.map(e => `${(e.loc || []).slice(1).join(".")}: ${e.msg}`).join("; ");
      }
      throw new Error(msg);
    }
    const profile = await this.loadFarmerFromBackend(data.farmer_unique_id || data.farmer_id);
    return { response: data, profile, session: this.getSession() };
  },

  async updateFarmerProfile(identifier, payload) {
    const resp = await fetch(`${this.BASE_URL}/api/v1/database/farmers/${encodeURIComponent(identifier)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      let msg = data.detail || "Failed to update farmer profile in PostgreSQL.";
      if (Array.isArray(data.detail)) {
        msg = data.detail.map(e => `${(e.loc || []).slice(1).join(".")}: ${e.msg}`).join("; ");
      }
      throw new Error(msg);
    }

    const { profile, session } = this._persistFarmerIdentity(data, data.farmer_unique_id || identifier);
    this.clearEvalCacheForFarmer(profile.farmer_id);
    return { response: data, profile, session };
  },

  async getLocationStates() {
    const resp = await fetch(`${this.BASE_URL}/api/v1/database/locations/states`);
    if (!resp.ok) throw new Error("Failed to load states from LGD directory.");
    return await resp.json();
  },

  async getLocationDistricts(state) {
    const resp = await fetch(`${this.BASE_URL}/api/v1/database/locations/districts?state=${encodeURIComponent(state)}`);
    if (!resp.ok) throw new Error("Failed to load districts from LGD directory.");
    return await resp.json();
  },

  async getLocationSubDistricts(state, district) {
    const resp = await fetch(`${this.BASE_URL}/api/v1/database/locations/sub-districts?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
    if (!resp.ok) throw new Error("Failed to load sub-districts from LGD directory.");
    return await resp.json();
  },

  async getLocationVillages(state, district, subDistrict) {
    const resp = await fetch(`${this.BASE_URL}/api/v1/database/locations/villages?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&sub_district=${encodeURIComponent(subDistrict)}`);
    if (!resp.ok) throw new Error("Failed to load villages from LGD directory.");
    return await resp.json();
  },

  // -------------------------------------------------------------
  // Health Telemetry & System Status (/health, /database/health, /bge/health, /gemma/health)
  // -------------------------------------------------------------
  async getConsolidatedHealth() {
    try {
      const resp = await fetch(`${this.BASE_URL}/health`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      return {
        status: "offline",
        error: e.message,
        subsystems: {
          postgresql_pgvector: { healthy: false, schemes_indexed: 0 },
          bge_m3_embedding_engine: { device: "offline", precision: "n/a" },
          gemma_4_e4b_reasoning_server: { healthy: false }
        }
      };
    }
  },

  async getDatabaseHealth() {
    try {
      const resp = await fetch(`${this.BASE_URL}/api/v1/database/health`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      return { status: "offline", error: e.message };
    }
  },

  async getBgeHealth() {
    try {
      const resp = await fetch(`${this.BASE_URL}/api/v1/bge/health`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      return { status: "offline", error: e.message };
    }
  },

  async getGemmaHealth() {
    try {
      const resp = await fetch(`${this.BASE_URL}/api/v1/gemma/health`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      return { status: "unavailable", healthy: false, error: e.message };
    }
  },

  // -------------------------------------------------------------
  // Schemes Catalog, Dossier, BGE Search & Gemma Reasoning Wrappers
  // -------------------------------------------------------------
  async listSchemes({ search = "", state = "", ministry = "", limit = 20, offset = 0 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (state) params.append("state", state);
    if (ministry) params.append("ministry", ministry);
    params.append("limit", String(Math.min(100, Math.max(1, parseInt(limit, 10) || 20))));
    params.append("offset", String(Math.max(0, parseInt(offset, 10) || 0)));

    const resp = await fetch(`${this.BASE_URL}/api/v1/database/schemes?${params.toString()}`);
    if (!resp.ok) throw new Error(`Failed to load schemes catalog: ${resp.statusText}`);
    return await resp.json();
  },

  async getSchemeDossier(schemeId) {
    const key = String(schemeId);
    if (this._dossierCache.has(key)) {
      return this._dossierCache.get(key);
    }
    const resp = await fetch(`${this.BASE_URL}/api/v1/database/schemes/${encodeURIComponent(schemeId)}`);
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.found) {
      throw new Error(data.detail || `Scheme #${schemeId} dossier not found.`);
    }
    this._dossierCache.set(key, data);
    return data;
  },

  async searchSchemesBGE(query, { state = null, ministry = null, limit = 15 } = {}) {
    const body = {
      query: String(query || "").trim() || "agriculture farmer subsidy crop insurance credit irrigation",
      limit: Math.min(20, Math.max(1, parseInt(limit, 10) || 15))
    };
    if (state) body.state = state;
    if (ministry) body.ministry = ministry;

    const resp = await fetch(`${this.BASE_URL}/api/v1/bge/search/schemes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.detail || `BGE scheme search failed: ${resp.statusText}`);
    }
    return data;
  },

  async searchFaqsBGE(issue, limit = 4) {
    const clampedLimit = Math.min(10, Math.max(1, parseInt(limit, 10) || 4));
    const resp = await fetch(`${this.BASE_URL}/api/v1/bge/search/faqs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: String(issue || "").trim(), limit: clampedLimit })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.detail || `BGE FAQ search failed: ${resp.statusText}`);
    }
    return data;
  },

  async evaluateEligibility(farmerId, schemeId) {
    const fid = parseInt(farmerId, 10);
    const sid = parseInt(schemeId, 10);
    if (!Number.isFinite(fid) || !Number.isFinite(sid)) {
      throw new Error("Both numeric farmer_id and scheme_id are required for Gemma Wing 1 evaluation.");
    }
    const resp = await fetch(`${this.BASE_URL}/api/v1/gemma/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ farmer_id: fid, scheme_id: sid })
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.detail || "Gemma eligibility evaluation failed.");
    }
    this.setCachedVerdict(fid, sid, data);
    return data;
  },

  async consultChiefSecretary(inquiry, farmerId = null, maxTurns = 3) {
    const payload = {
      inquiry: String(inquiry || "").trim(),
      max_turns: Math.min(5, Math.max(1, parseInt(maxTurns, 10) || 3))
    };
    if (farmerId !== null && farmerId !== undefined && !isNaN(parseInt(farmerId, 10))) {
      payload.farmer_id = parseInt(farmerId, 10);
    }
    const resp = await fetch(`${this.BASE_URL}/api/v1/gemma/consult`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.detail || "Chief Secretary consultation failed.");
    }
    return data;
  },

  streamChiefSecretary(inquiry, farmerId = null, { onStart, onThought, onDeliberation, onDirective, onComplete, onError } = {}) {
    let url = `${this.BASE_URL}/api/v1/gemma/consult-stream?inquiry=${encodeURIComponent(inquiry)}`;
    if (farmerId !== null && farmerId !== undefined && !isNaN(parseInt(farmerId, 10))) {
      url += `&farmer_id=${parseInt(farmerId, 10)}`;
    }
    const es = new EventSource(url);
    let completed = false;
    let lastDirective = null;
    let lastDeliberation = "";

    const safeParse = (evt) => {
      try { return JSON.parse(evt.data); } catch (_) { return {}; }
    };

    es.addEventListener("start", (e) => {
      if (onStart) onStart(safeParse(e));
    });
    es.addEventListener("thought", (e) => {
      if (onThought) onThought(safeParse(e));
    });
    es.addEventListener("deliberation", (e) => {
      const d = safeParse(e);
      lastDeliberation = d.scratchpad || "";
      if (onDeliberation) onDeliberation(d);
    });
    es.addEventListener("final_directive", (e) => {
      const d = safeParse(e);
      lastDirective = d.directive || d;
      if (onDirective) onDirective(lastDirective, d);
    });
    es.addEventListener("complete", (e) => {
      completed = true;
      es.close();
      if (onComplete) onComplete({ directive: lastDirective, deliberation: lastDeliberation, ...safeParse(e) });
    });
    es.onerror = (err) => {
      es.close();
      if (!completed && onError) onError(err);
    };
    return es;
  },

  getSession() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.USER_SESSION);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && !parsed.farmer_id) {
          const profRaw = localStorage.getItem(this.STORAGE_KEYS.PROFILE_DATA);
          if (profRaw) {
            const prof = JSON.parse(profRaw);
            if (prof && prof.farmer_id) {
              parsed.farmer_id = prof.farmer_id;
              localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(parsed));
            }
          }
        }
        return parsed;
      }
      // Hydrate from shared krishi_farmer_profile (e.g., login from index.html Offcanvas or page-login.html)
      const sharedRaw = localStorage.getItem("krishi_farmer_profile");
      if (sharedRaw) {
        const shared = JSON.parse(sharedRaw);
        if (shared && shared.farmer) {
          const { session } = this._persistFarmerIdentity(shared, shared.farmer.farmer_unique_id || "");
          return session;
        }
      }
      return null;
    } catch {
      return null;
    }
  },

  async logout() {
    await this._delay(100);
    localStorage.removeItem(this.STORAGE_KEYS.USER_SESSION);
    localStorage.removeItem(this.STORAGE_KEYS.PROFILE_DATA);
    localStorage.removeItem("krishi_farmer_profile");
    localStorage.removeItem("krishi_farmer_id");
    this._dossierCache.clear();
    return true;
  },

  async deleteUserData() {
    await this._delay(200);
    // Clear all Krishi Mitra local browser keys
    Object.values(this.STORAGE_KEYS).forEach(key => {
      if (key !== this.STORAGE_KEYS.LANGUAGE) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem("krishi_farmer_profile");
    localStorage.removeItem("krishi_farmer_id");
    this._dossierCache.clear();
    return true;
  },

  // -------------------------------------------------------------
  // Farmer Profile & Wizard Progress
  // -------------------------------------------------------------
  async getProfile() {
    await this._delay();
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.PROFILE_DATA);
      if (data) return JSON.parse(data);
      // Default profile if none saved
      return {
        district: "mandya",
        land_size: "2",
        land_ownership: "owned",
        crop: "ragi",
        irrigation: "rainfed",
        category: "obc",
        age: "young",
        gender: "male",
        bank_account: "yes",
        fruits_id: "yes"
      };
    } catch {
      return null;
    }
  },

  async saveProfile(profileData) {
    await this._delay(200);
    localStorage.setItem(this.STORAGE_KEYS.PROFILE_DATA, JSON.stringify(profileData));
    // Clear wizard progress since profile is completed
    localStorage.removeItem(this.STORAGE_KEYS.WIZARD_PROGRESS);
    return profileData;
  },

  saveWizardProgress(stepIndex, answers) {
    try {
      const progress = { stepIndex, answers, updatedAt: new Date().toISOString() };
      localStorage.setItem(this.STORAGE_KEYS.WIZARD_PROGRESS, JSON.stringify(progress));
    } catch (e) {
      console.warn("Could not save wizard progress", e);
    }
  },

  getWizardProgress() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.WIZARD_PROGRESS);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // -------------------------------------------------------------
  // Gemma Verdict Cache & Two-Stage Backend Scheme Normalization
  // -------------------------------------------------------------
  _readEvalCache() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEYS.EVAL_CACHE);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getCachedVerdict(farmerId, schemeId) {
    if (!farmerId || !schemeId) return null;
    const cache = this._readEvalCache();
    return cache[`${farmerId}:${schemeId}`] || null;
  },

  setCachedVerdict(farmerId, schemeId, evalRes) {
    if (!farmerId || !schemeId || !evalRes) return;
    try {
      const cache = this._readEvalCache();
      cache[`${farmerId}:${schemeId}`] = {
        ...evalRes,
        cachedAt: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEYS.EVAL_CACHE, JSON.stringify(cache));
    } catch (_) {}
  },

  clearEvalCacheForFarmer(farmerId) {
    if (!farmerId) return;
    try {
      const cache = this._readEvalCache();
      const prefix = `${farmerId}:`;
      Object.keys(cache).forEach(k => {
        if (k.startsWith(prefix)) delete cache[k];
      });
      localStorage.setItem(this.STORAGE_KEYS.EVAL_CACHE, JSON.stringify(cache));
    } catch (_) {}
  },

  _inferSchemeCategory(raw) {
    const text = [
      raw.scheme_name || "",
      Array.isArray(raw.tags) ? raw.tags.join(" ") : (raw.tags || ""),
      raw.evidence || "",
      raw.benefits || "",
      raw.description || ""
    ].join(" ").toLowerCase();

    if (/insurance|bima|fasal|pmfby|coconut palm|crop loss|weather index/.test(text)) return "insurance";
    if (/pension|maan dhan|pm-kmy|old age|superannuation/.test(text)) return "pension";
    if (/kisan credit|kcc|interest subvention|crop loan|nabard|microfinance|credit card|working capital/.test(text)) return "credit";
    if (/irrigat|sinchayee|drip|sprinkler|pond|borewell|bore well|tube well|solar pump|kusum|ganga kalyana|watershed|water harvesting/.test(text)) return "irrigation";
    if (/samman nidhi|pm-kisan|raitha siri|income support|direct benefit|cash transfer|dbt|honorarium|grant|seed|fertilizer|machinery|tractor/.test(text)) return "income";
    return "income";
  },

  _extractBenefitSummary(raw) {
    const snippet = String(raw.benefits || raw.evidence || raw.description || "").replace(/\s+/g, " ").trim();
    let amount = 0;
    const matchLakh = snippet.match(/(?:rs\.?|inr|₹)\s*([0-9]+(?:\.[0-9]+)?)\s*(?:lakh|lac)/i);
    const matchRs = snippet.match(/(?:rs\.?|inr|₹)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/i);
    if (matchLakh) {
      amount = Math.round(parseFloat(matchLakh[1]) * 100000);
    } else if (matchRs) {
      const num = parseFloat(matchRs[1].replace(/,/g, ""));
      if (Number.isFinite(num)) amount = Math.round(num);
    }
    const pctMatch = snippet.match(/([0-9]{1,3})%\s*(?:subsidy|assistance|grant|premium|financial)/i);
    if (!amount && pctMatch) {
      amount = parseInt(pctMatch[1], 10) * 1000;
    }

    const displayEn = snippet
      ? (snippet.length > 145 ? snippet.slice(0, 142) + "..." : snippet)
      : "Statutory central/state agricultural welfare entitlement (click Details to load full benefits).";

    return {
      benefitAmount: amount,
      isAnnualCash: /per annum|per year|annual|yearly|every four months/i.test(snippet) && amount > 0 && amount <= 50000,
      text: displayEn
    };
  },

  applyGemmaVerdictToScheme(scheme, evalRes) {
    if (!evalRes || !evalRes.status) return scheme;
    const status = String(evalRes.status).toUpperCase();
    const isEligible = status === "ELIGIBLE";
    const isAlmost = status === "UNCERTAIN_NEEDS_INFO" || status === "CONDITIONAL";
    const isIneligible = status === "INELIGIBLE";

    const confPct = typeof evalRes.confidence_score === "number"
      ? `${Math.round(evalRes.confidence_score * 100)}%`
      : "Verified";
    const priorityText = evalRes.priority_tier ? ` • Priority: ${evalRes.priority_tier}` : "";
    const quotaText = evalRes.target_quota ? ` • Quota: ${evalRes.target_quota}` : "";

    const disqualifiers = Array.isArray(evalRes.disqualifying_factors) ? evalRes.disqualifying_factors : [];
    const reasonText = isEligible
      ? `Gemma Wing 1 Verdict: ELIGIBLE (${confPct} confidence${priorityText}${quotaText}).`
      : (isAlmost
        ? `Gemma Wing 1 Verdict: CONDITIONAL / NEEDS INFO (${confPct} confidence${priorityText}).`
        : `Gemma Wing 1 Verdict: INELIGIBLE (${confPct} confidence).`);

    const missingText = disqualifiers.length > 0
      ? disqualifiers.join("; ")
      : (isAlmost ? "Review official eligibility criteria and confirm missing farmer profile details." : "");

    return {
      ...scheme,
      eligible: isEligible,
      almost: isAlmost,
      ineligible: isIneligible,
      verdictStatus: status,
      isEvaluated: true,
      confidenceScore: evalRes.confidence_score ?? null,
      disqualifyingFactors: disqualifiers,
      priorityTier: evalRes.priority_tier || "NORMAL",
      targetQuota: evalRes.target_quota || null,
      fitScore: evalRes.fit_score ?? null,
      matchReason: { en: reasonText, kn: reasonText },
      missingReason: missingText ? { en: missingText, kn: missingText } : null
    };
  },

  normalizeBackendScheme(raw, { profile = null, savedIds = [], appliedIds = [], source = "bge" } = {}) {
    const idVal = raw.scheme_id ?? raw.id;
    const sidStr = String(idVal);
    const savedSet = new Set((savedIds || []).map(String));
    const appliedSet = new Set((appliedIds || []).map(String));
    const dept = raw.state_ut_ministry || raw.level || "Government of India";
    const benefitInfo = this._extractBenefitSummary(raw);
    const relPct = typeof raw.relevance_score === "number"
      ? `${Math.round(Math.max(0, Math.min(1, raw.relevance_score)) * 100)}% match`
      : "Catalog match";

    const evidenceText = raw.evidence
      ? `${raw.section ? `[${raw.section}] ` : ""}${raw.evidence}`
      : `Official ${raw.level || "Statutory"} scheme (${dept}). Open Details & Apply for full rules & AI eligibility verification.`;

    const baseScheme = {
      id: idVal,
      scheme_id: idVal,
      name: { en: raw.scheme_name || `Scheme #${idVal}`, kn: raw.scheme_name || `Scheme #${idVal}` },
      department: { en: `${dept}${raw.level ? ` (${raw.level})` : ""}`, kn: dept },
      level: raw.level || "",
      state_ut_ministry: dept,
      type: this._inferSchemeCategory(raw),
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      application_mode: raw.application_mode || "Online / Offline",
      benefitAmount: benefitInfo.benefitAmount,
      isAnnualCash: benefitInfo.isAnnualCash,
      benefit: { en: benefitInfo.text, kn: benefitInfo.text },
      reason: {
        en: source === "bge"
          ? `Matched via BGE-M3 (${relPct}): ${evidenceText}`
          : evidenceText,
        kn: source === "bge"
          ? `BGE-M3 ಹೊಂದಾಣಿಕೆ (${relPct}): ${evidenceText}`
          : evidenceText
      },
      missing: null,
      documents: [],
      apply_link: raw.official_link || raw.myscheme_url || `https://www.myscheme.gov.in/${raw.scheme_slug ? "schemes/" + raw.scheme_slug : ""}`,
      steps_to_apply: { en: [], kn: [] },
      relevanceScore: typeof raw.relevance_score === "number" ? raw.relevance_score : 0.45,
      eligible: false,
      almost: true,
      ineligible: false,
      verdictStatus: "PENDING_AI_CHECK",
      isEvaluated: false,
      isSaved: savedSet.has(sidStr) || savedSet.has(idVal),
      isApplied: appliedSet.has(sidStr) || appliedSet.has(idVal),
      matchReason: {
        en: source === "bge" ? `Matched via BGE-M3 (${relPct}) — ${evidenceText}` : evidenceText,
        kn: source === "bge" ? `BGE-M3 ಹೊಂದಾಣಿಕೆ (${relPct}) — ${evidenceText}` : evidenceText
      },
      missingReason: {
        en: "Click 'Run AI Check' or open Details to verify statutory eligibility with Gemma 4.",
        kn: "Gemma 4 AI ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಲು 'Details' ತೆರೆಯಿರಿ."
      }
    };

    const cached = profile && profile.farmer_id
      ? this.getCachedVerdict(profile.farmer_id, idVal)
      : null;
    return cached ? this.applyGemmaVerdictToScheme(baseScheme, cached) : baseScheme;
  },

  buildFarmerSearchQuery(profile) {
    if (!profile) {
      return "farmer agriculture PM-KISAN crop insurance Fasal Bima Kisan Credit Card drip irrigation subsidy";
    }
    const parts = ["agriculture farmer welfare scheme subsidy"];
    if (profile.state) parts.push(profile.state);
    if (profile.district_display || profile.district) parts.push(profile.district_display || profile.district);
    if (profile.farmer_category) parts.push(`${profile.farmer_category} farmer`);
    if (Array.isArray(profile.crops_list) && profile.crops_list.length > 0) {
      parts.push("crops " + profile.crops_list.slice(0, 4).join(" "));
    } else if (profile.crop) {
      parts.push(profile.crop);
    }
    if (profile.irrigation) parts.push(profile.irrigation === "rainfed" ? "rainfed dryland farm pond" : `${profile.irrigation} irrigation solar pump`);
    if (profile.kcc_holder === false) parts.push("Kisan Credit Card crop loan");
    if (Array.isArray(profile.landholdings)) {
      const hasLivestock = profile.landholdings.some(l => Array.isArray(l.livestock) && l.livestock.length > 0);
      const hasTrees = profile.landholdings.some(l => Array.isArray(l.trees) && l.trees.length > 0);
      if (hasLivestock) parts.push("dairy livestock animal husbandry");
      if (hasTrees) parts.push("horticulture plantation trees");
    }
    return parts.join(" ");
  },

  mapWizardAnswersToProfilePayload(answers, existingProfile = null) {
    const a = answers || {};
    const acresMap = { "1": 0.8, "2": 1.5, "5": 3.5, "10": 7.0 };
    const rawSize = parseFloat(a.land_size);
    const acres = Number.isFinite(rawSize) ? rawSize : (acresMap[String(a.land_size)] || 2.0);
    const hectares = Math.round(acres * 0.404686 * 10000) / 10000;

    let farmerCategory = "Small";
    if (acres < 2.5) farmerCategory = "Marginal";
    else if (acres <= 5.0) farmerCategory = "Small";
    else if (acres <= 10.0) farmerCategory = "Medium";
    else farmerCategory = "Large";

    const ownershipMap = { owned: "OWNED", leased: "LEASED", joint: "SHARED" };
    const ownershipType = ownershipMap[String(a.land_ownership || "owned").toLowerCase()] || "OWNED";

    const distOpt = (typeof MOCK_DATA !== "undefined" && MOCK_DATA.questions?.[0]?.options)
      ? MOCK_DATA.questions[0].options.find(o => o.id === a.district)
      : null;
    const districtName = distOpt ? distOpt.en : (a.district ? String(a.district).replace(/_/g, " ") : (existingProfile?.district_display || null));

    const cropOpt = (typeof MOCK_DATA !== "undefined" && MOCK_DATA.questions?.[3]?.options)
      ? MOCK_DATA.questions[3].options.find(o => o.id === a.crop)
      : null;
    const cropName = cropOpt ? cropOpt.en : (a.crop || null);

    const catMap = { general: "General", obc: "OBC", sc: "SC", st: "ST" };
    const socialCategory = catMap[String(a.category || "").toLowerCase()] || (existingProfile?.social_category || null);

    const genderMap = { male: "Male", female: "Female", other: "Other" };
    const genderVal = genderMap[String(a.gender || "").toLowerCase()] || (existingProfile?.gender || null);

    const p = existingProfile || {};
    return {
      full_name: p.full_name || null,
      date_of_birth: p.date_of_birth || null,
      gender: genderVal,
      mobile_number: p.mobile_number || null,
      state: p.state || "Karnataka",
      district: districtName,
      sub_district: p.sub_district || null,
      village: p.village || null,
      pincode: p.pincode || null,
      location_id: p.location_id ?? null,
      social_category: socialCategory,
      farmer_category: farmerCategory,
      annual_family_income: p.annual_family_income ?? null,
      kcc_holder: p.kcc_holder ?? null,
      farmer_registration_id: p.farmer_registration_id || (a.fruits_id === "yes" ? "FRUITS-DECLARED" : null),
      profile_verification_status: p.profile_verification_status || "UNVERIFIED",
      landholdings: [{
        land_area: hectares,
        land_area_unit: "HECTARE",
        ownership_type: ownershipType,
        irrigation_available: a.irrigation ? String(a.irrigation).toLowerCase() !== "rainfed" : null,
        state: p.state || "Karnataka",
        district: districtName,
        village: p.village || null,
        location_id: p.location_id ?? null
      }],
      crops: cropName ? [{
        plot_index: 0,
        crop_name: cropName,
        crop_season: "Kharif",
        cultivation_year: new Date().getFullYear()
      }] : [],
      trees: [],
      livestock: []
    };
  },

  // -------------------------------------------------------------
  // Schemes & Dynamic Eligibility Engine (Live Backend + Offline Fallback)
  // -------------------------------------------------------------
  async getSchemes(options = {}) {
    const profile = await this.getProfile();
    const savedIds = this.getSavedSchemeIds();
    const appliedIds = this.getAppliedSchemeIds();
    const stateFilter = profile && profile.state ? profile.state : "";
    const searchStr = String(options.search || "").trim();
    const categoryFilter = String(options.category || "all");

    const catKeywords = {
      income: "PM-KISAN direct income support seed fertilizer tractor farmer financial assistance",
      insurance: "Pradhan Mantri Fasal Bima Yojana crop insurance natural calamity livestock palm insurance",
      credit: "Kisan Credit Card KCC interest subvention agricultural crop loan NABARD",
      irrigation: "irrigation drip sprinkler farm pond solar pump PM-KUSUM PMKSY borewell Ganga Kalyana",
      pension: "Pradhan Mantri Kisan Maan Dhan Yojana farmer pension old age monthly"
    };

    try {
      const mergedMap = new Map();
      const upsert = (raw, source) => {
        const sid = String(raw.scheme_id ?? raw.id);
        if (!sid || sid === "undefined") return;
        const norm = this.normalizeBackendScheme(raw, { profile, savedIds, appliedIds, source });
        const prev = mergedMap.get(sid);
        if (!prev) {
          mergedMap.set(sid, norm);
        } else {
          // Keep higher relevance / merge evidence
          if ((norm.relevanceScore || 0) > (prev.relevanceScore || 0)) {
            mergedMap.set(sid, { ...prev, ...norm, isEvaluated: prev.isEvaluated || norm.isEvaluated });
          }
        }
      };

      if (searchStr) {
        // User explicit search: run both BGE semantic search and PostgreSQL ILIKE catalog search in parallel
        const [bgeRes, dbRes] = await Promise.allSettled([
          this.searchSchemesBGE(searchStr, { state: stateFilter || null, limit: 20 }),
          this.listSchemes({ search: searchStr, state: stateFilter, limit: 20, offset: 0 })
        ]);
        if (bgeRes.status === "fulfilled" && Array.isArray(bgeRes.value?.schemes)) {
          bgeRes.value.schemes.forEach(item => upsert(item, "bge"));
        }
        if (dbRes.status === "fulfilled" && Array.isArray(dbRes.value?.schemes)) {
          dbRes.value.schemes.forEach(item => upsert(item, "sql"));
        }
        if (bgeRes.status === "rejected" && dbRes.status === "rejected") {
          throw bgeRes.reason || dbRes.reason;
        }
      } else if (categoryFilter !== "all" && catKeywords[categoryFilter]) {
        const bgeCat = await this.searchSchemesBGE(
          `${catKeywords[categoryFilter]} ${stateFilter}`.trim(),
          { state: stateFilter || null, limit: 20 }
        );
        (bgeCat.schemes || []).forEach(item => {
          const norm = this.normalizeBackendScheme(item, { profile, savedIds, appliedIds, source: "bge" });
          mergedMap.set(String(norm.id), norm);
        });
      } else {
        // Default Personalized Stage 1 Discovery: Flagship Agrarian Schemes BGE + Farmer Context BGE
        const farmerQuery = this.buildFarmerSearchQuery(profile);
        const flagshipQuery = "Pradhan Mantri Kisan Samman Nidhi Fasal Bima Yojana Kisan Credit Card Per Drop More Crop KUSUM Rainfed";
        const [flagshipRes, personalRes] = await Promise.allSettled([
          this.searchSchemesBGE(flagshipQuery, { state: stateFilter || null, limit: 16 }),
          this.searchSchemesBGE(farmerQuery, { state: stateFilter || null, limit: 20 })
        ]);
        if (flagshipRes.status === "fulfilled" && Array.isArray(flagshipRes.value?.schemes)) {
          flagshipRes.value.schemes.forEach(item => upsert(item, "bge"));
        }
        if (personalRes.status === "fulfilled" && Array.isArray(personalRes.value?.schemes)) {
          personalRes.value.schemes.forEach(item => upsert(item, "bge"));
        }
        if (personalRes.status === "rejected" && flagshipRes.status === "rejected") {
          throw personalRes.reason || flagshipRes.reason;
        }
      }

      const list = Array.from(mergedMap.values());
      // Push obviously conflicting category-exclusive schemes (e.g., 'For SC' when farmer is OBC/ST) after matching schemes
      const userSoc = String(profile?.social_category || "").toUpperCase();
      if (!searchStr && userSoc) {
        const hasCatConflict = (s) => {
          const nm = String(s.name?.en || "").toLowerCase();
          if (userSoc !== "SC" && /\bfor sc\b|scheduled caste\b/.test(nm)) return 1;
          if (userSoc !== "ST" && /\bfor st\b|scheduled tribe\b/.test(nm)) return 1;
          return 0;
        };
        list.sort((a, b) => hasCatConflict(a) - hasCatConflict(b));
      }
      list._source = "backend";
      list._isOfflineFallback = false;
      return list;
    } catch (err) {
      console.warn("Backend scheme retrieval failed, using offline cached scheme fallback:", err);
      const savedSet = new Set(savedIds.map(String));
      const appliedSet = new Set(appliedIds.map(String));
      const evaluatedSchemes = MOCK_DATA.schemes.map(scheme => {
        const evalResult = this._evaluateScheme(scheme, profile);
        return {
          ...scheme,
          eligible: evalResult.eligible,
          almost: evalResult.almost,
          matchReason: evalResult.reason,
          missingReason: evalResult.missing,
          isSaved: savedSet.has(String(scheme.id)),
          isApplied: appliedSet.has(String(scheme.id)),
          isOfflineMock: true
        };
      });
      evaluatedSchemes._source = "offline_mock";
      evaluatedSchemes._isOfflineFallback = true;
      return evaluatedSchemes;
    }
  },

  _evaluateScheme(scheme, profile) {
    if (!profile) {
      return { eligible: true, almost: false, reason: scheme.reason, missing: null };
    }

    const {
      district = "mandya",
      land_size = "2",
      land_ownership = "owned",
      crop = "ragi",
      irrigation = "rainfed",
      category = "obc",
      age = "young",
      gender = "male",
      bank_account = "yes",
      fruits_id = "yes"
    } = profile;

    const landNum = parseFloat(land_size) || 2.0;

    switch (scheme.id) {
      case "pm_kisan": {
        // Requires owned/joint land
        if (land_ownership === "leased") {
          return {
            eligible: false,
            almost: false,
            reason: scheme.reason,
            missing: {
              kn: "ಕೇವಲ ಸ್ವಂತ ಜಮೀನು ಹೊಂದಿರುವ ರೈತರಿಗೆ ಮಾತ್ರ ಅನ್ವಯ (ಗೇಣಿ ಜಮೀನಿಗೆ ಅನ್ವಯಿಸುವುದಿಲ್ಲ).",
              en: "Applicable only to landholding title-owner farmers, not leased land."
            }
          };
        }
        if (bank_account === "no") {
          return {
            eligible: false,
            almost: true,
            reason: scheme.reason,
            missing: {
              kn: "ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಆಧಾರ್ ಜೋಡಣೆ ಹಾಗೂ ಡಿಬಿಟಿ (DBT) ಸಕ್ರಿಯಗೊಳಿಸಬೇಕಾಗಿದೆ.",
              en: "Bank account must be Aadhaar-seeded and DBT enabled."
            }
          };
        }
        return { eligible: true, almost: false, reason: scheme.reason, missing: null };
      }

      case "pmfby": {
        // Available to all farmers who grow notified crops
        if (fruits_id === "no") {
          return {
            eligible: false,
            almost: true,
            reason: scheme.reason,
            missing: {
              kn: "ವಿಮೆ ಕ್ಲೈಮ್ ಸುಲಭವಾಗಿ ಪಡೆಯಲು ಫ್ರೂಟ್ಸ್ (FRUITS) ಐಡಿ ನೋಂದಣಿ ಮಾಡಿಸಿ.",
              en: "FRUITS ID (FID) registration needed for hassle-free claim settlement."
            }
          };
        }
        return { eligible: true, almost: false, reason: scheme.reason, missing: null };
      }

      case "kcc": {
        // Subsidized loan for active cultivators
        if (bank_account === "no") {
          return {
            eligible: false,
            almost: true,
            reason: scheme.reason,
            missing: {
              kn: "ಬ್ಯಾಂಕ್‌ನಲ್ಲಿ ಸಕ್ರಿಯ ಕೃಷಿ ಉಳಿತಾಯ ಖಾತೆ ಮತ್ತು ಆಧಾರ್ ಜೋಡಣೆ ಬೇಕು.",
              en: "Requires an active savings bank account with Aadhaar seeding."
            }
          };
        }
        return { eligible: true, almost: false, reason: scheme.reason, missing: null };
      }

      case "pm_kmy": {
        // Pension scheme for age 18-40, land <= 5 acres
        if (age === "senior" || age === "middle") {
          return {
            eligible: false,
            almost: false,
            reason: scheme.reason,
            missing: {
              kn: "ಪ್ರವೇಶ ವಯಸ್ಸು ೧೮ ರಿಂದ ೪೦ ವರ್ಷದೊಳಗಿರಬೇಕು (ನಿಮ್ಮ ವಯಸ್ಸು ೪೦ ಕ್ಕಿಂತ ಹೆಚ್ಚಿದೆ).",
              en: "Entry age is strictly 18 to 40 years (Current age exceeds limit)."
            }
          };
        }
        if (landNum > 5.0) {
          return {
            eligible: false,
            almost: false,
            reason: scheme.reason,
            missing: {
              kn: "೫ ಎಕರೆಗಿಂತ ಕಡಿಮೆ ಜಮೀನು ಹೊಂದಿರುವ ಸಣ್ಣ ಮತ್ತು ಅತಿ ಸಣ್ಣ ರೈತರಿಗೆ ಮಾತ್ರ.",
              en: "Reserved for small & marginal farmers holding up to 5 acres."
            }
          };
        }
        if (bank_account === "no") {
          return {
            eligible: false,
            almost: true,
            reason: scheme.reason,
            missing: {
              kn: "ಸ್ವಯಂಚಾಲಿತ ಮಾಸಿಕ ಪ್ರೀಮಿಯಂ ಕಡಿತಕ್ಕಾಗಿ ಬ್ಯಾಂಕ್ ಖಾತೆ ಅಗತ್ಯ.",
              en: "Bank account required for auto-debit of nominal monthly contribution."
            }
          };
        }
        return { eligible: true, almost: false, reason: scheme.reason, missing: null };
      }

      case "raitha_siri": {
        // Karnataka Millet Scheme: requires ragi/millets crop
        if (crop !== "ragi") {
          return {
            eligible: false,
            almost: false,
            reason: scheme.reason,
            missing: {
              kn: "ರಾಗಿ ಅಥವಾ ಸಿರಿಧಾನ್ಯ (ನವಣೆ, ಸಾಮೆ, ಸಜ್ಜೆ) ಬೆಳೆಯುವ ರೈತರಿಗೆ ಮಾತ್ರ ಲಭ್ಯ.",
              en: "Exclusively available for farmers growing Ragi or notified millets."
            }
          };
        }
        if (fruits_id === "no") {
          return {
            eligible: false,
            almost: true,
            reason: scheme.reason,
            missing: {
              kn: "ಕರ್ನಾಟಕ ಫ್ರೂಟ್ಸ್ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ FID ನೋಂದಣಿ ಮಾಡಿಸಿಕೊಳ್ಳುವುದು ಕಡ್ಡಾಯ.",
              en: "Karnataka FRUITS registration is mandatory to receive DBT incentive."
            }
          };
        }
        return { eligible: true, almost: false, reason: scheme.reason, missing: null };
      }

      case "krishi_bhagya": {
        // Karnataka farm ponds for rainfed/drylands
        if (irrigation === "canal") {
          return {
            eligible: false,
            almost: false,
            reason: scheme.reason,
            missing: {
              kn: "ಕಾಲುವೆ ನೀರಾವರಿ ಪ್ರದೇಶಗಳಿಗೆ ಅನ್ವಯಿಸುವುದಿಲ್ಲ, ಮಳೆಯಾಶ್ರಿತ/ಬೋರ್‌ವೆಲ್ ಜಮೀನಿಗೆ ಮೀಸಲು.",
              en: "Not applicable to canal command zones; targeted at dryland/rainfed farms."
            }
          };
        }
        if (fruits_id === "no") {
          return {
            eligible: false,
            almost: true,
            reason: scheme.reason,
            missing: {
              kn: "ಫ್ರೂಟ್ಸ್ (FRUITS) ಐಡಿ ಮತ್ತು ಪಹಣಿಯಲ್ಲಿ ಜಮೀನಿನ ನಕ್ಷೆ ಮ್ಯಾಪಿಂಗ್ ಅಗತ್ಯ.",
              en: "FRUITS ID and RTC survey mapping required for site GPS approval."
            }
          };
        }
        return { eligible: true, almost: false, reason: scheme.reason, missing: null };
      }

      default:
        return { eligible: true, almost: false, reason: scheme.reason, missing: null };
    }
  },

  // -------------------------------------------------------------
  // Bookmarks & Application Tracking
  // -------------------------------------------------------------
  getSavedSchemeIds() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.SAVED_SCHEMES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async toggleSaveScheme(schemeId) {
    await this._delay(50);
    const sid = String(schemeId);
    let ids = this.getSavedSchemeIds().map(String);
    const index = ids.indexOf(sid);
    let isSaved = false;
    if (index > -1) {
      ids.splice(index, 1);
      isSaved = false;
    } else {
      ids.push(sid);
      isSaved = true;
    }
    localStorage.setItem(this.STORAGE_KEYS.SAVED_SCHEMES, JSON.stringify(ids));
    return isSaved;
  },

  getAppliedSchemeIds() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.APPLIED_SCHEMES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async markSchemeApplied(schemeId) {
    await this._delay(100);
    const sid = String(schemeId);
    let ids = this.getAppliedSchemeIds().map(String);
    if (!ids.includes(sid)) {
      ids.push(sid);
      localStorage.setItem(this.STORAGE_KEYS.APPLIED_SCHEMES, JSON.stringify(ids));
    }
    return true;
  },

  // -------------------------------------------------------------
  // Documents & Checklist
  // -------------------------------------------------------------
  async getDocumentsGuide() {
    await this._delay(100);
    return MOCK_DATA.documentsGuide;
  },

  getDocumentChecklist(schemeId) {
    try {
      const allChecklists = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DOC_CHECKLIST) || "{}");
      return allChecklists[String(schemeId)] || [];
    } catch {
      return [];
    }
  },

  toggleDocumentCheck(schemeId, docId) {
    try {
      const key = String(schemeId);
      const allChecklists = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DOC_CHECKLIST) || "{}");
      let list = allChecklists[key] || [];
      const idx = list.indexOf(docId);
      if (idx > -1) {
        list.splice(idx, 1);
      } else {
        list.push(docId);
      }
      allChecklists[key] = list;
      localStorage.setItem(this.STORAGE_KEYS.DOC_CHECKLIST, JSON.stringify(allChecklists));
      return list.includes(docId);
    } catch {
      return false;
    }
  },

  // -------------------------------------------------------------
  // Tips & Reminders
  // -------------------------------------------------------------
  async getTips() {
    await this._delay(100);
    return MOCK_DATA.tipsAndReminders;
  }
};
