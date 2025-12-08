# Phase 20-K: 이중 백슬래시 버그 완전 해결 개발 계획

## 개요

HWP 수식 변환 시 발생하는 이중 백슬래시 버그를 **완전히 해결**하기 위한 단계별 개발 계획입니다.

**작성일:** 2025-11-29
**Phase:** 20-K
**예상 단계:** 5단계
**목표:** 버그 완전 해결 + 재발 방지 체계 구축

---

## 전체 계획 요약

| 단계 | 이름 | 목적 | 예상 작업 |
|------|------|------|----------|
| 1 | 환경 정리 | 깨끗한 상태 확보 | 프로세스 종료, 캐시 삭제 |
| 2 | 코드 검증 | 수정 사항 확인 | 누락된 수정 적용 |
| 3 | 통합 테스트 | 실제 동작 확인 | 파싱 테스트, API 테스트 |
| 4 | 디버그 로깅 | 추적 가능성 확보 | 변환 과정 로깅 |
| 5 | 문서화 및 방지 | 재발 방지 | 가이드라인 작성 |

---

## 단계 1: 환경 정리 (Environment Cleanup)

### 1.1 목표
- 모든 이전 프로세스 종료
- Python 캐시 완전 삭제
- 깨끗한 상태에서 단일 서버 시작

### 1.2 작업 내용

#### 1.2.1 모든 Python 프로세스 종료

```powershell
# 1. 현재 실행 중인 Python 프로세스 확인
tasklist | findstr python

# 2. 포트 8000 사용 프로세스 확인
netstat -ano | findstr :8000

# 3. 모든 Python 프로세스 강제 종료
taskkill /F /IM python.exe /T

# 4. 종료 확인
tasklist | findstr python
```

#### 1.2.2 __pycache__ 삭제

```powershell
# backend 폴더 내 모든 __pycache__ 삭제
powershell -Command "Get-ChildItem -Path 'c:\MYCLAUDE_PROJECT\pdf\backend' -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force"

# 삭제 확인
powershell -Command "Get-ChildItem -Path 'c:\MYCLAUDE_PROJECT\pdf\backend' -Recurse -Directory -Filter '__pycache__' | Measure-Object"
```

#### 1.2.3 .pyc 파일 개별 삭제 (보조)

```powershell
# 모든 .pyc 파일 삭제
powershell -Command "Get-ChildItem -Path 'c:\MYCLAUDE_PROJECT\pdf\backend' -Recurse -Filter '*.pyc' | Remove-Item -Force"
```

#### 1.2.4 단일 서버 재시작

```bash
# 새 터미널에서 실행
cd c:\MYCLAUDE_PROJECT\pdf\backend
set PYTHONDONTWRITEBYTECODE=1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 1.3 완료 조건
- [ ] `tasklist | findstr python` → Python 프로세스가 uvicorn 1개만 실행
- [ ] `netstat -ano | findstr :8000` → 포트 8000 사용 프로세스 1개
- [ ] `__pycache__` 폴더 0개

---

## 단계 2: 코드 검증 (Code Verification)

### 2.1 목표
- 모든 수정 사항이 올바르게 적용되었는지 확인
- 누락된 수정 발견 및 적용

### 2.2 검증 대상 파일

#### 2.2.1 `hwp_latex_converter.py` 검증

| 위치 | 검증 항목 | 예상 패턴 |
|------|----------|----------|
| Line 552 | `_convert_basic_commands()` | `r'(?<!\\)\b' + re.escape(hwp_cmd) + r'(?![a-zA-Z])'` |
| Line 365 | `_convert_decorations()` 단순 패턴 | `rf'(?<!\\)\b{deco}\s*\{{'` |
| Line 372 | `_convert_decorations()` 중괄호 없음 | `rf'(?<!\\)\b{deco}([A-Za-z0-9]+)'` |

**추가 수정 필요 (발견됨):**

Line 335-360의 복합 패턴 #1~#4에도 `(?<!\\)` 추가:

```python
# 기존 (문제 있음)
text = re.sub(
    rf'\b{deco}\s*\{{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}}',
    rf'\\{deco}{{\\mathrm{{\1}}}}',
    text
)

# 수정 ((?<!\\) 추가)
text = re.sub(
    rf'(?<!\\)\b{deco}\s*\{{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}}',
    rf'\\{deco}{{\\mathrm{{\1}}}}',
    text
)
```

#### 2.2.2 `hml_parser.py` 검증

| 위치 | 검증 항목 | 예상 패턴 |
|------|----------|----------|
| Line 94-97 | `clean_hwp_equation()` | `r'\bGEQ(?![a-zA-Z])'` 등 |
| Line 120-136 | 장식 기호 패턴 | `r'\boverline\s*\{([^}]*)\}'` 등 |

### 2.3 수정 작업

#### 2.3.1 복합 패턴 수정 (hwp_latex_converter.py)

```python
# Line 335: 패턴 #1
text = re.sub(
    rf'(?<!\\)\b{deco}\s*\{{\{{rm\{{([^}}]*)\}}\}}\s*it\s*\}}',
    rf'\\{deco}{{\\mathrm{{\1}}}}',
    text
)

# Line 342: 패턴 #2
text = re.sub(
    rf'(?<!\\)\b{deco}\s*\{{\{{rm\{{([^}}]*)\}}\}}\}}',
    rf'\\{deco}{{\\mathrm{{\1}}}}',
    text
)

# Line 349: 패턴 #3
text = re.sub(
    rf'(?<!\\)\b{deco}\s*\{{\{{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}}\}}',
    rf'\\{deco}{{\\mathrm{{\1}}}}',
    text
)

# Line 356: 패턴 #4
text = re.sub(
    rf'(?<!\\)\b{deco}\s*\{{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}}',
    rf'\\{deco}{{\\mathrm{{\1}}}}',
    text
)
```

### 2.4 완료 조건
- [ ] 모든 정규식 패턴에 `(?<!\\)` 적용 확인
- [ ] 코드 문법 오류 없음 확인 (Python import 테스트)

---

## 단계 3: 통합 테스트 (Integration Testing)

### 3.1 목표
- 수정된 코드가 실제 환경에서 정상 동작하는지 확인
- 단위 테스트 + API 테스트 + UI 테스트

### 3.2 테스트 케이스

#### 3.2.1 단위 테스트 스크립트

```python
# test_latex_converter.py
import sys
sys.path.insert(0, 'c:/MYCLAUDE_PROJECT/pdf/backend')

from app.services.hangul.hwp_latex_converter import hwp_to_latex

# 테스트 케이스
test_cases = [
    # (입력, 예상 출력, 설명)
    ('GEQ 0', r'\geq 0', 'GEQ with space'),
    ('geq0', r'\geq0', 'geq without space'),
    ('LEQ 5', r'\leq 5', 'LEQ with space'),
    ('leq5', r'\leq5', 'leq without space'),
    ('overline{ rm AB it }', r'\overline{\mathrm{AB}}', 'overline complex'),
    ('overlineAB', r'\overline{AB}', 'overline simple'),
    ('x GEQ 5 AND y LEQ 10', r'x \geq 5 AND y \leq 10', 'multiple commands'),
]

print("=== HWP to LaTeX 변환 테스트 ===\n")

all_passed = True
for hwp_input, expected, desc in test_cases:
    result = hwp_to_latex(hwp_input)

    # 백슬래시 개수 확인
    backslash_count = result.count('\\')
    expected_count = expected.count('\\')

    passed = (result == expected)
    status = "PASS" if passed else "FAIL"

    if not passed:
        all_passed = False

    print(f"[{status}] {desc}")
    print(f"  입력: {repr(hwp_input)}")
    print(f"  결과: {repr(result)} (백슬래시: {backslash_count}개)")
    print(f"  예상: {repr(expected)} (백슬래시: {expected_count}개)")
    print()

print("=" * 50)
print(f"결과: {'모든 테스트 통과!' if all_passed else '일부 테스트 실패'}")
```

#### 3.2.2 API 테스트

```python
# test_api.py
import requests

BASE_URL = "http://localhost:8000"

# 1. 서버 상태 확인
response = requests.get(f"{BASE_URL}/api/health")
print(f"서버 상태: {response.status_code}")

# 2. HML 파일 파싱 테스트
# (이미 업로드된 파일이 있다면)
response = requests.get(f"{BASE_URL}/api/hangul/documents")
print(f"문서 목록: {response.json()}")

# 3. 특정 문제의 content_latex 확인
# 문제 15, 16, 17 확인
for problem_num in [15, 16, 17]:
    response = requests.get(f"{BASE_URL}/api/hangul/problems/{problem_num}")
    if response.status_code == 200:
        data = response.json()
        latex = data.get('content_latex', '')

        # 이중 백슬래시 검사
        double_backslash = '\\\\' in latex
        print(f"문제 {problem_num}: {'이중백슬래시 발견!' if double_backslash else '정상'}")
        print(f"  content_latex 일부: {latex[:100]}...")
```

#### 3.2.3 브라우저 UI 테스트

1. http://localhost:5173 접속
2. HML 파일 업로드 (또는 기존 파일 선택)
3. "다시 파싱" 버튼 클릭
4. 문제 15, 16, 17 확인:
   - `≥` 기호가 정상 표시되는지
   - `overline` 위에 선이 표시되는지
   - KaTeX 렌더링 오류가 없는지

### 3.3 완료 조건
- [ ] 단위 테스트 모든 케이스 PASS
- [ ] API 테스트에서 이중 백슬래시 미발견
- [ ] UI에서 KaTeX 렌더링 정상

---

## 단계 4: 디버그 로깅 추가 (Debug Logging)

### 4.1 목표
- 변환 과정 추적 가능하게 만들기
- 향후 문제 발생 시 빠른 진단

### 4.2 로깅 추가 위치

#### 4.2.1 hwp_latex_converter.py

```python
import logging

logger = logging.getLogger(__name__)

class HwpLatexConverter:
    def convert(self, hwp_eq: str) -> str:
        logger.debug(f"[HwpLatexConverter] 입력: {repr(hwp_eq)}")

        # ... 기존 변환 로직 ...

        logger.debug(f"[HwpLatexConverter] 출력: {repr(text)}")
        return text

    def _convert_basic_commands(self, text: str) -> str:
        original = text
        # ... 변환 로직 ...
        if original != text:
            logger.debug(f"[_convert_basic_commands] {repr(original)} -> {repr(text)}")
        return text
```

#### 4.2.2 hml_parser.py

```python
import logging

logger = logging.getLogger(__name__)

def clean_hwp_equation(text: str) -> str:
    """Phase 19-F: HWP 수식 정리 (plain text용)"""
    original = text
    # ... 변환 로직 ...
    if original != text:
        logger.debug(f"[clean_hwp_equation] {repr(original)} -> {repr(text)}")
    return text
```

#### 4.2.3 로깅 설정 (main.py)

```python
import logging

# 개발 환경에서 DEBUG 레벨 로깅
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 특정 모듈만 DEBUG
logging.getLogger('app.services.hangul.hwp_latex_converter').setLevel(logging.DEBUG)
logging.getLogger('app.services.hangul.hml_parser').setLevel(logging.DEBUG)
```

### 4.3 완료 조건
- [ ] 변환 시 콘솔에 로그 출력 확인
- [ ] 입력/출력 추적 가능

---

## 단계 5: 문서화 및 재발 방지 (Documentation & Prevention)

### 5.1 목표
- 문제 해결 과정 문서화
- 재발 방지 가이드라인 수립

### 5.2 문서화 작업

#### 5.2.1 해결 리포트 작성

```markdown
# Phase 20-K 완료 리포트

## 문제
- HWP 수식 변환 시 이중 백슬래시 발생

## 원인
1. 다중 서버 실행으로 인한 코드 버전 불일치
2. Python 캐시(__pycache__)로 인한 이전 코드 실행
3. 일부 정규식 패턴에 (?<!\\) 누락

## 해결
1. 환경 정리 (프로세스 종료, 캐시 삭제)
2. 모든 패턴에 (?<!\\) 적용
3. 디버그 로깅 추가

## 테스트 결과
- 단위 테스트: PASS
- API 테스트: PASS
- UI 테스트: PASS
```

#### 5.2.2 개발 가이드라인 추가 (CLAUDE.md)

```markdown
## 서버 관리 규칙

### 서버 실행 전 확인
1. `netstat -ano | findstr :8000` 으로 기존 프로세스 확인
2. 기존 프로세스가 있으면 `taskkill /F /PID {PID}` 로 종료
3. 하나의 터미널에서만 서버 실행

### 코드 수정 후 확인
1. 서버 자동 리로드 확인 (uvicorn 로그)
2. 리로드 안되면 서버 재시작
3. 필요시 `__pycache__` 삭제

### 정규식 패턴 규칙
- 이미 변환된 LaTeX 재매칭 방지: `(?<!\\)` 사용
- 단어 경계 + 백슬래시 제외: `(?<!\\)\b`
```

### 5.3 완료 조건
- [ ] 해결 리포트 작성 완료
- [ ] CLAUDE.md 가이드라인 추가
- [ ] Phase 20-K 종료

---

## 실행 체크리스트

### 단계 1: 환경 정리
- [ ] Python 프로세스 전체 종료
- [ ] __pycache__ 삭제
- [ ] 단일 서버 재시작
- [ ] 프로세스 1개 확인

### 단계 2: 코드 검증
- [ ] hwp_latex_converter.py 패턴 확인
- [ ] 복합 패턴 #1~#4에 (?<!\\) 추가
- [ ] hml_parser.py 확인
- [ ] Python import 테스트

### 단계 3: 통합 테스트
- [ ] 단위 테스트 실행
- [ ] API 테스트 실행
- [ ] UI 테스트 완료

### 단계 4: 디버그 로깅
- [ ] hwp_latex_converter.py 로깅 추가
- [ ] hml_parser.py 로깅 추가
- [ ] 로그 출력 확인

### 단계 5: 문서화
- [ ] 해결 리포트 작성
- [ ] CLAUDE.md 업데이트
- [ ] Phase 완료 선언

---

## 위험 요소 및 대응

| 위험 | 가능성 | 영향 | 대응 |
|------|--------|------|------|
| 프로세스 종료 실패 | 낮음 | 높음 | 작업 관리자에서 수동 종료 |
| 캐시 삭제 실패 | 낮음 | 중간 | 폴더 수동 삭제 |
| 정규식 패턴 오류 | 중간 | 높음 | 단위 테스트로 검증 |
| 서버 재시작 실패 | 낮음 | 높음 | 포트 충돌 확인 후 재시도 |

---

## 예상 소요 시간

| 단계 | 예상 시간 |
|------|----------|
| 단계 1 | 5분 |
| 단계 2 | 10분 |
| 단계 3 | 15분 |
| 단계 4 | 10분 |
| 단계 5 | 10분 |
| **총계** | **~50분** |

---

*계획 작성: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
