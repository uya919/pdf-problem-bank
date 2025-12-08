# Phase 21: HML 파일 이미지 지원 심층 분석 리포트

## 개요

**작성일:** 2025-11-29
**Phase:** 21 (예정)
**상태:** 분석 완료 - 구현 필요
**심각도:** 중요 (문제 완전성에 영향)

---

## 1. 분석 배경

### 1.1 사용자 보고

> "문제에 그림이 포함된 경우가 있는걸 알고있니? 7번과 21번밖에 이미지가 없어"

### 1.2 분석 목적

1. HML 파일 내 이미지 존재 여부 확인
2. 이미지 포함 문제 식별
3. 현재 파서의 이미지 처리 상태 점검
4. 이미지 지원 구현 방안 제시

---

## 2. HML 파일 이미지 구조 분석

### 2.1 테스트 파일 정보

```
파일: 내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml
크기: 274,354 문자
문제 수: 21개
```

### 2.2 이미지 관련 태그 현황

| 태그 | 개수 | 설명 |
|------|------|------|
| `<PICTURE>` | 2 | 이미지 삽입 태그 |
| `<BINITEM>` | 3 | 이미지 파일 정의 |
| `<SHAPEOBJECT>` | 240 | 도형/이미지 컨테이너 |

### 2.3 BINITEM (이미지 파일 목록)

```xml
<BINITEM BinData="1" Format="bmp" Type="Embedding" />
<BINITEM BinData="2" Format="bmp" Type="Embedding" />
<BINITEM BinData="3" Format="png" Type="Embedding" />
```

**결론:** 3개의 이미지 파일이 HML에 내장되어 있음 (BMP 2개, PNG 1개)

---

## 3. 문제별 이미지 분석

### 3.1 이미지 포함 문제 확인

| 문제 | PICTURE 태그 | 위치 | '그림' 텍스트 | content_images |
|------|-------------|------|-------------|----------------|
| 7 | ✅ | 93,135 | "그림의 각 칸에는 수 또는 식이 있다..." | ❌ 빈 리스트 |
| 21 | ✅ | 215,841 | "그림과 같이 세 점 O(0,0), A(3,6), B(6,2)..." | ❌ 빈 리스트 |

### 3.2 사용자 확인과 일치

**사용자:** "7번과 21번밖에 이미지가 없어"
**분석 결과:** 정확히 일치 ✓

### 3.3 문제 내용 미리보기

**문제 7:**
```
그림의 각 칸에는 수 또는 식이 있다. 가로, 세로, 대각선으로 배열된 세 수
또는 식의 합이 모두 같을 때, 양수 x, y에 대하여 x+y의 값은?
① √2 ② 2 ③ ...
```

**문제 21:**
```
그림과 같이 세 점 O(0,0), A(3,6), B(6,2)를 꼭짓점으로 하는
삼각형 OAB가 있다. 두 점 O, A에서 각각 AB, OB에 내린 수선의 발을...
```

---

## 4. 현재 파서의 이미지 처리 상태

### 4.1 데이터 모델

```python
# backend/app/services/hangul/parser_base.py:17
@dataclass
class ParsedProblem:
    content_images: List[str] = field(default_factory=list)  # 이미지 경로들
```

**결론:** 이미지 필드는 정의되어 있으나 비어있음

### 4.2 이미지 추출 함수

```python
# backend/app/services/hangul/hml_parser.py:461
def extract_images(self) -> Dict[str, bytes]:
    """이미지 추출 (구현됨)"""
    images = {}
    # BINITEM에서 BinData 추출
    # BINDATA 태그에서 Base64 디코딩
    return images
```

**문제점:** `extract_images()` 호출 후 결과가 0개 반환

### 4.3 이미지 매핑 로직

```python
# backend/app/services/hangul/hml_parser.py:266
# 6. 이미지 매핑 (추후 구현)
# self._map_images_to_problems(result.problems, images)  ← 주석처리됨
```

**결론:** 이미지-문제 매핑 로직이 **미구현** 상태

---

## 5. 근본 원인 분석

### 5.1 이미지 추출 실패 원인

`extract_images()` 함수가 0개를 반환하는 이유:

```python
# 현재 코드 (hml_parser.py:471-486)
for elem in self.root.iter():
    if elem.tag in ('BINITEM', 'BinItem'):
        bin_id = elem.get('BinData') or elem.get('Id')
        if bin_id:
            data_elem = elem.find('.//BINDATA') or elem.find('.//BinData')
            if data_elem is not None and data_elem.text:
                image_data = base64.b64decode(data_elem.text)
                images[bin_id] = image_data
```

**문제:**
1. `BINDATA` 태그가 `BINITEM` 태그 **내부에 없음** (별도 위치에 있음)
2. HML 구조: `BINITEM`은 메타데이터만, 실제 데이터는 `<BINDATASTORAGE>` 내에 있음

### 5.2 HML 이미지 구조

```xml
<!-- 메타데이터 (BINITEM) -->
<BINDATALIST Count="3">
  <BINITEM BinData="1" Format="bmp" Type="Embedding" />
  <BINITEM BinData="2" Format="bmp" Type="Embedding" />
  <BINITEM BinData="3" Format="png" Type="Embedding" />
</BINDATALIST>

<!-- 실제 데이터 (별도 위치) -->
<BINDATASTORAGE>
  <BINDATA Compress="true" Encoding="Base64" Id="1" Size="10057">
    ... Base64 데이터 ...
  </BINDATA>
  <BINDATA Compress="true" Encoding="Base64" Id="2" Size="37067">
    ... Base64 데이터 ...
  </BINDATA>
</BINDATASTORAGE>
```

### 5.3 이미지-문제 매핑 미구현

`_map_images_to_problems()` 함수가 주석처리되어 있어:
- 이미지 추출이 성공해도 문제에 연결되지 않음
- `content_images` 필드는 항상 빈 리스트

---

## 6. 문제 영향도 분석

### 6.1 현재 상태의 영향

| 영향 범위 | 설명 |
|----------|------|
| 문제 완전성 | 이미지가 없으면 문제를 풀 수 없음 |
| 사용자 경험 | "그림과 같이..."라고 하는데 그림이 없음 |
| 데이터 품질 | 학습 자료로서 가치 저하 |

### 6.2 영향받는 문제 비율

- 현재 테스트 파일: 21개 중 2개 (9.5%)
- 수학 문제집 일반: 약 10-30%가 그림 포함 (추정)

---

## 7. 구현 방안

### 7.1 단계별 구현 계획

#### Phase 21-A: 이미지 추출 수정

```python
def extract_images(self) -> Dict[str, bytes]:
    """이미지 추출 (수정)"""
    images = {}

    # 1. BINITEM에서 메타데이터 수집
    binitem_map = {}
    for item in self.root.iter('BINITEM'):
        bid = item.get('BinData')
        fmt = item.get('Format')
        binitem_map[bid] = fmt

    # 2. BINDATA에서 실제 데이터 추출
    for data in self.root.iter('BINDATA'):
        bid = data.get('Id')
        if bid and data.text:
            raw_data = base64.b64decode(data.text)
            # Compress="true"면 zlib 해제
            if data.get('Compress') == 'true':
                raw_data = zlib.decompress(raw_data, -15)
            images[bid] = raw_data

    return images
```

#### Phase 21-B: 이미지-문제 매핑

```python
def _map_images_to_problems(self, problems, images):
    """이미지를 문제에 매핑"""
    # PICTURE 태그 위치 기반 매핑
    # 1. 각 PICTURE 태그의 BinData 참조 찾기
    # 2. 해당 위치가 어느 문제 구간인지 파악
    # 3. 문제의 content_images에 이미지 경로 추가
```

#### Phase 21-C: 이미지 저장 및 서빙

```python
# 이미지 파일로 저장
def save_images(self, images, output_dir):
    for bid, data in images.items():
        ext = self.binitem_map.get(bid, 'bin')
        path = output_dir / f"image_{bid}.{ext}"
        path.write_bytes(data)
```

#### Phase 21-D: 프론트엔드 이미지 표시

```tsx
// 문제 컴포넌트에서 이미지 표시
{problem.content_images.map((img, i) => (
  <img key={i} src={`/api/images/${img}`} alt={`문제 이미지 ${i+1}`} />
))}
```

### 7.2 예상 작업량

| 단계 | 예상 난이도 | 설명 |
|------|------------|------|
| 21-A | 중 | 이미지 추출 로직 수정 |
| 21-B | 상 | 위치 기반 매핑 로직 (ENDNOTE 연동) |
| 21-C | 하 | 파일 저장/서빙 |
| 21-D | 중 | 프론트엔드 UI |

---

## 8. 임시 해결책 (Workaround)

이미지 지원 구현 전까지:

### 8.1 텍스트로 안내

문제 텍스트에 "그림"이 포함된 경우:
```
⚠️ 이 문제에는 그림이 포함되어 있습니다. 원본 파일을 참조하세요.
```

### 8.2 이미지 포함 문제 표시

프론트엔드에서 이미지 포함 문제에 아이콘 표시:
```tsx
{problem.content_text.includes('그림') && <ImageIcon />}
```

---

## 9. 결론

### 9.1 핵심 발견

1. **이미지 존재 확인:** 문제 7, 21에 이미지 포함 (사용자 확인과 일치)
2. **추출 실패 원인:** `BINDATA` 태그 위치 탐색 오류
3. **매핑 미구현:** `_map_images_to_problems()` 주석처리

### 9.2 권장 조치

| 우선순위 | 조치 |
|----------|------|
| 1 | Phase 21-A: 이미지 추출 로직 수정 |
| 2 | Phase 21-B: 이미지-문제 매핑 구현 |
| 3 | Phase 21-C/D: 저장 및 프론트엔드 |

### 9.3 다음 단계

사용자 확인 후 Phase 21 구현 진행:
- `opus thinkharder`로 상세 설계
- 또는 `진행해줘`로 바로 구현

---

## 10. 부록: 기술 상세

### 10.1 HML 이미지 관련 태그 구조

```
HWPML
├── HEAD
│   └── BINDATALIST
│       ├── BINITEM BinData="1" Format="bmp"
│       ├── BINITEM BinData="2" Format="bmp"
│       └── BINITEM BinData="3" Format="png"
│
├── BODY
│   └── SECTION
│       └── P
│           └── SHAPEOBJECT
│               └── PICTURE
│                   └── (BinData 참조)
│
└── TAIL
    └── BINDATASTORAGE
        ├── BINDATA Id="1" (Base64, Compressed)
        ├── BINDATA Id="2" (Base64, Compressed)
        └── BINDATA Id="3" (Base64, Compressed)
```

### 10.2 관련 코드 위치

| 파일 | 라인 | 설명 |
|------|------|------|
| [hml_parser.py](../backend/app/services/hangul/hml_parser.py) | 245 | `extract_images()` 호출 |
| [hml_parser.py](../backend/app/services/hangul/hml_parser.py) | 266 | 매핑 함수 (주석처리) |
| [hml_parser.py](../backend/app/services/hangul/hml_parser.py) | 461-487 | `extract_images()` 구현 |
| [parser_base.py](../backend/app/services/hangul/parser_base.py) | 17 | `content_images` 필드 |

---

*Phase 21 분석 리포트 작성: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
