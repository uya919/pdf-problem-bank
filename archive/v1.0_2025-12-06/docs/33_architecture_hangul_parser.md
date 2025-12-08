# Phase 20: 한글 파서 아키텍처 문서

## 1. 시스템 개요

한글 파일(HWPX/HML)에서 수학 문제를 파싱하고 LaTeX 변환을 수행하는 시스템입니다.

### 핵심 기능
- HML/HWPX 파일 파싱
- HWP 수식 → LaTeX 변환
- ENDNOTE 기반 문제/정답 추출

---

## 2. 모듈 구조

```
backend/app/
├── routers/
│   ├── hangul.py          # 파싱 API 엔드포인트
│   └── debug.py           # 디버그 API (Phase 20-B)
│
├── services/hangul/
│   ├── __init__.py
│   ├── interfaces.py       # 추상 인터페이스 (Phase 20-C)
│   ├── parser_base.py      # 파서 기본 클래스
│   ├── hml_parser.py       # HML 파서 (DI 지원)
│   ├── hwpx_parser.py      # HWPX 파서
│   ├── hwp_latex_converter.py  # LaTeX 변환 싱글톤
│   └── problem_extractor.py    # 문제 추출기
│
└── utils/
    └── environment.py      # 환경 감지 유틸 (Phase 20-A)
```

---

## 3. 의존성 다이어그램

```
                    ┌─────────────────┐
                    │   hangul.py     │
                    │   (Router)      │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │HMLParser │   │HWPXParser│   │debug.py  │
       └────┬─────┘   └──────────┘   └────┬─────┘
            │                              │
            │ (선택적 DI)                   │
            ▼                              ▼
    ┌───────────────────────────────────────────┐
    │         hwp_latex_converter.py            │
    │   (Lazy Singleton + mtime 체크)           │
    └───────────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ environment.py │
                    │ (환경 감지)    │
                    └────────────────┘
```

---

## 4. 데이터 흐름

### 4.1 파싱 요청 흐름

```
1. 클라이언트: POST /api/hangul/parse (HML 파일)
       │
       ▼
2. hangul.py: 파일 확장자 확인, 임시 파일 저장
       │
       ▼
3. HMLParser 생성 (latex_converter=None → 싱글톤 사용)
       │
       ▼
4. XML 파싱: ET.parse(file_path)
       │
       ▼
5. ENDNOTE 검사 → 3개 이상이면 ENDNOTE 기반 추출
       │
       ▼
6. 수식 변환: _convert_to_latex() → hwp_to_latex()
       │
       ▼
7. ParseResult 반환 (problems, answers, metadata)
```

### 4.2 싱글톤 리로드 흐름 (개발 환경)

```
1. hwp_to_latex("rm A") 호출
       │
       ▼
2. _get_converter() 실행
       │
       ├─ 개발 환경? ──Yes──┐
       │                   ▼
       │         파일 mtime 확인
       │                   │
       │         mtime 변경됨? ──Yes──┐
       │                   │         ▼
       │                   │    싱글톤 재생성
       │                   │         │
       │                   ▼         ▼
       └─────────────────► 기존 인스턴스 반환
```

---

## 5. 주요 클래스

### 5.1 ILatexConverter (인터페이스)

```python
from abc import ABC, abstractmethod

class ILatexConverter(ABC):
    @abstractmethod
    def convert(self, hwp_eq: str) -> str:
        """HWP 수식 → LaTeX 변환"""
        pass

    @abstractmethod
    def get_info(self) -> dict:
        """변환기 상태 정보"""
        pass
```

### 5.2 HMLParser (의존성 주입 지원)

```python
class HMLParser(HangulParserBase):
    def __init__(
        self,
        file_path: str,
        latex_converter: Optional[ILatexConverter] = None
    ):
        self._latex_converter = latex_converter

    def _convert_to_latex(self, hwp_eq: str) -> str:
        if self._latex_converter is not None:
            return self._latex_converter.convert(hwp_eq)
        else:
            return hwp_to_latex(hwp_eq)  # 기본 싱글톤
```

### 5.3 hwp_latex_converter (싱글톤)

```python
# 모듈 레벨 상태
_converter = None
_converter_file_mtime = 0

def _get_converter():
    global _converter, _converter_file_mtime

    current_mtime = _get_file_mtime()

    # 개발 환경에서만 mtime 체크
    if is_development():
        if _converter is None or current_mtime > _converter_file_mtime:
            _converter = HWPEquationConverter()
            _converter_file_mtime = current_mtime
    else:
        # 프로덕션: 한 번 생성 후 유지
        if _converter is None:
            _converter = HWPEquationConverter()

    return _converter
```

---

## 6. 환경별 동작

| 환경 | APP_ENV | 싱글톤 리로드 | 디버그 API |
|------|---------|--------------|-----------|
| 개발 | development | ✅ mtime 체크 | ✅ 활성화 |
| 프로덕션 | production | ❌ 고정 | ❌ 비활성화 |
| 테스트 | testing | ❌ 고정 | ✅ 활성화 |

---

## 7. 확장 포인트

### 7.1 새로운 수식 패턴 추가

`hwp_latex_converter.py`의 `HWPEquationConverter` 클래스에 패턴 추가:

```python
self.patterns.append((
    r'\bNEW_PATTERN\b',
    r'\\newlatex{}'
))
```

### 7.2 Mock 컨버터 사용 (테스트)

```python
class MockConverter(ILatexConverter):
    def convert(self, hwp_eq: str) -> str:
        return f"MOCK_{hwp_eq}"

parser = HMLParser("test.hml", latex_converter=MockConverter())
```

### 7.3 새로운 파서 타입 추가

1. `interfaces.py`에 인터페이스 정의
2. `HangulParserBase` 상속하여 구현
3. `hangul.py`에서 확장자별 분기 추가

---

## 8. 디버그 도구

### 8.1 Debug Panel (프론트엔드)

`HangulUploadPage.tsx` 하단에 접을 수 있는 Debug Panel 제공:
- 컨버터 상태 (인스턴스 ID, 자동 리로드 여부)
- 테스트 변환 (입력 → 출력 확인)
- 강제 리로드 버튼

### 8.2 Debug API (백엔드)

| 엔드포인트 | 설명 |
|-----------|------|
| GET /api/debug/status | 시스템 상태 조회 |
| POST /api/debug/test-convert | 테스트 변환 |
| POST /api/debug/reload-converter | 강제 리로드 |
| GET /api/debug/patterns | 등록된 패턴 조회 |

---

*작성일: 2025-11-29*
*Phase 20 완료*
