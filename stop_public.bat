@echo off
title Krishi Mitra — Stop Public Access Tunnel (OFF)
color 0C
echo ============================================================================
echo   KRISHI MITRA — TURNING OFF PUBLIC ACCESS
echo ============================================================================
echo.
taskkill /IM cloudflared.exe /F >nul 2>&1
if %errorlevel% equ 0 (
  echo [OK] Public Cloudflare Tunnel stopped. External link is now OFFLINE.
) else (
  echo [INFO] No active cloudflared tunnel was running.
)
echo [INFO] Your local site at http://127.0.0.1:8000/frontend/index.html remains private.
echo.
pause
