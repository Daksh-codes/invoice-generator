@echo off
setlocal

:: ===== CONFIG =====
set ROOT_DIR=%~dp0
set APP_DIR=%ROOT_DIR%App
set STAGING_DIR=%ROOT_DIR%staging\App
set SERVER_DIR=%APP_DIR%\server

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm-ss"') do set TIMESTAMP=%%I

echo.
echo ===== InvoiceDesk Updater =====
echo.

if not exist "%STAGING_DIR%" (
    echo Staged update not found. Update cannot proceed.
    pause
    exit /b
)

echo Waiting for app to close completely...
timeout /t 3 /nobreak >nul

echo Backing up current app version...
if exist "%APP_DIR%" (
    ren "%APP_DIR%" "App_backup_%TIMESTAMP%"
    if errorlevel 1 (
        echo Failed to back up current App folder. It may still be in use.
        echo Update aborted - nothing was changed.
        pause
        exit /b
    )
)

echo Installing new version...
move "%STAGING_DIR%" "%APP_DIR%"
if errorlevel 1 (
    echo Failed to move new app files into place.
    echo Restoring previous version...
    ren "%ROOT_DIR%App_backup_%TIMESTAMP%" "App"
    echo Rolled back. Update failed safely.
    pause
    exit /b
)

:: ===== INSTALL SERVER DEPENDENCIES (node_modules isn't shipped in the update zip) =====
echo Installing dependencies for the new version...
pushd "%SERVER_DIR%"
call npm install --production
if errorlevel 1 (
    popd
    echo.
    echo npm install failed. Rolling back to previous version...
    rd /s /q "%APP_DIR%"
    ren "%ROOT_DIR%App_backup_%TIMESTAMP%" "App"
    echo Rolled back. Update failed safely - previous version restored.
    pause
    exit /b
)
popd

rd /s /q "%ROOT_DIR%staging" 2>nul

echo.
echo Update installed successfully.
echo Restarting the app...
echo.

start "" "%ROOT_DIR%start.bat"
exit