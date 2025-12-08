# Phase 4: ML 기반 자동 그룹핑 계획

**목표:** 사용자 라벨 데이터를 학습하여 자동 문제 분할

**상태:** 💡 **장기 계획**

**예상 기간:** 수개월

**선행 조건:** Phase 3 완료 + 충분한 라벨 데이터 수집

---

## 🎯 목표

### 최종 비전
사용자가 PDF를 넣으면:
1. 자동으로 블록 검출 (Phase 1 완료 ✅)
2. **자동으로 문제 단위 그룹핑** (Phase 4 목표)
3. 그룹별 이미지 크롭 및 저장
4. (선택) 사용자가 수정 → 재학습 → 성능 개선

### 단계적 발전
```
규칙 기반 (Baseline)
    ↓
기계 학습 (ML)
    ↓
딥러닝 (DL)
```

---

## 📊 학습 데이터

### 입력 (Features)
**블록 정보 (Phase 1에서 추출):**
- 위치: `x_min, y_min, x_max, y_max`
- 크기: `width, height, area`
- 밀집도: `pixel_density`
- 스케일: `scale` ("large", "medium", "small", "ultra_small")
- 컬럼: `column` ("L" or "R")

**블록 간 관계:**
- Y 방향 간격: `gap_y = next_block.y_min - current_block.y_max`
- X 방향 간격: `gap_x = ...`
- 중심점 정렬도: `abs(center_x1 - center_x2)`

**계층 구조 (Phase 1에서 추출):**
- `parent_id`: 부모 블록 ID
- `children_ids`: 자식 블록 ID 목록

**문맥 정보:**
- 이전 블록까지의 누적 정보
- 페이지 내 위치 비율 (상/중/하)
- 컬럼 내 순서

### 출력 (Labels)
**그룹 경계 (Phase 3에서 수집):**
- `is_group_start`: 이 블록이 새 문제의 시작인가? (True/False)
- `group_id`: 어느 그룹에 속하는가? ("L1", "L2", ...)

**예시 데이터:**
```json
{
  "block_id": 5,
  "features": {
    "y_min": 450,
    "height": 30,
    "density": 0.65,
    "scale": "small",
    "gap_from_prev": 15  // 이전 블록과의 간격
  },
  "label": {
    "is_group_start": false,  // 이전 블록과 같은 문제
    "group_id": "L1"
  }
}
```

---

## 🧠 접근법

### Approach 1: 규칙 기반 (Baseline)

**전략:** Y 좌표 간격 기반 분할

**알고리즘:**
```python
def rule_based_grouping(blocks: List[Block], threshold: int = 50) -> List[ProblemGroup]:
    """
    간단한 규칙 기반 그룹핑

    규칙:
      - Y 방향 간격이 threshold보다 크면 새 문제 시작
      - 같은 컬럼 내에서만 묶음
    """
    groups = []
    current_group_blocks = []

    blocks_sorted = sorted(blocks, key=lambda b: b.bbox.y_min)

    for i, block in enumerate(blocks_sorted):
        if i == 0:
            current_group_blocks.append(block)
            continue

        prev_block = blocks_sorted[i - 1]

        # 간격 계산
        gap = block.bbox.y_min - prev_block.bbox.y_max

        # 컬럼이 다르거나 간격이 크면 새 그룹
        if block.column != prev_block.column or gap > threshold:
            # 현재 그룹 저장
            if current_group_blocks:
                groups.append(create_group(current_group_blocks))
                current_group_blocks = []

        current_group_blocks.append(block)

    # 마지막 그룹
    if current_group_blocks:
        groups.append(create_group(current_group_blocks))

    return groups
```

**장점:**
- 구현 간단
- 설명 가능
- 빠른 실행

**단점:**
- 복잡한 레이아웃 대응 어려움
- 하나의 threshold로 모든 경우 커버 불가

**예상 성능:**
- Precision: ~70%
- Recall: ~60%
- F1-Score: ~65%

---

### Approach 2: 기계 학습 (ML)

**모델 후보:**
1. **Random Forest**
   - 장점: 해석 가능, 빠름, 과적합 적음
   - 단점: 복잡한 패턴 학습 어려움

2. **XGBoost / LightGBM**
   - 장점: 높은 성능, 빠른 학습
   - 단점: 하이퍼파라미터 튜닝 필요

3. **CRF (Conditional Random Fields)**
   - 장점: 순차 데이터에 강함
   - 단점: 특징 공학 필요

**특징 (Features):**
```python
def extract_features(block, prev_block, page_data):
    return {
        # 블록 자체 특징
        "height": block.bbox.height,
        "width": block.bbox.width,
        "area": block.bbox.area,
        "density": block.pixel_density,
        "scale": encode_scale(block.scale),
        "column": encode_column(block.column),

        # 위치 특징
        "y_position_ratio": block.bbox.y_min / page_data.height,
        "x_center": (block.bbox.x_min + block.bbox.x_max) / 2,

        # 이전 블록과의 관계
        "gap_y": block.bbox.y_min - prev_block.bbox.y_max if prev_block else 0,
        "gap_x_center": abs(x_center_current - x_center_prev),
        "density_diff": abs(block.pixel_density - prev_block.pixel_density),
        "height_ratio": block.bbox.height / prev_block.bbox.height,

        # 문맥 특징
        "blocks_before": count_blocks_before(block, page_data),
        "in_top_third": block.bbox.y_min < page_data.height * 0.33,
        "in_middle_third": ...,
        "in_bottom_third": ...,
    }
```

**학습 코드 예시:**
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

# 데이터 로드
X, y = load_training_data()

# 학습/테스트 분할
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# 모델 학습
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42
)
model.fit(X_train, y_train)

# 평가
y_pred = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, y_pred):.2f}")
print(f"F1-Score: {f1_score(y_test, y_pred):.2f}")

# 특징 중요도
importances = model.feature_importances_
for feat, imp in zip(feature_names, importances):
    print(f"{feat}: {imp:.3f}")
```

**예상 성능:**
- Precision: ~80-85%
- Recall: ~75-80%
- F1-Score: ~78-82%

---

### Approach 3: 딥러닝 (DL)

**모델 후보:**

#### 1. LSTM / GRU (순차 모델)
```python
import torch
import torch.nn as nn

class BlockSequenceModel(nn.Module):
    def __init__(self, input_dim, hidden_dim):
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, batch_first=True)
        self.fc = nn.Linear(hidden_dim, 2)  # binary: is_group_start

    def forward(self, x):
        # x: (batch, sequence_length, input_dim)
        lstm_out, _ = self.lstm(x)
        logits = self.fc(lstm_out)
        return logits
```

**장점:**
- 순차 정보 활용
- 문맥 학습

**단점:**
- 많은 학습 데이터 필요
- 학습 시간 오래 걸림

#### 2. Vision Transformer (이미지 기반)
```python
from transformers import ViTForImageClassification

# 페이지 이미지 + 블록 위치 정보 동시 학습
model = ViTForImageClassification.from_pretrained("google/vit-base-patch16-224")

# Fine-tuning
# 입력: 페이지 이미지
# 출력: 각 블록이 그룹 시작인지 여부
```

**장점:**
- 이미지 패턴 직접 학습
- 텍스트 내용도 고려 가능

**단점:**
- 매우 많은 데이터 필요
- 계산 비용 높음

**예상 성능:**
- Precision: ~90-95%
- Recall: ~85-90%
- F1-Score: ~87-92%

---

## 📋 구현 계획

### Stage 1: 규칙 기반 (1-2주)
- [ ] 간격 기반 알고리즘 구현
- [ ] 페이지별 threshold 자동 추정
- [ ] 베이스라인 성능 측정

### Stage 2: 데이터 수집 (계속)
- [ ] Phase 3에서 사용자 라벨 수집
- [ ] 최소 100페이지 라벨링 목표
- [ ] 데이터 검증 및 정제

### Stage 3: ML 모델 (1-2개월)
- [ ] 특징 추출 파이프라인
- [ ] Random Forest 학습
- [ ] XGBoost 학습
- [ ] 성능 비교 및 선택

### Stage 4: 딥러닝 (장기, 3-6개월)
- [ ] LSTM 모델 구현
- [ ] Vision Transformer 실험
- [ ] 앙상블 모델

### Stage 5: 통합 및 배포
- [ ] GUI에 "자동 그룹핑" 버튼 추가
- [ ] 모델 로드 및 예측
- [ ] 사용자 수정 → 재학습 파이프라인

---

## 🎯 성공 지표

### 정량적 지표
- **Precision:** 예측한 그룹의 정확도
- **Recall:** 실제 그룹을 얼마나 찾았는가
- **F1-Score:** Precision과 Recall의 조화 평균

**목표:**
- 규칙 기반: F1 ≥ 65%
- ML 기반: F1 ≥ 80%
- DL 기반: F1 ≥ 90%

### 정성적 지표
- 사용자가 수정해야 하는 그룹 비율 < 20%
- 평균 수정 시간 < 30초/페이지

---

## 💾 데이터 관리

### 학습 데이터 저장
```
dataset_root/
└── ml_training/
    ├── features/              # 추출된 특징
    │   └── {doc_id}_page_{num}.json
    ├── labels/                # 라벨 (Phase 3 결과)
    │   └── {doc_id}_page_{num}_labels.json
    ├── splits/                # 학습/검증/테스트 분할
    │   ├── train.txt
    │   ├── val.txt
    │   └── test.txt
    └── models/                # 학습된 모델
        ├── baseline_v1.pkl
        ├── rf_v1.pkl
        └── xgb_v1.pkl
```

---

## 🔄 재학습 파이프라인

**워크플로우:**
```
1. 사용자가 자동 그룹핑 결과 수정
   ↓
2. 수정 사항 기록
   ↓
3. N개 이상 수정 누적 시
   ↓
4. 자동으로 재학습 트리거
   ↓
5. 새 모델 검증
   ↓
6. 성능 개선되면 배포
   ↓
7. 사용자에게 알림
```

---

## 🚀 마일스톤

### Short-term (1-3개월)
- [ ] 규칙 기반 구현
- [ ] 100페이지 라벨링
- [ ] 베이스라인 성능 측정

### Mid-term (3-6개월)
- [ ] ML 모델 학습
- [ ] F1-Score ≥ 80% 달성
- [ ] GUI 통합

### Long-term (6-12개월)
- [ ] 1000페이지 데이터 수집
- [ ] 딥러닝 모델 실험
- [ ] F1-Score ≥ 90% 달성
- [ ] 재학습 파이프라인 자동화

---

## 🎓 연구 방향

### 개선 아이디어
1. **멀티태스크 학습**
   - 그룹 경계 + 문제 유형 동시 예측

2. **능동 학습 (Active Learning)**
   - 모델이 불확실한 경우만 사용자에게 질문

3. **전이 학습 (Transfer Learning)**
   - 다른 문제집 데이터로 사전 학습
   - Fine-tuning으로 빠른 적응

4. **Few-shot Learning**
   - 적은 데이터로 새로운 문서 유형 학습

---

## ✅ Phase 4 완료 기준

### 최소 요구사항
- [ ] 규칙 기반 구현 (F1 ≥ 65%)
- [ ] 100페이지 라벨 데이터
- [ ] GUI 통합

### 이상적 목표
- [ ] ML 모델 (F1 ≥ 80%)
- [ ] 500페이지 라벨 데이터
- [ ] 자동 재학습 파이프라인

---

**상태:** 💡 장기 계획
**이전 Phase:** [Phase 3: 그룹핑 기능](03_phase3_grouping_plan.md) 📅
**전체 개요:** [프로젝트 개요](00_project_overview.md)
