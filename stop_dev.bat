@echo off
chcp 65001 >nul
echo ========================================
echo   PDF 문제은행 개발 서버 종료
echo ========================================
echo.

echo 포트 8000 (Backend) 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

echo 포트 5173 (Frontend) 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

echo.
echo 서버 종료 완료!
timeout /t 2
