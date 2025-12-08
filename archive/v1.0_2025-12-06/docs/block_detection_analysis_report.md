# 블록 검출 품질 분석 및 개선 방안 리포트

**작성일**: 2025-11-16
**분석 대상**: Phase 1 블록 검출 알고리즘
**참고 기준**: `pixel_block_analysis_1.png`

---

## 1. 현재 상태 분석

### 1.1 현재 결과 (test_result_visualization.png)

**검출된 블록 수**: 18개
**주요 문제점**:
- ❌ **과도한 분할**: 각 글자, 숫자, 기호가 개별 블록으로 검출됨
- ❌ **의미 단위 미인식**: "문제 01", "문제 02" 등 의미 있는 텍스트 단위로 묶이지 않음
- ❌ **수식 블록 파편화**: 수학 수식 `∫f(x)dx` 같은 표현이 여러 조각으로 분리됨
- ❌ **문제 단위 미검출**: 하나의 문제 전체가 하나의 블록이어야 하는데 그렇지 않음

**예시**:
```
현재: Block1="문", Block2="제", Block3="0", Block4="1", ...
목표: Block1="문제 01 [전체 문제 내용]"
```

### 1.2 참고 기준 (pixel_block_analysis_1.png)

참고 이미지는 **다층 분석 시스템**을 보여줍니다:

1. **Left vs Right Region Density**
   - 좌우 컬럼의 밀집도 프로파일 분석
   - 수평 투영(Horizontal Projection) 사용

2. **Detailed Block-level Analysis**
   - 픽셀 밀집도 히스토그램
   - 블록 레벨 통계 분석

3. **Cumulative Density Curve**
   - 누적 밀집도 분석으로 임계값 결정

4. **High Resolution Density Map**
   - 픽셀 레벨 밀집도 히트맵 (보라색 배경)
   - 텍스트 영역이 명확히 구분됨

5. **Detected Non-white Regions**
   - 최종적으로 **의미 있는 크기의 블록**들로 검출
   - 초록색 박스: 문제 단위 또는 문단 단위 블록

**핵심 차이점**:
- 참고 이미지: **계층적, 통계적 분석** → 의미 있는 블록
- 현재 구현: **단순 윤곽선 검출** → 글자 단위 파편화

---

## 2. 근본 원인 분석

### 2.1 현재 알고리즘의 한계

**density_analyzer.py의 _find_blocks() 메서드**:
```python
# 현재 코드
kernel = np.ones((3, 3), np.uint8)  # ❌ 너무 작은 커널
mask_cleaned = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
contours, _ = cv2.findContours(mask_cleaned, cv2.RETR_EXTERNAL, ...)
```

**문제점**:
1. **3x3 커널**: 글자 간 간격을 연결하기에 너무 작음
2. **MORPH_OPEN만 사용**: 열림 연산만으로는 텍스트 연결 불충분
3. **단일 패스 검출**: 계층적 분석 없이 한 번에 검출 시도
4. **병합 로직 없음**: 가까운 블록들을 그룹핑하는 후처리 없음

### 2.2 수학 문제집의 특성

수학 문제집은 일반 문서와 다른 특성이 있습니다:

- **수식 표현**: `∫`, `∑`, 분수, 지수 등 복잡한 기호
- **혼합 레이아웃**: 문제 번호 + 본문 + 보기 + 해설
- **다양한 간격**: 글자 간격, 줄 간격, 문제 간격이 각각 다름
- **2단 레이아웃**: 좌우 컬럼 분리

**현재 알고리즘이 놓치는 것**:
- 텍스트 라인(줄) 단위 인식
- 단락(문단) 단위 인식
- 문제 경계 인식 (문제 번호 패턴)

---

## 3. 개선 방안

### 3.1 단기 개선 (즉시 적용 가능)

#### A. 모폴로지 연산 강화

**목표**: 글자들을 라인/단락 단위로 연결

```python
# 수평 연결 (같은 줄의 글자들 연결)
horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (50, 1))
horizontal_connected = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, horizontal_kernel)

# 수직 연결 (같은 단락의 줄들 연결)
vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 20))
vertical_connected = cv2.morphologyEx(horizontal_connected, cv2.MORPH_CLOSE, vertical_kernel)

# 최종 정리
final_kernel = np.ones((5, 5), np.uint8)
mask_cleaned = cv2.morphologyEx(vertical_connected, cv2.MORPH_OPEN, final_kernel)
```

**예상 효과**: 글자 단위 → 라인/단락 단위 블록

#### B. 블록 병합 알고리즘

**목표**: 가까운 블록들을 하나로 합침

```python
def merge_nearby_blocks(blocks, threshold_x=50, threshold_y=30):
    """
    가까운 블록들을 병합

    - X축으로 threshold_x 이내: 같은 줄
    - Y축으로 threshold_y 이내: 같은 단락
    """
    merged = []
    # 병합 로직 구현
    return merged
```

#### C. 최소 블록 크기 증가

```python
# .env 파일
MIN_BLOCK_SIZE=100  # 20 → 100으로 증가
MIN_BLOCK_AREA=5000  # 새로운 설정: 최소 면적
```

**예상 효과**: 작은 노이즈 블록 제거

---

### 3.2 중기 개선 (재설계 필요)

#### A. 투영 기반 분석

**Projection Profile Analysis**:

```python
def analyze_projection(mask):
    """수평/수직 투영 분석"""
    # 수평 투영 (각 행의 검은 픽셀 수)
    h_projection = np.sum(mask, axis=1)

    # 수직 투영 (각 열의 검은 픽셀 수)
    v_projection = np.sum(mask, axis=0)

    # 피크 검출로 텍스트 라인 찾기
    lines = find_peaks(h_projection, threshold=100)

    return lines
```

**적용**:
1. 수평 투영으로 텍스트 라인 식별
2. 각 라인 내에서 수직 투영으로 단어/블록 분리
3. 라인들을 그룹핑하여 단락 형성

#### B. 계층적 블록 검출

**3단계 계층 구조**:

```
Level 1: 픽셀 → 글자 (현재 구현)
Level 2: 글자 → 라인 (투영 분석)
Level 3: 라인 → 단락/문제 (간격 분석)
```

**알고리즘**:
```python
def hierarchical_detection(mask):
    # Level 1: 기본 블록 검출
    char_blocks = detect_basic_blocks(mask)

    # Level 2: 라인 단위 그룹핑
    lines = group_into_lines(char_blocks, y_threshold=20)

    # Level 3: 단락 단위 그룹핑
    paragraphs = group_into_paragraphs(lines, y_gap_threshold=50)

    return paragraphs
```

#### C. 적응적 임계값 (Adaptive Thresholding)

**문제**: 단일 WHITE_THRESHOLD는 모든 영역에 부적합

**해결**:
```python
# 영역별로 다른 임계값 적용
adaptive_mask = cv2.adaptiveThreshold(
    gray,
    255,
    cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv2.THRESH_BINARY_INV,
    blockSize=11,
    C=2
)
```

---

### 3.3 장기 개선 (고급 기법)

#### A. 밀집도 히트맵 생성

참고 이미지의 **High Resolution Density Map** 재현:

```python
def create_density_heatmap(mask, block_size=(10, 10)):
    """
    픽셀 밀집도 히트맵 생성

    - 이미지를 작은 블록으로 나눔
    - 각 블록의 밀집도 계산
    - 히트맵 시각화
    """
    height, width = mask.shape
    heatmap = np.zeros((height // block_size[1], width // block_size[0]))

    for i in range(0, height, block_size[1]):
        for j in range(0, width, block_size[0]):
            block = mask[i:i+block_size[1], j:j+block_size[0]]
            density = np.sum(block > 0) / block.size
            heatmap[i//block_size[1], j//block_size[0]] = density

    return heatmap
```

**활용**:
- 밀집도가 높은 영역 = 텍스트 영역
- 밀집도가 낮은 영역 = 여백
- 히스토그램 분석으로 최적 임계값 자동 결정

#### B. 텍스트 라인 검출 알고리즘

**Hough Transform 활용**:
```python
# 텍스트 라인을 직선으로 모델링
lines = cv2.HoughLinesP(mask, 1, np.pi/180, threshold=100)

# 수평선 필터링
horizontal_lines = filter_horizontal(lines, angle_threshold=5)

# 라인 기반으로 블록 분할
blocks = split_by_lines(mask, horizontal_lines)
```

#### C. 문제 번호 패턴 인식

**목표**: "문제 01", "문제 02" 패턴으로 문제 경계 식별

```python
def detect_problem_boundaries(blocks, ocr_engine):
    """
    OCR로 문제 번호 인식 → 문제 경계 자동 판단
    """
    problem_starts = []

    for block in blocks:
        text = ocr_engine.recognize(block)
        if re.match(r'문제\s*\d+', text):
            problem_starts.append(block)

    return problem_starts
```

**장점**: 완전 자동화된 문제 단위 분할

---

## 4. 구현 우선순위

### Priority 1: 즉시 적용 (1-2일)

✅ **모폴로지 커널 크기 조정**
- 수평 연결 커널: (50, 1)
- 수직 연결 커널: (1, 20)
- 테스트 및 파라미터 튜닝

✅ **최소 블록 크기 증가**
- MIN_BLOCK_SIZE: 20 → 100
- MIN_BLOCK_AREA: 5000 추가

✅ **블록 병합 알고리즘 추가**
- X축 임계값: 50px
- Y축 임계값: 30px

**예상 결과**: 글자 단위 → 단어/줄 단위

---

### Priority 2: 단기 개선 (3-5일)

✅ **투영 기반 라인 검출**
- `analyze_projection()` 메서드 추가
- 수평/수직 투영 분석
- 피크 검출로 텍스트 라인 식별

✅ **계층적 블록 검출 (2단계)**
- Level 1: 글자 검출
- Level 2: 라인 그룹핑

✅ **적응적 임계값**
- `cv2.adaptiveThreshold` 도입
- 영역별 최적 임계값 자동 결정

**예상 결과**: 줄 단위 → 단락 단위

---

### Priority 3: 중기 개선 (1-2주)

✅ **밀집도 히트맵 생성**
- 참고 이미지의 히트맵 재현
- 시각화 기능 추가

✅ **계층적 블록 검출 (3단계)**
- Level 3 추가: 단락 → 문제 단위

✅ **통계 분석 기능**
- 블록 크기 분포
- 밀집도 분포
- 누적 분포 곡선

**예상 결과**: 참고 이미지 수준의 분석

---

### Priority 4: 장기 개선 (선택사항)

⬜ **OCR 통합**
- Tesseract 또는 EasyOCR
- 문제 번호 자동 인식

⬜ **ML 기반 블록 분류**
- 문제 본문 / 보기 / 해설 자동 분류
- 수식 블록 특별 처리

⬜ **GUI 파라미터 조정 도구**
- 실시간 블록 검출 미리보기
- 슬라이더로 임계값 조정

---

## 5. 권장 실행 계획

### Step 1: 긴급 패치 (오늘)

**파일**: `src/density_analyzer.py`

**변경 사항**:
```python
# _find_blocks() 메서드 수정

# 기존
kernel = np.ones((3, 3), np.uint8)

# 변경
# 1단계: 수평 연결
h_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (50, 1))
h_connected = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, h_kernel)

# 2단계: 수직 연결
v_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 20))
v_connected = cv2.morphologyEx(h_connected, cv2.MORPH_CLOSE, v_kernel)

# 3단계: 노이즈 제거
final_kernel = np.ones((5, 5), np.uint8)
mask_cleaned = cv2.morphologyEx(v_connected, cv2.MORPH_OPEN, final_kernel)
```

**config 변경**:
```python
# .env 파일
MIN_BLOCK_SIZE=100
MIN_BLOCK_WIDTH=50
MIN_BLOCK_HEIGHT=20
```

**테스트**:
```bash
python tests/test_pipeline.py
```

**예상 개선**: 18개 블록 → 5-8개 의미 있는 블록

---

### Step 2: 블록 병합 추가 (1-2일)

**새 메서드 추가**:
```python
def _merge_nearby_blocks(self, bboxes: List[BoundingBox]) -> List[BoundingBox]:
    """가까운 블록들을 병합"""
    # 구현
```

**적용**:
```python
# _find_blocks() 메서드 끝에 추가
bboxes = self._merge_nearby_blocks(bboxes)
```

---

### Step 3: 투영 분석 추가 (3-4일)

**새 모듈**: `src/projection_analyzer.py`

**기능**:
- 수평/수직 투영 계산
- 텍스트 라인 검출
- 단락 경계 검출

**통합**:
```python
# density_analyzer.py
from projection_analyzer import ProjectionAnalyzer

def analyze_page(self, image):
    # 기존 블록 검출
    basic_blocks = self._find_blocks(mask)

    # 투영 기반 라인 검출
    proj_analyzer = ProjectionAnalyzer()
    lines = proj_analyzer.detect_lines(mask)

    # 블록을 라인에 할당
    structured_blocks = self._assign_to_lines(basic_blocks, lines)

    return structured_blocks
```

---

### Step 4: 시각화 개선 (병행 작업)

**목표**: 참고 이미지 같은 다층 분석 뷰 생성

**새 메서드**:
```python
def visualize_advanced(self, image, blocks, output_dir):
    """
    6개 서브플롯 생성:
    1. 좌우 밀집도 프로파일
    2. 블록 레벨 히스토그램
    3. 누적 분포 곡선
    4. 수평/수직 투영
    5. 밀집도 히트맵
    6. 최종 블록 검출 결과
    """
```

---

## 6. 성공 기준

### 정량적 목표

| 지표 | 현재 | 목표 (Priority 1) | 목표 (Priority 2) |
|------|------|-------------------|-------------------|
| 블록 수 (1페이지) | 18개 | 5-8개 | 3-5개 |
| 최소 블록 크기 | ~40px | ~200px | ~500px |
| 문제 단위 검출률 | 0% | 50% | 90% |
| 과분할 오류 | 높음 | 중간 | 낮음 |

### 정성적 목표

✅ **Priority 1 완료 시**:
- 글자가 아닌 단어/문장 단위 블록
- 수식이 하나의 블록으로 유지
- 문제 번호가 분리되지 않음

✅ **Priority 2 완료 시**:
- 문제 본문이 하나의 블록
- 보기(선택지)가 별도 블록 또는 포함
- 좌우 컬럼이 명확히 구분

✅ **Priority 3 완료 시**:
- 참고 이미지 수준의 분석 뷰
- 통계 기반 품질 검증
- 사용자 조정 최소화

---

## 7. 위험 요소 및 대응

### 위험 1: 과도한 병합

**문제**: 커널이 너무 크면 서로 다른 문제가 합쳐질 수 있음

**대응**:
- 파라미터를 config로 분리하여 조정 가능하게
- 여러 PDF로 테스트
- 자동 검증: 블록 크기가 전체 페이지의 50% 초과 시 경고

### 위험 2: 레이아웃 다양성

**문제**: 다양한 문제집 레이아웃에 대응 어려움

**대응**:
- 템플릿 시스템 도입 (1단/2단/3단 레이아웃)
- 레이아웃 자동 감지 기능
- 사용자가 레이아웃 선택 가능하게

### 위험 3: 성능 저하

**문제**: 복잡한 알고리즘으로 처리 속도 느려짐

**대응**:
- 프로파일링으로 병목 지점 파악
- 대용량 커널 연산 최적화
- 병렬 처리 도입 (멀티스레딩)
- 캐싱 활용

---

## 8. 결론 및 권장사항

### 현재 상태 평가

**종합 점수**: ⭐⭐☆☆☆ (2/5)

- 기본 블록 검출은 작동하지만 실용성 낮음
- 단순 윤곽선 검출로는 수학 문제집 처리 부족
- 계층적 분석과 병합 로직 필수

### 즉시 실행 권장

**오늘 할 것**:
1. ✅ 모폴로지 커널 크기 조정 (30분)
2. ✅ MIN_BLOCK_SIZE 증가 (5분)
3. ✅ 테스트 및 결과 확인 (10분)

**예상 소요 시간**: 1시간
**예상 개선률**: 50-70%

---

### 단계별 로드맵

```
[현재] 글자 단위 검출 (품질: 20%)
   ↓ Priority 1 (1-2일)
[단기] 단어/라인 단위 검출 (품질: 60%)
   ↓ Priority 2 (3-5일)
[중기] 단락/문제 단위 검출 (품질: 85%)
   ↓ Priority 3 (1-2주)
[장기] 참고 이미지 수준 (품질: 95%)
```

---

### 최종 권장사항

**옵션 A: 점진적 개선** (권장)
- Priority 1부터 순차 진행
- 각 단계마다 테스트 및 검증
- 품질 60% 달성 시 Phase 2 (GUI) 진행 가능

**옵션 B: 전면 재설계**
- density_analyzer.py 완전 재작성
- 처음부터 계층적 분석 구조로 설계
- 소요 시간: 1-2주
- 위험: 더 많은 시간 소요, 버그 가능성

**추천**: **옵션 A - 점진적 개선**

**이유**:
1. 빠른 개선 효과 (1시간 내)
2. 단계별 검증 가능
3. 리스크 최소화
4. 학습 곡선 완만

---

## 9. 다음 단계

**지금 바로 할 일**:
```bash
# 1. 백업
cp src/density_analyzer.py src/density_analyzer.py.backup

# 2. 코드 수정 (아래 제안 적용)
# 3. 테스트
python tests/test_pipeline.py

# 4. 결과 비교
# - 이전: test_result_visualization.png.old
# - 이후: test_result_visualization.png
```

**보고 요청**:
"Priority 1 적용해줘" 라고 말씀하시면:
1. density_analyzer.py 수정
2. .env 파라미터 조정
3. 테스트 실행
4. 결과 비교 리포트

---

**작성자**: Claude Code
**문서 버전**: 1.0
**마지막 업데이트**: 2025-11-16
