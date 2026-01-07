@echo off
chcp 65001 >nul
echo PDF 압축 도구 빌드 시작...
echo.

cd /d "%~dp0"

echo 1. PyInstaller로 exe 빌드 중...
pyinstaller --onefile --windowed --name "PDFCompressor" --icon=NONE pdf_compressor_gui.py

echo.
if exist "dist\PDFCompressor.exe" (
    echo 빌드 성공!
    echo 결과물: %~dp0dist\PDFCompressor.exe
    echo.
    echo 파일을 열어볼까요? (Y/N)
    set /p choice=
    if /i "%choice%"=="Y" explorer /select,"%~dp0dist\PDFCompressor.exe"
) else (
    echo 빌드 실패. 로그를 확인하세요.
)

pause
