with open('frontend/css/style.css', 'r', encoding='utf-8') as f:
    text = f.read()

import re
m = re.findall(r'(\.view-container[^{]*\{[^}]+\})', text)
for r in m:
    print(r)
