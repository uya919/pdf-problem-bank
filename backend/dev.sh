#!/bin/bash
# Phase 20-D: 개발 서버 시작 스크립트
# 사용법: ./dev.sh

echo "=== PDF 라벨링 개발 서버 시작 ==="

# 1. __pycache__ 정리
echo "1. 캐시 정리 중..."
find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null
echo "   완료"

# 2. 환경 변수 설정
echo "2. 환경 변수 설정..."
export PYTHONDONTWRITEBYTECODE=1
export APP_ENV=development
echo "   PYTHONDONTWRITEBYTECODE=1"
echo "   APP_ENV=development"

# 3. uvicorn 실행
echo "3. uvicorn 시작..."
echo ""
python -m uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000
