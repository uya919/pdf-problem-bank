# Phase 20: 개발자 가이드

## 1. 개발 환경 설정

### 1.1 필수 요구사항

- Python 3.11+
- Node.js 18+
- npm 9+

### 1.2 환경 변수 설정

```bash
# backend/.env 파일 생성
cp backend/.env.example backend/.env

# 필수 변수 설정
APP_ENV=development
PYTHONDONTWRITEBYTECODE=1
DATASET_ROOT=../dataset_root
```

### 1.3 서버 시작

**Windows PowerShell:**
```powershell
cd backend
.\dev.ps1
```

**Linux/Mac:**
```bash
cd backend
chmod +x dev.sh
./dev.sh
```

**수동 시작:**
```bash
# 백엔드
cd backend
PYTHONDONTWRITEBYTECODE=1 APP_ENV=development python -m uvicorn app.main:app --reload --port 8000

# 프론트엔드
cd frontend
npm run dev
```

---

## 2. 디버그 도구 사용법

### 2.1 Debug Panel (프론트엔드)

1. `http://localhost:5173/hangul` 접속
2. 페이지 하단 "Debug Panel" 클릭하여 펼치기
3. 기능:
   - **Converter Status**: 현재 컨버터 인스턴스 상태
   - **Test Conversion**: HWP 수식 → LaTeX 변환 테스트
   - **Force Reload**: 컨버터 강제 재생성

### 2.2 Debug API (백엔드)

```bash
# 상태 확인
curl http://localhost:8000/api/debug/status

# 테스트 변환
curl -X POST http://localhost:8000/api/debug/test-convert \
  -H "Content-Type: application/json" \
  -d '{"hwp_equation": "rm A + rm B"}'

# 강제 리로드
curl -X POST http://localhost:8000/api/debug/reload-converter
```

---

## 3. 자주 발생하는 문제

### 3.1 코드 변경이 반영되지 않음

**증상**: `hwp_latex_converter.py` 수정 후 변환 결과가 바뀌지 않음

**원인**: Python 바이트코드 캐시 (`__pycache__`)

**해결**:
```bash
# 1. 캐시 삭제
Get-ChildItem -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force

# 2. 환경 변수 설정 후 서버 재시작
$env:PYTHONDONTWRITEBYTECODE = "1"
python -m uvicorn app.main:app --reload --port 8000
```

또는 Debug Panel에서 "Force Reload Converter" 버튼 클릭

### 3.2 포트 충돌

**증상**: `Address already in use` 에러

**해결 (Windows)**:
```powershell
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr :8000

# 프로세스 종료
taskkill /F /PID <프로세스ID>
```

### 3.3 테스트 실패

**증상**: `pytest` 실행 시 import 에러

**해결**:
```bash
cd backend
PYTHONDONTWRITEBYTECODE=1 python -m pytest -v
```

---

## 4. 코드 스타일 가이드

### 4.1 Python

```python
# 타입 힌트 사용
def convert(self, hwp_eq: str) -> str:
    pass

# docstring 작성
def parse(self) -> ParseResult:
    """HML 파일 파싱

    Returns:
        ParseResult: 파싱 결과 객체
    """
    pass

# Phase 번호 주석
# Phase 20-C: 의존성 주입 지원
self._latex_converter = latex_converter
```

### 4.2 TypeScript

```typescript
// 인터페이스 정의
interface DebugStatus {
  converter: ConverterInfo;
  environment: EnvironmentInfo;
}

// 컴포넌트 Props
interface DebugPanelProps {
  className?: string;
}

// Phase 번호 주석
// Phase 20-B: Debug Panel 컴포넌트
export function DebugPanel({ className = '' }: DebugPanelProps) {
```

---

## 5. 테스트 작성

### 5.1 Mock 컨버터 사용

```python
from app.services.hangul.interfaces import ILatexConverter

class MockLatexConverter(ILatexConverter):
    def __init__(self, prefix: str = "MOCK_"):
        self.prefix = prefix
        self.call_count = 0

    def convert(self, hwp_eq: str) -> str:
        self.call_count += 1
        return f"{self.prefix}{hwp_eq}"

    def get_info(self) -> dict:
        return {"instance_exists": True, "app_env": "test"}

# 사용 예
def test_with_mock():
    mock = MockLatexConverter()
    parser = HMLParser("test.hml", latex_converter=mock)

    parser._convert_to_latex("rm A")

    assert mock.call_count == 1
```

### 5.2 테스트 실행

```bash
# 전체 테스트
cd backend
pytest -v

# 특정 테스트 파일
pytest tests/test_phase20c_di.py -v

# 특정 테스트 클래스
pytest tests/test_phase20c_di.py::TestMockLatexConverter -v
```

---

## 6. 새 기능 추가 가이드

### 6.1 새 수식 패턴 추가

1. `hwp_latex_converter.py` 열기
2. `HWPEquationConverter.__init__` 메서드의 `self.patterns` 리스트에 추가:

```python
# 새 패턴: \bPATTERN\b → \\latex{}
self.patterns.append((
    r'\bPATTERN\b',
    r'\\latex{}'
))
```

3. 테스트 추가:

```python
def test_new_pattern():
    result = hwp_to_latex("PATTERN")
    assert result == r"\latex{}"
```

### 6.2 새 파서 타입 추가

1. `interfaces.py`에 인터페이스 정의
2. `HangulParserBase` 상속하여 새 클래스 구현
3. `hangul.py`에서 확장자 분기 추가:

```python
if file_ext == '.new':
    parser = NewParser(str(temp_file_path))
```

---

## 7. VS Code 디버깅

### 7.1 백엔드 디버깅

1. `.vscode/launch.json`의 "Backend: FastAPI Dev" 설정 사용
2. F5 또는 Run > Start Debugging

### 7.2 테스트 디버깅

1. 테스트 파일 열기
2. 테스트 함수 옆 "Debug Test" 아이콘 클릭
3. 또는 "Backend: Debug Test" 설정 사용

---

*작성일: 2025-11-29*
*Phase 20 완료*
