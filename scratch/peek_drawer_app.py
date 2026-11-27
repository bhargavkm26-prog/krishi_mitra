with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [line.strip() for line in text.splitlines() if 'profile-drawer' in line or 'drawer' in line]
for m in matches[:15]:
    print(m)
