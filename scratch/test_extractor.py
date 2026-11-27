# -*- coding: utf-8 -*-
"""
Builder for frontend/dashboard_app.html
Uses the exact template structure, classes, IDs, and elements from frontend/legacy_index.html,
with colors matched to frontend/index.html (Obsidian Dark #030704, Emerald #22c55e, Cyan #06b6d4)
and wording in English matching Krishi Mitra Sovereign Agrarian Governance OS.
"""

import re

# Read legacy_index.html
with open("frontend/legacy_index.html", "r", encoding="utf-8") as f:
    legacy = f.read()

# Extract the tractor graphic SVG verbatim
tractor_m = re.search(r'(<svg viewBox="0 0 200 150" fill="none" class="hero-tractor-svg"[\s\S]*?</svg>)', legacy)
tractor_svg = tractor_m.group(1) if tractor_m else ""

# Extract the brand icon SVG verbatim
brand_svg_m = re.search(r'(<svg viewBox="0 0 36 36" fill="none" class="brand-icon-svg">[\s\S]*?</svg>)', legacy)
brand_svg = brand_svg_m.group(1) if brand_svg_m else ""

# Extract leaf SVG
leaf_svg_m = re.search(r'(<svg class="login-leaf-icon"[\s\S]*?</svg>)', legacy)
leaf_svg = leaf_svg_m.group(1) if leaf_svg_m else ""

print("SVGs extracted:", bool(tractor_svg), bool(brand_svg), bool(leaf_svg))
