with open('frontend/js/mockData.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('schemes:')
print(text[idx:idx+1500])
