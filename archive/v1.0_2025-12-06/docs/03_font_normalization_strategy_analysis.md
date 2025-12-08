# 폰트 정규화 전략 분석 및 재설계

**작성일:** 2025-11-17
**작성자:** Claude Code
**버전:** 전략 재검토 (Critical Analysis)
**우선순위:** 🔴 HIGH - 기존 설계의 근본적 문제 발견

---

## 🚨 발견된 문제점

### 현재 구현의 치명적 오류

**잘못된 가정:**
```
❌ 각 문제 이미지마다 개별적으로 폰트 크기를 추정하고 정규화
```

**실제 상황:**
```
✅ 같은 교재 내의 문제들은 이미 동일한 폰트 크기 사용
✅ 정규화가 필요한 것은 서로 다른 교재 간의 차이
```

### 테스트 결과 분석

**테스트 이미지:**
- 베이직쎈 수학2 19-20_page0000_L1.png → 13.0px (11px + 16px 혼재)
- 베이직쎈 수학2 19-20_page0000_L2.png → 16.1px (20px + 11px 혼재)
- 베이직쎈 수학2 19-20_page0000_L3.png → 12.8px (11px + 15px 혼재)

**관찰:**
1. **모두 같은 교재** (베이직쎈 수학2 19-20)
2. 차이는 "문제 번호/제목 vs 본문" 같은 **의미적 차이**
3. 각 문제마다 다른 스케일 적용 (1.30x로 동일하지만 우연)

**문제:**
- 같은 교재인데도 문제마다 13.0px, 16.1px, 12.8px로 다르게 감지
- 이는 문제 내용에 따라 문제번호/본문 비율이 다르기 때문
- **불필요한 처리이며 같은 교재 내 일관성을 해칠 수 있음**

---

## 📊 실제 사용 시나리오 분석

### 시나리오 1: 학원의 교재 사용 패턴

```
교재 관리 현황:
├── 베이직쎈 수학2 (2019-20판)
│   ├── 본문 폰트: 평균 13px
│   └── 문제 500개
├── 수학의 정석 (2020판)
│   ├── 본문 폰트: 평균 20px
│   └── 문제 800개
└── 개념원리 (2021판)
    ├── 본문 폰트: 평균 18px
    └── 문제 600개
```

**현재 시스템의 동작:**
```python
# ❌ 잘못된 방식 (현재)
for problem in all_problems:
    estimated = estimate_text_height(problem)  # 문제마다 다름
    scale = 22 / estimated
    normalize(problem, scale)

# 결과: 같은 교재인데도 문제마다 다른 스케일
베이직쎈_L1.png → 13px 감지 → 1.69배 확대
베이직쎈_L2.png → 16px 감지 → 1.38배 확대  # ← 같은 교재인데 다른 스케일!
베이직쎈_L3.png → 13px 감지 → 1.69배 확대
```

**올바른 방식:**
```python
# ✅ 올바른 방식 (문서 단위)
for textbook in textbooks:
    avg_height = estimate_document_avg(textbook)  # 교재 전체 평균
    scale = 22 / avg_height

    for problem in textbook.problems:
        normalize(problem, scale)  # 같은 스케일 적용

# 결과: 같은 교재의 모든 문제에 동일한 스케일
베이직쎈 → 평균 14px → 모든 문제 1.57배 확대
수학의 정석 → 평균 20px → 모든 문제 1.10배 확대
개념원리 → 평균 18px → 모든 문제 1.22배 확대
```

### 시나리오 2: 문제 내 폰트 크기 혼재

**예시 문제:**
```
┌─────────────────────────┐
│ 01. (문제번호, 16px)    │  ← 큰 폰트
│                          │
│ 다음 함수의 극값을      │  ← 본문, 12px
│ 구하시오.               │  ← 본문, 12px
│                          │
│ f(x) = x² - 4x + 3      │  ← 수식, 14px
└─────────────────────────┘
```

**Connected Components 분석:**
- 문제번호 "01": 16px (2개 컴포넌트)
- 본문 텍스트: 12px (30개 컴포넌트)
- 수식: 14px (8개 컴포넌트)

**Bimodal 검출 결과:**
- Peak1: 12px (30개)
- Peak2: 16px (2개)
- **가중 평균: 12.5px**

**문제:**
- 다른 문제가 문제번호 없이 본문만 있으면 12px 감지
- 문제번호가 크면 13px 감지
- **같은 교재인데 문제 구성에 따라 다른 결과**

---

## 🎯 올바른 정규화 전략

### 핵심 원칙

```
원칙 1: 정규화 단위 = 문서(교재) 단위
원칙 2: 같은 교재의 모든 문제 = 동일한 스케일
원칙 3: 목표는 교재 간 일관성, 교재 내 변형 아님
```

### 전략 A: 문서 선 분석 방식 (권장)

**워크플로우:**

```
┌────────────────────────────────────────┐
│ 1. 문서 분석 단계 (한 번만)           │
├────────────────────────────────────────┤
│ - 문서의 모든 문제 이미지 샘플링      │
│ - 샘플당 폰트 높이 추정               │
│ - Median 계산으로 문서 대표 높이 결정 │
│ - metadata.json에 저장                 │
└────────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────┐
│ 2. Export 시 (매번)                    │
├────────────────────────────────────────┤
│ - metadata에서 문서 대표 높이 로드     │
│ - 모든 문제에 동일한 스케일 적용       │
│ - 정규화된 이미지 저장                 │
└────────────────────────────────────────┘
```

**장점:**
- ✅ 같은 교재 내 일관성 보장
- ✅ 한 번 분석 후 캐싱으로 빠른 처리
- ✅ 사용자가 결과를 예측 가능

**구현:**

```python
# 파일: src/font_normalizer.py (개선)

class FontNormalizer:
    def analyze_document(
        self,
        document_id: str,
        problem_images: List[Path],
        sample_size: int = 20
    ) -> Dict:
        """
        문서 전체의 대표 폰트 높이 분석

        Returns:
            {
                "document_id": str,
                "estimated_height": float,
                "target_height": float,
                "scale_factor": float,
                "sample_count": int,
                "analyzed_at": str
            }
        """
        # 샘플링
        samples = random.sample(problem_images, min(sample_size, len(problem_images)))

        heights = []
        for img_path in samples:
            img = imread_unicode(img_path)
            if img is None:
                continue

            height = self.estimate_text_height(img)
            if height is not None:
                heights.append(height)

        if len(heights) < 5:
            raise ValueError(f"유효한 샘플 부족: {len(heights)}개")

        # Median 사용 (이상치에 강건)
        estimated_height = np.median(heights)
        scale_factor = self.compute_scale(estimated_height)

        metadata = {
            "document_id": document_id,
            "estimated_height": float(estimated_height),
            "target_height": self.target_height,
            "scale_factor": float(scale_factor),
            "sample_count": len(heights),
            "analyzed_at": datetime.now().isoformat(),
            "heights_distribution": {
                "min": float(np.min(heights)),
                "max": float(np.max(heights)),
                "mean": float(np.mean(heights)),
                "median": float(np.median(heights)),
                "std": float(np.std(heights))
            }
        }

        return metadata

    def normalize_document(
        self,
        document_id: str,
        problem_images: List[Path],
        output_dir: Path,
        metadata: Optional[Dict] = None
    ) -> int:
        """
        문서 전체를 동일한 스케일로 정규화

        Args:
            document_id: 문서 ID
            problem_images: 문제 이미지 경로 리스트
            output_dir: 출력 디렉토리
            metadata: 사전 분석된 메타데이터 (없으면 자동 분석)

        Returns:
            처리된 이미지 개수
        """
        # 메타데이터 로드 또는 생성
        if metadata is None:
            metadata = self.analyze_document(document_id, problem_images)

        scale = metadata["scale_factor"]
        processed = 0

        print(f"\n[문서 정규화] {document_id}")
        print(f"  문서 대표 높이: {metadata['estimated_height']:.1f}px")
        print(f"  목표 높이: {metadata['target_height']}px")
        print(f"  스케일: {scale:.3f}x")
        print(f"  처리할 문제: {len(problem_images)}개\n")

        # 모든 문제에 동일한 스케일 적용
        for img_path in problem_images:
            img = imread_unicode(img_path)
            if img is None:
                continue

            # 동일한 스케일로 리사이징
            normalized = self.resize_image(img, scale)

            # 저장
            output_path = output_dir / f"normalized_{img_path.name}"
            success = imwrite_unicode(output_path, normalized)

            if success:
                processed += 1

        return processed
```

**메타데이터 구조:**

```json
{
  "document_id": "베이직쎈 수학2 19-20",
  "estimated_height": 13.8,
  "target_height": 22,
  "scale_factor": 1.594,
  "sample_count": 20,
  "analyzed_at": "2025-11-17T15:30:00",
  "heights_distribution": {
    "min": 11.0,
    "max": 16.5,
    "mean": 13.5,
    "median": 13.8,
    "std": 1.8
  }
}
```

**저장 위치:**
```
dataset_root/documents/{document_id}/font_metadata.json
```

### 전략 B: Export 시 일괄 분석 방식

**워크플로우:**

```
Export 버튼 클릭
    ↓
"폰트 정규화 적용" 체크박스 확인
    ↓
문서의 모든 문제 이미지 수집
    ↓
1단계: 전체 샘플링 및 평균 계산 (Progress: 0-20%)
    ↓
2단계: 모든 문제에 동일 스케일 적용 (Progress: 20-100%)
    ↓
완료
```

**장점:**
- ✅ 사용자가 필요할 때만 처리
- ✅ 별도 분석 단계 불필요
- ✅ 즉시 결과 확인 가능

**단점:**
- ⚠️ Export 시 처리 시간 증가
- ⚠️ 같은 문서를 여러 번 Export 시 매번 재분석

### 전략 C: 하이브리드 방식 (최종 권장)

**특징:**
- 첫 Export 시 분석 + 메타데이터 캐싱
- 이후 Export 시 캐시 사용
- 사용자가 "재분석" 버튼으로 갱신 가능

**구현 예시:**

```python
# main_window.py

def on_export_problems(self):
    """문제 이미지 내보내기 (폰트 정규화 포함)"""

    # ... (기존 다이얼로그 코드) ...

    # 폰트 정규화 옵션 확인
    if apply_normalization:
        # 메타데이터 확인
        metadata_path = self.config.DOCUMENTS_DIR / self.current_document / "font_metadata.json"

        if metadata_path.exists() and not force_reanalyze:
            # 캐시 사용
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            print(f"[캐시 사용] 기존 분석 결과 로드: {metadata_path}")
        else:
            # 새로 분석
            print(f"[문서 분석] 폰트 크기 분석 중...")

            # 모든 문제 이미지 수집
            all_problems = list(problems_dir.glob("*.png"))

            # 분석
            normalizer = FontNormalizer(target_height=target_height)
            metadata = normalizer.analyze_document(
                self.current_document,
                all_problems,
                sample_size=20
            )

            # 메타데이터 저장
            metadata_path.parent.mkdir(parents=True, exist_ok=True)
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            print(f"[메타데이터 저장] {metadata_path}")

        # 정규화 적용
        processed = normalizer.normalize_document(
            self.current_document,
            pages_with_groups,  # 실제로 export할 문제들
            output_dir,
            metadata
        )
```

---

## 🔬 전략별 비교 분석

### 정량적 비교

| 항목 | 전략 A (선분석) | 전략 B (일괄) | 전략 C (하이브리드) |
|------|----------------|--------------|---------------------|
| **첫 Export 시간** | 느림 (+30초) | 보통 (+10초) | 느림 (+30초) |
| **두 번째 이후** | 빠름 (+0초) | 보통 (+10초) | 빠름 (+0초) |
| **일관성** | 높음 | 높음 | 높음 |
| **사용 편의성** | 중간 | 높음 | 높음 |
| **디스크 사용** | 적음 (1KB) | 없음 | 적음 (1KB) |
| **결과 예측성** | 높음 | 높음 | 높음 |

### 정성적 비교

**전략 A: 선분석**
- 👍 전문가 사용자에게 적합
- 👍 분석/적용 단계 분리로 유연성 높음
- 👎 초기 학습 곡선

**전략 B: 일괄**
- 👍 단순하고 직관적
- 👍 즉시 사용 가능
- 👎 반복 작업 시 비효율

**전략 C: 하이브리드** ⭐
- 👍 첫 사용은 자동, 이후는 빠름
- 👍 재분석 옵션으로 유연성
- 👍 최고의 사용자 경험
- 👎 구현 복잡도 약간 높음

---

## 📐 UI/UX 설계

### Export 다이얼로그 개선안

```
┌─────────────────────────────────────────┐
│  문제 이미지 내보내기                  │
├─────────────────────────────────────────┤
│                                          │
│  범위 선택:                              │
│    ○ 현재 페이지만                      │
│    ● 전체 문서                          │
│                                          │
│  ─────────────────────────────────────  │
│                                          │
│  ☑ 폰트 크기 정규화 적용                │
│                                          │
│    목표 폰트 높이: [22] px              │
│                                          │
│    📊 문서 분석 정보:                   │
│    ┌──────────────────────────────┐    │
│    │ 문서: 베이직쎈 수학2 19-20   │    │
│    │ 현재 폰트: 13.8px            │    │
│    │ 스케일: 1.59x (확대)         │    │
│    │ 마지막 분석: 2일 전          │    │
│    └──────────────────────────────┘    │
│                                          │
│    [🔄 재분석]                           │
│                                          │
│  ─────────────────────────────────────  │
│                                          │
│           [취소]  [내보내기]            │
└─────────────────────────────────────────┘
```

### 상태 피드백

**첫 Export (분석 필요):**
```
Progress: [====              ] 20%
문서 분석 중... (20개 샘플 분석)
예상 폰트 높이: 13.8px
```

**두 번째 Export (캐시 사용):**
```
Progress: [==================] 100%
캐시된 분석 결과 사용 (1.59x 스케일)
50개 문제 처리 완료
```

---

## 🎓 사용자 시나리오

### 시나리오 1: 새 교재 첫 사용

```
1. 사용자: "베이직쎈 수학2" PDF를 Open
2. 시스템: 블록 검출 완료
3. 사용자: 몇 페이지 그룹핑
4. 사용자: Export 버튼 클릭
5. 시스템: "폰트 정규화 적용" 체크됨 (기본값)
6. 시스템: 다이얼로그 표시
   "이 문서는 처음 분석합니다. 약 20개 샘플을 분석합니다."
7. 사용자: [내보내기] 클릭
8. 시스템:
   - 20개 샘플 분석 → 13.8px 감지
   - metadata.json 저장
   - 50개 문제 정규화 (모두 1.59x)
   - 완료 메시지: "50개 문제 내보냄 (1.59x 확대)"
```

### 시나리오 2: 같은 교재 재사용

```
1. 사용자: 나중에 다시 같은 문서 Open
2. 사용자: 추가 페이지 그룹핑
3. 사용자: Export 버튼 클릭
4. 시스템: 다이얼로그 표시
   "기존 분석 결과 사용 (13.8px → 22px, 1.59x)"
5. 사용자: [내보내기] 클릭
6. 시스템: 즉시 정규화 시작 (분석 생략)
```

### 시나리오 3: 여러 교재 사용

```
교재 A (베이직쎈): 13.8px → 1.59x
교재 B (수학의 정석): 19.5px → 1.13x
교재 C (개념원리): 17.2px → 1.28x

→ 모든 교재의 문제가 22px로 통일됨
→ 교재 간 일관성 확보
→ 딥러닝 모델 학습에 적합
```

---

## 🚀 구현 로드맵

### Phase A-Revised: 문서 단위 정규화 (2일)

**작업 항목:**

1. **FontNormalizer 리팩토링** (4시간)
   - `analyze_document()` 메서드 추가
   - `normalize_document()` 메서드 추가
   - 기존 `normalize_image()` 유지 (호환성)

2. **메타데이터 관리** (2시간)
   - 저장/로드 유틸리티
   - 검증 로직

3. **테스트** (2시간)
   - 여러 교재로 테스트
   - 일관성 검증

### Phase B-Revised: GUI 통합 (1일)

**작업 항목:**

1. **Export 다이얼로그 개선** (3시간)
   - 체크박스 추가
   - 분석 정보 표시
   - 재분석 버튼

2. **Progress 피드백** (2시간)
   - 2단계 프로그레스 (분석 + 처리)
   - 상세 메시지

3. **통합 테스트** (1시간)

### Phase C-Revised: 문서화 및 배포 (0.5일)

**작업 항목:**

1. **사용자 가이드**
2. **개발자 문서**
3. **마이그레이션 가이드**

---

## 📝 권장 사항

### 즉시 수정 필요 (Critical)

1. ✅ **문서 단위 정규화로 전환**
   - 현재 코드 대부분 재사용 가능
   - `normalize_document()` 메서드만 추가

2. ✅ **메타데이터 캐싱**
   - 첫 분석 결과 저장
   - 이후 재사용

3. ✅ **GUI 통합**
   - Export 시 옵션 제공
   - 분석 정보 표시

### 장기 개선 사항 (Optional)

1. **자동 기준 교재 설정**
   - 가장 많이 사용하는 교재를 기준으로
   - 다른 교재를 이에 맞춤

2. **멀티스레딩 분석**
   - 여러 교재 동시 분석
   - 대량 처리 최적화

3. **통계 대시보드**
   - 교재별 폰트 크기 분포
   - 정규화 전/후 비교

---

## 🔚 결론

### 핵심 요약

| 현재 (❌) | 개선 후 (✅) |
|----------|-------------|
| 문제마다 개별 정규화 | **문서 단위 정규화** |
| 같은 교재인데 다른 스케일 | **같은 교재 = 동일 스케일** |
| 매번 재분석 | **메타데이터 캐싱** |
| 예측 불가능한 결과 | **일관된 결과** |

### 다음 단계

**즉시 실행:**
1. 현재 `font_normalizer.py`에 `normalize_document()` 추가
2. 테스트 스크립트 수정하여 검증
3. GUI 통합

**예상 효과:**
- 처리 속도: 2-3배 향상 (캐싱으로)
- 일관성: 100% 보장 (같은 교재 = 같은 스케일)
- 사용자 만족도: 크게 향상 (직관적 동작)

---

**작성 완료일:** 2025-11-17
**다음 작업:** Phase A-Revised 구현 시작
**예상 소요 시간:** 3일 → 2일 (기존 코드 재사용)
