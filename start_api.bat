@echo off
title Krishi Mitra API Gateway & Frontend (Port 8000)
echo ========================================================
echo Starting Krishi Mitra FastAPI Gateway & Spark Admin UI
echo Portal URL: http://127.0.0.1:8000/ui/index.html
echo API Docs:   http://127.0.0.1:8000/docs
echo ========================================================

cd /d "%~dp0"
call .venv\Scripts\uvicorn.exe backend.app:app --host 127.0.0.1 --port 8000 --reload

pause
