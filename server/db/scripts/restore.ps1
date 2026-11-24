[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,

    [Parameter(Mandatory = $true)]
    [switch]$ConfirmDisposableTarget
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_load-postgres-connection.ps1")

$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (!$pgRestore -or !$psql) {
    throw "pg_restore and psql are required. Install PostgreSQL command-line client tools and retry."
}
if (!$ConfirmDisposableTarget) {
    throw "Restore requires -ConfirmDisposableTarget and a newly created, empty, non-production database."
}
if ($env:HOPE_RESTORE_TARGET_IS_DISPOSABLE -ne "YES") {
    throw "Set HOPE_RESTORE_TARGET_IS_DISPOSABLE=YES only after verifying the target is disposable."
}

$databaseName = Set-HopePostgresConnectionFromEnvironment -EnvironmentVariable "HOPE_RESTORE_DATABASE_URL"
if ($databaseName -match "(?i)(prod|production|live)" -or $databaseName -notmatch "(?i)(test|sandbox|restore|local|dev)") {
    throw "Restore target database name must identify a non-production test, sandbox, restore, local, or dev database."
}

$resolvedBackupPath = (Resolve-Path -LiteralPath $BackupFile).Path
$checksumPath = "$resolvedBackupPath.sha256"
if (!(Test-Path -LiteralPath $checksumPath)) {
    throw "Expected checksum sidecar was not found: $checksumPath"
}

$checksumLine = (Get-Content -LiteralPath $checksumPath -Raw).Trim()
if ($checksumLine -notmatch "^([A-Fa-f0-9]{64})\s+(.+)$") {
    throw "Backup checksum sidecar has an invalid format."
}
$expectedHash = $Matches[1].ToUpperInvariant()
$actualHash = (Get-FileHash -LiteralPath $resolvedBackupPath -Algorithm SHA256).Hash
if ($actualHash -ne $expectedHash) {
    throw "Backup checksum verification failed."
}

& $pgRestore.Source --list "$resolvedBackupPath" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "The selected file is not a readable PostgreSQL custom-format backup."
}

$emptyCheck = @"
SELECT
    (SELECT COUNT(*)
     FROM pg_class AS relation
     JOIN pg_namespace AS schema ON schema.oid = relation.relnamespace
     WHERE schema.nspname = 'public'
       AND relation.relkind IN ('r', 'p', 'v', 'm', 'S', 'f'))
  + (SELECT COUNT(*)
     FROM pg_proc
     WHERE pronamespace = 'public'::regnamespace)
  + (SELECT COUNT(*)
     FROM pg_type
     WHERE typnamespace = 'public'::regnamespace
       AND typtype IN ('c', 'd', 'e', 'r'));
"@
$relationCount = & $psql.Source --no-psqlrc --set ON_ERROR_STOP=1 --tuples-only --no-align --command $emptyCheck --dbname "$databaseName"
if ($LASTEXITCODE -ne 0) {
    throw "Unable to verify that the restore target is empty."
}
if ([string]::IsNullOrWhiteSpace(($relationCount -join "").Trim()) -or [int](($relationCount -join "").Trim()) -ne 0) {
    throw "Restore target '$databaseName' is not empty. No objects were restored."
}

if (!$PSCmdlet.ShouldProcess("empty non-production database '$databaseName'", "Restore '$([IO.Path]::GetFileName($resolvedBackupPath))'")) {
    return
}

Write-Output "Restoring into verified empty non-production database '$databaseName'. Existing objects are never dropped."
& $pgRestore.Source --exit-on-error --single-transaction --no-owner --no-acl --dbname "$databaseName" "$resolvedBackupPath"
if ($LASTEXITCODE -ne 0) {
    throw "pg_restore failed with exit code $LASTEXITCODE."
}

$verificationSql = @"
SELECT CASE
    WHEN to_regclass('public.employee') IS NOT NULL
     AND to_regclass('public.department') IS NOT NULL
     AND to_regclass('public.job') IS NOT NULL
     AND to_regclass('public.jobhistory') IS NOT NULL
     AND (SELECT COUNT(*) FROM pg_constraint
          WHERE conrelid = 'public.jobhistory'::regclass
            AND contype = 'f') >= 3
    THEN 'ok'
    ELSE 'verification_failed'
END;
SELECT 'employee=' || COUNT(*) FROM public.employee;
SELECT 'department=' || COUNT(*) FROM public.department;
SELECT 'job=' || COUNT(*) FROM public.job;
SELECT 'jobhistory=' || COUNT(*) FROM public.jobhistory;
SELECT CASE
    WHEN NOT EXISTS (
        SELECT 1
        FROM public.jobhistory AS history
        LEFT JOIN public.employee AS employee ON employee.empno = history.empno
        WHERE employee.empno IS NULL
    )
    THEN 'hr_references=ok'
    ELSE 'hr_references=failed'
END;
"@
$verification = & $psql.Source --no-psqlrc --set ON_ERROR_STOP=1 --tuples-only --no-align --command $verificationSql --dbname "$databaseName"
if ($LASTEXITCODE -ne 0 -or $verification -notcontains "ok" -or $verification -notcontains "hr_references=ok") {
    throw "Restore completed but post-restore object or HR referential-integrity verification failed."
}

$verification | ForEach-Object { Write-Output $_ }
Write-Output "Restore verification succeeded."
