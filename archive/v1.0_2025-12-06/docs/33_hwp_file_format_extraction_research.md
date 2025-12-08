# 한글 문서 형식 (HWP/HWPX/HML) 문제 추출 연구 리포트

**날짜**: 2025-11-28
**요청**: HWP, HWPX, HML 확장자에서 문제은행 데이터 수집 가능성 분석
**분석 대상 파일**:
- `내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml` (276KB)
- `동산고등학교_1학년_2024_2학기기말_수학(하)_공통_문제_정답.hwp` (62KB)
- `[21차][고2][라이트SSEN 수학1]01-지수-125제.hwpx` (1.5MB)

---

## 1. 파일 형식 분석

### 1.1 세 가지 형식 비교

| 속성 | HWP | HWPX | HML |
|------|-----|------|-----|
| **형식** | 바이너리 (CFB) | ZIP + XML | 순수 XML |
| **공개 여부** | 2010년 공개 | 2021년 기본 형식 | 공개 |
| **파싱 난이도** | 높음 | 중간 | 낮음 |
| **수식 지원** | 바이너리 스트림 | XML 태그 | XML 태그 |
| **이미지 저장** | OLE 스트림 | BinData/ 폴더 | Base64 인코딩 |

### 1.2 실제 파일 구조 분석

#### HML 파일 (XML)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<HWPML Version="2.8" SubVersion="8.0.1.0">
  <HEAD>
    <DOCSUMMARY>
      <TITLE>포스트매스</TITLE>
      <AUTHOR>수학비서</AUTHOR>
    </DOCSUMMARY>
    <MAPPINGTABLE>
      <BINDATALIST Count="3">
        <BINITEM BinData="1" Format="bmp" Type="Embedding" />
      </BINDATALIST>
    </MAPPINGTABLE>
  </HEAD>
  <BODY>
    <SECTION>
      <P ParaShape="8">
        <TEXT CharShape="0">문제 텍스트...</TEXT>
      </P>
    </SECTION>
  </BODY>
</HWPML>
```

**장점**:
- 표준 XML 파서로 즉시 파싱 가능
- 텍스트, 수식, 이미지 위치 모두 구조화
- Python `xml.etree.ElementTree` 또는 `lxml`로 처리

#### HWPX 파일 (ZIP 아카이브)
```
[21차][고2][라이트SSEN 수학1]01-지수-125제.hwpx
├── mimetype
├── version.xml
├── Contents/
│   ├── header.xml (92KB)
│   ├── masterpage0.xml
│   └── section0.xml (본문)
└── BinData/
    ├── image1.jpg (400KB)
    ├── image2.jpg
    └── ... (이미지들)
```

**장점**:
- ZIP 압축 해제 후 XML 파싱
- 이미지가 별도 파일로 분리되어 추출 용이
- OWPML(KS X 6101) 국가 표준 준수

#### HWP 파일 (바이너리)
```
Compound File Binary Format (OLE)
├── PrvText (미리보기 텍스트)
├── FileHeader
├── DocInfo (문서 정보)
├── BodyText/Section0 (본문, zlib 압축)
├── BinData/BIN0001.bmp (이미지)
└── Scripts (스크립트)
```

**과제**:
- 복잡한 바이너리 구조
- zlib 압축 해제 필요
- 수식은 별도 바이너리 스트림

---

## 2. 오픈소스 라이브러리 분석

### 2.1 Python 라이브러리

| 라이브러리 | 지원 형식 | 기능 | 상태 |
|-----------|----------|------|------|
| **[pyhwp](https://github.com/mete0r/pyhwp)** | HWP5 | 텍스트 추출, ODT 변환 | 비활성 |
| **[libhwp](https://github.com/hahnlee/hwp-rs)** | HWP, HWPX | 문단/테이블/이미지 추출 | 활성 |
| **[pyhwpx](https://github.com/martiniifun/pyhwpx)** | HWPX | 한글 자동화 | 활성 |
| **[olefile](https://pypi.org/project/olefile/)** | HWP | OLE 스트림 읽기 | 안정 |
| **[hwp-extract](https://github.com/volexity/hwp-extract)** | HWP | 메타데이터/객체 추출 | 활성 |

### 2.2 JavaScript 라이브러리

| 라이브러리 | 지원 형식 | 기능 |
|-----------|----------|------|
| **[hwp.js](https://github.com/hahnlee/hwp.js/)** | HWP5 | 웹 뷰어/파서 |
| **[hwp-parser](https://github.com/nicktogo/hwp-parser)** | HWP | Node.js 파서 |

### 2.3 기타

| 언어 | 라이브러리 | 설명 |
|------|-----------|------|
| **Rust** | [hwp-rs](https://github.com/hahnlee/hwp-rs) | 고성능 파서 + Python 바인딩 |
| **Java** | [hwplib](https://github.com/neolord0/hwplib) | 한글 파일 완전 지원 |

---

## 3. 수식 추출 기술

### 3.1 HWP 수식 형식

한글의 수식은 자체 스크립트 형식으로 저장됩니다:
```
# 한글 수식 예시
x = {-b +- sqrt { b^2 - 4ac }} over {2a}
```

### 3.2 수식 변환 도구

| 도구 | 기능 | 출력 형식 |
|------|------|----------|
| **[바풀 HML 변환기](https://zdnet.co.kr/view/?no=20161229092520)** | HML 수식 → LaTeX | LaTeX |
| **[martinii.fun 도구](https://martinii.fun/115)** | 수식 → PNG/MathML | 이미지, MathML |
| **한글 자체 기능** | XML 저장 → GIF | 이미지 |

### 3.3 LaTeX 변환 예시
```
한글 수식: x = {-b +- sqrt { b^2 - 4ac }} over {2a}
     ↓
LaTeX: x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
```

---

## 4. 문제 추출 전략

### 4.1 형식별 추출 접근법

#### HML 파일 (최적)
```python
import xml.etree.ElementTree as ET

def extract_from_hml(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()

    # 본문 텍스트 추출
    for para in root.findall('.//P'):
        text_elem = para.find('.//TEXT')
        if text_elem is not None:
            print(text_elem.text)

    # 이미지 데이터 추출
    for binitem in root.findall('.//BINITEM'):
        bin_id = binitem.get('BinData')
        format = binitem.get('Format')
        # Base64 디코딩 또는 참조 처리
```

#### HWPX 파일 (권장)
```python
import zipfile
import xml.etree.ElementTree as ET

def extract_from_hwpx(file_path):
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        # 본문 XML 읽기
        with zip_ref.open('Contents/section0.xml') as f:
            tree = ET.parse(f)
            # 텍스트/수식 추출

        # 이미지 직접 추출
        for name in zip_ref.namelist():
            if name.startswith('BinData/'):
                zip_ref.extract(name, 'output/')
```

#### HWP 파일 (복잡)
```python
import olefile
import zlib

def extract_from_hwp(file_path):
    ole = olefile.OleFileIO(file_path)

    # 미리보기 텍스트 (간단)
    if ole.exists('PrvText'):
        text = ole.openstream('PrvText').read().decode('utf-16')

    # 본문 (압축됨)
    if ole.exists('BodyText/Section0'):
        data = ole.openstream('BodyText/Section0').read()
        decompressed = zlib.decompress(data, -15)
        # 바이너리 레코드 파싱 필요

    # 이미지
    for entry in ole.listdir():
        if entry[0] == 'BinData':
            img_data = ole.openstream('/'.join(entry)).read()
```

### 4.2 문제 단위 분리 알고리즘

```python
def detect_problem_boundaries(paragraphs):
    """
    문제 번호 패턴으로 문제 경계 감지

    패턴 예시:
    - "1.", "2.", "3." ...
    - "1)", "2)", "3)" ...
    - "[1]", "[2]", "[3]" ...
    - "문제 1", "문제 2" ...
    """
    import re

    problem_patterns = [
        r'^(\d+)\.\s',           # 1. 2. 3.
        r'^(\d+)\)\s',           # 1) 2) 3)
        r'^\[(\d+)\]\s',         # [1] [2] [3]
        r'^문제\s*(\d+)',         # 문제 1, 문제 2
        r'^(\d+)번',              # 1번, 2번
    ]

    problems = []
    current_problem = None

    for para in paragraphs:
        for pattern in problem_patterns:
            match = re.match(pattern, para.text)
            if match:
                if current_problem:
                    problems.append(current_problem)
                current_problem = {
                    'number': match.group(1),
                    'content': [para]
                }
                break
        else:
            if current_problem:
                current_problem['content'].append(para)

    if current_problem:
        problems.append(current_problem)

    return problems
```

---

## 5. 경쟁 서비스 분석

### 5.1 족보닷컴 (이투스)

> 출처: [족보닷컴](https://www.zocbo.com/), [나무위키](https://namu.wiki/w/족보닷컴)

| 항목 | 내용 |
|------|------|
| **운영** | 이투스교육 자회사 교육지대 |
| **서비스** | 중/고등 내신 문제은행, 족보 클라우드 |
| **파일 형식** | HWP 제공 (한글 2010 이상 필요) |
| **제약** | Windows 전용, MAC 미지원 |

**시사점**: 족보닷컴도 HWP 형식 그대로 제공하며, 별도의 웹 파싱 시스템은 공개되지 않음

### 5.2 Qn.AI (OCR 기반)

> 출처: [Qn.AI](https://qnai.io/front/usage)

| 항목 | 내용 |
|------|------|
| **기술** | 딥러닝 OCR |
| **입력** | 스캔 이미지, PDF, 스냅샷 |
| **출력** | 편집 가능한 문서 (텍스트+수식) |
| **특징** | 필기 인식, GUI 에디터 제공 |

**시사점**: 이미지 기반 접근법으로 형식 제약 우회

### 5.3 MathOCR

> 출처: [MathOCR](https://mathocr.net/)

| 항목 | 내용 |
|------|------|
| **입력** | PDF 스캔 문제집 |
| **출력** | HWP (수식 포함) |
| **특징** | 문항번호 미주번호 변환, 해설 자동 연결 |

### 5.4 HwpMath

> 출처: [HwpMath](https://hwpmath.store/)

| 항목 | 내용 |
|------|------|
| **기술** | AI OCR |
| **입력** | 수학 문제 이미지 |
| **출력** | HWP 파일 |

---

## 6. 기술적 가능성 평가

### 6.1 형식별 구현 난이도

| 형식 | 텍스트 추출 | 수식 추출 | 이미지 추출 | 총평 |
|------|------------|----------|------------|------|
| **HML** | 매우 쉬움 | 쉬움 | 중간 | **최적** |
| **HWPX** | 쉬움 | 중간 | 매우 쉬움 | **권장** |
| **HWP** | 중간 | 어려움 | 중간 | 가능 |

### 6.2 추천 구현 전략

```
우선순위 1: HWPX/HML 지원 (낮은 난이도, 높은 가치)
           ↓
우선순위 2: HWP 기본 지원 (텍스트/이미지)
           ↓
우선순위 3: HWP 수식 지원 (LaTeX 변환)
           ↓
우선순위 4: OCR 폴백 (이미지→텍스트)
```

### 6.3 하이브리드 접근법

```
┌─────────────────────────────────────────────────────────┐
│                    파일 업로드                          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   확장자 감지        │
              └─────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │  .hml   │    │  .hwpx  │    │  .hwp   │
    └─────────┘    └─────────┘    └─────────┘
         │               │               │
         ▼               ▼               ▼
    XML 파싱        ZIP 해제 +      olefile +
                   XML 파싱        libhwp
         │               │               │
         └───────────────┴───────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  문제 단위 분리      │
              │  (번호 패턴 감지)    │
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  문제은행 저장       │
              │  - 텍스트           │
              │  - 수식 (LaTeX)     │
              │  - 이미지           │
              └─────────────────────┘
```

---

## 7. 구현 계획

### Phase A: HML/HWPX 파서 (권장 시작점)

```
A-1. HML XML 파서 구현
     - 텍스트 추출
     - 수식 스크립트 추출
     - 이미지 Base64 디코딩

A-2. HWPX ZIP 핸들러
     - ZIP 압축 해제
     - Contents/*.xml 파싱
     - BinData/ 이미지 추출

A-3. 문제 분리 알고리즘
     - 번호 패턴 감지
     - 문제-보기-해설 구조화
```

### Phase B: HWP 바이너리 파서

```
B-1. olefile 기반 스트림 읽기
B-2. zlib 압축 해제
B-3. 레코드 구조 파싱
B-4. libhwp Python 바인딩 활용
```

### Phase C: 수식 처리

```
C-1. 한글 수식 → LaTeX 변환기
C-2. 수식 → 이미지 렌더링 (선택)
C-3. MathML 출력 (선택)
```

### Phase D: OCR 폴백

```
D-1. PDF/이미지 변환 파이프라인
D-2. 기존 블록 검출 시스템 연동
D-3. 수식 OCR 통합 (Qn.AI API 또는 자체 모델)
```

---

## 8. 결론

### 핵심 발견

1. **HML 형식이 가장 파싱하기 쉬움**
   - 순수 XML 구조
   - 표준 라이브러리로 즉시 처리 가능
   - 제공된 샘플 파일이 이미 HML 형식

2. **HWPX가 차선책이자 미래 표준**
   - 2021년부터 한글 기본 형식
   - ZIP + XML로 구조화
   - 이미지 추출이 가장 용이

3. **HWP 바이너리도 처리 가능**
   - 다양한 오픈소스 라이브러리 존재
   - libhwp (Rust+Python)이 가장 완성도 높음

4. **경쟁 서비스들은 대부분 OCR 기반**
   - 형식 제약 없이 이미지에서 추출
   - 우리도 기존 PDF 파이프라인과 연계 가능

### 권장 사항

| 우선순위 | 작업 | 예상 효과 |
|----------|------|----------|
| **1** | HML 파서 구현 | 즉시 문제 추출 가능 |
| **2** | HWPX 파서 구현 | 최신 파일 지원 |
| **3** | 문제 분리 알고리즘 | 자동 문제 단위 분할 |
| **4** | HWP 기본 지원 | 레거시 파일 호환 |
| **5** | 수식 LaTeX 변환 | 수식 편집 가능 |

---

## 참고 자료

### 공식 문서
- [한컴테크 - HWPX 포맷 구조](https://tech.hancom.com/hwpxformat/)
- [한컴테크 - Python HWP 파싱 가이드](https://tech.hancom.com/python-hwp-parsing-1/)
- [한글문서파일형식 수식 스펙](https://cdn.hancom.com/link/docs/한글문서파일형식_수식_revision1.2.pdf)

### 오픈소스 프로젝트
- [pyhwp - Python HWP 파서](https://github.com/mete0r/pyhwp)
- [hwp-rs / libhwp - Rust HWP 파서](https://github.com/hahnlee/hwp-rs)
- [hwp.js - JavaScript HWP 뷰어](https://github.com/hahnlee/hwp.js/)
- [hwplib - Java HWP 라이브러리](https://github.com/neolord0/hwplib)
- [hwp-extract - HWP 추출 도구](https://github.com/volexity/hwp-extract)

### 관련 서비스
- [Qn.AI - 수학문제 OCR](https://qnai.io/)
- [MathOCR](https://mathocr.net/)
- [HwpMath](https://hwpmath.store/)
- [족보닷컴](https://www.zocbo.com/)

---

*리포트 작성: Claude Code (Opus)*
*날짜: 2025-11-28*
