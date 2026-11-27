with open('frontend/assets/js/krishi_dashboard.js', 'r', encoding='utf-8') as f:
    text = f.read()

print("krishi_dashboard.js length:", len(text))
for line in text.splitlines()[:50]:
    print(line)
