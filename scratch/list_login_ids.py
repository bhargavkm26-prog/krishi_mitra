with open('frontend/page-login.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
ids = re.findall(r'id="([^"]+)"', html)
print("Total IDs in page-login.html:", len(ids))
print("IDs with 'login' or 'tab' or 'pane' or 'form':")
for i in ids:
    if any(k in i.lower() for k in ['login', 'tab', 'pane', 'form', 'step', 'user', 'pass']):
        print(" -", i)
