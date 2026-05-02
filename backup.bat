@echo off
setlocal

:: ===== CONFIG =====
set SQLITE_EXE=%~dp0sqlite3.exe
set SOURCE=%~dp0server\data\app.db
set BACKUP_DIR=%USERPROFILE%\Desktop\InvoiceBackups

:: ===== CREATE BACKUP DIR =====
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: ===== TIMESTAMP =====
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set TIMESTAMP=%%I

set DEST=%BACKUP_DIR%\app_%TIMESTAMP%.db

:: ===== VALIDATION =====
if not exist "%SQLITE_EXE%" (
    echo sqlite3.exe not found. Put it next to this .bat file.
    pause
    exit /b
)

if not exist "%SOURCE%" (
    echo Database not found: %SOURCE%
    pause
    exit /b
)

:: ===== SAFE BACKUP (handles WAL automatically) =====
"%SQLITE_EXE%" "%SOURCE%" ".backup '%DEST%'"

:: ===== RESULT =====
if exist "%DEST%" (
    echo.
    echo ✅ Backup successful:
    echo %DEST%
) else (
    echo.
    echo ❌ Backup failed
)

echo.
pause