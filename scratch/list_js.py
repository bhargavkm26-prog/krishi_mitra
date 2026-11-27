import os

for f in os.listdir('frontend/js'):
    p = os.path.join('frontend/js', f)
    print(f"{f}: {os.path.getsize(p)} bytes")
