import re

with open("frontend/legacy_index.html", "r", encoding="utf-8") as f:
    legacy_html = f.read()

print("=== LEGACY_INDEX.HTML STRUCTURE ===")
print("Total length:", len(legacy_html))
for m in re.finditer(r'<(section|header|nav|div|main)\s+([^>]{0,120})>', legacy_html):
    tag = m.group(1)
    attrs = m.group(2)
    if any(k in attrs for k in ['id="view', 'id="subpage', 'class="site-header', 'class="login', 'class="hero', 'class="discover', 'class="schemes', 'class="bottom-navbar', 'modal', 'drawer', 'ticker']):
        print(f"<{tag} {attrs}>")
