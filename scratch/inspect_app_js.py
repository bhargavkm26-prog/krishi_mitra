with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

print("js/app.js length:", len(text))
import re
print("Functions in app.js:")
funcs = re.findall(r'(?:function\s+([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+)\s*:\s*function|([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)', text)
found = set()
for t in funcs:
    for name in t:
        if name and name not in found:
            found.add(name)
            if len(found) <= 30:
                print(" -", name)

# Check how view switching works
for line in text.splitlines():
    if 'showView' in line or 'switchView' in line or 'view-' in line or 'active' in line and 'classList' in line:
        print("View handling:", line.strip()[:100])
        break
