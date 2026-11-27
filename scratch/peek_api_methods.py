with open('frontend/js/api.js', 'r', encoding='utf-8') as f:
    text = f.read()

print("api.js length:", len(text))
import re
print("ApiService methods:")
methods = re.findall(r'(\basync\s+([a-zA-Z0-9_]+)\s*\([^)]*\)|\b([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{)', text)
for m in methods[:25]:
    name = m[1] or m[2]
    if name and not name.startswith('_'):
        print(" -", name)
