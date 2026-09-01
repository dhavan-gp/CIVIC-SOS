# Civic & Emergency Response System PowerShell Launcher
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          CIVIC & EMERGENCY RESPONSE PLATFORM - LAUNCHER" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/3] Clearing any previous instances on ports 5000, 3000, 3001..." -ForegroundColor Yellow
$ports = @(5000, 3000, 3001)
foreach ($p in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid_to_kill in $processes) {
        try {
            Stop-Process -Id $pid_to_kill -Force -ErrorAction SilentlyContinue
        } catch {}
    }
}

Write-Host "[2/3] Launching Backend Server, Citizen Web, and Admin Console..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npm run dev"

Write-Host "[3/3] Launching Public Cloudflare Tunnel for Outside Access..." -ForegroundColor Green
$cfPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cloudflared tunnel --url http://localhost:5000"
} elseif (Test-Path $cfPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$cfPath' tunnel --url http://localhost:5000"
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "                  LOCAL ACCESS URLS (SAME WI-FI)" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  * Citizen Portal:          http://localhost:3000" -ForegroundColor Yellow
Write-Host "  * Admin Command Center:    http://localhost:3001/admin" -ForegroundColor Yellow
Write-Host "  * Direct Unified Server:   http://localhost:5000" -ForegroundColor Yellow
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "                  PUBLIC INTERNET ACCESS (EVERYWHERE)" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Check the Cloudflare Tunnel terminal window for your live HTTPS link!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to close this launcher..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
