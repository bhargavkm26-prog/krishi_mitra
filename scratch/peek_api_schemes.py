with open('frontend/js/api.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('getSchemes(')
print(text[idx:idx+900])
