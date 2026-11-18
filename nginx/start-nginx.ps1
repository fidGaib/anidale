# Запуск локального nginx для AniDale: прод-сборка клиента на http://localhost.
#
#   powershell -ExecutionPolicy Bypass -File nginx\start-nginx.ps1
#   powershell -ExecutionPolicy Bypass -File nginx\start-nginx.ps1 -Build   # пересобрать клиент и запустить
#   powershell -ExecutionPolicy Bypass -File nginx\start-nginx.ps1 -Force   # перезапустить, если уже работает
#
# Почему так: nginx на Windows не переваривает кириллицу в путях, поэтому всё
# идёт через виртуальный диск X: (subst X: C:\Users\FID\Desktop\проекты).

[CmdletBinding()]
param(
    [string]$NginxRoot = 'C:\Users\FID\Desktop\проекты\nginx-1.30.6',
    [string]$ProjectsRoot = 'C:\Users\FID\Desktop\проекты',
    [switch]$Build,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
# nginx -t пишет в stderr; в PowerShell 7.3+ это иначе становится ошибкой.
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$exe = Join-Path $NginxRoot 'nginx.exe'
if (-not (Test-Path $exe)) { throw "Не найден nginx.exe: $exe" }

$prefix = 'X:/nginx-1.30.6/'
$conf = 'X:/anidale/nginx/anidale.conf'
$healthUrl = 'http://localhost/healthz'

function Get-Port80Owner {
    $conn = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $conn) { return $null }
    return Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
}

# --- виртуальный диск ---
if (-not (Test-Path 'X:\anidale\nginx\anidale.conf')) {
    if (Test-Path 'X:\') {
        throw "Диск X: уже занят другим каталогом. Освободите его: subst X: /D"
    }
    subst X: $ProjectsRoot
    Start-Sleep -Milliseconds 300
    Write-Host 'Создан виртуальный диск X: ->' $ProjectsRoot
}

# --- уже запущен? ---
$owner = Get-Port80Owner
if ($owner) {
    if ($owner.Path -eq $exe -and -not $Force) {
        Write-Host "nginx уже работает (PID $($owner.Id)): http://localhost"
        exit 0
    }
    if ($owner.Path -eq $exe) {
        Write-Host "Останавливаю текущий nginx (PID $($owner.Id))..."
        & $exe -p $prefix -c $conf -s quit
        Start-Sleep -Seconds 1
    }
    else {
        throw "Порт 80 занят другим процессом: $($owner.Path) (PID $($owner.Id)). Остановите его и повторите."
    }
}

# --- сборка клиента ---
if ($Build) {
    $clientDir = Join-Path $ProjectsRoot 'anidale\client'
    Write-Host 'Собираю клиент под тот же origin...'
    Push-Location $clientDir
    try {
        $env:VITE_API_URL = 'http://localhost'
        $env:VITE_STATIC_URL = ''
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Сборка клиента завершилась с ошибкой.' }
    }
    finally {
        Pop-Location
        Remove-Item Env:VITE_API_URL, Env:VITE_STATIC_URL -ErrorAction SilentlyContinue
    }
}

# --- проверка конфига ---
& $exe -p $prefix -c $conf -t
if ($LASTEXITCODE -ne 0) { throw 'Конфиг nginx не прошёл проверку.' }

# --- запуск ---
$logs = Join-Path $NginxRoot 'logs'
Start-Process -FilePath $exe `
    -ArgumentList @('-p', $prefix, '-c', $conf) `
    -WorkingDirectory $NginxRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $logs 'anidale.stdout.log') `
    -RedirectStandardError (Join-Path $logs 'anidale.stderr.log')

for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    if (Get-Port80Owner) { break }
}

if (-not (Get-Port80Owner)) {
    throw "nginx не поднялся. Смотрите $(Join-Path $logs 'error.log')."
}

try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 10
    Write-Host "nginx запущен: http://localhost (healthz: $($health.status), БД: $($health.database), Redis: $($health.redis))"
}
catch {
    Write-Host 'nginx запущен: http://localhost (healthz не ответил — API на :5000 запущен?)'
}
