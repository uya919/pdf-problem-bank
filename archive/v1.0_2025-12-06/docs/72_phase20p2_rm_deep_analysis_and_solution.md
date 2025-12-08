# Phase 20-P-2: RM 대문자 버그 심층 분석 및 해결 리포트

## 개요

**작성일:** 2025-11-29
**Phase:** 20-P-2
**상태:** 근본 원인 확인 - 해결 방법 제시
**심각도:** 중간

---

## 1. 문제 현상

### 1.1 사용자 보고

프론트엔드에서 문제 16에 다음과 같이 표시됨:

```
점 $RMA$의 좌표가 $(-3, 1)$이고
```

**기대 결과:**
```
점 $\mathrm{A}$의 좌표가 $(-3, 1)$이고
```

### 1.2 사용자가 시도한 방법 (모두 실패)

1. 백엔드 서버 재시작
2. 페이지 리로드
3. "다시 파싱" 버튼 클릭
4. 브라우저 캐시 삭제
5. 시크릿 모드 테스트

---

## 2. 심층 분석 결과

### 2.1 코드 검증 - 정상 ✓

직접 Python 테스트 실행 결과:

```python
# backend/test_rm_debug.py 실행 결과
'RM A'     -> '\\mathrm{A}'    ✓
'rm A'     -> '\\mathrm{A}'    ✓
'RM ABC'   -> '\\mathrm{ABC}'  ✓
'RM - 2'   -> '-2'             ✓
'RM A`'    -> '\\mathrm{A}'    ✓  # HML 파일의 실제 패턴
```

**결론:** 코드 수정은 완료되었으며 정상 작동함.

### 2.2 코드 파일 확인 - 정상 ✓

**hwp_latex_converter.py:231**
```python
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)', re.IGNORECASE)
```

**hwp_latex_converter.py:240**
```python
self.rm_negative_pattern = re.compile(r'\brm\s+-\s*(\d+)', re.IGNORECASE)
```

**hml_parser.py:876**
```python
content = re.sub(r'\brm\s+-\s*(\d+)', r'-\1', content, flags=re.IGNORECASE)
```

### 2.3 근본 원인 발견 - 다중 서버 프로세스

```
netstat -ano | findstr :8000

TCP  0.0.0.0:8000  0.0.0.0:0  LISTENING  55872
TCP  0.0.0.0:8000  0.0.0.0:0  LISTENING  57316  ← 2개 서버!
```

**문제:**
- 포트 8000에 **2개의 uvicorn 서버**가 동시에 실행 중
- 프론트엔드 요청이 **이전 코드를 사용하는 서버**로 라우팅됨
- 브라우저 캐시 삭제/시크릿 모드가 효과 없음 (서버 문제)

---

## 3. 해결 방법

### 방법 A: 모든 Python 프로세스 종료 후 재시작 (권장)

**단계 1: 모든 uvicorn 프로세스 종료**

```powershell
# PowerShell에서 실행
Get-Process -Name python | Where-Object { $_.CommandLine -like "*uvicorn*" } | Stop-Process -Force

# 또는 간단히 모든 Python 종료
taskkill /F /IM python.exe
```

**단계 2: __pycache__ 삭제**

```powershell
cd c:\MYCLAUDE_PROJECT\pdf\backend
Get-ChildItem -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force
```

**단계 3: 새 서버 시작**

```powershell
cd c:\MYCLAUDE_PROJECT\pdf\backend
$env:PYTHONDONTWRITEBYTECODE = 1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**단계 4: 프론트엔드에서 파일 다시 업로드**

- http://localhost:5173 접속
- HML 파일 다시 업로드 (새 파싱)

### 방법 B: 개발 스크립트 사용

```powershell
cd c:\MYCLAUDE_PROJECT\pdf\backend
.\dev.ps1
```

`dev.ps1` 스크립트가 자동으로:
- `__pycache__` 정리
- `PYTHONDONTWRITEBYTECODE=1` 설정
- 깨끗한 서버 시작

---

## 4. 검증 방법

### 4.1 서버 상태 확인

```powershell
netstat -ano | findstr :8000
# 하나의 LISTENING 프로세스만 있어야 함
```

### 4.2 변환 테스트

```powershell
cd c:\MYCLAUDE_PROJECT\pdf\backend
python test_rm_debug.py
```

예상 출력:
```
=== hwp_to_latex 테스트 ===
  'RM A'               -> '\\mathrm{A}'
  'rm A'               -> '\\mathrm{A}'
  'RM ABC'             -> '\\mathrm{ABC}'
  'RM - 2'             -> '-2'
  'RM A`'              -> '\\mathrm{A}'
```

### 4.3 프론트엔드 확인

1. http://localhost:5173 접속
2. HML 파일 업로드
3. 문제 16 확인:
   - **수정 전:** `점 $RMA$의 좌표가`
   - **수정 후:** `점 $\mathrm{A}$의 좌표가` (또는 단순히 A)

---

## 5. 테스트 결과 요약

| 항목 | 상태 |
|------|------|
| hwp_latex_converter.py rm_pattern | ✅ IGNORECASE 적용됨 |
| hml_parser.py _fix_rm_patterns_in_latex | ✅ IGNORECASE 적용됨 |
| 직접 Python 테스트 | ✅ 모든 RM 패턴 정상 변환 |
| 단위 테스트 36개 | ✅ 모두 통과 |
| **서버 프로세스** | ❌ 다중 프로세스 실행 (원인) |

---

## 6. 결론

### 6.1 근본 원인

**다중 uvicorn 서버 프로세스**

코드 수정 전에 시작된 서버 프로세스가 아직 실행 중이며,
프론트엔드 요청이 이전 코드를 사용하는 서버로 라우팅되고 있음.

### 6.2 해결 방법 요약

1. **모든 Python 프로세스 종료**: `taskkill /F /IM python.exe`
2. **__pycache__ 삭제**: `Get-ChildItem -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force`
3. **새 서버 시작**: `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
4. **파일 다시 업로드**: 프론트엔드에서 HML 파일 새로 업로드

### 6.3 예방 조치

향후 코드 수정 후에는:
1. 개발 스크립트 `dev.ps1` 사용 권장
2. 서버 시작 전 `netstat -ano | findstr :8000`으로 기존 프로세스 확인
3. `PYTHONDONTWRITEBYTECODE=1` 환경 변수 사용

---

*Phase 20-P-2 심층 분석 완료: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
