with open('frontend/js/api.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, l in enumerate(lines[30:80]):
    print(f"{i+31:3d}: {l.rstrip()}")
