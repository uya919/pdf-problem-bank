# Phase 67-C: 문제 카드 정사각형 통일 - 단계별 개발 계획

**작성일**: 2025-12-09
**목표**: 문제 카드를 더보기 버튼과 동일한 정사각형 크기로 통일

---

## 현재 상태 vs 목표

### 현재 (문제점)

```
┌─────────────┐     ┌─────────────┐
│             │     │             │
│   썸네일     │     │             │
│  (정사각형)  │     │    +5       │
│             │     │   더 보기    │
├─────────────┤     │             │
│  1번        │     │             │
│  8p         │     │             │
└─────────────┘     └─────────────┘
   카드 (세로 긺)       더보기 (정사각형)
```

- 카드: 썸네일(aspect-square) + 텍스트 영역 = 전체가 세로로 김
- 더보기: aspect-square = 완벽한 정사각형

### 목표

```
┌─────────────┐     ┌─────────────┐
│         🟣 │     │             │
│   썸네일     │     │             │
│  (가득 채움) │     │    +5       │
│             │     │   더 보기    │
│  ┌───────┐ │     │             │
│  │1번 8p │ │     │             │
│  └───────┘ │     │             │
└─────────────┘     └─────────────┘
   카드 (정사각형)      더보기 (정사각형)
```

- 카드 전체: aspect-square
- 썸네일: 카드 전체를 채움
- 텍스트: 하단에 오버레이로 표시

---

## 1단계: TossProblemCard 구조 변경

**예상 시간**: 20분
**파일**: `components/toss/TossProblemCard.tsx`

### Before (현재)

```tsx
<motion.button className={`bg-white rounded-2xl ${compact ? 'p-2' : 'p-3'}`}>
  {/* 썸네일 */}
  <div className={`bg-grey-100 rounded-xl overflow-hidden mb-2 relative ${
    compact ? 'aspect-square' : 'aspect-[4/3]'
  }`}>
    ...썸네일 이미지...
    ...뱃지...
  </div>

  {/* 정보 (아래 별도 영역) */}
  <p className="font-semibold text-grey-900 truncate">1번</p>
  <p className="text-grey-500 truncate">8p</p>
</motion.button>
```

### After (변경)

```tsx
<motion.button className="bg-white rounded-2xl overflow-hidden aspect-square relative">
  {/* 썸네일 - 전체 채움 */}
  <div className="absolute inset-0 bg-grey-100">
    <img className="w-full h-full object-cover" ... />
  </div>

  {/* 뱃지 - 우상단 */}
  <div className="absolute top-1.5 right-1.5 flex gap-1 z-10">
    ...뱃지...
  </div>

  {/* 정보 - 하단 오버레이 */}
  <div className="absolute bottom-0 left-0 right-0 p-2
                  bg-gradient-to-t from-black/60 to-transparent z-10">
    <p className="text-white text-xs font-semibold truncate">1번</p>
    <p className="text-white/70 text-[10px] truncate">8p</p>
  </div>
</motion.button>
```

---

## 2단계: 선택 상태 스타일 조정

**예상 시간**: 5분
**파일**: `components/toss/TossProblemCard.tsx`

### 변경 내용

```tsx
// Before
className={`... ${selected ? 'ring-2 ring-toss-blue shadow-md' : 'hover:shadow-md'}`}

// After (정사각형에 맞게 ring 위치 조정)
className={`... ${selected ? 'ring-2 ring-toss-blue ring-offset-1' : ''}`}
```

---

## 3단계: compact prop 제거 (선택사항)

**예상 시간**: 10분
**파일**: `components/toss/TossProblemCard.tsx`, `pages/problemBank/ProblemsInBook.tsx`

### 이유

- 카드가 항상 aspect-square가 되므로 compact 구분 불필요
- 단, 다른 페이지에서 기존 스타일 사용 시 유지 필요

### 결정

- **유지**: 다른 페이지 호환성 위해 compact prop 유지
- compact=true일 때만 정사각형 오버레이 스타일 적용

---

## 4단계: 빌드 테스트

**예상 시간**: 5분

```bash
cd frontend
npm run build
```

---

## 전체 요약

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| 1 | 카드 구조 변경 (정사각형 + 오버레이) | TossProblemCard.tsx | 20분 |
| 2 | 선택 상태 스타일 조정 | TossProblemCard.tsx | 5분 |
| 3 | compact prop 로직 정리 | TossProblemCard.tsx | 10분 |
| 4 | 빌드 테스트 | - | 5분 |
| **총** | | | **~40분** |

---

## UI 미리보기

### 완성 예상

```
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ 🟣  │ │     │ │ 🟣  │ │     │ │     │ │     │ │     │ │     │
│     │ │     │ │     │ │     │ │     │ │     │ │     │ │ +5  │
│ 썸  │ │ 썸  │ │ 썸  │ │ 썸  │ │ 썸  │ │ 썸  │ │ 썸  │ │더보기│
│ 네  │ │ 네  │ │ 네  │ │ 네  │ │ 네  │ │ 네  │ │ 네  │ │     │
│ 일  │ │ 일  │ │ 일  │ │ 일  │ │ 일  │ │ 일  │ │ 일  │ │     │
├─────┤ ├─────┤ ├─────┤ ├─────┤ ├─────┤ ├─────┤ ├─────┤ │     │
│1번8p│ │2번8p│ │3번8p│ │4번8p│ │5번8p│ │6번8p│ │7번8p│ │     │
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘
  ↑ 정보는 하단 그라데이션 오버레이 안에
```

---

## 수정 파일

```
frontend/src/components/toss/
└── TossProblemCard.tsx    (1, 2, 3단계)
```

---

**진행 명령어**: `"Phase 67-C 진행해줘"`

*계획 완료: 2025-12-09*
