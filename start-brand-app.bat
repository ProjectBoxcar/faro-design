@echo off
setlocal EnableExtensions
REM Faro Design / Brand App — double-click quick start
REM Starts Open Design + Next.js on :3100 and opens the browser.

pushd "%~dp0"
if errorlevel 1 (
    echo Error: Could not open the Faro Design directory.
    pause
    exit /b 1
)

echo.
echo  Faro Design — Quick Start
echo  ========================
echo.

if not exist "app\package.json" (
    echo Error: Expected app\package.json next to this script.
    echo Folder: %CD%
    pause
    popd
    exit /b 1
)

cd /d "app"

if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Error: npm install failed.
        pause
        popd
        exit /b 1
    )
)

if not exist "data\brand.db" (
    echo Database not found. Running migrations...
    call npm run db:migrate
    if errorlevel 1 (
        echo Error: Database migration failed.
        pause
        popd
        exit /b 1
    )
)

set "APP_URL=http://localhost:3100"
set "OD_URL=http://127.0.0.1:7456"

echo Checking port 3100...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$u='http://127.0.0.1:3100'; try { $r=Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 4; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } } catch { }; if (Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue) { exit 2 }; exit 1"
set "SERVER_STATE=%ERRORLEVEL%"

if "%SERVER_STATE%"=="0" (
    echo.
    echo App is already running.
    echo Opening %APP_URL% ...
    start "" "%APP_URL%"
    echo.
    echo You can close this window. The server keeps running in its own process.
    pause
    popd
    exit /b 0
)

if "%SERVER_STATE%"=="2" (
    echo.
    echo Port 3100 is busy but the app did not answer cleanly.
    echo Freeing port 3100 and restarting...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$conns = Get-NetTCPConnection -LocalPort 3100 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($p in $conns) { if ($p -and $p -ne 0) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }"
    timeout /t 2 /nobreak >nul
)

echo.
echo Starting Open Design + Brand App...
echo.
echo   App:          %APP_URL%
echo   Open Design:  %OD_URL%
echo.
echo The browser will open when the server is ready.
echo Leave this window open while you work. Ctrl+C stops the app.
echo.

REM Open browser once the app responds (background waiter)
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url='http://localhost:3100'; for ($i=0; $i -lt 90; $i++) { try { $r=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { Start-Process $url; exit 0 } } catch {} ; Start-Sleep -Seconds 1 }; Write-Host 'Timed out waiting for the app. Open http://localhost:3100 manually.'"

call npm run dev
set "SERVER_EXIT=%ERRORLEVEL%"

echo.
if not "%SERVER_EXIT%"=="0" (
    echo The server stopped with error code %SERVER_EXIT%.
) else (
    echo The server has stopped.
)
echo.
pause
popd
exit /b %SERVER_EXIT%
