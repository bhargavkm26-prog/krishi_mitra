/**
 * Krishi Mitra (ಕೃಷಿ ಮಿತ್ರ) - Main Application Controller
 * Handles routing, view rendering, language switching, voice wizard,
 * scheme filtering/sorting, search, document checklists, and local persistence.
 */

class KrishiMitraApp {
  constructor() {
    this.currentLang = localStorage.getItem(ApiService.STORAGE_KEYS.LANGUAGE) || "en";
    this.currentView = "login"; // 'login', 'wizard', 'main'
    this.currentTab = "eligible"; // 'eligible', 'almost', 'saved'
    this.currentBottomNav = "home"; // 'home', 'docs', 'tips', 'help'
    this.activeFilter = "all";
    this.sortBy = "benefit_desc";
    this.searchQuery = "";

    // Wizard state
    this.wizardStepIndex = 0;
    this.wizardAnswers = {};
    this.stagedVoiceAnswer = null; // Staged voice answer awaiting farmer confirmation

    // Data cache & live backend telemetry
    this.profile = null;
    this.schemes = [];
    this.documentsGuide = [];
    this.tips = [];
    this.selectedScheme = null;
    this.backendHealth = null;
    this.isBackendOnline = true;
    this.isGemmaHealthy = false;
    this.catalogMode = false;
    this.catalogOffset = 0;
    this.catalogTotal = 0;
    this._gemmaQueueRunning = false;
    this._gemmaRunToken = 0;
    this._searchDebounceTimer = null;

    // Ticker state
    this.tickerInterval = null;
    this.tickerIndex = 0;
    this.isTickerPaused = false;
  }

  _escapeHtml(val) {
    return String(val ?? "").replace(/[&<>"']/g, m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m]));
  }

  _safeHttpUrl(raw) {
    try {
      const parsed = new URL(String(raw || "").trim());
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
    } catch (_) { }
    return null;
  }

  _buildAiChatUrl() {
    const params = new URLSearchParams();
    const uid = this.profile?.farmer_unique_id || ApiService.getSession()?.farmer_unique_id;
    const fid = this.profile?.farmer_id || ApiService.getSession()?.farmer_id;
    if (uid) params.set("farmer", uid);
    if (fid) params.set("farmer_id", String(fid));
    const qs = params.toString();
    return qs ? `ai_chat.html?${qs}` : "ai_chat.html";
  }

  syncAiChatLinks() {
    const href = this._buildAiChatUrl();
    [
      "top-nav-krishi-ai",
      "mobile-header-ai",
      "btn-hero-krishi-ai",
      "btn-engine-krishi-ai",
      "docs-link-krishi-ai",
      "bottom-nav-krishi-ai",
      "drawer-link-krishi-ai"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute("href", href);
    });
  }

  async init() {
    // Set speech controller language
    if (window.speechController) {
      window.speechController.setLanguage(this.currentLang);
    }

    // Check URL parameters for direct farmer login (e.g. ?farmer=KM26@0001)
    const urlParams = new URLSearchParams(window.location.search);
    const farmerIdParam = urlParams.get("farmer");
    if (farmerIdParam) {
      const backendProfile = await ApiService.loadFarmerFromBackend(farmerIdParam);
      if (backendProfile) {
        this.profile = backendProfile;
      }
    }

    // Check existing session
    const session = ApiService.getSession();
    const savedProfile = await ApiService.getProfile();
    if (!this.profile) this.profile = savedProfile;

    // Route to appropriate view
    if (session || this.profile) {
      const wizardProgress = ApiService.getWizardProgress();
      if (wizardProgress && !localStorage.getItem(ApiService.STORAGE_KEYS.PROFILE_DATA)) {
        this.wizardStepIndex = wizardProgress.stepIndex || 0;
        this.wizardAnswers = wizardProgress.answers || {};
        this.showView("wizard");
      } else {
        this.showView("main");
      }
    } else {
      this.showView("login");
    }

    // Check backend health before loading schemes so Stage 2 Gemma availability is known
    await this.checkBackendHealth();
    await this.refreshData();
    this.bindGlobalEvents();
    this.renderAll();
    this.initTipsTicker();
  }

  async checkBackendHealth() {
    const banner = document.getElementById("offline-alert-bar");
    const bannerText = document.getElementById("offline-alert-text");

    const health = await ApiService.getConsolidatedHealth();
    this.backendHealth = health;
    const pgOk = Boolean(health?.subsystems?.postgresql_pgvector?.healthy);
    const gemmaOk = Boolean(health?.subsystems?.gemma_4_e4b_reasoning_server?.healthy);

    this.isBackendOnline = pgOk;
    this.isGemmaHealthy = gemmaOk;

    if (!pgOk) {
      if (banner) banner.style.display = "flex";
      if (bannerText) {
        bannerText.textContent = (typeof navigator !== "undefined" && navigator.onLine === false)
          ? this.t("offlineTitle")
          : "Backend PostgreSQL / FastAPI (:8000) offline — showing cached offline fallback";
      }
    } else {
      if (banner) banner.style.display = "none";
    }
  }

  // -------------------------------------------------------------
  // Internationalization & Translation Helper
  // -------------------------------------------------------------
  t(key, params = {}) {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.kn;
    let text = dict[key] || TRANSLATIONS.en[key] || key;
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
    return text;
  }

  setLanguage(lang) {
    if (this.currentLang === lang) return;
    this.currentLang = lang;
    localStorage.setItem(ApiService.STORAGE_KEYS.LANGUAGE, this.currentLang);
    if (window.speechController) {
      window.speechController.setLanguage(this.currentLang);
    }
    this.renderAll();
  }

  toggleLanguage() {
    this.setLanguage(this.currentLang === "kn" ? "en" : "kn");
  }

  // -------------------------------------------------------------
  // View & Tab Switching
  // -------------------------------------------------------------
  showView(viewName) {
    this.currentView = viewName;
    document.body.dataset.currentView = viewName;
    document.querySelectorAll(".view-container").forEach(el => el.classList.remove("active"));
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.classList.add("active");
      window.scrollTo(0, 0);
    }

    // Hide or show top navbar depending on view
    const header = document.querySelector(".site-header");
    if (header) {
      // Hide top navbar on login screen (so the clean full-screen farm hero matches the reference)
      header.style.display = (viewName === "login") ? "none" : "block";
    }

    const bottomNav = document.querySelector(".bottom-navbar");
    if (bottomNav) {
      bottomNav.style.display = (viewName === "login" || viewName === "wizard") ? "none" : "";
    }
  }

  setBottomNav(tabName) {
    this.currentBottomNav = tabName;
    document.querySelectorAll(".bottom-nav-item").forEach(item => {
      item.classList.toggle("active", item.dataset.tab === tabName);
    });

    document.querySelectorAll(".main-subpage").forEach(page => page.classList.remove("active"));
    const targetSubpage = document.getElementById(`subpage-${tabName}`);
    if (targetSubpage) {
      targetSubpage.classList.add("active");
      window.scrollTo(0, 0);
    }

    if (tabName === "docs") {
      this.renderDocumentsPage();
    } else if (tabName === "tips") {
      this.renderTipsPage();
    } else if (tabName === "help") {
      this.renderHelpPage();
    } else {
      this.renderSchemesList();
    }
  }

  setSchemeTab(tabName) {
    this.currentTab = tabName;

    // Update subpage tabs
    document.querySelectorAll(".scheme-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    // Update top nav links
    document.querySelectorAll(".nav-menu-link").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    // Ensure we are on home subpage
    if (this.currentBottomNav !== "home") {
      this.setBottomNav("home");
    }

    this.renderSchemesList();
  }

  // -------------------------------------------------------------
  // Data Loading & Syncing (Two-Stage BGE-M3 + Gemma Wing 1)
  // -------------------------------------------------------------
  async refreshData(options = {}) {
    this._gemmaRunToken += 1;
    this._gemmaQueueRunning = false;
    this.catalogMode = Boolean(options.catalogMode);

    try {
      this.profile = await ApiService.getProfile();
      this.schemes = await ApiService.getSchemes({
        search: options.search ?? this.searchQuery,
        category: options.category ?? this.activeFilter
      });
      this.documentsGuide = await ApiService.getDocumentsGuide();
      this.tips = await ApiService.getTips();

      const loadMoreWrap = document.getElementById("schemes-pagination-wrap");
      if (loadMoreWrap && !this.catalogMode) {
        loadMoreWrap.style.display = "none";
      }

      // Auto-select tab cleanly on initial load if no cached ELIGIBLE schemes exist yet
      if (this.currentView === "main" && !options.preserveTab) {
        const hasEligible = this.schemes.some(s => s.eligible);
        if (hasEligible) {
          this.currentTab = "eligible";
        } else if (this.schemes.some(s => !s.eligible && s.almost)) {
          this.currentTab = "eligible";
        }
      }

      this._updateEngineStatusBar();

      // Launch background Stage 2 sequential evaluation for top 3 unevaluated schemes when Gemma is ready
      if (this.currentView === "main" && !this.schemes._isOfflineFallback && this.profile?.farmer_id && this.isGemmaHealthy && !options.skipAutoEval) {
        this.runGemmaEvaluationQueue(3);
      }
    } catch (err) {
      console.error("Data refresh failed", err);
    }
  }

  _updateEngineStatusBar(extraText = "") {
    const bar = document.getElementById("schemes-engine-status");
    const batchBtn = document.getElementById("btn-run-ai-batch");
    if (!bar) return;

    if (this.schemes._isOfflineFallback) {
      bar.textContent = "Offline Cached Mode • Displaying local Karnataka baseline schemes";
      if (batchBtn) batchBtn.disabled = true;
      return;
    }

    const total = this.schemes.length;
    const evalCount = this.schemes.filter(s => s.isEvaluated).length;
    const eligibleCount = this.schemes.filter(s => s.eligible).length;
    const ineligibleCount = this.schemes.filter(s => s.ineligible).length;
    const prefix = this.catalogMode
      ? `PostgreSQL Catalog: ${total} of ${this.catalogTotal || total} loaded`
      : `Stage 1 (BGE-M3): ${total} matched schemes`;
    const gemmaPart = this.isGemmaHealthy
      ? `Stage 2 (Gemma 4): ${evalCount} audited (${eligibleCount} Eligible${ineligibleCount ? `, ${ineligibleCount} Ineligible` : ""})`
      : "Gemma 4 (:8080) offline";

    bar.textContent = extraText ? `${prefix} • ${extraText}` : `${prefix} • ${gemmaPart}`;
    if (batchBtn) {
      batchBtn.disabled = !this.profile?.farmer_id || !this.isGemmaHealthy || this._gemmaQueueRunning;
    }
  }

  async loadCatalogPage(reset = false) {
    this._gemmaRunToken += 1;
    this._gemmaQueueRunning = false;
    this.catalogMode = true;
    if (reset) this.catalogOffset = 0;

    const stateFilter = this.profile?.state || "";
    const statusEl = document.getElementById("schemes-engine-status");
    if (statusEl) statusEl.textContent = "Loading official schemes from PostgreSQL catalog...";

    try {
      const res = await ApiService.listSchemes({
        search: this.searchQuery,
        state: stateFilter,
        limit: 20,
        offset: this.catalogOffset
      });
      this.catalogTotal = res.total || 0;
      const savedIds = ApiService.getSavedSchemeIds();
      const appliedIds = ApiService.getAppliedSchemeIds();
      const mapped = (res.schemes || []).map(s =>
        ApiService.normalizeBackendScheme(s, { profile: this.profile, savedIds, appliedIds, source: "sql" })
      );

      if (reset) {
        this.schemes = mapped;
      } else {
        const existingIds = new Set(this.schemes.map(x => String(x.id)));
        mapped.forEach(item => {
          if (!existingIds.has(String(item.id))) this.schemes.push(item);
        });
      }
      this.catalogOffset += mapped.length;

      const loadMoreWrap = document.getElementById("schemes-pagination-wrap");
      const loadMoreBtn = document.getElementById("btn-load-more-schemes");
      if (loadMoreWrap && loadMoreBtn) {
        const hasMore = this.catalogOffset < this.catalogTotal;
        loadMoreWrap.style.display = hasMore ? "flex" : "none";
        loadMoreBtn.textContent = `Load Next 20 Schemes (${this.schemes.length} / ${this.catalogTotal})`;
      }

      if (!this.schemes.some(s => s.eligible)) {
        this.setSchemeTab("almost");
      } else {
        this.renderBenefitBanner();
        this.renderSchemeTabsBadges();
        this.renderSchemesList();
      }
      this._updateEngineStatusBar();
    } catch (err) {
      this.showToast(err.message || "Failed to load schemes from PostgreSQL catalog.");
      this._updateEngineStatusBar();
    }
  }

  async evaluateSingleSchemeCard(scheme) {
    const farmerId = this.profile?.farmer_id;
    if (!farmerId) {
      this.showToast("Sign in with a PostgreSQL Farmer Account to run Gemma AI eligibility verification.");
      return null;
    }
    if (!this.isGemmaHealthy) {
      await this.checkBackendHealth();
      if (!this.isGemmaHealthy) {
        this.showToast("Gemma 4 server (port 8080) is offline. Start start_gemma.bat to run AI evaluation.");
        return null;
      }
    }

    try {
      this._updateEngineStatusBar(`Gemma 4 Auditing: ${scheme.name.en.slice(0, 32)}...`);
      const res = await ApiService.evaluateEligibility(farmerId, scheme.id);
      const updated = ApiService.applyGemmaVerdictToScheme(scheme, res);
      Object.assign(scheme, updated);
      this.renderBenefitBanner();
      this.renderSchemeTabsBadges();
      this.renderSchemesList();
      this._updateEngineStatusBar();
      return scheme;
    } catch (err) {
      this.showToast(err.message || "Gemma evaluation failed.");
      this._updateEngineStatusBar();
      return null;
    }
  }

  async runGemmaEvaluationQueue(maxCount = 4) {
    if (this._gemmaQueueRunning || !this.profile?.farmer_id || !this.isGemmaHealthy) return;
    const candidates = this.schemes
      .filter(s => !s.isEvaluated && !s.isOfflineMock && Number.isFinite(Number(s.id)))
      .slice(0, maxCount);

    if (!candidates.length) {
      this._updateEngineStatusBar();
      return;
    }

    const token = ++this._gemmaRunToken;
    this._gemmaQueueRunning = true;
    this._updateEngineStatusBar(`Stage 2 (Gemma 4): Auditing 1/${candidates.length}...`);

    for (let i = 0; i < candidates.length; i++) {
      if (token !== this._gemmaRunToken || this.currentView !== "main") break;
      const item = candidates[i];
      this._updateEngineStatusBar(`Stage 2 (Gemma 4): Checking ${i + 1}/${candidates.length} — ${item.name.en.slice(0, 28)}...`);
      try {
        const res = await ApiService.evaluateEligibility(this.profile.farmer_id, item.id);
        if (token !== this._gemmaRunToken) break;
        const updated = ApiService.applyGemmaVerdictToScheme(item, res);
        Object.assign(item, updated);
        this.renderBenefitBanner();
        this.renderSchemeTabsBadges();
        this.renderSchemesList();
      } catch (err) {
        console.warn("Sequential Gemma evaluate skipped scheme", item.id, err);
        break;
      }
    }

    if (token === this._gemmaRunToken) {
      this._gemmaQueueRunning = false;
      this._updateEngineStatusBar();
    }
  }

  // -------------------------------------------------------------
  // Full UI Rendering Engine
  // -------------------------------------------------------------
  renderAll() {
    this.updateStaticText();
    this.updateLanguageToggleButtons();
    this.syncAiChatLinks();

    if (this.currentView === "login") {
      this.renderLoginView();
    } else if (this.currentView === "wizard") {
      this.renderWizardStep();
    } else if (this.currentView === "main") {
      this.renderBenefitBanner();
      this.renderSchemeTabsBadges();
      this.renderSchemesList();
      this.renderTipsTickerItem();
      if (this.currentBottomNav === "docs") this.renderDocumentsPage();
      if (this.currentBottomNav === "tips") this.renderTipsPage();
      if (this.currentBottomNav === "help") this.renderHelpPage();
    }
  }

  updateStaticText() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      el.textContent = this.t(key);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      const key = el.getAttribute("data-i18n-html");
      el.innerHTML = this.t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.setAttribute("placeholder", this.t(key));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      el.setAttribute("title", this.t(key));
    });
    const bannerText = document.getElementById("offline-alert-text");
    if (bannerText && navigator.onLine && !this.isBackendOnline) {
      bannerText.textContent = "Backend PostgreSQL / FastAPI (:8000) offline — showing cached offline fallback";
    }
  }

  updateLanguageToggleButtons() {
    const text = this.currentLang === "kn" ? "English" : "ಕನ್ನಡ";
    document.querySelectorAll(".lang-toggle-pill").forEach(btn => {
      const span = btn.querySelector(".lang-text-display");
      if (span) {
        span.textContent = text;
      } else {
        btn.textContent = text;
      }
    });

    // Update login pill capsule [ ಕನ್ನಡ | English ]
    document.querySelectorAll(".login-lang-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === this.currentLang);
    });
  }

  // -------------------------------------------------------------
  // PAGE 1: Login & OTP Handler
  // -------------------------------------------------------------
  renderLoginView() {
    const otpError = document.getElementById("otp-error-msg");
    const phoneError = document.getElementById("phone-error-msg");
    if (otpError) otpError.textContent = "";
    if (phoneError) phoneError.textContent = "";
  }

  async handleSendOtp() {
    const phoneInput = document.getElementById("login-phone");
    const passInput = document.getElementById("login-password");
    const phoneError = document.getElementById("phone-error-msg");
    const identifier = phoneInput ? phoneInput.value.trim() : "";
    const password = passInput ? passInput.value.trim() : "";

    // 1. Direct User ID + Plain Password Authentication (per user rule)
    if (password || identifier.toUpperCase().startsWith("KM") || identifier.includes("@")) {
      if (!identifier) {
        if (phoneError) phoneError.textContent = "Please enter your Farmer Unique ID or Mobile Number.";
        return;
      }
      if (!password) {
        if (phoneError) phoneError.textContent = "Please enter your password.";
        return;
      }

      if (phoneError) phoneError.textContent = "";
      const submitBtn = document.getElementById("btn-send-otp");
      const origText = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Verifying...';
      }

      try {
        const session = await ApiService.loginWithCredentials(identifier, password);
        if (phoneError) phoneError.textContent = "";
        this.profile = await ApiService.getProfile();
        this.showView("main");
        await this.checkBackendHealth();
        await this.refreshData();
        this.renderAll();
      } catch (err) {
        if (phoneError) phoneError.textContent = err.message || "Invalid User ID or Password.";
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText || '<i class="fa-solid fa-arrow-right-to-bracket me-2"></i>Sign In to Dashboard';
        }
      }
      return;
    }

    // 2. Legacy Phone + OTP fallback flow
    const phone = identifier;
    if (!phone || phone.length !== 10 || !/^\d{10}$/.test(phone)) {
      if (phoneError) phoneError.textContent = this.t("phoneError");
      return;
    }
    if (phoneError) phoneError.textContent = "";

    // Show OTP container
    const phoneContainer = document.getElementById("phone-step-container");
    const otpContainer = document.getElementById("otp-step-container");
    if (phoneContainer) phoneContainer.style.display = "none";
    if (otpContainer) otpContainer.style.display = "block";
    const otpSentPhone = document.getElementById("otp-sent-phone");
    if (otpSentPhone) otpSentPhone.textContent = `+91 ${phone}`;

    const otpInput = document.getElementById("login-otp");
    if (otpInput) {
      otpInput.value = "";
      otpInput.focus();
    }
  }

  async handleVerifyOtp() {
    const phoneInput = document.getElementById("login-phone");
    const otpInput = document.getElementById("login-otp");
    const otpError = document.getElementById("otp-error-msg");
    const phone = phoneInput.value.trim();
    const otp = otpInput.value.trim();

    try {
      const session = await ApiService.login(phone, otp);
      if (otpError) otpError.textContent = "";

      // If user has not completed profile wizard, show wizard; else go to main
      const savedProfile = localStorage.getItem(ApiService.STORAGE_KEYS.PROFILE_DATA);
      if (!savedProfile) {
        this.wizardStepIndex = 0;
        this.wizardAnswers = { district: "mandya" };
        this.showView("wizard");
        await this.checkBackendHealth();
        await this.refreshData();
        this.renderWizardStep();
      } else {
        this.showView("main");
        await this.checkBackendHealth();
        await this.refreshData();
        this.renderAll();
      }
    } catch (err) {
      if (otpError) otpError.textContent = this.t("otpError");
    }
  }

  resetLoginStep() {
    const phoneStep = document.getElementById("phone-step-container");
    const otpStep = document.getElementById("otp-step-container");
    if (phoneStep) phoneStep.style.display = "block";
    if (otpStep) otpStep.style.display = "none";
    const otpInput = document.getElementById("login-otp");
    if (otpInput) otpInput.value = "";
    const passInput = document.getElementById("login-password");
    if (passInput) passInput.value = "";
  }

  fillDemoOtp() {
    const otpInput = document.getElementById("login-otp");
    if (otpInput) {
      otpInput.value = "1234";
      this.handleVerifyOtp();
    }
  }

  // -------------------------------------------------------------
  // PAGE 2: Farmer Profile Wizard (1 question per screen)
  // -------------------------------------------------------------
  renderWizardStep() {
    const qList = MOCK_DATA.questions;
    const currentQ = qList[this.wizardStepIndex];
    if (!currentQ) return;

    const regPanel = document.getElementById("wizard-register-panel");
    if (regPanel) regPanel.style.display = "none";

    // Update Progress
    const total = qList.length;
    const currentNum = this.wizardStepIndex + 1;
    const pct = Math.round((currentNum / total) * 100);

    const stepLabel = document.getElementById("wizard-step-label");
    if (stepLabel) {
      stepLabel.textContent = this.t("wizardStepOf", { current: currentNum, total: total });
    }
    const progressBar = document.getElementById("wizard-progress-bar");
    if (progressBar) {
      progressBar.style.width = `${pct}%`;
    }

    // Question Title & Subtitle
    const titleEl = document.getElementById("wizard-q-title");
    const subEl = document.getElementById("wizard-q-sub");
    if (titleEl) titleEl.textContent = this.t(`q_${currentQ.id}`);
    if (subEl) subEl.textContent = this.t(`q_${currentQ.id}_sub`);

    // Reset voice confirmation box
    const voiceConfirmBox = document.getElementById("voice-confirm-box");
    if (voiceConfirmBox) voiceConfirmBox.style.display = "none";
    this.stagedVoiceAnswer = null;

    // Reset Speech Status
    const voiceStatus = document.getElementById("voice-status-text");
    if (voiceStatus) voiceStatus.textContent = this.t("voicePrompt");

    // Render Answer Options
    const optionsContainer = document.getElementById("wizard-options-container");
    if (!optionsContainer) return;
    optionsContainer.innerHTML = "";

    const currentValue = this.wizardAnswers[currentQ.id] || "";

    if (currentQ.type === "select") {
      const selectWrapper = document.createElement("div");
      selectWrapper.className = "district-select-grid";

      const selectEl = document.createElement("select");
      selectEl.className = "form-select-large";
      selectEl.id = `input-${currentQ.id}`;

      const placeholderOpt = document.createElement("option");
      placeholderOpt.value = "";
      placeholderOpt.textContent = `-- ${this.t('selectPlaceholder')} --`;
      selectEl.appendChild(placeholderOpt);

      currentQ.options.forEach(opt => {
        const optionEl = document.createElement("option");
        optionEl.value = opt.id;
        optionEl.textContent = opt[this.currentLang] || opt.en;
        if (opt.id === currentValue) optionEl.selected = true;
        selectEl.appendChild(optionEl);
      });

      selectEl.onchange = (e) => {
        this.setAnswer(currentQ.id, e.target.value);
      };

      selectWrapper.appendChild(selectEl);

      // Render top popular districts as fast tap chips
      const popularDiv = document.createElement("div");
      popularDiv.className = "quick-chips-row";
      const popularIds = ["mandya", "mysuru", "belagavi", "hassan", "shivamogga", "tumakuru"];
      popularIds.forEach(pId => {
        const opt = currentQ.options.find(o => o.id === pId);
        if (opt) {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = `quick-chip ${currentValue === pId ? 'selected' : ''}`;
          chip.textContent = opt[this.currentLang];
          chip.onclick = () => {
            selectEl.value = pId;
            this.setAnswer(currentQ.id, pId);
          };
          popularDiv.appendChild(chip);
        }
      });

      selectWrapper.appendChild(popularDiv);
      optionsContainer.appendChild(selectWrapper);

    } else if (currentQ.type === "button_group" || currentQ.type === "yes_no") {
      const grid = document.createElement("div");
      grid.className = currentQ.options.length <= 2 ? "options-grid-2" : "options-grid-cards";

      currentQ.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `option-card-btn ${currentValue === opt.id ? 'selected' : ''}`;

        const iconHtml = this.getOptionIconSvg(opt.icon || currentQ.icon);
        btn.innerHTML = `
          <div class="opt-icon">${iconHtml}</div>
          <div class="opt-text">${opt[this.currentLang] || opt.en}</div>
          ${currentValue === opt.id ? '<div class="opt-check">✔</div>' : ''}
        `;

        btn.onclick = () => {
          this.setAnswer(currentQ.id, opt.id);
        };
        grid.appendChild(btn);
      });

      optionsContainer.appendChild(grid);

    } else if (currentQ.type === "number_or_choice") {
      const container = document.createElement("div");
      container.className = "numeric-choice-container";

      const grid = document.createElement("div");
      grid.className = "options-grid-cards";

      currentQ.options.forEach(opt => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `option-card-btn ${currentValue === opt.id ? 'selected' : ''}`;

        btn.innerHTML = `
          <div class="opt-badge">${opt.value || opt.id}</div>
          <div class="opt-text">${opt[this.currentLang] || opt.en}</div>
          ${currentValue === opt.id ? '<div class="opt-check">✔</div>' : ''}
        `;

        btn.onclick = () => {
          this.setAnswer(currentQ.id, opt.id);
        };
        grid.appendChild(btn);
      });

      container.appendChild(grid);

      // Direct numeric entry option
      const manualRow = document.createElement("div");
      manualRow.className = "manual-num-row";
      manualRow.innerHTML = `
        <label>${this.t("numericHint")}</label>
        <div class="input-with-unit">
          <input type="number" id="manual-num-input" class="manual-input" step="0.5" min="0.5" max="100" placeholder="${currentQ.id === 'land_size' ? '2.0' : '35'}" value="${!['1', '2', '5', '10', 'young', 'middle', 'senior'].includes(currentValue) ? currentValue : ''}">
          <span class="unit-badge">${currentQ.unit ? (this.currentLang === 'kn' ? 'ಎಕರೆ' : 'Acres') : (this.currentLang === 'kn' ? 'ವರ್ಷ' : 'Years')}</span>
          <button type="button" class="btn-sm-apply" id="btn-apply-num">✔</button>
        </div>
      `;
      container.appendChild(manualRow);
      optionsContainer.appendChild(container);

      const applyBtn = manualRow.querySelector("#btn-apply-num");
      const numInput = manualRow.querySelector("#manual-num-input");
      if (applyBtn && numInput) {
        applyBtn.onclick = () => {
          const val = numInput.value.trim();
          if (val) {
            this.setAnswer(currentQ.id, val);
          }
        };
      }
    }

    // Update Back & Next Button States
    const backBtn = document.getElementById("wizard-back-btn");
    const nextBtn = document.getElementById("wizard-next-btn");

    if (backBtn) {
      backBtn.style.visibility = this.wizardStepIndex === 0 ? "hidden" : "visible";
      backBtn.textContent = `← ${this.t("btnBack")}`;
    }

    if (nextBtn) {
      const isLast = this.wizardStepIndex === qList.length - 1;
      nextBtn.textContent = isLast ? `${this.t("btnSubmit")} ➔` : `${this.t("btnNext")} ➔`;
      const hasAnswer = !!this.wizardAnswers[currentQ.id];
      nextBtn.disabled = !hasAnswer;
    }

    this.setupSpeechButton(currentQ);
  }

  setAnswer(questionId, value) {
    this.wizardAnswers[questionId] = value;
    ApiService.saveWizardProgress(this.wizardStepIndex, this.wizardAnswers);
    this.renderWizardStep();
  }

  // -------------------------------------------------------------
  // Voice Input & Confirmation Workflow
  // -------------------------------------------------------------
  setupSpeechButton(currentQ) {
    const micBtn = document.getElementById("wizard-mic-btn");
    const speechStatus = document.getElementById("voice-status-text");
    const voiceConfirmBox = document.getElementById("voice-confirm-box");

    if (!micBtn) return;

    if (!window.speechController || !window.speechController.isSupported || !navigator.onLine) {
      micBtn.classList.add("disabled");
      if (speechStatus) {
        speechStatus.textContent = !navigator.onLine ? this.t("offlineDesc") : this.t("speechNotSupported");
      }
      return;
    }

    micBtn.classList.remove("disabled");

    micBtn.onclick = () => {
      this.triggerVoiceRecognition(currentQ);
    };
  }

  triggerVoiceRecognition(currentQ) {
    const micBtn = document.getElementById("wizard-mic-btn");
    const speechStatus = document.getElementById("voice-status-text");
    const voiceConfirmBox = document.getElementById("voice-confirm-box");

    if (voiceConfirmBox) voiceConfirmBox.style.display = "none";

    window.speechController.startListening(currentQ, {
      onStart: () => {
        micBtn.classList.add("listening");
        if (speechStatus) speechStatus.textContent = this.t("listening");
      },
      onResult: (result) => {
        micBtn.classList.remove("listening");
        this.showVoiceConfirmation(result, currentQ);
      },
      onError: (err) => {
        micBtn.classList.remove("listening");
        if (speechStatus) {
          if (err === "no-speech") {
            speechStatus.textContent = this.t("speechTimeout");
          } else {
            speechStatus.textContent = this.t("speechError");
          }
        }
      },
      onEnd: () => {
        micBtn.classList.remove("listening");
      }
    });
  }

  showVoiceConfirmation(result, currentQ) {
    const voiceConfirmBox = document.getElementById("voice-confirm-box");
    const heardTextEl = document.getElementById("voice-heard-text");
    const confirmBtn = document.getElementById("voice-btn-confirm");
    const retryBtn = document.getElementById("voice-btn-retry");
    const speechStatus = document.getElementById("voice-status-text");

    if (!voiceConfirmBox || !heardTextEl) return;

    const matchedOpt = result.matchedOption;
    const displayVal = result.displayValue || (matchedOpt ? (matchedOpt[this.currentLang] || matchedOpt.en) : result.rawTranscript);

    this.stagedVoiceAnswer = {
      questionId: currentQ.id,
      optionId: matchedOpt ? (matchedOpt.id || matchedOpt.value) : result.rawTranscript,
      displayVal: displayVal
    };

    heardTextEl.innerHTML = `<strong>${this.t("weHeard")}</strong> <span class="heard-val">${displayVal}</span>`;
    voiceConfirmBox.style.display = "block";
    if (speechStatus) speechStatus.textContent = this.t("isThisCorrect");

    confirmBtn.onclick = () => {
      if (this.stagedVoiceAnswer) {
        this.setAnswer(this.stagedVoiceAnswer.questionId, this.stagedVoiceAnswer.optionId);
        voiceConfirmBox.style.display = "none";
        this.stagedVoiceAnswer = null;
      }
    };

    retryBtn.onclick = () => {
      voiceConfirmBox.style.display = "none";
      this.stagedVoiceAnswer = null;
      this.triggerVoiceRecognition(currentQ);
    };
  }

  // Wizard Navigation
  wizardNext() {
    const qList = MOCK_DATA.questions;
    if (this.wizardStepIndex < qList.length - 1) {
      this.wizardStepIndex++;
      ApiService.saveWizardProgress(this.wizardStepIndex, this.wizardAnswers);
      this.renderWizardStep();
    } else {
      this.completeWizard();
    }
  }

  wizardBack() {
    if (this.wizardStepIndex > 0) {
      this.wizardStepIndex--;
      ApiService.saveWizardProgress(this.wizardStepIndex, this.wizardAnswers);
      this.renderWizardStep();
    }
  }

  async completeWizard() {
    const payload = ApiService.mapWizardAnswersToProfilePayload(this.wizardAnswers, this.profile);
    const session = ApiService.getSession();
    const targetId = (this.profile && this.profile.farmer_unique_id) || (session && session.farmer_unique_id);

    if (targetId && this.isBackendOnline) {
      const nextBtn = document.getElementById("wizard-next-btn");
      if (nextBtn) nextBtn.disabled = true;
      try {
        const res = await ApiService.updateFarmerProfile(targetId, payload);
        this.profile = res.profile;
        localStorage.removeItem(ApiService.STORAGE_KEYS.WIZARD_PROGRESS);
        await this.refreshData();
        this.showView("main");
        this.renderAll();
        this.showToast(res.response.message || "Wizard answers saved to PostgreSQL.");
        return;
      } catch (err) {
        this.showToast(err.message || "Saved locally (could not sync wizard to backend).");
      } finally {
        if (nextBtn) nextBtn.disabled = false;
      }
    }

    // Guest user with backend online -> show optional PostgreSQL account creation card inside wizard
    const regPanel = document.getElementById("wizard-register-panel");
    if (!targetId && this.isBackendOnline && regPanel && regPanel.style.display === "none") {
      regPanel.style.display = "block";
      this._bindWizardRegisterPanel(payload);
      regPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    await this._finishWizardLocally(payload);
  }

  async _finishWizardLocally(mappedPayload = null) {
    const localNorm = mappedPayload
      ? ApiService._normalizeBackendFarmerPayload({
        farmer: mappedPayload,
        landholdings: mappedPayload.landholdings,
        unassigned_crops: mappedPayload.crops
      })
      : this.wizardAnswers;
    await ApiService.saveProfile({ ...this.wizardAnswers, ...localNorm });
    const regPanel = document.getElementById("wizard-register-panel");
    if (regPanel) regPanel.style.display = "none";
    await this.refreshData();
    this.showView("main");
    this.renderAll();
  }

  _bindWizardRegisterPanel(mappedPayload) {
    const uidInput = document.getElementById("wizard-reg-uid");
    const passInput = document.getElementById("wizard-reg-pass");
    const uidStatus = document.getElementById("wizard-reg-uid-status");
    const errBox = document.getElementById("wizard-reg-error");
    const submitBtn = document.getElementById("btn-wizard-register-submit");
    const skipBtn = document.getElementById("btn-wizard-skip-reg");

    if (errBox) errBox.style.display = "none";

    if (uidInput && !uidInput._bound) {
      uidInput._bound = true;
      let timer = null;
      uidInput.addEventListener("input", () => {
        clearTimeout(timer);
        const val = uidInput.value.trim();
        if (!val) {
          if (uidStatus) uidStatus.textContent = "";
          return;
        }
        timer = setTimeout(async () => {
          try {
            const check = await ApiService.checkUniqueId(val);
            if (uidStatus) {
              uidStatus.textContent = check.message;
              uidStatus.style.color = check.available ? "#4ade80" : "#fbbf24";
            }
          } catch (_) { }
        }, 350);
      });
    }

    if (submitBtn) {
      submitBtn.onclick = async () => {
        const uid = (uidInput?.value || "").trim();
        const pw = (passInput?.value || "").trim();
        if (!uid || !pw) {
          if (errBox) {
            errBox.textContent = "Please enter both a User ID and Password (or click Continue Locally Only).";
            errBox.style.display = "block";
          }
          return;
        }
        submitBtn.disabled = true;
        const orig = submitBtn.textContent;
        submitBtn.textContent = "Saving to PostgreSQL...";
        try {
          if (errBox) errBox.style.display = "none";
          const res = await ApiService.registerFarmer({
            farmer_unique_id: uid,
            password: pw,
            ...mappedPayload
          });
          this.profile = res.profile;
          localStorage.removeItem(ApiService.STORAGE_KEYS.WIZARD_PROGRESS);
          document.getElementById("wizard-register-panel").style.display = "none";
          await this.refreshData();
          this.showView("main");
          this.renderAll();
          this.showToast(`Registered ${uid} in PostgreSQL!`);
        } catch (err) {
          if (errBox) {
            errBox.textContent = err.message || "Could not register farmer in PostgreSQL.";
            errBox.style.display = "block";
          }
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = orig;
        }
      };
    }

    if (skipBtn) {
      skipBtn.onclick = () => this._finishWizardLocally(mappedPayload);
    }
  }

  // -------------------------------------------------------------
  // PAGE 3: Main Page Top to Bottom
  // -------------------------------------------------------------
  renderBenefitBanner() {
    const heroAmountEl = document.getElementById("hero-banner-amount");

    const eligibleSchemes = this.schemes.filter(s => s.eligible);
    const totalAnnualBenefit = eligibleSchemes.reduce((sum, s) => {
      return sum + (s.isAnnualCash ? s.benefitAmount : 0);
    }, 0);

    const formattedAmount = totalAnnualBenefit > 0
      ? `₹${totalAnnualBenefit.toLocaleString("en-IN")}`
      : "₹೬,೦೦೦+";

    if (heroAmountEl) heroAmountEl.textContent = formattedAmount;
  }

  renderSchemeTabsBadges() {
    const eligibleCount = this.schemes.filter(s => s.eligible).length;
    const almostCount = this.schemes.filter(s => !s.eligible && s.almost).length;
    const savedCount = this.schemes.filter(s => s.isSaved).length;

    // Subpage tab badges
    const bEligible = document.getElementById("badge-tab-eligible");
    const bAlmost = document.getElementById("badge-tab-almost");
    const bSaved = document.getElementById("badge-tab-saved");

    if (bEligible) bEligible.textContent = eligibleCount;
    if (bAlmost) bAlmost.textContent = almostCount;
    if (bSaved) bSaved.textContent = savedCount;

    // Top navbar badges
    const bTopEligible = document.getElementById("badge-top-eligible");
    const bTopAlmost = document.getElementById("badge-top-almost");
    const bTopSaved = document.getElementById("badge-top-saved");

    if (bTopEligible) bTopEligible.textContent = eligibleCount;
    if (bTopAlmost) bTopAlmost.textContent = almostCount;
    if (bTopSaved) bTopSaved.textContent = savedCount;
  }

  renderSchemesList() {
    const container = document.getElementById("schemes-list-container");
    const emptyState = document.getElementById("schemes-empty-state");
    if (!container) return;

    container.innerHTML = "";

    // 1. Filter by Tab
    let list = [];
    if (this.currentTab === "eligible") {
      list = this.schemes.filter(s => s.eligible);
    } else if (this.currentTab === "almost") {
      list = this.schemes.filter(s => !s.eligible && s.almost);
    } else if (this.currentTab === "saved") {
      list = this.schemes.filter(s => s.isSaved);
    }

    // 2. Filter by Category (strict filter only if list isn't already filtered by server query)
    if (this.activeFilter !== "all" && !this.searchQuery) {
      const catFiltered = list.filter(s => s.type === this.activeFilter);
      if (catFiltered.length > 0 || this.schemes._isOfflineFallback) {
        list = catFiltered;
      }
    }

    // 3. Filter by Live Search Query
    if (this.searchQuery) {
      const q = this.searchQuery;
      const matched = list.filter(s => {
        const nameKn = (s.name.kn || "").toLowerCase();
        const nameEn = (s.name.en || "").toLowerCase();
        const deptKn = (s.department.kn || "").toLowerCase();
        const deptEn = (s.department.en || "").toLowerCase();
        const type = (s.type || "").toLowerCase();
        const tags = Array.isArray(s.tags) ? s.tags.join(" ").toLowerCase() : "";
        return nameKn.includes(q) || nameEn.includes(q) || deptKn.includes(q) || deptEn.includes(q) || type.includes(q) || tags.includes(q);
      });
      if (matched.length > 0 || this.schemes._isOfflineFallback) {
        list = matched;
      }
    }

    // 4. Sort
    if (this.sortBy === "benefit_desc") {
      list.sort((a, b) => (b.benefitAmount - a.benefitAmount) || ((b.relevanceScore || 0) - (a.relevanceScore || 0)));
    } else if (this.sortBy === "benefit_asc") {
      list.sort((a, b) => a.benefitAmount - b.benefitAmount);
    } else if (this.sortBy === "name") {
      list.sort((a, b) => (a.name[this.currentLang] || a.name.en || "").localeCompare(b.name[this.currentLang] || b.name.en || ""));
    }

    if (list.length === 0) {
      if (emptyState) {
        emptyState.style.display = "block";
        const emptyTitle = emptyState.querySelector(".empty-title");
        const emptyDesc = emptyState.querySelector(".empty-desc");
        const oldAction = emptyState.querySelector(".empty-action-wrap");
        if (oldAction) oldAction.remove();

        if (this.currentTab === "saved") {
          if (emptyTitle) emptyTitle.textContent = this.t("emptySaved");
          if (emptyDesc) emptyDesc.textContent = this.t("emptySavedDesc");
        } else if (this.currentTab === "eligible" && this.schemes.some(s => !s.eligible && s.almost)) {
          const almostCnt = this.schemes.filter(s => !s.eligible && s.almost).length;
          if (emptyTitle) {
            emptyTitle.textContent = this._gemmaQueueRunning
              ? "Gemma 4 AI is Auditing Your Matched Schemes..."
              : "No Gemma-Verified Eligible Schemes on This View Yet";
          }
          if (emptyDesc) {
            emptyDesc.textContent = `${almostCnt} schemes were matched by BGE-M3 and await Gemma 4 Wing 1 verification.`;
          }
          const actionWrap = document.createElement("div");
          actionWrap.className = "empty-action-wrap";
          actionWrap.style.marginTop = "14px";
          actionWrap.innerHTML = `<button type="button" class="btn btn-primary" id="btn-switch-almost-candidates">View ${almostCnt} Matched Candidate Schemes ➔</button>`;
          emptyState.appendChild(actionWrap);
          const swBtn = document.getElementById("btn-switch-almost-candidates");
          if (swBtn) swBtn.onclick = () => this.setSchemeTab("almost");
        } else {
          if (emptyTitle) emptyTitle.textContent = this.t("emptyEligible");
          if (emptyDesc) emptyDesc.textContent = this.t("emptyEligibleDesc");
        }
      }
      return;
    }

    if (emptyState) emptyState.style.display = "none";

    // Render cards
    list.forEach(scheme => {
      const card = this.createSchemeCard(scheme);
      container.appendChild(card);
    });
  }

  createSchemeCard(scheme) {
    const card = document.createElement("div");
    card.className = `scheme-card ${scheme.eligible ? 'is-eligible' : 'is-almost'}`;

    const isEligible = scheme.eligible;
    let badgeText = isEligible ? this.t("tagEligible") : this.t("tagAlmost");
    let badgeClass = isEligible ? "badge-eligible" : "badge-almost";
    if (!scheme.isEvaluated && !scheme.isOfflineMock) {
      badgeText = "BGE Match • Verify AI";
      badgeClass = "badge-almost";
    } else if (scheme.ineligible) {
      badgeText = "Ineligible";
      badgeClass = "badge-almost";
    }

    const starIcon = scheme.isSaved ? "★" : "☆";
    const starClass = scheme.isSaved ? "star-saved" : "star-empty";

    const rawBenefitText = scheme.benefit[this.currentLang] || scheme.benefit.en || "";
    const isLongBenefit = rawBenefitText.trim().length > 28;
    const nameText = this._escapeHtml(scheme.name[this.currentLang] || scheme.name.en);
    const deptText = this._escapeHtml(scheme.department[this.currentLang] || scheme.department.en);
    const benefitText = this._escapeHtml(rawBenefitText);
    const reasonText = this._escapeHtml(scheme.matchReason ? (scheme.matchReason[this.currentLang] || scheme.matchReason.en) : "");
    const missingText = this._escapeHtml(scheme.missingReason ? (scheme.missingReason[this.currentLang] || scheme.missingReason.en) : "");
    const showVerifyBtn = !scheme.isEvaluated && !scheme.isOfflineMock && Boolean(this.profile?.farmer_id);

    card.innerHTML = `
      <div class="scheme-header">
        <div class="scheme-title-col">
          <div class="scheme-badges-row">
            <span class="badge ${badgeClass}">${badgeText}</span>
            ${scheme.isApplied ? `<span class="badge badge-applied">${this.t("tagApplied")} ✔</span>` : ''}
            ${scheme.priorityTier && scheme.isEvaluated ? `<span class="badge badge-applied">${this._escapeHtml(scheme.priorityTier)} Priority</span>` : ''}
          </div>
          <h3 class="scheme-title">${nameText}</h3>
          <p class="scheme-dept">${deptText}</p>
        </div>
        <button type="button" class="btn-save-star ${starClass}" aria-label="Save Scheme" title="${this.t('tabSaved')}">
          ${starIcon}
        </button>
      </div>

      <div class="scheme-benefit-box">
        <span class="benefit-label">${this.t("schemeBenefitLabel")}</span>
        <div class="benefit-amount-text ${isLongBenefit ? 'is-long-benefit' : ''}">${benefitText}</div>
      </div>

      <div class="scheme-reasons-box">
        <div class="reason-row">
          <span class="reason-tag">✔ ${this.t("reasonLabel")}</span>
          <span class="reason-content">${reasonText}</span>
        </div>
        ${!isEligible && missingText ? `
          <div class="missing-row">
            <span class="missing-tag">⚠ ${this.t("missingLabel")}</span>
            <span class="missing-content">${missingText}</span>
          </div>
        ` : ''}
      </div>

      <div class="scheme-actions-row">
        <button type="button" class="btn-action-primary btn-open-detail">
          ${this.t("viewDetailsBtn")} ➔
        </button>
        ${showVerifyBtn ? `<button type="button" class="rep-btn btn-verify-ai" title="Run Gemma 4 Eligibility Check">⚡ Verify AI</button>` : ''}
        <button type="button" class="btn-action-share" title="${this.t('shareBtn')}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
            <polyline points="16 6 12 2 8 6"></polyline>
            <line x1="12" y1="2" x2="12" y2="15"></line>
          </svg>
        </button>
      </div>
    `;

    const starBtn = card.querySelector(".btn-save-star");
    starBtn.onclick = async (e) => {
      e.stopPropagation();
      const saved = await ApiService.toggleSaveScheme(scheme.id);
      scheme.isSaved = saved;
      this.renderSchemeTabsBadges();
      this.renderSchemesList();
    };

    const verifyAiBtn = card.querySelector(".btn-verify-ai");
    if (verifyAiBtn) {
      verifyAiBtn.onclick = async (e) => {
        e.stopPropagation();
        verifyAiBtn.disabled = true;
        verifyAiBtn.textContent = "Checking...";
        await this.evaluateSingleSchemeCard(scheme);
      };
    }

    const shareBtn = card.querySelector(".btn-action-share");
    shareBtn.onclick = (e) => {
      e.stopPropagation();
      this.shareSchemeWhatsApp(scheme);
    };

    const openBtn = card.querySelector(".btn-open-detail");
    openBtn.onclick = () => {
      this.openSchemeDetailModal(scheme);
    };

    card.onclick = (e) => {
      if (!e.target.closest("button")) {
        this.openSchemeDetailModal(scheme);
      }
    };

    return card;
  }

  // -------------------------------------------------------------
  // Tips & Reminders Ticker (Auto-rotating strip, pauses on touch)
  // -------------------------------------------------------------
  initTipsTicker() {
    const strip = document.getElementById("tips-ticker-strip");
    if (!strip) return;

    const pauseTicker = () => {
      this.isTickerPaused = true;
      const pauseIndicator = document.getElementById("ticker-pause-tag");
      if (pauseIndicator) pauseIndicator.style.display = "inline-block";
    };

    const resumeTicker = () => {
      this.isTickerPaused = false;
      const pauseIndicator = document.getElementById("ticker-pause-tag");
      if (pauseIndicator) pauseIndicator.style.display = "none";
    };

    strip.addEventListener("mouseenter", pauseTicker);
    strip.addEventListener("mouseleave", resumeTicker);
    strip.addEventListener("touchstart", pauseTicker, { passive: true });
    strip.addEventListener("touchend", () => {
      setTimeout(resumeTicker, 2500);
    }, { passive: true });

    if (this.tickerInterval) clearInterval(this.tickerInterval);
    this.tickerInterval = setInterval(() => {
      if (!this.isTickerPaused && this.tips.length > 0) {
        this.tickerIndex = (this.tickerIndex + 1) % this.tips.length;
        this.renderTipsTickerItem();
      }
    }, 4500);
  }

  renderTipsTickerItem() {
    if (!this.tips || this.tips.length === 0) return;
    const item = this.tips[this.tickerIndex];
    if (!item) return;

    const titleEl = document.getElementById("ticker-tip-title");
    const descEl = document.getElementById("ticker-tip-desc");
    const tagEl = document.getElementById("ticker-tip-tag");
    const dotsContainer = document.getElementById("ticker-dots-container");

    if (titleEl) titleEl.textContent = item.title[this.currentLang] || item.title.en;
    if (descEl) descEl.textContent = item.desc[this.currentLang] || item.desc.en;
    if (tagEl) {
      tagEl.textContent = item.tag[this.currentLang] || item.tag.en;
      tagEl.className = `ticker-tag ${item.urgency === 'high' ? 'urgency-high' : 'urgency-normal'}`;
    }

    if (dotsContainer) {
      dotsContainer.innerHTML = "";
      this.tips.forEach((_, idx) => {
        const dot = document.createElement("span");
        dot.className = `ticker-dot ${idx === this.tickerIndex ? 'active' : ''}`;
        dot.onclick = () => {
          this.tickerIndex = idx;
          this.renderTipsTickerItem();
        };
        dotsContainer.appendChild(dot);
      });
    }
  }

  // -------------------------------------------------------------
  // SCHEME DETAIL: "What You Need" Modal (Live 17-Col Dossier + Gemma + FAQs)
  // -------------------------------------------------------------
  _parseDossierDocuments(rawDocs) {
    if (!rawDocs) return [];
    return String(rawDocs)
      .split(/\n|•/)
      .map(s => s.replace(/^[\-\*\d.\s]+/, "").trim())
      .filter(s => s.length > 2);
  }

  _parseDossierSteps(rawProcess) {
    if (!rawProcess) return [];
    const normalized = String(rawProcess)
      .replace(/Mode:\s*[^\n]+/i, m => m + "\n")
      .replace(/(Step\s*0?\d+\s*:)/gi, "\n$1");
    return normalized
      .split(/\n+/)
      .map(s => s.trim())
      .filter(s => s.length > 2);
  }

  _renderModalVerdictBox(scheme) {
    const verdictBody = document.getElementById("modal-ai-verdict-body");
    const verifyBtn = document.getElementById("modal-btn-verify-gemma");
    const tagEl = document.getElementById("modal-scheme-status-tag");
    if (tagEl) {
      if (scheme.isEvaluated) {
        tagEl.textContent = scheme.eligible
          ? this.t("tagEligible")
          : (scheme.ineligible ? "Ineligible" : this.t("tagAlmost"));
        tagEl.className = `badge ${scheme.eligible ? "badge-eligible" : "badge-almost"}`;
      } else {
        tagEl.textContent = scheme.isOfflineMock ? (scheme.eligible ? this.t("tagEligible") : this.t("tagAlmost")) : "BGE Match";
        tagEl.className = `badge ${scheme.eligible ? "badge-eligible" : "badge-almost"}`;
      }
    }

    if (!verdictBody) return;
    if (scheme.isOfflineMock) {
      verdictBody.innerHTML = `<span style="color:#94a3b8;">Offline baseline rule match: ${this._escapeHtml(scheme.matchReason?.en || "")}</span>`;
      if (verifyBtn) verifyBtn.style.display = "none";
      return;
    }

    if (verifyBtn) {
      verifyBtn.style.display = this.profile?.farmer_id ? "inline-flex" : "none";
      verifyBtn.disabled = false;
      verifyBtn.textContent = scheme.isEvaluated ? "Re-run Gemma AI Audit" : "Verify Eligibility Now";
    }

    if (!this.profile?.farmer_id) {
      verdictBody.innerHTML = `<span style="color:#fde68a;">Sign in with a registered PostgreSQL Farmer ID to run personalized Gemma 4 statutory eligibility audit.</span>`;
      return;
    }

    if (!scheme.isEvaluated) {
      verdictBody.innerHTML = `<span style="color:#cbd5e1;">Not audited for Farmer #${this._escapeHtml(this.profile.farmer_id)} yet. Running/click <strong>Verify Eligibility Now</strong> to evaluate against the 17-column official record.</span>`;
      return;
    }

    const conf = typeof scheme.confidenceScore === "number" ? `${Math.round(scheme.confidenceScore * 100)}%` : "N/A";
    const disq = Array.isArray(scheme.disqualifyingFactors) && scheme.disqualifyingFactors.length > 0
      ? `<ul style="margin:6px 0 0;padding-left:18px;color:#fde68a;">${scheme.disqualifyingFactors.map(d => `<li>${this._escapeHtml(d)}</li>`).join("")}</ul>`
      : `<div style="margin-top:4px;color:#86efac;">No statutory disqualifying factors detected.</div>`;

    verdictBody.innerHTML = `
      <div>
        <strong>Verdict:</strong> <span style="color:${scheme.eligible ? "#4ade80" : "#fbbf24"};">${this._escapeHtml(scheme.verdictStatus)}</span>
        &nbsp;•&nbsp; <strong>Confidence:</strong> ${conf}
        &nbsp;•&nbsp; <strong>Priority Tier:</strong> ${this._escapeHtml(scheme.priorityTier || "NORMAL")}
        ${scheme.targetQuota ? `&nbsp;•&nbsp; <strong>Quota:</strong> ${this._escapeHtml(scheme.targetQuota)}` : ""}
      </div>
      ${disq}
    `;
  }

  async openSchemeDetailModal(scheme) {
    this.selectedScheme = scheme;
    const modal = document.getElementById("scheme-detail-modal");
    if (!modal) return;

    const schemeName = scheme.name[this.currentLang] || scheme.name.en;
    document.getElementById("modal-scheme-title").textContent = schemeName;
    document.getElementById("modal-scheme-dept").textContent = scheme.department[this.currentLang] || scheme.department.en;
    document.getElementById("modal-scheme-benefit").textContent = scheme.benefit[this.currentLang] || scheme.benefit.en;

    const criteriaBox = document.getElementById("modal-criteria-box");
    const criteriaBody = document.getElementById("modal-criteria-body");
    const faqBox = document.getElementById("modal-faq-box");
    const faqBody = document.getElementById("modal-faq-body");
    if (criteriaBox) criteriaBox.style.display = "none";
    if (faqBox) faqBox.style.display = "none";

    this._renderModalVerdictBox(scheme);

    const renderChecklistFromArray = (docEntries) => {
      const checklistContainer = document.getElementById("modal-doc-checklist");
      checklistContainer.innerHTML = "";
      const checkedDocIds = ApiService.getDocumentChecklist(scheme.id);

      docEntries.forEach((docEntry, idx) => {
        const docId = docEntry.id || `doc_${idx}`;
        const isChecked = checkedDocIds.includes(docId);
        const row = document.createElement("div");
        row.className = `doc-check-row ${isChecked ? "is-checked" : ""}`;
        row.innerHTML = `
          <label class="doc-check-label">
            <input type="checkbox" class="doc-checkbox" ${isChecked ? "checked" : ""}>
            <div class="doc-info">
              <span class="doc-name">${this._escapeHtml(docEntry.name)}</span>
              ${docEntry.description ? `<span class="doc-desc">${this._escapeHtml(docEntry.description)}</span>` : ""}
              ${docEntry.whereToGet ? `
                <div class="doc-where-box">
                  <strong>📍 ${this.t("whereToGetDoc")}</strong>
                  <span>${this._escapeHtml(docEntry.whereToGet)}</span>
                </div>` : ""}
            </div>
          </label>
        `;
        const checkbox = row.querySelector(".doc-checkbox");
        checkbox.onchange = () => {
          const checked = ApiService.toggleDocumentCheck(scheme.id, docId);
          row.classList.toggle("is-checked", checked);
        };
        checklistContainer.appendChild(row);
      });
    };

    const renderStepsArray = (stepsList) => {
      const stepsContainer = document.getElementById("modal-steps-list");
      stepsContainer.innerHTML = "";
      stepsList.forEach((stepText, idx) => {
        const li = document.createElement("li");
        li.className = "step-item";
        li.innerHTML = `<span class="step-num">${idx + 1}</span> <span class="step-text">${this._escapeHtml(stepText)}</span>`;
        stepsContainer.appendChild(li);
      });
    };

    // Immediate initial render (offline mock items or temporary loading placeholders)
    if (Array.isArray(scheme.documents) && scheme.documents.length > 0 && typeof scheme.documents[0] === "string" && scheme.isOfflineMock) {
      const mappedMockDocs = scheme.documents
        .map(did => this.documentsGuide.find(d => d.id === did))
        .filter(Boolean)
        .map(d => ({
          id: d.id,
          name: d.name[this.currentLang] || d.name.en,
          description: d.description[this.currentLang] || d.description.en,
          whereToGet: d.whereToGet[this.currentLang] || d.whereToGet.en
        }));
      renderChecklistFromArray(mappedMockDocs);
      renderStepsArray(scheme.steps_to_apply?.[this.currentLang] || scheme.steps_to_apply?.en || []);
    } else {
      document.getElementById("modal-doc-checklist").innerHTML = `<div class="db-empty">Loading official document requirements from PostgreSQL...</div>`;
      document.getElementById("modal-steps-list").innerHTML = `<li class="step-item"><span class="step-num">1</span><span class="step-text">Loading official application workflow...</span></li>`;
    }

    const goSiteBtn = document.getElementById("modal-btn-go-site");
    const setPortalUrl = (urlCandidate) => {
      const safeUrl = this._safeHttpUrl(urlCandidate) || "https://www.myscheme.gov.in/";
      if (goSiteBtn) {
        goSiteBtn.onclick = () => window.open(safeUrl, "_blank", "noopener,noreferrer");
      }
    };
    setPortalUrl(scheme.apply_link);

    const markAppliedBtn = document.getElementById("modal-btn-mark-applied");
    if (markAppliedBtn) {
      if (scheme.isApplied) {
        markAppliedBtn.textContent = this.t("btnAlreadyApplied");
        markAppliedBtn.classList.add("applied");
      } else {
        markAppliedBtn.textContent = this.t("btnMarkApplied");
        markAppliedBtn.classList.remove("applied");
      }

      markAppliedBtn.onclick = async () => {
        await ApiService.markSchemeApplied(scheme.id);
        scheme.isApplied = true;
        markAppliedBtn.textContent = this.t("btnAlreadyApplied");
        markAppliedBtn.classList.add("applied");
        this.renderSchemesList();
      };
    }

    const askAiBtn = document.getElementById("modal-btn-ask-ai");
    if (askAiBtn) {
      askAiBtn.onclick = () => {
        const promptQ = `Check my eligibility, exact subsidy benefits, and required documents for "${scheme.name.en}".`;
        const fidParam = this.profile?.farmer_id ? `&farmer_id=${encodeURIComponent(this.profile.farmer_id)}` : "";
        window.location.href = `ai_chat.html?q=${encodeURIComponent(promptQ)}${fidParam}`;
      };
    }

    const verifyGemmaBtn = document.getElementById("modal-btn-verify-gemma");
    if (verifyGemmaBtn) {
      verifyGemmaBtn.onclick = async () => {
        verifyGemmaBtn.disabled = true;
        verifyGemmaBtn.textContent = "Auditing with Gemma 4...";
        await this.evaluateSingleSchemeCard(scheme);
        if (this.selectedScheme && String(this.selectedScheme.id) === String(scheme.id)) {
          this._renderModalVerdictBox(scheme);
        }
      };
    }

    modal.classList.add("open");

    // Fetch live 17-column dossier + BGE FAQ precedents when online backend scheme
    if (!scheme.isOfflineMock && Number.isFinite(Number(scheme.id))) {
      ApiService.getSchemeDossier(scheme.id)
        .then(res => {
          if (!this.selectedScheme || String(this.selectedScheme.id) !== String(scheme.id)) return;
          const d = res.dossier || {};
          if (d.benefits) {
            document.getElementById("modal-scheme-benefit").textContent = String(d.benefits).trim();
          }
          if (d.eligibility_criteria || d.exclusions_ineligibility) {
            if (criteriaBox && criteriaBody) {
              criteriaBox.style.display = "block";
              criteriaBody.innerHTML = `
                ${d.eligibility_criteria ? `<p style="margin:0 0 8px;"><strong style="color:#86efac;">Eligibility:</strong> ${this._escapeHtml(d.eligibility_criteria)}</p>` : ""}
                ${d.exclusions_ineligibility ? `<p style="margin:0;"><strong style="color:#fde68a;">Exclusions:</strong> ${this._escapeHtml(d.exclusions_ineligibility)}</p>` : ""}
              `;
            }
          }
          const docs = this._parseDossierDocuments(d.documents_required);
          renderChecklistFromArray(
            docs.length > 0
              ? docs.map((txt, idx) => ({ id: `req_${idx}`, name: txt }))
              : [{ id: "req_default", name: "Aadhaar Card, Land Record (RTC), Bank Passbook (see Official Portal for scheme-specific annexures)" }]
          );
          const steps = this._parseDossierSteps(d.application_process);
          renderStepsArray(
            steps.length > 0
              ? steps
              : ["Visit the official portal link below and submit your Citizen Registration & Land Records."]
          );
          setPortalUrl(d.official_link || d.myscheme_url || scheme.apply_link);
        })
        .catch(err => console.warn("Failed to hydrate full dossier:", err));

      ApiService.searchFaqsBGE(scheme.name.en, 5)
        .then(faqRes => {
          if (!this.selectedScheme || String(this.selectedScheme.id) !== String(scheme.id)) return;
          // Filter out low-relevance cross-scheme BGE-M3 matches (e.g. 50-51% unrelated state schemes).
          const MIN_SCORE = 0.60;
          const HIGH_CONF_SCORE = 0.72;
          const STOP_WORDS = new Set([
            "scheme", "yojana", "pradhan", "mantri", "state", "central", "government",
            "india", "national", "mission", "program", "programme", "ministry",
            "department", "welfare", "farmer", "farmers", "kisan", "kalyan", "krishi", "for", "and", "the"
          ]);
          const schemeWords = new Set(
            (scheme.name?.en || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/)
              .filter(w => w.length > 2 && !STOP_WORDS.has(w))
          );
          const scoreOf = f => f.relevance_score || 0;
          const hasSchemeOverlap = f => {
            if (schemeWords.size === 0) return false;
            const fw = (f.scheme || "").toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/);
            return fw.some(w => w.length > 2 && schemeWords.has(w));
          };
          const allAboveThreshold = (faqRes?.faqs || []).filter(f => scoreOf(f) >= MIN_SCORE);
          const matched = allAboveThreshold.filter(hasSchemeOverlap);
          const faqs = (matched.length > 0 ? matched : allAboveThreshold.filter(f => scoreOf(f) >= HIGH_CONF_SCORE)).slice(0, 3);
          if (faqs.length > 0 && faqBox && faqBody) {
            faqBox.style.display = "block";
            faqBody.innerHTML = faqs.map(f => `
              <div style="padding:8px 10px;border-radius:8px;background:rgba(4,16,9,0.75);border:1px solid rgba(34,197,94,0.2);margin-bottom:6px;">
                <div style="font-size:0.75rem;color:#86efac;font-weight:700;">${this._escapeHtml(f.scheme)} (${Math.round((f.relevance_score || 0) * 100)}%)</div>
                <div style="margin-top:3px;white-space:pre-line;">${this._escapeHtml(f.faq_text)}</div>
              </div>
            `).join("");
          }
        })
        .catch(() => { });

      // Lazy Wing 1 evaluation on open if not already evaluated
      if (!scheme.isEvaluated && this.profile?.farmer_id && this.isGemmaHealthy && !this._gemmaQueueRunning) {
        this.evaluateSingleSchemeCard(scheme).then(() => {
          if (this.selectedScheme && String(this.selectedScheme.id) === String(scheme.id)) {
            this._renderModalVerdictBox(scheme);
          }
        });
      }
    }
  }

  closeSchemeDetailModal() {
    const modal = document.getElementById("scheme-detail-modal");
    if (modal) modal.classList.remove("open");
    this.selectedScheme = null;
  }

  // -------------------------------------------------------------
  // OTHER FEATURES: Documents, Tips, Help Pages
  // -------------------------------------------------------------
  async searchDocsFaqs() {
    const input = document.getElementById("docs-faq-input");
    const container = document.getElementById("docs-faq-results");
    if (!input || !container) return;
    const issue = input.value.trim();
    if (!issue) return;

    container.innerHTML = `<div class="db-empty">Searching 20,110 official FAQs with BGE-M3...</div>`;
    try {
      const res = await ApiService.searchFaqsBGE(issue, 5);
      const faqs = res?.faqs || [];
      if (!faqs.length) {
        container.innerHTML = `<div class="db-empty">No FAQ entries matched "${this._escapeHtml(issue)}".</div>`;
        return;
      }
      container.innerHTML = faqs.map(f => `
        <div style="padding:10px 12px;border-radius:10px;background:rgba(4,16,9,0.85);border:1px solid rgba(34,197,94,0.28);margin-bottom:8px;">
          <div style="font-size:0.78rem;color:#86efac;font-weight:700;margin-bottom:4px;">${this._escapeHtml(f.scheme)}${f.ministry ? ` • ${this._escapeHtml(f.ministry)}` : ""} (${Math.round((f.relevance_score || 0) * 100)}%)</div>
          <div style="font-size:0.86rem;color:#e2e8f0;white-space:pre-line;line-height:1.5;">${this._escapeHtml(f.faq_text)}</div>
        </div>
      `).join("");
    } catch (err) {
      container.innerHTML = `<div class="db-empty" style="color:#fecaca;">${this._escapeHtml(err.message || "FAQ search failed.")}</div>`;
    }
  }

  renderDocumentsPage() {
    const container = document.getElementById("docs-list-container");
    if (!container) return;
    container.innerHTML = "";

    this.documentsGuide.forEach(doc => {
      const card = document.createElement("div");
      card.className = "doc-guide-card";

      const neededSchemes = this.schemes.filter(s => Array.isArray(s.documents) && s.documents.includes(doc.id));
      const schemeNames = neededSchemes.map(s => s.name[this.currentLang] || s.name.en).join(", ");

      card.innerHTML = `
        <div class="doc-guide-header">
          <div class="doc-guide-icon">${this.getOptionIconSvg("file-text")}</div>
          <div>
            <h3 class="doc-guide-title">${doc.name[this.currentLang] || doc.name.en}</h3>
            <span class="doc-fee-badge">${doc.cost[this.currentLang] || doc.cost.en}</span>
          </div>
        </div>
        <p class="doc-guide-desc">${doc.description[this.currentLang] || doc.description.en}</p>
        
        <div class="doc-guide-detail-box">
          <div class="detail-label">📍 ${this.t("whereToGetDoc")}</div>
          <div class="detail-value">${doc.whereToGet[this.currentLang] || doc.whereToGet.en}</div>
        </div>

        <div class="doc-guide-detail-box">
          <div class="detail-label">📄 ${this.t("docsNeededFor")}</div>
          <div class="detail-value highlight">${schemeNames || "ಎಲ್ಲಾ ಕೃಷಿ ಯೋಜನೆಗಳು"}</div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  renderTipsPage() {
    const container = document.getElementById("tips-full-list");
    if (!container) return;
    container.innerHTML = "";

    this.tips.forEach(tip => {
      const card = document.createElement("div");
      card.className = "tip-full-card";
      card.innerHTML = `
        <div class="tip-card-top">
          <span class="ticker-tag ${tip.urgency === 'high' ? 'urgency-high' : 'urgency-normal'}">
            ${tip.tag[this.currentLang] || tip.tag.en}
          </span>
          <span class="tip-date-badge">${tip.date}</span>
        </div>
        <h3 class="tip-card-title">${tip.title[this.currentLang] || tip.title.en}</h3>
        <p class="tip-card-desc">${tip.desc[this.currentLang] || tip.desc.en}</p>
      `;
      container.appendChild(card);
    });
  }

  renderHelpPage() {
    // Handled via static i18n
  }

  // -------------------------------------------------------------
  // Login Help Modal & Toast Notifications
  // -------------------------------------------------------------
  openLoginHelpModal() {
    const modal = document.getElementById("login-help-modal");
    if (modal) modal.classList.add("active");
  }

  closeLoginHelpModal() {
    const modal = document.getElementById("login-help-modal");
    if (modal) modal.classList.remove("active");
  }

  showToast(message, duration = 3200) {
    let toast = document.getElementById("app-toast-notice");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "app-toast-notice";
      toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1f2937;color:#fff;padding:12px 22px;border-radius:12px;font-size:0.95rem;font-weight:600;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.3);text-align:center;max-width:90%;transition:opacity 0.25s, transform 0.25s;line-height:1.5;";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = "block";
    toast.style.opacity = "1";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => { toast.style.display = "none"; }, 250);
    }, duration);
  }

  // -------------------------------------------------------------
  // PROFILE MENU & EDIT PROFILE (Immediate Recalculation)
  // -------------------------------------------------------------
  openProfileDrawer() {
    const drawer = document.getElementById("profile-drawer");
    if (!drawer) return;

    const session = ApiService.getSession();
    const nameEl = drawer.querySelector(".user-name");
    const phoneEl = document.getElementById("profile-drawer-phone");
    if (nameEl && session && session.full_name) {
      nameEl.textContent = session.full_name;
    }
    if (phoneEl) {
      if (session && session.farmer_unique_id) {
        phoneEl.textContent = session.phone
          ? `${session.farmer_unique_id} • +91 ${session.phone}`
          : session.farmer_unique_id;
      } else if (session && session.phone) {
        phoneEl.textContent = `+91 ${session.phone}`;
      } else {
        phoneEl.textContent = "Guest Citizen";
      }
    }

    const summaryEl = document.getElementById("profile-drawer-summary");
    if (summaryEl) {
      if (window.ProfileEditor && typeof window.ProfileEditor.renderDrawerSummary === "function") {
        window.ProfileEditor.renderDrawerSummary(summaryEl, this.profile, session);
      } else if (this.profile) {
        const distOpt = MOCK_DATA.questions[0].options.find(o => o.id === this.profile.district);
        const cropOpt = MOCK_DATA.questions[3].options.find(o => o.id === this.profile.crop);
        const distName = this.profile.district_display
          ? `${this.profile.district_display}${this.profile.state ? ', ' + this.profile.state : ''}`
          : (distOpt ? distOpt[this.currentLang] : this.profile.district);
        const cropName = (this.profile.crops_list && this.profile.crops_list.length > 0)
          ? this.profile.crops_list.slice(0, 3).join(", ")
          : (cropOpt ? cropOpt[this.currentLang] : this.profile.crop);
        const landText = this.profile.total_land_hectares
          ? `${this.profile.total_land_hectares} ha`
          : `${this.profile.land_size} ${this.t('acres')}`;
        summaryEl.innerHTML = `
          <div class="drawer-chip">📍 ${distName}</div>
          <div class="drawer-chip">🌾 ${cropName}</div>
          <div class="drawer-chip">📏 ${landText}</div>
          ${this.profile.social_category ? `<div class="drawer-chip">🪪 ${this.profile.social_category}</div>` : ''}
        `;
      }
    }

    drawer.classList.add("open");
  }

  closeProfileDrawer() {
    const drawer = document.getElementById("profile-drawer");
    if (drawer) drawer.classList.remove("open");
  }

  async openEditProfileModal() {
    this.closeProfileDrawer();
    const modal = document.getElementById("edit-profile-modal");
    if (!modal) return;

    const formContainer = document.getElementById("edit-profile-fields");
    formContainer.innerHTML = '<div class="db-empty">Loading latest farmer records from PostgreSQL...</div>';
    modal.classList.add("open");

    const session = ApiService.getSession();
    const targetId = (this.profile && this.profile.farmer_unique_id) || (session && session.farmer_unique_id);
    if (targetId) {
      const fresh = await ApiService.loadFarmerFromBackend(targetId);
      if (fresh) {
        this.profile = fresh;
      }
    }

    if (window.ProfileEditor) {
      await window.ProfileEditor.mount(formContainer, this.profile || {});
    }
  }

  triggerVoiceRecognitionForField(question, cardElement) {
    if (!window.speechController || !window.speechController.isSupported) {
      alert(this.t("speechNotSupported"));
      return;
    }

    const micBtn = cardElement.querySelector(".btn-field-mic");
    micBtn.classList.add("listening");

    window.speechController.startListening(question, {
      onStart: () => micBtn.classList.add("listening"),
      onResult: (result) => {
        micBtn.classList.remove("listening");
        const opt = result.matchedOption;
        if (opt) {
          const select = cardElement.querySelector("select");
          if (select) select.value = opt.id;
          const header = cardElement.querySelector(".field-card-header");
          const tempBadge = document.createElement("span");
          tempBadge.className = "badge badge-eligible";
          tempBadge.textContent = `✔ ${opt[this.currentLang]}`;
          header.appendChild(tempBadge);
          setTimeout(() => tempBadge.remove(), 2500);
        }
      },
      onError: () => {
        micBtn.classList.remove("listening");
        alert(this.t("speechError"));
      },
      onEnd: () => micBtn.classList.remove("listening")
    });
  }

  async saveEditedProfile() {
    const saveBtn = document.getElementById("btn-save-edit-profile");
    const origText = saveBtn ? saveBtn.innerHTML : "";
    const session = ApiService.getSession();
    const targetId = (this.profile && this.profile.farmer_unique_id) || (session && session.farmer_unique_id);

    if (!window.ProfileEditor) return;

    let payload;
    try {
      payload = window.ProfileEditor.buildPayload();
    } catch (valErr) {
      window.ProfileEditor.showError(valErr.message);
      return;
    }

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Saving to PostgreSQL...';
    }

    try {
      if (targetId) {
        const res = await ApiService.updateFarmerProfile(targetId, payload);
        this.profile = res.profile;
        await this.refreshData();
        this.closeEditProfileModal();
        this.renderAll();
        this.showToast(res.response.message || "Farmer profile & all 6 table links updated in PostgreSQL.");
      } else {
        // Offline/local fallback without farmer_unique_id
        const localNormalized = ApiService._normalizeBackendFarmerPayload({
          farmer: payload,
          landholdings: payload.landholdings,
          unassigned_crops: payload.crops
        });
        await ApiService.saveProfile({ ...this.profile, ...localNormalized });
        await this.refreshData();
        this.closeEditProfileModal();
        this.renderAll();
        this.showToast("Profile updated locally.");
      }
    } catch (err) {
      const isNetworkErr = err instanceof TypeError || /fetch|network/i.test(err.message || "");
      if (isNetworkErr && targetId) {
        window.ProfileEditor.showError("Could not reach backend API on port 8000 to update PostgreSQL. Please verify FastAPI is running.");
      } else {
        window.ProfileEditor.showError(err.message || "Could not save profile changes.");
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = origText || "Save Changes ✔";
      }
    }
  }

  closeEditProfileModal() {
    const modal = document.getElementById("edit-profile-modal");
    if (modal) modal.classList.remove("open");
  }

  async handleDeleteMyData() {
    const confirmed = window.confirm(this.t("deleteDataConfirm"));
    if (confirmed) {
      this._gemmaRunToken += 1;
      this._gemmaQueueRunning = false;
      await ApiService.deleteUserData();
      this.closeProfileDrawer();
      this.profile = null;
      this.schemes = [];
      alert(this.t("dataDeletedMsg"));
      this.resetLoginStep();
      this.showView("login");
      this.renderAll();
    }
  }

  async handleLogout() {
    this._gemmaRunToken += 1;
    this._gemmaQueueRunning = false;
    await ApiService.logout();
    this.closeProfileDrawer();
    this.profile = null;
    this.schemes = [];
    this.resetLoginStep();
    this.showView("login");
    this.renderAll();
  }

  // -------------------------------------------------------------
  // WhatsApp & Share Integration
  // -------------------------------------------------------------
  shareSchemeWhatsApp(scheme) {
    const name = scheme.name[this.currentLang] || scheme.name.en;
    const benefit = scheme.benefit[this.currentLang] || scheme.benefit.en;
    const link = this._safeHttpUrl(scheme.apply_link) || "https://www.myscheme.gov.in/";
    const msg = this.t("shareSchemeText", { name: name, benefit: benefit });
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg + "\n" + link)}`;
    window.open(url, "_blank");
  }

  shareAllEligibleWhatsApp() {
    const eligibleSchemes = this.schemes.filter(s => s.eligible);
    const totalBenefit = eligibleSchemes.reduce((sum, s) => sum + (s.isAnnualCash ? s.benefitAmount : 0), 0);
    const msg = this.t("shareAllText", { amount: totalBenefit.toLocaleString("en-IN") });
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  // -------------------------------------------------------------
  // Helper & SVG Icon Builder
  // -------------------------------------------------------------
  getOptionIconSvg(name) {
    const svgs = {
      "map-pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
      "layers": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>',
      "home": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
      "key": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-1-1l-3 3m2 2l-3 3m2 2l-3 3M7 14l-4 4v4h4l4-4"></path><circle cx="16" cy="8" r="5"></circle></svg>',
      "users": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
      "sun": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',
      "droplet": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>',
      "droplets": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.09 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"></path></svg>',
      "zap": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>',
      "cloud": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg>',
      "grid": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>',
      "compass": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>',
      "cloud-rain": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path></svg>',
      "disc": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>',
      "activity": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>',
      "circle": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>',
      "shield": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
      "check-circle": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      "user": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
      "user-check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>',
      "user-plus": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>',
      "check": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>',
      "x": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
      "file-text": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>'
    };
    return svgs[name] || svgs["circle"];
  }

  // -------------------------------------------------------------
  // Global Event Listeners & Binding
  // -------------------------------------------------------------
  bindGlobalEvents() {
    // Language Toggle Pills
    document.querySelectorAll(".lang-toggle-pill").forEach(btn => {
      btn.onclick = () => this.toggleLanguage();
    });

    // Login Language Capsule [ ಕನ್ನಡ | English ]
    document.querySelectorAll(".login-lang-btn").forEach(btn => {
      btn.onclick = () => {
        const lang = btn.dataset.lang;
        if (lang) this.setLanguage(lang);
      };
    });

    // Top Navigation Links (Eligible, Almost Eligible, Saved)
    document.querySelectorAll(".nav-menu-link").forEach(btn => {
      btn.onclick = () => {
        const tab = btn.dataset.tab;
        this.setSchemeTab(tab);
        const anchor = document.getElementById("schemes-main-anchor");
        if (anchor) anchor.scrollIntoView({ behavior: "smooth" });
      };
    });

    // Top Brand Click (scroll to top)
    const brandHome = document.getElementById("brand-home-click");
    if (brandHome) {
      brandHome.onclick = () => {
        if (this.currentView === "main") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      };
    }

    // Hero Actions
    const heroExploreBtn = document.getElementById("btn-hero-explore");
    if (heroExploreBtn) {
      heroExploreBtn.onclick = () => {
        this.setSchemeTab("eligible");
        const anchor = document.getElementById("schemes-main-anchor");
        if (anchor) anchor.scrollIntoView({ behavior: "smooth" });
      };
    }

    const heroShareBtn = document.getElementById("btn-hero-share");
    if (heroShareBtn) {
      heroShareBtn.onclick = () => this.shareAllEligibleWhatsApp();
    }

    // Live Search & Category Filtering
    const executeLiveSearch = async (scroll = false) => {
      const val = searchInput ? searchInput.value.trim() : "";
      this.searchQuery = val.toLowerCase();
      if (this.isBackendOnline && val.length >= 2) {
        await this.refreshData({ search: val, category: this.activeFilter, preserveTab: true, skipAutoEval: true });
        if (!this.schemes.some(s => s.eligible) && this.schemes.some(s => s.almost)) {
          this.setSchemeTab("almost");
        } else {
          this.renderAll();
        }
      } else if (!val && this.catalogMode) {
        await this.refreshData({ search: "", category: this.activeFilter });
        this.renderAll();
      } else {
        this.renderSchemesList();
      }
      if (scroll) {
        const anchor = document.getElementById("schemes-main-anchor");
        if (anchor) anchor.scrollIntoView({ behavior: "smooth" });
      }
    };

    const searchInput = document.getElementById("scheme-search-input");
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderSchemesList();
        clearTimeout(this._searchDebounceTimer);
        this._searchDebounceTimer = setTimeout(() => {
          if (this.isBackendOnline && (this.searchQuery.length >= 3 || this.searchQuery.length === 0)) {
            executeLiveSearch(false);
          }
        }, 450);
      };
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          clearTimeout(this._searchDebounceTimer);
          executeLiveSearch(true);
        }
      });
    }

    const catSelect = document.getElementById("scheme-category-select");
    if (catSelect) {
      catSelect.onchange = async (e) => {
        this.activeFilter = e.target.value;
        document.querySelectorAll(".filter-chip").forEach(c => {
          c.classList.toggle("active", c.dataset.filter === this.activeFilter);
        });
        if (this.isBackendOnline && this.activeFilter !== "all" && !this.schemes.some(s => s.type === this.activeFilter)) {
          await this.refreshData({ category: this.activeFilter, preserveTab: true });
          this.renderAll();
        } else {
          this.renderSchemesList();
        }
      };
    }

    const discoverBtn = document.getElementById("btn-discover-search");
    if (discoverBtn) {
      discoverBtn.onclick = () => {
        clearTimeout(this._searchDebounceTimer);
        executeLiveSearch(true);
      };
    }

    const runBatchBtn = document.getElementById("btn-run-ai-batch");
    if (runBatchBtn) {
      runBatchBtn.onclick = () => this.runGemmaEvaluationQueue(5);
    }

    const browseCatBtn = document.getElementById("btn-browse-catalog");
    if (browseCatBtn) {
      browseCatBtn.onclick = () => this.loadCatalogPage(true);
    }

    const loadMoreBtn = document.getElementById("btn-load-more-schemes");
    if (loadMoreBtn) {
      loadMoreBtn.onclick = () => this.loadCatalogPage(false);
    }

    const docsFaqBtn = document.getElementById("btn-docs-faq-search");
    const docsFaqInput = document.getElementById("docs-faq-input");
    if (docsFaqBtn) docsFaqBtn.onclick = () => this.searchDocsFaqs();
    if (docsFaqInput) {
      docsFaqInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.searchDocsFaqs();
        }
      });
    }

    // Login Events
    const sendOtpBtn = document.getElementById("btn-send-otp");
    if (sendOtpBtn) sendOtpBtn.onclick = () => this.handleSendOtp();

    const verifyOtpBtn = document.getElementById("btn-verify-otp");
    if (verifyOtpBtn) verifyOtpBtn.onclick = () => this.handleVerifyOtp();

    const changeNumberBtn = document.getElementById("btn-change-number");
    if (changeNumberBtn) changeNumberBtn.onclick = () => this.resetLoginStep();

    const demoOtpBtn = document.getElementById("demo-otp-btn");
    if (demoOtpBtn) demoOtpBtn.onclick = () => this.fillDemoOtp();

    const loginSignupBtn = document.getElementById("btn-login-signup");
    if (loginSignupBtn) {
      loginSignupBtn.onclick = () => {
        window.location.href = "page-login.html?tab=register";
      };
    }

    // Enter key submits User ID + Password login cleanly
    const enterLoginHandler = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleSendOtp();
      }
    };
    const loginIdInput = document.getElementById("login-phone");
    const loginPassInput = document.getElementById("login-password");
    if (loginIdInput) loginIdInput.addEventListener("keydown", enterLoginHandler);
    if (loginPassInput) loginPassInput.addEventListener("keydown", enterLoginHandler);

    const loginHelpBtn = document.getElementById("btn-login-help");
    if (loginHelpBtn) loginHelpBtn.onclick = () => this.openLoginHelpModal();

    const closeLoginHelpBtn = document.getElementById("btn-close-login-help");
    if (closeLoginHelpBtn) closeLoginHelpBtn.onclick = () => this.closeLoginHelpModal();

    const closeLoginHelpAction = document.getElementById("btn-close-login-help-action");
    if (closeLoginHelpAction) closeLoginHelpAction.onclick = () => this.closeLoginHelpModal();

    const loginHelpOverlay = document.getElementById("login-help-modal-overlay");
    if (loginHelpOverlay) loginHelpOverlay.onclick = () => this.closeLoginHelpModal();

    // Wizard Navigation
    const wizardNextBtn = document.getElementById("wizard-next-btn");
    if (wizardNextBtn) wizardNextBtn.onclick = () => this.wizardNext();

    const wizardBackBtn = document.getElementById("wizard-back-btn");
    if (wizardBackBtn) wizardBackBtn.onclick = () => this.wizardBack();

    // Scheme Tabs (In-page)
    document.querySelectorAll(".scheme-tab-btn").forEach(btn => {
      btn.onclick = () => this.setSchemeTab(btn.dataset.tab);
    });

    // Scheme Filter Chips
    document.querySelectorAll(".filter-chip").forEach(chip => {
      chip.onclick = async () => {
        document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.activeFilter = chip.dataset.filter;

        // sync dropdown
        const catSelect = document.getElementById("scheme-category-select");
        if (catSelect) catSelect.value = this.activeFilter;

        if (this.isBackendOnline && this.activeFilter !== "all" && !this.schemes.some(s => s.type === this.activeFilter)) {
          await this.refreshData({ category: this.activeFilter, preserveTab: true });
          this.renderAll();
        } else {
          this.renderSchemesList();
        }
      };
    });

    // Sort Dropdown
    const sortSelect = document.getElementById("schemes-sort-select");
    if (sortSelect) {
      sortSelect.onchange = (e) => {
        this.sortBy = e.target.value;
        this.renderSchemesList();
      };
    }

    // Bottom Navigation
    document.querySelectorAll(".bottom-nav-item").forEach(item => {
      item.onclick = () => this.setBottomNav(item.dataset.tab);
    });

    // Profile Drawer Controls (Desktop top pill + Mobile avatar)
    const btnTopProfile = document.getElementById("btn-top-profile");
    if (btnTopProfile) btnTopProfile.onclick = () => this.openProfileDrawer();

    const btnMobileProfile = document.getElementById("btn-mobile-profile");
    if (btnMobileProfile) btnMobileProfile.onclick = () => this.openProfileDrawer();

    const closeDrawerBtn = document.getElementById("btn-close-drawer");
    if (closeDrawerBtn) closeDrawerBtn.onclick = () => this.closeProfileDrawer();

    const drawerOverlay = document.getElementById("drawer-overlay");
    if (drawerOverlay) drawerOverlay.onclick = () => this.closeProfileDrawer();

    const btnEditProfile = document.getElementById("btn-edit-profile-menu");
    if (btnEditProfile) btnEditProfile.onclick = () => this.openEditProfileModal();

    const btnLogout = document.getElementById("btn-logout-menu");
    if (btnLogout) btnLogout.onclick = () => this.handleLogout();

    const btnDeleteData = document.getElementById("btn-delete-data-menu");
    if (btnDeleteData) btnDeleteData.onclick = () => this.handleDeleteMyData();

    // Edit Profile Modal
    const btnSaveEdit = document.getElementById("btn-save-edit-profile");
    if (btnSaveEdit) btnSaveEdit.onclick = () => this.saveEditedProfile();

    const btnCloseEdit = document.getElementById("btn-close-edit-modal");
    if (btnCloseEdit) btnCloseEdit.onclick = () => this.closeEditProfileModal();

    // Detail Modal Close
    const btnCloseDetail = document.getElementById("modal-btn-close");
    if (btnCloseDetail) btnCloseDetail.onclick = () => this.closeSchemeDetailModal();

    const modalOverlay = document.getElementById("modal-overlay-bg");
    if (modalOverlay) modalOverlay.onclick = () => this.closeSchemeDetailModal();

    // Online/Offline detection + Backend /health sync (keeps local airgapped 127.0.0.1 working)
    window.addEventListener("online", () => {
      this.checkBackendHealth();
    });
    window.addEventListener("offline", () => {
      this.checkBackendHealth();
    });
  }
}

// Instantiate on DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  window.app = new KrishiMitraApp();
  window.app.init();
});
