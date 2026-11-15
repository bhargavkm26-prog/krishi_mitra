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

  getSession() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEYS.USER_SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async logout() {
    await this._delay(100);
    localStorage.removeItem(this.STORAGE_KEYS.USER_SESSION);
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
