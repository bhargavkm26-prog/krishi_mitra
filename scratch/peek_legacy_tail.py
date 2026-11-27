with open('frontend/legacy_index.html', 'r', encoding='utf-8') as f:
    text = f.read()

print("Last 30 lines of legacy_index.html:")
for l in text.splitlines()[-30:]:
    print(l)
