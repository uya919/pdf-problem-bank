@echo off
echo =========================================
echo   Hyeyum Backoffice - Stop Servers
echo   Backend: 7000 / Frontend: 3000
echo =========================================
echo.

echo [1/2] Stopping Backend (port 7000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :7000 ^| findstr LISTENING') do (
    echo   Killing PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo [2/2] Stopping Frontend (port 3000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo   Killing PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo =========================================
echo   Hyeyum Backoffice Stopped!
echo =========================================
pause
