/**
 * KrishiMitra AI — Farmer Authentication & 6-Table PostgreSQL Registration Controller
 */

(function () {
    'use strict';

    const state = {
        mode: 'login',
        step: 1,
        uniqueIdCheckedValue: '',
        uniqueIdAvailable: false,
        statesCache: null,
        selectedLgdLocation: null, // { location_id, state_name, district_name, sub_district_name, village_name, ...codes }
        plots: [],
        crops: [],
        trees: [],
        livestock: [],
        nextPlotKey: 1,
        nextCropKey: 1,
        nextTreeKey: 1,
        nextLivestockKey: 1,
    };

    const $ = (id) => document.getElementById(id);

    function esc(val) {
        if (val === null || val === undefined) return '';
        return String(val)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function nullIfEmpty(val) {
        if (val === null || val === undefined) return null;
        const s = String(val).trim();
        return s === '' ? null : s;
    }

    function numOrNull(val, isInt = false) {
        const s = nullIfEmpty(val);
        if (s === null) return null;
        const n = isInt ? parseInt(s, 10) : parseFloat(s);
        return Number.isFinite(n) ? n : null;
    }

    function boolOrNull(val) {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return null;
    }

    // -------------------------------------------------------------------------
    // Mode & Wizard Navigation
    // -------------------------------------------------------------------------
    function setAuthMode(mode) {
        state.mode = mode === 'register' ? 'register' : 'login';
        const isReg = state.mode === 'register';

        $('authShellCard').classList.toggle('is-register-wide', isReg);
        $('tabBtnLogin').classList.toggle('active', !isReg);
        $('tabBtnRegister').classList.toggle('active', isReg);
        $('loginPanel').classList.toggle('d-none', isReg);
        $('registerPanel').classList.toggle('d-none', !isReg);

        $('authHeaderTitle').innerHTML = isReg
            ? 'New Farmer <span class="gt">Registration</span>'
            : 'Farmer <span class="gt">Portal Sign In</span>';
        $('authHeaderSubtitle').textContent = isReg
            ? 'Create your unique User ID & Password and complete any optional profile details below.'
            : 'Enter your registered User ID and Password to unlock personalized scheme eligibility and your Farmer Dashboard.';

        if (isReg) {
            setWizardStep(state.step);
            ensureLgdStatesLoaded();
        }
    }

    function setWizardStep(stepNum) {
        state.step = Math.max(1, Math.min(3, stepNum));
        [1, 2, 3].forEach((n) => {
            const pane = $(`regStep${n}`);
            if (pane) pane.classList.toggle('d-none', n !== state.step);
        });

        document.querySelectorAll('.wizard-step-pill').forEach((pill) => {
            const s = parseInt(pill.getAttribute('data-step'), 10);
            pill.classList.toggle('active', s === state.step);
            pill.classList.toggle('completed', s < state.step);
        });

        $('regError').classList.add('d-none');
        if (state.step === 3) {
            renderAllStep3Collections();
        }
    }

    function showLoginError(msg) {
        const box = $('loginError');
        box.textContent = msg;
        box.classList.remove('d-none');
        $('loginSuccess').classList.add('d-none');
    }

    function showLoginSuccess(msg) {
        const box = $('loginSuccess');
        box.textContent = msg;
        box.classList.remove('d-none');
        $('loginError').classList.add('d-none');
    }

    function showRegError(msg) {
        const box = $('regError');
        box.textContent = msg;
        box.classList.remove('d-none');
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // -------------------------------------------------------------------------
    // Password Eye Toggles & Demo Chips
    // -------------------------------------------------------------------------
    function bindPasswordToggle(btnId, inputId) {
        const btn = $(btnId);
        const inp = $(inputId);
        if (!btn || !inp) return;
        btn.addEventListener('click', () => {
            const isPw = inp.type === 'password';
            inp.type = isPw ? 'text' : 'password';
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = isPw ? 'bi bi-eye-slash' : 'bi bi-eye';
            }
        });
    }

    // -------------------------------------------------------------------------
    // LOGIN SUBMIT (`User ID` + `Password` checked against PostgreSQL)
    // -------------------------------------------------------------------------
    async function handleLoginSubmit(e) {
        e.preventDefault();
        $('loginError').classList.add('d-none');

        const uid = $('farmerUniqueId').value.trim();
        const pw = $('farmerPassword').value;

        if (!uid || !pw) {
            showLoginError('Please enter both your Farmer User ID and Password.');
            return;
        }

        const btn = $('loginSubmitBtn');
        const btnText = $('loginBtnText');
        btn.disabled = true;
        btnText.textContent = 'Verifying with PostgreSQL...';

        try {
            const data = await window.KrishiAPI.loginFarmer(uid, pw);
            if (!data || !data.found || !data.farmer) {
                throw new Error('Farmer profile could not be loaded.');
            }

            localStorage.setItem('krishi_farmer_profile', JSON.stringify({
                ...data,
                authenticated: true,
                logged_in_at: new Date().toISOString()
            }));

            btnText.textContent = `Welcome ${data.farmer.full_name || data.farmer.farmer_unique_id}! Opening Dashboard...`;
            const farmerParam = encodeURIComponent(data.farmer.farmer_unique_id || uid);
            setTimeout(() => {
                window.location.href = `dashboard_app.html?farmer=${farmerParam}`;
            }, 350);
        } catch (err) {
            showLoginError(err.message || 'Authentication failed. Check User ID, Password, and API server (port 8000).');
            btn.disabled = false;
            btnText.textContent = 'Verify & Open Farmer Dashboard';
        }
    }

    // -------------------------------------------------------------------------
    // STEP 1: Live User ID Validation & PostgreSQL Uniqueness Check
    // -------------------------------------------------------------------------
    function updateRuleChecklist(val) {
        const checks = {
            ruleLen: val.length >= 8 && val.length <= 20,
            ruleLetter: /[A-Za-z]/.test(val),
            ruleDigit: /[0-9]/.test(val),
            ruleSpecial: /[@#$_-]/.test(val) && /^[A-Za-z0-9@#$_-]*$/.test(val)
        };
        Object.entries(checks).forEach(([id, ok]) => {
            const el = $(id);
            if (!el) return;
            el.classList.toggle('pass', ok);
            el.classList.toggle('fail', val.length > 0 && !ok);
            const icon = el.querySelector('i');
            if (icon) {
                icon.className = ok
                    ? 'bi bi-check-circle-fill me-1'
                    : (val.length > 0 ? 'bi bi-x-circle-fill me-1' : 'bi bi-circle me-1');
            }
        });
        return Object.values(checks).every(Boolean);
    }

    async function checkUniqueIdInDb() {
        const uid = $('regUniqueId').value.trim();
        const statusBox = $('uniqueIdStatus');
        updateRuleChecklist(uid);

        if (!uid) {
            state.uniqueIdCheckedValue = '';
            state.uniqueIdAvailable = false;
            statusBox.className = 'small mt-2 text-danger';
            statusBox.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Please enter a User ID first.';
            statusBox.classList.remove('d-none');
            return false;
        }

        statusBox.className = 'small mt-2 text-muted';
        statusBox.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Checking availability in PostgreSQL...';
        statusBox.classList.remove('d-none');

        try {
            const res = await window.KrishiAPI.checkUniqueId(uid);
            state.uniqueIdCheckedValue = res.farmer_unique_id;
            state.uniqueIdAvailable = Boolean(res.valid_format && res.available);

            if (state.uniqueIdAvailable) {
                statusBox.className = 'small mt-2 alert alert-success py-1 px-2 mb-0';
                statusBox.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i>${esc(res.message)}`;
            } else {
                statusBox.className = 'small mt-2 alert alert-danger py-1 px-2 mb-0';
                statusBox.innerHTML = `<i class="bi bi-x-octagon-fill me-1"></i>${esc(res.message)}`;
            }
            return state.uniqueIdAvailable;
        } catch (err) {
            state.uniqueIdAvailable = false;
            statusBox.className = 'small mt-2 alert alert-warning py-1 px-2 mb-0';
            statusBox.innerHTML = `<i class="bi bi-wifi-off me-1"></i>Could not reach backend check API: ${esc(err.message)}`;
            return false;
        }
    }

    async function validateStep1AndAdvance() {
        $('regError').classList.add('d-none');
        const uid = $('regUniqueId').value.trim();
        const pw = $('regPassword').value;
        const pwConfirm = $('regPasswordConfirm').value;

        if (!uid) {
            showRegError('Please create a Farmer User ID.');
            $('regUniqueId').focus();
            return;
        }

        if (state.uniqueIdCheckedValue.toLowerCase() !== uid.toLowerCase() || !state.uniqueIdAvailable) {
            const ok = await checkUniqueIdInDb();
            if (!ok) {
                showRegError('Your User ID is either invalid or already taken in the database. Please create another available User ID.');
                $('regUniqueId').focus();
                return;
            }
        }

        if (!pw || pw.trim() === '') {
            showRegError('Please create a non-empty Password.');
            $('regPassword').focus();
            return;
        }

        if (pw !== pwConfirm) {
            showRegError('Passwords do not match. Please re-enter the same password.');
            $('regPasswordConfirm').focus();
            return;
        }

        setWizardStep(2);
    }

    // -------------------------------------------------------------------------
    // STEP 2: LGD Location Cascading Selectors & Age Helper
    // -------------------------------------------------------------------------
    async function ensureLgdStatesLoaded() {
        const stateSel = $('regLgdState');
        if (!stateSel || state.statesCache) return;

        try {
            const res = await window.KrishiAPI.getLocationStates();
            state.statesCache = res.states || [];
            populateStateSelect(stateSel, state.statesCache);
        } catch (err) {
            console.warn('LGD states failed to load:', err.message);
        }
    }

    function populateStateSelect(selectEl, rows, selectedVal = '') {
        selectEl.innerHTML = '<option value="">-- Select State (Optional) --</option>';
        rows.forEach((s) => {
            const opt = document.createElement('option');
            opt.value = s.state_name;
            opt.textContent = `${s.state_name} (LGD Code: ${s.state_code})`;
            if (selectedVal && selectedVal.toLowerCase() === s.state_name.toLowerCase()) {
                opt.selected = true;
            }
            selectEl.appendChild(opt);
        });
    }

    async function handleProfileStateChange() {
        const st = $('regLgdState').value;
        const distSel = $('regLgdDistrict');
        const subSel = $('regLgdSubDistrict');
        const vilSel = $('regLgdVillage');

        state.selectedLgdLocation = null;
        updateProfileLocationDisplay();

        distSel.innerHTML = '<option value="">-- Select District --</option>';
        subSel.innerHTML = '<option value="">-- Select Sub-District --</option>';
        vilSel.innerHTML = '<option value="">-- Select Village --</option>';
        distSel.disabled = true;
        subSel.disabled = true;
        vilSel.disabled = true;

        if (!st) return;

        try {
            const res = await window.KrishiAPI.getLocationDistricts(st);
            (res.districts || []).forEach((d) => {
                const opt = document.createElement('option');
                opt.value = d.district_name;
                opt.textContent = `${d.district_name} (Code: ${d.district_code})`;
                distSel.appendChild(opt);
            });
            distSel.disabled = false;
        } catch (err) {
            showRegError(err.message);
        }
    }

    async function handleProfileDistrictChange() {
        const st = $('regLgdState').value;
        const dist = $('regLgdDistrict').value;
        const subSel = $('regLgdSubDistrict');
        const vilSel = $('regLgdVillage');

        state.selectedLgdLocation = null;
        updateProfileLocationDisplay();

        subSel.innerHTML = '<option value="">-- Select Sub-District --</option>';
        vilSel.innerHTML = '<option value="">-- Select Village --</option>';
        subSel.disabled = true;
        vilSel.disabled = true;

        if (!st || !dist) return;

        try {
            const res = await window.KrishiAPI.getLocationSubDistricts(st, dist);
            (res.sub_districts || []).forEach((sd) => {
                const opt = document.createElement('option');
                opt.value = sd.sub_district_name;
                opt.textContent = `${sd.sub_district_name} (Code: ${sd.sub_district_code})`;
                subSel.appendChild(opt);
            });
            subSel.disabled = false;
        } catch (err) {
            showRegError(err.message);
        }
    }

    async function handleProfileSubDistrictChange() {
        const st = $('regLgdState').value;
        const dist = $('regLgdDistrict').value;
        const sub = $('regLgdSubDistrict').value;
        const vilSel = $('regLgdVillage');

        state.selectedLgdLocation = null;
        updateProfileLocationDisplay();

        vilSel.innerHTML = '<option value="">-- Select Village --</option>';
        vilSel.disabled = true;

        if (!st || !dist || !sub) return;

        try {
            const res = await window.KrishiAPI.getLocationVillages(st, dist, sub);
            (res.villages || []).forEach((v) => {
                const opt = document.createElement('option');
                opt.value = String(v.location_id);
                opt.dataset.villageName = v.village_name;
                opt.dataset.villageCode = v.village_code;
                opt.dataset.stateCode = v.state_code;
                opt.dataset.districtCode = v.district_code;
                opt.dataset.subDistrictCode = v.sub_district_code;
                opt.textContent = `${v.village_name} (LGD Village Code: ${v.village_code})`;
                vilSel.appendChild(opt);
            });
            vilSel.disabled = false;
        } catch (err) {
            showRegError(err.message);
        }
    }

    function handleProfileVillageChange() {
        const vilSel = $('regLgdVillage');
        const opt = vilSel.options[vilSel.selectedIndex];
        if (!opt || !opt.value) {
            state.selectedLgdLocation = null;
        } else {
            state.selectedLgdLocation = {
                location_id: parseInt(opt.value, 10),
                state_name: $('regLgdState').value,
                district_name: $('regLgdDistrict').value,
                sub_district_name: $('regLgdSubDistrict').value,
                village_name: opt.dataset.villageName,
                village_code: opt.dataset.villageCode,
                state_code: opt.dataset.stateCode,
                district_code: opt.dataset.districtCode,
                sub_district_code: opt.dataset.subDistrictCode,
            };
        }
        updateProfileLocationDisplay();
    }

    function updateProfileLocationDisplay() {
        const isManual = $('regManualLocToggle').checked;
        const metaBox = $('regLgdMetaBox');
        const metaText = $('regLgdMetaText');
        const idDisplay = $('regResolvedLocationIdDisplay');

        if (!isManual && state.selectedLgdLocation) {
            const loc = state.selectedLgdLocation;
            metaBox.style.display = 'block';
            metaText.innerHTML =
                `Resolved <code>india_locations.location_id = ${loc.location_id}</code> ` +
                `(State Code ${esc(loc.state_code)} / District ${esc(loc.district_code)} / Sub-Dist ${esc(loc.sub_district_code)} / Village ${esc(loc.village_code)})`;
            idDisplay.textContent = String(loc.location_id);
        } else {
            metaBox.style.display = 'none';
            idDisplay.textContent = 'Not selected';
        }
    }

    function getCurrentProfileLocationValues() {
        if ($('regManualLocToggle').checked) {
            return {
                state: nullIfEmpty($('regManualState').value),
                district: nullIfEmpty($('regManualDistrict').value),
                sub_district: nullIfEmpty($('regManualSubDistrict').value),
                village: nullIfEmpty($('regManualVillage').value),
                location_id: null,
            };
        }
        return {
            state: nullIfEmpty($('regLgdState').value),
            district: nullIfEmpty($('regLgdDistrict').value),
            sub_district: nullIfEmpty($('regLgdSubDistrict').value),
            village: state.selectedLgdLocation ? state.selectedLgdLocation.village_name : null,
            location_id: state.selectedLgdLocation ? state.selectedLgdLocation.location_id : null,
        };
    }

    // -------------------------------------------------------------------------
    // STEP 3: Dynamic Multi-Row Builders (Landholdings, Crops, Trees, Livestock)
    // -------------------------------------------------------------------------
    function buildPlotOptionsHtml(selectedKey, allowNullUnassigned) {
        let html = allowNullUnassigned
            ? `<option value="">-- General / Not linked to a specific plot --</option>`
            : '';

        state.plots.forEach((plot, idx) => {
            const labelParts = [`Plot #${idx + 1}`];
            if (plot.land_area) labelParts.push(`${plot.land_area} ha`);
            if (plot.village) labelParts.push(plot.village);
            else if (plot.district) labelParts.push(plot.district);
            const selected = String(selectedKey) === String(plot.key) ? 'selected' : '';
            html += `<option value="${plot.key}" ${selected}>${esc(labelParts.join(' — '))}</option>`;
        });
        return html;
    }

    function addPlotRow(prefill = {}) {
        const profLoc = getCurrentProfileLocationValues();
        state.plots.push({
            key: state.nextPlotKey++,
            land_area: prefill.land_area ?? '',
            input_unit: prefill.input_unit || 'HECTARE',
            ownership_type: prefill.ownership_type ?? '',
            irrigation_available: prefill.irrigation_available ?? '',
            state: prefill.state ?? (profLoc.state || ''),
            district: prefill.district ?? (profLoc.district || ''),
            village: prefill.village ?? (profLoc.village || ''),
            location_id: prefill.location_id ?? profLoc.location_id ?? null,
        });
        renderAllStep3Collections();
    }

    function addCropRow() {
        const defaultPlotKey = state.plots.length > 0 ? String(state.plots[0].key) : '';
        state.crops.push({
            key: state.nextCropKey++,
            plot_key: defaultPlotKey,
            crop_name: '',
            crop_season: '',
            cultivation_year: '',
        });
        renderCrops();
    }

    function addTreeRow() {
        if (state.plots.length === 0) {
            showRegError('Add at least 1 landholding plot first — PostgreSQL `farmer_trees` requires a non-null `(farmer_id, landholding_id)` link.');
            return;
        }
        state.trees.push({
            key: state.nextTreeKey++,
            plot_key: String(state.plots[0].key),
            tree_name: '',
            tree_variety: '',
            tree_count: '',
            tree_age_years: '',
            purpose: '',
        });
        renderTrees();
    }

    function addLivestockRow() {
        if (state.plots.length === 0) {
            showRegError('Add at least 1 landholding plot first — PostgreSQL `farmer_livestock` requires a non-null `(farmer_id, landholding_id)` link.');
            return;
        }
        state.livestock.push({
            key: state.nextLivestockKey++,
            plot_key: String(state.plots[0].key),
            animal_type: '',
            breed: '',
            animal_count: '',
            age_years: '',
            purpose: '',
        });
        renderLivestock();
    }

    function renderPlots() {
        const container = $('plotsContainer');
        if (state.plots.length === 0) {
            container.innerHTML = `<div class="small auth-muted fst-italic py-2">No landholding plots added yet. Click "Add Plot" to attach land records, or leave empty.</div>`;
            return;
        }

        container.innerHTML = state.plots.map((plot, idx) => `
            <div class="repeatable-card" data-plot-key="${plot.key}">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <strong class="small text-success">Plot #${idx + 1}</strong>
                <div class="d-flex gap-2">
                  <button type="button" class="btn btn-outline-secondary btn-sm py-0 px-2 copy-prof-loc-btn" data-key="${plot.key}">
                    <i class="bi bi-geo-alt me-1"></i>Copy Profile Location
                  </button>
                  <button type="button" class="btn btn-outline-danger btn-sm py-0 px-2 remove-plot-btn" data-key="${plot.key}">
                    <i class="bi bi-trash"></i> Remove
                  </button>
                </div>
              </div>
              <div class="row g-2">
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Land Area (land_area)</label>
                  <input type="number" step="0.01" min="0" class="form-control form-control-sm plot-field" data-key="${plot.key}" data-field="land_area" value="${esc(plot.land_area)}" placeholder="e.g. 1.50" />
                </div>
                <div class="col-md-2">
                  <label class="form-label small fw-bold mb-1">Input Unit</label>
                  <select class="form-select form-select-sm plot-field" data-key="${plot.key}" data-field="input_unit">
                    <option value="HECTARE" ${plot.input_unit === 'HECTARE' ? 'selected' : ''}>HECTARE</option>
                    <option value="ACRE" ${plot.input_unit === 'ACRE' ? 'selected' : ''}>Acres (&rarr; ha)</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Ownership Type</label>
                  <select class="form-select form-select-sm plot-field" data-key="${plot.key}" data-field="ownership_type">
                    <option value="" ${plot.ownership_type === '' ? 'selected' : ''}>-- Select (Optional) --</option>
                    <option value="OWNED" ${plot.ownership_type === 'OWNED' ? 'selected' : ''}>OWNED</option>
                    <option value="LEASED" ${plot.ownership_type === 'LEASED' ? 'selected' : ''}>LEASED</option>
                    <option value="TENANT" ${plot.ownership_type === 'TENANT' ? 'selected' : ''}>TENANT</option>
                    <option value="SHARED" ${plot.ownership_type === 'SHARED' ? 'selected' : ''}>SHARED</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label small fw-bold mb-1">Irrigation Available</label>
                  <select class="form-select form-select-sm plot-field" data-key="${plot.key}" data-field="irrigation_available">
                    <option value="" ${plot.irrigation_available === '' ? 'selected' : ''}>-- Select (Optional) --</option>
                    <option value="true" ${plot.irrigation_available === 'true' ? 'selected' : ''}>Yes (Irrigated)</option>
                    <option value="false" ${plot.irrigation_available === 'false' ? 'selected' : ''}>No (Rainfed)</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Plot State</label>
                  <input type="text" class="form-control form-control-sm plot-field" data-key="${plot.key}" data-field="state" value="${esc(plot.state)}" placeholder="Optional" />
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Plot District</label>
                  <input type="text" class="form-control form-control-sm plot-field" data-key="${plot.key}" data-field="district" value="${esc(plot.district)}" placeholder="Optional" />
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Plot Village</label>
                  <input type="text" class="form-control form-control-sm plot-field" data-key="${plot.key}" data-field="village" value="${esc(plot.village)}" placeholder="Optional" />
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">LGD location_id</label>
                  <input type="number" min="1" class="form-control form-control-sm plot-field" data-key="${plot.key}" data-field="location_id" value="${esc(plot.location_id ?? '')}" placeholder="Optional" />
                </div>
              </div>
            </div>
        `).join('');

        container.querySelectorAll('.plot-field').forEach((el) => {
            el.addEventListener('input', handlePlotFieldChange);
            el.addEventListener('change', handlePlotFieldChange);
        });
        container.querySelectorAll('.remove-plot-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = parseInt(btn.getAttribute('data-key'), 10);
                state.plots = state.plots.filter((p) => p.key !== key);
                // Re-anchor dependent rows if removed
                const fallbackKey = state.plots.length > 0 ? String(state.plots[0].key) : '';
                state.crops.forEach((c) => {
                    if (String(c.plot_key) === String(key)) c.plot_key = fallbackKey;
                });
                if (state.plots.length === 0) {
                    state.trees = [];
                    state.livestock = [];
                } else {
                    state.trees.forEach((t) => {
                        if (String(t.plot_key) === String(key)) t.plot_key = fallbackKey;
                    });
                    state.livestock.forEach((l) => {
                        if (String(l.plot_key) === String(key)) l.plot_key = fallbackKey;
                    });
                }
                renderAllStep3Collections();
            });
        });
        container.querySelectorAll('.copy-prof-loc-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = parseInt(btn.getAttribute('data-key'), 10);
                const plot = state.plots.find((p) => p.key === key);
                if (!plot) return;
                const loc = getCurrentProfileLocationValues();
                plot.state = loc.state || '';
                plot.district = loc.district || '';
                plot.village = loc.village || '';
                plot.location_id = loc.location_id ?? '';
                renderAllStep3Collections();
            });
        });
    }

    function handlePlotFieldChange(e) {
        const key = parseInt(e.target.getAttribute('data-key'), 10);
        const field = e.target.getAttribute('data-field');
        const plot = state.plots.find((p) => p.key === key);
        if (!plot) return;
        plot[field] = e.target.value;
        if (field === 'land_area' || field === 'village' || field === 'district') {
            renderCrops();
            renderTrees();
            renderLivestock();
        }
    }

    function renderCrops() {
        const container = $('cropsContainer');
        if (state.crops.length === 0) {
            container.innerHTML = `<div class="small auth-muted fst-italic py-2">No crop entries added yet. Click "Add Crop" to attach seasonal crop records.</div>`;
            return;
        }

        container.innerHTML = state.crops.map((crop, idx) => `
            <div class="repeatable-card">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <strong class="repeatable-title">Crop #${idx + 1}</strong>
                <button type="button" class="btn btn-outline-danger btn-sm py-0 px-2 remove-crop-btn" data-key="${crop.key}">
                  <i class="bi bi-trash"></i> Remove
                </button>
              </div>
              <div class="row g-2">
                <div class="col-md-4">
                  <label class="form-label small fw-bold mb-1">Plot Link (landholding_id)</label>
                  <select class="form-select form-select-sm crop-field" data-key="${crop.key}" data-field="plot_key">
                    ${buildPlotOptionsHtml(crop.plot_key, true)}
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Crop Name (crop_name)</label>
                  <input type="text" class="form-control form-control-sm crop-field" data-key="${crop.key}" data-field="crop_name" value="${esc(crop.crop_name)}" placeholder="e.g. Paddy, Wheat" />
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Season (crop_season)</label>
                  <select class="form-select form-select-sm crop-field" data-key="${crop.key}" data-field="crop_season">
                    <option value="" ${crop.crop_season === '' ? 'selected' : ''}>-- Select Season (Optional) --</option>
                    <option value="Kharif" ${crop.crop_season === 'Kharif' ? 'selected' : ''}>Kharif</option>
                    <option value="Rabi" ${crop.crop_season === 'Rabi' ? 'selected' : ''}>Rabi</option>
                    <option value="Zaid" ${crop.crop_season === 'Zaid' ? 'selected' : ''}>Zaid</option>
                    <option value="Perennial" ${crop.crop_season === 'Perennial' ? 'selected' : ''}>Perennial</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <label class="form-label small fw-bold mb-1">Year</label>
                  <input type="number" min="1990" max="2035" class="form-control form-control-sm crop-field" data-key="${crop.key}" data-field="cultivation_year" value="${esc(crop.cultivation_year)}" placeholder="2026" />
                </div>
              </div>
            </div>
        `).join('');

        container.querySelectorAll('.crop-field').forEach((el) => {
            el.addEventListener('input', (e) => {
                const key = parseInt(e.target.getAttribute('data-key'), 10);
                const field = e.target.getAttribute('data-field');
                const item = state.crops.find((c) => c.key === key);
                if (item) item[field] = e.target.value;
            });
            el.addEventListener('change', (e) => {
                const key = parseInt(e.target.getAttribute('data-key'), 10);
                const field = e.target.getAttribute('data-field');
                const item = state.crops.find((c) => c.key === key);
                if (item) item[field] = e.target.value;
            });
        });
        container.querySelectorAll('.remove-crop-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = parseInt(btn.getAttribute('data-key'), 10);
                state.crops = state.crops.filter((c) => c.key !== key);
                renderCrops();
            });
        });
    }

    function renderTrees() {
        const container = $('treesContainer');
        const hasPlots = state.plots.length > 0;
        $('addTreeBtn').disabled = !hasPlots;
        $('treesFkHint').classList.toggle('d-none', hasPlots);

        if (state.trees.length === 0) {
            container.innerHTML = `<div class="small auth-muted fst-italic py-1">No tree entries added.</div>`;
            return;
        }

        container.innerHTML = state.trees.map((tree, idx) => `
            <div class="repeatable-card">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <strong class="repeatable-title">Tree Record #${idx + 1}</strong>
                <button type="button" class="btn btn-outline-danger btn-sm py-0 px-2 remove-tree-btn" data-key="${tree.key}">
                  <i class="bi bi-trash"></i> Remove
                </button>
              </div>
              <div class="row g-2">
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Plot (landholding_id *)</label>
                  <select class="form-select form-select-sm tree-field" data-key="${tree.key}" data-field="plot_key">
                    ${buildPlotOptionsHtml(tree.plot_key, false)}
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Tree Name (tree_name *)</label>
                  <input type="text" class="form-control form-control-sm tree-field" data-key="${tree.key}" data-field="tree_name" value="${esc(tree.tree_name)}" placeholder="e.g. Coconut, Mango" />
                </div>
                <div class="col-md-2">
                  <label class="form-label small fw-bold mb-1">Variety</label>
                  <input type="text" class="form-control form-control-sm tree-field" data-key="${tree.key}" data-field="tree_variety" value="${esc(tree.tree_variety)}" placeholder="Optional" />
                </div>
                <div class="col-md-1">
                  <label class="form-label small fw-bold mb-1">Count *</label>
                  <input type="number" min="1" class="form-control form-control-sm tree-field" data-key="${tree.key}" data-field="tree_count" value="${esc(tree.tree_count)}" placeholder="1+" />
                </div>
                <div class="col-md-1">
                  <label class="form-label small fw-bold mb-1">Age (yr)</label>
                  <input type="number" min="0" step="0.5" class="form-control form-control-sm tree-field" data-key="${tree.key}" data-field="tree_age_years" value="${esc(tree.tree_age_years)}" placeholder="0+" />
                </div>
                <div class="col-md-2">
                  <label class="form-label small fw-bold mb-1">Purpose</label>
                  <select class="form-select form-select-sm tree-field" data-key="${tree.key}" data-field="purpose">
                    <option value="" ${tree.purpose === '' ? 'selected' : ''}>-- Select (Optional) --</option>
                    <option value="Commercial" ${tree.purpose === 'Commercial' ? 'selected' : ''}>Commercial</option>
                    <option value="Fruit" ${tree.purpose === 'Fruit' ? 'selected' : ''}>Fruit</option>
                    <option value="Shade" ${tree.purpose === 'Shade' ? 'selected' : ''}>Shade</option>
                    <option value="Timber" ${tree.purpose === 'Timber' ? 'selected' : ''}>Timber</option>
                  </select>
                </div>
              </div>
            </div>
        `).join('');

        container.querySelectorAll('.tree-field').forEach((el) => {
            el.addEventListener('input', (e) => {
                const key = parseInt(e.target.getAttribute('data-key'), 10);
                const field = e.target.getAttribute('data-field');
                const item = state.trees.find((t) => t.key === key);
                if (item) item[field] = e.target.value;
            });
            el.addEventListener('change', (e) => {
                const key = parseInt(e.target.getAttribute('data-key'), 10);
                const field = e.target.getAttribute('data-field');
                const item = state.trees.find((t) => t.key === key);
                if (item) item[field] = e.target.value;
            });
        });
        container.querySelectorAll('.remove-tree-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = parseInt(btn.getAttribute('data-key'), 10);
                state.trees = state.trees.filter((t) => t.key !== key);
                renderTrees();
            });
        });
    }

    function renderLivestock() {
        const container = $('livestockContainer');
        const hasPlots = state.plots.length > 0;
        $('addLivestockBtn').disabled = !hasPlots;
        $('livestockFkHint').classList.toggle('d-none', hasPlots);

        if (state.livestock.length === 0) {
            container.innerHTML = `<div class="small auth-muted fst-italic py-1">No livestock entries added.</div>`;
            return;
        }

        container.innerHTML = state.livestock.map((animal, idx) => `
            <div class="repeatable-card">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <strong class="repeatable-title">Livestock Record #${idx + 1}</strong>
                <button type="button" class="btn btn-outline-danger btn-sm py-0 px-2 remove-livestock-btn" data-key="${animal.key}">
                  <i class="bi bi-trash"></i> Remove
                </button>
              </div>
              <div class="row g-2">
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Plot (landholding_id *)</label>
                  <select class="form-select form-select-sm livestock-field" data-key="${animal.key}" data-field="plot_key">
                    ${buildPlotOptionsHtml(animal.plot_key, false)}
                  </select>
                </div>
                <div class="col-md-3">
                  <label class="form-label small fw-bold mb-1">Animal Type (animal_type *)</label>
                  <input type="text" class="form-control form-control-sm livestock-field" data-key="${animal.key}" data-field="animal_type" value="${esc(animal.animal_type)}" placeholder="e.g. Cow, Buffalo, Goat" />
                </div>
                <div class="col-md-2">
                  <label class="form-label small fw-bold mb-1">Breed</label>
                  <input type="text" class="form-control form-control-sm livestock-field" data-key="${animal.key}" data-field="breed" value="${esc(animal.breed)}" placeholder="Optional" />
                </div>
                <div class="col-md-1">
                  <label class="form-label small fw-bold mb-1">Count *</label>
                  <input type="number" min="1" class="form-control form-control-sm livestock-field" data-key="${animal.key}" data-field="animal_count" value="${esc(animal.animal_count)}" placeholder="1+" />
                </div>
                <div class="col-md-1">
                  <label class="form-label small fw-bold mb-1">Age (yr)</label>
                  <input type="number" min="0" step="0.5" class="form-control form-control-sm livestock-field" data-key="${animal.key}" data-field="age_years" value="${esc(animal.age_years)}" placeholder="0+" />
                </div>
                <div class="col-md-2">
                  <label class="form-label small fw-bold mb-1">Purpose</label>
                  <select class="form-select form-select-sm livestock-field" data-key="${animal.key}" data-field="purpose">
                    <option value="" ${animal.purpose === '' ? 'selected' : ''}>-- Select (Optional) --</option>
                    <option value="Dairy" ${animal.purpose === 'Dairy' ? 'selected' : ''}>Dairy</option>
                    <option value="Milk" ${animal.purpose === 'Milk' ? 'selected' : ''}>Milk</option>
                    <option value="Breeding" ${animal.purpose === 'Breeding' ? 'selected' : ''}>Breeding</option>
                    <option value="Eggs" ${animal.purpose === 'Eggs' ? 'selected' : ''}>Eggs</option>
                    <option value="Meat" ${animal.purpose === 'Meat' ? 'selected' : ''}>Meat</option>
                    <option value="Wool" ${animal.purpose === 'Wool' ? 'selected' : ''}>Wool</option>
                  </select>
                </div>
              </div>
            </div>
        `).join('');

        container.querySelectorAll('.livestock-field').forEach((el) => {
            el.addEventListener('input', (e) => {
                const key = parseInt(e.target.getAttribute('data-key'), 10);
                const field = e.target.getAttribute('data-field');
                const item = state.livestock.find((l) => l.key === key);
                if (item) item[field] = e.target.value;
            });
            el.addEventListener('change', (e) => {
                const key = parseInt(e.target.getAttribute('data-key'), 10);
                const field = e.target.getAttribute('data-field');
                const item = state.livestock.find((l) => l.key === key);
                if (item) item[field] = e.target.value;
            });
        });
        container.querySelectorAll('.remove-livestock-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = parseInt(btn.getAttribute('data-key'), 10);
                state.livestock = state.livestock.filter((l) => l.key !== key);
                renderLivestock();
            });
        });
    }

    function renderAllStep3Collections() {
        renderPlots();
        renderCrops();
        renderTrees();
        renderLivestock();
    }

    // -------------------------------------------------------------------------
    // BUILD PAYLOAD (Empty -> SQL NULL, Index Remapping) & SUBMIT REGISTRATION
    // -------------------------------------------------------------------------
    function buildRegistrationPayload() {
        const loc = getCurrentProfileLocationValues();

        // Compact plots so blank plots are omitted and plot_index maps accurately
        const activePlots = [];
        const keyToIndex = new Map();

        state.plots.forEach((p) => {
            let areaVal = numOrNull(p.land_area, false);
            if (areaVal !== null && p.input_unit === 'ACRE') {
                areaVal = Math.round(areaVal * 0.404686 * 10000) / 10000;
            }
            const ownership = nullIfEmpty(p.ownership_type);
            const irrig = boolOrNull(p.irrigation_available);
            const pState = nullIfEmpty(p.state);
            const pDistrict = nullIfEmpty(p.district);
            const pVillage = nullIfEmpty(p.village);
            const pLocId = numOrNull(p.location_id, true);

            const hasAny = areaVal !== null || ownership !== null || irrig !== null ||
                pState !== null || pDistrict !== null || pVillage !== null || pLocId !== null;
            if (!hasAny) return;

            const idx = activePlots.length;
            keyToIndex.set(String(p.key), idx);
            activePlots.push({
                land_area: areaVal,
                land_area_unit: 'HECTARE',
                ownership_type: ownership,
                irrigation_available: irrig,
                state: pState,
                district: pDistrict,
                village: pVillage,
                location_id: pLocId,
            });
        });

        const crops = [];
        state.crops.forEach((c) => {
            const cropName = nullIfEmpty(c.crop_name);
            const cropSeason = nullIfEmpty(c.crop_season);
            const cultYear = numOrNull(c.cultivation_year, true);
            if (cropName === null && cropSeason === null && cultYear === null) return;

            const plotIdx = c.plot_key && keyToIndex.has(String(c.plot_key))
                ? keyToIndex.get(String(c.plot_key))
                : null;
            crops.push({
                plot_index: plotIdx,
                crop_name: cropName,
                crop_season: cropSeason,
                cultivation_year: cultYear,
            });
        });

        const trees = [];
        for (const t of state.trees) {
            const treeName = nullIfEmpty(t.tree_name);
            const treeVar = nullIfEmpty(t.tree_variety);
            const treeCount = numOrNull(t.tree_count, true);
            const treeAge = numOrNull(t.tree_age_years, false);
            const purpose = nullIfEmpty(t.purpose);
            if (treeName === null && treeCount === null && treeVar === null && treeAge === null && purpose === null) {
                continue;
            }
            const plotIdx = keyToIndex.get(String(t.plot_key));
            if (plotIdx === undefined) {
                throw new Error('Every tree record must be linked to a non-empty Landholding Plot.');
            }
            trees.push({
                plot_index: plotIdx,
                tree_name: treeName,
                tree_variety: treeVar,
                tree_count: treeCount,
                tree_age_years: treeAge,
                purpose: purpose,
            });
        }

        const livestock = [];
        for (const l of state.livestock) {
            const animalType = nullIfEmpty(l.animal_type);
            const breed = nullIfEmpty(l.breed);
            const animalCount = numOrNull(l.animal_count, true);
            const ageYears = numOrNull(l.age_years, false);
            const purpose = nullIfEmpty(l.purpose);
            if (animalType === null && animalCount === null && breed === null && ageYears === null && purpose === null) {
                continue;
            }
            const plotIdx = keyToIndex.get(String(l.plot_key));
            if (plotIdx === undefined) {
                throw new Error('Every livestock record must be linked to a non-empty Landholding Plot.');
            }
            livestock.push({
                plot_index: plotIdx,
                animal_type: animalType,
                breed: breed,
                animal_count: animalCount,
                age_years: ageYears,
                purpose: purpose,
            });
        }

        return {
            farmer_unique_id: $('regUniqueId').value.trim(),
            password: $('regPassword').value,
            full_name: nullIfEmpty($('regFullName').value),
            date_of_birth: nullIfEmpty($('regDob').value),
            gender: nullIfEmpty($('regGender').value),
            mobile_number: nullIfEmpty($('regMobile').value),
            state: loc.state,
            district: loc.district,
            sub_district: loc.sub_district,
            village: loc.village,
            pincode: nullIfEmpty($('regPincode').value),
            location_id: loc.location_id,
            social_category: nullIfEmpty($('regSocialCategory').value),
            farmer_category: nullIfEmpty($('regFarmerCategory').value),
            annual_family_income: numOrNull($('regAnnualIncome').value, false),
            kcc_holder: boolOrNull($('regKccHolder').value),
            farmer_registration_id: nullIfEmpty($('regFruitsId').value),
            profile_verification_status: nullIfEmpty($('regVerificationStatus').value) || 'UNVERIFIED',
            landholdings: activePlots,
            crops: crops,
            trees: trees,
            livestock: livestock,
        };
    }

    async function handleRegisterSubmit(e) {
        e.preventDefault();
        $('regError').classList.add('d-none');

        const submitBtn = $('regSubmitBtn');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Saving to PostgreSQL...';

        try {
            const payload = buildRegistrationPayload();
            const res = await window.KrishiAPI.registerFarmer(payload);

            // Reset form & switch cleanly back to Login tab (do NOT auto-login)
            const createdUid = res.farmer_unique_id;
            $('newFarmerRegisterForm').reset();
            state.plots = [];
            state.crops = [];
            state.trees = [];
            state.livestock = [];
            state.selectedLgdLocation = null;
            state.uniqueIdCheckedValue = '';
            state.uniqueIdAvailable = false;
            state.step = 1;

            setAuthMode('login');
            $('farmerUniqueId').value = createdUid;
            $('farmerPassword').value = '';
            $('farmerPassword').focus();

            showLoginSuccess(
                `Registered "${createdUid}" (ID #${res.farmer_id} | Plots: ${res.landholdings_created}, Crops: ${res.crops_created}, Trees: ${res.trees_created}, Livestock: ${res.livestock_created}). Please enter your Password to sign in.`
            );
        } catch (err) {
            showRegError(err.message || 'Could not save farmer registration.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
        }
    }

    // -------------------------------------------------------------------------
    // THEME & SPOTLIGHT (SHARED WITH index.html)
    // -------------------------------------------------------------------------
    function applyTheme(isDark) {
        const root = document.getElementById('htmlRoot');
        if (root) {
            root.classList.toggle('lm', !isDark);
            root.setAttribute('data-bs-theme', isDark ? 'dark' : 'light');
        }
        localStorage.setItem('krishi_theme', isDark ? 'dark' : 'light');

        const sunIcon = $('suni');
        const moonIcon = $('mooni');
        if (sunIcon && moonIcon) {
            sunIcon.style.display = isDark ? 'none' : 'inline-block';
            moonIcon.style.display = isDark ? 'inline-block' : 'none';
        }
    }

    function initThemeAndEffects() {
        const saved = localStorage.getItem('krishi_theme');
        const isDark = saved ? saved === 'dark' : true;
        applyTheme(isDark);

        const toggleBtn = $('thbtn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                const root = document.getElementById('htmlRoot');
                const currentlyDark = !root || !root.classList.contains('lm');
                applyTheme(!currentlyDark);
            });
        }

        const nbar = $('nbar');
        if (nbar) {
            window.addEventListener('scroll', () => {
                nbar.classList.toggle('scr', window.scrollY > 40);
            });
        }

        document.querySelectorAll('.gc').forEach((card) => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
            });
        });
    }

    // -------------------------------------------------------------------------
    // INIT
    // -------------------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', () => {
        initThemeAndEffects();
        bindPasswordToggle('toggleLoginPassword', 'farmerPassword');
        bindPasswordToggle('toggleRegPassword', 'regPassword');

        $('tabBtnLogin').addEventListener('click', () => setAuthMode('login'));
        $('tabBtnRegister').addEventListener('click', () => setAuthMode('register'));
        $('switchToRegisterLink').addEventListener('click', () => setAuthMode('register'));

        document.querySelectorAll('.wizard-step-pill').forEach((pill) => {
            pill.addEventListener('click', async () => {
                const targetStep = parseInt(pill.getAttribute('data-step'), 10);
                if (targetStep === 1) {
                    setWizardStep(1);
                } else if (state.step === 1) {
                    await validateStep1AndAdvance();
                    if (state.step === 2 && targetStep === 3) setWizardStep(3);
                } else {
                    setWizardStep(targetStep);
                }
            });
        });

        $('farmerLoginForm').addEventListener('submit', handleLoginSubmit);
        $('newFarmerRegisterForm').addEventListener('submit', handleRegisterSubmit);

        // Demo Login chips fill both User ID & Password (= User ID for synthetic 1..100 farmers)
        document.querySelectorAll('[data-demo-id]').forEach((chip) => {
            chip.addEventListener('click', () => {
                const uid = chip.getAttribute('data-demo-id');
                setAuthMode('login');
                $('farmerUniqueId').value = uid;
                $('farmerPassword').value = uid;
                $('loginError').classList.add('d-none');
                $('farmerPassword').focus();
            });
        });

        // Step 1 User ID checks
        let uidDebounce = null;
        $('regUniqueId').addEventListener('input', () => {
            const val = $('regUniqueId').value.trim();
            updateRuleChecklist(val);
            state.uniqueIdAvailable = false;
            clearTimeout(uidDebounce);
            if (val.length >= 8) {
                uidDebounce = setTimeout(() => checkUniqueIdInDb(), 450);
            } else {
                $('uniqueIdStatus').classList.add('d-none');
            }
        });
        $('checkUniqueIdBtn').addEventListener('click', checkUniqueIdInDb);
        $('step1NextBtn').addEventListener('click', validateStep1AndAdvance);

        // Step 2 buttons & LGD handlers
        $('step2BackBtn').addEventListener('click', () => setWizardStep(1));
        $('step2NextBtn').addEventListener('click', () => setWizardStep(3));

        $('regAgeHelper').addEventListener('input', () => {
            const age = parseInt($('regAgeHelper').value, 10);
            if (Number.isFinite(age) && age >= 14 && age <= 115) {
                const birthYear = new Date().getFullYear() - age;
                $('regDob').value = `${birthYear}-01-01`;
            } else if ($('regAgeHelper').value.trim() === '') {
                $('regDob').value = '';
            }
        });

        $('regManualLocToggle').addEventListener('change', () => {
            const manual = $('regManualLocToggle').checked;
            $('lgdCascadeGroup').classList.toggle('d-none', manual);
            $('manualLocGroup').classList.toggle('d-none', !manual);
            updateProfileLocationDisplay();
        });

        $('regLgdState').addEventListener('change', handleProfileStateChange);
        $('regLgdDistrict').addEventListener('change', handleProfileDistrictChange);
        $('regLgdSubDistrict').addEventListener('change', handleProfileSubDistrictChange);
        $('regLgdVillage').addEventListener('change', handleProfileVillageChange);

        // Step 3 builders
        $('step3BackBtn').addEventListener('click', () => setWizardStep(2));
        $('addPlotBtn').addEventListener('click', () => addPlotRow());
        $('addCropBtn').addEventListener('click', () => addCropRow());
        $('addTreeBtn').addEventListener('click', () => addTreeRow());
        $('addLivestockBtn').addEventListener('click', () => addLivestockRow());

        // Check query string (`?tab=register` or `?id=KM26@0001`)
        const params = new URLSearchParams(window.location.search);
        if (params.get('tab') === 'register') {
            setAuthMode('register');
        }
        if (params.get('id')) {
            $('farmerUniqueId').value = params.get('id');
        }
    });
})();
