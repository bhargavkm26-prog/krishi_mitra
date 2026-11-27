with open('frontend/dashboard_app.html', 'r', encoding='utf-8') as f:
    dash = f.read()

import re
print("Length of dashboard_app.html:", len(dash))
print("First 500 chars:")
print(dash[:500])
print("\nKey structural elements:")
for m in re.finditer(r'<(section|header|nav|div|main)\s+([^>]{0,120})>', dash):
    tag = m.group(1)
    attrs = m.group(2)
    if any(k in attrs for k in ['id="view', 'class="site-header', 'class="hero', 'class="discover', 'class="schemes', 'id="subpage', 'id="auth', 'id="login']):
        print(f"<{tag} {attrs}>")
