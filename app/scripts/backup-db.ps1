# Writes a timestamped copy of the SQLite database to data\backups\.
# Usage:  powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$db = Join-Path $root "data\brand.db"
if (-not (Test-Path $db)) { Write-Host "No database at $db — nothing to back up."; exit 0 }
$backupDir = Join-Path $root "data\backups"
if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = Join-Path $backupDir "brand-$stamp.db"
Copy-Item $db $dest
Write-Host "Backed up to $dest"
