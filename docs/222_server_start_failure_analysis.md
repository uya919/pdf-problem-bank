# 서버 시작 실패 분석 리포트

**문서 번호**: 222
**작성일**: 2025-12-07
**심각도**: 중간 (개발 환경 이슈)

---

## 1. 증상

### 1.1 시도한 명령어들
```bash
# 시도 1: cmd /c로 감싼 start 명령
cmd /c "start cmd /k \"cd /d c:\MYCLAUDE_PROJECT\pdf\backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000\""
# 결과: 인코딩 깨짐, 명령어 인식 실패

# 시도 2: 직접 start 명령
start cmd /k "cd /d c:\MYCLAUDE_PROJECT\pdf\backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
# 결과: 백그라운드로 실행되지만 중단됨 (Exit code 137)
```

### 1.2 에러 메시지
```
'\"cd /d c:\MYCLAUDE_PROJECT\pdf\backend && python -m uvicorn...'은(는) 내부 또는 외부 명령, 실행 가능한 프로그램, 또는 배치 파일이 아닙니다.
```

---

## 2. 원인 분석

### 2.1 중첩 따옴표 문제 (가장 가능성 높음)

```
문제 시나리오:
┌────────────────────────────────────────────────────────────┐
│ Claude Code Bash Tool                                      │
│   └─ Git Bash (MINGW64)                                   │
│        └─ cmd.exe                                          │
│             └─ start.exe                                   │
│                  └─ cmd.exe (새 창)                        │
└────────────────────────────────────────────────────────────┘

각 레이어에서 따옴표를 다르게 해석:
- Git Bash: 큰따옴표를 그대로 전달
- cmd.exe: 이스케이프된 따옴표 \" 처리
- start.exe: 추가 파싱 수행
→ 최종 명령어가 깨짐
```

### 2.2 Git Bash와 Windows cmd 호환성

| 환경 | 경로 구분자 | 따옴표 처리 |
|------|------------|------------|
| Git Bash | `/` (forward slash) | `"..."` 또는 `'...'` |
| Windows cmd | `\` (backslash) | `"..."` only |

```bash
# Git Bash에서 Windows 경로 사용 시 문제
cd /d c:\MYCLAUDE_PROJECT  # cmd.exe 문법
cd /c/MYCLAUDE_PROJECT     # Git Bash 문법
```

### 2.3 Exit Code 137

```
Exit code 137 = 128 + 9 = SIGKILL

의미: 프로세스가 강제 종료됨
원인:
- Claude Code가 백그라운드 프로세스를 kill
- 또는 사용자가 요청을 중단 (Request interrupted)
```

---

## 3. 해결 방안

### 3.1 방안 A: 배치 파일 생성 (권장)

```batch
:: start_servers.bat
@echo off
echo Starting Backend Server...
start "Backend" cmd /k "cd /d c:\MYCLAUDE_PROJECT\pdf\backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo Starting Frontend Server...
start "Frontend" cmd /k "cd /d c:\MYCLAUDE_PROJECT\pdf\frontend && npm run dev"

echo Servers starting...
timeout /t 5 /nobreak
echo Done!
```

**장점**:
- 따옴표 문제 없음
- 재사용 가능
- 수동 실행 가능

### 3.2 방안 B: PowerShell 사용

```powershell
# PowerShell에서 실행
Start-Process cmd -ArgumentList '/k', 'cd /d c:\MYCLAUDE_PROJECT\pdf\backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000'
```

### 3.3 방안 C: Git Bash 문법 사용

```bash
# Git Bash 경로 문법
cd /c/MYCLAUDE_PROJECT/pdf/backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
```

### 3.4 방안 D: 수동 실행 안내

사용자가 직접 새 터미널을 열어서 실행:

**터미널 1 (Backend)**:
```bash
cd c:\MYCLAUDE_PROJECT\pdf\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**터미널 2 (Frontend)**:
```bash
cd c:\MYCLAUDE_PROJECT\pdf\frontend
npm run dev
```

---

## 4. 추천 해결책

### 4.1 즉시 실행 (배치 파일)

```batch
:: c:\MYCLAUDE_PROJECT\pdf\start_dev.bat 생성
@echo off
start "PDF-Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --reload --port 8000"
timeout /t 2 /nobreak >nul
start "PDF-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Development servers starting...
```

### 4.2 사용법

```bash
# Claude Code에서 실행
cmd /c "c:\MYCLAUDE_PROJECT\pdf\start_dev.bat"

# 또는 사용자가 직접 더블클릭
```

---

## 5. 서버 상태 확인 방법

```bash
# 포트 확인
netstat -ano | findstr :8000  # Backend
netstat -ano | findstr :5173  # Frontend

# 프로세스 확인
tasklist | findstr python     # Backend
tasklist | findstr node       # Frontend
```

---

## 6. 결론

| 문제 | 원인 | 해결책 |
|------|------|--------|
| 명령어 인식 실패 | 중첩 따옴표 파싱 오류 | 배치 파일 사용 |
| Exit code 137 | 프로세스 강제 종료 | 백그라운드 대신 새 창 |
| 경로 문제 | Git Bash/cmd 호환성 | Windows 문법 사용 |

### 권장 조치
1. `start_dev.bat` 배치 파일 생성
2. Claude Code에서 배치 파일 실행
3. 또는 사용자가 수동으로 터미널 2개 열어서 실행

---

*배치 파일 생성: "배치파일 만들어줘"*
