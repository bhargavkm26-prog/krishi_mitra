import re

with open('nexusai_template/index.html', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
for idx, line in enumerate(lines):
    if re.search(r'<(section|header|footer|nav|h1|h2)', line, re.IGNORECASE):
        print(f"L{idx+1}: {line.strip()[:100]}")
