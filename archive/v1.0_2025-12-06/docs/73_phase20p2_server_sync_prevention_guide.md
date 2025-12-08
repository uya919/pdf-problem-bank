# Phase 20-P-2: 서버 동기화 문제 예방 가이드

## 개요

**작성일:** 2025-11-29
**Phase:** 20-P-2
**목적:** "코드는 수정됐는데 프론트엔드에서 안 보이는" 문제 예방

---

## 1. 문제 상황 요약

### 1.1 증상

```
Claude: "코드 수정 완료! 테스트 통과!"
사용자: "프론트엔드에서 여전히 에러가 보여요"
Claude: "브라우저 캐시 삭제해보세요"
사용자: "했는데도 안 돼요"
Claude: "시크릿 모드로 해보세요"
사용자: "그래도 안 돼요"
... (반복)
```

### 1.2 근본 원인

**다중 uvicorn 서버 프로세스**

```
netstat -ano | findstr :8000

TCP  0.0.0.0:8000  LISTENING  55872  ← 이전 코드
TCP  0.0.0.0:8000  LISTENING  57316  ← 이전 코드
```

- 서버를 재시작해도 **이전 프로세스가 종료되지 않음**
- 새 서버가 시작되어도 요청이 **이전 서버로 라우팅**될 수 있음
- 브라우저 캐시와 **무관한 서버 측 문제**

---

## 2. 해결 방법 (우선순위 순)

### 방법 1: 개발 스크립트 사용 (권장)

```powershell
cd c:\MYCLAUDE_PROJECT\pdf\backend
.\dev.ps1
```

`dev.ps1`이 자동으로:
- 기존 Python 프로세스 정리
- `__pycache__` 삭제
- `PYTHONDONTWRITEBYTECODE=1` 설정
- 깨끗한 서버 시작

### 방법 2: 수동 정리

```powershell
# 1. 모든 Python 프로세스 종료
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. __pycache__ 삭제
Get-ChildItem -Recurse -Directory -Filter '__pycache__' -Path 'c:\MYCLAUDE_PROJECT\pdf\backend' | Remove-Item -Recurse -Force

# 3. 포트 확인 (LISTENING이 없어야 함)
netstat -ano | findstr :8000

# 4. 새 서버 시작
$env:PYTHONDONTWRITEBYTECODE = 1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 방법 3: PID로 직접 종료

```powershell
# 포트 사용 프로세스 확인
netstat -ano | findstr :8000

# 출력 예시:
# TCP  0.0.0.0:8000  LISTENING  12345

# 해당 PID 종료
taskkill /F /PID 12345
```

---

## 3. 예방 체크리스트

### 3.1 코드 수정 후 필수 확인

```
□ 1. netstat -ano | findstr :8000 실행
□ 2. LISTENING 프로세스가 1개인지 확인
□ 3. 여러 개면 모두 종료 후 재시작
□ 4. HML 파일 다시 업로드 (기존 파싱 결과 무효)
```

### 3.2 서버 시작 전 확인

```powershell
# 포트가 비어있는지 확인
netstat -ano | findstr :8000
# 출력이 없으면 OK
```

### 3.3 Claude Code 작업 시 규칙

1. **서버 재시작 요청 시**: 항상 기존 프로세스 먼저 종료
2. **코드 수정 후**: `__pycache__` 삭제 권장
3. **"프론트엔드에서 안 보여요" 신고 시**:
   - 브라우저 캐시보다 **서버 프로세스 먼저 확인**
   - `netstat -ano | findstr :8000` 실행

---

## 4. 자동화 개선 방안

### 4.1 dev.ps1 개선 (이미 적용됨)

```powershell
# backend/dev.ps1
# 기존 프로세스 정리 로직 포함

# 1. 기존 Python 프로세스 종료
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. __pycache__ 정리
Get-ChildItem -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force

# 3. 환경 변수 설정
$env:PYTHONDONTWRITEBYTECODE = 1
$env:APP_ENV = "development"

# 4. 서버 시작
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4.2 포트 충돌 자동 감지 (제안)

서버 시작 시 포트 충돌을 자동 감지하고 경고:

```python
# app/main.py에 추가 가능
import socket

def check_port_available(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) != 0

# 서버 시작 전 체크
if not check_port_available(8000):
    print("WARNING: Port 8000 is already in use!")
    print("Run: netstat -ano | findstr :8000")
```

---

## 5. 문제 진단 플로우차트

```
프론트엔드에서 수정이 안 보임
         ↓
    브라우저 문제인가?
         ↓
    [시크릿 모드 테스트]
         ↓
    여전히 안 보임?
         ↓ YES
    서버 프로세스 확인
    netstat -ano | findstr :8000
         ↓
    프로세스가 2개 이상?
         ↓ YES
    모든 Python 종료 후 재시작
         ↓
    HML 파일 다시 업로드
```

---

## 6. 핵심 교훈

### 6.1 "브라우저 캐시" 함정

- 사용자가 "캐시 삭제했는데도 안 돼요"라고 하면
- **서버 측 문제일 가능성이 높음**
- 브라우저 캐시 삭제는 **클라이언트 측 캐시**만 해결

### 6.2 Python 바이트코드 캐시

- `__pycache__` 폴더에 `.pyc` 파일 저장
- 코드 수정 후에도 **이전 바이트코드 사용** 가능
- `PYTHONDONTWRITEBYTECODE=1`로 예방

### 6.3 다중 프로세스 문제

- Windows에서 서버 재시작 시 **이전 프로세스가 남을 수 있음**
- 특히 `--reload` 옵션 사용 시 **자식 프로세스** 문제
- 항상 `netstat`으로 확인하는 습관 필요

---

## 7. 빠른 참조 명령어

```powershell
# 포트 8000 사용 프로세스 확인
netstat -ano | findstr :8000

# 모든 Python 프로세스 종료
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

# __pycache__ 삭제
Get-ChildItem -Recurse -Directory -Filter '__pycache__' -Path 'c:\MYCLAUDE_PROJECT\pdf\backend' | Remove-Item -Recurse -Force

# 깨끗한 서버 시작
$env:PYTHONDONTWRITEBYTECODE = 1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 또는 개발 스크립트 사용 (권장)
.\dev.ps1
```

---

## 8. 결론

### 8.1 문제 예방 3원칙

1. **서버 재시작 전**: 기존 프로세스 종료 확인
2. **코드 수정 후**: `__pycache__` 삭제
3. **"안 보여요" 신고 시**: 서버 프로세스 먼저 확인

### 8.2 권장 워크플로우

```
코드 수정 → dev.ps1 실행 → 파일 다시 업로드 → 확인
```

이 워크플로우를 따르면 "코드는 됐는데 프론트엔드에서 안 보이는" 문제를 예방할 수 있습니다.

---

*Phase 20-P-2 예방 가이드 작성: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
