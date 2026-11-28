@echo off
setlocal EnableExtensions
title Krishi Mitra - Stop Services

echo ============================================================================
echo   Stopping Krishi Mitra Services (Ports 8000 ^& 8080)
echo ============================================================================

powershell -NoProfile -Command "$ports=@(8000,8080); foreach($p in $ports){ $conns=Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; if(-not $conns){ Write-Host ('[Port ' + $p + '] Not running.'); continue }; $pids=$conns | Select-Object -ExpandProperty OwningProcess -Unique; foreach($procId in $pids){ if($procId -gt 0){ $proc=Get-Process -Id $procId -ErrorAction SilentlyContinue; $pname=if($proc){$proc.ProcessName}else{'unknown'}; try{ Stop-Process -Id $procId -Force -ErrorAction Stop; Write-Host ('[Port ' + $p + '] Stopped PID ' + $procId + ' (' + $pname + ')') } catch { Write-Host ('[Port ' + $p + '] Failed to stop PID ' + $procId + ': ' + $_.Exception.Message) } } } }"

echo.
echo Done.
if /I not "%~1"=="--no-pause" pause
exit /b 0
