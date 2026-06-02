<#
Start GotT on Windows PowerShell.

Usage:
  .\start-dev.ps1

Optional:
  $env:BACK_PORT = "8000"
  $env:FRONT_PORT = "5173"
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackDir = Join-Path $ScriptDir 'Back'
$FrontDir = Join-Path $ScriptDir 'Front'
$HostName = if ($env:HOST) { $env:HOST } else { '127.0.0.1' }
$BackPort = if ($env:BACK_PORT) { [int]$env:BACK_PORT } else { 8000 }
$FrontPort = if ($env:FRONT_PORT) { [int]$env:FRONT_PORT } else { 5173 }

function Write-GotT {
    param([string]$Message)
    Write-Host "[GotT] $Message" -ForegroundColor Cyan
}

function Write-GotTWarning {
    param([string]$Message)
    Write-Host "[GotT] $Message" -ForegroundColor Yellow
}

function Require-Command {
    param(
        [string]$Name,
        [string]$Message
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Host "[GotT] $Message" -ForegroundColor Red
        exit 1
    }
}

function Resolve-CommandPath {
    param([string]$Name)

    if ($IsWindows) {
        $command = Get-Command "$Name.cmd" -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }

        $command = Get-Command "$Name.exe" -ErrorAction SilentlyContinue
        if ($command) { return $command.Source }
    }

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    return $null
}

function Test-PortInUse {
    param([int]$Port)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $result = $client.BeginConnect($HostName, $Port, $null, $null)
        $connected = $result.AsyncWaitHandle.WaitOne(150, $false)
        if ($connected) {
            $client.EndConnect($result)
            return $true
        }
        return $false
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Find-FreePort {
    param([int]$StartPort)

    $port = $StartPort
    while (Test-PortInUse -Port $port) {
        $port++
    }
    return $port
}

Require-Command php "PHP est introuvable. Installe PHP avant de lancer le backend."
Require-Command npm "npm est introuvable. Installe Node.js/npm avant de lancer le frontend."

$phpExe = Resolve-CommandPath php
$npmExe = Resolve-CommandPath npm

if (-not $phpExe) {
    Write-Host "[GotT] PHP est introuvable. Installe PHP avant de lancer le backend." -ForegroundColor Red
    exit 1
}

if (-not $npmExe) {
    Write-Host "[GotT] npm est introuvable. Installe Node.js/npm avant de lancer le frontend." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $BackDir) -or -not (Test-Path $FrontDir)) {
    Write-Host "[GotT] Lance ce script depuis la racine du projet GotT." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $BackDir '.env')) -and (Test-Path (Join-Path $BackDir '.env.example'))) {
    Copy-Item (Join-Path $BackDir '.env.example') (Join-Path $BackDir '.env') -Force
    Write-GotT "Back/.env créé depuis Back/.env.example"
}

New-Item -ItemType Directory -Force -Path (Join-Path $BackDir 'var') | Out-Null

if (-not (Test-Path (Join-Path $BackDir 'vendor'))) {
    Require-Command composer "Composer est introuvable. Installe Composer ou lance composer install dans Back."
    Write-GotT "Installation des dépendances PHP..."
    Push-Location $BackDir
    composer install --no-interaction
    Pop-Location
}

if (-not (Test-Path (Join-Path $FrontDir 'node_modules'))) {
    Write-GotT "Installation des dépendances frontend..."
    Push-Location $FrontDir
    npm install
    Pop-Location
}

if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = 'sqlite:///var/cvtheque.db'
}

$initScript = Join-Path $BackDir 'init_sqlite.php'
if (Test-Path $initScript) {
    Write-GotT "Préparation de la base SQLite locale..."
    Push-Location $BackDir
    php init_sqlite.php
    Pop-Location
} else {
    Write-GotTWarning "Back/init_sqlite.php introuvable, la base sera préparée par les migrations si possible."
}

$consolePath = Join-Path $BackDir 'bin\console'
if (Test-Path $consolePath) {
    Write-GotT "Application des migrations Doctrine..."
    Push-Location $BackDir
    try {
        php bin/console doctrine:migrations:migrate --no-interaction
    } catch {
        Write-GotTWarning "Les migrations ont échoué. Vérifie Back/var et la configuration Doctrine."
    }
    Pop-Location
} else {
    Write-GotTWarning "Back/bin/console introuvable, migrations ignorées."
}

$BackPort = Find-FreePort -StartPort $BackPort
$FrontPort = Find-FreePort -StartPort $FrontPort
$ApiUrl = "http://${HostName}:${BackPort}"

Write-GotT "Démarrage du backend Symfony sur $ApiUrl"
$phpProc = Start-Process -FilePath $phpExe -ArgumentList @('-S', "${HostName}:${BackPort}", '-t', 'public', 'public/index.php') -WorkingDirectory $BackDir -NoNewWindow -PassThru

Start-Sleep -Milliseconds 500
if (-not (Get-Process -Id $phpProc.Id -ErrorAction SilentlyContinue)) {
    Write-Host "[GotT] Le backend n'a pas démarré." -ForegroundColor Red
    exit 1
}

if (-not $env:VITE_API_URL) {
    $env:VITE_API_URL = $ApiUrl
}

Write-GotT "Démarrage du frontend Vite sur http://${HostName}:${FrontPort}"
if ($IsWindows) {
    $npmLauncher = 'cmd.exe'
    $npmArgs = @('/c', 'npm', 'run', 'dev', '--', '--host', $HostName, '--port', "$FrontPort", '--strictPort')
} else {
    $npmLauncher = $npmExe
    $npmArgs = @('run', 'dev', '--', '--host', $HostName, '--port', "$FrontPort", '--strictPort')
}

$npmProc = Start-Process -FilePath $npmLauncher -ArgumentList $npmArgs -WorkingDirectory $FrontDir -NoNewWindow -PassThru

Start-Sleep -Milliseconds 500
if (-not (Get-Process -Id $npmProc.Id -ErrorAction SilentlyContinue)) {
    Write-Host "[GotT] Le frontend n'a pas démarré." -ForegroundColor Red
    if ($phpProc -and (Get-Process -Id $phpProc.Id -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $phpProc.Id -Force -ErrorAction SilentlyContinue
    }
    exit 1
}

Write-Host ""
Write-GotT "Projet prêt."
Write-Host "  API Symfony : $ApiUrl"
Write-Host "  Front Vite  : http://${HostName}:${FrontPort}"
Write-Host "  Admin dev   : admin@cvtheque.local / admin123"
Write-Host ""
Write-Host "Ctrl+C pour arrêter les deux serveurs."
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 1
        if (-not (Get-Process -Id $phpProc.Id -ErrorAction SilentlyContinue)) { break }
        if (-not (Get-Process -Id $npmProc.Id -ErrorAction SilentlyContinue)) { break }
    }
} finally {
    Write-GotT "Arrêt des serveurs..."
    if ($phpProc -and (Get-Process -Id $phpProc.Id -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $phpProc.Id -Force -ErrorAction SilentlyContinue
    }
    if ($npmProc -and (Get-Process -Id $npmProc.Id -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $npmProc.Id -Force -ErrorAction SilentlyContinue
    }
}

exit 1
