# Phase 67 썸네일 문제 에러 리포트

**작성일**: 2025-12-09
**심각도**: 🟡 중간 (UI/UX 문제)

---

## 1. 문제 현상

### 스크린샷 분석

| 페이지 | 관찰된 문제 |
|--------|------------|
| **8페이지** | 1~7번 카드 모두 상단에 "-5xy² + 7y" 수식만 보임, 하단 문제 번호와 내용 불일치로 보임 |
| **9페이지** | "하시오." 텍스트가 여러 카드에 반복됨 |
| **10페이지** | 상대적으로 다양한 내용이 보이지만 여전히 상단만 표시 |

### 문제의 핵심

**문제 이미지는 세로로 긴 형태**인데, **정사각형 카드 + object-cover**를 적용하여 **상단 일부만 표시**되고 있음.

```
┌────────────────┐
│ -5xy² + 7y     │  ← 이 부분만 정사각형으로 잘려서 표시
│ ...            │
│ 1. 다음을 계산  │
│ 하시오.         │
│                │
│ (1) ...        │
│ (2) ...        │
└────────────────┘
  원본 (세로로 긺)
```

```
┌──────────┐
│-5xy²+7y  │  ← object-cover로 상단만 보임
└──────────┘
  현재 표시
```

---

## 2. 원인 분석

### Phase 67-C 변경 코드

```tsx
// TossProblemCard.tsx - compact 모드
<motion.button className="aspect-square ...">
  <img className="absolute inset-0 w-full h-full object-cover" ... />
</motion.button>
```

| 속성 | 현재 값 | 문제 |
|------|---------|------|
| `aspect-square` | 1:1 비율 강제 | 세로 긴 이미지에 부적합 |
| `object-cover` | 이미지 채우고 자름 | 상단만 보이고 나머지 잘림 |

### 수학 문제 이미지 특성

- 보통 **가로:세로 = 1:2 ~ 1:3** 비율 (세로로 긺)
- 상단에 문제 번호/수식
- 하단에 세부 문항 (1), (2), (3)...

---

## 3. 해결 방안

### Option A: object-contain 사용 (권장)

```tsx
// Before
<img className="object-cover" />

// After
<img className="object-contain" />
```

**결과**:
```
┌──────────┐
│ ┌──────┐ │
│ │-5xy² │ │
│ │ ...  │ │  ← 이미지 전체가 보이고 좌우 여백
│ │(1)...│ │
│ └──────┘ │
└──────────┘
```

**장점**: 이미지 전체 보임
**단점**: 좌우 여백 발생

### Option B: 카드 비율 변경

```tsx
// Before
<motion.button className="aspect-square">

// After
<motion.button className="aspect-[3/4]">  // 세로로 길게
```

**결과**: 카드가 세로로 길어져 더보기 버튼과 높이 불일치

### Option C: object-cover + 중앙 정렬

```tsx
<img className="object-cover object-center" />
```

**결과**: 중앙 부분이 표시됨 (상단/하단 잘림)

### Option D: 하이브리드 (권장)

```tsx
// 배경색 + object-contain
<div className="aspect-square bg-grey-50 flex items-center justify-center">
  <img className="max-w-full max-h-full object-contain" />
</div>
```

**결과**: 이미지 전체 보이고, 배경색으로 여백 채움

---

## 4. 권장 해결책

### Phase 67-D: object-contain + 배경색

```tsx
// TossProblemCard.tsx - compact 모드 수정
<motion.button className="aspect-square bg-white rounded-xl overflow-hidden ...">
  {/* 썸네일 컨테이너 */}
  <div className="absolute inset-0 bg-grey-50 flex items-center justify-center p-1">
    {problem.thumbnail ? (
      <img
        src={problem.thumbnail}
        alt={displayNumber}
        className="max-w-full max-h-full object-contain rounded"
        loading="lazy"
      />
    ) : (
      <span className="text-2xl text-grey-300">#</span>
    )}
  </div>

  {/* 뱃지 + 오버레이 (기존과 동일) */}
  ...
</motion.button>
```

---

## 5. 예상 결과

### Before (현재)

```
┌──────┐ ┌──────┐ ┌──────┐
│-5xy² │ │-5xy² │ │-5xy² │  ← 다 똑같아 보임
│      │ │      │ │      │
│ 1번  │ │ 2번  │ │ 3번  │
└──────┘ └──────┘ └──────┘
```

### After (수정 후)

```
┌──────┐ ┌──────┐ ┌──────┐
│┌────┐│ │┌────┐│ │┌────┐│
││문제││ ││문제││ ││문제││  ← 각각 다른 전체 이미지
││전체││ ││전체││ ││전체││
│└────┘│ │└────┘│ │└────┘│
│ 1번  │ │ 2번  │ │ 3번  │
└──────┘ └──────┘ └──────┘
```

---

## 6. 실행 계획

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| 1 | TossProblemCard compact 모드 수정 | 10분 |
| 2 | 빌드 테스트 | 5분 |
| **총** | | **15분** |

---

## 7. 결론

이것은 **Phase 67-C에서 도입한 정사각형 카드 + object-cover 조합**으로 인한 문제입니다.

**이미지 데이터 자체는 정상**이며, **CSS 스타일링 문제**입니다.

**수정 방향**: `object-cover` → `object-contain` + 배경색

---

**진행 명령어**: `"Phase 67-D 진행해줘"`

*에러 리포트 완료: 2025-12-09*
