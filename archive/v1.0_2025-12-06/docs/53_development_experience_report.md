# PDF 라벨링 & 한글 파서 개발 경험 리포트

> 작성일: 2025-12-01
> 목적: 기존 시스템 개발 경험을 정리하여 새로운 설계에 활용

---

## 1. 프로젝트 개요

### 1.1 목표
학원에서 사용할 **수학 문제 자동 추출 및 관리 시스템** 개발

### 1.2 핵심 시스템 (3개)
| 시스템 | 목적 | 입력 | 출력 |
|--------|------|------|------|
| **PDF 라벨링** | 스캔/이미지 PDF에서 문제 영역 추출 | PDF 파일 | 문제 이미지 + 좌표 |
| **HML 파서** | 한글 2007+ 파일에서 문제/정답 추출 | .hml 파일 | 구조화된 문제 데이터 |
| **HWPX 파서** | 한글 NEO 파일에서 문제/정답 추출 | .hwpx 파일 | 구조화된 문제 데이터 |

---

## 2. PDF 라벨링 시스템

### 2.1 처리 파이프라인

```
PDF 업로드
    ↓
페이지별 이미지 변환 (PyMuPDF)
    ↓
블록 검출 (DensityAnalyzer)
    ↓
사용자 라벨링 (React UI)
    ↓
문제 그룹핑
    ↓
PNG + JSON 내보내기
```

### 2.2 핵심 알고리즘: 블록 검출

**DensityAnalyzer** - 텍스트 블록 자동 검출

```python
# 핵심 단계
1. 흰색 배경 제거 (threshold=240)
2. 컬럼 감지 (2단 문서 지원)
3. 형태학적 연산 (morphology)
4. 블록 필터링
   - 크기: 페이지의 1%~20%
   - 종횡비: 0.01~30
   - 밀도: 5% 이상
```

**최적화 포인트:**
- 종횡비 필터링으로 노이즈 40% 감소
- 밀도 임계값으로 빈 블록 제거
- 컬럼 감지로 2단 문서 정확도 향상

### 2.3 핵심 최적화: Progressive Processing (Phase 14-1)

**문제:** 400페이지 PDF → 60초 대기

**해결:** 점진적 처리
```python
# 처음 10페이지만 즉시 처리
result = pipeline.process_pdf_progressive(
    initial_pages=10,  # 즉시 처리
    # 나머지는 백그라운드
)
```

**결과:** 60초 → 10초 (초기 응답)

### 2.4 이미지 최적화 (Phase 14-2, 14-3)

| 최적화 | 효과 |
|--------|------|
| WebP 포맷 | PNG 대비 40% 용량 감소 |
| 썸네일 (50 DPI) | 미리보기 로딩 3배 빠름 |
| 온디맨드 생성 | 초기 디스크 사용 90% 감소 |

### 2.5 데이터 구조

```python
# 블록 데이터
Block {
    block_id: int,
    column: "L" | "R",
    bbox: {x_min, y_min, x_max, y_max},
    pixel_density: float
}

# 페이지 데이터
PageData {
    document_id: str,
    page_index: int,
    blocks: List[Block],
    columns: List[Column]
}
```

### 2.6 배운 점

1. **대용량 처리는 분할 필수** - 사용자 체감 속도가 중요
2. **이미지 포맷 선택이 성능에 큰 영향** - WebP 적극 활용
3. **온디맨드 생성** - 모든 것을 미리 처리하지 않기
4. **유니코드 경로 문제** - OpenCV는 한글 경로 못 읽음 → 별도 유틸리티 필요

---

## 3. HML 파서 시스템

### 3.1 HML 파일 구조 이해

HML = Hancom Markup Language (한글 2007+ 네이티브 XML)

```xml
<HWPML>
  <HEAD>
    <DOCSUMMARY>메타데이터</DOCSUMMARY>
  </HEAD>
  <BODY>
    <SECTION>
      <P>문단1</P>
      <P>문단2</P>
      <EQUATION>수식</EQUATION>
    </SECTION>
  </BODY>
  <TAIL>
    <BINDATA>이미지 바이너리</BINDATA>
  </TAIL>
</HWPML>
```

### 3.2 문제 추출 방식 진화

| Phase | 방식 | 정확도 | 한계 |
|-------|------|--------|------|
| 초기 | 텍스트 패턴 매칭 | 60% | 문제 경계 불명확 |
| 19-B | ENDNOTE 기반 | 95% | ENDNOTE 없는 파일 |
| 21-B | 하이브리드 | 98% | - |

### 3.3 ENDNOTE 기반 추출 (핵심 발견)

**발견:** 대부분의 시험지가 ENDNOTE로 정답/해설 저장

```xml
<ENDNOTE>
  <P>① 정답</P>
  <P>해설 내용...</P>
</ENDNOTE>
```

**추출 로직:**
```python
1. ENDNOTE 태그에서 정답/해설 추출
2. AUTONUM 태그 위치로 문제 경계 파악
3. AUTONUM 사이의 P 태그가 문제 본문
```

### 3.4 수식 변환 (Phase 19-C, 20-H)

**HWP 수식 → 읽기 가능한 텍스트 → LaTeX**

```
입력: "rm A over B sqrt{2} leq x"
  ↓
텍스트: "A/B √(2) ≤ x"
  ↓
LaTeX: "\frac{A}{B} \sqrt{2} \leq x"
```

**변환 규칙 (200개+):**
```python
COMMAND_MAP = {
    'sqrt': '√',
    'leq': '≤',
    'geq': '≥',
    'times': '×',
    'alpha': 'α',
    # ... 200개 이상
}
```

### 3.5 이미지 추출 (Phase 21-A)

**HML 이미지 = Base64 + zlib 압축**

```python
def extract_images(self):
    for bindata in root.iter('BINDATA'):
        # 1. Base64 디코딩
        raw = base64.b64decode(bindata.text)

        # 2. zlib 압축 해제
        if bindata.get('Compress') == 'true':
            raw = zlib.decompress(raw, -15)

        # 3. 저장
        images[bindata.get('Id')] = raw
```

### 3.6 텍스트 정제 (Phase 19-D, 20-O, 20-P)

**제거 대상:**
```
[정답] ② → 제거
[4.20점] → 제거
내신 2024년 → 제거
제1교시 → 제거
```

**중복 제거 (Phase 20-O):**
```
입력: "(가) A (나) B (가) A (나) B"
출력: "(가) A (나) B"
```

### 3.7 배운 점

1. **파일 포맷 분석이 핵심** - ENDNOTE 발견으로 정확도 급상승
2. **정규식만으론 한계** - 구조적 태그 활용 필수
3. **수식 변환은 점진적으로** - 새 패턴 발견 시 추가
4. **바이너리 처리 주의** - zlib 모드(-15)가 중요

---

## 4. HWPX 파서 시스템

### 4.1 HWPX 파일 구조

HWPX = ZIP 기반 (DOCX와 유사)

```
document.hwpx (ZIP)
├── Contents/
│   ├── header.xml      # 메타데이터
│   └── section0.xml    # 본문
└── BinData/
    ├── image1.jpg      # 이미지 (직접 저장)
    └── image2.png
```

### 4.2 HML vs HWPX 비교

| 항목 | HML | HWPX |
|------|-----|------|
| 형식 | 순수 XML | ZIP + XML |
| 이미지 | Base64+zlib | 직접 파일 |
| 수식 | EQUATION 태그 | equation 태그 |
| 복잡도 | 높음 | 낮음 |
| ENDNOTE | 지원 | 드물게 사용 |

### 4.3 파싱 흐름

```python
def parse(self):
    # 1. ZIP 추출
    with zipfile.ZipFile(self.file_path) as zf:
        zf.extractall(self.temp_dir)

    # 2. section XML 파싱
    paragraphs = self._parse_section_file()

    # 3. 이미지 추출 (BinData 폴더에서)
    images = self._extract_images()

    # 4. 문제 추출 (패턴 기반)
    problems = self.extractor.extract_problems(paragraphs)

    # 5. 정리
    shutil.rmtree(self.temp_dir)
```

### 4.4 배운 점

1. **HWPX가 더 다루기 쉬움** - ZIP 구조가 명확
2. **이미지 처리 간단** - 디코딩 불필요
3. **ENDNOTE 적음** - 패턴 매칭 의존도 높음
4. **임시 폴더 관리 중요** - 반드시 cleanup

---

## 5. 공통 아키텍처 패턴

### 5.1 의존성 주입 (Phase 20-C)

```python
class HMLParser:
    def __init__(self, file_path, latex_converter=None):
        # 주입된 컨버터 사용 또는 기본값
        self._converter = latex_converter or hwp_to_latex
```

**장점:**
- 테스트 시 Mock 주입 가능
- 유연한 의존성 관리

### 5.2 싱글톤 패턴 (Phase 20-A, 20-B)

```python
_converter = None

def _get_converter():
    global _converter

    if is_development():
        # 개발: 파일 변경 시 재생성
        if file_changed():
            _converter = HwpLatexConverter()
    else:
        # 운영: 한 번만 생성
        if _converter is None:
            _converter = HwpLatexConverter()

    return _converter
```

**장점:**
- 메모리 효율 (단일 인스턴스)
- 개발 중 핫 리로드 지원

### 5.3 상속 구조

```
HangulParserBase (추상)
├── extract_text()    [추상]
├── extract_images()  [추상]
└── parse()          [추상]
    │
    ├── HMLParser     (XML 파싱)
    └── HWPXParser    (ZIP + XML 파싱)
```

---

## 6. 데이터 모델

### 6.1 ParsedProblem (문제 데이터)

```python
@dataclass
class ParsedProblem:
    id: str                    # UUID
    number: str                # "1", "01-1" 등

    # 본문
    content_text: str          # 평문
    content_latex: str         # LaTeX 포함
    content_images: List[str]  # 이미지 ID
    content_equations: List[str]

    # 정답
    answer: str
    answer_type: str           # choice|value|expression|text

    # 해설
    explanation: str

    # 배점
    points: float
```

### 6.2 ParseResult (파싱 결과)

```python
@dataclass
class ParseResult:
    file_name: str
    file_type: str             # 'hml' | 'hwpx'
    problems: List[ParsedProblem]
    detected_metadata: Dict
    success: bool
    warnings: List[str]
    errors: List[str]
```

---

## 7. API 설계 패턴

### 7.1 파싱 API

```
POST /api/hangul/parse
├── 입력: multipart/form-data (파일)
└── 출력: ParseResult JSON
```

### 7.2 저장 API (Phase 18-A)

```
POST /api/hangul/save
├── 입력: 문제 배열 + 메타데이터
├── 처리: 원자적 쓰기 (트랜잭션)
└── 출력: 저장된 문제 ID
```

### 7.3 휴지통 API (Phase 18-B)

```
POST /api/hangul/problems/move-to-trash  # 소프트 삭제
GET  /api/hangul/trash                   # 휴지통 조회
POST /api/hangul/trash/restore           # 복원
DELETE /api/hangul/trash/empty           # 영구 삭제
```

---

## 8. 파일 저장 구조

### 8.1 PDF 라벨링

```
dataset_root/documents/{document_id}/
├── meta.json           # PDF 경로, 페이지 수
├── pages/              # 페이지 이미지
├── thumbs/             # 썸네일
├── blocks/             # 블록 JSON
└── groups/             # 사용자 그룹핑
```

### 8.2 문제은행 (한글 파서)

```
dataset_root/problem_bank/
├── index.json          # 마스터 인덱스
├── images/             # 문제 이미지
├── problems/           # 문제 JSON
├── answers/            # 정답 JSON
└── explanations/       # 해설 JSON
```

---

## 9. 보안 및 안정성

### 9.1 파일 락 (Phase 18-A)

```python
@contextmanager
def file_lock(path):
    lock = path.with_suffix('.lock')
    lock.touch()
    try:
        yield
    finally:
        lock.unlink()
```

### 9.2 원자적 쓰기

```python
def atomic_write(path, data):
    temp = path.with_suffix('.tmp')
    with open(temp, 'w') as f:
        json.dump(data, f)
    temp.replace(path)  # 원자적 교체
```

### 9.3 경로 순회 방지

```python
if '..' in filename or '/' in filename:
    raise HTTPException(400, "Invalid path")
```

---

## 10. 성능 특성

### 10.1 PDF 블록 검출

| 문서 크기 | 첫 페이지 | 전체 |
|-----------|-----------|------|
| 10페이지 | ~2초 | ~5초 |
| 50페이지 | ~2초 | ~25초 |
| 400페이지 | ~2초 | ~10초 (점진적) |

### 10.2 HML 파싱

| 문제 수 | 시간 |
|---------|------|
| 1-5개 | ~100ms |
| 20-50개 | ~500ms |
| 100개+ | ~2초 |

### 10.3 메모리 사용

| 작업 | 일반 | 최적화 후 |
|------|------|-----------|
| PDF 400페이지 | 150MB | 20MB |
| HML 50문제 | 10MB | 10MB |

---

## 11. 핵심 교훈 요약

### 11.1 기술적 교훈

| 영역 | 교훈 |
|------|------|
| **대용량 처리** | 점진적 처리 + 백그라운드 태스크 |
| **파일 포맷** | 구조 분석이 정확도의 핵심 |
| **수식 처리** | 변환 규칙 점진적 확장 |
| **이미지** | 포맷 선택과 온디맨드 생성 |
| **안정성** | 원자적 쓰기 + 파일 락 |

### 11.2 아키텍처 교훈

| 패턴 | 적용 | 효과 |
|------|------|------|
| **DI** | 파서에 컨버터 주입 | 테스트 용이성 |
| **싱글톤** | 컨버터 인스턴스 | 메모리 효율 |
| **상속** | Parser 추상 클래스 | 코드 재사용 |
| **팩토리** | 파서 생성 | 확장성 |

### 11.3 UX 교훈

| 문제 | 해결 |
|------|------|
| 긴 대기 시간 | 점진적 처리 + 진행률 표시 |
| 실수로 삭제 | 휴지통 시스템 |
| 복잡한 UI | 단계별 워크플로우 |

---

## 12. 재사용 가능한 코드

### 12.1 핵심 모듈

| 모듈 | 용도 | 재사용성 |
|------|------|----------|
| `DensityAnalyzer` | 이미지 블록 검출 | 높음 |
| `HwpLatexConverter` | HWP→LaTeX 변환 | 높음 |
| `ProblemExtractor` | 패턴 기반 문제 추출 | 중간 |
| `atomic_write` | 안전한 파일 쓰기 | 높음 |

### 12.2 유틸리티 함수

```python
# 한글 경로 이미지 읽기
imread_unicode(path) → np.ndarray

# 안전한 JSON 쓰기
atomic_json_write(path, data)

# HWP 수식 정제
clean_hwp_equation(eq) → str

# HWP → LaTeX
hwp_to_latex(eq) → str
```

---

## 13. 향후 개선 방향

### 13.1 단기

- [ ] 더 많은 수식 패턴 지원
- [ ] OCR 연동 (이미지 문제 텍스트화)
- [ ] 배치 처리 최적화

### 13.2 장기

- [ ] AI 기반 문제 분류
- [ ] 자동 난이도 추정
- [ ] 유사 문제 검색

---

*이 리포트는 PDF 라벨링, HML 파서, HWPX 파서 개발 경험을 정리한 문서입니다.*
*새로운 시스템 설계 시 참고 자료로 활용하세요.*
