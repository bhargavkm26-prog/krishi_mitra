with open("frontend/legacy_index.html", "r", encoding="utf-8") as f:
    text = f.read()

import re
m = re.search(r'<div class="hero-graphic-col">([\s\S]*?)</div>\s*</div>\s*</div>\s*<!-- ========================================================= -->', text)
if m:
    print("Hero graphic col content (length:", len(m.group(1)), "):")
    print(m.group(1)[:400])
