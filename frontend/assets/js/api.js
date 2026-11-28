/**
 * Krishi Mitra — Master Frontend API Client
 * Seamlessly interfaces with the 3 backend microservices:
 * 1. PostgreSQL + pgvector (/api/v1/database)
 * 2. BGE-M3 Dense RAG (/api/v1/bge)
 * 3. Gemma 4 E4B Cognitive Engine (/api/v1/gemma)
 */

const API_BASE = (window.location.protocol && window.location.protocol.startsWith('http') && !['5500', '3000', '5173'].includes(window.location.port))
    ? window.location.origin
    : 'http://127.0.0.1:8000';

const KrishiAPI = {
    baseUrl: API_BASE,

    // Session Management
    getLoggedInFarmer() {
        try {
            const raw = localStorage.getItem('krishi_farmer_profile');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    setLoggedInFarmer(profile) {
        if (!profile) {
            localStorage.removeItem('krishi_farmer_profile');
            localStorage.removeItem('krishi_farmer_id');
        } else {
            localStorage.setItem('krishi_farmer_profile', JSON.stringify(profile));
            const id = profile.farmer ? profile.farmer.farmer_id : profile.farmer_id;
            if (id !== undefined && id !== null && id !== '') {
                localStorage.setItem('krishi_farmer_id', String(id));
            }
        }
    },

    logout() {
        localStorage.removeItem('krishi_farmer_profile');
        localStorage.removeItem('krishi_farmer_id');
    },

    // 1. Health Checks
    async getConsolidatedHealth() {
        try {
            const resp = await fetch(`${API_BASE}/health`);
            return await resp.json();
        } catch (e) {
            return { status: 'offline', error: e.message };
        }
    },

    async getDatabaseHealth() {
        try {
            const resp = await fetch(`${API_BASE}/api/v1/database/health`);
            return await resp.json();
        } catch (e) {
            return { status: 'offline', error: e.message };
        }
    },

    async getGemmaHealth() {
        try {
            const resp = await fetch(`${API_BASE}/api/v1/gemma/health`);
            return await resp.json();
        } catch (e) {
            return { status: 'offline', error: e.message };
        }
    },

    // 2. Schemes & Farmers (Database API)
    async listSchemes({ search = '', state = '', ministry = '', limit = 20, offset = 0 } = {}) {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (state) params.append('state', state);
        if (ministry) params.append('ministry', ministry);
        params.append('limit', limit);
        params.append('offset', offset);

        const resp = await fetch(`${API_BASE}/api/v1/database/schemes?${params.toString()}`);
        if (!resp.ok) throw new Error(`Failed to load schemes: ${resp.statusText}`);
        return await resp.json();
    },

    async getSchemeDossier(schemeId) {
        const resp = await fetch(`${API_BASE}/api/v1/database/schemes/${schemeId}`);
        if (!resp.ok) throw new Error(`Failed to fetch scheme #${schemeId}`);
        return await resp.json();
    },

    async getFarmerDetails(farmerId) {
        const resp = await fetch(`${API_BASE}/api/v1/database/farmers/${encodeURIComponent(farmerId)}`);
        if (!resp.ok) {
            let msg = `Farmer ID ${farmerId} not found.`;
            try {
                const err = await resp.json();
                if (err.detail) msg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
            } catch (_) {}
            throw new Error(msg);
        }
        return await resp.json();
    },

    async checkUniqueId(uniqueId) {
        const resp = await fetch(`${API_BASE}/api/v1/database/farmers/check-id/${encodeURIComponent(uniqueId)}`);
        if (!resp.ok) throw new Error('Unable to verify User ID availability.');
        return await resp.json();
    },

    async loginFarmer(farmerUniqueId, password) {
        const resp = await fetch(`${API_BASE}/api/v1/database/farmers/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                farmer_unique_id: farmerUniqueId,
                password: password
            })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            throw new Error(data.detail || 'Invalid Farmer User ID or password.');
        }
        return data;
    },

    async registerFarmer(payload) {
        const resp = await fetch(`${API_BASE}/api/v1/database/farmers/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
            let msg = data.detail || 'Registration failed. Please check your inputs.';
            if (Array.isArray(data.detail)) {
                msg = data.detail.map(e => `${(e.loc || []).slice(1).join('.')}: ${e.msg}`).join('; ');
            }
            throw new Error(msg);
        }
        return data;
    },

    async getLocationStates() {
        const resp = await fetch(`${API_BASE}/api/v1/database/locations/states`);
        if (!resp.ok) throw new Error('Failed to load states from LGD directory.');
        return await resp.json();
    },

    async getLocationDistricts(state) {
        const resp = await fetch(`${API_BASE}/api/v1/database/locations/districts?state=${encodeURIComponent(state)}`);
        if (!resp.ok) throw new Error('Failed to load districts from LGD directory.');
        return await resp.json();
    },

    async getLocationSubDistricts(state, district) {
        const resp = await fetch(`${API_BASE}/api/v1/database/locations/sub-districts?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`);
        if (!resp.ok) throw new Error('Failed to load sub-districts from LGD directory.');
        return await resp.json();
    },

    async getLocationVillages(state, district, subDistrict) {
        const resp = await fetch(`${API_BASE}/api/v1/database/locations/villages?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&sub_district=${encodeURIComponent(subDistrict)}`);
        if (!resp.ok) throw new Error('Failed to load villages from LGD directory.');
        return await resp.json();
    },

    // 3. Dense Neural Search (BGE-M3 RAG)
    async searchSchemesBGE(query, limitOrOpts = 5) {
        const opts = (typeof limitOrOpts === 'object' && limitOrOpts !== null)
            ? limitOrOpts
            : { limit: limitOrOpts };
        const limit = Math.min(20, Math.max(1, parseInt(opts.limit, 10) || 5));
        const body = { query: String(query || '').trim(), limit };
        if (opts.state) body.state = opts.state;
        if (opts.ministry) body.ministry = opts.ministry;

        const resp = await fetch(`${API_BASE}/api/v1/bge/search/schemes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(err.detail || `BGE search failed: ${resp.statusText}`);
        }
        return await resp.json();
    },

    async searchFaqsBGE(issue, limit = 3) {
        const clampedLimit = Math.min(10, Math.max(1, parseInt(limit, 10) || 3));
        const resp = await fetch(`${API_BASE}/api/v1/bge/search/faqs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                issue: String(issue || '').trim(),
                limit: clampedLimit
            })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(err.detail || `BGE FAQ search failed: ${resp.statusText}`);
        }
        return await resp.json();
    },

    // 4. Gemma 4 E4B Cognitive Engine
    async evaluateEligibility(farmerId, schemeId) {
        const resp = await fetch(`${API_BASE}/api/v1/gemma/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ farmer_id: parseInt(farmerId, 10), scheme_id: parseInt(schemeId, 10) })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(err.detail || 'Evaluation failed');
        }
        return await resp.json();
    },

    async consultChiefSecretary(inquiry, farmerId = null, maxTurns = 3) {
        const payload = { inquiry, max_turns: Math.min(5, Math.max(1, parseInt(maxTurns, 10) || 3)) };
        if (farmerId !== null && farmerId !== undefined && !isNaN(parseInt(farmerId, 10))) {
            payload.farmer_id = parseInt(farmerId, 10);
        }

        const resp = await fetch(`${API_BASE}/api/v1/gemma/consult`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(err.detail || 'Consultation failed');
        }
        return await resp.json();
    },

    // Streaming consultation via named SSE events (`start`, `thought`, `deliberation`, `final_directive`, `complete`)
    streamChiefSecretary(inquiry, farmerId = null, { onEvent, onStart, onThought, onDeliberation, onDirective, onError, onComplete } = {}) {
        let url = `${API_BASE}/api/v1/gemma/consult-stream?inquiry=${encodeURIComponent(inquiry)}`;
        if (farmerId !== null && farmerId !== undefined && !isNaN(parseInt(farmerId, 10))) {
            url += `&farmer_id=${parseInt(farmerId, 10)}`;
        }

        const eventSource = new EventSource(url);
        let completed = false;
        let lastDirective = null;
        let lastDeliberation = '';

        const parseData = (e) => {
            try { return JSON.parse(e.data); } catch (_) { return { raw: e.data }; }
        };

        eventSource.addEventListener('start', (e) => {
            const data = parseData(e);
            if (onStart) onStart(data);
            if (onEvent) onEvent({ event: 'start', type: 'step', content: `Initiated consultation for "${data.inquiry || inquiry}"`, ...data });
        });

        eventSource.addEventListener('thought', (e) => {
            const data = parseData(e);
            if (onThought) onThought(data);
            if (onEvent) onEvent({ event: 'thought', type: 'step', content: data.message || '', ...data });
        });

        eventSource.addEventListener('deliberation', (e) => {
            const data = parseData(e);
            lastDeliberation = data.scratchpad || '';
            if (onDeliberation) onDeliberation(data);
            if (onEvent) onEvent({ event: 'deliberation', type: 'step', content: lastDeliberation, ...data });
        });

        eventSource.addEventListener('final_directive', (e) => {
            const data = parseData(e);
            lastDirective = data.directive || data;
            if (onDirective) onDirective(lastDirective, data);
            if (onEvent) onEvent({ event: 'final_directive', directive: lastDirective, deliberation: lastDeliberation, ...data });
        });

        eventSource.addEventListener('complete', (e) => {
            completed = true;
            const data = parseData(e);
            eventSource.close();
            if (onEvent) onEvent({ event: 'complete', type: 'complete', directive: lastDirective, deliberation: lastDeliberation, ...data });
            if (onComplete) onComplete({ directive: lastDirective, deliberation: lastDeliberation, ...data });
        });

        eventSource.onerror = (err) => {
            if (completed) {
                eventSource.close();
                return;
            }
            eventSource.close();
            if (onError) onError(err);
        };

        return eventSource;
    }
};

window.KrishiAPI = KrishiAPI;
