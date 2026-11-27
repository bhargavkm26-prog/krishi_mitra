with open('frontend/legacy_index.html', 'r', encoding='utf-8') as f:
    text = f.read()

# Print the exact text of each major section
import re
sections = [
    ('HEADER', r'(<header class="site-header">[\s\S]*?</header>)'),
    ('VIEW-LOGIN', r'(<section id="view-login"[\s\S]*?</section>)'),
    ('VIEW-WIZARD', r'(<section id="view-wizard"[\s\S]*?</section>)'),
    ('VIEW-MAIN-HERO', r'(<div class="hero-banner-container">[\s\S]*?</div>\s*</div>\s*</div>\s*</div>)'),
    ('BOTTOM-NAV', r'(<nav class="bottom-navbar">[\s\S]*?</nav>)'),
    ('MODALS', r'(<div id="scheme-detail-modal"[\s\S]*?)(?=<script|$)')
]

for name, pattern in sections:
    m = re.search(pattern, text)
    if m:
        print(f"=== {name} (Length: {len(m.group(1))}) ===")
        print(m.group(1)[:300] + "...\n")
    else:
        print(f"=== {name}: NOT FOUND ===")
