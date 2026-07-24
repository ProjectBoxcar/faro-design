@echo off
setlocal
REM Brand App Server Quickstart Script
REM Starts the dev server and displays access URLs for localhost, local network, and Tailscale

REM Always run relative to this script, even when opened from another directory.
pushd "%~dp0"
if errorlevel 1 (
    echo Error: Could not open the Brand App directory.
    pause
    exit /b 1
)

echo Brand App Server Quickstart
echo =============================
echo.

REM Check if we're in the right directory
if not exist "app\package.json" (
    echo Error: Please run this script from the Brand App root directory
    echo Expected to find app\package.json
    pause
    exit /b 1
)

REM Navigate to app directory
cd /d "app"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Error: npm install failed
        pause
        exit /b 1
    )
)

REM Check if database exists
if not exist "data\brand.db" (
    echo Database not found. Running migrations...
    call npm run db:migrate
    if errorlevel 1 (
        echo Error: Database migration failed
        pause
        exit /b 1
    )
)

REM Get network information for display
set LOCALHOST_IP=127.0.0.1

echo Starting full stack (Open Design + Brand App)...
echo.
echo Access URLs:
echo   Localhost:     http://%LOCALHOST_IP%:3100
echo   Local Network: Check your IP with ipconfig
echo   Tailscale:     Check your IP with tailscale ip -4
echo   Open Design:   http://127.0.0.1:7456  (auto-started for graphics)
echo.
echo Press Ctrl+C to stop Brand App (Open Design daemon may keep running)
echo.

powershell -NoProfile -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3100' -UseBasicParsing -TimeoutSec 3; if ($response.StatusCode -eq 200) { exit 0 } } catch { if ($_.Exception.Response) { exit 2 } }; if (Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue) { exit 2 }; exit 1" >nul 2>&1
set "SERVER_STATE=%ERRORLEVEL%"
if "%SERVER_STATE%"=="0" (
    echo Brand App is already running on port 3100.
    echo Opening http://localhost:3100 in your browser...
    start "" "http://localhost:3100"
    echo.
    echo Press any key to close this launcher. The existing server will keep running.
    pause >nul
    popd
    exit /b 0
)
if "%SERVER_STATE%"=="2" (
    echo Error: Port 3100 is occupied, but Brand App is not responding correctly.
    echo Close the old Brand App server terminal or restart Windows, then run this launcher again.
    echo.
    echo Press any key to close this window.
    pause >nul
    popd
    exit /b 1
)

REM Start the dev server
call npm run dev
set "SERVER_EXIT=%ERRORLEVEL%"
echo.
if not "%SERVER_EXIT%"=="0" (
    echo The server stopped with error code %SERVER_EXIT%.
) else (
    echo The server has stopped.
)
echo Review the message above, then press any key to close this window.
pause >nul
popd
exit /b %SERVER_EXIT%