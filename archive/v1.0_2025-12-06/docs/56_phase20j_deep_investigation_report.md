# Phase 20-J: 이중 백슬래시 버그 심층 조사 리포트

## 개요

HWP 수식의 `GEQ`, `overline` 등이 LaTeX로 변환될 때 이중 백슬래시가 생성되어 KaTeX 렌더링이 실패하는 문제에 대한 **심층 조사 리포트**입니다.

**작성일:** 2025-11-29
**Phase:** 20-J
**상태:** 조사 진행 중
**목적:** 동일 오류 반복 원인 규명 (개발 전 분석)

---

## 1. 문제 요약

### 1.1 증상
- 문제 15, 16, 17에서 `geq0`, `overlineAB` 등이 LaTeX로 변환되지 않음
- 다시 파싱, 하드 리로드해도 동일 증상 지속
- 수정 후에도 같은 오류가 반복됨

### 1.2 사용자 질문
> "너가 자체 테스트 할때는 정상으로 되니? 내가 볼땐 왜 계속 같은 오류가 반복될까?"

---

## 2. 코드 현황 분석

### 2.1 변환 파이프라인 순서 (`convert()` 메서드)

```python
# hwp_latex_converter.py:239-284
def convert(self, hwp_eq: str) -> str:
    text = hwp_eq

    # 1. 전처리 (_preprocess)
    # 2. cases 변환 (_convert_cases)
    # 3. 장식 기호 변환 (_convert_decorations)  ← overline 처리
    # 4. 괄호 처리 (_convert_brackets)
    # 5. 분수 처리 (_convert_fractions)
    # 6. 제곱근 처리 (_convert_sqrt)
    # 7. 위첨자/아래첨자 처리 (_convert_scripts)
    # 8. 글꼴 명령어 처리 (_convert_font_commands)
    # 9. 기본 명령어 변환 (_convert_basic_commands)  ← geq/leq 처리
    # 10. 후처리 (_postprocess)

    return text
```

### 2.2 적용된 수정사항 (Phase 20-I)

#### `_convert_basic_commands()` - Line 552
```python
# Phase 20-I: 이중 변환 버그 수정
# (?<!\\): 백슬래시 뒤에서는 매칭 안함
pattern = r'(?<!\\)\b' + re.escape(hwp_cmd) + r'(?![a-zA-Z])'
```

#### `_convert_decorations()` - Line 365, 372
```python
# 단순 패턴: Phase 20-I 수정됨
pattern = rf'(?<!\\)\b{deco}\s*\{{'  # Line 365
pattern_no_brace = rf'(?<!\\)\b{deco}([A-Za-z0-9]+)'  # Line 372
```

---

## 3. 발견된 잠재적 문제점

### 3.1 복합 패턴에 `(?<!\\)` 누락

**중요**: `_convert_decorations()`의 복합 패턴 #1~#4에는 `(?<!\\)`가 **없습니다**:

```python
# Line 335-360 - 모두 (?<!\\) 없음!
# 패턴 #1: rf'\b{deco}\s*\{{\{{rm\{{([^}}]*)\}}\}}\s*it\s*\}}'
# 패턴 #2: rf'\b{deco}\s*\{{\{{rm\{{([^}}]*)\}}\}}\}}'
# 패턴 #3: rf'\b{deco}\s*\{{\{{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}}\}}'
# 패턴 #4: rf'\b{deco}\s*\{{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}}'
```

**분석**: 이 패턴들은 특정 형태 (`deco{ rm ABC it }`)만 매칭하므로, 이미 변환된 `\overline{\mathrm{ABC}}`는 재매칭되지 않습니다. 따라서 이것은 현재 버그의 직접적 원인은 아닐 가능성이 높습니다.

### 3.2 다중 백그라운드 서버 실행

현재 **20개 이상의 백그라운드 프로세스**가 실행 중입니다:

```
Background Bash 685482: uvicorn app.main:app
Background Bash 88f253: uvicorn app.main:app
Background Bash d1ba0e: uvicorn app.main:app
Background Bash a46f1d: uvicorn app.main:app
Background Bash 29732a: uvicorn app.main:app
... (등등)
```

**문제점**:
1. 어떤 서버가 실제로 요청을 처리하는지 불분명
2. 이전 버전의 코드가 메모리에 로드된 서버가 처리할 수 있음
3. 포트 충돌로 인해 예상치 못한 동작 발생 가능

### 3.3 Python 캐시 문제

`__pycache__` 폴더에 이전 버전의 컴파일된 바이트코드가 남아있을 수 있습니다.

```
backend/app/services/hangul/__pycache__/
    hwp_latex_converter.cpython-311.pyc  ← 이전 버전?
```

### 3.4 싱글톤 패턴과 개발 환경 감지

```python
# hwp_latex_converter.py:595-621
def _should_recreate_converter() -> bool:
    if _converter is None:
        return True

    # 프로덕션 환경: 재생성 안함
    app_env = _os.getenv('APP_ENV', 'development').lower()
    if app_env in ('prod', 'production'):
        return False

    # 개발 환경: 파일 변경 시 재생성
    current_mtime = _os.path.getmtime(__file__)
    if current_mtime != _converter_file_mtime:
        return True
```

**문제점**:
- 서버가 여러 개 실행 중이면 각각 자체 싱글톤 인스턴스를 가짐
- `APP_ENV` 환경 변수 설정에 따라 동작이 달라짐
- 파일 수정 시간으로 재생성을 판단하므로, 동일 시간에 수정된 경우 재생성 안됨

---

## 4. 근본 원인 가설

### 가설 A: 다중 서버 혼란
**신뢰도: 높음**

여러 uvicorn 서버가 동시에 실행되고 있어, 수정된 코드가 아닌 **이전 버전의 서버**가 요청을 처리하고 있을 가능성이 높습니다.

### 가설 B: Python 캐시
**신뢰도: 중간**

`__pycache__`의 `.pyc` 파일이 이전 버전 코드를 포함하고 있어, 서버가 새 코드 대신 캐시된 바이트코드를 사용할 수 있습니다.

### 가설 C: 싱글톤 캐싱
**신뢰도: 중간**

같은 서버 프로세스 내에서 `_converter` 싱글톤이 이전 코드로 초기화되어 있고, 파일 mtime 체크가 제대로 작동하지 않을 수 있습니다.

### 가설 D: 코드 수정 누락
**신뢰도: 낮음**

분석 결과 `_convert_basic_commands()`와 `_convert_decorations()`의 주요 패턴에는 `(?<!\\)`가 적용되어 있습니다. 단, 복합 패턴 #1~#4에는 누락되어 있으나, 현재 버그와 직접적 관련은 낮습니다.

---

## 5. 이론 vs 실제 차이

### 5.1 단위 테스트 (이론)

```python
hwp_to_latex("GEQ 0")      # 예상: '\\geq 0' (1 백슬래시)
hwp_to_latex("geq0")       # 예상: '\\geq0' (1 백슬래시)
hwp_to_latex("overlineAB") # 예상: '\\overline{AB}' (1 백슬래시)
```

### 5.2 실제 앱 동작 (현실)

사용자 보고에 따르면 여전히 이중 백슬래시 또는 변환 실패가 발생합니다:
- `geq0` → 그대로 표시
- `overlineAB` → 그대로 표시

### 5.3 차이 원인

**실제 파싱 파이프라인**과 **단위 테스트 환경**이 다릅니다:
1. 단위 테스트: 수정된 코드를 새로 로드
2. 실제 앱: 이미 실행 중인 서버의 메모리에 로드된 코드 사용

---

## 6. 검증 방법 제안

### 6.1 서버 환경 정리 (필수)

```bash
# 모든 Python/uvicorn 프로세스 종료
taskkill //F //IM python.exe
taskkill //F //IM uvicorn.exe

# __pycache__ 삭제
powershell -Command "Get-ChildItem -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force"

# 단일 서버만 재시작
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6.2 디버그 로깅 추가

`hwp_latex_converter.py`에 임시 로깅 추가:

```python
def _convert_basic_commands(self, text: str) -> str:
    print(f"[DEBUG] _convert_basic_commands 입력: {repr(text)}")
    # ... 변환 로직 ...
    print(f"[DEBUG] _convert_basic_commands 출력: {repr(text)}")
    return text
```

### 6.3 프론트엔드에서 확인

브라우저 개발자 도구 콘솔에서:

```javascript
// API 응답 확인
fetch('/api/hangul/problems/15')
  .then(r => r.json())
  .then(d => {
    console.log('content_latex:', d.content_latex);
    console.log('백슬래시 개수:', (d.content_latex.match(/\\/g) || []).length);
  });
```

---

## 7. 결론 및 권장 조치

### 7.1 즉시 필요한 조치

| 순서 | 조치 | 이유 |
|------|------|------|
| 1 | 모든 Python 프로세스 종료 | 다중 서버 혼란 해결 |
| 2 | `__pycache__` 삭제 | 이전 바이트코드 제거 |
| 3 | 단일 서버만 재시작 | 깨끗한 상태에서 시작 |
| 4 | 테스트 | 수정 확인 |

### 7.2 동일 오류 반복 원인

**가장 유력한 원인**: 다중 서버가 실행 중이어서 수정된 코드가 아닌 이전 버전 서버가 요청을 처리함.

### 7.3 개발 프로세스 개선 제안

1. **서버 실행 전 확인**: `netstat -ano | findstr :8000`으로 기존 프로세스 확인
2. **단일 터미널 사용**: 서버 실행은 하나의 터미널에서만
3. **캐시 정리 습관화**: 주요 변경 후 `__pycache__` 삭제
4. **디버그 로깅**: 변환 과정 추적 로그 추가

---

## 8. 다음 단계

이 리포트를 바탕으로:

1. **환경 정리**: 모든 프로세스 종료 및 캐시 삭제
2. **단일 서버 재시작**: 깨끗한 환경에서 테스트
3. **결과 확인**: 여전히 문제가 있으면 추가 분석

**중요**: 개발 진행 전에 먼저 환경을 정리하여 수정된 코드가 실제로 실행되는지 확인해야 합니다.

---

*분석 완료: 2025-11-29*
*분석 방법: 전체 코드 구조 분석 + 실행 환경 분석*
*작성: Claude Code (Opus 4.5)*
