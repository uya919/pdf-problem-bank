# MakeEdu Sync Worker Dockerfile
# Playwright 공식 이미지 사용 (Chromium 사전 설치됨)
FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Copy requirements first for better caching (from railway-worker subfolder)
COPY railway-worker/requirements.txt .

# Install Python dependencies (playwright는 이미 설치됨)
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (only railway-worker folder)
COPY railway-worker/ .

# Expose port (Railway sets PORT env var)
EXPOSE 5000

# Default PORT (Railway overrides via env var)
ENV PORT=5000

# Start command - use shell to properly expand $PORT
CMD ["sh", "-c", "gunicorn worker:app --bind 0.0.0.0:${PORT:-5000} --workers 1 --timeout 120"]
