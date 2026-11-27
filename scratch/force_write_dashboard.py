
import sys

NEW_HTML = r'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#030704">
  <meta name="description" content="Krishi Mitra: Sovereign Agrarian Governance OS">
  <title>Krishi Mitra - Farmer Dashboard</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="css/bootstrap.min.css">
  <link rel="stylesheet" href="css/all.min.css">
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/responsive.css">
  <link rel="stylesheet" href="css/krishi-nexus.css?v=4.6">

  <style>
    :root {
      --bg: #030704;
      --bg2: #071a0e;
      --bg3: #0a2213;
      --em: #22c55e;
      --em2: #10b981;
      --cy: #06b6d4;
      --grad: linear-gradient(135deg, #22c55e 0%, #06b6d4 100%);
      --card-border: rgba(34,197,94,0.28);
      --text-primary: #f0fdf4;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --font-main: 'Space Grotesk', 'Noto Sans Kannada', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { background: var(--bg) !important; color: var(--text-primary) !important; font-family: var(--font-main) !important; min-height: 100vh; }
    .app-viewport { background: var(--bg) !important; }

    /* Header */
    .site-header { background: rgba(3,7,4,0.97) !important; border-bottom: 1px solid rgba(34,197,94,0.28) !important; backdrop-filter: blur(12px); }
    .brand-heading { color: var(--em) !important; font-family: var(--font-main) !important; font-weight: 700 !important; }
    .brand-subheading { color: var(--text-secondary) !important; font-family: var(--font-mono) !important; font-size: 0.72rem !important; }
    .nav-menu-link { background: rgba(6,18,10,0.85) !important; border: 1px solid rgba(34,197,94,0.22) !important; color: var(--text-secondary) !important; font-family: var(--font-main) !important; font-weight: 500; transition: all 0.2s; }
    .nav-menu-link:hover { border-color: var(--em) !important; color: var(--em) !important; }
    .nav-menu-link.active { background: var(--grad) !important; border-color: transparent !important; color: #021a0f !important; font-weight: 700 !important; }
    .nav-count-badge { background: var(--em) !important; color: #021a0f !important; font-weight: 700 !important; }
    .nav-count-badge.badge-amber { background: #f59e0b !important; color: #fff !important; }
    .nav-count-badge.badge-muted { background: rgba(100,116,139,0.6) !important; color: #e2e8f0 !important; }
    .lang-toggle-pill { background: rgba(34,197,94,0.14) !important; border: 1px solid rgba(34,197,94,0.4) !important; color: var(--em) !important; font-family: var(--font-mono) !important; font-weight: 600; }
    .btn-profile-pill { background: rgba(16,185,129,0.14) !important; border: 1px solid rgba(34,197,94,0.45) !important; color: var(--em) !important; font-family: var(--font-main) !important; font-weight: 600; }

    /* Login */
    .login-fullscreen-hero { background: var(--bg) !important; background-image: radial-gradient(ellipse 60% 40% at 20% 30%, rgba(34,197,94,0.07) 0%, transparent 70%), radial-gradient(ellipse 50% 35% at 80% 70%, rgba(6,182,212,0.06) 0%, transparent 70%) !important; }
    .login-brand-title { color: var(--em) !important; font-family: var(--font-main) !important; font-weight: 700; }
    .login-leaf-icon { color: var(--em) !important; }
    .login-lang-btn { background: transparent !important; border: 1px solid rgba(34,197,94,0.3) !important; color: var(--text-secondary) !important; }
    .login-lang-btn.active { background: var(--em) !important; color: #021a0f !important; font-weight: 700; }
    .login-hero-main-title { color: var(--em) !important; font-family: var(--font-main) !important; font-weight: 700; text-shadow: 0 0 48px rgba(34,197,94,0.35); }
    .login-hero-spaced-sub { color: var(--cy) !important; font-family: var(--font-mono) !important; letter-spacing: 0.25em; }
    .login-hero-tagline { color: var(--text-secondary) !important; }
    .login-card-box { background: rgba(8,25,14,0.95) !important; border: 1px solid rgba(34,197,94,0.35) !important; box-shadow: 0 8px 48px rgba(0,0,0,0.6) !important; backdrop-filter: blur(16px); }
    .login-card-heading { color: var(--text-primary) !important; font-family: var(--font-main) !important; font-weight: 700; }
    .login-field-label { color: var(--text-secondary) !important; font-family: var(--font-mono) !important; font-size: 0.8rem !important; text-transform: uppercase; letter-spacing: 0.08em; }
    .login-phone-control { background: rgba(3,7,4,0.8) !important; border: 1px solid rgba(34,197,94,0.3) !important; border-radius: 10px; overflow: hidden; }
    .login-phone-control:focus-within { border-color: var(--em) !important; box-shadow: 0 0 0 3px rgba(34,197,94,0.15) !important; }
    .login-phone-prefix { background: rgba(34,197,94,0.14) !important; color: var(--em) !important; font-family: var(--font-mono) !important; font-weight: 700; border-right: 1px solid rgba(34,197,94,0.25) !important; }
    .login-phone-input { background: transparent !important; color: var(--text-primary) !important; font-family: var(--font-mono) !important; }
    .login-phone-input::placeholder { color: var(--text-muted) !important; }
    .login-pass-control { display: flex; align-items: center; background: rgba(3,7,4,0.8); border: 1px solid rgba(34,197,94,0.3); border-radius: 10px; overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s; }
    .login-pass-control:focus-within { border-color: var(--em); box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }
    .login-pass-input { flex: 1; background: transparent; border: none; outline: none; padding: 12px 14px; color: var(--text-primary); font-family: var(--font-mono); font-size: 1rem; }
    .login-pass-input::placeholder { color: var(--text-muted); }
    .login-eye-toggle { background: transparent; border: none; outline: none; padding: 10px 14px; cursor: pointer; color: var(--text-secondary); font-size: 1.1rem; transition: color 0.2s; }
    .login-eye-toggle:hover { color: var(--em); }
    .demo-label { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px; font-family: var(--font-mono); }
    .login-demo-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 4px; }
    .demo-id-chip { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.35); border-radius: 20px; padding: 5px 14px; font-family: var(--font-mono); font-size: 0.78rem; color: var(--em); cursor: pointer; transition: all 0.18s; }
    .demo-id-chip:hover { background: rgba(34,197,94,0.2); border-color: var(--em); }
    .btn-login-submit { background: var(--grad) !important; border: none !important; color: #021a0f !important; font-family: var(--font-main) !important; font-weight: 700 !important; box-shadow: 0 4px 20px rgba(34,197,94,0.35) !important; transition: opacity 0.2s, transform 0.1s !important; }
    .btn-login-submit:hover { opacity: 0.92 !important; transform: translateY(-1px) !important; }
    .btn-signup-link { color: var(--em) !important; background: transparent !important; border: none !important; }
    .login-help-anchor { color: var(--cy) !important; }
    .login-field-error { color: #f87171 !important; font-size: 0.82rem; margin-top: 4px; }
    .login-otp-notice { color: var(--text-secondary) !important; }
    .login-otp-input { background: rgba(3,7,4,0.8) !important; border: 1px solid rgba(34,197,94,0.3) !important; color: var(--text-primary) !important; font-family: var(--font-mono) !important; font-size: 2rem !important; }
    .login-quick-otp { background: rgba(34,197,94,0.1) !important; border: 1px dashed rgba(34,197,94,0.4) !important; color: var(--em) !important; font-family: var(--font-mono) !important; }
    .login-text-btn { color: var(--text-secondary) !important; background: transparent !important; border: none !important; }

    /* Wizard */
    .wizard-container-wrap, .wizard-card { background: rgba(8,25,14,0.9) !important; border-color: var(--card-border) !important; }
    .wizard-heading, .q-title { color: var(--text-primary) !important; font-family: var(--font-main) !important; }
    .q-subtitle { color: var(--text-secondary) !important; }
    .progress-fill { background: var(--grad) !important; }
    .step-label { color: var(--em) !important; font-family: var(--font-mono) !important; }
    .step-badge { background: rgba(34,197,94,0.14) !important; color: var(--em) !important; border: 1px solid rgba(34,197,94,0.3) !important; }
    .big-mic-button { background: var(--grad) !important; border-color: var(--em) !important; box-shadow: 0 0 32px rgba(34,197,94,0.3) !important; }
    .mic-wave-ring { border-color: rgba(34,197,94,0.4) !important; }
    .voice-status-label { color: var(--text-secondary) !important; }
    .voice-confirm-card { background: rgba(3,7,4,0.9) !important; border: 1px solid var(--card-border) !important; }
    .heard-text { color: var(--em) !important; font-family: var(--font-mono) !important; }
    .options-divider span { color: var(--text-muted) !important; }
    #wizard-back-btn { background: rgba(3,7,4,0.7) !important; border: 1px solid rgba(34,197,94,0.3) !important; color: var(--em) !important; }
    #wizard-next-btn { background: var(--grad) !important; border: none !important; color: #021a0f !important; font-weight: 700 !important; }
    #wizard-next-btn:disabled { background: rgba(100,116,139,0.3) !important; color: var(--text-muted) !important; }

    /* Hero */
    .hero-banner-card { background: linear-gradient(135deg, #071a0e 0%, #030d06 100%) !important; border: 1px solid rgba(34,197,94,0.36) !important; box-shadow: 0 4px 32px rgba(0,0,0,0.5) !important; }
    .hero-pill-badge { background: rgba(34,197,94,0.16) !important; border: 1px solid rgba(34,197,94,0.4) !important; color: #4ade80 !important; font-family: var(--font-mono) !important; font-size: 0.72rem; }
    .hero-pill-dot { background: var(--em) !important; box-shadow: 0 0 8px rgba(34,197,94,0.7) !important; }
    .hero-headline { color: var(--text-primary) !important; font-family: var(--font-main) !important; font-weight: 700; }
    .hero-description { color: rgba(240,253,244,0.75) !important; }
    .hero-btn-white { background: var(--grad) !important; color: #021a0f !important; font-family: var(--font-main) !important; font-weight: 700 !important; border: none !important; box-shadow: 0 2px 16px rgba(34,197,94,0.3) !important; }
    .hero-btn-outline { background: transparent !important; border: 1px solid rgba(240,253,244,0.4) !important; color: rgba(240,253,244,0.9) !important; font-family: var(--font-main) !important; font-weight: 600 !important; }

    /* Discover */
    .discover-search-card { background: rgba(7,24,13,0.95) !important; border: 1px solid rgba(34,197,94,0.32) !important; }
    .discover-card-heading { color: var(--text-primary) !important; font-family: var(--font-main) !important; font-weight: 700; }
    .search-field { background: rgba(3,7,4,0.8) !important; border: 1px solid rgba(34,197,94,0.25) !important; color: var(--text-primary) !important; font-family: var(--font-main) !important; }
    .search-field:focus { border-color: var(--em) !important; box-shadow: 0 0 0 3px rgba(34,197,94,0.12) !important; }
    .search-field::placeholder { color: var(--text-muted) !important; }
    .search-dropdown { background: rgba(3,7,4,0.9) !important; border: 1px solid rgba(34,197,94,0.25) !important; color: var(--text-primary) !important; font-family: var(--font-main) !important; }
    .search-dropdown option { background: #071a0e !important; }
    .search-icon-inside { color: var(--em) !important; }
    .btn-discover-action { background: var(--grad) !important; border: none !important; color: #021a0f !important; font-family: var(--font-main) !important; font-weight: 700 !important; }

    /* Ticker */
    .tips-ticker-section { background: rgba(7,24,13,0.9) !important; border: 1px solid rgba(34,197,94,0.22) !important; }
    .ticker-tag { background: rgba(239,68,68,0.18) !important; color: #fca5a5 !important; border: 1px solid rgba(239,68,68,0.3) !important; }
    .ticker-title { color: var(--text-primary) !important; }
    .ticker-paused-badge { background: rgba(100,116,139,0.3) !important; color: var(--text-muted) !important; }

    /* Tabs & chips */
    .scheme-tabs-nav { background: rgba(7,24,13,0.8) !important; border-bottom: 1px solid rgba(34,197,94,0.2) !important; }
    .scheme-tab-btn { color: var(--text-secondary) !important; font-family: var(--font-main) !important; background: transparent !important; border: none; }
    .scheme-tab-btn.active { color: var(--em) !important; border-bottom: 2px solid var(--em) !important; font-weight: 700 !important; }
    .tab-badge { background: var(--em) !important; color: #021a0f !important; font-weight: 700 !important; }
    .tab-badge.badge-warning { background: #f59e0b !important; color: #fff !important; }
    .tab-badge.badge-neutral { background: rgba(100,116,139,0.6) !important; color: #e2e8f0 !important; }
    .filter-chip { background: rgba(8,25,14,0.9) !important; border: 1px solid rgba(34,197,94,0.25) !important; color: var(--text-secondary) !important; font-family: var(--font-main) !important; }
    .filter-chip.active, .filter-chip:hover { background: rgba(34,197,94,0.16) !important; border-color: var(--em) !important; color: var(--em) !important; }

    /* Scheme cards */
    .scheme-card { background: rgba(8,25,15,0.95) !important; border: 1px solid rgba(34,197,94,0.28) !important; transition: border-color 0.2s, transform 0.15s !important; }
    .scheme-card:hover { border-color: var(--em) !important; transform: translateY(-2px) !important; box-shadow: 0 6px 24px rgba(34,197,94,0.15) !important; }
    .scheme-card-title { color: var(--text-primary) !important; font-family: var(--font-main) !important; }
    .scheme-card-dept { color: var(--text-secondary) !important; }
    .badge-eligible { background: rgba(34,197,94,0.18) !important; color: #4ade80 !important; border: 1px solid rgba(34,197,94,0.35) !important; }
    .badge-almost { background: rgba(245,158,11,0.18) !important; color: #fbbf24 !important; }
    .scheme-benefit-val { color: var(--em) !important; font-family: var(--font-mono) !important; font-weight: 700; }
    .empty-state-box { background: rgba(8,25,14,0.7) !important; border: 1px dashed rgba(34,197,94,0.25) !important; }
    .empty-title { color: var(--text-secondary) !important; }
    .empty-desc { color: var(--text-muted) !important; }

    /* Subpages */
    .subpage-title { color: var(--text-primary) !important; font-family: var(--font-main) !important; font-weight: 700; }
    .subpage-subtitle { color: var(--text-secondary) !important; }
    .help-card { background: rgba(8,25,14,0.9) !important; border: 1px solid rgba(34,197,94,0.28) !important; }
    .help-card.primary { background: rgba(14,40,24,0.95) !important; border-color: rgba(34,197,94,0.5) !important; }
    .help-title { color: var(--text-primary) !important; }
    .help-phone-number { color: var(--em) !important; font-family: var(--font-mono) !important; font-weight: 700; }
    .help-timing { color: var(--text-secondary) !important; }
    .btn-call { background: var(--grad) !important; border: none !important; color: #021a0f !important; font-weight: 700 !important; }

    /* Bottom nav */
    .bottom-navbar { background: rgba(3,7,4,0.97) !important; border-top: 1px solid rgba(34,197,94,0.28) !important; backdrop-filter: blur(12px); }
    .bottom-nav-item { color: var(--text-muted) !important; font-family: var(--font-main) !important; }
    .bottom-nav-item.active { color: var(--em) !important; }
    .bottom-nav-item.active svg { stroke: var(--em) !important; }

    /* Modals */
    .modal-sheet { background: rgba(7,24,13,0.98) !important; border: 1px solid rgba(34,197,94,0.3) !important; border-bottom: none !important; box-shadow: 0 -8px 48px rgba(0,0,0,0.7) !important; }
    .modal-header { border-bottom: 1px solid rgba(34,197,94,0.2) !important; }
    .modal-scheme-title { color: var(--text-primary) !important; font-family: var(--font-main) !important; }
    .modal-scheme-dept { color: var(--text-secondary) !important; }
    .btn-close-modal { background: rgba(239,68,68,0.14) !important; border: 1px solid rgba(239,68,68,0.3) !important; color: #fca5a5 !important; }
    .modal-benefit-box { background: rgba(34,197,94,0.08) !important; border: 1px solid rgba(34,197,94,0.25) !important; }
    .benefit-sub { color: var(--text-secondary) !important; }
    .benefit-val { color: var(--em) !important; font-family: var(--font-mono) !important; font-weight: 700; }
    .section-heading { color: var(--text-primary) !important; }
    .notice-callout { background: rgba(245,158,11,0.08) !important; border-left: 3px solid #f59e0b !important; color: #fbbf24 !important; }
    .modal-footer-actions { border-top: 1px solid rgba(34,197,94,0.2) !important; }
    .btn-primary { background: var(--grad) !important; border: none !important; color: #021a0f !important; font-family: var(--font-main) !important; font-weight: 700 !important; }
    .btn-outline { background: transparent !important; border: 1px solid rgba(34,197,94,0.4) !important; color: var(--em) !important; font-family: var(--font-main) !important; font-weight: 600 !important; }

    /* Drawer */
    .drawer-content { background: rgba(7,24,13,0.98) !important; border-right: 1px solid rgba(34,197,94,0.3) !important; box-shadow: 8px 0 48px rgba(0,0,0,0.6) !important; }
    .drawer-header { border-bottom: 1px solid rgba(34,197,94,0.2) !important; }
    .user-avatar-circle { background: rgba(34,197,94,0.14) !important; border: 2px solid rgba(34,197,94,0.4) !important; }
    .user-name { color: var(--text-primary) !important; }
    .user-phone { color: var(--em) !important; font-family: var(--font-mono) !important; }
    .drawer-menu-btn { color: var(--text-primary) !important; background: rgba(8,25,14,0.5) !important; border: 1px solid rgba(34,197,94,0.15) !important; font-family: var(--font-main) !important; }
    .drawer-menu-btn:hover { background: rgba(34,197,94,0.1) !important; border-color: rgba(34,197,94,0.35) !important; }
    .drawer-menu-btn.danger { border-color: rgba(239,68,68,0.25) !important; color: #fca5a5 !important; }

    /* Help modal */
    .modal-body-content { color: var(--text-secondary) !important; }
    .helpline-badge { background: rgba(14,40,24,0.9) !important; border: 1px solid rgba(34,197,94,0.25) !important; border-radius: 12px; padding: 16px; margin-bottom: 16px; }

    /* Offline bar */
    .offline-bar { background: rgba(239,68,68,0.9) !important; color: #fff !important; }

    /* Sections bg */
    #view-wizard, #view-main, .main-content-layout, .main-subpage, .subpage-wrap, .schemes-section-header { background: var(--bg) !important; }

    /* Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: rgba(34,197,94,0.3); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(34,197,94,0.55); }
  </style>
</head>
<body>

  <div id="offline-alert-bar" class="offline-bar" style="display: none;">
    <span class="offline-icon">📡</span>
    <span data-i18n="offlineTitle">You are offline (Offline data available)</span>
  </div>

  <div class="app-viewport">

    <header class="site-header">
      <div class="header-inner">
        <div class="header-brand" id="brand-home-click">
          <div class="brand-logo-icon">
            <svg viewBox="0 0 36 36" fill="none" class="brand-icon-svg">
              <path d="M12 28C12 28 14 20 18 16C22 12 28 10 28 10C28 10 26 18 22 22C18 26 12 28 12 28Z" fill="#22c55e"/>
              <path d="M14 28C14 28 10 22 10 17C10 12 15 8 15 8C15 8 18 13 18 18C18 23 14 28 14 28Z" fill="#f59e0b"/>
              <path d="M16 28C16 28 18 22 22 19C26 16 30 15 30 15C30 15 28 21 24 24C20 27 16 28 16 28Z" fill="#15803d"/>
              <line x1="8" y1="32" x2="20" y2="16" stroke="#d97706" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="brand-text-col">
            <h1 class="brand-heading" data-i18n="appName">Krishi Mitra</h1>
            <span class="brand-subheading" data-i18n="appSubName">Sovereign Agrarian Governance OS</span>
          </div>
        </div>

        <nav class="header-nav">
          <button type="button" class="nav-menu-link active" id="top-nav-eligible" data-tab="eligible">
            <span data-i18n="navEligible">Eligible Schemes</span>
            <span id="badge-top-eligible" class="nav-count-badge">0</span>
          </button>
          <button type="button" class="nav-menu-link" id="top-nav-almost" data-tab="almost">
            <span data-i18n="navAlmost">Almost Eligible</span>
            <span id="badge-top-almost" class="nav-count-badge badge-amber">0</span>
          </button>
          <button type="button" class="nav-menu-link" id="top-nav-saved" data-tab="saved">
            <span data-i18n="navSaved">Saved Schemes</span>
            <span id="badge-top-saved" class="nav-count-badge badge-muted">0</span>
          </button>
          <div class="nav-lang-wrap">
            <button type="button" class="lang-toggle-pill" aria-label="Toggle language">
              <span class="lang-text-display">English</span>
            </button>
          </div>
          <div class="nav-profile-wrap">
            <button type="button" id="btn-top-profile" class="btn-profile-pill" aria-label="Farmer Profile">
              <span class="profile-avatar-emoji">&#128;&#140;</span>
              <span class="profile-pill-label" data-i18n="profile">Farmer Profile</span>
            </button>
          </div>
        </nav>

        <div class="mobile-header-actions">
          <button type="button" class="lang-toggle-pill mobile-lang-btn">English</button>
          <button type="button" id="btn-mobile-profile" class="mobile-profile-avatar" aria-label="Profile">&#128;&#140;</button>
        </div>
      </div>
    </header>

    <!-- LOGIN VIEW -->
    <section id="view-login" class="view-container login-fullscreen-hero">
      <div class="login-top-bar">
        <div class="login-brand-tag">
          <svg class="login-leaf-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
          <span class="login-brand-title">Krishi Mitra</span>
        </div>
        <div class="login-lang-capsule">
          <button type="button" class="login-lang-btn kn active" data-lang="kn">&#3221;&#3240;&#3277;&#3240;&#3233;</button>
          <button type="button" class="login-lang-btn en" data-lang="en">English</button>
        </div>
      </div>

      <div class="login-center-content">
        <div class="login-hero-titles">
          <h1 class="login-hero-main-title">Krishi Mitra</h1>
          <div class="login-hero-spaced-sub">K R I S H I &nbsp; M I T R A</div>
          <p class="login-hero-tagline" data-i18n="loginTagline">Discover government schemes made for you</p>
        </div>

        <div class="login-card-box">
          <div id="phone-step-container" class="login-step-view">
            <h2 class="login-card-heading" data-i18n="loginCardTitle">Sign In to Dashboard</h2>

            <div class="login-field-group">
              <label for="login-phone" class="login-field-label">Farmer Unique ID</label>
              <div class="login-phone-control">
                <span class="login-phone-prefix" style="font-size:0.78rem;padding:0 10px;white-space:nowrap;">KM-ID</span>
                <input type="text" id="login-phone" class="login-phone-input" maxlength="20" placeholder="e.g. KM26@0001" autocomplete="username" spellcheck="false">
              </div>
              <div id="phone-error-msg" class="login-field-error"></div>
            </div>

            <div class="login-field-group" style="margin-top:14px;">
              <label for="login-password" class="login-field-label">Password</label>
              <div class="login-pass-control">
                <input type="password" id="login-password" class="login-pass-input" placeholder="Enter your password" autocomplete="current-password">
                <button type="button" class="login-eye-toggle" id="btn-toggle-password" aria-label="Show/hide password">&#128065;</button>
              </div>
            </div>

            <div style="margin-top:14px;">
              <div class="demo-label">&#9889; Demo Accounts (click to fill):</div>
              <div class="login-demo-chips">
                <button type="button" class="demo-id-chip" data-id="KM26@0001">KM26@0001</button>
                <button type="button" class="demo-id-chip" data-id="KM26@0002">KM26@0002</button>
                <button type="button" class="demo-id-chip" data-id="KM26@0003">KM26@0003</button>
              </div>
            </div>

            <button type="button" id="btn-send-otp" class="btn-login-submit" style="margin-top:20px;">
              Sign In to Dashboard
            </button>

            <div class="login-signup-link-wrap">
              <button type="button" id="btn-login-signup" class="btn-signup-link">
                New farmer? <u>Register here</u>
              </button>
            </div>
          </div>

          <div id="otp-step-container" class="login-step-view" style="display:none;">
            <h2 class="login-card-heading" data-i18n="otpTitle">Enter OTP</h2>
            <p class="login-otp-notice">
              <span data-i18n="otpSubtitle">OTP sent to:</span>
              <strong id="otp-sent-phone">+91 —</strong>
            </p>
            <div class="login-field-group">
              <input type="tel" id="login-otp" class="login-otp-input" maxlength="4" placeholder="&bull;&bull;&bull;&bull;" inputmode="numeric">
              <div id="otp-error-msg" class="login-field-error"></div>
            </div>
            <div class="login-demo-otp">
              <button type="button" id="demo-otp-btn" class="login-quick-otp">&#9889; Demo OTP: 1234 (tap to fill)</button>
            </div>
            <button type="button" id="btn-verify-otp" class="btn-login-submit">Verify &amp; Continue</button>
            <div class="login-change-num">
              <button type="button" id="btn-change-number" class="login-text-btn">&#8592; Change ID</button>
            </div>
          </div>
        </div>

        <div class="login-footer-help">
          <button type="button" id="btn-login-help" class="login-help-anchor"><u>Help &amp; Helplines</u></button>
        </div>
      </div>
    </section>

    <!-- WIZARD VIEW -->
    <section id="view-wizard" class="view-container">
      <div class="wizard-container-wrap">
        <header class="wizard-header">
          <h2 class="wizard-heading" data-i18n="wizardTitle">Your Farming Profile</h2>
          <button type="button" class="lang-toggle-pill">English</button>
        </header>
        <div class="wizard-progress-section">
          <div class="progress-meta-row">
            <span id="wizard-step-label" class="step-label">Question 1 / 10</span>
            <span class="step-badge">100% Safe &amp; Secure</span>
          </div>
          <div class="progress-track">
            <div id="wizard-progress-bar" class="progress-fill" style="width:10%;"></div>
          </div>
        </div>
        <main class="wizard-main">
          <div class="wizard-card">
            <div class="question-header">
              <h3 id="wizard-q-title" class="q-title">Loading question...</h3>
              <p id="wizard-q-sub" class="q-subtitle">Description</p>
            </div>
            <div class="voice-interaction-box">
              <button type="button" id="wizard-mic-btn" class="big-mic-button" aria-label="Speak your answer">
                <span class="mic-wave-ring ring-1"></span>
                <span class="mic-wave-ring ring-2"></span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mic-icon-svg">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </button>
              <p id="voice-status-text" class="voice-status-label" data-i18n="voicePrompt">Tap the mic and speak your answer</p>
              <div id="voice-confirm-box" class="voice-confirm-card" style="display:none;">
                <div id="voice-heard-text" class="heard-text">We heard: ...</div>
                <p class="confirm-prompt-text" data-i18n="isThisCorrect">Is this correct?</p>
                <div class="confirm-actions-row">
                  <button type="button" id="voice-btn-confirm" class="btn-confirm-tick"><span class="tick-icon">&#10004;</span> <span class="btn-text" data-i18n="btnConfirmVoice">Yes, Confirm</span></button>
                  <button type="button" id="voice-btn-retry" class="btn-retry-mic"><span class="retry-icon">&#128260;</span> <span class="btn-text" data-i18n="btnRetryVoice">Try Again</span></button>
                </div>
              </div>
            </div>
            <div class="options-divider"><span>OR select an option below</span></div>
            <div id="wizard-options-container" class="wizard-options-area"></div>
          </div>
        </main>
        <footer class="wizard-nav-footer">
          <button type="button" id="wizard-back-btn" class="btn btn-outline btn-lg">&#8592; Back</button>
          <button type="button" id="wizard-next-btn" class="btn btn-primary btn-lg" disabled>Next &#10145;</button>
        </footer>
      </div>
    </section>

    <!-- MAIN VIEW -->
    <section id="view-main" class="view-container">

      <div id="subpage-home" class="main-subpage active">
        <div class="main-content-layout">

          <div class="hero-banner-container">
            <div class="hero-banner-card">
              <div class="hero-content-col">
                <div class="hero-pill-badge">
                  <span class="hero-pill-dot"></span>
                  <span data-i18n="heroBadge">Sovereign Agrarian Intelligence OS &mdash; 2,066 Statutory Schemes Indexed</span>
                </div>
                <h2 class="hero-headline" data-i18n="heroTitle">Direct Scheme Matching &amp; Verified Citizen Land Governance</h2>
                <p class="hero-description" data-i18n="heroDesc">Your statutory gateway to Central &amp; State DBT income support, crop insurance, zero-interest KCC credit, and micro-irrigation subsidies — matched to your land holdings and farmer profile.</p>
                <div class="hero-actions-row">
                  <button type="button" id="btn-hero-explore" class="hero-btn-white" data-i18n="heroBtnExplore">Explore Eligible Schemes</button>
                  <button type="button" id="btn-hero-share" class="hero-btn-outline" data-i18n="heroBtnShare"><span>&#128242; Statutory Guidelines</span></button>
                </div>
              </div>
              <div class="hero-graphic-col">
                <svg viewBox="0 0 200 150" fill="none" class="hero-tractor-svg" preserveAspectRatio="xMidYMid meet">
                  <circle cx="150" cy="110" r="30" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" stroke-width="4"/>
                  <circle cx="150" cy="110" r="14" fill="rgba(255,255,255,0.25)"/>
                  <circle cx="65" cy="120" r="18" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.4)" stroke-width="3"/>
                  <circle cx="65" cy="120" r="8" fill="rgba(255,255,255,0.25)"/>
                  <path d="M50 115 L145 110 L145 80 L115 80 L115 48 L75 48 L75 80 L50 90 Z" fill="rgba(255,255,255,0.2)"/>
                  <path d="M115 48 L155 48 L155 80 L115 80 Z" fill="rgba(255,255,255,0.14)"/>
                  <rect x="120" y="54" width="28" height="22" rx="3" fill="rgba(255,255,255,0.3)"/>
                  <line x1="68" y1="48" x2="68" y2="30" stroke="rgba(255,255,255,0.45)" stroke-width="4" stroke-linecap="round"/>
                </svg>
              </div>
            </div>
          </div>

          <div class="discover-card-container">
            <div class="discover-search-card">
              <h3 class="discover-card-heading" data-i18n="discoverTitle">Discover Statutory Schemes</h3>
              <div class="discover-search-form">
                <div class="search-input-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon-inside">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <input type="text" id="scheme-search-input" class="search-field" placeholder="Search scheme name or keyword (e.g. PM-KISAN, insurance, crop, loan)" data-i18n-placeholder="searchPlaceholder">
                </div>
                <div class="search-select-wrapper">
                  <select id="scheme-category-select" class="search-dropdown">
                    <option value="all">All Categories</option>
                    <option value="income">Direct Income Support</option>
                    <option value="insurance">Crop Insurance</option>
                    <option value="credit">Zero-Interest Credit (KCC)</option>
                    <option value="irrigation">Micro-Irrigation &amp; Ponds</option>
                    <option value="pension">Farmer Pension</option>
                  </select>
                </div>
                <div class="search-select-wrapper">
                  <select id="schemes-sort-select" class="search-dropdown">
                    <option value="benefit_desc">Highest Benefit First</option>
                    <option value="benefit_asc">Lowest Benefit First</option>
                    <option value="name">Scheme Name (A-Z)</option>
                  </select>
                </div>
                <button type="button" id="btn-discover-search" class="btn-discover-action">Search Schemes</button>
              </div>
            </div>
          </div>

          <div class="tips-ticker-section" id="tips-ticker-strip">
            <div class="ticker-content-box">
              <span class="ticker-bell-icon">&#128276;</span>
              <span id="ticker-tip-tag" class="ticker-tag urgency-high">LIVE ADVISORY</span>
              <span id="ticker-tip-title" class="ticker-title">Loading...</span>
              <span id="ticker-pause-tag" class="ticker-paused-badge" style="display:none;">Paused</span>
            </div>
            <div id="ticker-dots-container" class="ticker-dots-row"></div>
          </div>

          <div class="schemes-section-header">
            <nav class="scheme-tabs-nav">
              <button type="button" class="scheme-tab-btn active" data-tab="eligible">
                <span data-i18n="tabEligible">Eligible Schemes</span>
                <span id="badge-tab-eligible" class="tab-badge">0</span>
              </button>
              <button type="button" class="scheme-tab-btn" data-tab="almost">
                <span data-i18n="tabAlmost">Almost Eligible</span>
                <span id="badge-tab-almost" class="tab-badge badge-warning">0</span>
              </button>
              <button type="button" class="scheme-tab-btn" data-tab="saved">
                <span data-i18n="tabSaved">Saved</span>
                <span id="badge-tab-saved" class="tab-badge badge-neutral">0</span>
              </button>
            </nav>
            <div class="filter-chips-scroll">
              <button type="button" class="filter-chip active" data-filter="all">All</button>
              <button type="button" class="filter-chip" data-filter="income">Direct Income</button>
              <button type="button" class="filter-chip" data-filter="insurance">Crop Insurance</button>
              <button type="button" class="filter-chip" data-filter="credit">Zero-Interest Credit</button>
              <button type="button" class="filter-chip" data-filter="irrigation">Micro-Irrigation</button>
              <button type="button" class="filter-chip" data-filter="pension">Pension</button>
            </div>
          </div>

          <main class="schemes-main-list" id="schemes-main-anchor">
            <div id="schemes-list-container" class="schemes-vertical-list"></div>
            <div id="schemes-empty-state" class="empty-state-box" style="display:none;">
              <div class="empty-icon">&#127806;</div>
              <h3 class="empty-title" data-i18n="emptyEligible">No schemes found</h3>
              <p class="empty-desc" data-i18n="emptyEligibleDesc">Please try a different filter or update your profile.</p>
            </div>
          </main>

        </div>
      </div>

      <div id="subpage-docs" class="main-subpage">
        <div class="subpage-wrap">
          <div class="subpage-header">
            <h2 class="subpage-title" data-i18n="docsPageTitle">Statutory Agricultural Document Guide</h2>
            <p class="subpage-subtitle" data-i18n="docsPageSubtitle">What documents are needed, where to get them, and how to obtain them</p>
          </div>
          <div id="docs-list-container" class="docs-vertical-list"></div>
        </div>
      </div>

      <div id="subpage-tips" class="main-subpage">
        <div class="subpage-wrap">
          <div class="subpage-header">
            <h2 class="subpage-title" data-i18n="tipsPageTitle">Agronomic Intelligence &amp; Seasonal Calendar</h2>
            <p class="subpage-subtitle" data-i18n="tipsPageSubtitle">Karnataka Agriculture Department key advisories &amp; deadlines</p>
          </div>
          <div id="tips-full-list" class="tips-vertical-list"></div>
        </div>
      </div>

      <div id="subpage-help" class="main-subpage">
        <div class="subpage-wrap">
          <div class="subpage-header">
            <h2 class="subpage-title" data-i18n="helpPageTitle">Farmer Helplines &amp; Grievance Redressal</h2>
            <p class="subpage-subtitle" data-i18n="helpPageSubtitle">Contact for scheme assistance or technical help</p>
          </div>
          <div class="help-cards-list">
            <div class="help-card primary">
              <div class="help-card-icon">&#128222;</div>
              <div class="help-card-body">
                <h3 class="help-title" data-i18n="karnatakaRaithaVani">Karnataka Raitha Vani</h3>
                <div class="help-phone-number">1800-425-3553</div>
                <p class="help-timing">6:00 AM &ndash; 10:00 PM daily (Toll Free)</p>
                <a href="tel:18004253553" class="btn btn-call">Call Now &#128222;</a>
              </div>
            </div>
            <div class="help-card">
              <div class="help-card-icon">&#127470;&#127475;</div>
              <div class="help-card-body">
                <h3 class="help-title" data-i18n="kisanCallCenter">Kisan Call Center (Toll Free)</h3>
                <div class="help-phone-number">1800-180-1551</div>
                <p class="help-timing">Available every day &mdash; Kannada support available</p>
                <a href="tel:18001801551" class="btn btn-outline btn-call">Call &#128222;</a>
              </div>
            </div>
            <div class="help-card">
              <div class="help-card-icon">&#127962;</div>
              <div class="help-card-body">
                <h3 class="help-title" data-i18n="nearestOffice">Nearest Agriculture Office</h3>
                <p class="help-office-desc" data-i18n="nearestOfficeDesc">Visit your Hobli Raitha Samparka Kendra (RSK) or Taluk Assistant Agriculture Director's office.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav class="bottom-navbar">
        <button type="button" class="bottom-nav-item active" data-tab="home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span data-i18n="navHome">Home</span>
        </button>
        <button type="button" class="bottom-nav-item" data-tab="docs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          <span data-i18n="navDocs">Documents</span>
        </button>
        <button type="button" class="bottom-nav-item" data-tab="tips">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span data-i18n="navTips">Advisories</span>
        </button>
        <button type="button" class="bottom-nav-item" data-tab="help">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          <span data-i18n="navHelp">Help</span>
        </button>
      </nav>

    </section>

    <!-- SCHEME DETAIL MODAL -->
    <div id="scheme-detail-modal" class="modal-backdrop">
      <div id="modal-overlay-bg" class="modal-overlay"></div>
      <div class="modal-sheet">
        <div class="modal-header">
          <div class="modal-title-col">
            <span id="modal-scheme-status-tag" class="badge badge-eligible">Eligible</span>
            <h3 id="modal-scheme-title" class="modal-scheme-title">Scheme Name</h3>
            <p id="modal-scheme-dept" class="modal-scheme-dept">Department</p>
          </div>
          <button type="button" id="modal-btn-close" class="btn-close-modal" aria-label="Close">&#10005;</button>
        </div>
        <div class="modal-body-scroll">
          <div class="modal-benefit-box">
            <span class="benefit-sub" data-i18n="schemeBenefitLabel">Available Financial Benefit:</span>
            <div id="modal-scheme-benefit" class="benefit-val">&#8377;6,000 / year</div>
          </div>
          <div class="modal-section">
            <h4 class="section-heading" data-i18n="docChecklistTitle">Required Documents Checklist</h4>
            <p class="section-sub" data-i18n="docChecklistSub">Tick the documents you already have:</p>
            <div id="modal-doc-checklist" class="doc-checklist-group"></div>
          </div>
          <div class="modal-section">
            <h4 class="section-heading" data-i18n="officialSiteStepsTitle">Steps on the Official Portal</h4>
            <ol id="modal-steps-list" class="steps-numbered-list"></ol>
            <p class="notice-callout" data-i18n="externalSiteNotice">Note: The official portal opens in a new window. After applying, return here and mark as Applied.</p>
          </div>
        </div>
        <div class="modal-footer-actions">
          <button type="button" id="modal-btn-go-site" class="btn btn-primary btn-block" data-i18n="btnGoToSite">Go to Official Portal &#10145;</button>
          <button type="button" id="modal-btn-mark-applied" class="btn btn-outline btn-block" data-i18n="btnMarkApplied">Mark as Applied</button>
        </div>
      </div>
    </div>

    <!-- PROFILE DRAWER -->
    <div id="profile-drawer" class="drawer-container">
      <div id="drawer-overlay" class="drawer-overlay"></div>
      <div class="drawer-content">
        <div class="drawer-header">
          <div class="user-avatar-circle">&#128;&#140;</div>
          <div class="user-meta">
            <h3 class="user-name" data-i18n="profile">Farmer Profile</h3>
            <p id="profile-drawer-phone" class="user-phone">&mdash;</p>
          </div>
          <button type="button" id="btn-close-drawer" class="btn-close-drawer">&#10005;</button>
        </div>
        <div class="drawer-body">
          <div id="profile-drawer-summary" class="profile-chips-grid"></div>
          <div class="drawer-menu-list">
            <button type="button" id="btn-edit-profile-menu" class="drawer-menu-btn">
              <span class="menu-icon">&#9999;&#65039;</span>
              <span data-i18n="editProfileTitle">Edit My Farming Details</span>
            </button>
            <button type="button" id="btn-logout-menu" class="drawer-menu-btn">
              <span class="menu-icon">&#128682;</span>
              <span data-i18n="logout">Logout</span>
            </button>
            <button type="button" id="btn-delete-data-menu" class="drawer-menu-btn danger">
              <span class="menu-icon">&#128465;&#65039;</span>
              <span data-i18n="deleteData">Delete My Data</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- EDIT PROFILE MODAL -->
    <div id="edit-profile-modal" class="modal-backdrop">
      <div class="modal-overlay" onclick="window.app.closeEditProfileModal()"></div>
      <div class="modal-sheet">
        <div class="modal-header">
          <div>
            <h3 class="modal-scheme-title" data-i18n="editProfileTitle">Edit My Farming Details</h3>
            <p class="modal-scheme-dept" data-i18n="editProfileSub">Changes here instantly update your scheme matches</p>
          </div>
          <button type="button" id="btn-close-edit-modal" class="btn-close-modal">&#10005;</button>
        </div>
        <div class="modal-body-scroll">
          <div id="edit-profile-fields" class="edit-fields-list"></div>
        </div>
        <div class="modal-footer-actions">
          <button type="button" id="btn-save-edit-profile" class="btn btn-primary btn-block" data-i18n="btnSaveProfile">Save Profile &#10004;</button>
        </div>
      </div>
    </div>

    <!-- LOGIN HELP MODAL -->
    <div id="login-help-modal" class="modal-backdrop">
      <div class="modal-overlay" id="login-help-modal-overlay"></div>
      <div class="modal-sheet modal-help-sheet">
        <div class="modal-header">
          <div>
            <h3 class="modal-scheme-title" data-i18n="helpModalTitle">Farmer Helpline</h3>
            <p class="modal-scheme-dept">Krishi Mitra &mdash; 24x7 Farmer Assistance</p>
          </div>
          <button type="button" id="btn-close-login-help" class="btn-close-modal">&#10005;</button>
        </div>
        <div class="modal-body-content" style="padding:20px;line-height:1.7;font-size:1.05rem;">
          <div class="helpline-badge">
            <p style="margin:0 0 8px;font-weight:700;color:#4ade80;">&#128222; Kisan Call Center:</p>
            <p style="margin:0 0 4px;font-size:1.25rem;font-weight:800;color:#22c55e;"><a href="tel:18001801551" style="color:inherit;text-decoration:none;">1800-180-1551</a> (Toll Free)</p>
            <p style="margin:0;font-size:0.88rem;color:#94a3b8;">6:00 AM &ndash; 10:00 PM &mdash; Kannada support available</p>
          </div>
          <div class="helpline-badge">
            <p style="margin:0 0 8px;font-weight:700;color:#4ade80;">&#127963; Karnataka Farmer Helpline:</p>
            <p style="margin:0 0 4px;font-size:1.25rem;font-weight:800;color:#22c55e;"><a href="tel:08022212861" style="color:inherit;text-decoration:none;">080-22212861</a></p>
            <p style="margin:0;font-size:0.88rem;color:#94a3b8;">Agriculture Department, Bengaluru</p>
          </div>
          <p style="font-size:0.95rem;color:#94a3b8;">Website: <a href="https://raithamitra.karnataka.gov.in" target="_blank" style="color:#22c55e;font-weight:600;">raithamitra.karnataka.gov.in</a></p>
        </div>
        <div class="modal-footer-actions">
          <button type="button" id="btn-close-login-help-action" class="btn btn-primary btn-block" data-i18n="helpCloseBtn">Close</button>
        </div>
      </div>
    </div>

  </div>

  <script>
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.demo-id-chip').forEach(function(chip) {
        chip.addEventListener('click', function() {
          var id = chip.getAttribute('data-id');
          var phoneInput = document.getElementById('login-phone');
          var passInput = document.getElementById('login-password');
          if (phoneInput) phoneInput.value = id;
          if (passInput) passInput.value = id;
          if (phoneInput) phoneInput.focus();
        });
      });
      var eyeBtn = document.getElementById('btn-toggle-password');
      var passInput = document.getElementById('login-password');
      if (eyeBtn && passInput) {
        eyeBtn.addEventListener('click', function() {
          if (passInput.type === 'password') { passInput.type = 'text'; eyeBtn.textContent = String.fromCodePoint(128065,8419); }
          else { passInput.type = 'password'; eyeBtn.textContent = String.fromCodePoint(128065); }
        });
      }
    });
  </script>

  <script src="js/translations.js"></script>
  <script src="js/mockData.js"></script>
  <script src="js/api.js"></script>
  <script src="js/speech.js"></script>
  <script src="js/app.js"></script>

</body>
</html>'''

out_path = r'd:\krisi mitra\frontend\dashboard_app.html'
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(NEW_HTML)

import os
size = os.path.getsize(out_path)
lines = NEW_HTML.count('\n')
print(f'Written: {size} bytes, ~{lines} lines')
print('SUCCESS')
