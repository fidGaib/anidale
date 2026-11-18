# Остановка локального nginx, запущенного через start-nginx.ps1.
#
#   powershell -ExecutionPolicy Bypass -File nginx\stop-nginx.ps1
#   powershell -ExecutionPolicy Bypass -File nginx\stop-nginx.ps1 -Clean   # ещё и снять диск X:

[CmdletBinding()]
param(
    [string]$NginxRoot = 'C:\Users\FID\Desktop\проекты\nginx-1.30.6',
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'
if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
    $PSNativeCommandUseErrorActionPreference = $false
}

$exe = Join-Path $NginxRoot 'nginx.exe'
$prefix = 'X:/nginx-1.30.6/'
$conf = 'X:/anidale/nginx/anidale.conf'

$conn = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
    $owner = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
    if ($owner -and $owner.Path -eq $exe) {
        & $exe -p $prefix -c $conf -s quit
        Start-Sleep -Seconds 1
        Write-Host 'nginx остановлен.'
    }
    else {
        Write-Host "Порт 80 занят не nginx из $NginxRoot — не трогаю: $($owner.Path)"
    }
}
else {
    Write-Host 'nginx уже не запущен (порт 80 свободен).'
}

# Добить воркеры, если graceful shutdown не сработал.
Get-Process nginx -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $exe } |
    ForEach-Object {
        Write-Host "Завершаю оставшийся процесс nginx (PID $($_.Id))."
        Stop-Process -Id $_.Id -Force
    }

if ($Clean -and (Test-Path 'X:\')) {
    subst X: /D
    Write-Host 'Виртуальный диск X: снят.'
}
