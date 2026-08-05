# Optional: start Open Design daemon only (port 7456).
# Prefer: start.bat / start.ps1 / (cd app; npm run dev) — those auto-start OD.

$ErrorActionPreference = "Stop"
$AppScripts = Join-Path $PSScriptRoot "app\scripts\ensure-open-design.mjs"
if (-not (Test-Path $AppScripts)) {
  Write-Error "Missing $AppScripts"
}

Set-Location (Join-Path $PSScriptRoot "app")
node scripts/ensure-open-design.mjs --wait
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Open Design is running. You can close this window; the daemon stays in the background."
Write-Host "Start Faro with start.bat, start.ps1, or: cd app ; npm run dev"
Write-Host ""
