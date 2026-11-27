with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
idx = text.find('btn-send-otp')
print("=== btn-send-otp handling in app.js ===")
print(text[idx-100:idx+800])
