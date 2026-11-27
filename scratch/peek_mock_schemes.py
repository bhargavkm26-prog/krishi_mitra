with open('frontend/js/mockData.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
schemes_m = re.findall(r'id:\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]', text)
print("Total schemes in mockData.js:", len(schemes_m), schemes_m[:10])

# Check categories
cats = re.findall(r'category:\s*[\x22\x27]([^\x22\x27]+)[\x22\x27]', text)
print("Categories in mockData.js:", set(cats))
