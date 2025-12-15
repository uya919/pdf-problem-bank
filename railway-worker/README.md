# Railway Worker - MakeEdu Sync

> 메이크에듀 동기화 백그라운드 작업 서버

## 개요

Vercel에서 실행할 수 없는 Python/Playwright 작업을 처리하는 백그라운드 서버입니다.

## 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/health` | 헬스체크 |
| POST | `/sync/preview` | 동기화 미리보기 (DB 변경 없음) |
| POST | `/sync/execute` | 동기화 실행 (DB 반영) |
| GET | `/sync/status/<job_id>` | 작업 상태 조회 |

## 로컬 실행

```bash
# 1. 의존성 설치
pip install -r requirements.txt

# 2. Playwright 브라우저 설치
playwright install chromium

# 3. 환경변수 설정
cp .env.example .env
# .env 파일 수정

# 4. 서버 실행
python worker.py
```

## Railway 배포

1. Railway 프로젝트 생성
2. GitHub 레포 연결 또는 CLI로 배포
3. 환경변수 설정:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `MAKEEDU_USERNAME`
   - `MAKEEDU_PASSWORD`

## 작업 흐름

```
1. POST /sync/preview
   └── jobId 반환

2. 백그라운드 처리
   ├── scrape_makeedu.py (25-40초)
   │   └── MakeEdu 로그인 → 학생 목록 수집
   └── sync_api.py (2-5초)
       └── Supabase DB 동기화

3. GET /sync/status/{jobId}
   └── 진행 상태 및 결과 반환
```

## 파일 구조

```
railway-worker/
├── worker.py          # Flask 메인 서버
├── scrape_makeedu.py  # 웹 스크래핑 (Playwright)
├── sync_api.py        # DB 동기화 (Supabase)
├── requirements.txt   # Python 의존성
├── Procfile          # Railway 실행 명령
├── railway.json      # Railway 설정
└── nixpacks.toml     # Nixpacks 빌드 설정
```
