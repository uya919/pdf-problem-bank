# 혜윰 UI/UX 디자인 시스템 v1.0

> 진도기록 모달 및 대시보드를 위한 통합 디자인 가이드

---

## 1. 핵심 철학

### 1.1 토스 UX 원칙 (우리의 기준)

| 원칙 | 설명 | 적용 |
|------|------|------|
| **1 Thing / 1 Page** | 한 화면에 하나의 목적 | 모달 = 기록 하나만 |
| **Context First** | 왜 해야 하는지 먼저 | 지난 수업 → 오늘 수업 |
| **Minimum Input** | 입력 최소화 | 자동완성, 기본값 |
| **Progressive Disclosure** | 필요할 때만 노출 | 숙제 토글 |

### 1.2 정보 계층

```
Level 1: 핵심 정보 → 크고 굵게 (16px, 600)
Level 2: 보조 정보 → 중간 (14px, 400)
Level 3: 부가 정보 → 작고 연하게 (12px, gray)
```

---

## 2. 컬러 시스템

### 2.1 Primary Colors

```css
--blue: #3182F6;        /* Primary Action */
--blue-light: #F2F6FC;  /* Primary Background */
--blue-dark: #1B64DA;   /* Hover/Active */
```

### 2.2 Neutral Colors

```css
--white: #FFFFFF;
--gray-50: #F9FAFB;     /* 카드 배경 (읽기전용) */
--gray-100: #F2F4F6;    /* 구분선, 비활성 배경 */
--gray-200: #E5E8EB;    /* Border */
--gray-400: #B0B8C1;    /* Placeholder */
--gray-500: #8B95A1;    /* 보조 텍스트 */
--gray-600: #6B7684;    /* 라벨 */
--gray-700: #4E5968;    /* 본문 */
--gray-900: #191F28;    /* 제목 */
```

### 2.3 Semantic Colors

```css
--green: #00C896;       /* 성공, 완료 */
--red: #F04452;         /* 에러, 경고 */
--orange: #FF9500;      /* 주의 */
```

---

## 3. 타이포그래피

### 3.1 Font Scale

| 용도 | Size | Weight | Line Height | Color |
|------|------|--------|-------------|-------|
| 모달 제목 | 16px | 600 | 1.4 | gray-900 |
| 섹션 제목 | 14px | 600 | 1.4 | gray-900 |
| 본문 | 14px | 400 | 1.5 | gray-700 |
| 라벨 | 12px | 500 | 1.3 | gray-500 |
| 힌트 | 11px | 400 | 1.3 | gray-400 |

### 3.2 적용 예시

```css
/* 모달 제목 */
.modal-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--gray-900);
}

/* 폼 라벨 */
.form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-500);
}

/* 힌트 텍스트 */
.hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--gray-400);
}
```

---

## 4. 스페이싱 시스템

### 4.1 Base Unit: 4px

모든 간격은 4px의 배수로 통일

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
```

### 4.2 컴포넌트별 스페이싱

| 위치 | 값 | 용도 |
|------|-----|------|
| 모달 패딩 | 20px | 좌우 여백 |
| 섹션 간격 | 16px | 카드 사이 |
| 카드 내부 패딩 | 14px | 상하좌우 |
| 폼 그룹 간격 | 16px | 입력 필드 사이 |
| 라벨-입력 간격 | 8px | 라벨 아래 |
| 인라인 간격 | 8px | 요소 사이 |

---

## 5. 컴포넌트 사이즈 ⭐ (정렬 핵심)

### 5.1 입력 필드 높이 통일

**모든 인터랙티브 요소는 동일한 높이 사용**

```css
--input-height: 40px;  /* 표준 높이 */
```

| 컴포넌트 | 높이 | 비고 |
|----------|------|------|
| 텍스트 입력 | 40px | 모든 input |
| 드롭다운/Select | 40px | textbook-chip |
| 버튼 (인라인) | 40px | 변경 버튼 등 |
| 페이지 입력 | 40px | 숫자 입력 |

### 5.2 드롭다운(Chip) vs 입력필드 너비

**비율 기준: 드롭다운 40%, 입력 60%**

```css
.progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 교재 드롭다운: 고정 너비 */
.textbook-chip {
  min-width: 100px;
  height: 40px;
  padding: 0 12px;
}

/* 페이지 입력: 고정 너비 */
.page-input {
  width: 52px;
  height: 40px;
}
```

### 5.3 정렬 규칙

```
┌─────────────────────────────────────────┐
│ 📚 단원명                               │  ← 라벨
│ ┌─────────────────────────────┐ ┌─────┐ │
│ │ 이차방정식 풀이              │ │변경 │ │  ← 40px 높이 통일
│ └─────────────────────────────┘ └─────┘ │
│                                         │
│ 📄 진도                                 │  ← 라벨
│ ┌──────────┐      ┌────┐    ┌────┐     │
│ │ 베이직쎈 ▼│ p.  │ 46 │ ~  │ 50 │     │  ← 40px 높이 통일
│ └──────────┘      └────┘    └────┘     │
└─────────────────────────────────────────┘

모든 인터랙티브 요소가 baseline 정렬
```

---

## 6. 모달 구조

### 6.1 레이아웃

```
┌─────────────────────────────────────────┐
│ [←]     중3A반 수업 기록          [✕]  │  ← 헤더 56px
│         12월 10일 (화) 17:00            │
├─────────────────────────────────────────┤
│                                         │
│  ┌─ 지난 수업 ────────────── 12/9 ─┐   │  ← 읽기전용 카드
│  │ 📖 이차방정식 풀이               │   │
│  │ 📄 베이직쎈 p.42-45              │   │
│  │ 📝 숙제 p.46 · 제출 6/8          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─ 오늘 수업 ────────────── 12/10 ─┐  │  ← 입력 폼
│  │                                   │  │
│  │  📖 단원명                        │  │
│  │  [이차방정식 풀이              ]  │  │
│  │                                   │  │
│  │  📄 진도                          │  │
│  │  [베이직쎈▼] p. [46] ~ [50]      │  │
│  │                                   │  │
│  │  📝 숙제                          │  │
│  │  [베이직쎈▼]    [51] ~ [53]      │  │
│  │                                   │  │
│  │  💬 비고                          │  │
│  │  [textarea                    ]  │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │  ← 하단 고정
│  │           저장하기               │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 6.2 섹션 스펙

| 영역 | 배경 | Border | 패딩 |
|------|------|--------|------|
| 모달 전체 | white | - | 0 |
| 헤더 | white | bottom 1px | 16px 20px |
| 지난 수업 카드 | gray-50 | 1px gray-200 | 14px |
| 오늘 수업 폼 | white | 1px gray-200 | 14px |
| 하단 버튼 영역 | white | top 1px | 12px 20px |

---

## 7. 폼 컴포넌트 상세

### 7.1 단원명 입력

```html
<div class="form-group">
  <label class="form-label">
    <span class="icon">📖</span>
    <span>단원명</span>
  </label>
  <input type="text" class="text-input" value="이차방정식 풀이" placeholder="단원명 입력">
</div>
```

```css
.text-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  font-size: 14px;
  background: var(--white);
}

.text-input:focus {
  outline: none;
  border-color: var(--blue);
}
```

### 7.2 진도/숙제 입력 (드롭다운 + 페이지)

```html
<div class="form-group">
  <label class="form-label">
    <span class="icon">📄</span>
    <span>진도</span>
  </label>
  <div class="progress-row">
    <button class="textbook-chip">
      베이직쎈
      <svg>▼</svg>
    </button>
    <span class="page-label">p.</span>
    <input type="text" class="page-input" value="46">
    <span class="separator">~</span>
    <input type="text" class="page-input" value="50">
  </div>
</div>
```

```css
.progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.textbook-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  min-width: 100px;
  height: 40px;
  padding: 0 12px;
  background: var(--gray-100);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  font-size: 14px;
  color: var(--gray-700);
  cursor: pointer;
}

.textbook-chip svg {
  width: 12px;
  height: 12px;
  stroke: var(--gray-400);
  flex-shrink: 0;
}

.page-label {
  font-size: 13px;
  color: var(--gray-500);
  flex-shrink: 0;
}

.page-input {
  width: 52px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
  text-align: center;
  background: var(--white);
}

.separator {
  font-size: 14px;
  color: var(--gray-400);
  flex-shrink: 0;
}
```

### 7.3 비고 (자동확장 Textarea)

```css
.notes-textarea {
  width: 100%;
  min-height: 40px;
  max-height: 96px;  /* 3줄 제한 */
  padding: 10px 12px;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: var(--gray-900);
  background: var(--white);
  resize: none;
  overflow-y: auto;
  line-height: 1.5;
}
```

---

## 8. 버튼 시스템

### 8.1 Primary Button (저장)

```css
.btn-primary {
  width: 100%;
  height: 48px;
  background: var(--blue);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--blue-dark);
}

.btn-primary:disabled {
  background: var(--gray-200);
  color: var(--gray-400);
}
```

### 8.2 Secondary Button (수정, 취소)

```css
.btn-secondary {
  height: 40px;
  padding: 0 16px;
  background: var(--gray-100);
  color: var(--gray-600);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}

.btn-secondary:hover {
  background: var(--gray-200);
}
```

---

## 9. 반응형 규칙

### 9.1 터치 타겟

| 요소 | 최소 크기 | 권장 |
|------|----------|------|
| 버튼 | 40×40px | 48×48px |
| 입력 필드 | 40px 높이 | - |
| 체크박스 | 24×24px | 터치 영역 44px |

### 9.2 브레이크포인트

```css
/* Mobile First */
@media (max-width: 375px) {
  /* 작은 모바일: 패딩 축소 */
  .modal-body { padding: 12px 16px; }
}

@media (min-width: 768px) {
  /* 태블릿: 모달 너비 제한 */
  .modal-container { max-width: 480px; }
}
```

---

## 10. 체크리스트

### 구현 시 확인사항

- [ ] 모든 입력 요소 높이 40px 통일
- [ ] 드롭다운과 입력필드 baseline 정렬
- [ ] 라벨-입력 간격 8px
- [ ] 폼 그룹 간격 16px
- [ ] 카드 패딩 14px
- [ ] 모달 좌우 패딩 20px
- [ ] 색상 토큰 사용 (하드코딩 금지)
- [ ] 폰트 사이즈 scale 준수
- [ ] 아이콘: 단원명 📖 / 진도 📄 / 숙제 📝 / 비고 💬

---

## 참고

- [252_toss_style_progress_modal_research.md](252_toss_style_progress_modal_research.md)
- [247_toss_apple_design_comparison_research.md](247_toss_apple_design_comparison_research.md)
- [254_dashboard_modal_design_connection_research.md](254_dashboard_modal_design_connection_research.md)

---

*작성일: 2025-12-10*
*버전: v1.0*
