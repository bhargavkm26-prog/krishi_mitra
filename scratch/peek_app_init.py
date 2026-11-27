with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines[20:120]):
    print(f"{i+21:3d}: {l.rstrip()}")
