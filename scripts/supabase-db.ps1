param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("cotizaciones", "proyecto-x")]
    [string]$Target,

    [Parameter(Mandatory = $true)]
    [ValidateSet("dry-run", "push", "pull")]
    [string]$Action
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $projectRoot ".env.supabase.local"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) {
            return
        }

        $parts = $line.Split("=", 2)
        if ($parts.Length -eq 2) {
            [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
        }
    }
}

$dbUrl = $null

if ($Target -eq "cotizaciones") {
    $dbUrl = $env:SUPABASE_DB_URL_COTIZACIONES
}

if ($Target -eq "proyecto-x") {
    $dbUrl = $env:SUPABASE_DB_URL_PROYECTO_X
}

if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    if ($Target -eq "cotizaciones") {
        $targetArgs = @("--linked")
    } else {
        throw "Falta SUPABASE_DB_URL_PROYECTO_X en .env.supabase.local. Copia .env.supabase.example y completa la URL privada."
    }
} else {
    $targetArgs = @("--db-url", $dbUrl)
}

Push-Location $projectRoot
try {
    if ($Action -eq "dry-run") {
        & npx supabase db push @targetArgs --dry-run
        exit $LASTEXITCODE
    }

    if ($Action -eq "push") {
        & npx supabase db push @targetArgs
        exit $LASTEXITCODE
    }

    if ($Action -eq "pull") {
        $migrationName = "remote_schema_$Target"
        & npx supabase db pull $migrationName @targetArgs
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
