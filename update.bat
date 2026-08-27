@echo off
setlocal

:: ===== CONFIG =====
set ROOT_DIR=%~dp0
set APP_DIR=%ROOT_DIR%App
set STAGING_DIR=%ROOT_DIR%staging\App
set BACKUP_APP_DIR=%ROOT_DIR%App_backup

:: ===== TIMESTAMP for backup folder =====
for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set TIMESTAMP=%%I

echo.
echo ===== Invoice App Updater =====
echo.

:: ===== VALIDATION =====
if not exist "%STAGING_DIR%" (
    echo Staged update not found at:
    echo %STAGING_DIR%
    echo Update cannot proceed.
    pause
    exit /b
)

:: ===== WAIT for server to fully release files =====
echo Waiting for app to close completely...
timeout /t 3 /nobreak >nul

:: ===== BACKUP current App folder before touching anything =====
echo Backing up current app version...
if exist "%APP_DIR%" (
    ren "%APP_DIR%" "App_backup_%TIMESTAMP%"
    if errorlevel 1 (
        echo Failed to back up current App folder. It may still be in use.
        echo Update aborted - nothing was changed.
        pause
        exit /b
    )
) else (
    echo Warning: no existing App folder found to back up.
)

:: ===== MOVE staged new version into place =====
echo Installing new version...
move "%STAGING_DIR%" "%APP_DIR%"
if errorlevel 1 (
    echo Failed to move new app files into place.
    echo Attempting to restore previous version...
    ren "%ROOT_DIR%App_backup_%TIMESTAMP%" "App"
    echo Rolled back to previous version. Update failed safely.
    pause
    exit /b
)

:: ===== CLEAN UP staging parent folder =====
rd /s /q "%ROOT_DIR%staging" 2>nul

echo.
echo Update installed successfully.
echo Restarting the app...
echo.

:: ===== RESTART THE APP =====
start "" "%ROOT_DIR%start.bat"

exit