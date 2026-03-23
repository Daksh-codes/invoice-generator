@echo off
cd /d "%~dp0server"
echo Starting Invoice App...
start http://localhost:3000
node index.js