[CmdletBinding()]
param(
    [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\backups")
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_load-postgres-connection.ps1")

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (!$pgDump) {
    throw "pg_dump was not found. Install PostgreSQL command-line client tools and retry."
}

$databaseName = Set-HopePostgresConnectionFromEnvironment -EnvironmentVariable "HOPE_BACKUP_DATABASE_URL"
$resolvedOutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $resolvedOutputDirectory -Force | Out-Null

$timestamp = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssfffZ")
$backupPath = Join-Path $resolvedOutputDirectory "hope-erp-$timestamp.dump"
$checksumPath = "$backupPath.sha256"

Write-Output "Creating custom-format backup for database '$databaseName'."
& $pgDump.Source --format=custom --schema=public --file="$backupPath"
if ($LASTEXITCODE -ne 0) {
    Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
    throw "pg_dump failed with exit code $LASTEXITCODE."
}

if (!(Test-Path -LiteralPath $backupPath) -or (Get-Item -LiteralPath $backupPath).Length -eq 0) {
    Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
    throw "pg_dump completed without creating a non-empty backup file."
}

$hash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash
Set-Content -LiteralPath $checksumPath -Value "$hash  $(Split-Path -Leaf $backupPath)" -Encoding ASCII
Write-Output "Backup created: $backupPath"
Write-Output "SHA-256 file: $checksumPath"
