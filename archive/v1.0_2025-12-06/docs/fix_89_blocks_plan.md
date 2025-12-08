# 89개 과소 검출 문제 해결 계획

## 📊 현재 상황 진단

### 예상 vs 실제
- **예상**: 915개 (테스트 스크립트, ✅ 마음에 듦)
- **실제**: 89개 (GUI, ❌ 너무 적음)
- **차이**: 826개 부족 (-90%)

---

## 🔍 근본 원인

### 1. **.env 파일에 이전 설정값**
```env
WHITE_THRESHOLD=240  ← 문제!
MIN_BLOCK_SIZE=20    ← 문제!
```

### 2. 필터링 단계별 손실
```
Step 1: Threshold (240)      → 718개 컴포넌트
Step 2: MIN_SIZE 필터 (20px) → 632개 제거! (718 → 86개)
Step 3: DensityAnalyzer       → 89개 (거의 변화 없음)
```

**핵심**: MIN_BLOCK_SIZE=20 필터가 **88%의 블록을 제거**했습니다!

---

## ✅ 해결 계획 (Step-by-Step)

### Phase 1: 환경 변수 수정

#### Step 1-1: .env 파일 수정
**파일**: `.env`
**변경**:
```env
# 변경 전
WHITE_THRESHOLD=240
MIN_BLOCK_SIZE=20

# 변경 후
WHITE_THRESHOLD=200
MIN_BLOCK_SIZE=2
```

**예상 효과**:
- WHITE_THRESHOLD 240→200: 더 많은 픽셀 검출
- MIN_BLOCK_SIZE 20→2: 작은 블록도 검출 (632개 복원)

---

### Phase 2: 저장된 블록 정보 삭제

#### Step 2-1: JSON 파일 삭제
**명령**:
```bash
rm "C:\MYCLAUDE_PROJECT\pdf\dataset_root\documents\베이직쎈 수학2 2022_본문\blocks\page_0000_blocks.json"
```

**이유**: 캐시된 이전 분석 결과 제거

---

### Phase 3: GUI 재시작

#### Step 3-1: 실행 중인 GUI 종료
- 모든 python src/main.py 프로세스 종료

#### Step 3-2: GUI 재시작
```bash
python src/main.py
```

**확인 사항**:
- Config.WHITE_THRESHOLD = 200
- Config.MIN_BLOCK_SIZE = 2
- 블록 수: ~900개 (예상)

---

### Phase 4: 검증

#### Step 4-1: 블록 수 확인
- GUI에서 표시되는 블록 수 확인
- 예상: 900~950개

#### Step 4-2: 비교 테스트
```bash
python tests/compare_simple_vs_gui.py
```

**예상 결과**:
```
Method                           Total    Tiny   Small  Medium   Large
================================================================================
Simple (Test Script)               915     157     720      37       1
GUI (DensityAnalyzer)             ~920     160     725      34       1
```

**허용 오차**: ±5%

---

## 📈 예상 효과

### Before (현재)
```
WHITE_THRESHOLD = 240
MIN_BLOCK_SIZE = 20
→ 89개 검출 (과소 검출 -90%)
```

### After (수정 후)
```
WHITE_THRESHOLD = 200
MIN_BLOCK_SIZE = 2
→ 915개 검출 (정확한 검출 ✅)
```

---

## 🎯 실행 체크리스트

- [ ] **Step 1**: .env 파일 수정 (WHITE_THRESHOLD=200, MIN_BLOCK_SIZE=2)
- [ ] **Step 2**: JSON 파일 삭제
- [ ] **Step 3**: GUI 재시작
- [ ] **Step 4**: 블록 수 확인 (~915개 예상)
- [ ] **Step 5**: 비교 테스트 실행
- [ ] **Step 6**: 시각적 확인 (작은 기호 검출 여부)

---

## 🔧 추가 최적화 (선택)

만약 915개보다 많거나 적으면:

### Case 1: 너무 많음 (>1000개)
- **원인**: Threshold가 너무 낮음
- **조치**: WHITE_THRESHOLD 200 → 210

### Case 2: 너무 적음 (<800개)
- **원인**: 필터링이 여전히 강함
- **조치**: DensityAnalyzer 밀집도 필터 완화 (0.05 → 0.01)

### Case 3: 정확함 (900~950개)
- **조치**: 없음, 성공! ✅

---

## 📝 참고 문서

- 테스트 스크립트: `tests/visualize_small_symbols_large.py`
- 비교 스크립트: `tests/compare_simple_vs_gui.py`
- 진단 스크립트: `tests/diagnose_89_blocks.py`
- 시각화 결과: `dataset_root/small_symbols_detection_large.png` (915개, ✅ 마음에 듦)

---

## ⚠️ 주의 사항

1. **GUI 재시작 필수**: 환경 변수 변경 후 반드시 GUI 재시작
2. **JSON 삭제 필수**: 캐시된 결과 제거
3. **환경 변수 우선순위**: .env > 코드 기본값

---

*작성 일시: 2025-11-17*
*목적: 89개 과소 검출 문제 해결 및 915개 정확한 검출*
