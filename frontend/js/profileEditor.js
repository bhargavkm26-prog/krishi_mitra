/**
 * Krishi Mitra — Complete 6-Table PostgreSQL Profile Editor
 * Manages viewing and editing all fields across:
 *   1. farmer_profiles (identity, password, agrarian & income classification)
 *   2. india_locations (cascading LGD State -> District -> Sub-District -> Village + manual fallback)
 *   3. farmer_landholdings (0+ plots with area unit conversion & LGD location_id)
 *   4. farmer_crops (0+ crops linked to plot or unassigned NULL)
 *   5. farmer_trees (0+ trees linked to a saved plot with count > 0)
 *   6. farmer_livestock (0+ livestock linked to a saved plot with count > 0)
 */

(function () {
  'use strict';

  function esc(val) {
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function emptyToNull(val) {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s === '' ? null : s;
  }

  function numOrNull(val, isInt = false) {
    const s = emptyToNull(val);
    if (s === null) return null;
    const n = isInt ? parseInt(s, 10) : parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }

  function boolOrNull(val) {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return null;
  }

  function formatBoolLabel(val) {
    if (val === true) return 'Yes';
    if (val === false) return 'No';
    return 'Not set';
  }

  const ProfileEditor = {
    state: null,

    renderDrawerSummary(container, profile, session) {
      if (!container) return;
      if (!profile) {
        container.innerHTML = '<div class="drawer-chip">No profile loaded</div>';
        return;
      }

      const plots = Array.isArray(profile.landholdings) ? profile.landholdings : [];
      const unassignedCrops = Array.isArray(profile.unassigned_crops) ? profile.unassigned_crops : [];

      let totalCrops = unassignedCrops.length;
      let totalTrees = 0;
      let totalLivestock = 0;
      const cropNames = [];
      unassignedCrops.forEach(c => { if (c.crop_name) cropNames.push(c.crop_name); });

      plots.forEach(p => {
        if (Array.isArray(p.crops)) {
          totalCrops += p.crops.length;
          p.crops.forEach(c => { if (c.crop_name) cropNames.push(c.crop_name); });
        }
        if (Array.isArray(p.trees)) {
          p.trees.forEach(t => { totalTrees += (parseInt(t.tree_count, 10) || 1); });
        }
        if (Array.isArray(p.livestock)) {
          p.livestock.forEach(l => { totalLivestock += (parseInt(l.animal_count, 10) || 1); });
        }
      });

      const locParts = [profile.village, profile.sub_district, profile.district_display || profile.district, profile.state]
        .filter(Boolean);
      const locText = locParts.length ? locParts.join(', ') : 'Location not set';
      const uniqueCrops = Array.from(new Set(cropNames));
      const areaText = profile.total_land_hectares
        ? `${profile.total_land_hectares} ha (${plots.length} plots)`
        : (plots.length ? `${plots.length} plots` : `${profile.land_size || '0'} acres`);
      const incomeText = profile.annual_family_income !== null && profile.annual_family_income !== undefined
        ? `₹${Number(profile.annual_family_income).toLocaleString('en-IN')}/yr`
        : 'Income not set';

      container.innerHTML = `
        <div class="drawer-summary-cards">
          <div class="drawer-chip">🪪 ID: <strong>${esc(profile.farmer_unique_id || (session && session.farmer_unique_id) || 'Guest')}</strong></div>
          <div class="drawer-chip">🛡️ Status: <strong>${esc(profile.profile_verification_status || 'UNVERIFIED')}</strong></div>
          <div class="drawer-chip">📍 ${esc(locText)}${profile.pincode ? ` - ${esc(profile.pincode)}` : ''}</div>
          ${profile.location_id ? `<div class="drawer-chip">🗺️ LGD ID: <strong>#${esc(profile.location_id)}</strong></div>` : ''}
          <div class="drawer-chip">🏷️ Class: <strong>${esc(profile.social_category || 'Not set')} • ${esc(profile.farmer_category || 'Not set')}</strong></div>
          <div class="drawer-chip">💰 ${esc(incomeText)}</div>
          <div class="drawer-chip">💳 KCC Holder: <strong>${formatBoolLabel(profile.kcc_holder)}</strong></div>
          ${profile.farmer_registration_id ? `<div class="drawer-chip">🆔 FRUITS ID: <strong>${esc(profile.farmer_registration_id)}</strong></div>` : ''}
          <div class="drawer-chip">📐 Landholdings: <strong>${esc(areaText)}</strong></div>
          <div class="drawer-chip">🌾 Crops (${totalCrops}): <strong>${esc(uniqueCrops.slice(0, 4).join(', ') || 'None')}</strong></div>
          <div class="drawer-chip">🌴 Trees: <strong>${totalTrees}</strong></div>
          <div class="drawer-chip">🐄 Livestock: <strong>${totalLivestock}</strong></div>
        </div>
      `;
    },

    async mount(container, profile) {
      if (!container) return;
      const p = profile || {};
      const existingLands = Array.isArray(p.landholdings) ? p.landholdings : [];
      const existingUnassigned = Array.isArray(p.unassigned_crops) ? p.unassigned_crops : [];

      let nextPlotKey = 1;
      let nextCropKey = 1;
      let nextTreeKey = 1;
      let nextLivestockKey = 1;

      const plots = [];
      const crops = [];
      const trees = [];
      const livestock = [];

      existingLands.forEach((lh) => {
        const pKey = nextPlotKey++;
        plots.push({
          key: pKey,
          landholding_id: lh.landholding_id || null,
          land_area: lh.land_area ?? '',
          input_unit: (lh.land_area_unit && String(lh.land_area_unit).toUpperCase().includes('ACRE')) ? 'ACRE' : 'HECTARE',
          ownership_type: lh.ownership_type ? String(lh.ownership_type).toUpperCase() : '',
          irrigation_available: lh.irrigation_available === true ? 'true' : (lh.irrigation_available === false ? 'false' : ''),
          state: lh.state || '',
          district: lh.district || '',
          village: lh.village || '',
          location_id: lh.location_id ?? '',
        });

        if (Array.isArray(lh.crops)) {
          lh.crops.forEach((c) => {
            crops.push({
              key: nextCropKey++,
              plot_key: String(pKey),
              crop_name: c.crop_name || '',
              crop_season: c.crop_season || '',
              cultivation_year: c.cultivation_year ?? '',
            });
          });
        }

        if (Array.isArray(lh.trees)) {
          lh.trees.forEach((t) => {
            trees.push({
              key: nextTreeKey++,
              plot_key: String(pKey),
              tree_name: t.tree_name || '',
              tree_variety: t.tree_variety || '',
              tree_count: t.tree_count ?? '',
              tree_age_years: t.tree_age_years ?? '',
              purpose: t.purpose || '',
            });
          });
        }

        if (Array.isArray(lh.livestock)) {
          lh.livestock.forEach((a) => {
            livestock.push({
              key: nextLivestockKey++,
              plot_key: String(pKey),
              animal_type: a.animal_type || '',
              breed: a.breed || '',
              animal_count: a.animal_count ?? '',
              age_years: a.age_years ?? '',
              purpose: a.purpose || '',
            });
          });
        }
      });

      existingUnassigned.forEach((c) => {
        crops.push({
          key: nextCropKey++,
          plot_key: '',
          crop_name: c.crop_name || '',
          crop_season: c.crop_season || '',
          cultivation_year: c.cultivation_year ?? '',
        });
      });

      // Compute current age helper if date_of_birth exists
      let ageHelperVal = '';
      if (p.date_of_birth) {
        const y = new Date(p.date_of_birth).getFullYear();
        if (Number.isFinite(y) && y > 1900) {
          ageHelperVal = String(new Date().getFullYear() - y);
        }
      }

      this.state = {
        farmer_unique_id: p.farmer_unique_id || '',
        farmer_id: p.farmer_id || null,
        selectedLgdLocation: p.location_id ? {
          location_id: p.location_id,
          state_name: p.state || '',
          district_name: p.district_display || p.district || '',
          sub_district_name: p.sub_district || '',
          village_name: p.village || '',
          state_code: p.state_code || '',
          district_code: p.district_code || '',
          sub_district_code: p.sub_district_code || '',
          village_code: p.village_code || '',
        } : null,
        plots,
        crops,
        trees,
        livestock,
        nextPlotKey,
        nextCropKey,
        nextTreeKey,
        nextLivestockKey,
      };

      container.innerHTML = this._buildModalHtml(p, ageHelperVal);
      this._bindEvents();
      this.renderPlots();
      this.renderCrops();
      this.renderTrees();
      this.renderLivestock();

      await this._hydrateLgdDropdowns(p);
    },

    _buildModalHtml(p, ageHelperVal) {
      const uidLabel = p.farmer_unique_id || 'Local Profile';
      const genderVal = (p.gender || '').toLowerCase();
      const socialVal = p.social_category || '';
      const farmerCatVal = p.farmer_category || '';
      const kccVal = p.kcc_holder === true ? 'true' : (p.kcc_holder === false ? 'false' : '');
      const verifVal = p.profile_verification_status || 'UNVERIFIED';
      const distVal = p.district_display || p.district || '';

      return `
        <div id="editProfileError" class="edit-error-banner" style="display:none;"></div>

        <!-- Quick jump tabs across all 6 tables -->
        <div class="edit-table-nav">
          <a href="#sec-farmer-profiles" class="edit-nav-pill">1. Profile</a>
          <a href="#sec-india-locations" class="edit-nav-pill">2. Location (LGD)</a>
          <a href="#sec-farmer-landholdings" class="edit-nav-pill">3. Landholdings</a>
          <a href="#sec-farmer-crops" class="edit-nav-pill">4. Crops</a>
          <a href="#sec-farmer-trees" class="edit-nav-pill">5. Trees</a>
          <a href="#sec-farmer-livestock" class="edit-nav-pill">6. Livestock</a>
        </div>

        <!-- TABLE 1: farmer_profiles -->
        <div class="db-table-section" id="sec-farmer-profiles">
          <div class="db-sec-head">
            <div>
              <h4 class="db-sec-title">Personal, Credentials &amp; Classification</h4>
              <span class="db-sec-sub">Citizen ID: <code>${esc(uidLabel)}</code></span>
            </div>
            <span class="db-table-badge">farmer_profiles</span>
          </div>

          <div class="db-form-grid">
            <div class="db-field">
              <label for="epUniqueId">Farmer Unique ID <code>(farmer_unique_id)</code></label>
              <input type="text" id="epUniqueId" class="db-input font-mono" value="${esc(p.farmer_unique_id || '')}" readonly>
            </div>
            <div class="db-field">
              <label for="epPassword">New Password <code>(password)</code></label>
              <div class="db-pass-wrap">
                <input type="password" id="epPassword" class="db-input" maxlength="255" placeholder="Leave blank to keep existing" autocomplete="new-password">
                <button type="button" id="epTogglePassword" class="db-eye-btn" aria-label="Show password">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>
            </div>
            <div class="db-field">
              <label for="epFullName">Full Name <code>(full_name)</code></label>
              <input type="text" id="epFullName" class="db-input" maxlength="150" value="${esc(p.full_name || '')}" placeholder="Enter full name">
            </div>
            <div class="db-field">
              <label for="epMobile">Mobile Number <code>(mobile_number)</code></label>
              <input type="text" id="epMobile" class="db-input" maxlength="15" value="${esc(p.mobile_number || '')}" placeholder="10-digit mobile">
            </div>
            <div class="db-field">
              <label for="epDob">Date of Birth <code>(date_of_birth)</code></label>
              <input type="date" id="epDob" class="db-input" value="${esc(p.date_of_birth || '')}">
            </div>
            <div class="db-field">
              <label for="epAgeHelper">Age Helper <code>(fills DOB)</code></label>
              <input type="number" id="epAgeHelper" class="db-input" min="14" max="115" value="${esc(ageHelperVal)}" placeholder="e.g. 42">
            </div>
            <div class="db-field">
              <label for="epGender">Gender <code>(gender)</code></label>
              <select id="epGender" class="db-select">
                <option value="">-- Select Gender (Optional) --</option>
                <option value="Male" ${genderVal === 'male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${genderVal === 'female' ? 'selected' : ''}>Female</option>
                <option value="Other" ${genderVal === 'other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div class="db-field">
              <label for="epSocialCategory">Social Category <code>(social_category)</code></label>
              <select id="epSocialCategory" class="db-select">
                <option value="">-- Select Category --</option>
                <option value="General" ${socialVal.toLowerCase() === 'general' ? 'selected' : ''}>General</option>
                <option value="OBC" ${socialVal.toLowerCase() === 'obc' ? 'selected' : ''}>OBC</option>
                <option value="SC" ${socialVal.toLowerCase() === 'sc' ? 'selected' : ''}>SC</option>
                <option value="ST" ${socialVal.toLowerCase() === 'st' ? 'selected' : ''}>ST</option>
              </select>
            </div>
            <div class="db-field">
              <label for="epFarmerCategory">Farmer Category <code>(farmer_category)</code></label>
              <select id="epFarmerCategory" class="db-select">
                <option value="">-- Select Class --</option>
                <option value="Marginal" ${farmerCatVal.toLowerCase() === 'marginal' ? 'selected' : ''}>Marginal (&lt; 1 ha)</option>
                <option value="Small" ${farmerCatVal.toLowerCase() === 'small' ? 'selected' : ''}>Small (1 - 2 ha)</option>
                <option value="Semi-medium" ${farmerCatVal.toLowerCase() === 'semi-medium' ? 'selected' : ''}>Semi-medium (2 - 4 ha)</option>
                <option value="Medium" ${farmerCatVal.toLowerCase() === 'medium' ? 'selected' : ''}>Medium (4 - 10 ha)</option>
                <option value="Large" ${farmerCatVal.toLowerCase() === 'large' ? 'selected' : ''}>Large (&gt; 10 ha)</option>
              </select>
            </div>
            <div class="db-field">
              <label for="epAnnualIncome">Annual Family Income (INR) <code>(annual_family_income)</code></label>
              <input type="number" id="epAnnualIncome" class="db-input" min="0" step="100" value="${esc(p.annual_family_income ?? '')}" placeholder="e.g. 250000">
            </div>
            <div class="db-field">
              <label for="epKccHolder">KCC Holder <code>(kcc_holder)</code></label>
              <select id="epKccHolder" class="db-select">
                <option value="">-- Select Status --</option>
                <option value="true" ${kccVal === 'true' ? 'selected' : ''}>Yes (KCC Holder)</option>
                <option value="false" ${kccVal === 'false' ? 'selected' : ''}>No</option>
              </select>
            </div>
            <div class="db-field">
              <label for="epFruitsId">Registration / FRUITS ID <code>(farmer_registration_id)</code></label>
              <input type="text" id="epFruitsId" class="db-input" maxlength="100" value="${esc(p.farmer_registration_id || '')}" placeholder="e.g. FID-KA-12345">
            </div>
            <div class="db-field">
              <label for="epVerifStatus">Verification Status <code>(profile_verification_status)</code></label>
              <select id="epVerifStatus" class="db-select">
                <option value="UNVERIFIED" ${verifVal === 'UNVERIFIED' ? 'selected' : ''}>UNVERIFIED</option>
                <option value="PENDING" ${verifVal === 'PENDING' ? 'selected' : ''}>PENDING</option>
                <option value="VERIFIED" ${verifVal === 'VERIFIED' ? 'selected' : ''}>VERIFIED</option>
              </select>
            </div>
          </div>
        </div>

        <!-- TABLE 2: india_locations -->
        <div class="db-table-section" id="sec-india-locations">
          <div class="db-sec-head">
            <div>
              <h4 class="db-sec-title">Residence Location &amp; LGD Directory</h4>
              <span class="db-sec-sub">Resolves FK <code>location_id</code> from <code>india_locations</code></span>
            </div>
            <div class="db-head-actions">
              <label class="db-switch-label">
                <input type="checkbox" id="epManualLocToggle">
                <span>Manual Entry</span>
              </label>
              <span class="db-table-badge">india_locations</span>
            </div>
          </div>

          <div id="epLgdGroup" class="db-form-grid">
            <div class="db-field">
              <label for="epLgdState">State <code>(state / state_code)</code></label>
              <select id="epLgdState" class="db-select"><option value="">-- Loading States... --</option></select>
            </div>
            <div class="db-field">
              <label for="epLgdDistrict">District <code>(district / district_code)</code></label>
              <select id="epLgdDistrict" class="db-select" disabled><option value="">-- Select District --</option></select>
            </div>
            <div class="db-field">
              <label for="epLgdSubDistrict">Sub-District / Taluk <code>(sub_district)</code></label>
              <select id="epLgdSubDistrict" class="db-select" disabled><option value="">-- Select Sub-District --</option></select>
            </div>
            <div class="db-field">
              <label for="epLgdVillage">Village <code>(village / location_id)</code></label>
              <select id="epLgdVillage" class="db-select" disabled><option value="">-- Select Village --</option></select>
            </div>
          </div>

          <div id="epManualLocGroup" class="db-form-grid" style="display:none;">
            <div class="db-field">
              <label for="epManualState">State <code>(state)</code></label>
              <input type="text" id="epManualState" class="db-input" maxlength="100" value="${esc(p.state || '')}" placeholder="State name">
            </div>
            <div class="db-field">
              <label for="epManualDistrict">District <code>(district)</code></label>
              <input type="text" id="epManualDistrict" class="db-input" maxlength="100" value="${esc(distVal)}" placeholder="District name">
            </div>
            <div class="db-field">
              <label for="epManualSubDistrict">Sub-District <code>(sub_district)</code></label>
              <input type="text" id="epManualSubDistrict" class="db-input" maxlength="100" value="${esc(p.sub_district || '')}" placeholder="Taluk / Sub-District">
            </div>
            <div class="db-field">
              <label for="epManualVillage">Village <code>(village)</code></label>
              <input type="text" id="epManualVillage" class="db-input" maxlength="100" value="${esc(p.village || '')}" placeholder="Village name">
            </div>
          </div>

          <div class="db-form-grid" style="margin-top:10px;">
            <div class="db-field">
              <label for="epPincode">Pincode <code>(pincode)</code></label>
              <input type="text" id="epPincode" class="db-input" maxlength="10" value="${esc(p.pincode || '')}" placeholder="e.g. 560001">
            </div>
            <div class="db-field">
              <label>Resolved LGD FK <code>(location_id)</code></label>
              <div id="epResolvedLocDisplay" class="db-loc-pill">
                ${p.location_id ? `location_id = #${esc(p.location_id)} (${esc(p.state_code || '')}/${esc(p.district_code || '')}/${esc(p.sub_district_code || '')}/${esc(p.village_code || '')})` : 'Not linked (manual / optional)'}
              </div>
            </div>
          </div>
        </div>

        <!-- TABLE 3: farmer_landholdings -->
        <div class="db-table-section" id="sec-farmer-landholdings">
          <div class="db-sec-head">
            <div>
              <h4 class="db-sec-title">Landholding Plots</h4>
              <span class="db-sec-sub"><code>land_area</code>, <code>land_area_unit</code>, <code>ownership_type</code>, <code>irrigation_available</code>, <code>state</code>, <code>district</code>, <code>village</code>, <code>location_id</code></span>
            </div>
            <div class="db-head-actions">
              <span class="db-table-badge">farmer_landholdings</span>
              <button type="button" id="epAddPlotBtn" class="db-add-btn">+ Add Plot</button>
            </div>
          </div>
          <div id="epPlotsContainer"></div>
        </div>

        <!-- TABLE 4: farmer_crops -->
        <div class="db-table-section" id="sec-farmer-crops">
          <div class="db-sec-head">
            <div>
              <h4 class="db-sec-title">Crops Cultivated</h4>
              <span class="db-sec-sub"><code>landholding_id</code>, <code>crop_name</code>, <code>crop_season</code>, <code>cultivation_year</code></span>
            </div>
            <div class="db-head-actions">
              <span class="db-table-badge">farmer_crops</span>
              <button type="button" id="epAddCropBtn" class="db-add-btn">+ Add Crop</button>
            </div>
          </div>
          <div id="epCropsContainer"></div>
        </div>

        <!-- TABLE 5: farmer_trees -->
        <div class="db-table-section" id="sec-farmer-trees">
          <div class="db-sec-head">
            <div>
              <h4 class="db-sec-title">Horticulture &amp; Plantation Trees</h4>
              <span class="db-sec-sub"><code>landholding_id *</code>, <code>tree_name *</code>, <code>tree_variety</code>, <code>tree_count &gt; 0 *</code>, <code>tree_age_years</code>, <code>purpose</code></span>
            </div>
            <div class="db-head-actions">
              <span class="db-table-badge">farmer_trees</span>
              <button type="button" id="epAddTreeBtn" class="db-add-btn">+ Add Tree</button>
            </div>
          </div>
          <div id="epTreesFkHint" class="db-fk-hint" style="display:none;">
            ⚠ Add at least 1 landholding plot above first to attach tree records (FK <code>landholding_id</code> required).
          </div>
          <div id="epTreesContainer"></div>
        </div>

        <!-- TABLE 6: farmer_livestock -->
        <div class="db-table-section" id="sec-farmer-livestock">
          <div class="db-sec-head">
            <div>
              <h4 class="db-sec-title">Livestock &amp; Poultry</h4>
              <span class="db-sec-sub"><code>landholding_id *</code>, <code>animal_type *</code>, <code>breed</code>, <code>animal_count &gt; 0 *</code>, <code>age_years</code>, <code>purpose</code></span>
            </div>
            <div class="db-head-actions">
              <span class="db-table-badge">farmer_livestock</span>
              <button type="button" id="epAddLivestockBtn" class="db-add-btn">+ Add Livestock</button>
            </div>
          </div>
          <div id="epLivestockFkHint" class="db-fk-hint" style="display:none;">
            ⚠ Add at least 1 landholding plot above first to attach livestock records (FK <code>landholding_id</code> required).
          </div>
          <div id="epLivestockContainer"></div>
        </div>
      `;
    },

    _bindEvents() {
      const eye = document.getElementById('epTogglePassword');
      const pwIn = document.getElementById('epPassword');
      if (eye && pwIn) {
        eye.addEventListener('click', () => {
          const isPw = pwIn.type === 'password';
          pwIn.type = isPw ? 'text' : 'password';
          const ico = eye.querySelector('i');
          if (ico) ico.className = isPw ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        });
      }

      const ageIn = document.getElementById('epAgeHelper');
      const dobIn = document.getElementById('epDob');
      if (ageIn && dobIn) {
        ageIn.addEventListener('input', () => {
          const age = parseInt(ageIn.value, 10);
          if (Number.isFinite(age) && age >= 14 && age <= 115) {
            dobIn.value = `${new Date().getFullYear() - age}-01-01`;
          }
        });
      }

      const manualToggle = document.getElementById('epManualLocToggle');
      if (manualToggle) {
        manualToggle.addEventListener('change', () => {
          const manual = manualToggle.checked;
          const lgdGrp = document.getElementById('epLgdGroup');
          const manGrp = document.getElementById('epManualLocGroup');
          if (lgdGrp) lgdGrp.style.display = manual ? 'none' : '';
          if (manGrp) manGrp.style.display = manual ? '' : 'none';
          this._updateLocDisplay();
        });
      }

      const stSel = document.getElementById('epLgdState');
      const distSel = document.getElementById('epLgdDistrict');
      const subSel = document.getElementById('epLgdSubDistrict');
      const vilSel = document.getElementById('epLgdVillage');

      if (stSel) stSel.addEventListener('change', () => this._onStateChange());
      if (distSel) distSel.addEventListener('change', () => this._onDistrictChange());
      if (subSel) subSel.addEventListener('change', () => this._onSubDistrictChange());
      if (vilSel) vilSel.addEventListener('change', () => this._onVillageChange());

      const addPlot = document.getElementById('epAddPlotBtn');
      const addCrop = document.getElementById('epAddCropBtn');
      const addTree = document.getElementById('epAddTreeBtn');
      const addLive = document.getElementById('epAddLivestockBtn');

      if (addPlot) addPlot.addEventListener('click', () => this.addPlot());
      if (addCrop) addCrop.addEventListener('click', () => this.addCrop());
      if (addTree) addTree.addEventListener('click', () => this.addTree());
      if (addLive) addLive.addEventListener('click', () => this.addLivestock());
    },

    async _hydrateLgdDropdowns(p) {
      const stSel = document.getElementById('epLgdState');
      const distSel = document.getElementById('epLgdDistrict');
      const subSel = document.getElementById('epLgdSubDistrict');
      const vilSel = document.getElementById('epLgdVillage');
      if (!stSel) return;

      try {
        const res = await ApiService.getLocationStates();
        const states = res.states || [];
        stSel.innerHTML = '<option value="">-- Select State (Optional) --</option>';
        let matchedState = '';
        states.forEach((s) => {
          const opt = document.createElement('option');
          opt.value = s.state_name;
          opt.textContent = `${s.state_name} (Code: ${s.state_code})`;
          if (p.state && s.state_name.toLowerCase() === String(p.state).toLowerCase()) {
            opt.selected = true;
            matchedState = s.state_name;
          }
          stSel.appendChild(opt);
        });

        // If saved location state is outside LGD directory, switch cleanly to Manual Entry
        if (p.state && !matchedState) {
          const manualToggle = document.getElementById('epManualLocToggle');
          if (manualToggle) {
            manualToggle.checked = true;
            manualToggle.dispatchEvent(new Event('change'));
          }
          return;
        }

        if (matchedState) {
          const dRes = await ApiService.getLocationDistricts(matchedState);
          const districts = dRes.districts || [];
          distSel.innerHTML = '<option value="">-- Select District --</option>';
          let matchedDist = '';
          const curDist = p.district_display || p.district || '';
          districts.forEach((d) => {
            const opt = document.createElement('option');
            opt.value = d.district_name;
            opt.textContent = `${d.district_name} (Code: ${d.district_code})`;
            if (curDist && d.district_name.toLowerCase() === String(curDist).toLowerCase()) {
              opt.selected = true;
              matchedDist = d.district_name;
            }
            distSel.appendChild(opt);
          });
          distSel.disabled = false;

          if (matchedDist) {
            const sdRes = await ApiService.getLocationSubDistricts(matchedState, matchedDist);
            const subs = sdRes.sub_districts || [];
            subSel.innerHTML = '<option value="">-- Select Sub-District --</option>';
            let matchedSub = '';
            subs.forEach((sd) => {
              const opt = document.createElement('option');
              opt.value = sd.sub_district_name;
              opt.textContent = `${sd.sub_district_name} (Code: ${sd.sub_district_code})`;
              if (p.sub_district && sd.sub_district_name.toLowerCase() === String(p.sub_district).toLowerCase()) {
                opt.selected = true;
                matchedSub = sd.sub_district_name;
              }
              subSel.appendChild(opt);
            });
            subSel.disabled = false;

            if (matchedSub) {
              const vRes = await ApiService.getLocationVillages(matchedState, matchedDist, matchedSub);
              const villages = vRes.villages || [];
              vilSel.innerHTML = '<option value="">-- Select Village --</option>';
              villages.forEach((v) => {
                const opt = document.createElement('option');
                opt.value = String(v.location_id);
                opt.dataset.villageName = v.village_name;
                opt.dataset.villageCode = v.village_code;
                opt.dataset.stateCode = v.state_code;
                opt.dataset.districtCode = v.district_code;
                opt.dataset.subDistrictCode = v.sub_district_code;
                opt.textContent = `${v.village_name} (Code: ${v.village_code})`;
                if (
                  (p.location_id && Number(p.location_id) === Number(v.location_id)) ||
                  (p.village && v.village_name.toLowerCase() === String(p.village).toLowerCase())
                ) {
                  opt.selected = true;
                  this.state.selectedLgdLocation = {
                    location_id: v.location_id,
                    state_name: matchedState,
                    district_name: matchedDist,
                    sub_district_name: matchedSub,
                    village_name: v.village_name,
                    state_code: v.state_code,
                    district_code: v.district_code,
                    sub_district_code: v.sub_district_code,
                    village_code: v.village_code,
                  };
                }
                vilSel.appendChild(opt);
              });
              vilSel.disabled = false;
              this._updateLocDisplay();
            }
          }
        }
      } catch (err) {
        // Offline / backend unavailable -> gracefully reveal Manual Entry so user can always edit
        stSel.innerHTML = '<option value="">-- LGD Offline (Use Manual Entry) --</option>';
        const manualToggle = document.getElementById('epManualLocToggle');
        if (manualToggle && !manualToggle.checked) {
          manualToggle.checked = true;
          manualToggle.dispatchEvent(new Event('change'));
        }
      }
    },

    async _onStateChange() {
      const st = document.getElementById('epLgdState').value;
      const distSel = document.getElementById('epLgdDistrict');
      const subSel = document.getElementById('epLgdSubDistrict');
      const vilSel = document.getElementById('epLgdVillage');

      this.state.selectedLgdLocation = null;
      this._updateLocDisplay();
      distSel.innerHTML = '<option value="">-- Select District --</option>';
      subSel.innerHTML = '<option value="">-- Select Sub-District --</option>';
      vilSel.innerHTML = '<option value="">-- Select Village --</option>';
      distSel.disabled = true;
      subSel.disabled = true;
      vilSel.disabled = true;

      if (!st) return;
      try {
        const res = await ApiService.getLocationDistricts(st);
        (res.districts || []).forEach((d) => {
          const opt = document.createElement('option');
          opt.value = d.district_name;
          opt.textContent = `${d.district_name} (Code: ${d.district_code})`;
          distSel.appendChild(opt);
        });
        distSel.disabled = false;
      } catch (err) {
        this.showError(err.message);
      }
    },

    async _onDistrictChange() {
      const st = document.getElementById('epLgdState').value;
      const dist = document.getElementById('epLgdDistrict').value;
      const subSel = document.getElementById('epLgdSubDistrict');
      const vilSel = document.getElementById('epLgdVillage');

      this.state.selectedLgdLocation = null;
      this._updateLocDisplay();
      subSel.innerHTML = '<option value="">-- Select Sub-District --</option>';
      vilSel.innerHTML = '<option value="">-- Select Village --</option>';
      subSel.disabled = true;
      vilSel.disabled = true;

      if (!st || !dist) return;
      try {
        const res = await ApiService.getLocationSubDistricts(st, dist);
        (res.sub_districts || []).forEach((sd) => {
          const opt = document.createElement('option');
          opt.value = sd.sub_district_name;
          opt.textContent = `${sd.sub_district_name} (Code: ${sd.sub_district_code})`;
          subSel.appendChild(opt);
        });
        subSel.disabled = false;
      } catch (err) {
        this.showError(err.message);
      }
    },

    async _onSubDistrictChange() {
      const st = document.getElementById('epLgdState').value;
      const dist = document.getElementById('epLgdDistrict').value;
      const sub = document.getElementById('epLgdSubDistrict').value;
      const vilSel = document.getElementById('epLgdVillage');

      this.state.selectedLgdLocation = null;
      this._updateLocDisplay();
      vilSel.innerHTML = '<option value="">-- Select Village --</option>';
      vilSel.disabled = true;

      if (!st || !dist || !sub) return;
      try {
        const res = await ApiService.getLocationVillages(st, dist, sub);
        (res.villages || []).forEach((v) => {
          const opt = document.createElement('option');
          opt.value = String(v.location_id);
          opt.dataset.villageName = v.village_name;
          opt.dataset.villageCode = v.village_code;
          opt.dataset.stateCode = v.state_code;
          opt.dataset.districtCode = v.district_code;
          opt.dataset.subDistrictCode = v.sub_district_code;
          opt.textContent = `${v.village_name} (Code: ${v.village_code})`;
          vilSel.appendChild(opt);
        });
        vilSel.disabled = false;
      } catch (err) {
        this.showError(err.message);
      }
    },

    _onVillageChange() {
      const vilSel = document.getElementById('epLgdVillage');
      const opt = vilSel.options[vilSel.selectedIndex];
      if (!opt || !opt.value) {
        this.state.selectedLgdLocation = null;
      } else {
        this.state.selectedLgdLocation = {
          location_id: parseInt(opt.value, 10),
          state_name: document.getElementById('epLgdState').value,
          district_name: document.getElementById('epLgdDistrict').value,
          sub_district_name: document.getElementById('epLgdSubDistrict').value,
          village_name: opt.dataset.villageName,
          village_code: opt.dataset.villageCode,
          state_code: opt.dataset.stateCode,
          district_code: opt.dataset.districtCode,
          sub_district_code: opt.dataset.subDistrictCode,
        };
      }
      this._updateLocDisplay();
    },

    _updateLocDisplay() {
      const box = document.getElementById('epResolvedLocDisplay');
      const manual = document.getElementById('epManualLocToggle')?.checked;
      if (!box) return;
      if (!manual && this.state.selectedLgdLocation) {
        const l = this.state.selectedLgdLocation;
        box.textContent = `location_id = #${l.location_id} (State ${l.state_code} / Dist ${l.district_code} / Sub ${l.sub_district_code} / Vil ${l.village_code})`;
      } else {
        box.textContent = manual ? 'Manual entry (location_id = NULL)' : 'Not linked';
      }
    },

    getLocationValues() {
      const manual = document.getElementById('epManualLocToggle')?.checked;
      if (manual) {
        return {
          state: emptyToNull(document.getElementById('epManualState')?.value),
          district: emptyToNull(document.getElementById('epManualDistrict')?.value),
          sub_district: emptyToNull(document.getElementById('epManualSubDistrict')?.value),
          village: emptyToNull(document.getElementById('epManualVillage')?.value),
          location_id: null,
        };
      }
      return {
        state: emptyToNull(document.getElementById('epLgdState')?.value),
        district: emptyToNull(document.getElementById('epLgdDistrict')?.value),
        sub_district: emptyToNull(document.getElementById('epLgdSubDistrict')?.value),
        village: this.state.selectedLgdLocation ? this.state.selectedLgdLocation.village_name : null,
        location_id: this.state.selectedLgdLocation ? this.state.selectedLgdLocation.location_id : null,
      };
    },

    _buildPlotOptions(selectedKey, allowUnassigned) {
      let html = allowUnassigned ? '<option value="">-- General / Unassigned (NULL) --</option>' : '';
      this.state.plots.forEach((p, idx) => {
        const parts = [`Plot #${idx + 1}`];
        if (p.land_area) parts.push(`${p.land_area} ${p.input_unit === 'ACRE' ? 'ac' : 'ha'}`);
        if (p.village) parts.push(p.village);
        else if (p.district) parts.push(p.district);
        const sel = String(selectedKey) === String(p.key) ? 'selected' : '';
        html += `<option value="${p.key}" ${sel}>${esc(parts.join(' — '))}</option>`;
      });
      return html;
    },

    addPlot() {
      const loc = this.getLocationValues();
      this.state.plots.push({
        key: this.state.nextPlotKey++,
        landholding_id: null,
        land_area: '',
        input_unit: 'HECTARE',
        ownership_type: '',
        irrigation_available: '',
        state: loc.state || '',
        district: loc.district || '',
        village: loc.village || '',
        location_id: loc.location_id ?? '',
      });
      this.renderAllCollections();
    },

    addCrop() {
      const defPlot = this.state.plots.length > 0 ? String(this.state.plots[0].key) : '';
      this.state.crops.push({
        key: this.state.nextCropKey++,
        plot_key: defPlot,
        crop_name: '',
        crop_season: '',
        cultivation_year: String(new Date().getFullYear()),
      });
      this.renderCrops();
    },

    addTree() {
      if (this.state.plots.length === 0) {
        this.showError('Add at least 1 landholding plot first — `farmer_trees` requires FK `(farmer_id, landholding_id)`.');
        return;
      }
      this.state.trees.push({
        key: this.state.nextTreeKey++,
        plot_key: String(this.state.plots[0].key),
        tree_name: '',
        tree_variety: '',
        tree_count: '1',
        tree_age_years: '',
        purpose: '',
      });
      this.renderTrees();
    },

    addLivestock() {
      if (this.state.plots.length === 0) {
        this.showError('Add at least 1 landholding plot first — `farmer_livestock` requires FK `(farmer_id, landholding_id)`.');
        return;
      }
      this.state.livestock.push({
        key: this.state.nextLivestockKey++,
        plot_key: String(this.state.plots[0].key),
        animal_type: '',
        breed: '',
        animal_count: '1',
        age_years: '',
        purpose: '',
      });
      this.renderLivestock();
    },

    renderPlots() {
      const container = document.getElementById('epPlotsContainer');
      if (!container) return;
      if (this.state.plots.length === 0) {
        container.innerHTML = '<div class="db-empty">No landholding plots added. Click "+ Add Plot" to add land records.</div>';
        return;
      }

      container.innerHTML = this.state.plots.map((p, idx) => `
        <div class="repeatable-card">
          <div class="rep-head">
            <strong class="rep-title">Plot #${idx + 1} ${p.landholding_id ? `<code>(landholding_id #${p.landholding_id})</code>` : '<code>(New)</code>'}</strong>
            <div class="rep-actions">
              <button type="button" class="rep-btn copy-plot-loc" data-key="${p.key}">📍 Copy Residence Location</button>
              <button type="button" class="rep-btn danger rm-plot" data-key="${p.key}">✕ Remove</button>
            </div>
          </div>
          <div class="db-form-grid">
            <div class="db-field">
              <label>Land Area <code>(land_area)</code></label>
              <input type="number" step="0.01" min="0" class="db-input ep-plot-f" data-key="${p.key}" data-field="land_area" value="${esc(p.land_area)}" placeholder="e.g. 1.50">
            </div>
            <div class="db-field">
              <label>Unit <code>(land_area_unit)</code></label>
              <select class="db-select ep-plot-f" data-key="${p.key}" data-field="input_unit">
                <option value="HECTARE" ${p.input_unit === 'HECTARE' ? 'selected' : ''}>HECTARE</option>
                <option value="ACRE" ${p.input_unit === 'ACRE' ? 'selected' : ''}>Acres (→ ha)</option>
              </select>
            </div>
            <div class="db-field">
              <label>Ownership <code>(ownership_type)</code></label>
              <select class="db-select ep-plot-f" data-key="${p.key}" data-field="ownership_type">
                <option value="">-- Optional --</option>
                <option value="OWNED" ${p.ownership_type === 'OWNED' ? 'selected' : ''}>OWNED</option>
                <option value="LEASED" ${p.ownership_type === 'LEASED' ? 'selected' : ''}>LEASED</option>
                <option value="TENANT" ${p.ownership_type === 'TENANT' ? 'selected' : ''}>TENANT</option>
                <option value="SHARED" ${p.ownership_type === 'SHARED' ? 'selected' : ''}>SHARED</option>
              </select>
            </div>
            <div class="db-field">
              <label>Irrigation <code>(irrigation_available)</code></label>
              <select class="db-select ep-plot-f" data-key="${p.key}" data-field="irrigation_available">
                <option value="">-- Optional --</option>
                <option value="true" ${p.irrigation_available === 'true' ? 'selected' : ''}>Yes (Irrigated)</option>
                <option value="false" ${p.irrigation_available === 'false' ? 'selected' : ''}>No (Rainfed)</option>
              </select>
            </div>
            <div class="db-field">
              <label>Plot State <code>(state)</code></label>
              <input type="text" class="db-input ep-plot-f" data-key="${p.key}" data-field="state" value="${esc(p.state)}" placeholder="State">
            </div>
            <div class="db-field">
              <label>Plot District <code>(district)</code></label>
              <input type="text" class="db-input ep-plot-f" data-key="${p.key}" data-field="district" value="${esc(p.district)}" placeholder="District">
            </div>
            <div class="db-field">
              <label>Plot Village <code>(village)</code></label>
              <input type="text" class="db-input ep-plot-f" data-key="${p.key}" data-field="village" value="${esc(p.village)}" placeholder="Village">
            </div>
            <div class="db-field">
              <label>LGD <code>location_id</code></label>
              <input type="number" min="1" class="db-input ep-plot-f" data-key="${p.key}" data-field="location_id" value="${esc(p.location_id)}" placeholder="Optional LGD ID">
            </div>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.ep-plot-f').forEach(el => {
        const handler = (e) => {
          const key = parseInt(e.target.getAttribute('data-key'), 10);
          const field = e.target.getAttribute('data-field');
          const plot = this.state.plots.find(x => x.key === key);
          if (!plot) return;
          plot[field] = e.target.value;
          if (field === 'land_area' || field === 'village' || field === 'district') {
            this.renderCrops();
            this.renderTrees();
            this.renderLivestock();
          }
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
      });

      container.querySelectorAll('.rm-plot').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = parseInt(btn.getAttribute('data-key'), 10);
          this.state.plots = this.state.plots.filter(p => p.key !== key);
          const fallback = this.state.plots.length > 0 ? String(this.state.plots[0].key) : '';
          this.state.crops.forEach(c => { if (String(c.plot_key) === String(key)) c.plot_key = fallback; });
          if (this.state.plots.length === 0) {
            this.state.trees = [];
            this.state.livestock = [];
          } else {
            this.state.trees.forEach(t => { if (String(t.plot_key) === String(key)) t.plot_key = fallback; });
            this.state.livestock.forEach(l => { if (String(l.plot_key) === String(key)) l.plot_key = fallback; });
          }
          this.renderAllCollections();
        });
      });

      container.querySelectorAll('.copy-plot-loc').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = parseInt(btn.getAttribute('data-key'), 10);
          const plot = this.state.plots.find(x => x.key === key);
          if (!plot) return;
          const loc = this.getLocationValues();
          plot.state = loc.state || '';
          plot.district = loc.district || '';
          plot.village = loc.village || '';
          plot.location_id = loc.location_id ?? '';
          this.renderAllCollections();
        });
      });
    },

    renderCrops() {
      const container = document.getElementById('epCropsContainer');
      if (!container) return;
      if (this.state.crops.length === 0) {
        container.innerHTML = '<div class="db-empty">No crops recorded. Click "+ Add Crop" to add crop entries.</div>';
        return;
      }

      container.innerHTML = this.state.crops.map((c, idx) => `
        <div class="repeatable-card">
          <div class="rep-head">
            <strong class="rep-title">Crop #${idx + 1}</strong>
            <button type="button" class="rep-btn danger rm-crop" data-key="${c.key}">✕ Remove</button>
          </div>
          <div class="db-form-grid">
            <div class="db-field">
              <label>Plot Link <code>(landholding_id)</code></label>
              <select class="db-select ep-crop-f" data-key="${c.key}" data-field="plot_key">
                ${this._buildPlotOptions(c.plot_key, true)}
              </select>
            </div>
            <div class="db-field">
              <label>Crop Name <code>(crop_name)</code></label>
              <input type="text" class="db-input ep-crop-f" data-key="${c.key}" data-field="crop_name" value="${esc(c.crop_name)}" placeholder="e.g. Rice, Ragi, Maize">
            </div>
            <div class="db-field">
              <label>Season <code>(crop_season)</code></label>
              <select class="db-select ep-crop-f" data-key="${c.key}" data-field="crop_season">
                <option value="">-- Optional --</option>
                <option value="Kharif" ${c.crop_season === 'Kharif' ? 'selected' : ''}>Kharif</option>
                <option value="Rabi" ${c.crop_season === 'Rabi' ? 'selected' : ''}>Rabi</option>
                <option value="Zaid" ${c.crop_season === 'Zaid' ? 'selected' : ''}>Zaid</option>
                <option value="Perennial" ${c.crop_season === 'Perennial' ? 'selected' : ''}>Perennial</option>
              </select>
            </div>
            <div class="db-field">
              <label>Year <code>(cultivation_year)</code></label>
              <input type="number" min="1990" max="2035" class="db-input ep-crop-f" data-key="${c.key}" data-field="cultivation_year" value="${esc(c.cultivation_year)}" placeholder="2026">
            </div>
          </div>
        </div>
      `).join('');

      this._bindListInputs(container, '.ep-crop-f', this.state.crops);
      container.querySelectorAll('.rm-crop').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = parseInt(btn.getAttribute('data-key'), 10);
          this.state.crops = this.state.crops.filter(x => x.key !== key);
          this.renderCrops();
        });
      });
    },

    renderTrees() {
      const container = document.getElementById('epTreesContainer');
      const addBtn = document.getElementById('epAddTreeBtn');
      const hint = document.getElementById('epTreesFkHint');
      const hasPlots = this.state.plots.length > 0;
      if (addBtn) addBtn.disabled = !hasPlots;
      if (hint) hint.style.display = hasPlots ? 'none' : 'block';
      if (!container) return;

      if (this.state.trees.length === 0) {
        container.innerHTML = '<div class="db-empty">No tree entries recorded.</div>';
        return;
      }

      container.innerHTML = this.state.trees.map((t, idx) => `
        <div class="repeatable-card">
          <div class="rep-head">
            <strong class="rep-title">Tree #${idx + 1}</strong>
            <button type="button" class="rep-btn danger rm-tree" data-key="${t.key}">✕ Remove</button>
          </div>
          <div class="db-form-grid">
            <div class="db-field">
              <label>Plot <code>(landholding_id *)</code></label>
              <select class="db-select ep-tree-f" data-key="${t.key}" data-field="plot_key">
                ${this._buildPlotOptions(t.plot_key, false)}
              </select>
            </div>
            <div class="db-field">
              <label>Tree Name <code>(tree_name *)</code></label>
              <input type="text" class="db-input ep-tree-f" data-key="${t.key}" data-field="tree_name" value="${esc(t.tree_name)}" placeholder="e.g. Coconut, Mango">
            </div>
            <div class="db-field">
              <label>Variety <code>(tree_variety)</code></label>
              <input type="text" class="db-input ep-tree-f" data-key="${t.key}" data-field="tree_variety" value="${esc(t.tree_variety)}" placeholder="Optional">
            </div>
            <div class="db-field">
              <label>Count <code>(tree_count &gt; 0 *)</code></label>
              <input type="number" min="1" class="db-input ep-tree-f" data-key="${t.key}" data-field="tree_count" value="${esc(t.tree_count)}" placeholder="1+">
            </div>
            <div class="db-field">
              <label>Age Years <code>(tree_age_years)</code></label>
              <input type="number" min="0" step="0.5" class="db-input ep-tree-f" data-key="${t.key}" data-field="tree_age_years" value="${esc(t.tree_age_years)}" placeholder="0+">
            </div>
            <div class="db-field">
              <label>Purpose <code>(purpose)</code></label>
              <select class="db-select ep-tree-f" data-key="${t.key}" data-field="purpose">
                <option value="">-- Optional --</option>
                <option value="Commercial" ${t.purpose === 'Commercial' ? 'selected' : ''}>Commercial</option>
                <option value="Fruit" ${t.purpose === 'Fruit' ? 'selected' : ''}>Fruit</option>
                <option value="Shade" ${t.purpose === 'Shade' ? 'selected' : ''}>Shade</option>
                <option value="Timber" ${t.purpose === 'Timber' ? 'selected' : ''}>Timber</option>
              </select>
            </div>
          </div>
        </div>
      `).join('');

      this._bindListInputs(container, '.ep-tree-f', this.state.trees);
      container.querySelectorAll('.rm-tree').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = parseInt(btn.getAttribute('data-key'), 10);
          this.state.trees = this.state.trees.filter(x => x.key !== key);
          this.renderTrees();
        });
      });
    },

    renderLivestock() {
      const container = document.getElementById('epLivestockContainer');
      const addBtn = document.getElementById('epAddLivestockBtn');
      const hint = document.getElementById('epLivestockFkHint');
      const hasPlots = this.state.plots.length > 0;
      if (addBtn) addBtn.disabled = !hasPlots;
      if (hint) hint.style.display = hasPlots ? 'none' : 'block';
      if (!container) return;

      if (this.state.livestock.length === 0) {
        container.innerHTML = '<div class="db-empty">No livestock entries recorded.</div>';
        return;
      }

      container.innerHTML = this.state.livestock.map((a, idx) => `
        <div class="repeatable-card">
          <div class="rep-head">
            <strong class="rep-title">Livestock #${idx + 1}</strong>
            <button type="button" class="rep-btn danger rm-live" data-key="${a.key}">✕ Remove</button>
          </div>
          <div class="db-form-grid">
            <div class="db-field">
              <label>Plot <code>(landholding_id *)</code></label>
              <select class="db-select ep-live-f" data-key="${a.key}" data-field="plot_key">
                ${this._buildPlotOptions(a.plot_key, false)}
              </select>
            </div>
            <div class="db-field">
              <label>Animal Type <code>(animal_type *)</code></label>
              <input type="text" class="db-input ep-live-f" data-key="${a.key}" data-field="animal_type" value="${esc(a.animal_type)}" placeholder="e.g. Cow, Buffalo, Goat">
            </div>
            <div class="db-field">
              <label>Breed <code>(breed)</code></label>
              <input type="text" class="db-input ep-live-f" data-key="${a.key}" data-field="breed" value="${esc(a.breed)}" placeholder="Optional">
            </div>
            <div class="db-field">
              <label>Count <code>(animal_count &gt; 0 *)</code></label>
              <input type="number" min="1" class="db-input ep-live-f" data-key="${a.key}" data-field="animal_count" value="${esc(a.animal_count)}" placeholder="1+">
            </div>
            <div class="db-field">
              <label>Age Years <code>(age_years)</code></label>
              <input type="number" min="0" step="0.5" class="db-input ep-live-f" data-key="${a.key}" data-field="age_years" value="${esc(a.age_years)}" placeholder="0+">
            </div>
            <div class="db-field">
              <label>Purpose <code>(purpose)</code></label>
              <select class="db-select ep-live-f" data-key="${a.key}" data-field="purpose">
                <option value="">-- Optional --</option>
                <option value="Dairy" ${a.purpose === 'Dairy' ? 'selected' : ''}>Dairy</option>
                <option value="Milk" ${a.purpose === 'Milk' ? 'selected' : ''}>Milk</option>
                <option value="Breeding" ${a.purpose === 'Breeding' ? 'selected' : ''}>Breeding</option>
                <option value="Eggs" ${a.purpose === 'Eggs' ? 'selected' : ''}>Eggs</option>
                <option value="Meat" ${a.purpose === 'Meat' ? 'selected' : ''}>Meat</option>
                <option value="Wool" ${a.purpose === 'Wool' ? 'selected' : ''}>Wool</option>
              </select>
            </div>
          </div>
        </div>
      `).join('');

      this._bindListInputs(container, '.ep-live-f', this.state.livestock);
      container.querySelectorAll('.rm-live').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = parseInt(btn.getAttribute('data-key'), 10);
          this.state.livestock = this.state.livestock.filter(x => x.key !== key);
          this.renderLivestock();
        });
      });
    },

    _bindListInputs(container, selector, arr) {
      container.querySelectorAll(selector).forEach(el => {
        const handler = (e) => {
          const key = parseInt(e.target.getAttribute('data-key'), 10);
          const field = e.target.getAttribute('data-field');
          const row = arr.find(x => x.key === key);
          if (row) row[field] = e.target.value;
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
      });
    },

    renderAllCollections() {
      this.renderPlots();
      this.renderCrops();
      this.renderTrees();
      this.renderLivestock();
    },

    showError(msg) {
      const box = document.getElementById('editProfileError');
      if (!box) return;
      box.textContent = msg;
      box.style.display = 'block';
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    clearError() {
      const box = document.getElementById('editProfileError');
      if (box) {
        box.textContent = '';
        box.style.display = 'none';
      }
    },

    buildPayload() {
      this.clearError();
      const loc = this.getLocationValues();
      const activePlots = [];
      const keyToIdx = new Map();

      this.state.plots.forEach((p) => {
        let areaVal = numOrNull(p.land_area, false);
        if (areaVal !== null && p.input_unit === 'ACRE') {
          areaVal = Math.round(areaVal * 0.404686 * 10000) / 10000;
        }
        const ownership = emptyToNull(p.ownership_type);
        const irrig = boolOrNull(p.irrigation_available);
        const pState = emptyToNull(p.state);
        const pDist = emptyToNull(p.district);
        const pVil = emptyToNull(p.village);
        const pLocId = numOrNull(p.location_id, true);

        const hasAny = areaVal !== null || ownership !== null || irrig !== null ||
          pState !== null || pDist !== null || pVil !== null || pLocId !== null;
        if (!hasAny) return;

        const idx = activePlots.length;
        keyToIdx.set(String(p.key), idx);
        activePlots.push({
          landholding_id: p.landholding_id || null,
          land_area: areaVal,
          land_area_unit: 'HECTARE',
          ownership_type: ownership,
          irrigation_available: irrig,
          state: pState,
          district: pDist,
          village: pVil,
          location_id: pLocId,
        });
      });

      const crops = [];
      for (const c of this.state.crops) {
        const cropName = emptyToNull(c.crop_name);
        const cropSeason = emptyToNull(c.crop_season);
        const cultYear = numOrNull(c.cultivation_year, true);
        if (cropName === null && cropSeason === null && cultYear === null) continue;
        const plotIdx = c.plot_key && keyToIdx.has(String(c.plot_key))
          ? keyToIdx.get(String(c.plot_key))
          : null;
        crops.push({
          plot_index: plotIdx,
          crop_name: cropName,
          crop_season: cropSeason,
          cultivation_year: cultYear,
        });
      }

      const trees = [];
      for (const t of this.state.trees) {
        const treeName = emptyToNull(t.tree_name);
        const treeVar = emptyToNull(t.tree_variety);
        const treeCount = numOrNull(t.tree_count, true);
        const treeAge = numOrNull(t.tree_age_years, false);
        const purpose = emptyToNull(t.purpose);
        if (treeName === null && treeCount === null && treeVar === null && treeAge === null && purpose === null) {
          continue;
        }
        const plotIdx = keyToIdx.get(String(t.plot_key));
        if (plotIdx === undefined) {
          throw new Error('Every tree record must be linked to a non-empty Landholding Plot.');
        }
        if (!treeName || treeCount === null || treeCount <= 0) {
          throw new Error('Each tree entry must specify tree_name and tree_count > 0.');
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
      for (const l of this.state.livestock) {
        const animalType = emptyToNull(l.animal_type);
        const breed = emptyToNull(l.breed);
        const animalCount = numOrNull(l.animal_count, true);
        const ageYears = numOrNull(l.age_years, false);
        const purpose = emptyToNull(l.purpose);
        if (animalType === null && animalCount === null && breed === null && ageYears === null && purpose === null) {
          continue;
        }
        const plotIdx = keyToIdx.get(String(l.plot_key));
        if (plotIdx === undefined) {
          throw new Error('Every livestock record must be linked to a non-empty Landholding Plot.');
        }
        if (!animalType || animalCount === null || animalCount <= 0) {
          throw new Error('Each livestock entry must specify animal_type and animal_count > 0.');
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
        password: emptyToNull(document.getElementById('epPassword')?.value),
        full_name: emptyToNull(document.getElementById('epFullName')?.value),
        date_of_birth: emptyToNull(document.getElementById('epDob')?.value),
        gender: emptyToNull(document.getElementById('epGender')?.value),
        mobile_number: emptyToNull(document.getElementById('epMobile')?.value),
        state: loc.state,
        district: loc.district,
        sub_district: loc.sub_district,
        village: loc.village,
        pincode: emptyToNull(document.getElementById('epPincode')?.value),
        location_id: loc.location_id,
        social_category: emptyToNull(document.getElementById('epSocialCategory')?.value),
        farmer_category: emptyToNull(document.getElementById('epFarmerCategory')?.value),
        annual_family_income: numOrNull(document.getElementById('epAnnualIncome')?.value, false),
        kcc_holder: boolOrNull(document.getElementById('epKccHolder')?.value),
        farmer_registration_id: emptyToNull(document.getElementById('epFruitsId')?.value),
        profile_verification_status: emptyToNull(document.getElementById('epVerifStatus')?.value) || 'UNVERIFIED',
        landholdings: activePlots,
        crops: crops,
        trees: trees,
        livestock: livestock,
      };
    }
  };

  window.ProfileEditor = ProfileEditor;
})();
