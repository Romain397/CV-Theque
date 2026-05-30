<#
PowerShell start script for Windows
Usage: Open PowerShell, run: .\start-dev.ps1
#>
Set-StrictMode -Version Latest

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackDir = Join-Path $ScriptDir 'Back'
$FrontDir = Join-Path $ScriptDir 'Front'

if (-Not (Test-Path (Join-Path $BackDir '.env')) -and (Test-Path (Join-Path $BackDir '.env.example'))) {
    Copy-Item (Join-Path $BackDir '.env.example') (Join-Path $BackDir '.env') -Force
}

New-Item -ItemType Directory -Force -Path (Join-Path $BackDir 'var') | Out-Null

$dbFile = Join-Path $BackDir 'var\cvtheque.db'
if (-Not (Test-Path $dbFile)) {
    Write-Output "First run: creating sqlite DB..."
    if (Test-Path (Join-Path $BackDir 'init_sqlite.php')) {
        & php (Join-Path $BackDir 'init_sqlite.php')
    } else {
        Write-Warning "init_sqlite.php not found in $BackDir"
    }
}

if (-Not (Test-Path (Join-Path $BackDir 'vendor'))) {
    if (Get-Command composer -ErrorAction SilentlyContinue) {
        Write-Output "Installing PHP dependencies (composer install)..."
        Push-Location $BackDir
        composer install --no-interaction
        Pop-Location
    } else {
        Write-Warning "Composer not found — run 'composer install' in $BackDir if needed."
    }
}

if (-Not (Test-Path (Join-Path $FrontDir 'node_modules'))) {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Output "Installing frontend dependencies (npm install)..."
        Push-Location $FrontDir
        npm install
        Pop-Location
    } else {
        Write-Warning "npm not found — run 'npm install' in $FrontDir if needed."
    }
}

# Set DATABASE_URL for migrations
$env:DATABASE_URL = 'sqlite:///var/cvtheque.db'

Push-Location $BackDir
Write-Output "Running Doctrine migrations..."
& php bin/console doctrine:migrations:migrate --no-interaction
Pop-Location

Write-Output "Starting servers..."

# Start PHP built-in server
$phpProc = Start-Process -FilePath php -ArgumentList '-S','127.0.0.1:8000','-t','public','public/index.php' -WorkingDirectory $BackDir -NoNewWindow -PassThru

# Start Vite dev server
$env:VITE_API_URL = ${env:VITE_API_URL} -or 'http://127.0.0.1:8000'
$npmProc = Start-Process -FilePath npm -ArgumentList 'run','dev','--','--host','127.0.0.1','--port','5173' -WorkingDirectory $FrontDir -NoNewWindow -PassThru

Write-Output "Symfony: http://127.0.0.1:8000"
Write-Output "Vite: http://127.0.0.1:5173"

try {
    while ($true) {
        Start-Sleep -Seconds 1
        if (-not (Get-Process -Id $phpProc.Id -ErrorAction SilentlyContinue)) { break }
        if (-not (Get-Process -Id $npmProc.Id -ErrorAction SilentlyContinue)) { break }
    }
} finally {
    Write-Output "Stopping servers..."
    if ($phpProc -and (Get-Process -Id $phpProc.Id -ErrorAction SilentlyContinue)) { Stop-Process -Id $phpProc.Id -Force -ErrorAction SilentlyContinue }
    if ($npmProc -and (Get-Process -Id $npmProc.Id -ErrorAction SilentlyContinue)) { Stop-Process -Id $npmProc.Id -Force -ErrorAction SilentlyContinue }
}

exit 0
