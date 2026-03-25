@echo off
cd /d "%~dp0server"
echo Starting Invoice App...

start "" cmd /c node index.js
start "" http://localhost:3000
exit