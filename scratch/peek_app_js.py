with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

for line in text.splitlines()[:50]:
    print(line)
