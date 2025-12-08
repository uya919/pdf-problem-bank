# Phase 20: 시스템 리팩토링 연구 리포트

> **목표**: "다시 파싱" 버튼이 코드 변경을 즉시 반영하지 않는 문제의 근본 원인 분석 및 디버깅하기 좋은 시스템으로의 리팩토링 방안 제시

---

## 1. Executive Summary

### 문제 현상
- "다시 파싱" 버튼을 눌러도 변경된 변환 로직이 반영되지 않음
- 서버 재시작 후에도 때때로 오래된 로직이 실행됨
- 단위 테스트는 통과하지만 웹 애플리케이션에서는 반영 안됨

### 근본 원인 (Root Cause)
**Python 싱글톤 패턴과 모듈 캐싱의 복합 문제**

```python
# hwp_latex_converter.py:557
_converter = HwpLatexConverter()  # 서버 시작 시 한 번만 생성
```

이 싱글톤 인스턴스는:
1. 모듈 import 시점에 생성됨
2. uvicorn `--reload`가 파일 변경을 감지해도 재생성되지 않을 수 있음
3. Python `sys.modules` 캐시에 저장되어 재사용됨
4. `.pyc` 바이트코드 캐시가 오래된 코드를 제공할 수 있음

---

## 2. 시스템 아키텍처 분석

### 2.1 전체 데이터 흐름

```
[Frontend]                    [Backend]                     [Python Modules]
    |                             |                               |
    v                             v                               v
HangulUploadPage.tsx         hangul.py                      hml_parser.py
    |                        (router)                            |
    | useMutation                |                               |
    | mutate()                   v                               v
    |----------------------> POST /parse              HMLParser.parse()
                                 |                               |
                                 v                               v
                            HMLParser()            hwp_latex_converter.py
                                 |                               |
                                 v                               v
                          hwp_to_latex()  <------>  _converter.convert()
                                                         ^
                                                         |
                                                   [SINGLETON]
                                                   서버 시작 시 생성
                                                   이후 재생성 안됨
```

### 2.2 캐싱 레이어 분석

| 레이어 | 위치 | 문제 여부 | 설명 |
|--------|------|-----------|------|
| **브라우저 캐시** | 클라이언트 | NO | POST 요청은 일반적으로 캐시 안됨 |
| **React Query** | 프론트엔드 | NO | `useMutation`은 결과를 캐시하지 않음 |
| **HTTP 응답 캐시** | 네트워크 | NO | 캐시 헤더 없음 |
| **FastAPI 라우터** | 백엔드 | NO | 매 요청마다 새 HMLParser 인스턴스 생성 |
| **Python sys.modules** | Python 런타임 | **YES** | 모듈 한 번 import 후 캐시됨 |
| **Python bytecode (.pyc)** | 파일시스템 | **YES** | 컴파일된 바이트코드 캐시 |
| **싱글톤 인스턴스** | hwp_latex_converter.py | **YES** | 모듈 레벨에서 한 번 생성 |

### 2.3 문제의 핵심 코드 위치

#### 2.3.1 싱글톤 패턴 (hwp_latex_converter.py:556-580)
```python
# 싱글톤 인스턴스
_converter = HwpLatexConverter()  # Line 557

def hwp_to_latex(hwp_eq: str) -> str:
    return _converter.convert(hwp_eq)  # Line 580
```

**문제점**:
- `_converter`는 모듈 로드 시 한 번 생성
- `HwpLatexConverter.__init__()`에서 정규식 패턴 컴파일 (`_compile_patterns()`)
- 새 패턴을 추가해도 기존 인스턴스는 새 패턴을 모름

#### 2.3.2 모듈 import 체인
```
hangul.py (라우터)
    └── from app.services.hangul import HMLParser
            └── hml_parser.py
                    └── from .hwp_latex_converter import hwp_to_latex
                            └── hwp_latex_converter.py
                                    └── _converter = HwpLatexConverter()
```

uvicorn `--reload`가 `hwp_latex_converter.py` 변경을 감지해도:
1. 상위 모듈이 이미 import한 `hwp_to_latex` 참조가 갱신 안될 수 있음
2. `sys.modules` 캐시가 오래된 모듈 객체를 유지할 수 있음

---

## 3. 프론트엔드 분석

### 3.1 HangulUploadPage.tsx

```typescript
// useMutation 사용 - 캐싱 없음 (OK)
const parseMutation = useMutation({
  mutationFn: (file: File) => hangulApi.parseFile(file),
  onSuccess: (result) => {
    setParseResult(result);  // 결과 즉시 반영
  },
});

// 다시 파싱 핸들러
const handleReparse = () => {
  if (selectedFile) {
    parseMutation.mutate(selectedFile);  // 새 요청 발생
  }
};
```

**결론**: 프론트엔드는 문제 없음. 매번 새 API 요청을 보냄.

### 3.2 React Query 설정 (App.tsx)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**결론**: 기본 설정만 사용. mutation에 영향 없음.

---

## 4. 백엔드 분석

### 4.1 API 라우터 (hangul.py:120-162)

```python
@router.post("/parse")
async def parse_hangul_file(file: UploadFile = File(...)):
    # ...
    if file_ext == '.hml':
        parser = HMLParser(str(temp_file_path))  # 매 요청마다 새 인스턴스

    result: ParseResult = parser.parse()  # HMLParser는 새로 생성됨
    return JSONResponse(content=result.to_dict())
```

**결론**: 라우터 자체는 문제 없음. 매번 새 HMLParser 생성.

### 4.2 HMLParser (hml_parser.py)

```python
class HMLParser(HangulParserBase):
    def __init__(self, file_path: str):
        super().__init__(file_path)
        self.extractor = ProblemExtractor()  # 새 인스턴스

    def _get_paragraph_text_with_latex(self, p_elem) -> tuple:
        # ...
        latex_eq = hwp_to_latex(eq_text)  # 싱글톤 사용
        # ...
```

**문제점**: `hwp_to_latex()` 함수가 싱글톤 `_converter`를 사용

---

## 5. 근본 원인 상세 분석

### 5.1 Python 모듈 캐싱 메커니즘

```python
import sys

# 모듈이 처음 import될 때:
# 1. 파일을 찾음
# 2. .pyc 바이트코드가 있으면 사용 (더 빠름)
# 3. 없으면 .py 파일 컴파일
# 4. 모듈 객체 생성
# 5. sys.modules에 저장
# 6. 이후 import는 sys.modules에서 반환

print(sys.modules['app.services.hangul.hwp_latex_converter'])
# 이 객체는 서버 종료 전까지 유지됨
```

### 5.2 uvicorn --reload의 한계

```
uvicorn --reload는:
1. watchfiles/watchgod로 파일 변경 감지
2. 변경 감지 시 전체 프로세스 재시작 (기본)
3. 또는 모듈만 재로드 (설정에 따라)

문제:
- 하위 모듈만 변경 시 상위 모듈이 재로드 안될 수 있음
- sys.modules 캐시 일부만 갱신될 수 있음
- .pyc 파일이 .py보다 최신이면 .pyc 사용
```

### 5.3 싱글톤 패턴의 문제

```python
# hwp_latex_converter.py

class HwpLatexConverter:
    def __init__(self):
        self._compile_patterns()  # 패턴 컴파일

    def _compile_patterns(self):
        self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)')
        # ... 기타 패턴들

# 모듈 레벨에서 인스턴스 생성
_converter = HwpLatexConverter()  # ← 이게 문제!

def hwp_to_latex(hwp_eq: str) -> str:
    return _converter.convert(hwp_eq)
```

**문제점**:
1. `_converter`는 모듈이 처음 import될 때 한 번 생성
2. 클래스 코드를 수정해도 기존 인스턴스는 영향 없음
3. 패턴을 추가해도 `_compile_patterns()`가 다시 호출 안됨

---

## 6. 리팩토링 방안

### 6.1 즉시 적용 가능한 수정 (단기)

#### 방안 A: 싱글톤 제거 - 매 호출 시 새 인스턴스

```python
# hwp_latex_converter.py 수정

def hwp_to_latex(hwp_eq: str) -> str:
    """매 호출 시 새 인스턴스 생성 (개발 환경용)"""
    converter = HwpLatexConverter()  # 새 인스턴스
    return converter.convert(hwp_eq)
```

**장점**: 코드 변경 즉시 반영
**단점**: 성능 저하 (매번 정규식 컴파일)

#### 방안 B: Lazy 싱글톤 + 버전 체크

```python
# hwp_latex_converter.py 수정

import os

_converter = None
_converter_mtime = 0

def _get_converter():
    """파일 변경 시 새 인스턴스 생성"""
    global _converter, _converter_mtime

    current_mtime = os.path.getmtime(__file__)
    if _converter is None or current_mtime != _converter_mtime:
        _converter = HwpLatexConverter()
        _converter_mtime = current_mtime

    return _converter

def hwp_to_latex(hwp_eq: str) -> str:
    return _get_converter().convert(hwp_eq)
```

**장점**: 파일 변경 시 자동 재생성
**단점**: 파일 시스템 접근 오버헤드

#### 방안 C: 환경 변수 기반 동적 전환

```python
# hwp_latex_converter.py 수정

import os

_converter = HwpLatexConverter() if os.getenv('PRODUCTION') else None

def hwp_to_latex(hwp_eq: str) -> str:
    if os.getenv('PRODUCTION'):
        return _converter.convert(hwp_eq)
    else:
        # 개발 환경: 매번 새 인스턴스
        return HwpLatexConverter().convert(hwp_eq)
```

**장점**: 환경별 최적화
**단점**: 환경 설정 필요

### 6.2 구조적 리팩토링 (중기)

#### 방안 D: 의존성 주입 (Dependency Injection)

```python
# hwp_latex_converter.py

class HwpLatexConverter:
    # 클래스 구현 그대로
    pass


# hml_parser.py 수정

from .hwp_latex_converter import HwpLatexConverter

class HMLParser(HangulParserBase):
    def __init__(self, file_path: str, converter: HwpLatexConverter = None):
        super().__init__(file_path)
        self.converter = converter or HwpLatexConverter()  # 주입 또는 생성

    def _get_paragraph_text_with_latex(self, p_elem) -> tuple:
        # ...
        latex_eq = self.converter.convert(eq_text)  # 인스턴스 메서드 사용
        # ...


# hangul.py (라우터) 수정

@router.post("/parse")
async def parse_hangul_file(file: UploadFile = File(...)):
    # ...
    converter = HwpLatexConverter()  # 매 요청마다 새 인스턴스
    parser = HMLParser(str(temp_file_path), converter=converter)
    result = parser.parse()
    # ...
```

**장점**:
- 테스트 용이 (Mock 주입 가능)
- 코드 변경 즉시 반영
- 싱글톤 의존성 제거

**단점**:
- 기존 코드 수정 필요
- 약간의 성능 오버헤드

#### 방안 E: FastAPI 라이프사이클 활용

```python
# main.py

from contextlib import asynccontextmanager
from app.services.hangul.hwp_latex_converter import HwpLatexConverter

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: 컨버터 인스턴스 생성
    app.state.latex_converter = HwpLatexConverter()
    yield
    # Shutdown: 정리

app = FastAPI(lifespan=lifespan)


# hangul.py 수정

from fastapi import Request

@router.post("/parse")
async def parse_hangul_file(request: Request, file: UploadFile = File(...)):
    converter = request.app.state.latex_converter
    parser = HMLParser(str(temp_file_path), converter=converter)
    # ...
```

**장점**:
- 앱 시작 시 명시적 초기화
- 중앙 집중 관리
- 서버 재시작으로 확실한 갱신

**단점**:
- `--reload` 시에도 서버 재시작 필요

### 6.3 디버깅 친화적 시스템 (장기)

#### 방안 F: 버전 추적 및 디버그 엔드포인트

```python
# version_tracker.py (새 파일)

import hashlib
import os
from datetime import datetime

class ModuleVersionTracker:
    _instance = None

    def __init__(self):
        self.versions = {}
        self.scan_modules()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ModuleVersionTracker()
        return cls._instance

    def scan_modules(self):
        """주요 모듈 버전 스캔"""
        modules = [
            'app/services/hangul/hwp_latex_converter.py',
            'app/services/hangul/hml_parser.py',
        ]

        for module_path in modules:
            if os.path.exists(module_path):
                mtime = os.path.getmtime(module_path)
                with open(module_path, 'rb') as f:
                    content_hash = hashlib.md5(f.read()).hexdigest()[:8]

                self.versions[module_path] = {
                    'mtime': datetime.fromtimestamp(mtime).isoformat(),
                    'hash': content_hash,
                }

    def get_status(self):
        return {
            'scanned_at': datetime.now().isoformat(),
            'modules': self.versions,
        }


# hangul.py에 디버그 엔드포인트 추가

@router.get("/debug/versions")
async def get_module_versions():
    """현재 로드된 모듈 버전 정보"""
    from app.services.hangul.hwp_latex_converter import HwpLatexConverter
    import sys

    converter_module = sys.modules.get('app.services.hangul.hwp_latex_converter')

    return {
        'converter_module_id': id(converter_module) if converter_module else None,
        'converter_class_id': id(HwpLatexConverter),
        'converter_instance_exists': '_converter' in dir(converter_module) if converter_module else False,
        'python_path': sys.executable,
        'module_file': converter_module.__file__ if converter_module else None,
    }


@router.post("/debug/reload")
async def reload_converter():
    """컨버터 모듈 강제 재로드"""
    import importlib
    import sys

    module_name = 'app.services.hangul.hwp_latex_converter'

    if module_name in sys.modules:
        old_module = sys.modules[module_name]
        importlib.reload(old_module)

        return {
            'success': True,
            'message': 'Module reloaded',
            'new_module_id': id(sys.modules[module_name]),
        }

    return {'success': False, 'message': 'Module not loaded'}
```

#### 방안 G: 통합 변환 테스트 엔드포인트

```python
# hangul.py에 테스트 엔드포인트 추가

@router.post("/debug/test-convert")
async def test_convert(equation: str):
    """
    변환 로직 직접 테스트 (디버깅용)

    싱글톤 인스턴스와 새 인스턴스 결과 비교
    """
    from app.services.hangul.hwp_latex_converter import hwp_to_latex, HwpLatexConverter
    from app.services.hangul.hml_parser import clean_hwp_equation

    # 현재 싱글톤 결과
    singleton_latex = hwp_to_latex(equation)
    singleton_plain = clean_hwp_equation(equation)

    # 새 인스턴스 결과
    fresh_converter = HwpLatexConverter()
    fresh_latex = fresh_converter.convert(equation)

    return {
        'input': equation,
        'singleton': {
            'latex': singleton_latex,
            'plain': singleton_plain,
        },
        'fresh_instance': {
            'latex': fresh_latex,
        },
        'match': singleton_latex == fresh_latex,
    }
```

---

## 7. 권장 리팩토링 계획

### Phase 1: 즉시 수정 (30분)

1. **방안 B 적용**: Lazy 싱글톤 + 파일 변경 감지
   - `hwp_latex_converter.py` 수정
   - 개발 환경에서 코드 변경 즉시 반영

### Phase 2: 디버깅 도구 추가 (1시간)

1. **디버그 엔드포인트 추가**:
   - `GET /api/hangul/debug/versions`: 모듈 버전 확인
   - `POST /api/hangul/debug/reload`: 강제 재로드
   - `POST /api/hangul/debug/test-convert`: 변환 테스트

2. **프론트엔드 디버그 패널**:
   - 개발 모드에서 모듈 버전 표시
   - "강제 재로드" 버튼 추가

### Phase 3: 구조적 개선 (2시간)

1. **의존성 주입 패턴 적용** (방안 D)
   - `HwpLatexConverter` 인스턴스 주입 방식으로 변경
   - 테스트 용이성 확보

2. **환경별 설정 분리**:
   ```python
   # config.py
   class Settings:
       CONVERTER_MODE = 'development'  # 'development' | 'production'
   ```

### Phase 4: 운영 최적화 (추가)

1. **프로덕션 환경**:
   - 싱글톤 유지 (성능)
   - 배포 시 자동 재시작

2. **개발 환경**:
   - 매 요청 새 인스턴스 또는 파일 변경 감지
   - `.pyc` 생성 비활성화

---

## 8. 시작 스크립트 개선

### 개발 환경용 (dev.ps1)

```powershell
# backend/dev.ps1

# 1. pycache 삭제
Get-ChildItem -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force

# 2. 환경 변수 설정
$env:PYTHONDONTWRITEBYTECODE = "1"
$env:DEVELOPMENT = "1"

# 3. uvicorn 실행 (watchfiles 사용)
python -m uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000
```

### 또는 .env 파일

```bash
# .env
PYTHONDONTWRITEBYTECODE=1
DEVELOPMENT=1
```

---

## 9. 검증 테스트 계획

### 9.1 단위 테스트

```python
# tests/test_converter_reload.py

def test_converter_fresh_instance():
    """새 인스턴스가 최신 패턴을 사용하는지 확인"""
    from app.services.hangul.hwp_latex_converter import HwpLatexConverter

    converter = HwpLatexConverter()
    result = converter.convert("overline{{rm{AB}} it }")

    assert r'\overline' in result
    assert 'overline{{rm{' not in result


def test_hwp_to_latex_function():
    """편의 함수가 올바르게 동작하는지 확인"""
    from app.services.hangul.hwp_latex_converter import hwp_to_latex

    result = hwp_to_latex("overline{{rm{AB}} it }")

    assert r'\overline' in result
```

### 9.2 통합 테스트

```python
# tests/test_parse_integration.py

async def test_parse_api_returns_correct_latex():
    """API가 올바른 LaTeX를 반환하는지 확인"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # HML 파일 업로드
        with open("test_file.hml", "rb") as f:
            response = await client.post(
                "/api/hangul/parse",
                files={"file": f}
            )

        result = response.json()

        # LaTeX 변환 결과 확인
        for problem in result['problems']:
            for latex_eq in problem['content_equations_latex']:
                assert 'overline{{rm{' not in latex_eq
```

---

## 10. 결론

### 문제 요약
"다시 파싱" 버튼이 코드 변경을 반영하지 않는 문제는 **Python 모듈 캐싱과 싱글톤 패턴의 조합**으로 발생합니다.

### 핵심 해결책
1. **단기**: 싱글톤을 Lazy 초기화 + 파일 변경 감지 방식으로 변경
2. **중기**: 의존성 주입 패턴으로 구조 개선
3. **장기**: 디버그 엔드포인트와 버전 추적 시스템 구축

### 권장 우선순위
1. **즉시**: 방안 B (Lazy 싱글톤) 적용
2. **다음**: 디버그 엔드포인트 추가
3. **추후**: 전체 의존성 주입 리팩토링

---

*작성일: 2025-11-29*
*분석 도구: Claude Opus 4.5*
