with open('frontend/js/app.js', 'r', encoding='utf-8') as f:
    text = f.read()

idx = text.find('renderAll() {')
if idx == -1:
    idx = text.find('renderAll(')
print(text[idx:idx+900])
