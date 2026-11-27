# -*- coding: utf-8 -*-
"""
Generates frontend/dashboard_app.html matching legacy_index.html template exactly
with Obsidian Dark (#030704) and Emerald (#22c55e) color scheme, Space Grotesk typography,
and English wording matching index.html.
"""

import os
import re

with open("frontend/legacy_index.html", "r", encoding="utf-8") as f:
    legacy_html = f.read()

# Extract tractor SVG
tractor_m = re.search(r'(<svg viewBox="0 0 200 150" fill="none" class="hero-tractor-svg"[\s\S]*?</svg>)', legacy_html)
tractor_svg = tractor_m.group(1) if tractor_m else ""

# Extract brand SVG
brand_m = re.search(r'(<svg viewBox="0 0 36 36" fill="none" class="brand-icon-svg">[\s\S]*?</svg>)', legacy_html)
brand_svg = brand_m.group(1) if brand_m else ""

# Extract login leaf SVG
leaf_m = re.search(r'(<svg class="login-leaf-icon"[\s\S]*?</svg>)', legacy_html)
leaf_svg = leaf_m.group(1) if leaf_m else ""

html_content = f'''<!DOCTYPE html>
<html lang="en" id="htmlRoot">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#030704">
  <meta name="description" content="Krishi Mitra: Sovereign Agrarian Governance OS & Scheme Matching Engine for Karnataka and Pan-India Farmers">
  <title>Krishi Mitra — Sovereign Agrarian Governance OS & Scheme Matching Engine</title>
  <link rel="shortcut icon" href="assets/images/favicon.ico" type="image/x-icon">

  <!-- Google Fonts matching index.html -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">

  <!-- Core CSS Assets -->
  <link rel="stylesheet" href="css/bootstrap.min.css">
  <link rel="stylesheet" href="css/all.min.css">
  <link rel="stylesheet" href="css/style.css">
  <link rel="stylesheet" href="css/responsive.css">
  <link rel="stylesheet" href="css/krishi-nexus.css?v=4.6">

  <style>
    /* =========================================================================
       Obsidian Dark & Emerald Theme Overrides for Krishi Mitra Dashboard
       Exact template match to legacy_index.html with index.html color scheme
       ========================================================================= */
    :root {{
      --primary: #10b981;
      --primary-dark: #065f46;
      --primary-light: #064e3b;
      --primary-hover: #059669;
      --accent: #f59e0b;
      --accent-light: #78350f;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;

      --text-primary: #ffffff;
      --text-secondary: #cbd5e1;
      --text-muted: #94a3b8;

      --bg-page: #030704;
      --bg-card: #08190f;
      --bg-subtle: #061109;
      --border: rgba(34, 197, 94, 0.28);
      --border-input: rgba(34, 197, 94, 0.35);

      --font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }}

    body {{
      background-color: #030704 !important;
      color: #ffffff !important;
      font-family: var(--font-family) !important;
      min-height: 100vh;
      margin: 0;
      padding: 0;
    }}

    .app-viewport {{
      min-height: 100vh;
      background: #030704;
    }}

    /* SITE HEADER MATCHING index.html OBSIDIAN GLASS */
    .site-header {{
      background: rgba(3, 7, 4, 0.94) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
      border-bottom: 1px solid rgba(34, 197, 94, 0.28) !important;
      position: sticky;
      top: 0;
      z-index: 1000;
    }}

    .header-inner {{
      max-width: 1400px;
      margin: 0 auto;
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    .header-brand {{
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      text-decoration: none;
    }}

    .brand-logo-icon {{
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(34, 197, 94, 0.2);
    }}

    .brand-heading {{
      font-size: 1.25rem !important;
      font-weight: 700 !important;
      color: #ffffff !important;
      margin: 0 !important;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }}

    .brand-subheading {{
      font-size: 0.75rem !important;
      color: #94a3b8 !important;
      font-family: var(--font-mono);
      letter-spacing: 0.04em;
    }}

    /* HEADER NAV TABS */
    .header-nav {{
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}

    .nav-menu-link {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.95rem;
      border-radius: 999px;
      border: 1px solid rgba(34, 197, 94, 0.22);
      background: rgba(6, 18, 10, 0.85);
      color: #cbd5e1;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }}

    .nav-menu-link:hover {{
      color: #ffffff;
      border-color: #22c55e;
      background: rgba(34, 197, 94, 0.14);
      transform: translateY(-1px);
    }}

    .nav-menu-link.active {{
      background: linear-gradient(135deg, #22c55e 0%, #10b981 100%) !important;
      color: #021a0f !important;
      border-color: transparent !important;
      box-shadow: 0 4px 16px rgba(34, 197, 94, 0.38) !important;
      font-weight: 700 !important;
    }}

    .nav-count-badge {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-family: var(--font-mono);
      font-weight: 700;
      background: rgba(255, 255, 255, 0.2);
      color: inherit;
    }}

    .badge-amber {{
      background: #f59e0b !important;
      color: #030704 !important;
    }}

    .badge-muted {{
      background: #334155 !important;
      color: #f1f5f9 !important;
    }}

    .lang-toggle-pill {{
      display: inline-flex;
      align-items: center;
      padding: 0.45rem 0.85rem;
      border-radius: 999px;
      border: 1px solid rgba(34, 197, 94, 0.35);
      background: rgba(9, 29, 16, 0.85);
      color: #4ade80;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
    }}

    .lang-toggle-pill:hover {{
      background: rgba(34, 197, 94, 0.22);
      color: #ffffff;
    }}

    .btn-profile-pill {{
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.45rem 0.95rem;
      border-radius: 999px;
      border: 1px solid rgba(34, 197, 94, 0.45);
      background: rgba(16, 185, 129, 0.18);
      color: #ffffff;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }}

    .btn-profile-pill:hover {{
      background: rgba(34, 197, 94, 0.28);
      border-color: #22c55e;
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.25);
    }}

    .theme-toggle-btn {{
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 1px solid rgba(34, 197, 94, 0.3);
      background: rgba(6, 18, 10, 0.8);
      color: #4ade80;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }}

    .theme-toggle-btn:hover {{
      background: rgba(34, 197, 94, 0.2);
      color: #ffffff;
    }}

    /* HERO BANNER CARD WITH TRACTOR GRAPHIC */
    .hero-banner-container {{
      max-width: 1400px;
      margin: 1.5rem auto 1.25rem;
      padding: 0 1.25rem;
    }}

    .hero-banner-card {{
      background: linear-gradient(135deg, rgba(8, 28, 15, 0.96) 0%, rgba(3, 14, 7, 0.98) 100%) !important;
      border: 1px solid rgba(34, 197, 94, 0.36) !important;
      border-radius: 20px !important;
      padding: 2.2rem 2.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
      box-shadow: 0 16px 45px rgba(0, 0, 0, 0.65), 0 0 35px rgba(34, 197, 94, 0.12) !important;
      position: relative;
      overflow: hidden;
    }}

    .hero-banner-card::before {{
      content: "";
      position: absolute;
      top: -40%;
      right: -20%;
      width: 450px;
      height: 450px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(34, 197, 94, 0.14) 0%, transparent 70%);
      pointer-events: none;
    }}

    .hero-content-col {{
      flex: 1;
      max-width: 720px;
      position: relative;
      z-index: 2;
    }}

    .hero-pill-badge {{
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.16) !important;
      border: 1px solid rgba(34, 197, 94, 0.4) !important;
      color: #4ade80 !important;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 700;
      margin-bottom: 1rem;
    }}

    .hero-pill-dot {{
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e !important;
      box-shadow: 0 0 10px #22c55e !important;
      animation: pulseGlow 2s infinite;
    }}

    @keyframes pulseGlow {{
      0%, 100% {{ transform: scale(1); opacity: 1; }}
      50% {{ transform: scale(1.3); opacity: 0.7; }}
    }}

    .hero-banner-title {{
      font-size: 2.1rem !important;
      font-weight: 800 !important;
      color: #ffffff !important;
      line-height: 1.25;
      letter-spacing: -0.025em;
      margin-bottom: 0.85rem;
    }}

    .hero-banner-desc {{
      font-size: 1.05rem;
      line-height: 1.6;
      color: #cbd5e1 !important;
      margin-bottom: 1.5rem;
    }}

    .hero-actions-row {{
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }}

    .btn-hero-primary {{
      background: linear-gradient(135deg, #22c55e 0%, #10b981 100%);
      color: #021a0f;
      font-weight: 700;
      padding: 0.75rem 1.6rem;
      border-radius: 12px;
      border: none;
      font-size: 0.95rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 6px 20px rgba(34, 197, 94, 0.38);
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }}

    .btn-hero-primary:hover {{
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(34, 197, 94, 0.5);
      color: #021a0f;
    }}

    .btn-hero-secondary {{
      background: rgba(6, 21, 11, 0.85);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #ffffff;
      font-weight: 600;
      padding: 0.75rem 1.4rem;
      border-radius: 12px;
      font-size: 0.95rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
    }}

    .btn-hero-secondary:hover {{
      background: rgba(34, 197, 94, 0.16);
      border-color: #22c55e;
      color: #ffffff;
    }}

    .hero-graphic-col {{
      flex: 0 0 320px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
    }}

    .hero-tractor-svg {{
      width: 100%;
      max-width: 290px;
      height: auto;
      filter: drop-shadow(0 12px 24px rgba(34, 197, 94, 0.25));
    }}

    /* DISCOVER SEARCH CARD */
    .discover-card-container {{
      max-width: 1400px;
      margin: 0 auto 1.25rem;
      padding: 0 1.25rem;
    }}

    .discover-search-card {{
      background: rgba(7, 24, 13, 0.92) !important;
      border: 1px solid rgba(34, 197, 94, 0.32) !important;
      border-radius: 18px !important;
      padding: 1.5rem 1.75rem;
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.45) !important;
    }}

    .discover-search-card h3 {{
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff !important;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}

    .discover-search-form {{
      display: grid;
      grid-template-columns: 2fr 1.3fr 1.3fr auto;
      gap: 0.85rem;
      align-items: center;
    }}

    @media (max-width: 991px) {{
      .discover-search-form {{
        grid-template-columns: 1fr;
      }}
      .hero-banner-card {{
        flex-direction: column;
        padding: 1.5rem;
      }}
      .hero-graphic-col {{
        display: none;
      }}
    }}

    .discover-input, .discover-select {{
      background: #030d06 !important;
      border: 1px solid rgba(34, 197, 94, 0.35) !important;
      color: #ffffff !important;
      padding: 0.75rem 1rem;
      border-radius: 12px;
      font-size: 0.92rem;
      width: 100%;
      outline: none;
      transition: all 0.2s ease;
    }}

    .discover-input:focus, .discover-select:focus {{
      border-color: #22c55e !important;
      box-shadow: 0 0 16px rgba(34, 197, 94, 0.35) !important;
    }}

    .btn-discover-search {{
      background: linear-gradient(135deg, #22c55e, #10b981) !important;
      color: #021a0f !important;
      font-weight: 700 !important;
      border: none !important;
      padding: 0.75rem 1.5rem;
      border-radius: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.92rem;
      transition: all 0.2s ease;
      white-space: nowrap;
    }}

    .btn-discover-search:hover {{
      box-shadow: 0 4px 18px rgba(34, 197, 94, 0.45);
      transform: translateY(-1px);
    }}

    /* TIPS TICKER STRIP */
    .tips-ticker-section {{
      max-width: 1400px;
      margin: 0 auto 1.5rem;
      padding: 0 1.25rem;
    }}

    .ticker-content-box {{
      background: rgba(6, 18, 10, 0.9) !important;
      border: 1px solid rgba(34, 197, 94, 0.25) !important;
      border-radius: 14px;
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }}

    .ticker-label-badge {{
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.2) !important;
      color: #4ade80 !important;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
    }}

    .ticker-text {{
      color: #e2e8f0 !important;
      font-size: 0.9rem;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }}

    /* SCHEMES SECTION HEADER & CHIPS */
    .schemes-section-header {{
      max-width: 1400px;
      margin: 0 auto 1rem;
      padding: 0 1.25rem;
    }}

    .schemes-header-top {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 1rem;
    }}

    .schemes-header-top h2 {{
      font-size: 1.5rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
    }}

    .schemes-tabs-row {{
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(6, 18, 10, 0.9);
      padding: 0.3rem;
      border-radius: 999px;
      border: 1px solid rgba(34, 197, 94, 0.25);
    }}

    .tab-pill-btn {{
      border: none;
      background: transparent;
      color: #94a3b8;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.45rem 1rem;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s ease;
    }}

    .tab-pill-btn.active {{
      background: linear-gradient(135deg, #22c55e, #10b981);
      color: #021a0f;
      font-weight: 700;
      box-shadow: 0 2px 10px rgba(34, 197, 94, 0.35);
    }}

    .filter-chips-scroll {{
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.5rem;
      scrollbar-width: thin;
    }}

    .filter-chip {{
      white-space: nowrap;
      padding: 0.45rem 0.95rem;
      border-radius: 999px;
      background: rgba(9, 25, 14, 0.85) !important;
      border: 1px solid rgba(34, 197, 94, 0.3) !important;
      color: #cbd5e1 !important;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }}

    .filter-chip:hover {{
      background: rgba(34, 197, 94, 0.18) !important;
      color: #ffffff !important;
      border-color: #22c55e !important;
    }}

    .filter-chip.active {{
      background: linear-gradient(135deg, #22c55e, #10b981) !important;
      color: #021a0f !important;
      border-color: transparent !important;
      font-weight: 700 !important;
    }}

    /* SCHEMES VERTICAL LIST / CARDS */
    .schemes-main-list {{
      max-width: 1400px;
      margin: 0 auto 3rem;
      padding: 0 1.25rem;
    }}

    .schemes-vertical-list {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }}

    @media (max-width: 899px) {{
      .schemes-vertical-list {{
        grid-template-columns: 1fr;
      }}
    }}

    .scheme-card {{
      background: rgba(8, 25, 15, 0.95) !important;
      border: 1px solid rgba(34, 197, 94, 0.28) !important;
      border-radius: 16px !important;
      padding: 1.4rem 1.5rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45) !important;
      transition: all 0.25s ease !important;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }}

    .scheme-card:hover {{
      transform: translateY(-3px) !important;
      border-color: #22c55e !important;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.6), 0 0 20px rgba(34, 197, 94, 0.22) !important;
    }}

    .scheme-card-top {{
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }}

    .scheme-title {{
      font-size: 1.15rem;
      font-weight: 700;
      color: #ffffff !important;
      margin: 0 0 0.35rem;
      line-height: 1.3;
    }}

    .scheme-dept {{
      font-size: 0.8rem;
      color: #94a3b8;
      font-family: var(--font-mono);
    }}

    .scheme-badge {{
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 700;
      font-family: var(--font-mono);
      white-space: nowrap;
    }}

    .badge-eligible-green {{
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.45);
      color: #4ade80;
    }}

    .badge-almost-amber {{
      background: rgba(245, 158, 11, 0.2);
      border: 1px solid rgba(245, 158, 11, 0.45);
      color: #fcd34d;
    }}

    .scheme-desc {{
      font-size: 0.9rem;
      color: #cbd5e1;
      line-height: 1.55;
      margin-bottom: 1rem;
    }}

    .scheme-benefit-box {{
      background: rgba(3, 11, 6, 0.7);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 12px;
      padding: 0.85rem 1rem;
      margin-bottom: 1.15rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    .benefit-lbl {{
      font-size: 0.78rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}

    .benefit-val {{
      font-size: 1.15rem;
      font-weight: 800;
      color: #38bdf8 !important;
      font-family: var(--font-mono);
    }}

    .scheme-card-actions {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(34, 197, 94, 0.16);
    }}

    .btn-view-dossier {{
      background: rgba(34, 197, 94, 0.14);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #4ade80;
      font-size: 0.85rem;
      font-weight: 600;
      padding: 0.5rem 1rem;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }}

    .btn-view-dossier:hover {{
      background: rgba(34, 197, 94, 0.26);
      border-color: #22c55e;
      color: #ffffff;
    }}

    .btn-save-scheme {{
      background: transparent;
      border: 1px solid rgba(148, 163, 184, 0.3);
      color: #94a3b8;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
    }}

    .btn-save-scheme:hover, .btn-save-scheme.saved {{
      color: #f59e0b;
      border-color: #f59e0b;
      background: rgba(245, 158, 11, 0.12);
    }}

    /* SUBPAGES: DOCS, TIPS, HELP */
    .main-subpage {{
      display: none;
    }}

    .main-subpage.active {{
      display: block;
    }}

    .subpage-container {{
      max-width: 1400px;
      margin: 1.5rem auto 3rem;
      padding: 0 1.25rem;
    }}

    .subpage-header {{
      margin-bottom: 1.5rem;
    }}

    .subpage-header h2 {{
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.5rem;
    }}

    .subpage-header p {{
      color: #94a3b8;
      font-size: 0.95rem;
      margin: 0;
    }}

    .info-card-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.25rem;
    }}

    .info-glass-card {{
      background: rgba(8, 25, 15, 0.92);
      border: 1px solid rgba(34, 197, 94, 0.28);
      border-radius: 16px;
      padding: 1.5rem;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }}

    .info-glass-card h4 {{
      color: #ffffff;
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
    }}

    .info-glass-card p {{
      color: #cbd5e1;
      font-size: 0.9rem;
      line-height: 1.6;
    }}

    /* BOTTOM NAVBAR */
    .bottom-navbar {{
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(3, 7, 4, 0.96) !important;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-top: 1px solid rgba(34, 197, 94, 0.28) !important;
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0.5rem 0.25rem;
      z-index: 999;
    }}

    @media (min-width: 992px) {{
      .bottom-navbar {{
        display: none;
      }}
    }}

    .bottom-nav-item {{
      background: transparent;
      border: none;
      color: #94a3b8 !important;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.72rem;
      cursor: pointer;
      transition: all 0.2s ease;
      padding: 0.25rem 0.5rem;
    }}

    .bottom-nav-item.active {{
      color: #22c55e !important;
    }}

    .bottom-nav-item svg {{
      width: 22px;
      height: 22px;
    }}

    /* LOGIN FULLSCREEN HERO (PAGE 1) */
    .login-fullscreen-hero {{
      position: relative;
      min-height: 100vh;
      width: 100%;
      background-color: #030704 !important;
      background-image: 
        linear-gradient(180deg, rgba(3, 7, 4, 0.88) 0%, rgba(3, 7, 4, 0.65) 40%, rgba(3, 7, 4, 0.95) 100%),
        url('assets/images/farm-hero.jpg'),
        url('../assets/farm-hero.jpg') !important;
      background-position: center center;
      background-size: cover;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 1.5rem;
      box-sizing: border-box;
    }}

    .login-top-bar {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
    }}

    .login-brand-tag {{
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #ffffff;
      font-weight: 700;
      font-size: 1.1rem;
    }}

    .login-lang-capsule {{
      display: flex;
      align-items: center;
      background: rgba(3, 12, 6, 0.85);
      border: 1px solid rgba(34, 197, 94, 0.35);
      border-radius: 999px;
      padding: 0.2rem;
    }}

    .login-lang-btn {{
      border: none;
      background: transparent;
      color: #94a3b8;
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      cursor: pointer;
    }}

    .login-lang-btn.active {{
      background: linear-gradient(135deg, #22c55e, #10b981);
      color: #021a0f;
    }}

    .login-center-content {{
      max-width: 480px;
      margin: 2rem auto;
      width: 100%;
      text-align: center;
    }}

    .login-hero-titles {{
      margin-bottom: 1.5rem;
    }}

    .login-hero-main-title {{
      font-size: 2.4rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0 0 0.25rem;
      letter-spacing: -0.02em;
    }}

    .login-hero-spaced-sub {{
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: #4ade80;
      letter-spacing: 0.25em;
      margin-bottom: 0.5rem;
    }}

    .login-hero-tagline {{
      font-size: 0.95rem;
      color: #cbd5e1;
      margin: 0;
    }}

    .login-card-box {{
      background: rgba(8, 25, 14, 0.94) !important;
      border: 1px solid rgba(34, 197, 94, 0.35) !important;
      border-radius: 20px !important;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(34, 197, 94, 0.15) !important;
      padding: 2rem 1.75rem;
      text-align: left;
    }}

    .login-card-heading {{
      font-size: 1.35rem;
      font-weight: 800;
      color: #ffffff !important;
      margin: 0 0 1.25rem;
    }}

    .login-field-group {{
      margin-bottom: 1.15rem;
    }}

    .login-field-label {{
      display: block;
      font-size: 0.88rem;
      font-weight: 600;
      color: #cbd5e1 !important;
      margin-bottom: 0.4rem;
    }}

    .login-phone-control, .login-input-control {{
      display: flex;
      align-items: center;
      background: #030d06 !important;
      border: 1px solid rgba(34, 197, 94, 0.38) !important;
      border-radius: 12px !important;
      padding: 0 0.85rem;
    }}

    .login-phone-prefix {{
      color: #4ade80 !important;
      font-weight: 700;
      font-family: var(--font-mono);
      font-size: 0.9rem;
      margin-right: 0.5rem;
    }}

    .login-phone-input, .login-text-input {{
      border: none;
      background: transparent !important;
      color: #ffffff !important;
      font-size: 0.95rem;
      width: 100%;
      padding: 0.75rem 0;
      outline: none;
    }}

    .login-field-error {{
      font-size: 0.8rem;
      color: #f87171;
      margin-top: 0.35rem;
      min-height: 18px;
    }}

    .btn-login-submit {{
      width: 100%;
      background: linear-gradient(135deg, #22c55e, #10b981) !important;
      color: #021a0f !important;
      font-weight: 700 !important;
      border: none !important;
      padding: 0.85rem 1rem;
      border-radius: 12px;
      font-size: 1rem;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4) !important;
      transition: all 0.2s ease;
      margin-top: 0.5rem;
    }}

    .btn-login-submit:hover {{
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(34, 197, 94, 0.55) !important;
    }}

    .demo-chip-pill {{
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.35);
      color: #e2e8f0;
      font-family: var(--font-mono);
      font-size: 0.74rem;
      font-weight: 600;
      transition: all 0.2s ease;
    }}

    .demo-chip-pill:hover {{
      background: rgba(34, 197, 94, 0.28);
      border-color: #22c55e;
      color: #ffffff;
    }}

    .login-signup-link-wrap {{
      text-align: center;
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(34, 197, 94, 0.2);
    }}

    .btn-signup-link {{
      background: transparent;
      border: none;
      color: #4ade80;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
    }}

    /* MODAL AND DRAWER STYLING */
    .modal-backdrop {{
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(8px);
      z-index: 2000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }}

    .modal-backdrop.show {{
      display: flex !important;
    }}

    .modal-sheet {{
      background: #071a0e !important;
      border: 1px solid rgba(34, 197, 94, 0.4) !important;
      border-radius: 20px;
      max-width: 720px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(34, 197, 94, 0.2) !important;
      overflow: hidden;
      color: #ffffff;
    }}

    .modal-header {{
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(34, 197, 94, 0.25);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    .modal-body-scroll {{
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }}

    .modal-footer-actions {{
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(34, 197, 94, 0.25);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
    }}

    /* DRAWER */
    .drawer-container {{
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2050;
      display: none;
    }}

    .drawer-container.show {{
      display: block !important;
    }}

    .drawer-overlay {{
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(6px);
    }}

    .drawer-content {{
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      max-width: 420px;
      background: #06150b !important;
      border-left: 1px solid rgba(34, 197, 94, 0.35) !important;
      display: flex;
      flex-direction: column;
      color: #ffffff;
      box-shadow: -10px 0 40px rgba(0, 0, 0, 0.8);
    }}

    .drawer-header {{
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid rgba(34, 197, 94, 0.25);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}

    .drawer-body {{
      padding: 1.5rem;
      overflow-y: auto;
      flex: 1;
    }}

    /* LIGHT MODE STYLES */
    .lm body, .lm .app-viewport {{
      background: #f8fafc !important;
      color: #022013 !important;
    }}

    .lm .site-header {{
      background: rgba(255, 255, 255, 0.95) !important;
      border-bottom: 1px solid rgba(16, 185, 129, 0.25) !important;
    }}

    .lm .brand-heading {{
      color: #022013 !important;
    }}

    .lm .nav-menu-link {{
      background: #f1f5f9;
      color: #334155;
      border-color: #cbd5e1;
    }}

    .lm .hero-banner-card {{
      background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%) !important;
      border-color: rgba(16, 185, 129, 0.35) !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08) !important;
    }}

    .lm .hero-banner-title {{
      color: #022013 !important;
    }}

    .lm .hero-banner-desc {{
      color: #334155 !important;
    }}

    .lm .discover-search-card {{
      background: #ffffff !important;
      border-color: rgba(16, 185, 129, 0.28) !important;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.06) !important;
    }}

    .lm .discover-search-card h3 {{
      color: #022013 !important;
    }}

    .lm .discover-input, .lm .discover-select {{
      background: #f8fafc !important;
      border-color: #cbd5e1 !important;
      color: #022013 !important;
    }}

    .lm .scheme-card {{
      background: #ffffff !important;
      border-color: #e2e8f0 !important;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05) !important;
    }}

    .lm .scheme-title {{
      color: #022013 !important;
    }}

    .lm .scheme-desc {{
      color: #475569;
    }}

    .lm .scheme-benefit-box {{
      background: #f8fafc;
      border-color: #e2e8f0;
    }}

    .lm .login-card-box {{
      background: #ffffff !important;
      color: #022013 !important;
      border-color: rgba(16, 185, 129, 0.3) !important;
    }}

    .lm .login-card-heading {{
      color: #022013 !important;
    }}

    .lm .login-field-label {{
      color: #334155 !important;
    }}

    .lm .login-phone-control, .lm .login-input-control {{
      background: #f8fafc !important;
      border-color: #cbd5e1 !important;
    }}

    .lm .login-phone-input, .lm .login-text-input {{
      color: #022013 !important;
    }}

    .lm .modal-sheet, .lm .drawer-content {{
      background: #ffffff !important;
      color: #022013 !important;
      border-color: #cbd5e1 !important;
    }}
  </style>
</head>
<body>

  <!-- Offline Notice Bar -->
  <div id="offline-alert-bar" class="offline-bar" style="display: none; background: #b45309; color: #ffffff; text-align: center; padding: 0.5rem; font-size: 0.88rem; font-weight: 600;">
    <span class="offline-icon">📡</span>
    <span data-i18n="offlineTitle">You are currently offline (Cached statutory data is available)</span>
  </div>

  <div class="app-viewport">

    <!-- ========================================================= -->
    <!-- TOP NAVIGATION BAR (Exact match to legacy_index.html)     -->
    <!-- Top menu: Eligible, Almost Eligible, Saved, Lang, Profile -->
    <!-- ========================================================= -->
    <header class="site-header">
      <div class="header-inner">
        
        <!-- Brand Logo & Name -->
        <div class="header-brand" id="brand-home-click">
          <div class="brand-logo-icon">
            {brand_svg}
          </div>
          <div class="brand-text-col">
            <h1 class="brand-heading" data-i18n="appName">Krishi Mitra</h1>
            <span class="brand-subheading" data-i18n="appSubName">Sovereign Agrarian Governance OS</span>
          </div>
        </div>

        <!-- Center & Right Navigation (Eligible, Almost Eligible, Saved, Language, Profile) -->
        <nav class="header-nav">
          <!-- Eligible Schemes Link -->
          <button type="button" class="nav-menu-link active" id="top-nav-eligible" data-tab="eligible">
            <span data-i18n="navEligible">Eligible Schemes</span>
            <span id="badge-top-eligible" class="nav-count-badge">0</span>
          </button>

          <!-- Almost Eligible Link -->
          <button type="button" class="nav-menu-link" id="top-nav-almost" data-tab="almost">
            <span data-i18n="navAlmost">Almost Eligible</span>
            <span id="badge-top-almost" class="nav-count-badge badge-amber">0</span>
          </button>

          <!-- Saved Schemes Link -->
          <button type="button" class="nav-menu-link" id="top-nav-saved" data-tab="saved">
            <span data-i18n="navSaved">Saved Schemes</span>
            <span id="badge-top-saved" class="nav-count-badge badge-muted">0</span>
          </button>

          <!-- Theme Toggle (Moon / Sun) -->
          <button type="button" id="themeToggleBtn" class="theme-toggle-btn" title="Toggle Obsidian Dark / Mint Light">
            <i class="fa-solid fa-moon"></i>
          </button>

          <!-- Language Toggle Pill -->
          <div class="nav-lang-wrap">
            <button type="button" class="lang-toggle-pill" id="globalLangToggle" aria-label="Toggle Kannada and English">
              <span class="lang-text-display">ಕನ್ನಡ</span>
            </button>
          </div>

          <!-- Profile Button -->
          <div class="nav-profile-wrap">
            <button type="button" id="btn-top-profile" class="btn-profile-pill" aria-label="Farmer Profile Options">
              <span class="profile-avatar-emoji">👨‍🌾</span>
              <span class="profile-pill-label" id="topNavFarmerLabel" data-i18n="profile">Farmer Profile</span>
            </button>
          </div>
        </nav>

        <!-- Mobile Header Actions -->
        <div class="mobile-header-actions d-lg-none d-flex align-items-center gap-2">
          <button type="button" class="lang-toggle-pill mobile-lang-btn">ಕನ್ನಡ</button>
          <button type="button" id="btn-mobile-profile" class="btn-profile-pill" aria-label="Profile">
            👨‍🌾
          </button>
        </div>

      </div>
    </header>

    <!-- ========================================================= -->
    <!-- PAGE 1: LOGIN / SIGN UP (Full Screen Farm Field)          -->
    <!-- Matching legacy_index.html with User ID + Plain Password  -->
    <!-- ========================================================= -->
    <section id="view-login" class="view-container login-fullscreen-hero" style="display: none;">
      
      <!-- Top Floating Navigation -->
      <div class="login-top-bar">
        <div class="login-brand-tag">
          {leaf_svg}
          <span class="login-brand-title">Krishi Mitra</span>
        </div>

        <div class="login-lang-capsule">
          <button type="button" class="login-lang-btn en active" data-lang="en">English</button>
          <button type="button" class="login-lang-btn kn" data-lang="kn">ಕನ್ನಡ</button>
        </div>
      </div>

      <!-- Center Hero Content & Floating Obsidian Glass Card -->
      <div class="login-center-content">

        <!-- Hero Typography -->
        <div class="login-hero-titles">
          <h1 class="login-hero-main-title">Krishi Mitra</h1>
          <div class="login-hero-spaced-sub">K R I S H I &nbsp; M I T R A</div>
          <p class="login-hero-tagline" data-i18n="loginTagline">Sovereign Agrarian Intelligence &amp; Scheme Matching Engine</p>
        </div>

        <!-- Floating Card -->
        <div class="login-card-box">

          <div id="phone-step-container" class="login-step-view">
            <h2 class="login-card-heading" data-i18n="loginCardTitle">Farmer Portal Sign In</h2>
            
            <!-- User ID or Mobile Input -->
            <div class="login-field-group">
              <label for="login-phone" class="login-field-label">Farmer Unique ID / Mobile Number</label>
              <div class="login-input-control">
                <i class="fa-solid fa-id-card text-success me-2"></i>
                <input type="text" id="login-phone" class="login-text-input" placeholder="e.g. KM26@0001 or 9845012345" value="KM26@0001" autocomplete="username">
              </div>
            </div>

            <!-- Password Input (Plain text per user rule) -->
            <div class="login-field-group">
              <label for="login-password" class="login-field-label">Password</label>
              <div class="login-input-control">
                <i class="fa-solid fa-lock text-success me-2"></i>
                <input type="password" id="login-password" class="login-text-input" placeholder="Enter password (default: KM26@0001)" value="KM26@0001" autocomplete="current-password">
                <button type="button" id="toggleLoginPassBtn" style="background:none;border:none;color:#94a3b8;cursor:pointer;">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>
              <div id="phone-error-msg" class="login-field-error"></div>
            </div>

            <!-- Demo Quick Fill Chips -->
            <div class="mb-3">
              <div class="small text-muted mb-1 font-monospace" style="font-size:0.75rem;">1-CLICK DEMO FARMERS:</div>
              <div class="d-flex flex-wrap gap-1">
                <span class="demo-chip-pill" onclick="quickFillFarmer('KM26@0001', 'KM26@0001')">
                  <i class="fa-solid fa-user-check text-success"></i> KM26@0001 (Ramesh Patil)
                </span>
                <span class="demo-chip-pill" onclick="quickFillFarmer('KM26@0002', 'KM26@0002')">
                  <i class="fa-solid fa-user-check text-success"></i> KM26@0002 (Suresh Gowda)
                </span>
                <span class="demo-chip-pill" onclick="quickFillFarmer('KM26@0003', 'KM26@0003')">
                  <i class="fa-solid fa-user-check text-success"></i> KM26@0003 (Ningappa)
                </span>
              </div>
            </div>

            <button type="button" id="btn-send-otp" class="btn-login-submit" data-i18n="signInBtn">
              <i class="fa-solid fa-arrow-right-to-bracket me-2"></i>Sign In to Dashboard
            </button>

            <div class="login-signup-link-wrap">
              <a href="page-login.html?tab=register" class="btn-signup-link" data-i18n-html="newHereSignUp">
                New farmer? <u>Register Full Profile (6 Tables)</u>
              </a>
            </div>
          </div>

          <!-- Step 2: OTP step (retained for backward compatibility with mock flow) -->
          <div id="otp-step-container" class="login-step-view" style="display: none;">
            <h2 class="login-card-heading" data-i18n="otpTitle">Verify OTP</h2>
            <p class="login-otp-hint" data-i18n="otpSentTo">Enter the 4-digit code sent to your registered mobile.</p>
            
            <div class="login-field-group">
              <div class="login-input-control">
                <input type="text" id="login-otp" class="login-text-input text-center font-monospace" maxlength="6" placeholder="• • • •" style="font-size:1.4rem; letter-spacing:0.5rem;">
              </div>
              <div id="otp-error-msg" class="login-field-error"></div>
            </div>

            <button type="button" id="btn-verify-otp" class="btn-login-submit">
              Verify &amp; Enter Dashboard
            </button>
            <div class="text-center mt-3">
              <button type="button" id="btn-change-phone" class="btn-signup-link small">← Back to Sign In</button>
            </div>
          </div>

        </div>

      </div>

      <div class="login-footer-help text-center text-muted small">
        <span>Toll-Free Kisan Call Center: <strong>1800-180-1551</strong> | Raitha Vani: <strong>1800-425-3553</strong></span>
      </div>

    </section>

    <!-- ========================================================= -->
    <!-- PAGE 2: ELIGIBILITY WIZARD (Exact match to legacy_index)  -->
    <!-- ========================================================= -->
    <section id="view-wizard" class="view-container" style="display: none;">
      <div class="wizard-container-wrap" style="max-width: 760px; margin: 2rem auto; padding: 0 1rem;">
        <header class="wizard-header d-flex align-items-center justify-content-between mb-3">
          <h2 class="wizard-heading m-0" data-i18n="wizardTitle" style="font-size: 1.4rem; font-weight: 800; color: #ffffff;">Farmer Agrarian Profile</h2>
          <button type="button" class="lang-toggle-pill">English</button>
        </header>

        <div class="wizard-progress-bar-wrap mb-4" style="background: rgba(34, 197, 94, 0.15); height: 8px; border-radius: 999px; overflow: hidden;">
          <div id="wizard-progress-fill" style="width: 20%; height: 100%; background: linear-gradient(135deg, #22c55e, #10b981);"></div>
        </div>

        <main class="wizard-main">
          <div id="wizard-card-container" class="wizard-card-box" style="background: rgba(8, 25, 14, 0.95); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 20px; padding: 2rem; box-shadow: 0 12px 35px rgba(0,0,0,0.5);">
            <div class="wizard-step-tag mb-2 font-monospace text-success small fw-bold" id="wizard-step-indicator">STEP 1 OF 5</div>
            <h3 id="wizard-question-text" class="text-white fw-bold mb-3" style="font-size: 1.25rem;">What is your landholding size?</h3>
            <div id="wizard-options-container" class="d-grid gap-2 mb-4">
              <!-- Dynamically populated options -->
            </div>
            <div class="d-flex align-items-center justify-content-between pt-3 border-top border-secondary border-opacity-25">
              <button type="button" id="wizard-btn-prev" class="btn-hero-secondary btn-sm">← Previous</button>
              <button type="button" id="wizard-btn-skip" class="btn-hero-secondary btn-sm">Skip</button>
              <button type="button" id="wizard-btn-next" class="btn-hero-primary btn-sm">Next Question →</button>
            </div>
          </div>
        </main>
      </div>
    </section>

    <!-- ========================================================= -->
    <!-- PAGE 3: MAIN DASHBOARD VIEW (Exact match to legacy_index) -->
    <!-- Contains: subpage-home, subpage-docs, subpage-tips, help  -->
    <!-- ========================================================= -->
    <section id="view-main" class="view-container">

      <!-- ======================================================= -->
      <!-- SUBPAGE 1: HOME (Hero + Search + Ticker + Scheme List)  -->
      <!-- ======================================================= -->
      <div id="subpage-home" class="main-subpage active">

        <!-- 1. Hero Banner Card with Tractor Graphic -->
        <div class="hero-banner-container">
          <div class="hero-banner-card">
            <div class="hero-content-col">
              <!-- Pill Tag at Top Left -->
              <div class="hero-pill-badge">
                <span class="hero-pill-dot"></span>
                <span data-i18n="heroBadgeText">Sovereign Agrarian Intelligence OS — 2,066 Statutory Schemes</span>
              </div>

              <!-- Main Heading -->
              <h2 class="hero-banner-title" data-i18n="heroMainTitle">
                Direct Scheme Matching &amp; Verified Citizen Land Governance
              </h2>

              <!-- Subtitle Description -->
              <p class="hero-banner-desc" data-i18n="heroSubTitle">
                Empowering Indian farmers with instant statutory eligibility calculation, zero-leakage entitlement tracking, and multi-tier agrarian support across central and state schemes.
              </p>

              <!-- CTA Buttons -->
              <div class="hero-actions-row">
                <a href="#schemes-main-anchor" class="btn-hero-primary" id="btn-hero-find">
                  <i class="fa-solid fa-list-check"></i>
                  <span data-i18n="heroCtaFind">Explore Eligible Schemes</span>
                </a>
                <button type="button" class="btn-hero-secondary" id="btn-hero-how">
                  <i class="fa-solid fa-book-open"></i>
                  <span data-i18n="heroCtaHow">Statutory Guidelines</span>
                </button>
              </div>
            </div>

            <!-- Graphic Right Column (Tractor SVG Illustration) -->
            <div class="hero-graphic-col">
              {tractor_svg}
            </div>
          </div>
        </div>

        <!-- 2. Discover Search Card (Category, Sort, Query) -->
        <div class="discover-card-container">
          <div class="discover-search-card">
            <h3 data-i18n="discoverHeading">
              <i class="fa-solid fa-magnifying-glass text-success"></i>
              Statutory Scheme Discovery &amp; Entitlement Search
            </h3>
            <div class="discover-search-form">
              <!-- Search Input -->
              <div>
                <input type="text" id="scheme-search-input" class="discover-input" placeholder="Search schemes by keyword, crop, benefits, or entitlement (e.g. drip, PM-KISAN, subsidy)..." data-i18n-placeholder="searchPlaceholder">
              </div>

              <!-- Category Dropdown -->
              <div>
                <select id="scheme-category-select" class="discover-select">
                  <option value="all">All Categories (2,066 Schemes)</option>
                  <option value="Direct Income Support">Direct Income Support</option>
                  <option value="Crop Insurance">Crop Insurance &amp; Risk Mitigation</option>
                  <option value="Zero-Interest Credit">Zero-Interest &amp; Subsidized Credit</option>
                  <option value="Micro-Irrigation">Micro-Irrigation &amp; Water Security</option>
                  <option value="Farmer Pension">Farmer Pension &amp; Social Security</option>
                  <option value="Farm Mechanization">Farm Mechanization &amp; Implements</option>
                  <option value="Soil & Seeds">Soil Health &amp; Certified Seeds</option>
                  <option value="Organic Farming">Organic &amp; Regenerative Farming</option>
                </select>
              </div>

              <!-- Sort Dropdown -->
              <div>
                <select id="scheme-sort-select" class="discover-select">
                  <option value="benefit_desc">Highest Financial Benefit First</option>
                  <option value="land_asc">Lowest Landholding Barrier</option>
                  <option value="disbursal_fast">Fastest Disbursal Window</option>
                  <option value="name_asc">Alphabetical (A - Z)</option>
                </select>
              </div>

              <!-- Execute Search Button -->
              <div>
                <button type="button" id="btn-execute-search" class="btn-discover-search">
                  <i class="fa-solid fa-filter"></i>
                  <span data-i18n="searchBtn">Filter Schemes</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Tips Ticker Strip -->
        <div class="tips-ticker-section" id="tips-ticker-strip">
          <div class="ticker-content-box">
            <div class="ticker-label-badge">
              <i class="fa-solid fa-bullhorn"></i>
              <span>LIVE ADVISORY</span>
            </div>
            <div id="ticker-live-text" class="ticker-text">
              PM-Kisan 19th installment scheduled for release | Apply for PMFBY Kharif crop insurance before statutory deadline | Drip irrigation subsidy up to 90% active for SC/ST and small farmers in Karnataka.
            </div>
            <div id="ticker-dots-container" class="d-none d-md-flex align-items-center gap-1">
              <span style="width:6px;height:6px;border-radius:50%;background:#22c55e;"></span>
              <span style="width:6px;height:6px;border-radius:50%;background:rgba(34,197,94,0.3);"></span>
              <span style="width:6px;height:6px;border-radius:50%;background:rgba(34,197,94,0.3);"></span>
            </div>
          </div>
        </div>

        <!-- 4. Schemes Section Header (Eligible / Almost / Saved tabs + Category Chips) -->
        <div class="schemes-section-header">
          <div class="schemes-header-top">
            <div>
              <h2 id="schemes-section-title" data-i18n="eligibleSchemesTitle">Eligible Statutory Schemes</h2>
              <div class="text-muted small font-monospace" id="schemes-count-indicator">Showing 0 matching schemes from PostgreSQL database</div>
            </div>

            <!-- Tabs: Eligible / Almost Eligible / Saved -->
            <div class="schemes-tabs-row">
              <button type="button" class="tab-pill-btn active" id="tab-eligible-schemes" data-tab="eligible">
                <span data-i18n="navEligible">Eligible</span> (<span id="sub-badge-eligible">0</span>)
              </button>
              <button type="button" class="tab-pill-btn" id="tab-almost-schemes" data-tab="almost">
                <span data-i18n="navAlmost">Almost Eligible</span> (<span id="sub-badge-almost">0</span>)
              </button>
              <button type="button" class="tab-pill-btn" id="tab-saved-schemes" data-tab="saved">
                <span data-i18n="navSaved">Saved</span> (<span id="sub-badge-saved">0</span>)
              </button>
            </div>
          </div>

          <!-- Category Filter Chips -->
          <div class="filter-chips-scroll" id="categoryFilterChips">
            <button type="button" class="filter-chip active" data-category="all">All (2,066)</button>
            <button type="button" class="filter-chip" data-category="Direct Income Support">Income Support</button>
            <button type="button" class="filter-chip" data-category="Crop Insurance">Crop Insurance</button>
            <button type="button" class="filter-chip" data-category="Zero-Interest Credit">Zero-Interest Credit</button>
            <button type="button" class="filter-chip" data-category="Micro-Irrigation">Micro-Irrigation</button>
            <button type="button" class="filter-chip" data-category="Farmer Pension">Pension</button>
            <button type="button" class="filter-chip" data-category="Farm Mechanization">Mechanization</button>
            <button type="button" class="filter-chip" data-category="Soil & Seeds">Soil Health &amp; Seeds</button>
            <button type="button" class="filter-chip" data-category="Organic Farming">Organic</button>
          </div>
        </div>

        <!-- 5. Schemes Vertical List (2-column layout matching reference screenshot) -->
        <main class="schemes-main-list" id="schemes-main-anchor">
          <div id="schemes-list-container" class="schemes-vertical-list">
            <!-- Dynamically populated scheme cards -->
            <div class="text-center py-5 text-muted w-100" style="grid-column: 1 / -1;">
              <i class="fa-solid fa-circle-notch fa-spin fa-2x text-success mb-3"></i>
              <div>Loading statutory schemes from PostgreSQL database...</div>
            </div>
          </div>
        </main>

      </div>

      <!-- ======================================================= -->
      <!-- SUBPAGE 2: STATUTORY DOCUMENTS GUIDE                    -->
      <!-- ======================================================= -->
      <div id="subpage-docs" class="main-subpage">
        <div class="subpage-container">
          <div class="subpage-header">
            <h2>Statutory Agricultural Document Guide</h2>
            <p>Mandatory documentation required for seamless zero-rejection application to statutory schemes.</p>
          </div>
          <div class="info-card-grid">
            <div class="info-glass-card">
              <h4><i class="fa-solid fa-file-contract text-success me-2"></i>Pahani / RTC (Bhoomi)</h4>
              <p>Essential record of rights, tenancy, and crops. Required for PM-KISAN, PMFBY, and input subsidies. Download latest signed RTC via Bhoomi portal.</p>
            </div>
            <div class="info-glass-card">
              <h4><i class="fa-solid fa-id-card text-success me-2"></i>Aadhaar Linked Bank Account</h4>
              <p>Mandatory for Direct Benefit Transfer (DBT). Ensure your primary bank account is NPCI mapped for zero-rejection benefit transfer.</p>
            </div>
            <div class="info-glass-card">
              <h4><i class="fa-solid fa-certificate text-success me-2"></i>Caste &amp; Income Certificate</h4>
              <p>Required for 90% micro-irrigation subsidies (SC/ST) and special target category concessions under Karnataka state schemes.</p>
            </div>
            <div class="info-glass-card">
              <h4><i class="fa-solid fa-credit-card text-success me-2"></i>Kisan Credit Card (KCC)</h4>
              <p>Unlocks up to ₹3,00,000 crop loans at zero interest or 3% subvention. Apply through your nearest PACS or nationalized bank branch.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- SUBPAGE 3: AGRONOMIC TIPS & HARVEST GUIDANCE            -->
      <!-- ======================================================= -->
      <div id="subpage-tips" class="main-subpage">
        <div class="subpage-container">
          <div class="subpage-header">
            <h2>Agronomic Intelligence &amp; Seasonal Calendar</h2>
            <p>Real-time weather advisories, Kharif/Rabi sowing windows, and market intervention prices.</p>
          </div>
          <div class="info-card-grid">
            <div class="info-glass-card">
              <h4><i class="fa-solid fa-cloud-sun-rain text-success me-2"></i>Pre-Monsoon Soil Preparation</h4>
              <p>Deep summer ploughing exposes soil-borne pests to sunlight. Incorporate 5 tonnes of farmyard manure (FYM) per hectare before first showers.</p>
            </div>
            <div class="info-glass-card">
              <h4><i class="fa-solid fa-seedling text-success me-2"></i>Seed Treatment Protocol</h4>
              <p>Treat seeds with Trichoderma viride (10g/kg) and Rhizobium biofertilizer to protect against root rot and maximize nitrogen fixation.</p>
            </div>
            <div class="info-glass-card">
              <h4><i class="fa-solid fa-faucet-drip text-success me-2"></i>Micro-Irrigation Scheduling</h4>
              <p>Drip irrigation conserves up to 60% water while improving fertilizer efficiency by 40% through fertigation. Clean screen filters bi-weekly.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- SUBPAGE 4: HELPLINE & GRIEVANCE REDRESSAL               -->
      <!-- ======================================================= -->
      <div id="subpage-help" class="main-subpage">
        <div class="subpage-container">
          <div class="subpage-header">
            <h2>Farmer Helplines &amp; Grievance Redressal</h2>
            <p>24x7 toll-free official lines for technical, financial, and agronomic assistance.</p>
          </div>
          <div class="info-card-grid">
            <div class="info-glass-card">
              <h4><i class="fa-solid fa-phone-volume text-success me-2"></i>Raitha Vani (Karnataka)</h4>
              <p class="font-monospace text-success fw-bold fs-5">1800-425-3553</p>
              <p>Toll-free agricultural helpline for Karnataka farmers. Expert advice in Kannada on weather, pest management, and scheme subsidies.</p>
            </div>
            <div class="info-glass-card">
              <h4><i class="fa-solid fa-headset text-success me-2"></i>Kisan Call Center (National)</h4>
              <p class="font-monospace text-success fw-bold fs-5">1800-180-1551</p>
              <p>Pan-India 24x7 helpline operating in 22 languages for immediate resolution of agricultural and banking grievances.</p>
            </div>
            <div class="info-glass-card">
              <h4><i class="fa-solid fa-shield-halved text-success me-2"></i>PM-KISAN Direct Redressal</h4>
              <p class="font-monospace text-success fw-bold fs-5">155261 / 011-24300606</p>
              <p>Dedicated helpline for installment tracking, Aadhaar re-verification, and e-KYC error rectification.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- MOBILE BOTTOM NAVIGATION BAR                            -->
      <!-- ======================================================= -->
      <nav class="bottom-navbar">
        <button type="button" class="bottom-nav-item active" data-tab="home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span data-i18n="bottomHome">Home</span>
        </button>

        <button type="button" class="bottom-nav-item" data-tab="docs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <span data-i18n="bottomDocs">Documents</span>
        </button>

        <button type="button" class="bottom-nav-item" data-tab="tips">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span data-i18n="bottomTips">Agronomy</span>
        </button>

        <button type="button" class="bottom-nav-item" data-tab="help">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span data-i18n="bottomHelp">Helplines</span>
        </button>
      </nav>

    </section>

    <!-- ========================================================= -->
    <!-- MODAL 1: SCHEME DETAIL DOSSIER (17-Column Structure)     -->
    <!-- ========================================================= -->
    <div id="scheme-detail-modal" class="modal-backdrop">
      <div id="modal-overlay-bg" class="modal-overlay"></div>
      <div class="modal-sheet">
        <div class="modal-header">
          <div class="modal-title-col">
            <span id="modal-scheme-status-tag" class="scheme-badge badge-eligible-green">Statutory Eligible</span>
            <h2 id="modal-scheme-name" class="mt-2 mb-1" style="font-size:1.35rem;font-weight:800;">Scheme Title</h2>
            <div id="modal-scheme-dept" class="small text-muted font-monospace">Nodal Department / Ministry</div>
          </div>
          <button type="button" class="btn-close-modal" id="modal-close-btn" style="background:none;border:none;color:#ffffff;font-size:1.5rem;cursor:pointer;">✕</button>
        </div>

        <div class="modal-body-scroll">
          <!-- Benefit Highlight Box -->
          <div class="scheme-benefit-box mb-3">
            <div>
              <div class="benefit-lbl">Financial Entitlement / Subsidy</div>
              <div id="modal-scheme-benefit" class="benefit-val">₹0</div>
            </div>
            <div class="text-end font-monospace small text-muted" id="modal-scheme-disbursal">
              Direct Benefit Transfer (DBT)
            </div>
          </div>

          <!-- Description -->
          <div class="mb-3">
            <h4 class="text-success small fw-bold font-monospace text-uppercase mb-2">Scheme Summary</h4>
            <p id="modal-scheme-desc" class="text-secondary small" style="line-height:1.6;"></p>
          </div>

          <!-- Eligibility Criteria -->
          <div class="mb-3">
            <h4 class="text-success small fw-bold font-monospace text-uppercase mb-2">Statutory Eligibility Rules</h4>
            <div id="modal-eligibility-criteria" class="p-3 rounded-3" style="background:rgba(3,11,6,0.6); border:1px solid rgba(34,197,94,0.2);">
              <!-- Populated dynamically -->
            </div>
          </div>

          <!-- Mandatory Documents Checklist -->
          <div class="mb-3">
            <h4 class="text-success small fw-bold font-monospace text-uppercase mb-2">Mandatory Documents Checklist</h4>
            <div id="modal-doc-checklist" class="d-grid gap-2">
              <!-- Populated dynamically -->
            </div>
          </div>
        </div>

        <div class="modal-footer-actions">
          <button type="button" id="modal-btn-save" class="btn-hero-secondary btn-sm">
            <i class="fa-regular fa-bookmark me-1"></i>Save Scheme
          </button>
          <a href="#" target="_blank" id="modal-btn-apply" class="btn-hero-primary btn-sm">
            <i class="fa-solid fa-arrow-up-right-from-square me-1"></i>Official Portal Application
          </a>
        </div>
      </div>
    </div>

    <!-- ========================================================= -->
    <!-- MODAL 2: FARMER PROFILE DRAWER                            -->
    <!-- ========================================================= -->
    <div id="profile-drawer" class="drawer-container">
      <div id="drawer-overlay" class="drawer-overlay"></div>
      <div class="drawer-content">
        <div class="drawer-header">
          <div>
            <h3 class="m-0 fw-bold fs-5">Farmer Citizen Profile</h3>
            <span class="small text-muted font-monospace" id="drawerFarmerId">KM26@0001</span>
          </div>
          <button type="button" id="drawer-close-btn" style="background:none;border:none;color:#ffffff;font-size:1.4rem;cursor:pointer;">✕</button>
        </div>

        <div class="drawer-body">
          <div class="text-center py-3 mb-3 border-bottom border-secondary border-opacity-25">
            <div style="font-size:3.5rem;">👨‍🌾</div>
            <h4 id="drawerFarmerName" class="fw-bold mb-1">Ramesh Patil</h4>
            <div class="text-success small font-monospace" id="drawerFarmerLocation">Belagavi, Karnataka</div>
          </div>

          <div class="mb-3">
            <h5 class="text-success small font-monospace fw-bold text-uppercase mb-2">Citizen Agrarian Record</h5>
            <div class="d-grid gap-2" id="drawerDetailsGrid">
              <div class="p-2 rounded-2 d-flex justify-content-between small" style="background:rgba(3,11,6,0.6);border:1px solid rgba(34,197,94,0.18);">
                <span class="text-muted">Landholding:</span>
                <span class="fw-bold text-white" id="drawerLandArea">1.8 Hectares</span>
              </div>
              <div class="p-2 rounded-2 d-flex justify-content-between small" style="background:rgba(3,11,6,0.6);border:1px solid rgba(34,197,94,0.18);">
                <span class="text-muted">Farmer Category:</span>
                <span class="fw-bold text-white" id="drawerFarmerCategory">Small / Marginal</span>
              </div>
              <div class="p-2 rounded-2 d-flex justify-content-between small" style="background:rgba(3,11,6,0.6);border:1px solid rgba(34,197,94,0.18);">
                <span class="text-muted">Cultivated Crops:</span>
                <span class="fw-bold text-white" id="drawerCrops">Paddy, Sugarcane</span>
              </div>
              <div class="p-2 rounded-2 d-flex justify-content-between small" style="background:rgba(3,11,6,0.6);border:1px solid rgba(34,197,94,0.18);">
                <span class="text-muted">KCC Holder:</span>
                <span class="fw-bold text-success" id="drawerKccStatus">YES (Active)</span>
              </div>
            </div>
          </div>

          <div class="d-grid gap-2 mt-4">
            <a href="page-login.html" class="btn-hero-secondary text-center small">
              <i class="fa-solid fa-user-plus me-1"></i>Switch / Register Farmer
            </a>
            <button type="button" id="drawerLogoutBtn" class="btn-hero-secondary text-center text-danger small border-danger border-opacity-50">
              <i class="fa-solid fa-arrow-right-from-bracket me-1"></i>Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Scripts -->
  <script src="assets/libs/bootstrap/js/bootstrap.bundle.min.js"></script>
  <script src="js/translations.js"></script>
  <script src="js/mockData.js"></script>
  <script src="js/api.js"></script>
  <script src="js/speech.js"></script>
  <script src="assets/js/krishi_dashboard.js"></script>

  <script>
    // Theme toggle handler (Dark / Light)
    (function() {{
      const root = document.getElementById('htmlRoot');
      const btn = document.getElementById('themeToggleBtn');
      if (btn) {{
        btn.addEventListener('click', () => {{
          root.classList.toggle('lm');
          const isLight = root.classList.contains('lm');
          btn.innerHTML = isLight ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
          localStorage.setItem('km_theme', isLight ? 'light' : 'dark');
        }});
        if (localStorage.getItem('km_theme') === 'light') {{
          root.classList.add('lm');
          btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        }}
      }}
    }})();

    // Quick fill helper for demo login
    window.quickFillFarmer = function(id, pass) {{
      const userEl = document.getElementById('login-phone');
      const passEl = document.getElementById('login-password');
      if (userEl) userEl.value = id;
      if (passEl) passEl.value = pass;
    }};

    // Password toggle
    const togglePassBtn = document.getElementById('toggleLoginPassBtn');
    if (togglePassBtn) {{
      togglePassBtn.addEventListener('click', () => {{
        const passIn = document.getElementById('login-password');
        if (passIn.type === 'password') {{
          passIn.type = 'text';
          togglePassBtn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        }} else {{
          passIn.type = 'password';
          togglePassBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';
        }}
      }});
    }}

    // Subpage switcher for bottom navbar and top links
    window.switchSubpage = function(tabId) {{
      document.querySelectorAll('.main-subpage').forEach(el => el.classList.remove('active'));
      const target = document.getElementById('subpage-' + tabId);
      if (target) target.classList.add('active');

      document.querySelectorAll('.bottom-nav-item').forEach(btn => {{
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
      }});
      window.scrollTo({{ top: 0, behavior: 'smooth' }});
    }};

    document.querySelectorAll('.bottom-nav-item').forEach(btn => {{
      btn.addEventListener('click', () => {{
        const tab = btn.getAttribute('data-tab');
        if (tab) window.switchSubpage(tab);
      }});
    }});

    // Language toggle
    const langBtn = document.getElementById('globalLangToggle');
    if (langBtn) {{
      langBtn.addEventListener('click', () => {{
        const cur = langBtn.innerText.trim();
        if (cur.includes('ಕನ್ನಡ')) {{
          langBtn.innerHTML = '<span class="lang-text-display">English</span>';
          if (window.krishiDashboard && window.krishiDashboard.setLanguage) {{
            window.krishiDashboard.setLanguage('kn');
          }}
        }} else {{
          langBtn.innerHTML = '<span class="lang-text-display">ಕನ್ನಡ</span>';
          if (window.krishiDashboard && window.krishiDashboard.setLanguage) {{
            window.krishiDashboard.setLanguage('en');
          }}
        }}
      }});
    }}
  </script>
</body>
</html>
'''

with open("frontend/dashboard_app.html", "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Generated frontend/dashboard_app.html ({len(html_content)} bytes)")
