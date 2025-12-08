# Phase 20: 파싱 시스템 리팩토링 개발 계획

> **프로젝트 성격**: 비급한 개선 작업
> **목표**: 코드 변경이 즉시 반영되는 디버깅 친화적 시스템 구축
> **접근 방식**: 점진적 개선, 각 단계 검증 후 다음 단계 진행

---

## 전체 로드맵

```
Phase 20-A: 기초 인프라 개선 (싱글톤 문제 해결)
    ↓
Phase 20-B: 디버그 도구 구축 (가시성 확보)
    ↓
Phase 20-C: 구조적 리팩토링 (의존성 주입)
    ↓
Phase 20-D: 개발 환경 최적화 (DX 개선)
    ↓
Phase 20-E: 문서화 및 가이드 (유지보수성)
```

---

## Phase 20-A: 기초 인프라 개선

### 목표
싱글톤 패턴으로 인한 캐싱 문제 해결

### A-1. 환경 감지 유틸리티 생성

**파일**: `backend/app/utils/environment.py` (신규)

```python
"""
환경 감지 및 설정 유틸리티
"""
import os
from enum import Enum

class Environment(Enum):
    DEVELOPMENT = "development"
    PRODUCTION = "production"
    TESTING = "testing"

def get_environment() -> Environment:
    """현재 실행 환경 반환"""
    env = os.getenv('APP_ENV', 'development').lower()

    if env in ('prod', 'production'):
        return Environment.PRODUCTION
    elif env in ('test', 'testing'):
        return Environment.TESTING
    else:
        return Environment.DEVELOPMENT

def is_development() -> bool:
    """개발 환경 여부"""
    return get_environment() == Environment.DEVELOPMENT

def is_production() -> bool:
    """프로덕션 환경 여부"""
    return get_environment() == Environment.PRODUCTION
```

**작업 내용**:
1. `backend/app/utils/` 디렉토리 생성
2. `__init__.py` 생성
3. `environment.py` 생성
4. 기존 `config.py`에 환경 변수 추가

**검증 방법**:
```python
# 테스트
from app.utils.environment import is_development
assert is_development() == True  # 기본값
```

---

### A-2. 싱글톤 패턴 개선

**파일**: `backend/app/services/hangul/hwp_latex_converter.py` (수정)

**현재 코드** (문제):
```python
# Line 556-580
_converter = HwpLatexConverter()  # 모듈 로드 시 한 번만 생성

def hwp_to_latex(hwp_eq: str) -> str:
    return _converter.convert(hwp_eq)
```

**개선 코드**:
```python
import os
from typing import Optional

# 싱글톤 관리 변수
_converter: Optional[HwpLatexConverter] = None
_converter_file_mtime: float = 0

def _should_recreate_converter() -> bool:
    """컨버터 재생성 필요 여부 판단"""
    global _converter_file_mtime

    # 프로덕션: 재생성 안함
    if os.getenv('APP_ENV') == 'production':
        return _converter is None

    # 개발 환경: 파일 변경 시 재생성
    try:
        current_mtime = os.path.getmtime(__file__)
        if current_mtime != _converter_file_mtime:
            _converter_file_mtime = current_mtime
            return True
    except OSError:
        pass

    return _converter is None

def _get_converter() -> HwpLatexConverter:
    """컨버터 인스턴스 반환 (필요 시 재생성)"""
    global _converter

    if _should_recreate_converter():
        _converter = HwpLatexConverter()

    return _converter

def hwp_to_latex(hwp_eq: str) -> str:
    """
    HWP 수식을 LaTeX로 변환

    개발 환경: 파일 변경 시 자동으로 새 인스턴스 사용
    프로덕션: 싱글톤 유지 (성능 최적화)
    """
    return _get_converter().convert(hwp_eq)

# 하위 호환성을 위한 직접 접근 (deprecated)
def get_converter_instance() -> HwpLatexConverter:
    """컨버터 인스턴스 직접 접근 (테스트용)"""
    return _get_converter()
```

**작업 내용**:
1. `hwp_latex_converter.py` 백업
2. 싱글톤 로직 수정
3. 기존 테스트 실행하여 회귀 확인

**검증 방법**:
```bash
# 1. 서버 시작
cd backend
python -m uvicorn app.main:app --reload --port 8000

# 2. 변환 테스트
curl -X POST http://localhost:8000/api/hangul/debug/test-convert \
  -H "Content-Type: application/json" \
  -d '{"equation": "overline{{rm{AB}} it }"}'

# 3. 코드 수정 후 같은 요청 → 결과 변경 확인
```

---

### A-3. hml_parser.py 연동 수정

**파일**: `backend/app/services/hangul/hml_parser.py` (수정)

**현재 코드**:
```python
from .hwp_latex_converter import hwp_to_latex
```

**변경 없음** - `hwp_to_latex` 함수 시그니처 유지

**추가 확인 사항**:
- `clean_hwp_equation()` 함수도 동일 패턴 적용 여부 검토
- 현재는 정규식만 사용하므로 싱글톤 문제 없음

---

### A-4. 단위 테스트 추가

**파일**: `backend/tests/test_converter_reload.py` (신규)

```python
"""
Phase 20-A: 컨버터 재로드 테스트
"""
import pytest
import os
import time

def test_converter_creates_new_instance_on_file_change():
    """파일 변경 시 새 인스턴스 생성 확인"""
    from app.services.hangul import hwp_latex_converter

    # 첫 번째 인스턴스
    converter1 = hwp_latex_converter._get_converter()
    id1 = id(converter1)

    # 파일 mtime 변경 시뮬레이션
    hwp_latex_converter._converter_file_mtime = 0

    # 두 번째 인스턴스 (재생성되어야 함)
    converter2 = hwp_latex_converter._get_converter()
    id2 = id(converter2)

    assert id1 != id2, "파일 변경 시 새 인스턴스가 생성되어야 함"

def test_converter_reuses_instance_in_production():
    """프로덕션에서는 싱글톤 유지"""
    import os
    from app.services.hangul import hwp_latex_converter

    # 프로덕션 환경 설정
    original_env = os.environ.get('APP_ENV')
    os.environ['APP_ENV'] = 'production'

    try:
        # 첫 번째 인스턴스
        converter1 = hwp_latex_converter._get_converter()
        id1 = id(converter1)

        # mtime 변경해도 같은 인스턴스
        hwp_latex_converter._converter_file_mtime = 0
        converter2 = hwp_latex_converter._get_converter()
        id2 = id(converter2)

        assert id1 == id2, "프로덕션에서는 싱글톤 유지"
    finally:
        # 환경 복원
        if original_env:
            os.environ['APP_ENV'] = original_env
        else:
            del os.environ['APP_ENV']

def test_hwp_to_latex_function_works():
    """기본 변환 기능 테스트"""
    from app.services.hangul.hwp_latex_converter import hwp_to_latex

    result = hwp_to_latex("overline{{rm{AB}} it }")

    assert r'\overline' in result
    assert 'overline{{rm{' not in result
```

**작업 내용**:
1. 테스트 파일 생성
2. pytest 실행
3. 모든 테스트 통과 확인

---

### Phase 20-A 완료 체크리스트

- [ ] A-1: 환경 감지 유틸리티 생성
- [ ] A-2: 싱글톤 패턴 개선
- [ ] A-3: hml_parser.py 연동 확인
- [ ] A-4: 단위 테스트 추가 및 통과
- [ ] 기존 기능 회귀 테스트
- [ ] "다시 파싱" 버튼 동작 확인

---

## Phase 20-B: 디버그 도구 구축

### 목표
시스템 상태를 쉽게 확인할 수 있는 디버그 도구 제공

### B-1. 디버그 API 엔드포인트

**파일**: `backend/app/routers/hangul.py` (수정 - 엔드포인트 추가)

```python
# === Phase 20-B: 디버그 엔드포인트 ===

@router.get("/debug/status")
async def get_debug_status():
    """
    시스템 상태 조회 (개발 환경 전용)

    Returns:
        모듈 버전, 인스턴스 정보, 환경 설정
    """
    import sys
    from app.utils.environment import get_environment, is_development
    from app.services.hangul import hwp_latex_converter

    if not is_development():
        raise HTTPException(status_code=403, detail="개발 환경에서만 사용 가능")

    converter_module = sys.modules.get('app.services.hangul.hwp_latex_converter')

    return {
        "environment": get_environment().value,
        "python_version": sys.version,
        "module_info": {
            "hwp_latex_converter": {
                "loaded": converter_module is not None,
                "file": converter_module.__file__ if converter_module else None,
                "converter_instance_id": id(hwp_latex_converter._converter) if hwp_latex_converter._converter else None,
                "file_mtime": hwp_latex_converter._converter_file_mtime,
            }
        }
    }


@router.post("/debug/test-convert")
async def test_convert(equation: str):
    """
    수식 변환 테스트 (개발 환경 전용)

    싱글톤 인스턴스와 새 인스턴스 결과를 비교하여
    캐싱 문제 여부를 진단
    """
    from app.utils.environment import is_development
    from app.services.hangul.hwp_latex_converter import hwp_to_latex, HwpLatexConverter
    from app.services.hangul.hml_parser import clean_hwp_equation

    if not is_development():
        raise HTTPException(status_code=403, detail="개발 환경에서만 사용 가능")

    # 현재 싱글톤 결과
    singleton_latex = hwp_to_latex(equation)
    singleton_plain = clean_hwp_equation(equation)

    # 새 인스턴스 결과
    fresh_converter = HwpLatexConverter()
    fresh_latex = fresh_converter.convert(equation)

    return {
        "input": equation,
        "results": {
            "singleton": {
                "latex": singleton_latex,
                "plain": singleton_plain,
            },
            "fresh_instance": {
                "latex": fresh_latex,
            }
        },
        "diagnosis": {
            "match": singleton_latex == fresh_latex,
            "issue_detected": singleton_latex != fresh_latex,
            "recommendation": "서버 재시작 필요" if singleton_latex != fresh_latex else "정상"
        }
    }


@router.post("/debug/reload-converter")
async def reload_converter():
    """
    컨버터 모듈 강제 재로드 (개발 환경 전용)

    코드 변경 후 서버 재시작 없이 새 로직 적용
    """
    import importlib
    import sys
    from app.utils.environment import is_development

    if not is_development():
        raise HTTPException(status_code=403, detail="개발 환경에서만 사용 가능")

    module_name = 'app.services.hangul.hwp_latex_converter'

    try:
        if module_name in sys.modules:
            old_id = id(sys.modules[module_name])
            importlib.reload(sys.modules[module_name])
            new_id = id(sys.modules[module_name])

            return {
                "success": True,
                "message": "모듈이 재로드되었습니다",
                "old_module_id": old_id,
                "new_module_id": new_id,
                "reloaded": old_id != new_id
            }
        else:
            return {
                "success": False,
                "message": "모듈이 로드되지 않았습니다"
            }
    except Exception as e:
        return {
            "success": False,
            "message": f"재로드 실패: {str(e)}"
        }
```

**작업 내용**:
1. 엔드포인트 3개 추가
2. Pydantic 모델 추가 (필요시)
3. API 문서 자동 생성 확인 (Swagger)

---

### B-2. 프론트엔드 디버그 패널

**파일**: `frontend/src/components/debug/DebugPanel.tsx` (신규)

```typescript
/**
 * Phase 20-B: 개발 환경 디버그 패널
 */
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bug, RefreshCw, TestTube, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '../../api/client';

interface DebugStatus {
  environment: string;
  python_version: string;
  module_info: {
    hwp_latex_converter: {
      loaded: boolean;
      file: string | null;
      converter_instance_id: number | null;
      file_mtime: number;
    };
  };
}

interface TestConvertResult {
  input: string;
  results: {
    singleton: { latex: string; plain: string };
    fresh_instance: { latex: string };
  };
  diagnosis: {
    match: boolean;
    issue_detected: boolean;
    recommendation: string;
  };
}

export function DebugPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testEquation, setTestEquation] = useState('overline{{rm{AB}} it }');

  // 상태 조회
  const statusQuery = useQuery({
    queryKey: ['debug-status'],
    queryFn: async () => {
      const response = await apiClient.get<DebugStatus>('/api/hangul/debug/status');
      return response.data;
    },
    enabled: isExpanded,
    refetchInterval: 5000, // 5초마다 갱신
  });

  // 변환 테스트
  const testMutation = useMutation({
    mutationFn: async (equation: string) => {
      const response = await apiClient.post<TestConvertResult>(
        '/api/hangul/debug/test-convert',
        null,
        { params: { equation } }
      );
      return response.data;
    },
  });

  // 모듈 재로드
  const reloadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/hangul/debug/reload-converter');
      return response.data;
    },
    onSuccess: () => {
      statusQuery.refetch();
    },
  });

  // 프로덕션에서는 표시 안함
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white rounded-lg shadow-lg max-w-md z-50">
      {/* 헤더 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-700 rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4" />
          <span className="text-sm font-medium">Debug Panel</span>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* 내용 */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-700 space-y-4">
          {/* 상태 정보 */}
          {statusQuery.data && (
            <div className="text-xs space-y-1">
              <div>환경: <span className="text-green-400">{statusQuery.data.environment}</span></div>
              <div>컨버터 로드: {statusQuery.data.module_info.hwp_latex_converter.loaded ? '✓' : '✗'}</div>
              <div>인스턴스 ID: {statusQuery.data.module_info.hwp_latex_converter.converter_instance_id}</div>
            </div>
          )}

          {/* 변환 테스트 */}
          <div className="space-y-2">
            <input
              type="text"
              value={testEquation}
              onChange={(e) => setTestEquation(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-gray-700 rounded"
              placeholder="테스트할 수식"
            />
            <button
              onClick={() => testMutation.mutate(testEquation)}
              disabled={testMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700"
            >
              <TestTube className="w-3 h-3" />
              변환 테스트
            </button>
          </div>

          {/* 테스트 결과 */}
          {testMutation.data && (
            <div className="text-xs bg-gray-700 p-2 rounded">
              <div className={testMutation.data.diagnosis.match ? 'text-green-400' : 'text-red-400'}>
                {testMutation.data.diagnosis.match ? '✓ 정상' : '✗ 불일치 감지'}
              </div>
              {!testMutation.data.diagnosis.match && (
                <div className="text-yellow-400 mt-1">
                  {testMutation.data.diagnosis.recommendation}
                </div>
              )}
            </div>
          )}

          {/* 재로드 버튼 */}
          <button
            onClick={() => reloadMutation.mutate()}
            disabled={reloadMutation.isPending}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-600 rounded hover:bg-orange-700"
          >
            <RefreshCw className={`w-3 h-3 ${reloadMutation.isPending ? 'animate-spin' : ''}`} />
            모듈 재로드
          </button>

          {reloadMutation.data && (
            <div className="text-xs text-green-400">
              {reloadMutation.data.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**작업 내용**:
1. `frontend/src/components/debug/` 디렉토리 생성
2. `DebugPanel.tsx` 생성
3. `App.tsx` 또는 `HangulUploadPage.tsx`에 추가

---

### B-3. HangulUploadPage에 디버그 정보 표시

**파일**: `frontend/src/pages/HangulUploadPage.tsx` (수정)

```typescript
// import 추가
import { DebugPanel } from '../components/debug/DebugPanel';

// 컴포넌트 마지막에 추가
return (
  <div>
    {/* 기존 내용 */}

    {/* 디버그 패널 (개발 환경만) */}
    <DebugPanel />
  </div>
);
```

---

### Phase 20-B 완료 체크리스트

- [ ] B-1: 백엔드 디버그 엔드포인트 추가
- [ ] B-2: 프론트엔드 DebugPanel 컴포넌트 생성
- [ ] B-3: HangulUploadPage에 디버그 패널 연동
- [ ] API 문서 (Swagger) 확인
- [ ] 개발 환경에서만 표시되는지 확인
- [ ] 재로드 기능 동작 확인

---

## Phase 20-C: 구조적 리팩토링

### 목표
의존성 주입 패턴으로 테스트 용이성과 유연성 확보

### C-1. 컨버터 인터페이스 정의

**파일**: `backend/app/services/hangul/interfaces.py` (신규)

```python
"""
Phase 20-C: 서비스 인터페이스 정의
"""
from abc import ABC, abstractmethod
from typing import List, Tuple

class ILatexConverter(ABC):
    """LaTeX 변환기 인터페이스"""

    @abstractmethod
    def convert(self, hwp_eq: str) -> str:
        """HWP 수식을 LaTeX로 변환"""
        pass

class IEquationCleaner(ABC):
    """수식 정리기 인터페이스"""

    @abstractmethod
    def clean(self, equation: str) -> str:
        """HWP 수식을 일반 텍스트로 정리"""
        pass
```

---

### C-2. HMLParser 의존성 주입

**파일**: `backend/app/services/hangul/hml_parser.py` (수정)

```python
# 기존 import 유지
from .interfaces import ILatexConverter
from .hwp_latex_converter import HwpLatexConverter, hwp_to_latex

class HMLParser(HangulParserBase):
    """HML (순수 XML) 파일 파서"""

    def __init__(
        self,
        file_path: str,
        latex_converter: ILatexConverter = None
    ):
        super().__init__(file_path)
        self.tree = None
        self.root = None
        self.extractor = ProblemExtractor()

        # Phase 20-C: 의존성 주입
        self._latex_converter = latex_converter

    @property
    def latex_converter(self) -> ILatexConverter:
        """LaTeX 컨버터 (지연 초기화)"""
        if self._latex_converter is None:
            self._latex_converter = HwpLatexConverter()
        return self._latex_converter

    def _get_paragraph_text_with_latex(self, p_elem) -> tuple:
        """문단에서 텍스트와 LaTeX 버전 모두 추출"""
        # ... 기존 코드 ...

        # 변경: hwp_to_latex() → self.latex_converter.convert()
        latex_eq = self.latex_converter.convert(eq_text)

        # ... 나머지 코드 ...
```

---

### C-3. 라우터에서 의존성 주입

**파일**: `backend/app/routers/hangul.py` (수정)

```python
from app.services.hangul.hwp_latex_converter import HwpLatexConverter

@router.post("/parse")
async def parse_hangul_file(file: UploadFile = File(...)):
    """한글 파일 파싱"""
    # ... 파일 처리 코드 ...

    # Phase 20-C: 매 요청마다 새 컨버터 인스턴스
    converter = HwpLatexConverter()

    if file_ext == '.hml':
        parser = HMLParser(str(temp_file_path), latex_converter=converter)
    else:
        parser = HWPXParser(str(temp_file_path), latex_converter=converter)

    result = parser.parse()
    # ...
```

---

### C-4. 테스트 용이성 확보

**파일**: `backend/tests/test_parser_with_mock.py` (신규)

```python
"""
Phase 20-C: Mock을 사용한 파서 테스트
"""
import pytest
from unittest.mock import Mock
from app.services.hangul.hml_parser import HMLParser
from app.services.hangul.interfaces import ILatexConverter

class MockLatexConverter(ILatexConverter):
    """테스트용 Mock 컨버터"""

    def __init__(self, return_value: str = "MOCK_LATEX"):
        self.return_value = return_value
        self.call_count = 0
        self.last_input = None

    def convert(self, hwp_eq: str) -> str:
        self.call_count += 1
        self.last_input = hwp_eq
        return self.return_value

def test_parser_uses_injected_converter(tmp_path):
    """주입된 컨버터가 사용되는지 확인"""
    # 테스트용 HML 파일 생성
    hml_content = '''<?xml version="1.0"?>
    <HWPML><BODY><SECTION><P><TEXT>테스트</TEXT></P></SECTION></BODY></HWPML>
    '''
    test_file = tmp_path / "test.hml"
    test_file.write_text(hml_content, encoding='utf-8')

    # Mock 컨버터 주입
    mock_converter = MockLatexConverter(return_value="\\test")
    parser = HMLParser(str(test_file), latex_converter=mock_converter)

    # 파싱 실행
    result = parser.parse()

    # Mock이 사용되었는지 확인 (수식이 있는 경우)
    # assert mock_converter.call_count > 0 or len(result.problems) == 0
```

---

### Phase 20-C 완료 체크리스트

- [ ] C-1: 인터페이스 정의
- [ ] C-2: HMLParser 의존성 주입 지원
- [ ] C-3: 라우터에서 인스턴스 주입
- [ ] C-4: Mock 테스트 추가
- [ ] 기존 테스트 호환성 확인
- [ ] HWPXParser도 동일하게 수정 (필요시)

---

## Phase 20-D: 개발 환경 최적화

### 목표
개발자 경험(DX) 향상을 위한 환경 설정

### D-1. 개발 서버 시작 스크립트

**파일**: `backend/dev.ps1` (신규 - Windows PowerShell)

```powershell
# Phase 20-D: 개발 서버 시작 스크립트
# 사용법: .\dev.ps1

Write-Host "=== PDF 라벨링 개발 서버 시작 ===" -ForegroundColor Cyan

# 1. __pycache__ 정리
Write-Host "1. 캐시 정리 중..." -ForegroundColor Yellow
Get-ChildItem -Recurse -Directory -Filter '__pycache__' -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "   완료" -ForegroundColor Green

# 2. 환경 변수 설정
Write-Host "2. 환경 변수 설정..." -ForegroundColor Yellow
$env:PYTHONDONTWRITEBYTECODE = "1"
$env:APP_ENV = "development"
Write-Host "   PYTHONDONTWRITEBYTECODE=1" -ForegroundColor Green
Write-Host "   APP_ENV=development" -ForegroundColor Green

# 3. uvicorn 실행
Write-Host "3. uvicorn 시작..." -ForegroundColor Yellow
Write-Host ""
python -m uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000
```

**파일**: `backend/dev.sh` (신규 - Linux/Mac)

```bash
#!/bin/bash
# Phase 20-D: 개발 서버 시작 스크립트
# 사용법: ./dev.sh

echo "=== PDF 라벨링 개발 서버 시작 ==="

# 1. __pycache__ 정리
echo "1. 캐시 정리 중..."
find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null
echo "   완료"

# 2. 환경 변수 설정
echo "2. 환경 변수 설정..."
export PYTHONDONTWRITEBYTECODE=1
export APP_ENV=development
echo "   PYTHONDONTWRITEBYTECODE=1"
echo "   APP_ENV=development"

# 3. uvicorn 실행
echo "3. uvicorn 시작..."
echo ""
python -m uvicorn app.main:app --reload --reload-dir app --host 0.0.0.0 --port 8000
```

---

### D-2. .env 파일 템플릿

**파일**: `backend/.env.example` (신규)

```bash
# Phase 20-D: 환경 변수 템플릿
# 사용법: cp .env.example .env

# 실행 환경 (development | production | testing)
APP_ENV=development

# Python 바이트코드 생성 비활성화 (개발용)
PYTHONDONTWRITEBYTECODE=1

# 데이터셋 루트 경로
DATASET_ROOT=../dataset_root

# 로그 레벨
LOG_LEVEL=DEBUG
```

---

### D-3. VS Code 설정

**파일**: `.vscode/settings.json` (수정)

```json
{
  "python.envFile": "${workspaceFolder}/backend/.env",
  "python.analysis.extraPaths": ["${workspaceFolder}/backend"],
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["backend/tests"],

  "files.exclude": {
    "**/__pycache__": true,
    "**/*.pyc": true
  },

  "editor.formatOnSave": true
}
```

**파일**: `.vscode/launch.json` (수정/신규)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend: FastAPI Dev",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload", "--port", "8000"],
      "cwd": "${workspaceFolder}/backend",
      "env": {
        "PYTHONDONTWRITEBYTECODE": "1",
        "APP_ENV": "development"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Backend: Debug Single Test",
      "type": "debugpy",
      "request": "launch",
      "module": "pytest",
      "args": ["-v", "-s", "${file}"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal"
    }
  ]
}
```

---

### Phase 20-D 완료 체크리스트

- [ ] D-1: 개발 서버 시작 스크립트 생성
- [ ] D-2: .env.example 템플릿 생성
- [ ] D-3: VS Code 설정 업데이트
- [ ] 스크립트 실행 권한 설정 (Linux/Mac)
- [ ] README에 개발 환경 설정 가이드 추가

---

## Phase 20-E: 문서화 및 가이드

### 목표
향후 유지보수를 위한 문서화

### E-1. 아키텍처 문서

**파일**: `docs/33_architecture_hangul_parser.md` (신규)

내용:
- 시스템 구조도
- 모듈 의존성 다이어그램
- 데이터 흐름 설명
- 확장 포인트 안내

### E-2. 개발 가이드

**파일**: `docs/34_developer_guide.md` (신규)

내용:
- 개발 환경 설정 방법
- 디버그 도구 사용법
- 자주 발생하는 문제와 해결법
- 코드 스타일 가이드

### E-3. CLAUDE.md 업데이트

CLAUDE.md에 Phase 20 완료 내용 추가

---

## 작업 순서 요약

```
Week 1: Phase 20-A (기초 인프라)
├── Day 1-2: A-1, A-2 (환경 유틸 + 싱글톤 개선)
├── Day 3: A-3, A-4 (연동 확인 + 테스트)
└── Day 4-5: 검증 및 버그 수정

Week 2: Phase 20-B (디버그 도구)
├── Day 1-2: B-1 (백엔드 엔드포인트)
├── Day 3-4: B-2, B-3 (프론트엔드 패널)
└── Day 5: 통합 테스트

Week 3: Phase 20-C (구조적 리팩토링)
├── Day 1: C-1 (인터페이스)
├── Day 2-3: C-2, C-3 (의존성 주입)
├── Day 4: C-4 (테스트)
└── Day 5: 회귀 테스트

Week 4: Phase 20-D, E (최적화 + 문서화)
├── Day 1-2: D-1, D-2, D-3 (개발 환경)
├── Day 3-4: E-1, E-2, E-3 (문서화)
└── Day 5: 최종 검토
```

---

## 승인 요청

위 개발 계획에 대해 검토해 주세요.

- **질문이나 수정 사항**이 있으면 말씀해 주세요
- **승인**하시면 Phase 20-A부터 순차적으로 진행하겠습니다
- 각 Phase 완료 시마다 결과를 보고드리겠습니다

---

*작성일: 2025-11-29*
