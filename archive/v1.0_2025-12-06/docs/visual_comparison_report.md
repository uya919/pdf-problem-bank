# 인테그랄 검출 방법 시각적 비교 리포트

## 개요

**목적**: 다양한 인테그랄 검출 방법을 동일한 이미지에 적용하여 시각적으로 비교하고, 가장 효과적인 방법을 선택

**비교 대상**: 8가지 방법

---

## 비교 방법 목록

### 방법 1: 순수 밀집도 분석 (Baseline)

**원리**:
- 흰색 배경 제거 (threshold)
- 픽셀 밀집도 히트맵 분석
- Connected Components로 블록 검출
- **Morphology 없음**

**장점**:
- 가장 단순하고 빠름
- 원본 픽셀 형태 왜곡 없음

**단점**:
- 인테그랄 조각이 분리됨
- 세로로 긴 블록 검출 불가능

**예상 결과**: 인테그랄을 여러 조각으로 검출

---

### 방법 2: v_kernel=12 (원래 설정)

**원리**:
- Morphology CLOSE: h_kernel=3, v_kernel=12
- 세로 방향 12px 간격까지 연결

**장점**:
- 작은 조각들 연결
- 부작용 거의 없음

**단점**:
- 인테그랄 상/하단이 분리됨 (간격 > 12px)

**예상 결과**: 일부 인테그랄만 부분 검출

---

### 방법 3: v_kernel=30

**원리**:
- Morphology CLOSE: h_kernel=3, v_kernel=30
- 세로 방향 30px 간격까지 연결
- 후처리 병합 (max_gap=100px)

**장점**:
- 인테그랄 조각 일부 연결
- 부작용 거의 없음 (블록 수 안정적)

**단점**:
- 일부 인테그랄 여전히 잘림

**예상 결과**: 7개 인테그랄 검출 (일부 잘림)

---

### 방법 4: v_kernel=35

**원리**:
- v_kernel=30보다 5px 더 확장
- 중간값 테스트

**장점**:
- v=30보다 약간 더 연결

**단점**:
- 블록 -10.2% 감소
- 인테그랄 -14.3% 감소

**예상 결과**: 6개 인테그랄 (v=30보다 나쁨)

---

### 방법 5: v_kernel=50

**원리**:
- 매우 큰 v_kernel
- 세로 방향 50px 간격까지 연결

**장점**:
- 인테그랄 조각 강력하게 연결

**단점**:
- **심각한 부작용**: 블록 -46.9% 감소
- 무관한 블록들도 병합됨

**예상 결과**: 6개 인테그랄, 과도 병합

---

### 방법 6: v_kernel=30 + Distance Transform

**원리**:
- v_kernel=30 기본 검출
- Distance Transform으로 bbox 확장
- 파라미터: max_distance=60px, min_density=0.01

**장점**:
- v_kernel 부작용 없음
- 35개 블록 자동 확장
- 10개 인테그랄 검출 (+43%)

**단점**:
- 일부 블록 여전히 잘림 (근처 조각이 병합 안됨)

**예상 결과**: 10개 인테그랄 (현재 최선)

---

### 방법 7: Vertical Projection Profile

**원리**:
- 각 X 범위의 Y 방향 픽셀 분포 계산
- 픽셀이 있는 Y 범위로 bbox 확장
- min_density=0.01

**장점**:
- Y 방향만 확장 (aspect ratio 개선)
- 정확한 경계 검출

**단점**:
- 보수적 (평균 5px 확장)
- X 조건 필요 (블록이 이미 검출되어야 함)

**예상 결과**: 9개 인테그랄, aspect ratio 우수

---

### 방법 8: Contour 직접 검출

**원리**:
- Morphology 없이 cv2.findContours()
- Aspect ratio로 세로 contour 필터링
- Y 방향 병합 (max_y_gap=50px)

**장점**:
- Morphology 왜곡 없음
- 원본 픽셀 그대로

**단점**:
- 인테그랄 조각이 여러 contour로 검출
- 병합 실패 (1개만 검출)

**예상 결과**: 1개 인테그랄 (비효율적)

---

## 비교 기준

| 방법 | 인테그랄 검출 수 | 완전도 | 부작용 | 복잡도 |
|------|------------------|--------|--------|--------|
| 1. 순수 밀집도 | ? | 매우 낮음 | 없음 | 낮음 |
| 2. v_kernel=12 | 2개 | 낮음 | 없음 | 낮음 |
| 3. v_kernel=30 | 7개 | 중간 | 없음 | 중간 |
| 4. v_kernel=35 | 6개 | 중간 | -10% 블록 | 중간 |
| 5. v_kernel=50 | 6개 | 중간 | **-47% 블록** | 중간 |
| 6. **v=30 + Distance** | **10개** | **높음** | **없음** | **중간** |
| 7. Vertical Projection | 9개 | 높음 | 없음 | 높음 |
| 8. Contour 직접 | 1개 | 낮음 | 없음 | 높음 |

---

## 시각화 비교 계획

각 방법을 동일한 test.pdf 페이지에 적용하여 다음 이미지 생성:

1. **`comparison_method_1_pure_density.png`** - 순수 밀집도
2. **`comparison_method_2_v12.png`** - v_kernel=12
3. **`comparison_method_3_v30.png`** - v_kernel=30
4. **`comparison_method_4_v35.png`** - v_kernel=35
5. **`comparison_method_5_v50.png`** - v_kernel=50
6. **`comparison_method_6_v30_distance.png`** - v=30 + Distance Transform ⭐
7. **`comparison_method_7_projection.png`** - Vertical Projection
8. **`comparison_method_8_contour.png`** - Contour 직접

각 이미지:
- 인테그랄 블록 빨간색 강조
- 블록 ID 표시
- 크기 (width × height) 표시
- 총 검출 수 표시

**비교 이미지**: 8개를 2×4 그리드로 배치한 전체 비교 이미지 생성

---

## 예상 결론

**시각적으로 가장 우수할 방법**:
- **방법 6: v_kernel=30 + Distance Transform**
- 10개 인테그랄 검출
- 부작용 없음
- 실용적

**차선책**:
- 방법 7 (Vertical Projection): aspect ratio 우수하지만 검출 수 적음

**피해야 할 방법**:
- 방법 5 (v_kernel=50): 심각한 과도 병합
- 방법 8 (Contour): 비효율적

---

## 다음 단계

1. ✅ 각 방법별 시각화 스크립트 실행
2. ✅ 비교 이미지 확인
3. ⏳ 사용자 선택
4. ⏳ 선택된 방법 최종 적용

---

*작성 일시: 2025-11-16*
*목적: 사용자가 직접 시각적으로 비교하여 최선의 방법 선택*
