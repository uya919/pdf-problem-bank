@echo off
chcp 65001 >nul
echo ========================================
echo   PDF 문제은행 개발 서버 시작
echo ========================================
echo.

echo [1/2] Backend 서버 시작 중... (포트 8000)
start "PDF-Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Frontend 서버 시작 중... (포트 5173)
start "PDF-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo   서버 시작 완료!
echo ========================================
echo.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo.
echo   종료하려면 각 터미널 창을 닫으세요.
echo ========================================
timeout /t 5
