# Brand App Server Quickstart Script
# Starts the dev server and displays access URLs for localhost, local network, and Tailscale

Write-Host "Brand App Server Quickstart" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "app\package.json")) {
    Write-Host "Error: Please run this script from the Brand App root directory" -ForegroundColor Red
    Write-Host "Expected to find app\package.json" -ForegroundColor Red
    exit 1
}

# Navigate to app directory
Set-Location app

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: npm install failed" -ForegroundColor Red
        exit 1
    }
}

# Check if database exists
if (-not (Test-Path "data\brand.db")) {
    Write-Host "Database not found. Running migrations..." -ForegroundColor Yellow
    npm run db:migrate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Database migration failed" -ForegroundColor Red
        exit 1
    }
}

# Get network information for display
$localhostIP = "127.0.0.1"
$localIPs = Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
    Select-Object -ExpandProperty IPAddress

# Check for Tailscale
$tailscaleIP = $null
try {
    $tailscaleInfo = Get-NetIPAddress -AddressFamily IPv4 | 
        Where-Object { $_.IPAddress -like "100.*" -or $_.InterfaceAlias -like "*Tailscale*" }
    if ($tailscaleInfo) {
        $tailscaleIP = $tailscaleInfo.IPAddress
    }
} catch {
    # Tailscale might not be installed or running
}

Write-Host "Starting Brand App development server..." -ForegroundColor Green
Write-Host ""
Write-Host "Access URLs:" -ForegroundColor Cyan
Write-Host "  Localhost:     http://$localhostIP`:3100" -ForegroundColor White
foreach ($ip in $localIPs) {
    Write-Host "  Local Network: http://$ip`:3100" -ForegroundColor White
}
if ($tailscaleIP) {
    Write-Host "  Tailscale:     http://$tailscaleIP`:3100" -ForegroundColor Green
} else {
    Write-Host "  Tailscale:     Not detected (ensure Tailscale is running)" -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the dev server
npm run dev