/**
 * Krishi Mitra - Data Service & API Abstraction
 * All data operations and mock endpoints live here.
 * When the real FastAPI backend is ready, replace the mock implementations
 * with fetch() calls while preserving the exact same method signatures.
 */

const ApiService = {
  STORAGE_KEYS: {
    USER_SESSION: "km_user_session",
    PROFILE_DATA: "km_farmer_profile",
    WIZARD_PROGRESS: "km_wizard_progress",
    SAVED_SCHEMES: "km_saved_schemes",
    APPLIED_SCHEMES: "km_applied_schemes",
    DOC_CHECKLIST: "km_doc_checklist",
    LANGUAGE: "km_selected_language"
  },

  // Simulated latency for realistic UX feel (e.g., 200ms)
  _delay(ms = 150) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      const resp = await fetch("http://127.0.0.1:8000/api/v1/database/farmers/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmer_unique_id: cleanId, password: cleanPass })
      });

      if (resp.ok) {
        const data = await resp.json();
        const profile = this._normalizeBackendFarmerPayload(data, cleanId);
        const session = {
          farmer_unique_id: profile.farmer_unique_id || cleanId,
          phone: profile.mobile_number || "",
          full_name: profile.full_name || cleanId,
          loggedInAt: new Date().toISOString(),
          isNewUser: false
        };
        localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
        localStorage.setItem(this.STORAGE_KEYS.PROFILE_DATA, JSON.stringify(profile));
        try {
          localStorage.setItem("krishi_farmer_profile", JSON.stringify({
            ...data,
            authenticated: true,
            logged_in_at: session.loggedInAt
          }));
        } catch (_) {}
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
        const profile = this._normalizeBackendFarmerPayload(mockRaw, upperId);
        const session = {
          farmer_unique_id: upperId,
          phone: profile.mobile_number,
          full_name: profile.full_name,
          loggedInAt: new Date().toISOString(),
          isNewUser: false
        };
        localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
        localStorage.setItem(this.STORAGE_KEYS.PROFILE_DATA, JSON.stringify(profile));
        return session;
      }
      throw netErr;
    }
  },

  async loadFarmerFromBackend(farmerId) {
    try {
      const resp = await fetch(`http://127.0.0.1:8000/api/v1/database/farmers/${encodeURIComponent(farmerId)}`);
      if (resp.ok) {
        const data = await resp.json();
        const profile = this._normalizeBackendFarmerPayload(data, farmerId);
        const session = {
          farmer_unique_id: profile.farmer_unique_id || farmerId,
          phone: profile.mobile_number || "",
          full_name: profile.full_name || profile.farmer_unique_id || farmerId,
          loggedInAt: new Date().toISOString(),
          isNewUser: false
        };
        localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
        localStorage.setItem(this.STORAGE_KEYS.PROFILE_DATA, JSON.stringify(profile));
        try {
          localStorage.setItem("krishi_farmer_profile", JSON.stringify({
            ...data,
            authenticated: true,
            logged_in_at: session.loggedInAt
          }));
        } catch (_) {}
        return profile;
      }
    } catch (e) {
      console.warn("Could not load farmer profile from backend:", e);
    }
    return null;
  },

  async updateFarmerProfile(identifier, payload) {
    const resp = await fetch(`http://127.0.0.1:8000/api/v1/database/farmers/${encodeURIComponent(identifier)}`, {
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

    const profile = this._normalizeBackendFarmerPayload(data, data.farmer_unique_id || identifier);
    const session = {
      farmer_unique_id: profile.farmer_unique_id || identifier,
      phone: profile.mobile_number || "",
      full_name: profile.full_name || profile.farmer_unique_id || identifier,
      loggedInAt: new Date().toISOString(),
      isNewUser: false
    };
    localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
    localStorage.setItem(this.STORAGE_KEYS.PROFILE_DATA, JSON.stringify(profile));
    try {
      localStorage.setItem("krishi_farmer_profile", JSON.stringify({
        ...data,
        authenticated: true,
        logged_in_at: session.loggedInAt
      }));
    } catch (_) {}

    return { response: data, profile, session };
  },

  async getLocationStates() {
    const resp = await fetch("http://127.0.0.1:8000/api/v1/database/locations/states");
    if (!resp.ok) throw new Error("Failed to load states from LGD directory.");
    return await resp.json();
  },

  async getLocationDistricts(state) {
    const resp = await fetch(`http://127.0.0.1:8000/api/v1/database/locations/districts?state=${encodeURIComponent(state)}`);
    if (!resp.ok) throw new Error("Failed to load districts from LGD directory.");
    return await resp.json();
  },

  async getLocationSubDistricts(state, district) {
    const resp = await fetch(`http://127.0.0.1:8000/api/v1/database/locations/sub-districts?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
    if (!resp.ok) throw new Error("Failed to load sub-districts from LGD directory.");
    return await resp.json();
  },

  async getLocationVillages(state, district, subDistrict) {
    const resp = await fetch(`http://127.0.0.1:8000/api/v1/database/locations/villages?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&sub_district=${encodeURIComponent(subDistrict)}`);
    if (!resp.ok) throw new Error("Failed to load villages from LGD directory.");
    return await resp.json();
  },

  getSession() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.USER_SESSION);
      if (data) return JSON.parse(data);
      // Hydrate from shared krishi_farmer_profile (e.g., login from index.html Offcanvas or page-login.html)
      const sharedRaw = localStorage.getItem("krishi_farmer_profile");
      if (sharedRaw) {
        const shared = JSON.parse(sharedRaw);
        if (shared && shared.farmer) {
          const profile = this._normalizeBackendFarmerPayload(shared, shared.farmer.farmer_unique_id || "");
          const session = {
            farmer_unique_id: profile.farmer_unique_id,
            phone: profile.mobile_number || "",
            full_name: profile.full_name,
            loggedInAt: shared.logged_in_at || new Date().toISOString(),
            isNewUser: false
          };
          localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
          localStorage.setItem(this.STORAGE_KEYS.PROFILE_DATA, JSON.stringify(profile));
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
    localStorage.removeItem("krishi_farmer_profile");
    localStorage.removeItem("krishi_farmer_id");
    return true;
  },

  async deleteUserData() {
    await this._delay(200);
    // Clear all Krishi Mitra keys
    Object.values(this.STORAGE_KEYS).forEach(key => {
      if (key !== this.STORAGE_KEYS.LANGUAGE) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem("krishi_farmer_profile");
    localStorage.removeItem("krishi_farmer_id");
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
  // Schemes & Dynamic Eligibility Engine
  // -------------------------------------------------------------
  async getSchemes() {
    await this._delay(250);
    const profile = await this.getProfile();
    const savedIds = this.getSavedSchemeIds();
    const appliedIds = this.getAppliedSchemeIds();

    const evaluatedSchemes = MOCK_DATA.schemes.map(scheme => {
      const evalResult = this._evaluateScheme(scheme, profile);
      return {
        ...scheme,
        eligible: evalResult.eligible,
        almost: evalResult.almost,
        matchReason: evalResult.reason,
        missingReason: evalResult.missing,
        isSaved: savedIds.includes(scheme.id),
        isApplied: appliedIds.includes(scheme.id)
      };
    });

    return evaluatedSchemes;
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
    let ids = this.getSavedSchemeIds();
    const index = ids.indexOf(schemeId);
    let isSaved = false;
    if (index > -1) {
      ids.splice(index, 1);
      isSaved = false;
    } else {
      ids.push(schemeId);
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
    let ids = this.getAppliedSchemeIds();
    if (!ids.includes(schemeId)) {
      ids.push(schemeId);
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
      return allChecklists[schemeId] || [];
    } catch {
      return [];
    }
  },

  toggleDocumentCheck(schemeId, docId) {
    try {
      const allChecklists = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.DOC_CHECKLIST) || "{}");
      let list = allChecklists[schemeId] || [];
      const idx = list.indexOf(docId);
      if (idx > -1) {
        list.splice(idx, 1);
      } else {
        list.push(docId);
      }
      allChecklists[schemeId] = list;
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
