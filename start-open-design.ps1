# Manual Open Design daemon start (usually not needed).
# Preferred: start-brand-app.bat / start-server.ps1 / npm run dev
# Those auto-start OD via app/scripts/ensure-open-design.mjs

$ErrorActionPreference = "Stop"
$AppScripts = Join-Path $PSScriptRoot "app\scripts\ensure-open-design.mjs"
if (-not (Test-Path $AppScripts)) {
  Write-Error "Missing $AppScripts"
}

# If already up, this exits 0 quickly.
Set-Location (Join-Path $PSScriptRoot "app")
node scripts/ensure-open-design.mjs --wait
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Open Design is running. You can close this window; the daemon stays in the background."
Write-Host "Start Faro with start-brand-app.bat or: cd app ; npm run dev"
Write-Host ""

