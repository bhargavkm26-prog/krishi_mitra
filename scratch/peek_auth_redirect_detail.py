with open('frontend/assets/js/auth.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('window.location.href =')
print(text[idx-200:idx+300])
