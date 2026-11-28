@echo off
title Krishi Mitra — Public Access Tunnel (ON)
color 0A
cd /d "%~dp0"

echo ============================================================================
echo   KRISHI MITRA — ON-DEMAND PUBLIC ACCESS (CLOUDFLARE TUNNEL)
echo ============================================================================
echo.
echo [1/3] Checking local FastAPI gateway (http://127.0.0.1:8000)...
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 3; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel% neq 0 (
  echo [WARN] Local FastAPI ^(:8000^) is not responding yet!
  echo        Please start your local stack first ^(e.g. start_api.bat / run_all^).
  echo.
  pause
  exit /b 1
)
echo [OK] Local FastAPI ^(:8000^) is LIVE.
echo.

echo [2/3] Locating cloudflared...
set "CF_BIN="
where cloudflared >nul 2>&1
if %errorlevel% equ 0 set "CF_BIN=cloudflared"
if not defined CF_BIN if exist "%ProgramFiles%\cloudflared\cloudflared.exe" set "CF_BIN=%ProgramFiles%\cloudflared\cloudflared.exe"
if not defined CF_BIN if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" set "CF_BIN=%ProgramFiles(x86)%\cloudflared\cloudflared.exe"

if not defined CF_BIN (
  echo [ERROR] cloudflared not found. Install it with:
  echo         winget install --id Cloudflare.cloudflared -e
  pause
  exit /b 1
)
echo [OK] Using: %CF_BIN%
echo.

echo [3/3] Starting temporary HTTPS tunnel to http://127.0.0.1:8000 ...
echo ----------------------------------------------------------------------------
echo   Wait ~5 seconds. Your REAL shareable link will appear below AND be
echo   copied to your clipboard automatically!
echo   To turn OFF public access anytime: close this window or run stop_public.bat
echo ----------------------------------------------------------------------------
echo.

powershell -NoProfile -Command "& '%CF_BIN%' tunnel --url http://127.0.0.1:8000 --no-autoupdate 2>&1 | ForEach-Object { $_; if ($_ -match 'https://[a-z0-9-]+\.trycloudflare\.com') { $fullUrl = $Matches[0] + '/ui/index.html'; try { Set-Clipboard -Value $fullUrl } catch {}; Write-Host ''; Write-Host '============================================================================' -ForegroundColor Green; Write-Host '  PUBLIC LINK READY (COPIED TO CLIPBOARD!):' -ForegroundColor Green; Write-Host ('  ' + $fullUrl) -ForegroundColor Yellow; Write-Host '============================================================================' -ForegroundColor Green; Write-Host '' } }"
pause
