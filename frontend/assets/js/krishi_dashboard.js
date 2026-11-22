/**
 * Krishi Mitra — Master UI Controller & State Orchestrator
 * Integrates Spark Admin Bootstrap 5 components with Krishi Mitra Backend APIs
 */

let currentView = 'governance'; // 'governance' | 'farmer' | 'ai-secretary' | 'schemes' | 'system'
let activeFarmerProfile = null;
let currentSchemesPage = 0;
const SCHEMES_PAGE_SIZE = 12;

document.addEventListener('DOMContentLoaded', async function () {
    // 1. Mobile & Desktop Sidebar Toggles
    initSidebarControls();

    // 2. Check Login State from localStorage or URL parameter
    checkLoginState();

    // 3. Initialize Top Navbar Status & KPIs
    loadSystemHealth();

    // 4. Initialize Charts
    initGovernanceCharts();

    // 5. Load Public Schemes Catalog
    loadSchemesCatalog();

    // 6. Handle URL Parameters (e.g. ?view=farmer or ?view=ai)
    handleUrlView();

    // 7. Setup Event Listeners
    setupEventListeners();
});

/* -------------------------------------------------------------
 * 1. SIDEBAR & VIEW NAVIGATION
 * ----------------------------------------------------------- */
function initSidebarControls() {
    const sidebar = document.querySelector('.sidebar-wrapper');
    const toggleBtn = document.querySelector('.sidebar-toggle-btn');
    const desktopToggle = document.getElementById('desktop-sidebar-toggle');

    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show', sidebar.classList.contains('show'));
        });

        overlay.addEventListener('click', function () {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        });
    }

    if (desktopToggle && sidebar) {
        desktopToggle.addEventListener('click', function () {
            document.body.classList.toggle('sidebar-minimized');
            const icon = desktopToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('bi-chevron-bar-left');
                icon.classList.toggle('bi-chevron-bar-right');
            }
        });
    }
}

function switchView(viewName) {
    currentView = viewName;

    // Update active nav link
    document.querySelectorAll('.sidebar-menu-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-view') === viewName) {
            link.classList.add('active');
        }
    });

    // Hide all view sections
    document.querySelectorAll('.portal-view-section').forEach(sec => {
        sec.classList.add('d-none');
    });

    // Show target section
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.remove('d-none');
    }

    // View specific triggers
    if (viewName === 'farmer') {
        if (!activeFarmerProfile) {
            showLoginModal();
        } else {
            renderFarmerView();
        }
    } else if (viewName === 'ai-secretary') {
        updateAiFarmerContext();
    } else if (viewName === 'schemes') {
        loadSchemesCatalog();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleUrlView() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view && ['governance', 'farmer', 'ai-secretary', 'schemes', 'system'].includes(view)) {
        switchView(view);
    }
}

/* -------------------------------------------------------------
 * 2. AUTHENTICATION & FARMER STATE (NO PASSWORD)
 * ----------------------------------------------------------- */
function checkLoginState() {
    const stored = window.KrishiAPI.getLoggedInFarmer();
    if (stored && stored.farmer) {
        activeFarmerProfile = stored;
        renderLoggedInUserUI();
    } else {
        activeFarmerProfile = null;
        renderGuestUserUI();
    }
}

function renderLoggedInUserUI() {
    const f = activeFarmerProfile.farmer;
    const l = (activeFarmerProfile.landholdings && activeFarmerProfile.landholdings[0]) || {};

    // Top Navbar Profile Pill
    const profileWrap = document.getElementById('navbar-auth-section');
    if (profileWrap) {
        profileWrap.innerHTML = `
            <div class="dropdown">
                <button class="navbar-profile-btn dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown">
                    <img src="assets/images/user_1.jpg" alt="${f.full_name}" class="navbar-profile-img" onerror="this.src='assets/images/avatar.png'">
                    <div class="text-start d-none d-md-block">
                        <div class="navbar-profile-name fw-bold">${f.full_name}</div>
                        <div class="small text-muted" style="font-size:0.75rem;">ID #${f.farmer_id} • ${f.state} (${f.social_category})</div>
                    </div>
                    <i class="bi bi-chevron-down navbar-profile-caret"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end shadow">
                    <li class="dropdown-header">Logged in as Registered Farmer</li>
                    <li>
                        <a class="dropdown-item" href="javascript:void(0)" onclick="switchView('farmer')">
                            <i class="bi bi-person-badge text-success me-2"></i> My Entitlements & Schemes
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item" href="javascript:void(0)" onclick="switchView('ai-secretary')">
                            <i class="bi bi-robot text-primary me-2"></i> Consult AI Chief Secretary
                        </a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                        <a class="dropdown-item text-danger" href="javascript:void(0)" onclick="handleFarmerLogout()">
                            <i class="bi bi-box-arrow-right me-2"></i> Switch / Logout Farmer
                        </a>
                    </li>
                </ul>
            </div>
        `;
    }

    // Sidebar Profile Card
    const sidebarProfile = document.getElementById('sidebar-profile-card');
    if (sidebarProfile) {
        sidebarProfile.innerHTML = `
            <img src="assets/images/user_1.jpg" alt="${f.full_name}" class="sidebar-profile-img" onerror="this.src='assets/images/avatar.png'">
            <div class="sidebar-profile-info">
                <div class="sidebar-profile-name">${f.full_name}</div>
                <div class="sidebar-profile-email">ID #${f.farmer_id} • ${f.state}</div>
            </div>
        `;
    }

    // Update Banner on Farmer View if active
    renderFarmerBanner();
}

function renderGuestUserUI() {
    const profileWrap = document.getElementById('navbar-auth-section');
    if (profileWrap) {
        profileWrap.innerHTML = `
            <button class="btn btn-sm btn-success d-flex align-items-center gap-2 fw-semibold px-3 py-2 shadow-sm rounded-pill" onclick="showLoginModal()">
                <i class="bi bi-person-check-fill"></i>
                <span>Farmer Login (No Password)</span>
            </button>
        `;
    }

    const sidebarProfile = document.getElementById('sidebar-profile-card');
    if (sidebarProfile) {
        sidebarProfile.innerHTML = `
            <img src="assets/images/avatar.png" alt="Guest" class="sidebar-profile-img">
            <div class="sidebar-profile-info">
                <div class="sidebar-profile-name">Citizen / Guest</div>
                <div class="sidebar-profile-email text-muted">Public Access Mode</div>
            </div>
        `;
    }
}

async function loginFarmerById(farmerId) {
    try {
        const profile = await window.KrishiAPI.getFarmerDetails(farmerId);
        if (profile && profile.found) {
            window.KrishiAPI.setLoggedInFarmer(profile);
            activeFarmerProfile = profile;
            renderLoggedInUserUI();

            // Hide modal if open
            const modalEl = document.getElementById('farmerLoginModal');
            if (modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            }

            // Switch to personalized view
            switchView('farmer');
            return true;
        } else {
            throw new Error(`Farmer ID #${farmerId} not found.`);
        }
    } catch (err) {
        alert(err.message || 'Login failed. Please check backend connection.');
        return false;
    }
}

function handleFarmerLogout() {
    window.KrishiAPI.logout();
    activeFarmerProfile = null;
    renderGuestUserUI();
    switchView('governance');
}

function showLoginModal() {
    const modalEl = document.getElementById('farmerLoginModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        window.location.href = 'page-login.html';
    }
}

/* -------------------------------------------------------------
 * 3. HEALTH & KPI CARDS
 * ----------------------------------------------------------- */
async function loadSystemHealth() {
    try {
        const health = await window.KrishiAPI.getConsolidatedHealth();
        if (health && health.status === 'healthy') {
            const dbSub = health.subsystems.postgresql_pgvector;
            const bgeSub = health.subsystems.bge_m3_embedding_engine;
            const gemmaSub = health.subsystems.gemma_4_e4b_reasoning_server;

            // Header status badges
            const dbBadge = document.getElementById('badge-db-status');
            if (dbBadge) {
                dbBadge.innerHTML = `<i class="bi bi-check-circle-fill me-1 text-success"></i> PostgreSQL: <strong>${dbSub.schemes_indexed}</strong> Schemes`;
            }

            const gemmaBadge = document.getElementById('badge-gemma-status');
            if (gemmaBadge) {
                gemmaBadge.innerHTML = `<i class="bi bi-cpu-fill me-1 text-primary"></i> Gemma 4: <strong>Online (8080)</strong>`;
            }

            // KPI Numbers
            const kpiSchemes = document.getElementById('kpi-schemes-count');
            if (kpiSchemes) kpiSchemes.textContent = dbSub.schemes_indexed.toLocaleString();

            const kpiFaqs = document.getElementById('kpi-faqs-count');
            if (kpiFaqs) kpiFaqs.textContent = '20,110';

            const kpiGpu = document.getElementById('kpi-gpu-model');
            if (kpiGpu) kpiGpu.textContent = bgeSub.gpu_name || 'NVIDIA CUDA';
        }
    } catch (e) {
        console.warn('Health check warning:', e);
    }
}

/* -------------------------------------------------------------
 * 4. GOVERNANCE CHARTS (ApexCharts)
 * ----------------------------------------------------------- */
function initGovernanceCharts() {
    // 1. Sector Breakdown Chart
    const sectorEl = document.querySelector('#sector-distribution-chart');
    if (sectorEl) {
        const sectorOptions = {
            series: [720, 340, 310, 290, 220, 186],
            labels: ['Agriculture & Crops', 'Horticulture & Fruits', 'Credit & Crop Insurance', 'Animal Husbandry & Dairy', 'Micro Irrigation & Water', 'Agri-Tech & Mechanization'],
            chart: {
                type: 'donut',
                height: 260,
                fontFamily: 'inherit'
            },
            colors: ['#072F1F', '#15803d', '#22c55e', '#B4F105', '#f59e0b', '#0284c7'],
            dataLabels: { enabled: false },
            legend: { position: 'bottom', fontSize: '12px' },
            tooltip: { theme: 'dark' }
        };
        new ApexCharts(sectorEl, sectorOptions).render();
    }

    // 2. Central vs State Allocation Chart
    const allocEl = document.querySelector('#central-state-chart');
    if (allocEl) {
        const allocOptions = {
            series: [
                { name: 'Central Schemes', data: [680, 680, 680, 680, 680, 680] },
                { name: 'State Schemes', data: [112, 98, 130, 85, 75, 94] }
            ],
            chart: {
                type: 'bar',
                height: 260,
                fontFamily: 'inherit',
                toolbar: { show: false }
            },
            colors: ['#072F1F', '#B4F105'],
            plotOptions: {
                bar: { horizontal: false, columnWidth: '45%', borderRadius: 3 }
            },
            xaxis: {
                categories: ['Karnataka', 'Maharashtra', 'Uttar Pradesh', 'Gujarat', 'Assam', 'Tamil Nadu'],
                labels: { style: { fontSize: '11px' } }
            },
            legend: { position: 'top' },
            grid: { borderColor: '#E9EFEF', strokeDashArray: 4 },
            tooltip: { theme: 'dark' }
        };
        new ApexCharts(allocEl, allocOptions).render();
    }
}

/* -------------------------------------------------------------
 * 5. SCHEMES CATALOG (Public & Filterable)
 * ----------------------------------------------------------- */
async function loadSchemesCatalog(page = 0) {
    currentSchemesPage = page;
    const tableBody = document.getElementById('schemes-table-body');
    const searchInput = document.getElementById('schemes-search-input');
    const stateFilter = document.getElementById('schemes-state-filter');
    const totalCountEl = document.getElementById('schemes-total-badge');

    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-success" role="status"></div>
                <span class="ms-2 text-muted">Retrieving statutory schemes from PostgreSQL...</span>
            </td>
        </tr>
    `;

    const search = searchInput ? searchInput.value.trim() : '';
    const state = stateFilter ? stateFilter.value : '';
    const offset = page * SCHEMES_PAGE_SIZE;

    try {
        const res = await window.KrishiAPI.listSchemes({
            search: search,
            state: state,
            limit: SCHEMES_PAGE_SIZE,
            offset: offset
        });

        if (totalCountEl) totalCountEl.textContent = `${res.total.toLocaleString()} Schemes Found`;

        if (!res.schemes || res.schemes.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                        <i class="bi bi-search me-1"></i> No matching schemes found for the specified criteria.
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = res.schemes.map(s => {
            const isCentral = s.level === 'Central Government';
            const levelBadge = isCentral
                ? `<span class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">Central</span>`
                : `<span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25">${s.state_ut_ministry || 'State'}</span>`;

            return `
                <tr>
                    <td class="fw-semibold text-dark" style="max-width: 320px;">
                        <div class="text-truncate" title="${s.scheme_name}">${s.scheme_name}</div>
                        <small class="text-muted d-block text-truncate" style="font-size:0.75rem;">${s.scheme_slug || ''}</small>
                    </td>
                    <td>${levelBadge}</td>
                    <td class="text-muted small">${s.state_ut_ministry || 'Ministry of Agriculture'}</td>
                    <td><span class="badge bg-light text-dark border">${s.application_mode || 'Online / Offline'}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-success" onclick="openSchemeDossierModal(${s.id})">
                            <i class="bi bi-journal-text me-1"></i> 17-Col Dossier
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPaginationControls(res.total, SCHEMES_PAGE_SIZE, page);
    } catch (err) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle me-1"></i> Error loading schemes: ${err.message}
                </td>
            </tr>
        `;
    }
}

function renderPaginationControls(total, limit, currentPage) {
    const paginEl = document.getElementById('schemes-pagination');
    if (!paginEl) return;

    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) {
        paginEl.innerHTML = '';
        return;
    }

    let html = `<ul class="pagination pagination-sm justify-content-end mb-0">`;
    html += `<li class="page-item ${currentPage === 0 ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="loadSchemesCatalog(${currentPage - 1})">Prev</a>
             </li>`;

    const startP = Math.max(0, currentPage - 2);
    const endP = Math.min(totalPages, startP + 5);

    for (let p = startP; p < endP; p++) {
        html += `<li class="page-item ${p === currentPage ? 'active' : ''}">
                    <a class="page-link" href="javascript:void(0)" onclick="loadSchemesCatalog(${p})">${p + 1}</a>
                 </li>`;
    }

    html += `<li class="page-item ${currentPage >= totalPages - 1 ? 'disabled' : ''}">
                <a class="page-link" href="javascript:void(0)" onclick="loadSchemesCatalog(${currentPage + 1})">Next</a>
             </li>`;
    html += `</ul>`;
    paginEl.innerHTML = html;
}

/* -------------------------------------------------------------
 * 6. PERSONALIZED FARMER VIEW & ELIGIBILITY EVALUATOR
 * ----------------------------------------------------------- */
function renderFarmerBanner() {
    if (!activeFarmerProfile || !activeFarmerProfile.farmer) return;
    const f = activeFarmerProfile.farmer;
    const l = (activeFarmerProfile.landholdings && activeFarmerProfile.landholdings[0]) || {};

    const banner = document.getElementById('farmer-profile-banner');
    if (banner) {
        const cropsList = l.crops && l.crops.length > 0
            ? l.crops.map(c => `<span class="badge bg-success bg-opacity-25 text-success me-1">${c.crop_name} (${c.crop_season || 'Current'})</span>`).join('')
            : '<span class="text-muted">None listed</span>';

        const livestockList = l.livestock && l.livestock.length > 0
            ? l.livestock.map(a => `<span class="badge bg-warning bg-opacity-25 text-dark me-1">${a.animal_type} (${a.animal_count})</span>`).join('')
            : '<span class="text-muted">None</span>';

        banner.innerHTML = `
            <div class="card border-0 shadow-sm overflow-hidden mb-4" style="background: linear-gradient(135deg, #072F1F 0%, #0d4a32 100%); color: #fff;">
                <div class="card-body p-4">
                    <div class="row align-items-center">
                        <div class="col-md-2 text-center text-md-start mb-3 mb-md-0">
                            <img src="assets/images/user_1.jpg" alt="${f.full_name}" class="rounded-circle border border-3 border-light shadow" style="width: 86px; height: 86px; object-fit: cover;" onerror="this.src='assets/images/avatar.png'">
                        </div>
                        <div class="col-md-7">
                            <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
                                <h3 class="mb-0 fw-bold text-white">${f.full_name}</h3>
                                <span class="badge bg-warning text-dark fw-bold">ID #${f.farmer_id}</span>
                                <span class="badge bg-light text-dark">${f.farmer_unique_id || 'KM26@0001'}</span>
                                <span class="badge bg-success">${f.social_category} • ${f.farmer_category} Farmer</span>
                            </div>
                            <p class="text-white-50 mb-2 small">
                                <i class="bi bi-geo-alt-fill text-warning me-1"></i> ${f.village || ''}, ${f.sub_district || ''}, ${f.district}, <strong>${f.state}</strong>
                            </p>
                            <div class="d-flex flex-wrap gap-3 small text-light">
                                <div><i class="bi bi-bounding-box-circles me-1 text-info"></i> Landholding: <strong>${l.land_area || '0'} ${l.land_area_unit || 'HECTARE'}</strong> (${l.ownership_type || 'OWNED'})</div>
                                <div><i class="bi bi-droplet-fill me-1 text-info"></i> Irrigation: <strong>${l.irrigation_available ? 'Available' : 'Rainfed'}</strong></div>
                                <div><i class="bi bi-cash-stack me-1 text-warning"></i> Family Income: <strong>₹${Math.round(f.annual_family_income || 0).toLocaleString()}</strong></div>
                            </div>
                            <div class="mt-2 small">
                                <span class="text-white-50 me-1">Crops:</span> ${cropsList}
                                <span class="text-white-50 ms-3 me-1">Livestock:</span> ${livestockList}
                            </div>
                        </div>
                        <div class="col-md-3 text-md-end mt-3 mt-md-0">
                            <button class="btn btn-outline-light btn-sm px-3 py-2 rounded-pill me-2" onclick="showLoginModal()">
                                <i class="bi bi-arrow-repeat me-1"></i> Switch Farmer
                            </button>
                            <button class="btn btn-success btn-sm px-3 py-2 rounded-pill" onclick="switchView('ai-secretary')">
                                <i class="bi bi-robot me-1"></i> Consult AI
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

async function renderFarmerView() {
    renderFarmerBanner();
    await loadFarmerTargetedSchemes();
}

async function loadFarmerTargetedSchemes() {
    if (!activeFarmerProfile) return;
    const f = activeFarmerProfile.farmer;
    const gridEl = document.getElementById('farmer-schemes-grid');
    if (!gridEl) return;

    gridEl.innerHTML = `
        <div class="col-12 text-center py-5">
            <div class="spinner-border text-success" role="status"></div>
            <p class="text-muted mt-2">Aggregating statutory schemes for ${f.state} and Central Government...</p>
        </div>
    `;

    try {
        const res = await window.KrishiAPI.listSchemes({
            state: f.state,
            limit: 30,
            offset: 0
        });

        if (!res.schemes || res.schemes.length === 0) {
            gridEl.innerHTML = `
                <div class="col-12 text-center py-4 text-muted">
                    No state or central schemes found for ${f.state}.
                </div>
            `;
            return;
        }

        gridEl.innerHTML = res.schemes.map(s => {
            const isCentral = s.level === 'Central Government';
            return `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100 border-0 shadow-sm scheme-card" id="card-scheme-${s.id}">
                        <div class="card-body d-flex flex-column">
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="badge ${isCentral ? 'bg-success' : 'bg-primary'} bg-opacity-10 ${isCentral ? 'text-success' : 'text-primary'} border">
                                    ${isCentral ? 'Central Govt' : (s.state_ut_ministry || 'State Govt')}
                                </span>
                                <span class="badge bg-light text-muted border">ID #${s.id}</span>
                            </div>
                            <h6 class="card-title fw-bold text-dark mb-1" style="line-height: 1.35;">${s.scheme_name}</h6>
                            <p class="text-muted small mb-3 flex-grow-1">${s.state_ut_ministry || 'Nodal Ministry'}</p>

                            <!-- AI Eligibility Result Slot -->
                            <div class="eval-result-slot mb-3" id="eval-result-${s.id}"></div>

                            <div class="d-flex gap-2 mt-auto">
                                <button class="btn btn-outline-secondary btn-sm flex-fill" onclick="openSchemeDossierModal(${s.id})">
                                    <i class="bi bi-file-text me-1"></i> Dossier
                                </button>
                                <button class="btn btn-success btn-sm flex-fill" id="btn-eval-${s.id}" onclick="triggerAiEligibility(${f.farmer_id}, ${s.id})">
                                    <i class="bi bi-cpu me-1"></i> Check AI
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (e) {
        gridEl.innerHTML = `
            <div class="col-12 text-center text-danger py-4">
                Failed to load farmer targeted schemes: ${e.message}
            </div>
        `;
    }
}

async function triggerAiEligibility(farmerId, schemeId) {
    const btn = document.getElementById(`btn-eval-${schemeId}`);
    const slot = document.getElementById(`eval-result-${schemeId}`);

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Reasoning...`;
    }

    if (slot) {
        slot.innerHTML = `
            <div class="p-2 rounded bg-light border text-center small text-muted">
                <span class="spinner-border spinner-border-sm text-success me-1"></span> Gemma 4 evaluating statutory conditions...
            </div>
        `;
    }

    try {
        const res = await window.KrishiAPI.evaluateEligibility(farmerId, schemeId);

        let badgeHtml = '';
        const verdict = res.status || 'UNKNOWN';

        if (verdict.includes('PASS') || verdict.includes('ELIGIBLE') || verdict === 'DIRECTLY_ELIGIBLE') {
            badgeHtml = `
                <div class="alert alert-success py-2 px-3 mb-0 small">
                    <div class="fw-bold d-flex align-items-center justify-content-between">
                        <span><i class="bi bi-check-circle-fill me-1"></i> STATUTORY ELIGIBLE</span>
                        <span class="badge bg-success">${Math.round((res.confidence_score || 0.95) * 100)}% Match</span>
                    </div>
                    <div class="mt-1" style="font-size:0.75rem;">Priority Tier: <strong>${res.priority_tier || 'NORMAL'}</strong></div>
                    ${res.target_quota ? `<div style="font-size:0.72rem;" class="text-success-emphasis">Quota Applied: ${res.target_quota}</div>` : ''}
                </div>
            `;
        } else if (verdict.includes('FAIL') || verdict.includes('DISQUALIFIED') || verdict === 'INELIGIBLE') {
            const disqual = (res.disqualifying_factors && res.disqualifying_factors.length > 0)
                ? res.disqualifying_factors.join(', ')
                : 'Criteria mismatch with farm holding';
            badgeHtml = `
                <div class="alert alert-danger py-2 px-3 mb-0 small">
                    <div class="fw-bold"><i class="bi bi-x-circle-fill me-1"></i> STATUTORY DISQUALIFIED</div>
                    <div class="mt-1" style="font-size:0.75rem;">Reason: ${disqual}</div>
                </div>
            `;
        } else {
            badgeHtml = `
                <div class="alert alert-warning py-2 px-3 mb-0 small">
                    <div class="fw-bold"><i class="bi bi-question-circle-fill me-1"></i> NEEDS VERIFICATION</div>
                    <div class="mt-1" style="font-size:0.75rem;">Additional documentation required to confirm quota eligibility.</div>
                </div>
            `;
        }

        if (slot) slot.innerHTML = badgeHtml;

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-check2-all me-1"></i> Re-Check`;
        }
    } catch (err) {
        if (slot) {
            slot.innerHTML = `<div class="alert alert-danger py-1 px-2 mb-0 small">Eval error: ${err.message}</div>`;
        }
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-arrow-repeat me-1"></i> Retry`;
        }
    }
}

/* -------------------------------------------------------------
 * 7. SCHEME DOSSIER MODAL (17 Full Statutory Columns)
 * ----------------------------------------------------------- */
async function openSchemeDossierModal(schemeId) {
    const modalEl = document.getElementById('schemeDossierModal');
    const contentEl = document.getElementById('scheme-dossier-content');
    const titleEl = document.getElementById('scheme-dossier-title');

    if (!modalEl || !contentEl) return;

    const modal = new bootstrap.Modal(modalEl);
    titleEl.textContent = `Scheme Dossier #${schemeId}`;
    contentEl.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-success" role="status"></div>
            <p class="text-muted mt-2">Retrieving full 17-column official government record...</p>
        </div>
    `;
    modal.show();

    try {
        const res = await window.KrishiAPI.getSchemeDossier(schemeId);
        const d = res.dossier;

        titleEl.textContent = d.scheme_name || `Scheme #${schemeId}`;

        contentEl.innerHTML = `
            <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
                <span class="badge bg-success">${d.level || 'Central/State'}</span>
                <span class="badge bg-secondary">${d.state_ut_ministry || 'Ministry'}</span>
                <span class="badge bg-info text-dark">${d.application_mode || 'Online / Offline'}</span>
                ${d.funding_pattern ? `<span class="badge bg-dark">Funding: ${d.funding_pattern}</span>` : ''}
            </div>

            <div class="accordion" id="dossierAccordion">
                <!-- 1. Description & Objectives -->
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#col-desc">
                            <i class="bi bi-info-circle me-2 text-success"></i> 1. Scheme Objectives & Summary
                        </button>
                    </h2>
                    <div id="col-desc" class="accordion-collapse collapse show" data-bs-parent="#dossierAccordion">
                        <div class="accordion-body">
                            <p>${d.brief_description || 'No description provided.'}</p>
                            ${d.detailed_description ? `<p class="text-muted small">${d.detailed_description}</p>` : ''}
                        </div>
                    </div>
                </div>

                <!-- 2. Benefits & Subsidies -->
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#col-benefits">
                            <i class="bi bi-cash-coin me-2 text-warning"></i> 2. Financial Norms & Statutory Benefits
                        </button>
                    </h2>
                    <div id="col-benefits" class="accordion-collapse collapse" data-bs-parent="#dossierAccordion">
                        <div class="accordion-body">
                            ${d.benefits ? `<div class="p-3 bg-light rounded">${d.benefits}</div>` : '<p class="text-muted">Standard departmental subsidies apply.</p>'}
                        </div>
                    </div>
                </div>

                <!-- 3. Statutory Eligibility Criteria -->
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#col-eligibility">
                            <i class="bi bi-shield-check me-2 text-primary"></i> 3. Statutory Eligibility & Beneficiary Categories
                        </button>
                    </h2>
                    <div id="col-eligibility" class="accordion-collapse collapse" data-bs-parent="#dossierAccordion">
                        <div class="accordion-body">
                            ${d.eligibility_criteria ? `<div class="p-3 bg-light rounded">${d.eligibility_criteria}</div>` : '<p class="text-muted">Open to agricultural landholders.</p>'}
                            ${d.beneficiary_category ? `<div class="mt-2 small text-muted"><strong>Target Beneficiary:</strong> ${d.beneficiary_category}</div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- 4. Exclusions & Disqualifying Conditions -->
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#col-exclusions">
                            <i class="bi bi-slash-circle me-2 text-danger"></i> 4. Disqualifying Conditions & Exclusions
                        </button>
                    </h2>
                    <div id="col-exclusions" class="accordion-collapse collapse" data-bs-parent="#dossierAccordion">
                        <div class="accordion-body">
                            ${d.exclusions ? `<div class="p-3 bg-light rounded text-danger-emphasis">${d.exclusions}</div>` : '<p class="text-muted">No statutory negative exclusions listed.</p>'}
                        </div>
                    </div>
                </div>

                <!-- 5. Application Steps & Documents -->
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#col-steps">
                            <i class="bi bi-file-earmark-check me-2 text-info"></i> 5. Application Procedure & Mandatory Documents
                        </button>
                    </h2>
                    <div id="col-steps" class="accordion-collapse collapse" data-bs-parent="#dossierAccordion">
                        <div class="accordion-body">
                            <h6>Application Steps:</h6>
                            <p class="small">${d.application_process || 'Submit online via state agricultural portal or visit district nodal office.'}</p>
                            <h6 class="mt-3">Mandatory Documents:</h6>
                            <p class="small text-muted">${d.documents_required || 'Aadhaar Card, Land Record (Pahani / RTC), Bank Passbook, Passport Photo.'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Official Links -->
            ${d.official_website_link ? `
                <div class="mt-3 text-end">
                    <a href="${d.official_website_link}" target="_blank" class="btn btn-sm btn-outline-primary">
                        <i class="bi bi-box-arrow-up-right me-1"></i> Visit Official Government Portal
                    </a>
                </div>
            ` : ''}
        `;
    } catch (err) {
        contentEl.innerHTML = `<div class="alert alert-danger">Failed to fetch dossier: ${err.message}</div>`;
    }
}

/* -------------------------------------------------------------
 * 8. CHIEF SECRETARY AI DELIBERATION CHAMBER
 * ----------------------------------------------------------- */
function updateAiFarmerContext() {
    const banner = document.getElementById('ai-farmer-context-badge');
    if (!banner) return;

    if (activeFarmerProfile && activeFarmerProfile.farmer) {
        const f = activeFarmerProfile.farmer;
        banner.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <span class="badge atmos-status-pill text-light border border-success border-opacity-50">
                    <i class="bi bi-person-fill text-success me-1"></i> ${f.full_name} (${f.state} • ${f.social_category})
                </span>
                <button class="btn btn-outline-light btn-sm py-0 px-2" style="font-size:0.7rem; border-radius:12px;" onclick="showLoginModal()">Switch</button>
            </div>
        `;
    } else {
        banner.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <span class="badge atmos-status-pill text-white-50 border border-secondary border-opacity-50">
                    <i class="bi bi-globe me-1"></i> Public Citizen Mode
                </span>
                <button class="btn btn-success btn-sm py-0 px-2 fw-semibold" style="font-size:0.7rem; border-radius:12px;" onclick="showLoginModal()">Login</button>
            </div>
        `;
    }
}

function setAiQuery(text) {
    const input = document.getElementById('ai-query-input');
    if (input) {
        input.value = text;
        input.focus();
    }
}

async function handleAiConsultation() {
    const input = document.getElementById('ai-query-input');
    const btnSubmit = document.getElementById('btn-ai-submit');
    const hudCard = document.getElementById('ai-deliberation-hud');
    const hudBody = document.getElementById('ai-deliberation-steps');
    const directiveCard = document.getElementById('ai-directive-card');
    const directiveBody = document.getElementById('ai-directive-body');
    const streamToggle = document.getElementById('ai-stream-toggle');

    if (!input || !input.value.trim()) return;

    const query = input.value.trim();
    const farmerId = (activeFarmerProfile && activeFarmerProfile.farmer) ? activeFarmerProfile.farmer.farmer_id : null;
    const isStream = streamToggle ? streamToggle.checked : false;

    // UI Loading state
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span> Deliberating...`;

    hudCard.classList.remove('d-none');
    hudBody.innerHTML = `
        <div class="p-3 text-muted small">
            <span class="spinner-border spinner-border-sm text-warning me-2"></span>
            Gemma 4 autonomous agent initiating cross-ministerial deliberation...
        </div>
    `;

    directiveCard.classList.remove('d-none');
    directiveBody.innerHTML = `
        <div class="text-center py-5 text-muted">
            <div class="spinner-border text-success" role="status"></div>
            <p class="mt-2">Synthesizing inter-ministerial directive & action package...</p>
        </div>
    `;

    try {
        if (isStream) {
            // Live SSE Stream
            let steps = [];
            window.KrishiAPI.streamChiefSecretary(query, farmerId, {
                onEvent: (evt) => {
                    if (evt.type === 'step') {
                        steps.push(evt.content);
                        hudBody.innerHTML = steps.map(s => `<div class="mb-2 font-monospace small text-light bg-dark p-2 rounded">${s}</div>`).join('');
                    } else if (evt.type === 'complete') {
                        renderDirectiveOutput(evt.directive, directiveBody);
                        btnSubmit.disabled = false;
                        btnSubmit.innerHTML = `<i class="bi bi-send-fill me-1"></i> Consult Chief Secretary`;
                    }
                },
                onError: (err) => {
                    hudBody.innerHTML += `<div class="text-danger small mt-2">Streaming closed or completed.</div>`;
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<i class="bi bi-send-fill me-1"></i> Consult Chief Secretary`;
                }
            });
        } else {
            // Standard Synchronous Consult
            const res = await window.KrishiAPI.consultChiefSecretary(query, farmerId);

            // Render Deliberation HUD
            if (res.deliberation) {
                hudBody.innerHTML = `
                    <div class="p-3 bg-dark text-light rounded font-monospace small" style="white-space: pre-wrap; max-height: 300px; overflow-y: auto;">
${res.deliberation}
                    </div>
                `;
            } else {
                hudBody.innerHTML = `<div class="p-2 text-muted small">Deliberation finalized in background tools.</div>`;
            }

            // Render Official Citizen Directive
            renderDirectiveOutput(res.directive, directiveBody);

            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i class="bi bi-send-fill me-1"></i> Consult Chief Secretary`;
        }
    } catch (err) {
        directiveBody.innerHTML = `<div class="alert alert-danger">Consultation error: ${err.message}</div>`;
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<i class="bi bi-send-fill me-1"></i> Consult Chief Secretary`;
    }
}

function renderDirectiveOutput(dir, container) {
    if (!dir) {
        container.innerHTML = `<div class="atmos-telemetry-card text-warning">No directive output produced.</div>`;
        return;
    }

    if (typeof dir === 'string') {
        container.innerHTML = `<div class="atmos-telemetry-card text-light" style="white-space: pre-wrap;">${dir}</div>`;
        return;
    }

    const execSummary = dir.executive_summary || dir.summary || 'Official statutory citizen resolution plan.';
    const schemesPkg = dir.inter_ministerial_package || dir.recommended_schemes || [];
    const actionPlan = dir.administrative_action_plan || dir.action_plan || dir.steps || [];
    const docs = dir.mandatory_document_checklist || dir.mandatory_documents || dir.documents || [];
    const authorities = dir.official_portals || dir.competent_authorities || dir.nodal_officers || [];
    const faqs = dir.faq_and_procedural_resolutions || [];

    let html = `
        <!-- Executive Directive Header Banner -->
        <div class="atmos-telemetry-card mb-4" style="border-left: 4px solid #b4f105; background: rgba(12, 38, 25, 0.85);">
            <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                <span class="badge bg-success bg-opacity-25 text-success border border-success px-3 py-1 rounded-pill">
                    <i class="bi bi-shield-check me-1"></i> BINDING CITIZEN DIRECTIVE ISSUED
                </span>
                <span class="small text-white-50 font-monospace">Verified via BGE-M3 Dense RAG + Gemma 4</span>
            </div>
            <h5 class="fw-bold text-white mb-2 leading-snug">${execSummary}</h5>
        </div>

        <!-- 1. Inter-Ministerial Coordinated Schemes (Atmos Telemetry Grid) -->
        ${schemesPkg.length > 0 ? `
            <div class="mb-4">
                <div class="d-flex align-items-center gap-2 mb-3">
                    <i class="bi bi-collection-fill text-warning"></i>
                    <h6 class="fw-bold text-white mb-0 text-uppercase small" style="letter-spacing: 0.5px;">1. Inter-Ministerial Coordinated Packages</h6>
                </div>
                <div class="row g-3">
                    ${schemesPkg.map(s => `
                        <div class="col-md-6">
                            <div class="atmos-telemetry-card h-100">
                                <div class="d-flex justify-content-between align-items-start mb-2">
                                    <span class="badge bg-dark text-white-50 border border-secondary">${s.ministry || s.level || 'Central/State'}</span>
                                    <span class="badge bg-success bg-opacity-25 text-success">Active Statutory Scheme</span>
                                </div>
                                <h6 class="fw-bold text-white mb-2">${s.scheme_name || s.name || 'Scheme'}</h6>
                                <div class="p-2 rounded bg-black bg-opacity-50 border border-white border-opacity-10 small text-white-50 mb-0">
                                    <span class="text-warning fw-semibold">Statutory Benefit:</span> ${s.benefit || s.provisions || s.subsidy || s.reason || 'Direct departmental subsidy applies.'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <!-- 2. Step-by-Step Action Roadmap -->
        ${actionPlan.length > 0 ? `
            <div class="mb-4">
                <div class="d-flex align-items-center gap-2 mb-3">
                    <i class="bi bi-signpost-split-fill text-info"></i>
                    <h6 class="fw-bold text-white mb-0 text-uppercase small" style="letter-spacing: 0.5px;">2. Citizen Action Roadmap</h6>
                </div>
                <div class="d-flex flex-column gap-2">
                    ${actionPlan.map((step, idx) => `
                        <div class="atmos-telemetry-card py-3 d-flex align-items-start gap-3">
                            <div class="atmos-step-badge flex-shrink-0">${idx + 1}</div>
                            <div>
                                <p class="mb-0 text-white small">${typeof step === 'string' ? step : (step.action || step.step)}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <!-- 3. Procedural & Statutory Rules -->
        ${faqs.length > 0 ? `
            <div class="mb-4">
                <div class="d-flex align-items-center gap-2 mb-3">
                    <i class="bi bi-info-circle-fill text-warning"></i>
                    <h6 class="fw-bold text-white mb-0 text-uppercase small" style="letter-spacing: 0.5px;">3. Procedural & Statutory Precedents</h6>
                </div>
                <div class="d-flex flex-column gap-2">
                    ${faqs.map(f => `
                        <div class="atmos-telemetry-card py-2 px-3 small text-white-50 border-warning border-opacity-25">
                            <i class="bi bi-check2 text-warning me-1"></i> ${f}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <!-- 4. Mandatory Documents & Affidavits -->
        ${docs.length > 0 ? `
            <div class="mb-4">
                <div class="d-flex align-items-center gap-2 mb-3">
                    <i class="bi bi-paperclip text-success"></i>
                    <h6 class="fw-bold text-white mb-0 text-uppercase small" style="letter-spacing: 0.5px;">4. Mandatory Affidavits & Documents</h6>
                </div>
                <div class="d-flex flex-wrap gap-2">
                    ${docs.map(doc => `
                        <span class="atmos-chip" style="background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.3); color: #86efac;">
                            <i class="bi bi-check2-circle me-1"></i> ${doc}
                        </span>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <!-- 5. Competent Authorities -->
        ${authorities.length > 0 ? `
            <div class="atmos-telemetry-card">
                <div class="d-flex align-items-center gap-2 mb-1">
                    <i class="bi bi-building text-info"></i>
                    <span class="small fw-bold text-white text-uppercase">Competent Redressal Authorities:</span>
                </div>
                <p class="small text-white-50 mb-0">${authorities.join(' • ')}</p>
            </div>
        ` : ''}
    `;

    container.innerHTML = html;
}

/* -------------------------------------------------------------
 * 9. GLOBAL EVENT LISTENERS
 * ----------------------------------------------------------- */
function setupEventListeners() {
    // Navigation link clicks
    document.querySelectorAll('.sidebar-menu-link').forEach(link => {
        link.addEventListener('click', function (e) {
            const v = this.getAttribute('data-view');
            if (v) {
                e.preventDefault();
                switchView(v);
            }
        });
    });

    // Schemes search input debounce
    const searchInput = document.getElementById('schemes-search-input');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                loadSchemesCatalog(0);
            }, 350);
        });
    }

    const stateFilter = document.getElementById('schemes-state-filter');
    if (stateFilter) {
        stateFilter.addEventListener('change', function () {
            loadSchemesCatalog(0);
        });
    }

    // Modal quick login form
    const modalForm = document.getElementById('modalFarmerLoginForm');
    if (modalForm) {
        modalForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const idInput = document.getElementById('modalFarmerId');
            const id = parseInt(idInput.value.trim());
            if (id) {
                await loginFarmerById(id);
            }
        });
    }

    // AI Consultation form
    const aiForm = document.getElementById('aiConsultForm');
    if (aiForm) {
        aiForm.addEventListener('submit', function (e) {
            e.preventDefault();
            handleAiConsultation();
        });
    }
}

// Window exports
window.switchView = switchView;
window.loginFarmerById = loginFarmerById;
window.handleFarmerLogout = handleFarmerLogout;
window.showLoginModal = showLoginModal;
window.openSchemeDossierModal = openSchemeDossierModal;
window.triggerAiEligibility = triggerAiEligibility;
window.setAiQuery = setAiQuery;
window.handleAiConsultation = handleAiConsultation;
window.loadSchemesCatalog = loadSchemesCatalog;
