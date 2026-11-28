/**
 * Krishi Mitra — Sovereign Agrarian Intelligence & Governance OS
 * Modular Frontend Controller (Live FastAPI Telemetry & Offcanvas Auth)
 */

(function () {
  'use strict';

  const KRISHI_API_BASE = (window.location.protocol && window.location.protocol.startsWith('http') && !['5500', '3000', '5173'].includes(window.location.port))
    ? window.location.origin
    : 'http://127.0.0.1:8000';

  /* --------------------------------------------------------------------------
   * 1. LIVE BACKEND HEALTH & CATALOG TELEMETRY (/health + /database/health)
   * -------------------------------------------------------------------------- */
  function setCounterValue(id, value) {
    const el = document.getElementById(id);
    if (!el || !Number.isFinite(value) || value <= 0) return;
    el.setAttribute('data-target', String(value));
    el.textContent = value.toLocaleString();
  }

  async function initLiveHealthTelemetry() {
    const heroBadge = document.getElementById('heroSchemeCountBadge');
    const heroRepo = document.getElementById('heroRepoCountSpan');
    const gemmaBadge = document.getElementById('telemetryGemmaBadge');
    const bgeBadge = document.getElementById('telemetryBgeBadge');
    const dbBadge = document.getElementById('telemetryDbBadge');
    const footerStatus = document.getElementById('footerSystemStatus');
    const footerDot = document.getElementById('footerSystemDot');

    try {
      const [sysRes, dbRes] = await Promise.allSettled([
        fetch(`${KRISHI_API_BASE}/health`).then(r => (r.ok ? r.json() : null)),
        fetch(`${KRISHI_API_BASE}/api/v1/database/health`).then(r => (r.ok ? r.json() : null))
      ]);

      const sys = sysRes.status === 'fulfilled' ? sysRes.value : null;
      const db = dbRes.status === 'fulfilled' ? dbRes.value : null;

      if (!sys && !db) throw new Error('API Gateway unreachable');

      const schemesCount = (db && db.schemes_count) || (sys && sys.subsystems?.postgresql_pgvector?.schemes_indexed) || 2066;
      const faqsCount = (db && db.faq_chunks_count) || 20110;
      const schemesFmt = Number(schemesCount).toLocaleString();
      const faqsFmt = Number(faqsCount).toLocaleString();

      setCounterValue('statSchemesCount', Number(schemesCount));
      setCounterValue('statFaqsCount', Number(faqsCount));

      if (heroBadge) {
        heroBadge.textContent = `SOVEREIGN AGRI-OS // ${schemesFmt} STATUTORY SCHEMES INDEXED`;
      }
      if (heroRepo) {
        heroRepo.innerHTML = `<i class="fa-solid fa-landmark text-success me-1"></i> National Scheme Repository (${schemesFmt} Programs)`;
      }

      const pgHealthy = Boolean((sys && sys.subsystems?.postgresql_pgvector?.healthy) || (db && db.status === 'healthy'));
      const bgeDev = (sys && sys.subsystems?.bge_m3_embedding_engine?.device) || 'cpu';
      const bgePrec = (sys && sys.subsystems?.bge_m3_embedding_engine?.precision) || 'fp16';
      const gemmaHealthy = Boolean(sys && sys.subsystems?.gemma_4_e4b_reasoning_server?.healthy);

      if (gemmaBadge) {
        gemmaBadge.textContent = gemmaHealthy ? 'llama-server (:8080 LIVE)' : 'llama-server (:8080 OFFLINE)';
        gemmaBadge.className = gemmaHealthy
          ? 'badge bg-success bg-opacity-25 text-success font-monospace'
          : 'badge bg-warning bg-opacity-25 text-warning font-monospace';
      }
      if (bgeBadge) {
        bgeBadge.textContent = `${String(bgeDev).toUpperCase()} PyTorch (${bgePrec})`;
      }
      if (dbBadge) {
        dbBadge.textContent = pgHealthy
          ? `${schemesFmt} Schemes / ${faqsFmt} FAQs`
          : 'PostgreSQL Disconnected';
      }

      const activeCount = (pgHealthy ? 1 : 0) + (gemmaHealthy ? 1 : 0) + (sys ? 1 : 0);
      if (footerStatus) {
        if (pgHealthy && gemmaHealthy) {
          footerStatus.textContent = 'All 3 Subsystems Active';
          if (footerDot) footerDot.style.background = '#22c55e';
        } else if (pgHealthy) {
          footerStatus.textContent = `${activeCount}/3 Active (Gemma :8080 Offline)`;
          if (footerDot) footerDot.style.background = '#f59e0b';
        } else {
          footerStatus.textContent = 'Degraded (Check PostgreSQL & :8000)';
          if (footerDot) footerDot.style.background = '#ef4444';
        }
      }
    } catch (_) {
      if (gemmaBadge) {
        gemmaBadge.textContent = 'Gateway :8000 Offline';
        gemmaBadge.className = 'badge bg-danger bg-opacity-25 text-danger font-monospace';
      }
      if (footerStatus) footerStatus.textContent = 'API Gateway Offline (:8000)';
      if (footerDot) footerDot.style.background = '#ef4444';
    }
  }

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
   * 4. LIVE POSTGRESQL FARMER LOGIN (USER ID + PASSWORD)
   * -------------------------------------------------------------------------- */
  async function authenticateFarmerOffcanvas(uniqueId, password) {
    const errBox = document.getElementById('offcanvasLoginError');
    const submitBtn = document.getElementById('offcanvasLoginBtn');
    if (errBox) {
      errBox.classList.add('d-none');
      errBox.textContent = '';
    }
    if (!uniqueId || !password) {
      if (errBox) {
        errBox.textContent = 'Please enter both your Farmer User ID and Password.';
        errBox.classList.remove('d-none');
      }
      return;
    }

    const origText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Verifying credentials...';
    }

    try {
      const resp = await fetch(`${KRISHI_API_BASE}/api/v1/database/farmers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ farmer_unique_id: uniqueId.trim(), password: password })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.found || !data.farmer) {
        throw new Error(data.detail || 'Invalid Farmer User ID or Password.');
      }

      localStorage.setItem('krishi_farmer_profile', JSON.stringify({
        ...data,
        authenticated: true,
        logged_in_at: new Date().toISOString()
      }));
      if (data.farmer.farmer_id !== undefined && data.farmer.farmer_id !== null) {
        localStorage.setItem('krishi_farmer_id', String(data.farmer.farmer_id));
      }

      const redirectUid = encodeURIComponent(data.farmer.farmer_unique_id || uniqueId.trim());
      window.location.href = `dashboard_app.html?farmer=${redirectUid}`;
    } catch (err) {
      if (errBox) {
        errBox.textContent = err.message || 'Unable to verify credentials with PostgreSQL API (port 8000).';
        errBox.classList.remove('d-none');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    }
  }

  function quickLoginFarmer(farmerId) {
    const idInput = document.getElementById('offcanvasFarmerId');
    const pwInput = document.getElementById('offcanvasFarmerPassword');
    const errBox = document.getElementById('offcanvasLoginError');
    if (errBox) errBox.classList.add('d-none');

    if (idInput) {
      idInput.value = farmerId || 'KM26@0001';
    }
    if (pwInput) {
      // Pre-fill synthetic demo password (equals User ID) if blank, or let user review & submit
      pwInput.value = (farmerId && /^KM26@/i.test(farmerId)) ? farmerId : '';
      pwInput.focus();
    }

    const offcanvasEl = document.getElementById('farmerLoginOffcanvas');
    if (offcanvasEl && window.bootstrap) {
      const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
      bsOffcanvas.show();
    }
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
    initLiveHealthTelemetry();

    // Offcanvas login form (User ID + Password verified via PostgreSQL API)
    const loginForm = document.getElementById('offcanvasLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const idInput = document.getElementById('offcanvasFarmerId');
        const pwInput = document.getElementById('offcanvasFarmerPassword');
        const uid = idInput ? idInput.value.trim() : '';
        const pw = pwInput ? pwInput.value : '';
        authenticateFarmerOffcanvas(uid, pw);
      });
    }
  });

  // Export functions to window
  window.quickLoginFarmer = quickLoginFarmer;

})();
