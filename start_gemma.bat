@echo off
title Gemma 4 E4B Reasoning Server (Port 8080)
echo ========================================================
echo Starting Local Gemma 4 E4B Server on http://127.0.0.1:8080
echo Model: C:\AI\models\gemma4\gemma-4-E4B-it-Q4_0.gguf
echo GPU Offload: 99 layers (RTX 5060)
echo Context Size: 8192
echo ========================================================

"C:\AI\llama.cpp-gemma\llama-server.exe" --model "C:\AI\models\gemma4\gemma-4-E4B-it-Q4_0.gguf" --ctx-size 8192 --parallel 1 --n-gpu-layers 99 --jinja --reasoning off --temp 0.3 --top-p 0.85 --top-k 40 --repeat-last-n 128 --repeat-penalty 1.15 --host 127.0.0.1 --port 8080

pause
