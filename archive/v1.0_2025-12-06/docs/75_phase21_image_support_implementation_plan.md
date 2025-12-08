# Phase 21: HML 이미지 지원 구현 계획

## 개요

**작성일:** 2025-11-29
**Phase:** 21
**상태:** 계획 완료 - 구현 대기
**예상 복잡도:** 중상

---

## 1. 현재 상태 분석

### 1.1 검증된 사실

| 항목 | 상태 | 설명 |
|------|------|------|
| 이미지 추출 | ✅ 가능 | `extract_images_test.py`로 검증 완료 |
| 압축 해제 | ✅ 가능 | zlib raw deflate (-15) 사용 |
| 이미지-문제 매핑 | ❌ 미구현 | PICTURE 태그 위치 기반 매핑 필요 |
| API 서빙 | ❌ 미구현 | 이미지 엔드포인트 필요 |
| 프론트엔드 표시 | ❌ 미구현 | React 컴포넌트 수정 필요 |

### 1.2 HML 이미지 구조 (확정)

```
┌─────────────────────────────────────────────────────────────────┐
│ HEAD/BINDATALIST                                                │
│   └─ BINITEM BinData="1" Format="bmp"  ← 메타데이터            │
│   └─ BINITEM BinData="2" Format="bmp"                          │
├─────────────────────────────────────────────────────────────────┤
│ BODY/SECTION                                                    │
│   └─ P (문제 7)                                                 │
│       └─ SHAPEOBJECT                                           │
│           └─ PICTURE  ← BinData 참조                           │
│   └─ P (문제 21)                                               │
│       └─ SHAPEOBJECT                                           │
│           └─ PICTURE  ← BinData 참조                           │
├─────────────────────────────────────────────────────────────────┤
│ TAIL/BINDATASTORAGE                                             │
│   └─ BINDATA Id="1" Compress="true" ← Base64 + zlib 압축 데이터│
│   └─ BINDATA Id="2" Compress="true"                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 구현 단계 개요

```
Phase 21-A: 이미지 추출 로직 수정
     ↓
Phase 21-B: 이미지-문제 매핑 구현
     ↓
Phase 21-C: 이미지 저장 시스템
     ↓
Phase 21-D: API 엔드포인트 추가
     ↓
Phase 21-E: 프론트엔드 이미지 표시
     ↓
Phase 21-F: 테스트 및 검증
```

---

## 3. Phase 21-A: 이미지 추출 로직 수정

### 3.1 목표

현재 `hml_parser.py`의 `extract_images()` 함수가 0개를 반환하는 문제 수정

### 3.2 현재 코드 문제점

```python
# 현재 코드 (hml_parser.py:471-486)
for elem in self.root.iter():
    if elem.tag in ('BINITEM', 'BinItem'):
        bin_id = elem.get('BinData') or elem.get('Id')
        if bin_id:
            # 문제: BINDATA가 BINITEM 내부에 없음!
            data_elem = elem.find('.//BINDATA')  # ← 항상 None
```

### 3.3 수정 방안

```python
def extract_images(self) -> Dict[str, bytes]:
    """
    HML 파일에서 이미지 데이터를 추출합니다.

    Returns:
        Dict[str, bytes]: {BinData ID: 이미지 바이너리 데이터}
    """
    images = {}

    # 1단계: BINITEM에서 메타데이터 수집
    self._binitem_metadata = {}
    for item in self.root.iter('BINITEM'):
        bid = item.get('BinData')
        fmt = item.get('Format', 'bin')
        if bid:
            self._binitem_metadata[bid] = {'format': fmt}

    # 2단계: BINDATA에서 실제 데이터 추출 (별도 위치!)
    for data in self.root.iter('BINDATA'):
        bid = data.get('Id')
        if not bid or not data.text:
            continue

        try:
            # Base64 디코딩
            raw_data = base64.b64decode(data.text.strip())

            # 압축 해제 (Compress="true"인 경우)
            if data.get('Compress', '').lower() == 'true':
                raw_data = zlib.decompress(raw_data, -15)  # raw deflate

            images[bid] = raw_data

        except Exception as e:
            logger.warning(f"이미지 추출 실패 (ID={bid}): {e}")

    return images
```

### 3.4 파일 수정 목록

| 파일 | 수정 내용 |
|------|----------|
| `hml_parser.py` | `extract_images()` 함수 전면 재작성 |
| `hml_parser.py` | `import zlib` 추가 |

### 3.5 테스트 케이스

```python
def test_extract_images_returns_data():
    """이미지 추출이 데이터를 반환하는지 확인"""
    parser = HMLParser(TEST_FILE)
    images = parser.extract_images()
    assert len(images) >= 2
    assert '1' in images
    assert '2' in images

def test_extracted_image_is_valid_bmp():
    """추출된 이미지가 유효한 BMP인지 확인"""
    parser = HMLParser(TEST_FILE)
    images = parser.extract_images()
    # BMP 시그니처 확인
    assert images['1'][:2] == b'BM'
```

---

## 4. Phase 21-B: 이미지-문제 매핑 구현

### 4.1 목표

PICTURE 태그의 위치를 기반으로 어떤 이미지가 어떤 문제에 속하는지 매핑

### 4.2 매핑 전략

```
전략 1: ENDNOTE 기반 (현재 파서의 문제 구분 방식)
- 각 ENDNOTE가 문제의 시작점
- PICTURE가 어느 ENDNOTE 구간에 있는지 확인

전략 2: 위치 기반
- PICTURE 태그의 파일 내 위치 추적
- 가장 가까운 이전 문제 번호에 매핑
```

### 4.3 구현 방안

```python
def _map_images_to_problems(
    self,
    problems: List[ParsedProblem],
    images: Dict[str, bytes]
) -> None:
    """
    추출된 이미지를 해당 문제에 매핑합니다.

    Args:
        problems: 파싱된 문제 리스트
        images: 추출된 이미지 딕셔너리
    """
    # 1. PICTURE 태그와 BinData 참조 매핑
    picture_bindata_map = {}
    for picture in self.root.iter('PICTURE'):
        # 부모 SHAPEOBJECT에서 InstId 찾기
        parent = picture.getparent()
        while parent is not None:
            if parent.tag == 'SHAPEOBJECT':
                # BinData 참조 찾기
                bindata_ref = parent.find('.//IMAGEOBJECT')
                if bindata_ref is not None:
                    bid = bindata_ref.get('BinData')
                    if bid:
                        picture_bindata_map[picture] = bid
                break
            parent = parent.getparent()

    # 2. PICTURE 위치와 문제 구간 매핑
    # (ENDNOTE 기반 또는 위치 기반)
    endnote_positions = []
    for i, endnote in enumerate(self.root.iter('ENDNOTE')):
        # 각 ENDNOTE의 시작 위치 및 문제 번호 저장
        endnote_positions.append({
            'index': i,
            'element': endnote,
            'problem_number': i + 1  # 1-indexed
        })

    # 3. 각 PICTURE를 해당 문제에 할당
    for picture, bid in picture_bindata_map.items():
        if bid not in images:
            continue

        # PICTURE가 어느 ENDNOTE 구간에 있는지 확인
        problem_idx = self._find_problem_for_element(picture, endnote_positions)

        if problem_idx is not None and problem_idx < len(problems):
            # 이미지 경로 생성 (저장 후 경로)
            img_filename = f"image_{bid}.{self._binitem_metadata.get(bid, {}).get('format', 'bin')}"
            problems[problem_idx].content_images.append(img_filename)

def _find_problem_for_element(
    self,
    element: ET.Element,
    endnote_positions: List[Dict]
) -> Optional[int]:
    """
    요소가 속한 문제 인덱스를 찾습니다.
    """
    # 요소의 조상 중 ENDNOTE를 찾거나,
    # 요소의 문서 내 위치를 기반으로 판단
    # ...
    pass
```

### 4.4 대안: 텍스트 기반 매핑

ENDNOTE 기반이 복잡할 경우, 더 간단한 방법:

```python
def _map_images_by_text_proximity(self, problems, images):
    """
    '그림' 키워드가 있는 문제에 이미지 할당
    """
    problems_with_figure = [
        p for p in problems
        if '그림' in p.content_text
    ]

    # 이미지 순서대로 매핑 (간단하지만 덜 정확)
    for i, bid in enumerate(sorted(images.keys())):
        if i < len(problems_with_figure):
            img_filename = f"image_{bid}.bmp"
            problems_with_figure[i].content_images.append(img_filename)
```

### 4.5 파일 수정 목록

| 파일 | 수정 내용 |
|------|----------|
| `hml_parser.py` | `_map_images_to_problems()` 구현 |
| `hml_parser.py` | `_find_problem_for_element()` 구현 |
| `hml_parser.py` | 266행 주석 해제 및 호출 |

---

## 5. Phase 21-C: 이미지 저장 시스템

### 5.1 목표

추출된 이미지를 파일 시스템에 저장하고 경로 관리

### 5.2 저장 구조

```
dataset_root/
└── {document_id}/
    ├── pages/          # 기존
    ├── blocks/         # 기존
    ├── groups/         # 기존
    ├── problems/       # 기존
    └── images/         # 신규
        ├── image_1.bmp
        ├── image_2.bmp
        └── metadata.json
```

### 5.3 구현 방안

```python
# backend/app/services/hangul/image_storage.py

from pathlib import Path
from typing import Dict
import json

class ImageStorage:
    """HML 이미지 저장 및 관리"""

    def __init__(self, base_dir: Path):
        self.base_dir = base_dir
        self.images_dir = base_dir / 'images'
        self.images_dir.mkdir(parents=True, exist_ok=True)

    def save_images(
        self,
        images: Dict[str, bytes],
        metadata: Dict[str, Dict]
    ) -> Dict[str, str]:
        """
        이미지를 파일로 저장하고 경로 반환

        Args:
            images: {bid: binary_data}
            metadata: {bid: {format: 'bmp', ...}}

        Returns:
            {bid: saved_file_path}
        """
        saved_paths = {}

        for bid, data in images.items():
            fmt = metadata.get(bid, {}).get('format', 'bin')
            filename = f"image_{bid}.{fmt}"
            filepath = self.images_dir / filename

            filepath.write_bytes(data)
            saved_paths[bid] = str(filepath.relative_to(self.base_dir))

        # 메타데이터 저장
        meta_file = self.images_dir / 'metadata.json'
        meta_file.write_text(json.dumps({
            'images': saved_paths,
            'metadata': metadata
        }, ensure_ascii=False, indent=2))

        return saved_paths

    def get_image_path(self, bid: str) -> Optional[Path]:
        """이미지 파일 경로 반환"""
        for ext in ['bmp', 'png', 'jpg', 'bin']:
            path = self.images_dir / f"image_{bid}.{ext}"
            if path.exists():
                return path
        return None
```

### 5.4 파일 생성/수정 목록

| 파일 | 작업 |
|------|------|
| `image_storage.py` | 신규 생성 |
| `hml_parser.py` | ImageStorage 통합 |
| `hangul.py` (라우터) | 이미지 저장 호출 |

---

## 6. Phase 21-D: API 엔드포인트 추가

### 6.1 목표

프론트엔드에서 이미지를 요청할 수 있는 API 엔드포인트 생성

### 6.2 API 설계

```
GET /api/hangul/images/{document_id}/{image_filename}
```

### 6.3 구현 방안

```python
# backend/app/routers/hangul.py

from fastapi.responses import FileResponse
from pathlib import Path

@router.get("/images/{document_id}/{filename}")
async def get_image(document_id: str, filename: str):
    """
    문서의 이미지 파일 반환

    Args:
        document_id: 문서 ID
        filename: 이미지 파일명 (예: image_1.bmp)

    Returns:
        이미지 파일
    """
    # 경로 검증 (path traversal 방지)
    if '..' in filename or '/' in filename or '\\' in filename:
        raise HTTPException(400, "Invalid filename")

    # 파일 경로 구성
    image_path = Path(settings.dataset_root) / document_id / 'images' / filename

    if not image_path.exists():
        raise HTTPException(404, "Image not found")

    # MIME 타입 결정
    ext = image_path.suffix.lower()
    media_types = {
        '.bmp': 'image/bmp',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
    }
    media_type = media_types.get(ext, 'application/octet-stream')

    return FileResponse(image_path, media_type=media_type)
```

### 6.4 파일 수정 목록

| 파일 | 수정 내용 |
|------|----------|
| `hangul.py` | `/images/{document_id}/{filename}` 엔드포인트 추가 |

---

## 7. Phase 21-E: 프론트엔드 이미지 표시

### 7.1 목표

문제 카드에서 이미지가 있는 경우 표시

### 7.2 UI 설계

```
┌─────────────────────────────────────┐
│ 7. 그림의 각 칸에는 수 또는 식이...│
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │     [이미지 표시 영역]        │  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│ ① √2  ② 2  ③ 2√2  ④ 3  ⑤ 3√2    │
└─────────────────────────────────────┘
```

### 7.3 구현 방안

```tsx
// frontend/src/components/ProblemCard.tsx

interface ProblemCardProps {
  problem: {
    number: number;
    content_text: string;
    content_latex: string;
    content_images: string[];  // 이미지 경로 배열
    // ...
  };
  documentId: string;
}

const ProblemCard: React.FC<ProblemCardProps> = ({ problem, documentId }) => {
  return (
    <div className="problem-card">
      <div className="problem-number">{problem.number}.</div>

      <div className="problem-content">
        {/* LaTeX 렌더링된 문제 텍스트 */}
        <LatexContent content={problem.content_latex} />

        {/* 이미지가 있는 경우 표시 */}
        {problem.content_images.length > 0 && (
          <div className="problem-images">
            {problem.content_images.map((img, idx) => (
              <img
                key={idx}
                src={`/api/hangul/images/${documentId}/${img}`}
                alt={`문제 ${problem.number} 이미지 ${idx + 1}`}
                className="problem-image"
                loading="lazy"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 7.4 스타일링

```css
/* frontend/src/styles/problem.css */

.problem-images {
  margin: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.problem-image {
  max-width: 100%;
  height: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #fafafa;
}

/* 이미지 로딩 중 플레이스홀더 */
.problem-image-loading {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}
```

### 7.5 파일 수정 목록

| 파일 | 수정 내용 |
|------|----------|
| `ProblemCard.tsx` | 이미지 표시 로직 추가 |
| `api/hangul.ts` | 이미지 URL 헬퍼 함수 |
| `types.ts` | `content_images` 타입 정의 확인 |

---

## 8. Phase 21-F: 테스트 및 검증

### 8.1 백엔드 테스트

```python
# backend/tests/test_image_support.py

class TestImageExtraction:
    """이미지 추출 테스트"""

    def test_extract_images_count(self):
        """이미지 개수 확인"""
        parser = HMLParser(TEST_FILE)
        images = parser.extract_images()
        assert len(images) == 2

    def test_image_format_bmp(self):
        """BMP 형식 확인"""
        parser = HMLParser(TEST_FILE)
        images = parser.extract_images()
        assert images['1'][:2] == b'BM'  # BMP 시그니처

    def test_image_decompression(self):
        """압축 해제 확인"""
        parser = HMLParser(TEST_FILE)
        images = parser.extract_images()
        # 압축 해제 후 크기 확인
        assert len(images['1']) > 100000  # 256KB 예상


class TestImageMapping:
    """이미지-문제 매핑 테스트"""

    def test_problem_7_has_image(self):
        """문제 7에 이미지 있음"""
        parser = HMLParser(TEST_FILE)
        result = parser.parse()
        problem_7 = next(p for p in result.problems if p.number == 7)
        assert len(problem_7.content_images) > 0

    def test_problem_21_has_image(self):
        """문제 21에 이미지 있음"""
        parser = HMLParser(TEST_FILE)
        result = parser.parse()
        problem_21 = next(p for p in result.problems if p.number == 21)
        assert len(problem_21.content_images) > 0


class TestImageAPI:
    """이미지 API 테스트"""

    def test_get_image_success(self, client):
        """이미지 조회 성공"""
        response = client.get("/api/hangul/images/test-doc/image_1.bmp")
        assert response.status_code == 200
        assert response.headers['content-type'] == 'image/bmp'

    def test_get_image_not_found(self, client):
        """이미지 없음"""
        response = client.get("/api/hangul/images/test-doc/nonexistent.bmp")
        assert response.status_code == 404
```

### 8.2 프론트엔드 테스트

```tsx
// frontend/src/components/__tests__/ProblemCard.test.tsx

describe('ProblemCard', () => {
  it('renders images when content_images is not empty', () => {
    const problem = {
      number: 7,
      content_text: '그림의 각 칸에는...',
      content_images: ['image_1.bmp'],
    };

    render(<ProblemCard problem={problem} documentId="test-doc" />);

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/api/hangul/images/test-doc/image_1.bmp');
  });

  it('does not render image container when no images', () => {
    const problem = {
      number: 1,
      content_text: '다항식 계산...',
      content_images: [],
    };

    render(<ProblemCard problem={problem} documentId="test-doc" />);

    expect(screen.queryByRole('img')).toBeNull();
  });
});
```

### 8.3 통합 테스트 체크리스트

```
□ HML 파일 업로드 후 이미지 추출 확인
□ 문제 7에 이미지 표시 확인
□ 문제 21에 이미지 표시 확인
□ 이미지 클릭 시 확대 (선택적)
□ 이미지 로딩 중 스피너 표시
□ 이미지 로딩 실패 시 에러 표시
□ 다른 HML 파일에서도 작동 확인
```

---

## 9. 구현 순서 및 의존성

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 21-A: 이미지 추출 수정                                │
│ - hml_parser.py 수정                                       │
│ - 단위 테스트 작성                                          │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 21-C: 이미지 저장 시스템                              │
│ - image_storage.py 생성                                    │
│ - 저장 로직 구현                                            │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 21-B: 이미지-문제 매핑                                │
│ - _map_images_to_problems() 구현                           │
│ - 파서 통합                                                 │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 21-D: API 엔드포인트                                  │
│ - /images/{doc}/{file} 엔드포인트                          │
│ - 보안 검증                                                 │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 21-E: 프론트엔드                                      │
│ - ProblemCard 수정                                         │
│ - 스타일링                                                  │
└─────────────────┬───────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 21-F: 테스트 및 검증                                  │
│ - 전체 통합 테스트                                          │
│ - 사용자 확인                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. 위험 요소 및 대응 방안

### 10.1 기술적 위험

| 위험 | 영향 | 대응 방안 |
|------|------|----------|
| PICTURE-BinData 매핑 실패 | 이미지가 잘못된 문제에 표시 | 텍스트 기반 대안 매핑 사용 |
| 이미지 압축 해제 실패 | 일부 이미지 누락 | 다양한 압축 방식 시도 |
| 대용량 이미지 성능 | 페이지 로딩 느림 | 이미지 압축/리사이징 적용 |
| 다른 HML 버전 호환성 | 일부 파일에서 작동 안 함 | 버전별 분기 처리 |

### 10.2 대응 전략

**이미지 매핑 실패 시 대안:**
```python
# 간단한 대안: '그림' 텍스트가 있는 문제에 순서대로 매핑
if not mapped_successfully:
    problems_with_figure = [p for p in problems if '그림' in p.content_text]
    for i, bid in enumerate(sorted(images.keys())):
        if i < len(problems_with_figure):
            problems_with_figure[i].content_images.append(f"image_{bid}.bmp")
```

---

## 11. 파일 변경 요약

### 11.1 신규 생성

| 파일 | 설명 |
|------|------|
| `backend/app/services/hangul/image_storage.py` | 이미지 저장 클래스 |
| `backend/tests/test_image_support.py` | 이미지 관련 테스트 |

### 11.2 수정

| 파일 | 수정 내용 |
|------|----------|
| `backend/app/services/hangul/hml_parser.py` | `extract_images()`, `_map_images_to_problems()` |
| `backend/app/routers/hangul.py` | 이미지 API 엔드포인트 |
| `frontend/src/components/ProblemCard.tsx` | 이미지 표시 |
| `frontend/src/api/hangul.ts` | 이미지 URL 헬퍼 |

---

## 12. 완료 기준

### 12.1 필수 기준

- [ ] 문제 7의 이미지가 프론트엔드에 표시됨
- [ ] 문제 21의 이미지가 프론트엔드에 표시됨
- [ ] 이미지가 없는 문제는 이미지 영역 없음
- [ ] 모든 기존 테스트 통과
- [ ] 새 테스트 통과

### 12.2 선택 기준

- [ ] 이미지 클릭 시 확대 모달
- [ ] 이미지 로딩 중 스켈레톤 UI
- [ ] BMP → PNG/WebP 자동 변환 (용량 최적화)

---

## 13. 결론

### 13.1 핵심 포인트

1. **이미지 추출은 검증됨**: `extract_images_test.py`로 작동 확인
2. **핵심 과제는 매핑**: PICTURE 태그 위치 → 문제 번호 연결
3. **점진적 구현 가능**: A→C→B→D→E→F 순서로 각 단계 독립 테스트

### 13.2 권장 진행 순서

```
1. Phase 21-A: 이미지 추출 수정 (30분)
2. Phase 21-C: 저장 시스템 구축 (20분)
3. Phase 21-B: 매핑 구현 (1시간) ← 핵심
4. Phase 21-D: API 추가 (20분)
5. Phase 21-E: 프론트엔드 (30분)
6. Phase 21-F: 테스트 (30분)
```

**총 예상 시간: 약 3시간**

---

*Phase 21 구현 계획 작성: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
