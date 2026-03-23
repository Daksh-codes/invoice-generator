@echo off
set BACKUP_DIR=%USERPROFILE%\Desktop\InvoiceBackups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set dt=%%I
set TIMESTAMP=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%_%dt:~8,2%-%dt:~10,2%

set SOURCE=%~dp0server\data\app.db
set DEST=%BACKUP_DIR%\app_%TIMESTAMP%.db

copy /Y "%SOURCE%" "%DEST%"

if exist "%DEST%" (
    echo.
    echo Backup saved to: %DEST%
) else (
    echo.
    echo Backup FAILED - stop the server first then try again
)
echo.
pause