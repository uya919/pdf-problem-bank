# 서버 시작 명령어 문제 분석 리포트

> 작성일: 2025-12-06

---

## 1. 문제 상황

Claude Code에서 개발 서버 시작 명령어가 작동하지 않음

### 시도한 명령어 (실패)
```bash
# 방법 1: cmd /c + start cmd /k (이스케이프 방식)
cmd /c "start cmd /k \"cd /d c:\MYCLAUDE_PROJECT\pdf\backend && python -m uvicorn ...\""

# 방법 2: start cmd /k 직접 실행
start cmd /k "cd /d c:\MYCLAUDE_PROJECT\pdf\backend && python -m uvicorn ..."

# 방법 3: cmd /c + 더블 쿼트 이스케이프
cmd /c "start cmd /k ""cd /d c:\MYCLAUDE_PROJECT\pdf\backend && python -m uvicorn ..."""
```

모든 방법에서 서버가 시작되지 않거나 포트가 열리지 않음

---

## 2. 원인 분석

### 핵심 발견: 실행 환경

```bash
$ echo $SHELL && uname -a
/usr/bin/bash
MINGW64_NT-10.0-26200 min 3.6.3-7674c51e.x86_64 2025-07-01 09:13 UTC x86_64 Msys
```

**Claude Code는 Windows cmd가 아닌 MINGW64 (Git Bash) 환경에서 실행됨**

### 문제의 근본 원인

| 요소 | 설명 |
|------|------|
| **실행 환경** | MINGW64 (Git Bash) - Unix 계열 쉘 |
| **`start cmd /k`** | 새 Windows CMD 창을 열려고 시도 |
| **GUI 창** | MINGW64 환경에서 GUI 창을 열 수 없음 |
| **경로 형식** | Windows 경로(`c:\...`)가 아닌 Unix 경로(`/c/...`) 필요 |

### `start cmd /k`가 실패한 이유

1. `start`는 Windows 내부 명령어로 새 창(GUI)을 엽니다
2. MINGW64는 터미널 기반 환경으로 GUI 창을 생성할 수 없음
3. 명령어 자체는 실행되지만, 새 창이 열리지 않아 프로세스가 즉시 종료

### `cmd /c` 직접 실행이 실패한 이유

```bash
# 이 명령어도 출력이 캡처되지 않음
cmd /c "cd /d c:\MYCLAUDE_PROJECT\pdf\backend && python -m uvicorn ..."
```

- `cmd /c`는 명령 완료 후 즉시 종료됨
- uvicorn 같은 지속 실행 프로세스에는 부적합

---

## 3. 해결 방법

### 작동하는 명령어 형식

```bash
# Git Bash 스타일 경로 + run_in_background
cd /c/MYCLAUDE_PROJECT/pdf/backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

cd /c/MYCLAUDE_PROJECT/pdf/frontend && npm run dev
```

### 핵심 포인트

| 항목 | 이전 (실패) | 수정 (성공) |
|------|-------------|-------------|
| **경로** | `c:\MYCLAUDE_PROJECT\...` | `/c/MYCLAUDE_PROJECT/...` |
| **창 관리** | `start cmd /k` (새 창) | `run_in_background: true` |
| **명령어** | `cmd /c "..."` | 직접 bash 명령어 |

---

## 4. 권장 서버 시작 명령어

### 백엔드 시작
```bash
cd /c/MYCLAUDE_PROJECT/pdf/backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# run_in_background: true 옵션 필요
```

### 프론트엔드 시작
```bash
cd /c/MYCLAUDE_PROJECT/pdf/frontend && npm run dev
# run_in_background: true 옵션 필요
```

### 서버 확인
```bash
netstat -ano | grep :8000  # 백엔드
netstat -ano | grep :5173  # 프론트엔드
```

### 서버 종료
```bash
# 프로세스 ID 확인 후
taskkill /F /PID <PID>
```

---

## 5. CLAUDE.md 업데이트 권장사항

```markdown
## 5. 개발 서버 실행 (Claude Code 환경)

### Claude Code에서 직접 실행
bash
# 백엔드 (백그라운드 실행)
cd /c/MYCLAUDE_PROJECT/pdf/backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 프론트엔드 (백그라운드 실행)
cd /c/MYCLAUDE_PROJECT/pdf/frontend && npm run dev


### 수동 실행 (VSCode 터미널)
bash
# 터미널 1 - 백엔드
cd c:\MYCLAUDE_PROJECT\pdf\backend
python -m uvicorn app.main:app --reload --port 8000

# 터미널 2 - 프론트엔드
cd c:\MYCLAUDE_PROJECT\pdf\frontend
npm run dev

```

---

## 6. 결론

| 항목 | 내용 |
|------|------|
| **문제** | `start cmd /k` 명령어가 MINGW64 환경에서 작동하지 않음 |
| **원인** | Claude Code가 Git Bash (MINGW64) 환경에서 실행되어 GUI 창 생성 불가 |
| **해결** | Unix 스타일 경로 + `run_in_background` 옵션 사용 |
| **상태** | 해결됨 - 두 서버 모두 정상 시작 |

---

*v1.0 - 2025-12-06*
