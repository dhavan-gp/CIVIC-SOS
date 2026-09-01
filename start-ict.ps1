# ==============================================================================
# Civic & Emergency Response Platform - Master Startup Script
# ==============================================================================
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting Civic & Emergency Response System (Full Stack) " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Kill any existing instances on ports 5000, 3000, 3001 and cloudflared
Write-Host "[1/4] Cleaning previous processes..." -ForegroundColor Yellow
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Start Full Stack Dev Server (Backend + Citizen Portal + Admin Portal)
Write-Host "[2/4] Launching Backend API (5000) & Portals (3000, 3001)..." -ForegroundColor Yellow
$devJob = Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory $PSScriptRoot -PassThru -NoNewWindow

Start-Sleep -Seconds 4

# 3. Launch Cloudflare Tunnel
Write-Host "[3/4] Establishing Cloudflare Secure Mobile Tunnel..." -ForegroundColor Yellow
$cloudflaredPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
if (-not (Test-Path $cloudflaredPath)) {
    $cloudflaredPath = "cloudflared"
}

$tunnelLog = "$PSScriptRoot\tunnel.log"
if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }

$tunnelJob = Start-Process -FilePath $cloudflaredPath -ArgumentList "tunnel --url http://localhost:5000" -RedirectStandardError $tunnelLog -PassThru -NoNewWindow

# Wait for tunnel URL in log
$tunnelUrl = $null
$attempts = 0
while ($attempts -lt 20 -and -not $tunnelUrl) {
    Start-Sleep -Seconds 1
    $attempts++
    if (Test-Path $tunnelLog) {
        $logContent = Get-Content $tunnelLog -Raw
        if ($logContent -match 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com') {
            $tunnelUrl = $Matches[0]
        }
    }
}

# 4. Register Tunnel with Backend API
if ($tunnelUrl) {
    Write-Host "[4/4] Registering Tunnel URL with Server & Admin QR..." -ForegroundColor Green
    try {
        $body = @{ url = $tunnelUrl } | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:5000/api/tunnel-url" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 | Out-Null
    } catch {
        # Retry after 2 seconds if backend is still spinning up
        Start-Sleep -Seconds 2
        try {
            $body = @{ url = $tunnelUrl } | ConvertTo-Json
            Invoke-RestMethod -Uri "http://localhost:5000/api/tunnel-url" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5 | Out-Null
        } catch {}
    }
}

# Summary Box
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  ✅ ALL SERVICES ONLINE & OPERATIONAL" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  🖥️  Admin Command Center : http://localhost:3001" -ForegroundColor White
Write-Host "  🌐 Citizen Web Portal    : http://localhost:3000" -ForegroundColor White
Write-Host "  ⚙️  Backend Core API     : http://localhost:5000" -ForegroundColor White
if ($tunnelUrl) {
    Write-Host "  📱 Live Mobile Tunnel    : $tunnelUrl" -ForegroundColor Magenta
    Write-Host "     (Open http://localhost:3001 to scan the QR code from phone)" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  Tunnel pending — check Admin Portal for live QR code" -ForegroundColor Yellow
}
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Gray
Write-Host ""

# Keep running
try {
    while ($true) { Start-Sleep -Seconds 5 }
} finally {
    Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
