# Python script to build frontend/dashboard_app.html matching legacy_index.html template exactly
# with colors and wording adapted to index.html

import re

# Read legacy_index.html to ensure 100% template fidelity
with open("frontend/legacy_index.html", "r", encoding="utf-8") as f:
    legacy_code = f.read()

# Let's extract key SVG graphics from legacy_index.html so we preserve them with 100% fidelity:
# 1. Brand logo SVG
brand_svg_m = re.search(r'(<svg viewBox="0 0 36 36" fill="none" class="brand-icon-svg">[\s\S]*?</svg>)', legacy_code)
brand_svg = brand_svg_m.group(1) if brand_svg_m else ""

# 2. Tractor graphic SVG
tractor_svg_m = re.search(r'(<svg class="tractor-art-svg" viewBox="0 0 300 180" fill="none"[\s\S]*?</svg>)', legacy_code)
tractor_svg = tractor_svg_m.group(1) if tractor_svg_m else ""

# 3. Leaf icon in login top bar
leaf_svg_m = re.search(r'(<svg class="login-leaf-icon"[\s\S]*?</svg>)', legacy_code)
leaf_svg = leaf_svg_m.group(1) if leaf_svg_m else ""

print("Found SVGs:", bool(brand_svg), bool(tractor_svg), bool(leaf_svg))
