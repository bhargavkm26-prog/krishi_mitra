with open('frontend/css/krishi-nexus.css', 'r', encoding='utf-8') as f:
    text = f.read()

import re
root_m = re.search(r':root\s*\{([^}]+)\}', text)
if root_m:
    print("=== krishi-nexus.css :root ===")
    print(root_m.group(1))

# Also print .lm (light mode)
lm_m = re.search(r'(\.lm\s*\{[^}]+\})', text)
if lm_m:
    print("=== krishi-nexus.css .lm ===")
    print(lm_m.group(1))
