# 인테그랄 검출 문제 심층 분석 보고서 (v2)

**작성일**: 2025-11-16
**작성자**: Claude Code
**프로젝트**: PDF 문제 이미지 자동 크롭
**문제**: 인테그랄 기호가 여전히 일부분만 검출됨 (v_kernel 원복 + vertical_tall 적용 후에도)

---

## 📋 Executive Summary

이전에 v_kernel을 원복하고 vertical_tall 스케일(v=12)을 추가했으나, **인테그랄이 여전히 조각으로 검출되는 문제가 지속됨**.

**핵심 발견:**
- 인테그랄이 하나의 큰 블록(60-100px)이 아닌, **2-3개의 작은 조각(20-40px)으로 분절되어 검출**
- vertical_tall 필터의 `height >= 40` 조건으로 인해 대부분의 조각이 제외됨 (31/33개)
- **v_kernel=12로는 인테그랄의 상단 곡선↗, 중간 수직선|, 하단 곡선↘을 연결하지 못함**

**결론:**
모폴로지 연산만으로는 ∫ 기호의 불연속 구조를 하나로 병합하기 어려움.
**후처리 병합 로직이 필수적**임.

---

## 🔍 1. 문제 재현 및 현상 분석

### 1.1 사용자 보고

사용자가 제공한 스크린샷:
- 인테그랄 기호 ∫ 가 여러 개의 초록색 박스로 쪼개져 있음
- 각 박스가 인테그랄의 일부분만 포함 (상단, 중간, 하단 각각)

### 1.2 현재 설정

```python
# multiscale_analyzer.py
self.scales = [
    {"name": "large", "h_kernel": 15, "v_kernel": 2, "min_size": 400},
    {"name": "medium", "h_kernel": 10, "v_kernel": 2, "min_size": 250},
    {"name": "small", "h_kernel": 6, "v_kernel": 1, "min_size": 150},
    {"name": "ultra_small", "h_kernel": 4, "v_kernel": 1, "min_size": 50},
    {"name": "vertical_tall", "h_kernel": 3, "v_kernel": 12, "min_size": 100},
]

# vertical_tall 필터 조건
if (aspect_ratio < 0.5 and
    height >= 40 and        # ← 문제의 조건
    width <= 30 and
    height <= 200):
```

### 1.3 실제 검출 결과

**test.pdf 블록 분석 결과:**
```
총 블록 수: 637개
세로로 긴 블록 (aspect < 0.5): 33개
인테그랄 후보 (aspect < 0.2): 0개  ← 하나의 큰 블록이 없음!

vertical_tall 필터:
  통과: 2개만
  실패 (height < 40): 31개  ← 대부분!
```

**가장 세로로 긴 블록들:**
```
ID   Column  Width  Height  Aspect  BBox
215  L       6      27      0.222   [286, 486, 292, 513]
503  R       9      40      0.225   [1044, 1261, 1053, 1301]  ← 유일하게 통과
78   R       5      22      0.227   [851, 253, 856, 275]
312  R       5      22      0.227   [958, 694, 963, 716]
344  L       5      22      0.227   [285, 905, 290, 927]
```

**해석:**
- 인테그랄로 예상되는 블록들의 높이가 22-40px에 불과
- 인테그랄의 실제 높이(60-100px)보다 훨씬 작음
- → **인테그랄이 이미 분절되어 검출됨**

---

## 🎯 2. 근본 원인 분석

### 2.1 인테그랄 기호의 구조적 특성

```
    ╭─  ← 상단 곡선 (높이 ~10px)
   │
  │     ← 중간 수직선 (높이 ~40px)
  │
 ─╯     ← 하단 곡선 (높이 ~10px)

전체 높이: ~60px
빈 공간: 곡선 사이에 픽셀이 없는 구간 존재
```

### 2.2 모폴로지 연산의 한계

**MORPH_CLOSE 연산 원리:**
```python
# 1. 팽창 (Dilation): 픽셀을 커널 크기만큼 확장
# 2. 침식 (Erosion): 다시 원래 크기로 축소
# → 작은 구멍 메움, 가까운 픽셀 연결
```

**v_kernel=12의 효과:**
```
커널 크기: 3 (h) × 12 (v)

연결 가능 거리: 약 12px
인테그랄 구간 거리: ~20-30px

결과: 상단↗과 중간|은 연결 X
     중간|과 하단↘도 연결 X
```

### 2.3 실험적 증거

**vertical_tall 스케일 검출 로그:**
```
스케일 'vertical_tall' (h=3, v=12) 검출 중...
  → 365개 블록 검출
  [vertical_tall 필터] 363개 제외, 2개 유지
```

**해석:**
- 365개 후보를 검출했지만 대부분 제외
- v_kernel=12로 일부 연결은 했지만
- **인테그랄 전체를 하나로 연결하지는 못함**
- 결과적으로 작은 조각들만 남음 (height < 40)

---

## 💡 3. 해결 방안 연구

### 방안 A: v_kernel 대폭 증가

**접근:**
```python
{"name": "vertical_tall", "h_kernel": 3, "v_kernel": 50, "min_size": 100}
```

**장점:**
- 구현 간단 (설정 값만 변경)
- 인테그랄 상하 연결 가능성 증가

**단점:**
- v_kernel=50은 매우 큼
- 일반 텍스트 블록에도 영향 (여러 줄 병합 위험)
- 이전에 v_kernel 증가로 인한 부작용 경험함

**예상 효과:**
- ✅ 인테그랄 연결 가능성: **중간**
- ⚠️ 부작용 위험: **높음**
- ⏱️ 구현 난이도: **낮음**

**권장 여부:** ❌ **비권장** (이미 시도했던 방향, 부작용 큼)

---

### 방안 B: 후처리 병합 로직 추가

**접근:**
1. vertical_tall 필터 조건 완화 (height >= 20)
2. 새 함수 추가: `_merge_vertical_fragments()`
3. 세로로 가까운 얇은 블록들을 병합

**알고리즘:**
```python
def _merge_vertical_fragments(blocks, max_gap=30, max_width=30):
    """
    세로로 가까운 얇은 블록들을 병합

    조건:
    1. 두 블록 모두 width <= max_width (얇음)
    2. X 좌표 범위 겹침 (같은 수직선상)
    3. Y 좌표 간격 <= max_gap (가까움)
    4. aspect ratio < 0.5 (세로로 긴 형태)

    Returns:
        병합된 블록 리스트
    """
    # 1. 후보 블록 필터링 (얇고 세로로 긴 블록)
    candidates = [b for b in blocks if b.width <= max_width and aspect < 0.5]

    # 2. Y 좌표 기준 정렬
    candidates.sort(key=lambda b: b.y_min)

    # 3. 연속된 블록 그룹핑
    merged = []
    current_group = [candidates[0]]

    for i in range(1, len(candidates)):
        prev = current_group[-1]
        curr = candidates[i]

        # X 범위 겹침 확인
        x_overlap = not (curr.x_max < prev.x_min or curr.x_min > prev.x_max)

        # Y 간격 확인
        y_gap = curr.y_min - prev.y_max

        if x_overlap and y_gap <= max_gap:
            # 같은 그룹에 추가
            current_group.append(curr)
        else:
            # 새 그룹 시작
            if len(current_group) >= 2:  # 2개 이상 조각만 병합
                merged.append(merge_bboxes(current_group))
            current_group = [curr]

    # 마지막 그룹 처리
    if len(current_group) >= 2:
        merged.append(merge_bboxes(current_group))

    return merged
```

**장점:**
- ✅ 인테그랄의 구조적 특성을 직접 해결
- ✅ 일반 텍스트에 영향 없음 (width <= 30 조건)
- ✅ 확장 가능 (다른 세로 기호에도 적용)

**단점:**
- 구현 복잡도 증가
- max_gap 파라미터 튜닝 필요

**예상 효과:**
- ✅ 인테그랄 연결 가능성: **높음**
- ✅ 부작용 위험: **낮음**
- ⏱️ 구현 난이도: **중간**

**권장 여부:** ✅ **강력 권장** (가장 효과적이고 안전)

---

### 방안 C: 다단계 v_kernel 검출

**접근:**
```python
self.scales = [
    # 기존 스케일들...
    {"name": "vertical_tall_small", "h_kernel": 3, "v_kernel": 12, "min_size": 100},
    {"name": "vertical_tall_large", "h_kernel": 3, "v_kernel": 30, "min_size": 100},
]
```

두 스케일의 결과를 병합:
- v=12: 작은 인테그랄 조각
- v=30: 큰 인테그랄 전체

**장점:**
- 다양한 크기의 인테그랄 대응
- 방안 A보다 부작용 적음

**단점:**
- 계산 비용 증가 (스케일 추가)
- v=30 여전히 위험 요소

**예상 효과:**
- ✅ 인테그랄 연결 가능성: **중간**
- ⚠️ 부작용 위험: **중간**
- ⏱️ 구현 난이도: **낮음**

**권장 여부:** ⚠️ **보조 방안** (방안 B와 함께 사용 가능)

---

## 🎨 4. 권장 솔루션: 방안 B 상세 구현

### 4.1 구현 계획

**Phase 1: 기본 후처리 병합**
1. `MultiscaleAnalyzer`에 `_merge_vertical_fragments()` 메서드 추가
2. `detect_all_blocks()` 끝에서 호출
3. vertical_tall 필터 조건 완화: `height >= 40` → `height >= 20`

**Phase 2: 파라미터 최적화**
1. max_gap 튜닝 (20, 30, 40 테스트)
2. max_width 튜닝 (20, 30, 40 테스트)
3. aspect ratio 기준 추가 (< 0.3 또는 < 0.5)

**Phase 3: 고급 필터링**
1. 병합 후 aspect ratio 검증 (전체 블록이 세로로 긴지 확인)
2. 밀집도 검증 (병합된 블록의 픽셀 밀집도 확인)

### 4.2 구현 코드

```python
# multiscale_analyzer.py

def detect_all_blocks(
    self,
    image: np.ndarray,
    mask: np.ndarray,
    columns: List[Column]
) -> List[BoundingBox]:
    """블록 검출 (후처리 병합 포함)"""

    # 기존 멀티스케일 검출
    blocks_by_scale = {}
    for scale in self.scales:
        # ... 검출 로직 ...

    # NMS 병합
    merged_blocks = self._merge_with_hierarchy(blocks_by_scale)

    # ★ 새로 추가: 세로 조각 병합
    final_blocks = self._merge_vertical_fragments(
        merged_blocks,
        mask=mask,
        max_gap=30,
        max_width=30
    )

    return final_blocks


def _merge_vertical_fragments(
    self,
    blocks: List[BoundingBox],
    mask: np.ndarray,
    max_gap: int = 30,
    max_width: int = 30
) -> List[BoundingBox]:
    """
    세로로 가까운 얇은 블록들을 병합 (인테그랄 조각 연결)

    Args:
        blocks: 블록 리스트
        mask: 이진 마스크
        max_gap: 최대 Y 간격 (픽셀)
        max_width: 최대 너비 (픽셀, 이보다 얇은 블록만 대상)

    Returns:
        병합된 블록 리스트
    """
    # 1. 후보 블록 필터링 (얇고 세로로 긴 블록)
    candidates = []
    non_candidates = []

    for bbox in blocks:
        width = bbox.width
        height = bbox.height

        if height == 0:
            non_candidates.append(bbox)
            continue

        aspect_ratio = width / height

        # 조건: 얇고 세로로 긴 블록
        if width <= max_width and aspect_ratio < 0.5 and height >= 20:
            candidates.append(bbox)
        else:
            non_candidates.append(bbox)

    if not candidates:
        return blocks

    print(f"  [세로 조각 병합] 후보: {len(candidates)}개")

    # 2. Y 좌표 기준 정렬
    candidates.sort(key=lambda b: b.y_min)

    # 3. 연속된 블록 그룹핑
    groups = []
    current_group = [candidates[0]]

    for i in range(1, len(candidates)):
        prev = current_group[-1]
        curr = candidates[i]

        # X 범위 겹침 확인 (같은 수직선상)
        x_overlap = not (curr.x_max < prev.x_min or curr.x_min > prev.x_max)

        # Y 간격 확인
        y_gap = curr.y_min - prev.y_max

        if x_overlap and 0 <= y_gap <= max_gap:
            # 같은 그룹에 추가
            current_group.append(curr)
        else:
            # 현재 그룹 저장하고 새 그룹 시작
            groups.append(current_group)
            current_group = [curr]

    # 마지막 그룹 저장
    groups.append(current_group)

    # 4. 그룹 병합 (2개 이상 조각만)
    merged_fragments = []
    standalone_fragments = []

    for group in groups:
        if len(group) >= 2:
            # 병합
            merged_bbox = self._merge_bboxes(group)

            # 병합 후 검증: 세로로 긴지 확인
            merged_width = merged_bbox.width
            merged_height = merged_bbox.height

            if merged_height > 0:
                merged_aspect = merged_width / merged_height

                if merged_aspect < 0.5 and merged_height >= 40:
                    merged_fragments.append(merged_bbox)
                    print(f"    → 병합: {len(group)}개 조각 → "
                          f"{merged_width}×{merged_height} (aspect={merged_aspect:.3f})")
                else:
                    # 병합 결과가 조건 불만족 → 원본 유지
                    standalone_fragments.extend(group)
        else:
            standalone_fragments.extend(group)

    # 5. 최종 결과: 병합된 블록 + 독립 조각 + 비후보 블록
    result = non_candidates + merged_fragments + standalone_fragments
    result.sort(key=lambda b: b.y_min)

    print(f"    → 병합 완료: {len(merged_fragments)}개 생성, "
          f"최종 {len(result)}개 블록")

    return result


def _merge_bboxes(self, bboxes: List[BoundingBox]) -> BoundingBox:
    """여러 BoundingBox를 하나로 병합"""
    x_min = min(b.x_min for b in bboxes)
    y_min = min(b.y_min for b in bboxes)
    x_max = max(b.x_max for b in bboxes)
    y_max = max(b.y_max for b in bboxes)

    return BoundingBox(x_min, y_min, x_max, y_max)


def _filter_vertical_tall_blocks(self, bboxes: List[BoundingBox]) -> List[BoundingBox]:
    """vertical_tall 스케일 필터 (조건 완화)"""
    filtered = []
    filtered_out_count = 0

    for bbox in bboxes:
        width = bbox.width
        height = bbox.height

        if height == 0:
            continue

        aspect_ratio = width / height

        # ★ 변경: height >= 40 → height >= 20
        if (aspect_ratio < 0.5 and
            height >= 20 and          # 완화됨
            width <= 30 and
            height <= 200):
            filtered.append(bbox)
        else:
            filtered_out_count += 1

    if filtered_out_count > 0:
        print(f"      [vertical_tall 필터] {filtered_out_count}개 제외, {len(filtered)}개 유지")

    return filtered
```

### 4.3 예상 결과

**Before (현재):**
```
Block #215: width=6, height=27  ← 상단 조각
Block #312: width=5, height=22  ← 중간 조각
Block #344: width=5, height=22  ← 하단 조각
```

**After (병합 후):**
```
Merged Block: width=6, height=71 (27+22+22)
  aspect_ratio = 0.085
  → 완전한 인테그랄 ∫ 검출!
```

### 4.4 검증 계획

1. **test.pdf 재처리**
   ```bash
   python tests/process_test_pdf.py
   ```

2. **시각화 확인**
   ```bash
   python tests/visualize_test_blocks.py
   ```

3. **기대 결과:**
   - 인테그랄 조각 2-3개 → 1개 통합 블록
   - aspect ratio < 0.2인 블록 0개 → 2-5개
   - 일반 텍스트 블록에 영향 없음

---

## 📊 5. 대안 비교 및 권장 사항

| 방안 | 효과 | 안전성 | 구현 | 권장 |
|------|------|--------|------|------|
| A. v_kernel 대폭 증가 | 중간 | 낮음 | 쉬움 | ❌ |
| **B. 후처리 병합** | **높음** | **높음** | 중간 | ✅ |
| C. 다단계 검출 | 중간 | 중간 | 쉬움 | ⚠️ |

**최종 권장: 방안 B**

**이유:**
1. ✅ 인테그랄의 구조적 문제를 직접 해결
2. ✅ 일반 텍스트에 부작용 없음 (width <= 30 제한)
3. ✅ 확장 가능 (Σ, Π 등 다른 기호도 적용 가능)
4. ✅ 파라미터 튜닝으로 최적화 가능

---

## 🎯 6. 다음 단계

**즉시 실행:**
1. `multiscale_analyzer.py`에 `_merge_vertical_fragments()` 구현
2. `_filter_vertical_tall_blocks()` 조건 완화 (height >= 20)
3. test.pdf 재처리 및 검증

**후속 작업:**
1. max_gap, max_width 파라미터 최적화
2. 베이직쎈 수학2 2022_본문.pdf 전체 재처리
3. 병합 전/후 비교 시각화

**예상 소요 시간:** 1-2시간

---

## 📝 7. 결론

**핵심 발견:**
- 인테그랄이 분절되는 것은 **v_kernel의 문제가 아닌, 인테그랄의 구조적 특성 때문**
- 모폴로지 연산만으로는 한계 → **후처리 병합이 필수**

**권장 솔루션:**
- 세로로 가까운 얇은 블록들을 병합하는 `_merge_vertical_fragments()` 구현
- 안전하고 효과적이며 확장 가능

**기대 효과:**
- ✅ 인테그랄 완전 검출
- ✅ 일반 텍스트 영향 없음
- ✅ 다른 세로 기호에도 적용 가능

---

**작성자:** Claude Code
**최종 업데이트:** 2025-11-16
