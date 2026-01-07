# 409. 캘린더 스타일 카드 디자인 연구

> **작성일**: 2025-12-21
> **목적**: WeeklyCalendar 디자인 철학을 수업 카드에 적용하는 방안 연구

---

## 1. 현재 디자인 시스템 분석

### 1.1 폰트 시스템

현재 프로젝트에서 사용 중인 폰트:

```css
/* index.css */
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');

/* tailwind.config.js */
fontFamily: {
  sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
}
```

**Pretendard 폰트 특징:**
- 토스, 카카오 등 국내 IT 기업에서 사용하는 한글 폰트
- Apple SF Pro와 유사한 깔끔한 산세리프
- 9가지 굵기 지원 (Thin ~ Black)
- 가독성 우수, 현대적인 느낌

### 1.2 현재 캘린더 디자인 분석 (CalendarDayCell.tsx)

| 요소 | 스타일 | 의도 |
|------|--------|------|
| **컨테이너** | `rounded-2xl p-3` | 큰 모서리로 부드러운 느낌 |
| **호버** | `hover:bg-grey-50` | 미묘한 배경 변화 |
| **클릭** | `active:scale-[0.98]` | 눌림 효과로 피드백 |
| **오늘** | `bg-toss-blue rounded-full animate-pulse-soft` | 원형 배경 + 펄스 |
| **선택** | `ring-2 ring-toss-blue ring-inset` | 테두리 강조 |
| **뱃지** | `px-2.5 py-1 rounded-lg` | pill 스타일 |

**핵심 디자인 원칙:**
1. **둥글둥글함** - rounded-2xl, rounded-full
2. **미묘한 그림자 없음** - 플랫 디자인
3. **색상으로 구분** - 배경색 변화
4. **애니메이션** - 펄스, 스케일 피드백
5. **넉넉한 패딩** - p-3 (12px)

### 1.3 현재 목업 카드의 문제점

```html
<!-- 현재 목업 -->
<div class="card p-5 cursor-pointer">
  <h3 class="text-[16px] font-bold">중3 심화</h3>
  <span class="text-[12px] text-grey-500">지난 진도</span>
</div>
```

**문제점:**
1. **일관성 없는 폰트 크기** - `text-[16px]`, `text-[12px]` 사용
2. **딱딱한 구분선** - `divider` 클래스로 명확한 선 사용
3. **평면적인 느낌** - 캘린더의 입체감 부재
4. **정보 밀도 높음** - 좁은 공간에 많은 정보

---

## 2. 캘린더 스타일 적용 방안

### 2.1 폰트 크기 시스템 통일

Tailwind config의 fontSize 시스템 활용:

| 용도 | 클래스 | 크기 |
|------|--------|------|
| 반 이름 | `text-headline-sm` | 20px, 600 |
| 강사·학생 | `text-body` | 16px, 400 |
| 레이블 | `text-body-sm` | 14px, 400 |
| 내용 | `text-body-sm` 또는 `text-caption` | 14px/12px |

### 2.2 컬러 시스템

캘린더와 동일한 토스 컬러 팔레트:

```
배경: bg-white (표면) / bg-grey-50 (페이지)
주요 텍스트: text-grey-900
보조 텍스트: text-grey-500, text-grey-400
강조: text-toss-blue / bg-toss-blueLight
```

### 2.3 구분선 대안

**현재:**
```css
.divider {
  height: 1px;
  background: #E5E8EB;
}
```

**대안 1: 배경색 영역 분리**
```html
<div class="bg-grey-50 rounded-xl p-3 mb-3">
  <!-- 지난 수업 정보 -->
</div>
<div class="bg-toss-blueLight rounded-xl p-3">
  <!-- 오늘 수업 정보 -->
</div>
```

**대안 2: 구분선 제거 + 여백 증가**
```html
<div class="space-y-4">
  <div>지난 진도</div>
  <div>지난 숙제</div>
</div>
<!-- gap으로 자연스러운 구분 -->
<div class="mt-5">
  <div>오늘 진도</div>
</div>
```

**대안 3: 점선 구분**
```html
<div class="border-b border-dashed border-grey-200 pb-3 mb-3">
```

### 2.4 카드 스타일 개선

```html
<!-- 캘린더 스타일 적용 -->
<div class="
  bg-white rounded-2xl p-4
  transition-all duration-200
  hover:bg-grey-50
  active:scale-[0.99]
  cursor-pointer
">
```

**변경점:**
- `rounded-2xl` (32px) → 캘린더와 동일
- `hover:bg-grey-50` → 미묘한 호버
- `active:scale-[0.99]` → 클릭 피드백
- `shadow` 제거 → 플랫 디자인

---

## 3. 개선된 카드 레이아웃 제안

### 3.1 Option A: 영역 분리형

```
┌─────────────────────────────────┐
│  중3 심화                        │
│  김선생 · 5명                    │
│                                  │
│  ┌────────────────────────────┐ │
│  │  ◀ 지난 수업                │ │
│  │  쎈_p.42~45                 │ │
│  │  쎈_p.42 1~15번             │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │  ▶ 오늘 수업         (파랑) │ │
│  │  쎈_p.46~50                 │ │
│  │  -                          │ │
│  └────────────────────────────┘ │
│                                  │
│  💬 이차함수 개념 복습 필요      │
└─────────────────────────────────┘
```

**특징:**
- 지난 수업: 회색 배경 영역
- 오늘 수업: 연한 파랑 배경 영역
- 자연스러운 시각적 구분

### 3.2 Option B: 인라인 레이블형

```
┌─────────────────────────────────┐
│  중3 심화              김선생 5명│
│                                  │
│  지난    쎈_p.42~45             │
│  진도                            │
│                                  │
│  지난    쎈_p.42 1~15번         │
│  숙제                            │
│                                  │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│                                  │
│  오늘    쎈_p.46~50        🔵   │
│  진도                            │
│                                  │
│  오늘    -                       │
│  숙제                            │
│                                  │
│  💬 이차함수 개념 복습 필요      │
└─────────────────────────────────┘
```

**특징:**
- 레이블이 왼쪽에 고정
- 점선 구분
- 오늘 진도에 파란 점 강조

### 3.3 Option C: 컴팩트형 (캘린더 뱃지 스타일)

```
┌─────────────────────────────────┐
│  중3 심화              5명      │
│  김선생                          │
│                                  │
│  ┌──────┐ ┌──────────────────┐ │
│  │ 지난 │ │ 쎈_p.42~45       │ │
│  └──────┘ └──────────────────┘ │
│  ┌──────┐ ┌──────────────────┐ │
│  │ 숙제 │ │ 쎈_p.42 1~15번   │ │
│  └──────┘ └──────────────────┘ │
│                                  │
│  ┌──────┐ ┌──────────────────┐ │
│  │ 오늘 │ │ 쎈_p.46~50       │ │
│  └──────┘ └──────────────────┘ │
│  ┌──────┐ ┌──────────────────┐ │
│  │ 숙제 │ │ -                │ │
│  └──────┘ └──────────────────┘ │
│                                  │
│  💬 이차함수 개념 복습 필요      │
└─────────────────────────────────┘
```

**특징:**
- 뱃지 스타일 레이블
- 캘린더 공지 뱃지와 동일한 느낌
- 정보가 정렬됨

---

## 4. 추천: Option A (영역 분리형)

### 4.1 이유

| 기준 | Option A | Option B | Option C |
|------|----------|----------|----------|
| 캘린더 일관성 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| 정보 가독성 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 공간 효율 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| 시각적 구분 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 구현 난이도 | 쉬움 | 보통 | 보통 |

**Option A 선택 이유:**
1. 캘린더의 "오늘" 배경색 강조와 동일한 패턴
2. 구분선 없이 영역으로 자연스러운 구분
3. 시선의 흐름이 명확함
4. 토스 디자인 철학(Simple Over Complex)에 부합

### 4.2 상세 구현 스펙

```html
<div class="bg-white rounded-2xl p-4 hover:bg-grey-50/50 active:scale-[0.99] transition-all cursor-pointer">
  <!-- 헤더 -->
  <div class="mb-3">
    <h3 class="text-headline-sm text-grey-900">중3 심화</h3>
    <p class="text-body-sm text-grey-500">김선생 · 5명</p>
  </div>

  <!-- 지난 수업 (회색 영역) -->
  <div class="bg-grey-50 rounded-xl p-3 mb-2">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-caption text-grey-400">◀ 지난 수업</span>
    </div>
    <div class="space-y-1.5">
      <div>
        <span class="text-caption text-grey-400 mr-2">진도</span>
        <span class="text-body-sm text-grey-700">쎈_p.42~45</span>
      </div>
      <div>
        <span class="text-caption text-grey-400 mr-2">숙제</span>
        <span class="text-body-sm text-grey-700">쎈_p.42 1~15번</span>
      </div>
    </div>
  </div>

  <!-- 오늘 수업 (파랑 영역) -->
  <div class="bg-toss-blueLight rounded-xl p-3 mb-2">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-caption text-toss-blue font-medium">▶ 오늘 수업</span>
    </div>
    <div class="space-y-1.5">
      <div>
        <span class="text-caption text-toss-blue/70 mr-2">진도</span>
        <span class="text-body-sm text-grey-900 font-medium">쎈_p.46~50</span>
      </div>
      <div>
        <span class="text-caption text-toss-blue/70 mr-2">숙제</span>
        <span class="text-body-sm text-grey-400">-</span>
      </div>
    </div>
  </div>

  <!-- 메모 -->
  <div class="flex items-center gap-2 text-body-sm text-grey-600 px-1">
    <MessageSquare class="w-4 h-4 text-grey-400" />
    <span>이차함수 개념 복습 필요</span>
  </div>
</div>
```

### 4.3 색상 토큰

| 요소 | 색상 |
|------|------|
| 카드 배경 | `bg-white` |
| 카드 호버 | `bg-grey-50/50` |
| 지난 수업 영역 | `bg-grey-50` |
| 오늘 수업 영역 | `bg-toss-blueLight` (#E8F3FF) |
| 지난 레이블 | `text-grey-400` |
| 오늘 레이블 | `text-toss-blue` |
| 내용 텍스트 | `text-grey-700` / `text-grey-900` |
| 메모 텍스트 | `text-grey-600` |

---

## 5. 애니메이션 & 인터랙션

캘린더와 동일한 인터랙션 적용:

```css
/* 카드 기본 */
.class-card {
  @apply transition-all duration-200;
  @apply hover:bg-grey-50/50;
  @apply active:scale-[0.99];
}

/* 현재 진행 중인 수업 */
.class-card-current {
  @apply ring-2 ring-toss-blue ring-inset;
  @apply bg-toss-blueLight/30;
}

/* 카드 진입 애니메이션 */
.class-card-enter {
  @apply animate-scale-in;
}
```

---

## 6. 반응형 고려

```css
/* 기본: 3열 */
grid-cols-3

/* 넓은 화면: 4열 */
xl:grid-cols-4

/* 좁은 화면: 2열 */
lg:grid-cols-2

/* 모바일: 1열 */
md:grid-cols-1
```

---

## 7. 결론

### 핵심 변경사항

| 항목 | 기존 | 개선 |
|------|------|------|
| 폰트 크기 | `text-[16px]` 등 | `text-headline-sm` 등 시스템 사용 |
| 구분선 | 1px 회색 선 | 배경색 영역으로 분리 |
| 모서리 | `rounded-lg` (20px) | `rounded-2xl` (32px) |
| 호버 | `transform: translateY(-2px)` | `hover:bg-grey-50/50` |
| 클릭 | 없음 | `active:scale-[0.99]` |
| 그림자 | `shadow-sm` | 제거 (플랫) |
| 오늘 강조 | 파란 테두리 | 파란 배경 영역 |

### 다음 단계

1. HTML 목업 수정 (Option A 적용)
2. 실제 React 컴포넌트 구현
3. 애니메이션 추가
4. 반응형 테스트

---

*연구 완료 - 개발은 별도 요청 시 진행*
