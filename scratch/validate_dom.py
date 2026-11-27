import os
import re
from collections import Counter
from html.parser import HTMLParser

DASH_PATH = r"d:\krisi mitra\frontend\dashboard_app.html"
with open(DASH_PATH, "r", encoding="utf-8") as f:
    content = f.read()

ids = re.findall(r'id="([^"]+)"', content)
dupes = {k: v for k, v in Counter(ids).items() if v > 1}

required = [
    "view-login", "view-wizard", "view-main",
    "login-phone", "login-password", "phone-error-msg",
    "otp-step-container", "phone-step-container", "otp-sent-phone", "login-otp", "otp-error-msg",
    "btn-send-otp", "btn-verify-otp", "btn-change-number", "demo-otp-btn", "btn-login-signup",
    "wizard-q-title", "wizard-q-sub", "wizard-step-label", "wizard-progress-bar",
    "wizard-mic-btn", "voice-status-text", "voice-confirm-box", "voice-heard-text",
    "voice-btn-confirm", "voice-btn-retry", "wizard-options-container",
    "wizard-back-btn", "wizard-next-btn",
    "top-nav-eligible", "top-nav-almost", "top-nav-saved",
    "badge-top-eligible", "badge-top-almost", "badge-top-saved",
    "badge-tab-eligible", "badge-tab-almost", "badge-tab-saved",
    "btn-top-profile", "btn-mobile-profile", "brand-home-click",
    "btn-hero-explore", "btn-hero-share",
    "btn-discover-search", "scheme-search-input", "scheme-category-select", "schemes-sort-select",
    "tips-ticker-strip", "ticker-tip-tag", "ticker-tip-title", "ticker-pause-tag", "ticker-dots-container",
    "schemes-list-container", "schemes-empty-state",
    "subpage-home", "subpage-docs", "subpage-tips", "subpage-help",
    "docs-list-container", "tips-full-list",
    "offline-alert-bar",
    "scheme-detail-modal", "modal-overlay-bg", "modal-btn-close", "modal-scheme-status-tag",
    "modal-scheme-title", "modal-scheme-dept", "modal-scheme-benefit", "modal-doc-checklist",
    "modal-steps-list", "modal-btn-go-site", "modal-btn-mark-applied",
    "profile-drawer", "drawer-overlay", "btn-close-drawer", "profile-drawer-phone",
    "profile-drawer-summary", "btn-edit-profile-menu", "btn-logout-menu", "btn-delete-data-menu",
    "edit-profile-modal", "btn-close-edit-modal", "edit-profile-fields", "btn-save-edit-profile",
    "login-help-modal", "login-help-modal-overlay", "btn-close-login-help", "btn-close-login-help-action",
    "btn-login-help",
]
missing = [rid for rid in required if rid not in ids]

scripts = re.findall(r"<script[^>]*>", content)
script_srcs = re.findall(r'<script[^>]*src="([^"]+)"', content)
styles = re.findall(r"<style[^>]*>(.*?)</style>", content, re.S)
css_open = sum(s.count("{") for s in styles)
css_close = sum(s.count("}") for s in styles)
bad_refs = [x for x in ["bootstrap.bundle.min.js", "krishi_dashboard.js", "SQL NULL", "bootstrap.min.css"] if x in content]

VOID_TAGS = {"meta", "link", "input", "br", "hr", "img", "path", "circle", "line", "polyline", "rect", "polygon"}
class TagBalanceChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
    def handle_starttag(self, tag, attrs):
        if tag.lower() not in VOID_TAGS:
            self.stack.append(tag.lower())
    def handle_endtag(self, tag):
        t = tag.lower()
        if t in VOID_TAGS:
            return
        if not self.stack or self.stack[-1] != t:
            self.errors.append(f"Mismatch endtag </{t}> vs stack top {self.stack[-1] if self.stack else 'EMPTY'}")
        else:
            self.stack.pop()

parser = TagBalanceChecker()
parser.feed(content)

print("FILE_SIZE:", os.path.getsize(DASH_PATH), "LINES:", content.count("\n") + 1)
print("TOTAL_IDS:", len(ids), "DUPES:", dupes or "NONE", "MISSING:", missing or "NONE")
print("SCRIPT_TAGS:", len(scripts), "SRCS:", script_srcs)
print("CSS_BRACES:", css_open, "==", css_close)
print("BAD_REFS:", bad_refs or "NONE")
print("HTML_TAG_ERRORS:", parser.errors or "NONE", "UNCLOSED:", parser.stack or "NONE")

inline_scripts = re.findall(r"<script(?![^>]*src=)[^>]*>(.*?)</script>", content, re.S)
with open(r"d:\krisi mitra\scratch\inline_dash.js", "w", encoding="utf-8") as f:
    f.write("\n".join(inline_scripts))
print("INLINE_JS_EXTRACTED_OK")
