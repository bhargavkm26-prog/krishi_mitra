with open('frontend/page-login.html', 'r', encoding='utf-8') as f:
    html = f.read()

idx = html.find('id="loginTabPane"')
print("=== LOGIN TAB PANE ===")
print(html[idx-100:idx+1500])
