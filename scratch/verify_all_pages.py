import os
import re
from html.parser import HTMLParser

class DOMValidator(HTMLParser):
    def __init__(self, filename):
        super().__init__()
        self.filename = filename
        self.ids = set()
        self.duplicate_ids = []
        self.stack = []
        self.self_closing = {'input', 'img', 'br', 'hr', 'meta', 'link', 'source', 'path', 'circle', 'line', 'polyline', 'rect'}
    
    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        el_id = attr_dict.get('id')
        if el_id:
            if el_id in self.ids:
                self.duplicate_ids.append(el_id)
            self.ids.add(el_id)
        if tag not in self.self_closing:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in self.stack:
            while self.stack and self.stack[-1] != tag:
                self.stack.pop()
            if self.stack:
                self.stack.pop()

for fname in ['frontend/dashboard_app.html', 'frontend/page-login.html']:
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    val = DOMValidator(fname)
    val.feed(content)
    print(f"=== {fname} ===")
    print(f"Total IDs: {len(val.ids)}")
    print(f"Duplicate IDs: {len(val.duplicate_ids)} {val.duplicate_ids}")
    print(f"Unclosed tags in stack: {len(val.stack)} {val.stack}")

    # Check for raw 'SQL NULL' text
    sql_nulls = [line.strip() for line in content.splitlines() if 'SQL NULL' in line]
    print(f"Contains 'SQL NULL': {len(sql_nulls)}")
