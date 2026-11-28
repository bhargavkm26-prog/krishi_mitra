@echo off
setlocal EnableExtensions
title Krishi Mitra - Full-Stack Launcher

cd /d "%~dp0"

set "OPEN_BROWSER=1"
set "DO_PAUSE=1"
:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--no-browser" set "OPEN_BROWSER=0"
if /I "%~1"=="--no-pause" set "DO_PAUSE=0"
shift
goto parse_args
:args_done

echo ============================================================================
echo   KRISHI MITRA - Sovereign Agrarian Intelligence ^& Governance OS
echo   Unified Startup Launcher (PostgreSQL + Gemma 4 + FastAPI + Frontend)
echo ============================================================================
echo.

REM ---------------------------------------------------------------------------
REM [1/5] Check .env configuration and Python virtual environment
REM ---------------------------------------------------------------------------
echo [1/5] Checking workspace, .env, and Python virtual environment...
if not exist "%~dp0.env" goto err_missing_env
if not exist "%~dp0.venv\Scripts\python.exe" goto err_missing_venv
if not exist "%~dp0.venv\Scripts\uvicorn.exe" goto err_missing_uvicorn

"%~dp0.venv\Scripts\python.exe" -c "import importlib.util, fastapi, uvicorn, psycopg2, dotenv; assert all(importlib.util.find_spec(m) is not None for m in 'torch sentence_transformers'.split())" >nul 2>&1
if errorlevel 1 goto err_missing_pkgs
echo       [OK] Python .venv and core dependencies verified.

REM ---------------------------------------------------------------------------
REM [2/5] Verify PostgreSQL database connectivity (auto-start service if needed)
REM ---------------------------------------------------------------------------
echo.
echo [2/5] Checking PostgreSQL database connection...
"%~dp0.venv\Scripts\python.exe" -c "from backend.database.connection import get_connection; c=get_connection(); cur=c.cursor(); cur.execute('SELECT count(*) FROM public.schemes;'); n=cur.fetchone()[0]; c.close(); print(f'      [OK] PostgreSQL connected ({n} statutory schemes indexed).')" 2>nul
if not errorlevel 1 goto pg_ready

echo       PostgreSQL not reachable yet. Checking Windows PostgreSQL service...
powershell -NoProfile -Command "Get-Service *postgres* -ErrorAction SilentlyContinue | Where-Object { $_.Status -ne 'Running' } | ForEach-Object { try { Start-Service $_.Name -ErrorAction Stop; Write-Host ('      Started Windows service: ' + $_.Name) } catch { Write-Host ('      [WARN] Could not auto-start service ' + $_.Name + ': ' + $_.Exception.Message) } }"
timeout /t 2 /nobreak >nul

"%~dp0.venv\Scripts\python.exe" -c "from backend.database.connection import get_connection; c=get_connection(); cur=c.cursor(); cur.execute('SELECT count(*) FROM public.schemes;'); n=cur.fetchone()[0]; c.close(); print(f'      [OK] PostgreSQL connected ({n} statutory schemes indexed).')"
if errorlevel 1 goto err_postgres

:pg_ready
REM ---------------------------------------------------------------------------
REM [3/5] Check / Start Gemma 4 E4B llama-server on Port 8080
REM ---------------------------------------------------------------------------
echo.
echo [3/5] Checking Gemma 4 E4B Reasoning Server (http://127.0.0.1:8080)...
"%~dp0.venv\Scripts\python.exe" -c "import urllib.request, sys; r=urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=2); sys.exit(0 if r.status==200 else 1)" >nul 2>&1
if not errorlevel 1 (
    echo       [OK] Gemma 4 Server already running on port 8080.
    goto gemma_ready
)

if not exist "C:\AI\llama.cpp-gemma\llama-server.exe" goto err_missing_llama
if not exist "C:\AI\models\gemma4\gemma-4-E4B-it-Q4_0.gguf" goto err_missing_model

echo       Launching Gemma 4 E4B server window...
start "Krishi Mitra - Gemma 4 Server (:8080)" cmd /k call "%~dp0start_gemma.bat"

echo       Waiting for Gemma 4 server (:8080) to become ready (up to 60s)...
powershell -NoProfile -Command "$ready=$false; for($i=0;$i -lt 60;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:8080/health'; if($r.StatusCode -eq 200){ $ready=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if($ready){ Write-Host '      [OK] Gemma 4 Server is live on port 8080.' } else { Write-Host '      [WARN] Gemma 4 Server still loading model weights on :8080; continuing API startup.' }"

:gemma_ready
REM ---------------------------------------------------------------------------
REM [4/5] Check / Start FastAPI Gateway + BGE-M3 + Frontend UI on Port 8000
REM ---------------------------------------------------------------------------
echo.
echo [4/5] Checking FastAPI Gateway ^& Frontend UI (http://127.0.0.1:8000)...
"%~dp0.venv\Scripts\python.exe" -c "import urllib.request, sys; r=urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2); sys.exit(0 if r.status==200 else 1)" >nul 2>&1
if not errorlevel 1 (
    echo       [OK] FastAPI Gateway ^& Frontend already running on port 8000.
    goto api_ready
)

echo       Launching FastAPI + Frontend window (initializes BGE-M3 on GPU + mounts /ui)...
start "Krishi Mitra - API & Frontend (:8000)" cmd /k call "%~dp0start_api.bat"

echo       Waiting for FastAPI Gateway + BGE-M3 (:8000) to become ready (up to 60s)...
powershell -NoProfile -Command "$ready=$false; for($i=0;$i -lt 60;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 'http://127.0.0.1:8000/health'; if($r.StatusCode -eq 200){ $ready=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if($ready){ Write-Host '      [OK] FastAPI Gateway & Frontend UI are live on port 8000.'; exit 0 } else { Write-Host '      [ERROR] FastAPI Gateway did not respond on :8000 within 60s. Check the API window logs.'; exit 1 }"
if errorlevel 1 goto fail_exit

:api_ready
REM ---------------------------------------------------------------------------
REM [5/5] Verify consolidated subsystem health & open Portal UI
REM ---------------------------------------------------------------------------
echo.
echo [5/5] Verifying live system telemetry...
"%~dp0.venv\Scripts\python.exe" -c "import json, urllib.request; d=json.loads(urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5).read().decode()); s=d.get('subsystems',{}); pg=s.get('postgresql_pgvector',{}); bge=s.get('bge_m3_embedding_engine',{}); gem=s.get('gemma_4_e4b_reasoning_server',{}); print('      Overall Status :', d.get('status')); print('      PostgreSQL     :', 'ONLINE' if pg.get('healthy') else 'OFFLINE', '| Schemes:', pg.get('schemes_indexed')); print('      BGE-M3 Engine  :', bge.get('device'), '|', bge.get('gpu_name'), '|', bge.get('precision')); print('      Gemma 4 Server :', 'ONLINE' if gem.get('healthy') else 'LOADING/OFFLINE', '|', gem.get('server_url'))"

echo.
echo ============================================================================
echo   ALL KRISHI MITRA SERVICES STARTED
echo   - Home Portal   : http://127.0.0.1:8000/ui/index.html
echo   - Farmer Portal : http://127.0.0.1:8000/ui/dashboard_app.html
echo   - KrishiMitra AI: http://127.0.0.1:8000/ui/ai_chat.html
echo   - Swagger Docs  : http://127.0.0.1:8000/docs
echo   - Gemma Server  : http://127.0.0.1:8080
echo   Tip: Run stop_project.bat to cleanly stop Ports 8000 ^& 8080.
echo ============================================================================
echo.

if "%OPEN_BROWSER%"=="1" start "" "http://127.0.0.1:8000/ui/index.html"
if "%DO_PAUSE%"=="1" pause
exit /b 0

:err_missing_env
echo [ERROR] Missing .env file in "%~dp0". Copy .env.example to .env and configure DATABASE_URL.
goto fail_exit

:err_missing_venv
echo [ERROR] Missing Python virtual environment at ".venv\Scripts\python.exe".
goto fail_exit

:err_missing_uvicorn
echo [ERROR] Missing uvicorn inside ".venv\Scripts\uvicorn.exe".
goto fail_exit

:err_missing_pkgs
echo [ERROR] Required Python packages (fastapi, uvicorn, psycopg2, dotenv, torch, sentence_transformers) failed to import in .venv.
goto fail_exit

:err_postgres
echo [ERROR] PostgreSQL database is offline or .env DATABASE_URL is invalid.
goto fail_exit

:err_missing_llama
echo [ERROR] Gemma server binary not found: C:\AI\llama.cpp-gemma\llama-server.exe
goto fail_exit

:err_missing_model
echo [ERROR] Gemma 4 model file not found: C:\AI\models\gemma4\gemma-4-E4B-it-Q4_0.gguf
goto fail_exit

:fail_exit
echo.
echo Startup aborted. Fix the error above and re-run run_project.bat.
if "%DO_PAUSE%"=="1" pause
exit /b 1
