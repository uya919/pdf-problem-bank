# 서버 자동 재시작 솔루션

**문서 번호**: 223
**작성일**: 2025-12-09
**상태**: 해결됨

---

## 1. 문제 요약

Claude Code에서 Windows 개발 서버를 자동으로 시작/재시작하는 것이 어려웠음.

### 이전 시도들 (실패)
| 방법 | 결과 |
|------|------|
| `cmd /c "start cmd /k ..."` | 따옴표 파싱 오류 |
| `PowerShell Start-Process` | 창은 열리나 명령 실행 안됨 |
| 배치 파일 실행 | 수동 실행 필요 |

---

## 2. 해결 방법 (성공)

### 핵심: Git Bash 경로 + run_in_background

```bash
# Backend 시작
cd /c/MYCLAUDE_PROJECT/pdf/backend && python -m uvicorn app.main:app --reload --port 8000
# run_in_background: true

# Frontend 시작
cd /c/MYCLAUDE_PROJECT/pdf/frontend && npm run dev
# run_in_background: true
```

### 왜 작동하는가?

1. **Git Bash 경로 사용**: `/c/...` 형식
   - Windows 경로 `c:\...`는 Git Bash에서 이스케이프 문제 발생
   - `/c/...` 형식은 Git Bash 네이티브 경로

2. **run_in_background 파라미터**:
   - 프로세스가 별도 백그라운드에서 실행됨
   - Claude Code 세션과 독립적으로 유지
   - `BashOutput`으로 출력 확인 가능

---

## 3. 서버 관리 명령어

### 서버 시작

```bash
# Backend (port 8000)
cd /c/MYCLAUDE_PROJECT/pdf/backend && python -m uvicorn app.main:app --reload --port 8000
# Bash tool: run_in_background=true

# Frontend (port 5173)
cd /c/MYCLAUDE_PROJECT/pdf/frontend && npm run dev
# Bash tool: run_in_background=true
```

### 서버 종료

```bash
# 포트로 PID 찾아서 종료
cmd /c "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :8000') do taskkill /F /PID %a"
cmd /c "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %a"
```

### 상태 확인

```bash
# 포트 확인
cmd /c "netstat -ano | findstr :8000"
cmd /c "netstat -ano | findstr :5173"

# 백그라운드 프로세스 출력 확인
BashOutput tool with bash_id
```

---

## 4. 전체 재시작 프로세스

### Step 1: 기존 서버 종료
```bash
cmd /c "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :8000') do taskkill /F /PID %a 2>nul"
cmd /c "for /f \"tokens=5\" %a in ('netstat -ano ^| findstr :5173') do taskkill /F /PID %a 2>nul"
```

### Step 2: Backend 시작
```bash
cd /c/MYCLAUDE_PROJECT/pdf/backend && python -m uvicorn app.main:app --reload --port 8000
# run_in_background: true
```

### Step 3: Frontend 시작
```bash
cd /c/MYCLAUDE_PROJECT/pdf/frontend && npm run dev
# run_in_background: true
```

### Step 4: 확인
```bash
cmd /c "ping -n 5 127.0.0.1 >nul && netstat -ano | findstr :8000 && netstat -ano | findstr :5173"
```

---

## 5. 주의사항

1. **경로 형식**: 반드시 Git Bash 형식 사용 (`/c/...`)
2. **백그라운드 실행**: `run_in_background: true` 필수
3. **출력 확인**: `BashOutput` 도구로 로그 확인 가능
4. **세션 종료 시**: 백그라운드 프로세스는 계속 실행됨

---

## 6. 결론

| 항목 | 값 |
|------|-----|
| 경로 형식 | Git Bash (`/c/...`) |
| 실행 방식 | `run_in_background: true` |
| 출력 확인 | `BashOutput` 도구 |
| 종료 방식 | `taskkill /F /PID` |

**이 방법으로 Claude Code에서 Windows 개발 서버를 완전 자동으로 관리할 수 있음.**

---

*작성: Claude Code 자동 연구*
