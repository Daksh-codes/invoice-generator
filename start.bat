@echo off
cd /d "%~dp0App\server"
echo Starting Invoice App...

start "" cmd /c node index.js
for /f %%A in ('powershell -NoProfile -Command "$configPath = if (Test-Path '..\config.json') { '..\config.json' } else { '..\config.example.json' }; (Get-Content $configPath | ConvertFrom-Json).port"') do set PORT=%%A
if "%PORT%"=="" set PORT=3000
start "" http://localhost:%PORT%
exit
