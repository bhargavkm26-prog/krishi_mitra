with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

lines = text.splitlines()
for idx, line in enumerate(lines):
    if any(k in line for k in ['async handleSendOtp', 'async init()', 'handleVerifyOtp']):
        print(f"Line {idx+1}: {line}")
