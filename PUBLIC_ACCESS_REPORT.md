# Krishi Mitra — On-Demand Public Website Access Report

## 1. Summary
Krishi Mitra can now be exposed to external users on **any network** over HTTPS on demand, while **PostgreSQL (`:5432`), BGE-M3, Gemma 4 (`:8080`), and FastAPI (`:8000`) remain running strictly on your laptop (`127.0.0.1`)**.  
Public access is **OFF by default** and is only live when you launch `go_public.bat`.

---

## 2. Changes Made (Zero Backend Changes)

### A. Same-Origin Frontend API Detection
Previously, frontend scripts checked `window.location.origin.includes(':8000')` and fell back to `http://127.0.0.1:8000`. That caused external visitors on HTTPS URLs (such as `https://*.trycloudflare.com`, which have no `:8000` in the URL) to attempt connecting to `127.0.0.1:8000` on their own device.

Updated all 5 frontend API base definitions to use `window.location.origin` whenever served over `http://` or `https://` (falling back to `http://127.0.0.1:8000` only for `file://` or separate local dev ports `5500`, `3000`, `5173`):

| File | Change |
| :--- | :--- |
| `frontend/js/api.js` | Updated `ApiService.BASE_URL` |
| `frontend/assets/js/api.js` | Updated `API_BASE` |
| `frontend/js/krishi-nexus.js` | Updated `KRISHI_API_BASE` |
| `frontend/js/kannada-layer.js` | Updated `API_BASE` |
| `frontend/ai_chat.html` | Updated inline `API_BASE` |

### B. Cloudflare Tunnel Installation & On-Demand Launchers
- Installed **`Cloudflare.cloudflared` v2026.11.2** via `winget` (`C:\Program Files (x86)\cloudflared\cloudflared.exe`).
- Created **`go_public.bat`** (project root):
  - Verifies local FastAPI (`http://127.0.0.1:8000/health`) is running.
  - Starts a temporary Cloudflare Tunnel (`cloudflared tunnel --url http://127.0.0.1:8000 --no-autoupdate`).
  - Prints the shareable HTTPS URL (`https://<random>.trycloudflare.com/ui/index.html`).
- Created **`stop_public.bat`** (project root):
  - Terminates `cloudflared.exe` immediately so the external HTTPS link goes offline while `http://127.0.0.1:8000/ui/index.html` stays running locally.

---

## 3. How to Use (Turn Public Access ON / OFF)

### Turn ON (Share with others)
1. Start your local Krishi Mitra stack as usual (`start_api.bat` / `run_all` so `:8000` and `:8080` are running).
2. Double-click **`go_public.bat`** in `d:\krisi mitra\`.
3. Wait ~5 seconds for Cloudflare to print a line like:
   ```text
   https://xxxx-yyyy-zzzz.trycloudflare.com
   ```
4. Share this link with others (works on mobile 4G/5G, other Wi-Fi networks, and desktops):
   ```text
   https://xxxx-yyyy-zzzz.trycloudflare.com/ui/index.html
   ```
   Direct page links also work:
   - Dashboard: `https://xxxx-yyyy-zzzz.trycloudflare.com/ui/dashboard_app.html`
   - Farmer Login: `https://xxxx-yyyy-zzzz.trycloudflare.com/ui/page-login.html`
   - AI Chat: `https://xxxx-yyyy-zzzz.trycloudflare.com/ui/ai_chat.html`

### Turn OFF (Make private again)
- Close the `go_public.bat` window **or** double-click **`stop_public.bat`**.
- The public link stops working immediately, and a fresh random URL is generated the next time you run `go_public.bat`.

---

## 4. Verification Results

| Check | Result |
| :--- | :--- |
| `node --check` (`api.js`, `assets/js/api.js`, `krishi-nexus.js`, `kannada-layer.js`) | Passed (0 errors) |
| `frontend_ui_audit.js` | **5 / 5 PASS** (`UI-01` through `UI-05`) |
| `tests/test_api_master_suite.py` | **19 / 19 PASS (100.0%)** |
| Live Cloudflare Tunnel HTTPS test (`/ui/index.html` & `/health`) | **200 OK** (`42,134` bytes HTML, health `200`, clean shutdown `True`) |
| `verify_kannada_all_pages.py` (Headless Chromium CDP) | `js_exceptions_count: 0`, `overflow: false` across all 4 pages (desktop & `390px` mobile), modal & AI chat Kannada translation + English restore verified |
