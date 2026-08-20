# Faro Design / Brand App — Start
# Starts Open Design + Next.js on :3100 and opens the browser when ready.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

Write-Host ""
Write-Host " Faro Design — Quick Start" -ForegroundColor Cyan
Write-Host " ========================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "app\package.json")) {
    Write-Host "Error: Expected app\package.json in $Root" -ForegroundColor Red
    exit 1
}

Set-Location app

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}

# Always migrate (idempotent) so git pulls with new drizzle SQL apply.
Write-Host "Applying database migrations..." -ForegroundColor Yellow
npm run db:migrate
if ($LASTEXITCODE -ne 0) { throw "Database migration failed" }

$appUrl = "http://localhost:3100"

function Test-AppReady {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:3100" -UseBasicParsing -TimeoutSec 3
        return ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500)
    } catch {
        return $false
    }
}

if (Test-AppReady) {
    Write-Host "App is already running." -ForegroundColor Green
    Write-Host "Opening $appUrl ..."
    Start-Process $appUrl
    exit 0
}

$busy = Get-NetTCPConnection -LocalPort 3100 -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    Write-Host "Port 3100 is busy but app not healthy — freeing it..." -ForegroundColor Yellow
    $busy | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {
        if ($_ -and $_ -ne 0) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
    }
    Start-Sleep -Seconds 2
}

$localIPs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
    Select-Object -ExpandProperty IPAddress

Write-Host "Starting Open Design + Brand App..." -ForegroundColor Green
Write-Host ""
Write-Host "  App:          $appUrl" -ForegroundColor White
foreach ($ip in $localIPs) {
    Write-Host "  Network:      http://${ip}:3100" -ForegroundColor White
}
Write-Host "  Open Design:  http://127.0.0.1:7456" -ForegroundColor White
Write-Host ""
Write-Host "Browser opens when ready. Leave this window open. Ctrl+C to stop." -ForegroundColor Yellow
Write-Host ""

# Background: wait for ready, then open browser
Start-Job -ScriptBlock {
    param($url)
    for ($i = 0; $i -lt 90; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
                Start-Process $url
                return
            }
        } catch {}
        Start-Sleep -Seconds 1
    }
} -ArgumentList $appUrl | Out-Null

npm run dev
