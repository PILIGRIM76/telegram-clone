@echo off
title "Telegram Clone - Launch"
cd /d "%~dp0"

echo Starting MongoDB...
docker start mongodb 2>nul

echo.
echo [1] Server - starting on port 3001...
start "Server" cmd /k "cd server && npm run dev"

echo.
echo [2] Admin - starting on port 3002...
start "Admin" cmd /k "cd admin && npm run dev"

echo.
echo ========================================
echo   Telegram Clone Started!
echo ========================================
echo.
echo Server:  http://localhost:3001
echo Admin:  http://localhost:3002
echo.
echo Login: admin@telegram.local
echo Password: admin123
echo.
pause