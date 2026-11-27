with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

print("Last 20 lines of js/app.js:")
for l in text.splitlines()[-20:]:
    print(l)
