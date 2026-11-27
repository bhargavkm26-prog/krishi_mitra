with open('frontend/css/style.css', 'r', encoding='utf-8') as f:
    style = f.read()

import re
root_match = re.search(r':root\s*\{([^}]+)\}', style)
if root_match:
    print("=== style.css :root variables ===")
    print(root_match.group(1))

# Check background images or gradients in style.css
for line in style.splitlines():
    if any(k in line for k in ['background:', 'background-color:', 'background-image:']) and any(c in line for c in ['hero', 'view-login', 'site-header', 'card']):
        print(line[:80])
