with open('frontend/dashboard_app.html', 'r', encoding='utf-8') as f:
    text = f.read()

print(".modal-backdrop.open in text:", ".modal-backdrop.open" in text)
print(".drawer-container.open in text:", ".drawer-container.open" in text)
