[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_load-postgres-connection.ps1")

$psql = Resolve-HopePostgresTool -Name "psql"
$resolvedBackupPath = (Resolve-Path -LiteralPath $BackupFile).Path
$securePassword = Read-Host "Enter the local PostgreSQL postgres-user password (input is hidden)" -AsSecureString
$passwordPointer = [IntPtr]::Zero
$databaseName = "hope_restore_test_$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))"
$databaseCreated = $false

try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

    $env:PGHOST = "localhost"
    $env:PGPORT = "5432"
    $env:PGUSER = "postgres"
    $env:PGPASSWORD = $plainPassword
    $env:PGSSLMODE = "disable"
    $env:PGDATABASE = "postgres"

    $answer = Read-Host "This creates, restores, and deletes only '$databaseName'. Type RESTORE to continue"
    if ($answer -cne "RESTORE") {
        Write-Output "Restore test cancelled; no temporary database was created."
        return
    }

    & $psql --no-psqlrc --set ON_ERROR_STOP=1 --tuples-only --no-align --command "SELECT 1" --dbname "postgres" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to connect to the local PostgreSQL service as the postgres user."
    }

    & $psql --no-psqlrc --set ON_ERROR_STOP=1 --command "CREATE DATABASE $databaseName TEMPLATE template0" --dbname "postgres"
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to create the isolated local restore-test database."
    }
    $databaseCreated = $true

    $encodedPassword = [Uri]::EscapeDataString($plainPassword)
    $env:HOPE_RESTORE_DATABASE_URL = "postgresql://postgres:$encodedPassword@localhost:5432/$databaseName?sslmode=disable"
    $env:HOPE_RESTORE_TARGET_IS_DISPOSABLE = "YES"

    & (Join-Path $PSScriptRoot "restore.ps1") -BackupFile $resolvedBackupPath -ConfirmDisposableTarget -Confirm:$false
} finally {
    $cleanupExitCode = 0
    if ($databaseCreated) {
        $env:PGDATABASE = "postgres"
        & $psql --no-psqlrc --set ON_ERROR_STOP=1 --command "DROP DATABASE $databaseName" --dbname "postgres"
        $cleanupExitCode = $LASTEXITCODE
    }

    Remove-Item Env:HOPE_RESTORE_DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:HOPE_RESTORE_TARGET_IS_DISPOSABLE -ErrorAction SilentlyContinue
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PGDATABASE -ErrorAction SilentlyContinue
    $plainPassword = $null
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $securePassword.Dispose()

    if ($cleanupExitCode -ne 0) {
        throw "Restore test ended, but the temporary database '$databaseName' could not be removed."
    }

    if ($databaseCreated) {
        Write-Output "Temporary database '$databaseName' was removed."
    }
}
