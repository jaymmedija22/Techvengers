function Resolve-HopePostgresTool {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command -and $command.CommandType -eq "Application") {
        return $command.Source
    }

    $installRoot = Join-Path ([Environment]::GetFolderPath("ProgramFiles")) "PostgreSQL"
    if (Test-Path -LiteralPath $installRoot) {
        $versions = Get-ChildItem -LiteralPath $installRoot -Directory |
            Sort-Object Name -Descending
        foreach ($version in $versions) {
            $toolPath = Join-Path $version.FullName "bin\$Name.exe"
            if (Test-Path -LiteralPath $toolPath) {
                return $toolPath
            }
        }
    }

    throw "$Name was not found. Install PostgreSQL command-line client tools and retry."
}

function Set-HopePostgresConnectionFromEnvironment {
    param(
        [Parameter(Mandatory = $true)]
        [string]$EnvironmentVariable
    )

    $connectionString = [Environment]::GetEnvironmentVariable(
        $EnvironmentVariable,
        [EnvironmentVariableTarget]::Process
    )
    if ([string]::IsNullOrWhiteSpace($connectionString)) {
        throw "Set $EnvironmentVariable to an authorized PostgreSQL connection URL."
    }

    try {
        $uri = [Uri]$connectionString
    } catch {
        throw "$EnvironmentVariable must be a valid PostgreSQL connection URL."
    }

    if ($uri.Scheme -notin @("postgres", "postgresql") -or !$uri.Host) {
        throw "$EnvironmentVariable must use the postgres:// or postgresql:// scheme."
    }

    $databaseName = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart("/"))
    if ([string]::IsNullOrWhiteSpace($databaseName) -or $databaseName.Contains("/")) {
        throw "$EnvironmentVariable must identify exactly one database."
    }

    $userInfo = $uri.UserInfo
    $separator = $userInfo.IndexOf(":")
    $userName = if ($separator -ge 0) { $userInfo.Substring(0, $separator) } else { $userInfo }
    if ([string]::IsNullOrWhiteSpace($userName)) {
        throw "$EnvironmentVariable must include a database user."
    }

    $env:PGHOST = $uri.Host
    $env:PGPORT = if ($uri.IsDefaultPort) { "5432" } else { [string]$uri.Port }
    $env:PGDATABASE = $databaseName
    $env:PGUSER = [Uri]::UnescapeDataString($userName)
    $env:PGSSLMODE = "require"

    if ($separator -ge 0) {
        $env:PGPASSWORD = [Uri]::UnescapeDataString($userInfo.Substring($separator + 1))
    } else {
        Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    }

    foreach ($parameter in $uri.Query.TrimStart("?").Split("&")) {
        if (!$parameter) { continue }
        $pairSeparator = $parameter.IndexOf("=")
        $keyPart = if ($pairSeparator -ge 0) {
            $parameter.Substring(0, $pairSeparator)
        } else {
            $parameter
        }
        $key = [Uri]::UnescapeDataString($keyPart).ToUpperInvariant()
        if ($key -notmatch "^[A-Z][A-Z0-9_]*$" -or $key -in @("HOST", "PORT", "USER", "PASSWORD", "DATABASE", "DBNAME")) {
            continue
        }

        $value = if ($pairSeparator -ge 0) {
            [Uri]::UnescapeDataString($parameter.Substring($pairSeparator + 1))
        } else {
            ""
        }
        if ($key -eq "SSLMODE") {
            $env:PGSSLMODE = $value
            continue
        }

        $environmentKey = if ($key -eq "APPLICATION_NAME") {
            "PGAPPNAME"
        } else {
            "PG$key"
        }
        [Environment]::SetEnvironmentVariable(
            $environmentKey,
            $value,
            [EnvironmentVariableTarget]::Process
        )
    }

    return $databaseName
}
