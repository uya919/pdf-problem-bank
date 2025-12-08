# 핵심 학습 내용 및 교훈

Phase 1 개발을 통해 배운 기술적 인사이트와 개발 방법론

---

## 🎯 기술적 인사이트

### 1. 다층 스케일의 중요성

**문제:**
- 단일 커널(h_kernel=10)로는 79개 블록만 검출
- 작은 블록(번호 동그라미)과 큰 블록(표)을 동시에 검출 불가능

**해결:**
- 4개 스케일 사용: large(15), medium(10), small(6), ultra_small(4)
- 각 스케일은 특정 크기 범위에 최적화

**교훈:**
> "하나의 파라미터로 모든 경우를 커버할 수 없다"

**적용:**
- 문서 종류에 따라 3-5개 스케일 권장
- h_kernel 간격: 2-5 (예: 4, 6, 10, 15)
- min_size는 h_kernel²의 2-3배

**코드 예시:**
```python
# 나쁜 예
kernel = 10  # 모든 블록에 동일

# 좋은 예
scales = [
    {"h": 15, "min": 400},  # 대형
    {"h": 10, "min": 250},  # 중형
    {"h": 6, "min": 150},   # 소형
    {"h": 4, "min": 50},    # 초소형
]
```

---

### 2. IoU 임계값의 영향

**실험 결과:**
```
IoU=0.20 → 357개 블록 (공격적 병합)
IoU=0.30 → 370개 블록
IoU=0.40 → 389개 블록 (초기 설정)
IoU=0.50 → 403개 블록
IoU=0.60 → 421개 블록 (최종 선택)
IoU=0.70 → 440개 블록 (보수적 병합)
```

**교훈:**
> "IoU 임계값은 '검출 민감도' 조절 손잡이"

**선택 기준:**
- **빠짐없이 검출 (Recall 우선):** IoU = 0.60-0.70
- **균형 잡힌 검출:** IoU = 0.40-0.50
- **깔끔한 결과 (Precision 우선):** IoU = 0.20-0.30

**주의사항:**
- IoU가 너무 높으면 (>0.80): 거의 같은 블록만 병합 → 중복 많음
- IoU가 너무 낮으면 (<0.20): 조금만 겹쳐도 병합 → 블록 손실

**실전 팁:**
```python
# 문서 특성에 따라 조정
if document_type == "dense_text":
    iou = 0.40  # 텍스트 많음, 중간 병합
elif document_type == "sparse_diagrams":
    iou = 0.60  # 도형 많음, 보수적 병합
elif document_type == "mixed":
    iou = 0.50  # 균형
```

---

### 3. 병합 순서의 중요성

**실험:**
- 큰 블록부터 수집 → 작은 블록이 큰 블록에 흡수됨
- 작은 블록부터 수집 → 작은 블록 우선 보존 ✓

**최종 전략:**
```python
# 1. 작은 스케일부터 수집
for scale in ["ultra_small", "small", "medium", "large"]:
    collect(scale)

# 2. 면적 기준 정렬
blocks.sort(key=lambda b: b.area)  # 작은 것부터

# 3. NMS 적용
for block in blocks:
    if not overlaps_with_existing(block, iou > 0.60):
        keep(block)
```

**교훈:**
> "우선순위가 높은 것을 먼저 처리하라"

**적용 사례:**
- 작은 블록(번호 동그라미) 중요 → 작은 것부터 수집
- 읽기 순서 중요 → Y 좌표로 정렬
- 컬럼 구조 중요 → X 좌표로 분리

---

### 4. 형태학적 연산의 원리

**핵심 개념:**
- **Closing (팽창 + 침식):** 가까운 픽셀 연결
  - 수평 연결: (h_kernel, 1)
  - 수직 연결: (1, v_kernel)
- **Opening (침식 + 팽창):** 노이즈 제거

**커널 크기 선택:**
```
h_kernel = 원하는 최대 간격 (픽셀)

예:
  h=4  → 4px 이내의 요소 연결 (문자 간 공백)
  h=6  → 6px 이내 연결 (단어)
  h=10 → 10px 이내 연결 (문장)
  h=15 → 15px 이내 연결 (문단)
```

**교훈:**
> "커널 크기 = 연결하고 싶은 최대 거리"

**실전 예시:**
```python
# 문자를 단어로 연결
h_kernel = 5  # 문자 간 평균 간격

# 단어를 문장으로 연결
h_kernel = 10  # 단어 간 평균 간격

# 표의 셀 내부 연결
h_kernel = 20  # 셀 너비
v_kernel = 5   # 행 높이
```

---

## 🔧 개발 방법론

### 1. 진단 우선 접근 (Diagnosis-First Approach)

**Before (나쁜 방식):**
```
문제 발생 → 추측으로 해결책 시도 → 실패 → 다른 해결책 시도 → ...
```

**After (좋은 방식):**
```
문제 발생 → 진단 도구 개발 → 원인 파악 → 해결책 적용 → 검증
```

**실제 사례:**
```
문제: 번호 블록이 누락됨

진단 도구 개발:
  1. diagnose_missing_blocks.py
  2. analyze_merge_process.py

진단 결과:
  - 누락: 34개
  - 평균 크기: 252px²
  - 원인: min_size 150px² 너무 높음
  - 원인: IoU 0.40 너무 낮음

해결책 적용:
  1. ultra_small 스케일 추가 (min=50)
  2. IoU 0.60으로 증가

검증:
  - 누락 20개로 감소 (34 → 20)
```

**교훈:**
> "추측 대신 측정하라 (Measure, Don't Guess)"

**진단 도구 체크리스트:**
- [ ] 정량적 분석 (숫자)
- [ ] 시각화 (이미지)
- [ ] 여러 옵션 비교
- [ ] 원인 식별

---

### 2. 데이터 기반 의사결정

**잘못된 예:**
```python
# "이 정도면 괜찮을 것 같아"
iou_threshold = 0.5  # 추측
```

**올바른 예:**
```python
# "IoU별로 테스트해보니 0.60이 최적"
for iou in [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]:
    result = test_merge(iou)
    print(f"IoU={iou}: {len(result)}개 블록")

# 결과 보고 결정
iou_threshold = 0.60  # 데이터 기반 선택
```

**실전 적용:**
1. **파라미터 선택**
   - 여러 값으로 실험
   - 정량적 비교
   - 시각화로 검증

2. **알고리즘 선택**
   - 여러 방식 구현
   - 벤치마크 비교
   - Trade-off 분석

3. **성능 검증**
   - 기준 메트릭 정의
   - 개선 전후 비교
   - 엣지 케이스 확인

**교훈:**
> "숫자는 거짓말하지 않는다"

---

### 3. 점진적 개선 (Incremental Improvement)

**개선 과정:**
```
v1: 단일 스케일 → 79개 블록
  ↓ (문제: 누락 많음)
v2: 3-scale, IoU=0.40 → 336개 블록
  ↓ (문제: 번호 블록 여전히 누락)
v3: 4-scale, IoU=0.40 → 545개 블록
  ↓ (문제: 일부 누락)
v4: 4-scale, IoU=0.60 → 623개 블록
  ↓ (완료: 누락 20개, 허용 범위)
```

**교훈:**
> "한 번에 완벽하게 만들려 하지 마라"

**적용 방법:**
1. **최소 기능 제품 (MVP)**
   - 가장 간단한 버전 먼저
   - 빠르게 테스트
   - 피드백 수집

2. **한 번에 하나씩**
   - 여러 변수 동시 변경 X
   - 변경의 영향 명확히 파악
   - A/B 테스트

3. **테스트 주도**
   - 변경 전 현재 상태 기록
   - 변경 후 비교
   - 개선 여부 확인

---

### 4. 시각화의 힘

**숫자만으로는 부족:**
```
"623개 블록 검출" → 좋은지 나쁜지 모름
```

**시각화 추가:**
```
[이미지에서 빨간 박스로 누락 블록 표시]
→ 어떤 블록이 누락됐는지 명확
→ 패턴 발견 (번호 동그라미가 대부분)
→ 해결책 도출 (ultra_small 스케일 필요)
```

**실전 팁:**
```python
# 항상 시각화 포함
def detect_blocks(image):
    blocks = ...

    # 시각화 이미지 생성
    vis = draw_blocks(image, blocks)
    cv2.imwrite("result.png", vis)

    return blocks
```

**교훈:**
> "백 개의 숫자보다 하나의 이미지"

**시각화 체크리스트:**
- [ ] 원본 이미지
- [ ] 검출 결과 오버레이
- [ ] 누락/오검출 표시
- [ ] 레이블/설명 포함

---

## 💡 설계 패턴

### 1. 모듈화

**나쁜 예:**
```python
# 모든 로직을 하나의 함수에
def process_pdf(pdf_path):
    # PDF 읽기
    # 배경 제거
    # 블록 검출
    # 병합
    # 저장
    # 시각화
    ... (500줄)
```

**좋은 예:**
```python
# 각 단계별 모듈화
pdf_processor.convert(pdf)
analyzer.detect_blocks(image)
multiscale.merge_blocks(blocks)
saver.save_json(data)
visualizer.draw(blocks)
```

**이점:**
- 테스트 용이
- 재사용 가능
- 이해하기 쉬움
- 수정 영향 범위 제한

---

### 2. 설정 분리

**나쁜 예:**
```python
# 하드코딩
threshold = 245
h_kernel = 10
```

**좋은 예:**
```python
# config.py
class Config:
    WHITE_THRESHOLD = 245
    H_KERNEL = 10

# 사용
config = Config()
threshold = config.WHITE_THRESHOLD
```

**이점:**
- 실험 파라미터 변경 용이
- 환경별 설정 관리
- 문서화 집중

---

### 3. 계층적 구조

**설계:**
```
Config (설정)
  ↓
MultiscaleAnalyzer (검출 엔진)
  ↓
DensityAnalyzer (통합 인터페이스)
  ↓
PDFProcessor (전처리)
```

**이점:**
- 각 레이어 독립적 테스트
- 하위 레이어 교체 가능
- 책임 명확

---

## 🚫 피해야 할 실수

### 1. 조기 최적화
```python
# ❌ 나쁜 예
# "이 부분이 느릴 것 같아서 미리 최적화"
def detect_blocks_optimized(...):
    # 복잡한 최적화 코드
    ...

# ✅ 좋은 예
# "일단 동작하게 만들고, 병목 측정 후 최적화"
def detect_blocks(...):
    # 간단하고 명확한 코드
    ...

# 나중에 프로파일링으로 병목 확인 후 최적화
```

**교훈:**
> "Make it work, then make it fast"

---

### 2. 과도한 일반화
```python
# ❌ 나쁜 예
# "모든 경우를 처리하는 범용 함수"
def detect_anything(
    image, mode, params, options, flags, ...
):  # 20개 파라미터
    if mode == "text":
        ...
    elif mode == "table":
        ...
    elif mode == "diagram":
        ...
    # (500줄)

# ✅ 좋은 예
# "각 경우별로 별도 함수"
def detect_text_blocks(image, params):
    ...

def detect_table_blocks(image, params):
    ...

def detect_diagram_blocks(image, params):
    ...
```

**교훈:**
> "YAGNI (You Aren't Gonna Need It)"

---

### 3. 문서화 부족
```python
# ❌ 나쁜 예
def f(x, y, z):
    return x * y + z

# ✅ 좋은 예
def calculate_iou(bbox1: BoundingBox, bbox2: BoundingBox) -> float:
    """
    두 바운딩 박스의 IoU (Intersection over Union) 계산

    Args:
        bbox1: 첫 번째 바운딩 박스
        bbox2: 두 번째 바운딩 박스

    Returns:
        IoU 값 (0.0 ~ 1.0)
        - 0.0: 겹치지 않음
        - 1.0: 완전히 일치
    """
    ...
```

**교훈:**
> "미래의 나는 남이다"

---

## 🎓 핵심 원칙 요약

### 개발 원칙
1. **진단 우선** - 추측 대신 측정
2. **데이터 기반** - 숫자로 증명
3. **점진적 개선** - 한 번에 하나씩
4. **시각화** - 백문이 불여일견

### 기술 원칙
1. **다층 스케일** - 다양한 크기 대응
2. **파라미터 조정** - 문서 특성에 맞게
3. **병합 순서** - 우선순위 명확히
4. **모듈화** - 분리하고 조립

### 품질 원칙
1. **테스트** - 항상 검증
2. **문서화** - 미래를 위해
3. **단순함** - 복잡도 최소화
4. **재현성** - 누구나 실행 가능

---

## 📚 참고 자료

### 이론
- Morphological Operations (형태학적 연산)
- Non-Maximum Suppression (NMS)
- Intersection over Union (IoU)

### 실무
- OpenCV Documentation
- Computer Vision Algorithms
- Image Processing Best Practices

### 프로젝트 내부 문서
- [Phase 1 상세](01_phase1_block_detection.md)
- [개발 일지](development_log.md)
- [최종 리포트](../multiscale_detection_final_report.md)

---

---

## 🔧 추가 교훈 (2025-11-17)

### 5. 환경 변수 관리의 함정

**문제 상황:**
- .env 파일을 수정했지만 코드에 반영 안 됨
- WHITE_THRESHOLD: 200 (예상) vs 240 (실제)
- 결과: 89개만 검출 (기대 915개)

**근본 원인:**
```python
# load_dotenv() 기본 동작
os.environ["KEY"] = "old_value"  # 시스템 환경변수
load_dotenv()  # .env 파일 읽지만...
# → 기존 환경변수를 덮어쓰지 않음!
print(os.getenv("KEY"))  # "old_value" (여전히 구버전)
```

**해결책:**
```python
load_dotenv(override=True)  # .env 파일이 우선!
```

**교훈:**
> "환경 변수는 보이지 않는 복병"

**체크리스트:**
- [ ] .env 파일 변경 후 `override=True` 확인
- [ ] 시스템 환경변수 확인 (`echo %VAR%` or `env | grep VAR`)
- [ ] 진단 스크립트로 실제 로드값 검증
- [ ] 환경변수 로딩 순서 문서화

---

### 6. 단순함의 가치 (Simplicity Wins)

**실험 결과:**
```
MultiscaleAnalyzer (복잡한 방식):
  - 6개 스케일
  - NMS 병합
  - 계층 구조
  → 1413개 검출 (과다 검출 +54%)

Connected Components (단순 방식):
  - Threshold + CC만 사용
  - 필터링 최소화
  → 915개 검출 (정확!)
```

**사용자 피드백:**
> "많이 검출한다고 좋은 게 아니라 100개만 있을 때 100개만 검출해야지"

**핵심 인사이트:**
- 복잡한 알고리즘 ≠ 좋은 결과
- 정확도 > 재현율 (학원 데이터의 경우)
- 예측 가능성이 중요

**교훈:**
> "KISS (Keep It Simple, Stupid)"

**적용 기준:**
```
복잡한 방식을 선택하는 경우:
  - 단순한 방식으로 해결 불가능한 경우만
  - 복잡도 증가 대비 개선이 명확한 경우
  - 유지보수 비용을 감당할 수 있는 경우

단순한 방식을 선택하는 경우:
  - 요구사항을 충족하는 경우 (99.9% 정확도)
  - 예측 가능성이 중요한 경우
  - 유지보수가 쉬운 경우
```

---

### 7. 진단 스크립트의 계층화

**효과적인 진단 전략:**

**Level 1: 빠른 검증**
```python
# verify_env.py - 1초 실행
print(f"WHITE_THRESHOLD: {config.WHITE_THRESHOLD}")
print(f"Expected: 200, Actual: {actual}")
```

**Level 2: 단계별 추적**
```python
# diagnose_89_blocks.py - 5초 실행
print(f"Step 1: Threshold → {num_pixels}개 픽셀")
print(f"Step 2: Connected Components → {num_labels}개")
print(f"Step 3: Min Size Filter → {after_filter}개")
print(f"Step 4: DensityAnalyzer → {final}개")
```

**Level 3: 심층 분석**
```python
# compare_simple_vs_gui.py - 30초 실행
# 크기별 분포, 밀집도, 종횡비 등 상세 분석
```

**교훈:**
> "진단 도구도 계층 구조로"

**이점:**
- 빠른 문제 위치 파악
- 필요한 만큼만 깊게 분석
- 시간 절약

---

**작성자:** Claude Code
**최종 업데이트:** 2025-11-17
**기반:** Phase 1-2 개발 경험
