with open('frontend/assets/js/auth.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [line.strip() for line in text.splitlines() if 'dashboard' in line or 'window.location' in line]
for m in matches:
    print(m)
