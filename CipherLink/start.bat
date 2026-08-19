@echo off
cls
echo ========================================
echo    CipherLink - Secure Messenger
echo ========================================
echo.

:menu
echo Select option:
echo 1. Start Development Server
echo 2. Start Web Client
echo 3. Start Admin Panel
echo 4. View Project Structure
echo 5. Exit
echo.

set /p choice=Enter your choice (1-5): 

if "%choice%"=="1" goto start_server
if "%choice%"=="2" goto start_client
if "%choice%"=="3" goto start_admin
if "%choice%"=="4" goto view_structure
if "%choice%"=="5" goto exit
goto menu

:start_server
echo Starting CipherLink Server...
cd server
if not exist node_modules (
    echo Installing server dependencies...
    npm install
)
npm run dev
pause
goto menu

:start_client
echo Starting Web Client...
cd client\web
if not exist node_modules (
    echo Installing client dependencies...
    npm install
)
npm run dev
pause
goto menu

:start_admin
echo Opening Admin Panel...
start "" "server\admin-panel\index.html"
goto menu

:view_structure
echo.
echo Project Structure:
echo =================
dir /s /b | findstr /v "node_modules\.git"
echo.
pause
goto menu

:exit
echo Goodbye!
exit