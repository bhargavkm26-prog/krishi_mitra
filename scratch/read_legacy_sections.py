with open('frontend/legacy_index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
# Print major section line numbers
import re
for idx, line in enumerate(lines):
    if any(k in line for k in ['<header', '<section', '</section>', '<main', '<nav class="bottom-navbar"', '<div id="scheme-detail-modal"', '<div id="profile-drawer"', '<div id="edit-profile-modal"', '<div id="login-help-modal"', '<script']):
        print(f"Line {idx+1:4d}: {line.strip()[:100]}")
