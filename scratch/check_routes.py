with open('backend/routers/database_router.py', 'r', encoding='utf-8') as f:
    text = f.read()

import re
routes = re.findall(r'@router\.(?:get|post)\([\"\']([^\"\']+)[\"\']', text)
print("Routes in database_router.py:")
for r in routes:
    print(" -", r)
