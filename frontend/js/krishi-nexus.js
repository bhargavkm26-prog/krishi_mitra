/**
 * Krishi Mitra — Sovereign Agrarian Intelligence & Governance OS
 * Modular Frontend Controller (100% Client-Ready & Standalone)
 */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. STATE & MOCK CITIZEN DATABASE
   * -------------------------------------------------------------------------- */
  const SAMPLE_FARMERS = {
    'KM26@0001': {
      id: 1,
      unique_id: 'KM26@0001',
      name: 'Suresh Hegde',
      state: 'Assam',
      district: 'Dhemaji',
      village: 'No.3 Dhuna Guri',
      category: 'SC',
      farmer_class: 'Medium Farmer',
      income: '₹5,98,875 / yr',
      land: '6.37 Hectares (Owned)',
      irrigation: 'Rainfed / Tube-well',
      crops: ['Winter Rice (Sali)', 'Yellow Mustard', 'Black Gram'],
      livestock: ['Indigenous Cattle (4)', 'Goats (6)'],
      schemes: [
        { name: 'PM-KISAN Samman Nidhi', status: 'PASS', quota: 'Direct Income Support (₹6,000/yr)', note: 'Land records verified, Aadhaar linked' },
        { name: 'Assam Solar Agri-Pump Scheme (PM-KUSUM B)', status: 'PASS', quota: '70% Capital Subsidy (5HP Solar)', note: 'Marginal/SC quota eligible' },
        { name: 'National Food Security Mission (NFSM-Pulses)', status: 'PASS', quota: 'Free High-Yield Seed Mini-Kit', note: 'Certified mustard/pulse cluster' },
        { name: 'PM Krishi Sinchayee Yojana (Micro-Irrigation)', status: 'PASS', quota: '55% Drip Infrastructure Subsidy', note: 'Tube-well source verified' }
      ]
    },
    'KM26@0002': {
      id: 2,
      unique_id: 'KM26@0002',
      name: 'Vijay Gowda',
      state: 'Karnataka',
      district: 'Chitradurga',
      village: 'Andanur',
      category: 'OBC',
      farmer_class: 'Small Farmer',
      income: '₹5,54,036 / yr',
      land: '1.80 Hectares (Dryland)',
      irrigation: 'Borewell (Seasonal)',
      crops: ['Kharif Maize', 'Bt Cotton', 'Pigeonpea'],
      livestock: ['Dairy Cows (2)', 'Poultry (15)'],
      schemes: [
        { name: 'PM-KISAN Samman Nidhi', status: 'PASS', quota: 'Direct Income Support', note: 'Active beneficiary' },
        { name: 'Karnataka Raitha Siri Scheme', status: 'PASS', quota: '₹10,000/ha for Millets & Pulses', note: 'State statutory quota' },
        { name: 'PM-KUSUM Component-B (Solar Water Pump)', status: 'PASS', quota: '80% Combined Subsidy (3HP Solar)', note: 'Priority for dryland borewell conversion' },
        { name: 'Kisan Credit Card (KCC) Crop Loan', status: 'PASS', quota: 'Up to ₹3.0 Lakh @ 4% Subvention', note: 'Existing holder, renewal eligible' }
      ]
    },
    'KM26@0003': {
      id: 3,
      unique_id: 'KM26@0003',
      name: 'Ravi Borah',
      state: 'Karnataka',
      district: 'Vijayapura',
      village: 'Janjaragaddi',
      category: 'SC',
      farmer_class: 'Marginal Farmer',
      income: '₹2,78,079 / yr',
      land: '0.90 Hectares',
      irrigation: 'Rainfed',
      crops: ['Sunflower', 'Bengal Gram'],
      livestock: ['Sheep (8)'],
      schemes: [
        { name: 'PM-KISAN Samman Nidhi', status: 'PASS', quota: 'Full Annual Direct Transfer', note: 'All criteria satisfied' },
        { name: 'Special SC/ST Input Assistance Quota', status: 'PASS', quota: '100% Seed & Bio-Fertilizer Kit', note: 'Targeted sub-plan benefit' },
        { name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)', status: 'PASS', quota: '98% Premium Subsidized', note: 'Notified drought-prone taluk' },
        { name: 'National Livestock Mission (NLM)', status: 'PASS', quota: '50% Subsidy for Sheep Shelter', note: 'Small ruminant scheme' }
      ]
    },
    'KM26@0007': {
      id: 7,
      unique_id: 'KM26@0007',
      name: 'Manjunath Joshi',
      state: 'Meghalaya',
      district: 'North Garo Hills',
      village: 'Rongkinjeng',
      category: 'ST',
      farmer_class: 'Semi-Medium Farmer',
      income: '₹4,50,768 / yr',
      land: '3.20 Hectares (Hilly Terrain)',
      irrigation: 'Natural Spring Stream',
      crops: ['Arecanut', 'Ginger', 'Black Pepper'],
      livestock: ['Piggery (5)'],
      schemes: [
        { name: 'Mission Organic Value Chain Development (MOVCDNER)', status: 'PASS', quota: '₹45,000/ha Organic Transition Grant', note: 'North Eastern statutory mission' },
        { name: 'PM-KISAN Samman Nidhi', status: 'PASS', quota: 'Direct Income Support', note: 'Tribal community land entitlement' },
        { name: 'Horticulture Mission for North East (HMNEH)', status: 'PASS', quota: '75% Spice Processing Unit Subsidy', note: 'Ginger/Arecanut processing' }
      ]
    },
    'KM26@0010': {
      id: 10,
      unique_id: 'KM26@0010',
      name: 'Lakshmi Sharma',
      state: 'Karnataka',
      district: 'Chitradurga',
      village: 'Jammapura',
      category: 'ST',
      farmer_class: 'Medium Farmer',
      income: '₹91,494 / yr',
      land: '5.10 Hectares',
      irrigation: 'Open Well & Canal (Tail-end)',
      crops: ['Sugarcane', 'Groundnut', 'Jowar'],
      livestock: ['Bullocks (2)', 'Buffaloes (2)'],
      schemes: [
        { name: 'PM-KISAN Samman Nidhi', status: 'PASS', quota: 'Direct Annual Benefit', note: 'BPL / ST category priority' },
        { name: 'PM Krishi Sinchayee Yojana (Drip & Sprinkler)', status: 'PASS', quota: '90% SC/ST Special Subsidy', note: 'Sugarcane water efficiency quota' },
        { name: 'Sub-Mission on Agricultural Mechanization (SMAM)', status: 'PASS', quota: '50% Subsidy on Power Tiller', note: 'Women farmer entitlement quota' }
      ]
    }
  };

  const SAMPLE_DIRECTIVES = {
    'solar': {
      title: 'Statutory Directive: PM-KUSUM Component-B (Solar Agri-Pump)',
      scheme: 'PM-KUSUM (Ministry of New and Renewable Energy & State Nodal Agency)',
      deliberation_steps: [
        'Turn 1: Evaluating applicant landholding (1.8 - 6.37 ha) against Component-B standalone pump eligibility rules...',
        'Turn 2: Cross-referencing grid power connectivity. Farmer verified as off-grid or diesel-pump replacement candidate.',
        'Turn 3: Resolving statutory subsidy allocation: Central Financial Assistance (30%) + State Government Subsidy (30-50%) + Farmer Contribution (20%).',
        'Turn 4: Checking SC/ST and North-Eastern State special allocations: Subsidy increases to up to 80-90% total.',
        'Turn 5: Formulating statutory procurement dossier, vendor Empanelled list, and online Portal submission SOP.'
      ],
      executive_summary: 'Applicant is statutorily entitled to a 70% to 80% subsidy for a 5HP / 7.5HP standalone DC solar water pumping system. Replacement of diesel generator provides estimated operational savings of ₹42,000 annually.',
      action_items: [
        '1. Download Statutory Form Annexure-I from State Renewable Energy Development Agency portal.',
        '2. Obtain Certificate of Non-Electrification or Diesel Pump affidavit from Gram Panchayat / Revenue Officer.',
        '3. Submit land RTC (Record of Rights, Tenancy & Crops) showing clear boundary ownership.',
        '4. Deposit 20% citizen share into the Escrow nodal account of the empaneled solar vendor.'
      ],
      checklist: ['Aadhaar Card (Seeded with NPCI)', 'Land RTC / Patta Passbook', 'Bank Account Mandate / Cancelled Cheque', 'Caste Certificate (for Enhanced 80% Subvention)', 'Passport Photos (3 copies)']
    },
    'aadhaar': {
      title: 'Statutory Directive: Aadhaar-NPCI Seeding & Land Record Rectification',
      scheme: 'PM-KISAN Statutory Redressal Mandate & DBT Bharat Guidelines',
      deliberation_steps: [
        'Turn 1: Diagnosing rejection code: "Aadhaar Name Mismatch" or "DBT Inactive / NPCI Mapper Not Found".',
        'Turn 2: Identifying statutory jurisdiction: Revenue Department (Land Record Bhoomi/Dharani) vs Lead Bank District Nodal Officer.',
        'Turn 3: Applying Section 7 of Aadhaar Act 2016 for demographic authentication without agricultural benefit forfeiture.',
        'Turn 4: Synthesizing administrative resolution pathway: e-KYC biometric update + Form DBTL bank seeding submission.',
        'Turn 5: Generating official grievance petition directed to the District Agricultural Officer (DAO).'
      ],
      executive_summary: 'Immediate administrative unblocking of stopped PM-KISAN installments is feasible through a 2-step statutory reconciliation: biometric e-KYC update at CSC and submission of the NPCI Mandate Form at the farmer’s home bank branch.',
      action_items: [
        '1. Visit Common Service Centre (CSC) for Biometric e-KYC update using Iris/Fingerprint authentication.',
        '2. Submit "Application for Aadhaar Seeding with NPCI Mapper" to the bank branch manager.',
        '3. Request bank officer to update the sub-code to "Active DBT Account" on the PFMS portal.',
        '4. Lodge formal tracking token on the PM-KISAN Grievance Redressal Portal.'
      ],
      checklist: ['Original Aadhaar Card', 'Bank Passbook showing IFSC & Account Number', 'Registered Mobile for OTP', 'Land Holding Record (Khatauni / RTC)', 'Grievance Petition Draft']
    },
    'organic': {
      title: 'Statutory Directive: Paramparagat Krishi Vikas Yojana & Organic Seed Kits',
      scheme: 'PKVY & National Mission on Natural Farming (Ministry of Agriculture & Farmers Welfare)',
      deliberation_steps: [
        'Turn 1: Analyzing landholding topography and chemical residue history for organic cluster eligibility.',
        'Turn 2: Reviewing PKVY cluster formation guidelines: Minimum 20 hectares or 50 farmers per PGS-India cluster.',
        'Turn 3: Computing financial entitlement: ₹50,000/ha across 3 years (₹31,000 direct transfer for organic inputs).',
        'Turn 4: Verifying Participatory Guarantee System (PGS-India) certification fee waiver for small & marginal farmers.',
        'Turn 5: Compiling official cluster registration form and block agriculture officer dispatch docket.'
      ],
      executive_summary: 'Applicant qualifies for comprehensive cluster assistance under PKVY, including direct assistance of ₹31,000 per hectare for on-farm organic inputs, bio-fertilizers, and zero-cost PGS-India organic certification.',
      action_items: [
        '1. Register with the Block Agricultural Assistant for local PGS-India Organic Cluster enrollment.',
        '2. Collect certified non-GMO organic seed mini-kit from the Taluk Raitha Samparka Kendra.',
        '3. Maintain the Local Group Farmer Diary for bi-annual peer verification.',
        '4. Avail ₹7,500/ha marketing and packaging assistance during harvest season.'
      ],
      checklist: ['Farmer Registration ID', 'Land Record showing cropping pattern', 'Bank DBT Mandate', 'Group Membership Affidavit (Panchayat verified)']
    }
  };

  /* --------------------------------------------------------------------------
   * 2. THEME CONTROLLER
   * -------------------------------------------------------------------------- */
  function initTheme() {
    const saved = localStorage.getItem('krishi_theme');
    const isDark = saved ? saved === 'dark' : true;
    applyTheme(isDark);

    const toggleBtn = document.getElementById('thbtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const currentlyDark = !document.getElementById('htmlRoot').classList.contains('lm');
        applyTheme(!currentlyDark);
      });
    }
  }

  function applyTheme(isDark) {
    const root = document.getElementById('htmlRoot');
    root.classList.toggle('lm', !isDark);
    localStorage.setItem('krishi_theme', isDark ? 'dark' : 'light');

    const sunIcon = document.getElementById('suni');
    const moonIcon = document.getElementById('mooni');
    if (sunIcon && moonIcon) {
      sunIcon.style.display = isDark ? 'none' : 'inline-block';
      moonIcon.style.display = isDark ? 'inline-block' : 'none';
    }
  }

  /* --------------------------------------------------------------------------
   * 3. NAVBAR SCROLL & MOBILE MENU
   * -------------------------------------------------------------------------- */
  function initNav() {
    const nbar = document.getElementById('nbar');
    window.addEventListener('scroll', () => {
      if (nbar) nbar.classList.toggle('scr', window.scrollY > 40);
    });

    const mbtog = document.getElementById('mbtog');
    const mbmenu = document.getElementById('mbmenu');
    const barIcon = document.getElementById('barIcon');
    const xIcon = document.getElementById('xIcon');

    if (mbtog && mbmenu) {
      mbtog.addEventListener('click', () => {
        const isOpen = mbmenu.classList.toggle('open');
        if (barIcon) barIcon.style.display = isOpen ? 'none' : 'inline-block';
        if (xIcon) xIcon.style.display = isOpen ? 'inline-block' : 'none';
      });

      mbmenu.querySelectorAll('a, button').forEach(el => {
        el.addEventListener('click', () => {
          mbmenu.classList.remove('open');
          if (barIcon) barIcon.style.display = 'inline-block';
          if (xIcon) xIcon.style.display = 'none';
        });
      });
    }
  }

  /* --------------------------------------------------------------------------
   * 4. INTERACTIVE HERO DELIBERATION SIMULATOR
   * -------------------------------------------------------------------------- */
  let typingTimer = null;

  function runDeliberationSimulation(key) {
    const directive = SAMPLE_DIRECTIVES[key] || SAMPLE_DIRECTIVES['solar'];
    const stepsContainer = document.getElementById('hero-hud-steps');
    const resultCard = document.getElementById('hero-hud-result');
    const statusPill = document.getElementById('hero-hud-status');

    if (!stepsContainer || !resultCard) return;

    if (typingTimer) clearInterval(typingTimer);

    // Reset display
    resultCard.style.display = 'none';
    stepsContainer.innerHTML = '';
    if (statusPill) statusPill.textContent = 'Gemma 4 Deliberating (Turn 1/5)...';

    let stepIndex = 0;
    const steps = directive.deliberation_steps;

    typingTimer = setInterval(() => {
      if (stepIndex < steps.length) {
        const p = document.createElement('div');
        p.className = 'mb-1 text-success';
        p.style.opacity = '0';
        p.style.transform = 'translateY(4px)';
        p.style.transition = 'all 0.25s ease';
        p.innerHTML = `<span class="text-white-50 me-2">></span>${steps[stepIndex]}`;
        stepsContainer.appendChild(p);

        setTimeout(() => {
          p.style.opacity = '1';
          p.style.transform = 'translateY(0)';
        }, 50);

        stepIndex++;
        if (statusPill) statusPill.textContent = `Gemma 4 Deliberating (Turn ${stepIndex}/5)...`;
      } else {
        clearInterval(typingTimer);
        if (statusPill) statusPill.textContent = 'Directive Finalized';

        // Show executive card
        resultCard.innerHTML = `
          <div class="p-3 rounded-3 mt-3" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3);">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="badge bg-success text-dark fw-bold">STATUTORY ACTION DIRECTIVE</span>
              <small class="text-white-50 font-monospace">Chief Secretary Resolution</small>
            </div>
            <h6 class="fw-bold text-white mb-2">${directive.title}</h6>
            <p class="small text-white-50 mb-3">${directive.executive_summary}</p>
            <div class="row g-2 small">
              <div class="col-md-7">
                <div class="fw-semibold text-success mb-1">Administrative Steps:</div>
                <ul class="list-unstyled mb-0 text-white-50" style="font-size:0.75rem;">
                  ${directive.action_items.map(a => `<li>${a}</li>`).join('')}
                </ul>
              </div>
              <div class="col-md-5">
                <div class="fw-semibold text-warning mb-1">Mandatory Dossier:</div>
                <div class="d-flex flex-wrap gap-1">
                  ${directive.checklist.map(c => `<span class="badge bg-dark text-white-50 border border-secondary" style="font-size:0.68rem;">${c}</span>`).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
        resultCard.style.display = 'block';
      }
    }, 450);
  }

  /* --------------------------------------------------------------------------
   * 5. FARMER PROFILE SWITCHER
   * -------------------------------------------------------------------------- */
  function selectFarmerProfile(farmerKey) {
    const farmer = SAMPLE_FARMERS[farmerKey];
    if (!farmer) return;

    // Highlight chip
    document.querySelectorAll('.farmer-chip-card').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-farmer') === farmerKey);
    });

    // Update Dossier card
    const container = document.getElementById('selected-farmer-dossier');
    if (!container) return;

    container.innerHTML = `
      <div class="gc p-4">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3 pb-3 border-bottom border-success border-opacity-25">
          <div class="d-flex align-items-center gap-3">
            <div style="width:54px;height:54px;border-radius:14px;background:var(--grad);color:#041f12;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;">
              ${farmer.name.charAt(0)}
            </div>
            <div>
              <div class="d-flex align-items-center gap-2">
                <h4 class="mb-0 fw-bold text-white">${farmer.name}</h4>
                <span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 font-monospace">${farmer.unique_id}</span>
                <span class="badge bg-warning text-dark fw-bold">ID #${farmer.id}</span>
              </div>
              <small class="text-white-50">
                <i class="fa-solid fa-location-dot text-danger me-1"></i> ${farmer.village}, ${farmer.district}, <strong>${farmer.state}</strong>
              </small>
            </div>
          </div>
          <button class="bgrd btn px-3 py-2 fs-6" onclick="quickLoginFarmer('${farmer.unique_id}')">
            🌾 Open Farmer Portal
          </button>
        </div>

        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3">
            <div class="stpill">
              <small class="text-white-50 d-block">Social / Farmer Category</small>
              <div class="fw-bold text-white">${farmer.category} • ${farmer.farmer_class}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stpill">
              <small class="text-white-50 d-block">Landholding Extent</small>
              <div class="fw-bold text-success">${farmer.land}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stpill">
              <small class="text-white-50 d-block">Irrigation Infrastructure</small>
              <div class="fw-bold text-info">${farmer.irrigation}</div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="stpill">
              <small class="text-white-50 d-block">Annual Family Income</small>
              <div class="fw-bold text-warning">${farmer.income}</div>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <span class="text-white-50 small me-2">Cropping Pattern:</span>
          ${farmer.crops.map(c => `<span class="badge bg-dark text-success border border-success border-opacity-25 me-1">${c}</span>`).join('')}
          <span class="text-white-50 small ms-3 me-2">Livestock:</span>
          ${farmer.livestock.map(l => `<span class="badge bg-dark text-warning border border-warning border-opacity-25 me-1">${l}</span>`).join('')}
        </div>

        <div class="mt-4">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h6 class="fw-bold text-white mb-0">Statutory Scheme Entitlement Matrix (Evaluated by Chief Secretary):</h6>
            <span class="badge bg-black text-success border border-success border-opacity-25">4-State Evaluator: 100% Deterministic</span>
          </div>
          <div class="row g-2">
            ${farmer.schemes.map(s => `
              <div class="col-md-6">
                <div class="p-3 rounded-3" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.07);">
                  <div class="d-flex align-items-center justify-content-between mb-1">
                    <strong class="text-white">${s.name}</strong>
                    <span class="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50">${s.status}</span>
                  </div>
                  <div class="small text-success">${s.quota}</div>
                  <small class="text-white-50 d-block mt-1">${s.note}</small>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  /* --------------------------------------------------------------------------
   * 6. QUICK LOGIN (USER ID ONLY - NO PASSWORD)
   * -------------------------------------------------------------------------- */
  function quickLoginFarmer(farmerId) {
    const farmer = SAMPLE_FARMERS[farmerId] || SAMPLE_FARMERS['KM26@0001'];
    localStorage.setItem('krishi_farmer_profile', JSON.stringify({
      found: true,
      farmer: {
        farmer_id: farmer.id,
        farmer_unique_id: farmer.unique_id,
        full_name: farmer.name,
        state: farmer.state,
        district: farmer.district,
        social_category: farmer.category,
        farmer_category: farmer.farmer_class
      }
    }));

    window.location.href = `dashboard_app.html?farmer=${farmer.unique_id}`;
  }

  /* --------------------------------------------------------------------------
   * 7. REACTIVE PILLARS CATEGORY FILTER
   * -------------------------------------------------------------------------- */
  function initPillarsFilter() {
    const filterButtons = document.querySelectorAll('.pillar-filter-btn');
    const cards = document.querySelectorAll('.pillar-col');

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');
        cards.forEach(card => {
          const category = card.getAttribute('data-category');
          if (filter === 'all' || category === filter) {
            card.style.display = 'block';
            card.style.opacity = '0';
            card.style.transform = 'translateY(10px)';
            setTimeout(() => {
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
              card.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
            }, 50);
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  /* --------------------------------------------------------------------------
   * 8. SMOOTH COUNTERUP ANIMATION
   * -------------------------------------------------------------------------- */
  function initCounters() {
    const counters = document.querySelectorAll('.pnum[data-target]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute('data-target'), 10);
          const prefix = el.getAttribute('data-prefix') || '';
          const suffix = el.getAttribute('data-suffix') || '';
          const duration = 1400;
          const start = 0;
          const startTime = performance.now();

          function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);
            
            el.textContent = `${prefix}${current.toLocaleString()}${suffix}`;

            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            } else {
              el.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
            }
          }

          requestAnimationFrame(updateCounter);
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(c => observer.observe(c));
  }

  /* --------------------------------------------------------------------------
   * 9. MOUSE SPOTLIGHT DYNAMIC TRACKING
   * -------------------------------------------------------------------------- */
  function initMouseSpotlight() {
    const cards = document.querySelectorAll('.gc');
    cards.forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });
  }

  /* --------------------------------------------------------------------------
   * 10. INITIALIZATION
   * -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNav();
    initPillarsFilter();
    initCounters();
    initMouseSpotlight();

    // Attach simulation chips if present
    document.querySelectorAll('.sim-chip').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.sim-chip').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        const key = this.getAttribute('data-sim');
        runDeliberationSimulation(key);
      });
    });

    // Attach farmer switcher if present
    document.querySelectorAll('.farmer-chip-card').forEach(card => {
      card.addEventListener('click', function () {
        const fKey = this.getAttribute('data-farmer');
        selectFarmerProfile(fKey);
      });
    });

    // Initialize first farmer profile if container exists
    selectFarmerProfile('KM26@0001');

    // Offcanvas login form
    const loginForm = document.getElementById('offcanvasLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const idInput = document.getElementById('offcanvasFarmerId');
        const val = idInput ? idInput.value.trim().toUpperCase() : 'KM26@0001';
        quickLoginFarmer(val);
        const offcanvasEl = document.getElementById('farmerLoginOffcanvas');
        if (offcanvasEl && window.bootstrap) {
          const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
          if (bsOffcanvas) bsOffcanvas.hide();
        }
      });
    }
  });

  // Export functions to window
  window.selectFarmerProfile = selectFarmerProfile;
  window.quickLoginFarmer = quickLoginFarmer;
  window.runDeliberationSimulation = runDeliberationSimulation;

})();
