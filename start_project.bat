@echo off
setlocal enabledelayedexpansion
title Civic & Emergency Response System
color 0b

echo ======================================================================
echo           CIVIC ^& EMERGENCY RESPONSE PLATFORM - LAUNCHER
echo ======================================================================
echo.

:: Add default paths for Node.js and Cloudflared
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files (x86)\cloudflared;C:\Program Files\cloudflared;%LOCALAPPDATA%\Programs\nodejs"

cd /d "%~dp0"

echo [1/4] Checking Node.js and NPM...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js was not found in PATH!
    echo Please ensure Node.js is installed from https://nodejs.org
    pause
    exit /b
)

echo [2/4] Checking for existing running instances and clearing ports...
:: Free port 5000, 3000, 3001 if occupied
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo [3/4] Launching Core Application Server (Port 5000, 3000, 3001)...
start "Civic Response Servers" cmd /k "cd /d ""%~dp0"" && npm run dev"

echo [4/4] Launching Public Cloudflare Tunnel for Outside & Mobile Access...
where cloudflared >nul 2>nul
if %errorlevel% equ 0 (
    start "Civic Response Cloudflare Tunnel" cmd /k "cloudflared tunnel --url http://localhost:5000"
) else (
    if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
        start "Civic Response Cloudflare Tunnel" cmd /k ""C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:5000"
    ) else (
        echo [INFO] cloudflared binary not found in standard paths. Running in local network mode only.
    )
)

echo.
echo ======================================================================
echo                  LOCAL NETWORK ACCESS (SAME WI-FI)
echo ======================================================================
echo  * Citizen Portal:          http://localhost:3000
echo  * Admin Command Center:    http://localhost:3001/admin
echo  * Direct Unified Server:   http://localhost:5000
echo.
echo ======================================================================
echo                  PUBLIC INTERNET ACCESS (EVERYWHERE)
echo ======================================================================
echo  Look at the "Civic Response Cloudflare Tunnel" terminal window
echo  to see your live https://xxxx.trycloudflare.com link!
echo ======================================================================
echo.
echo Leave the opened terminal windows running in the background.
echo.
pause
