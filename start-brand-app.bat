@echo off
REM Brand App Server Quickstart Script
REM Starts the dev server and displays access URLs for localhost, local network, and Tailscale

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
cd app

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

echo Starting Brand App development server...
echo.
echo Access URLs:
echo   Localhost:     http://%LOCALHOST_IP%:3100
echo   Local Network: Check your IP with ipconfig
echo   Tailscale:     Check your IP with tailscale ip -4
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the dev server
call npm run dev