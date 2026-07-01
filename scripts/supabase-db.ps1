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
$targetArgs = @("--linked")
$commandWorkdir = $projectRoot

if ($Target -eq "proyecto-x") {
    $commandWorkdir = Join-Path $projectRoot "supabase-proyecto-x"
}

Push-Location $projectRoot
try {
    if ($Action -eq "dry-run") {
        & npx supabase db push @targetArgs --dry-run --workdir $commandWorkdir
        exit $LASTEXITCODE
    }

    if ($Action -eq "push") {
        & npx supabase db push @targetArgs --workdir $commandWorkdir
        exit $LASTEXITCODE
    }

    if ($Action -eq "pull") {
        $migrationName = "remote_schema_$Target"
        & npx supabase db pull $migrationName @targetArgs --workdir $commandWorkdir
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
