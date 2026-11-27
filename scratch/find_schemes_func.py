with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.findall(r'([a-zA-Z0-9_]+Schemes[a-zA-Z0-9_]*\s*\([^)]*\))', text)
print("Scheme functions in app.js:", set(matches))

idx = text.find('schemes-list-container')
if idx != -1:
    print("schemes-list-container usage:")
    print(text[idx-50:idx+400])
