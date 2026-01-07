@echo off
echo =========================================
echo   Hyeyum Backoffice (pdf)
echo   Backend: 7000 / Frontend: 3000
echo =========================================
echo.

:: Backend (7000)
start "Hyeyum Backend 7000" cmd /k "cd /d c:\MYCLAUDE_PROJECT\pdf\backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7000"

timeout /t 3 /nobreak >nul

:: Frontend (3000)
start "Hyeyum Frontend 3000" cmd /k "cd /d c:\MYCLAUDE_PROJECT\pdf\frontend && npm run dev -- --host --port 3000"

echo.
echo =========================================
echo   Hyeyum Backoffice Started!
echo =========================================
echo   Backend:    http://localhost:7000
echo   Frontend:   http://localhost:3000
echo   Admin PC:   http://localhost:3000/admin
echo   Backoffice: http://localhost:3000/backoffice
echo =========================================
pause
