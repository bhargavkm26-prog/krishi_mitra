with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('handleSendOtp()')
print(text[idx-50:idx+900])
