with open('frontend/css/style.css', 'r', encoding='utf-8') as f:
    style = f.read()

import re
m = re.search(r'(\.login-fullscreen-hero[\s\S]{1,600})', style)
if m:
    print(m.group(1)[:500])

print("\n--- login-card-box ---")
m2 = re.search(r'(\.login-card-box[\s\S]{1,600})', style)
if m2:
    print(m2.group(1)[:500])
