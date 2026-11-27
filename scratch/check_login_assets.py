with open('frontend/page-login.html', 'r', encoding='utf-8') as f:
    login_html = f.read()

print("Login HTML length:", len(login_html))
# Check links and scripts
import re
links = re.findall(r'<link[^>]+href="([^"]+)"', login_html)
scripts = re.findall(r'<script[^>]+src="([^"]+)"', login_html)
print("Links:", links)
print("Scripts:", scripts)

# Check if any css files or js files are missing
import os
for href in links + scripts:
    clean = href.split('?')[0]
    full = os.path.join('frontend', clean)
    print(f"{clean}: exists={os.path.exists(full)}")
