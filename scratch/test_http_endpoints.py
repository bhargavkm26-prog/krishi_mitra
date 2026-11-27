import urllib.request

endpoints = [
    "http://127.0.0.1:5000/index.html",
    "http://127.0.0.1:5000/page-login.html",
    "http://127.0.0.1:5000/dashboard_app.html",
    "http://127.0.0.1:5000/dashboard_app.html?farmer=KM26@0001",
    "http://127.0.0.1:8000/api/v1/database/farmers/profile/KM26@0001"
]

for url in endpoints:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f"OK ({resp.status}): {url} (Length: {len(resp.read())})")
    except Exception as e:
        print(f"FAILED: {url} -> {e}")
