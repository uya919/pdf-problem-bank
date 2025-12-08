# Phase 20-D: 개발 서버 시작 스크립트
# 사용법: .\dev.ps1

Write-Host "=== PDF 라벨링 개발 서버 시작 ===" -ForegroundColor Cyan

# 1. __pycache__ 정리
Write-Host "1. 캐시 정리 중..." -ForegroundColor Yellow
Get-ChildItem -Recurse -Directory -Filter '__pycache__' -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "   완료" -ForegroundColor Green

# 2. 환경 변수 설정
Write-Host "2. 환경 변수 설정..." -ForegroundColor Yellow
$env:PYTHONDONTWRITEBYTECODE = "1"
$env:APP_ENV = "development"
Write-Host "   PYTHONDONTWRITEBYTECODE=1" -ForegroundColor Green
Write-Host "   APP_ENV=development" -ForegroundColor Green

# 3. uvicorn 실행
Write-Host "3. uvicorn 시작..." -ForegroundColor Yellow
Write-Host ""
python -m uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000
