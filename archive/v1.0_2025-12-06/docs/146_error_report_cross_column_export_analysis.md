# 에러 리포트: 크로스 컬럼 Export 결과 분석

**작성일**: 2025-12-05
**분석 대상**: `고1_공통수학1_베이직쎈_해설_p0007_p7_X1.png`
**심각도**: 높음 - Export 로직 오동작

---

## 1. 현상 요약

### Export 결과
```
파일: 고1_공통수학1_베이직쎈_해설_p0007_p7_X1.png
크기: 약 440 x 320 픽셀 (추정)
내용: 문제 02 해설만 표시 (작은 이미지)
```

### 예상 결과 vs 실제 결과

| 항목 | 예상 | 실제 |
|------|------|------|
| **이미지 크기** | ~550 x 2500+ 픽셀 | ~440 x 320 픽셀 |
| **내용** | L 영역 전체 + R 영역 전체 세로 합성 | 문제 02 해설만 (일부) |
| **블록 수** | 196개 (L:52 + R:144) | 일부만 크롭된 것으로 추정 |

---

## 2. 데이터 분석

### JSON 메타데이터
```json
{
  "group_id": "p7_X1",
  "column": "X",
  "block_ids": [196개],
  "bbox": [113, 136, 1198, 1660],  // ⚠️ 전체 페이지 bbox
  "segments": [
    {"column": "L", "block_ids": [52개], "order": 0},
    {"column": "R", "block_ids": [144개], "order": 1}
  ]
}
```

### 블록 위치 분석
```
L 블록 (예: block_id 1628):
  bbox: [152, 1604, 184, 1625]
  위치: 페이지 하단 (Y: 1604~1625)

R 블록 (예: block_id 16):
  bbox: [898, 141, 903, 149]
  위치: 페이지 상단 (Y: 141~149)
```

### 문제점 발견

```
┌─────────────────────────────────────────────────────────────┐
│ L 블록들: Y = 1604 ~ 1660 (페이지 하단)                       │
│ R 블록들: Y = 136 ~ 1660 (페이지 전체)                        │
│                                                             │
│ → L과 R 블록이 서로 다른 Y 범위에 위치                         │
│ → 하나의 "문제"로 묶기에 부적절한 블록 선택                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 근본 원인 분석

### 원인 1: Export 로직 오류 (확인 필요)

**export.py 코드 흐름**:
```python
if target_group.get("column") == "X" and target_group.get("segments"):
    # segments가 있으면 합성 로직 실행
    for segment in sorted(segments, key=lambda s: s.get("order", 0)):
        segment_blocks = [b for b in blocks if b["block_id"] in segment["block_ids"]]
        # ← 여기서 블록을 못 찾을 가능성?
```

**가능한 버그**:
1. `segment["block_ids"]`와 `blocks_data["blocks"]`의 block_id 불일치
2. 빈 segment_blocks로 인한 크롭 실패
3. `merge_images_vertically` 함수에 빈 이미지 전달

### 원인 2: 블록 데이터 불일치

```
groups.json의 block_ids: [1628, 1629, ..., 1727]
blocks.json의 block_id 범위: 1 ~ 1730

→ 블록은 존재하지만, 올바르게 매칭되는지 확인 필요
```

### 원인 3: 사용자 선택 문제 (데이터 품질)

```
L 블록: 페이지 하단에만 존재 (Y: 1604~)
R 블록: 페이지 상단부터 하단까지 (Y: 136~1660)

→ 좌우단에 걸친 "하나의 문제"가 아니라
   서로 다른 영역의 블록들이 혼합 선택됨
```

---

## 4. Export 로직 디버깅

### 현재 export.py 로직 (추정)

```python
# Phase 53-D 코드
if target_group.get("column") == "X" and target_group.get("segments"):
    cropped_images = []
    for segment in sorted(target_group["segments"], key=lambda s: s.get("order", 0)):
        segment_blocks = [
            b for b in blocks_data["blocks"] if b["block_id"] in segment["block_ids"]
        ]
        if not segment_blocks:
            continue  # ⚠️ 빈 세그먼트 스킵
        seg_bbox = calculate_bounding_box(segment_blocks)
        seg_cropped = page_image.crop(seg_bbox)
        cropped_images.append(seg_cropped)

    cropped = merge_images_vertically(cropped_images, padding=10)
```

### 예상 실행 흐름

```
1. segments[0] (L): 52개 블록 → bbox 계산 → L 영역 크롭
2. segments[1] (R): 144개 블록 → bbox 계산 → R 영역 크롭
3. merge_images_vertically([L_crop, R_crop]) → 세로 합성
```

### 실제 결과와의 불일치

```
예상 결과: L 영역 (하단) + R 영역 (전체) 세로 합성
         → 매우 큰 이미지 (약 550 x 2500+ 픽셀)

실제 결과: 작은 이미지 (약 440 x 320 픽셀)
         → 문제 02 해설만 표시

⚠️ 가설: merge_images_vertically가 호출되지 않았거나,
         기존 bbox 로직(전체 크롭)으로 fallback 되었을 가능성
```

---

## 5. 버그 재현 시나리오

### 가설: Export 시 segments 조건 미충족

```python
# export.py
if target_group.get("column") == "X" and target_group.get("segments"):
    # 이 조건이 False일 경우 기존 로직으로 fallback
```

**확인 필요 사항**:
1. API 호출 시 `target_group`에 `segments` 필드가 포함되는지?
2. `target_group.get("segments")`가 None 또는 빈 리스트인지?

### 가설: JSON 파싱 문제

```
groups.json에는 segments 존재
→ API에서 그룹 데이터 로드 시 segments 누락?
→ export 로직에서 조건 미충족
→ 기존 bbox 로직으로 fallback
```

---

## 6. 해결 방안

### 즉시 조치 (디버깅)

1. **export.py에 로깅 추가**:
```python
logger.info(f"Export group: {target_group.get('id')}, column: {target_group.get('column')}")
logger.info(f"Segments: {target_group.get('segments')}")
```

2. **조건 분기 확인**:
```python
if target_group.get("column") == "X":
    logger.info("X column detected")
    if target_group.get("segments"):
        logger.info(f"Using merge logic with {len(target_group['segments'])} segments")
    else:
        logger.warning("No segments found, using fallback bbox logic")
```

### 수정 방안

**문제**: groups.json에서 로드한 데이터에 segments가 누락되는 경우

**해결**:
```python
# export.py - 그룹 데이터 로드 후
target_group = None
for group in groups_data.get("groups", []):
    if group["id"] == group_id:
        target_group = group
        break

# segments 존재 여부 로깅
if target_group:
    has_segments = bool(target_group.get("segments"))
    logger.info(f"Group {group_id}: column={target_group.get('column')}, has_segments={has_segments}")
```

---

## 7. 테스트 계획

### 단위 테스트
```python
def test_cross_column_export():
    # 1. X 그룹 생성
    # 2. segments 포함 확인
    # 3. export 호출
    # 4. 결과 이미지 크기 확인 (L+R 합산)
```

### 수동 테스트
1. 새 X 그룹 생성 (명확한 L+R 영역)
2. Export 실행
3. 결과 이미지 확인:
   - L 영역이 위에 표시되는지?
   - R 영역이 아래에 표시되는지?
   - 중간 빈 공간 없이 합성되는지?

---

## 8. 결론

### 핵심 문제
1. **Export 로직이 segments를 사용하지 않고 있음** (가장 유력)
2. 결과 이미지가 예상보다 작음 → fallback 로직 사용 추정

### 다음 단계
1. export.py에 디버그 로깅 추가
2. API 호출 시 segments 전달 여부 확인
3. 조건 분기 수정 또는 데이터 로드 로직 점검

---

**"진행해줘"로 디버깅 및 수정을 시작합니다.**
