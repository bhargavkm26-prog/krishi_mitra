with open('frontend/page-login.html', 'r', encoding='utf-8') as f:
    text = f.read()

print("Length:", len(text))
import re
# Check for any layout or style bottlenecks
for m in re.finditer(r'<style>([\s\S]*?)</style>', text):
    s = m.group(1)
    for line in s.splitlines():
        if any(k in line for k in ['background', 'max-width', 'padding', 'margin', 'display']):
            if len(line.strip()) < 80:
                print("CSS:", line.strip())
