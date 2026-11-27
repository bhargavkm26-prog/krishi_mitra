with open('frontend/js/api.js', 'r', encoding='utf-8') as f:
    text = f.read()

for line in text.splitlines()[:60]:
    print(line)
