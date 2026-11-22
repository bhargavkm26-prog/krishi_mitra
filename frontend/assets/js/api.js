/**
 * Krishi Mitra — Master Frontend API Client
 * Seamlessly interfaces with the 3 backend microservices:
 * 1. PostgreSQL + pgvector (/api/v1/database)
 * 2. BGE-M3 Dense RAG (/api/v1/bge)
 * 3. Gemma 4 E4B Cognitive Engine (/api/v1/gemma)
 */

const API_BASE = (window.location.origin && window.location.origin.includes(':8000'))
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
            localStorage.setItem('krishi_farmer_id', id);
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
        const resp = await fetch(`${API_BASE}/api/v1/database/farmers/${farmerId}`);
        if (!resp.ok) throw new Error(`Farmer ID ${farmerId} not found.`);
        return await resp.json();
    },

    // 3. Dense Neural Search (BGE-M3 RAG)
    async searchSchemesBGE(query, topK = 5) {
        const resp = await fetch(`${API_BASE}/api/v1/bge/search/schemes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, top_k: topK })
        });
        if (!resp.ok) throw new Error(`BGE search failed: ${resp.statusText}`);
        return await resp.json();
    },

    async searchFaqsBGE(query, topK = 5) {
        const resp = await fetch(`${API_BASE}/api/v1/bge/search/faqs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, top_k: topK })
        });
        if (!resp.ok) throw new Error(`BGE FAQ search failed: ${resp.statusText}`);
        return await resp.json();
    },

    // 4. Gemma 4 E4B Cognitive Engine
    async evaluateEligibility(farmerId, schemeId) {
        const resp = await fetch(`${API_BASE}/api/v1/gemma/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ farmer_id: parseInt(farmerId), scheme_id: parseInt(schemeId) })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ detail: resp.statusText }));
            throw new Error(err.detail || 'Evaluation failed');
        }
        return await resp.json();
    },

    async consultChiefSecretary(inquiry, farmerId = null, maxTurns = 5) {
        const payload = { inquiry, max_turns: maxTurns };
        if (farmerId) payload.farmer_id = parseInt(farmerId);

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

    // Streaming consultation via SSE
    streamChiefSecretary(inquiry, farmerId = null, { onEvent, onError, onComplete }) {
        let url = `${API_BASE}/api/v1/gemma/consult-stream?inquiry=${encodeURIComponent(inquiry)}`;
        if (farmerId) url += `&farmer_id=${parseInt(farmerId)}`;

        const eventSource = new EventSource(url);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (onEvent) onEvent(data);
                if (data.type === 'complete') {
                    eventSource.close();
                    if (onComplete) onComplete(data);
                }
            } catch (err) {
                if (onError) onError(err);
            }
        };

        eventSource.onerror = (err) => {
            eventSource.close();
            if (onError) onError(err);
        };

        return eventSource;
    }
};

window.KrishiAPI = KrishiAPI;
