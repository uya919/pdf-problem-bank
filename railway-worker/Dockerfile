# Railway Worker Dockerfile (hyeyum 방식으로 수정)
FROM python:3.12-slim

# 작업 디렉토리 생성
WORKDIR /app

# 시스템 패키지 설치 (Playwright Chromium 의존성)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright Chromium 설치
RUN playwright install chromium

# 애플리케이션 파일 복사
COPY . .

# temp 디렉토리 생성 (scraping_result.json 저장용)
RUN mkdir -p temp

# Gunicorn 서버 시작 (Single Worker - Memory Isolation 방지)
CMD ["sh", "-c", "gunicorn worker:app --bind 0.0.0.0:${PORT:-5000} --workers 1 --timeout 120"]
