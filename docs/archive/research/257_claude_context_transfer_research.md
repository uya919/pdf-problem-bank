# Claude 컨텍스트 전달 실패 분석 리포트

> 왜 hyeyum-v3에서 Claude Code가 우리의 디자인을 이해하지 못하는가?

---

## 1. 문제 현상

### 1.1 기대한 결과 (pdf 프로젝트에서 만든 목업)

```
dashboard-modal-final.html의 특징:
├── 드롭박스 공지사항 (접힘/펼침 + 체크박스)
├── 히어로 카드
│   ├── Gradient 배경 (135deg, #3182F6 → #2563eb)
│   ├── Primary 버튼: 흰색 배경, 파란색 텍스트
│   └── Secondary 버튼: rgba(255,255,255,0.2) 반투명
├── 할일 카드
│   ├── 아이콘 배경색 (초록 #E8F5E9, 파랑 #E3F2FD, 주황 #FFF3E0)
│   └── 빨간색 뱃지 (#FFEBEE 배경)
├── 스케줄 타임라인
│   ├── 시간 + 도트 + 이름
│   └── 활성 항목 파란색 강조
└── border-radius: 16px (카드)
```

### 1.2 실제 결과 (hyeyum-v3에서 만든 것)

```
스크린샷 분석:
├── 공지사항: 단순 한 줄 텍스트 (드롭박스 아님)
├── 히어로 카드
│   ├── 단색 파란 배경 (gradient 없음)
│   ├── 버튼이 분리된 스타일이 아님
│   └── Secondary 버튼: 흰색 배경 (반투명 아님)
├── 할일 카드
│   ├── 아이콘 배경색 없음 (아이콘만)
│   └── 텍스트만 빨간색 (뱃지 형태 아님)
├── 스케줄
│   └── 도트만 있고 시각적 강조 부족
└── 전반적으로 "대충 비슷하게" 만든 느낌
```

### 1.3 차이점 요약

| 요소 | 목업 (정답) | hyeyum-v3 (오답) |
|------|------------|-----------------|
| 공지사항 | 드롭박스 (펼침/접힘) | 단순 텍스트 |
| 히어로 배경 | Gradient | 단색 |
| Secondary 버튼 | 반투명 흰색 | 불투명 흰색 |
| 할일 아이콘 | 컬러 배경 + 아이콘 | 아이콘만 |
| 뱃지 | 배경색 있는 뱃지 | 텍스트만 |
| 카드 radius | 16px | 불명확 |
| 그림자 | box-shadow 있음 | 없거나 약함 |

---

## 2. 원인 분석

### 2.1 근본 원인: 추상적 지시 vs 구체적 구현

**현재 CLAUDE.md의 문제:**

```markdown
# 현재 작성된 내용 (추상적)
### 디자인 토큰
--blue: #3182F6;
--gray-50: #F9FAFB;

### 컴포넌트 사이즈
- 모든 입력 요소: **40px 높이**
```

**Claude의 해석:**
- "토스 스타일" → Claude가 아는 일반적인 토스 스타일
- "#3182F6 파란색" → 색상만 적용
- "40px 높이" → 높이만 맞춤

**빠진 것:**
- 히어로 카드의 **정확한 gradient 값**
- 버튼의 **정확한 rgba 투명도**
- 아이콘 배경의 **정확한 색상 코드**
- 카드의 **정확한 border-radius, shadow**

### 2.2 컨텍스트 손실

| 이 세션에서 가진 것 | hyeyum-v3 세션에서 가진 것 |
|-------------------|-------------------------|
| 20+ 연구 리포트 | 요약된 CLAUDE.md만 |
| 10+ 목업 반복 수정 | 목업 파일 경로만 |
| "이건 아니야" 피드백 축적 | 없음 |
| 시각적 레퍼런스 기억 | 없음 |

### 2.3 목업 파일을 읽지 않음

CLAUDE.md에 경로만 적어놓으면 Claude가 **자동으로 읽지 않음**:

```markdown
# CLAUDE.md에 적힌 내용
| 모달 목업 | 진도기록 모달 v5 | `docs/mockups/progress-modal-v5-aligned.html` |
```

Claude는 이것을 "참고하라"가 아니라 "문서가 있다"로만 인식.
**실제로 파일을 열어서 코드를 보지 않음**.

### 2.4 "토스 스타일"의 해석 차이

```
우리가 의미하는 "토스 스타일":
├── 드롭박스 공지 (우리가 직접 정의)
├── 특정 gradient 값 (우리가 선택)
├── 특정 아이콘 배경색 (우리가 선택)
└── 특정 레이아웃 구조 (우리가 설계)

Claude가 아는 "토스 스타일":
├── 일반적인 미니멀 디자인
├── 파란색 Primary
├── 둥근 모서리
└── 모바일 퍼스트
```

---

## 3. 해결 방안

### 3.1 방안 1: Reference Implementation 포함 (권장)

**CLAUDE.md에 실제 코드 포함:**

```markdown
## 필수 참조: 대시보드 레퍼런스 코드

### 히어로 카드 (반드시 이 스타일 사용)
\`\`\`css
.hero-card {
  background: linear-gradient(135deg, #3182F6 0%, #2563eb 100%);
  border-radius: 16px;
  padding: 20px;
  color: white;
}

.hero-btn.primary {
  background: white;
  color: #3182F6;
}

.hero-btn.secondary {
  background: rgba(255,255,255,0.2);
  color: white;
}
\`\`\`

### 할일 아이콘 배경색 (반드시 사용)
\`\`\`css
.icon-attendance { background: #E8F5E9; } /* 초록 */
.icon-progress { background: #E3F2FD; }   /* 파랑 */
.icon-homework { background: #FFF3E0; }   /* 주황 */
\`\`\`

### 뱃지 스타일
\`\`\`css
.badge-red {
  background: #FFEBEE;
  color: #F04452;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}
\`\`\`
```

### 3.2 방안 2: 스타터 컴포넌트 미리 생성

프로젝트 시작 전에 **기본 컴포넌트를 먼저 만들어 놓음**:

```
src/
├── components/
│   └── ui/
│       ├── HeroCard.tsx      ← 정확한 gradient, 버튼 스타일 포함
│       ├── TodoItem.tsx      ← 아이콘 배경색 포함
│       ├── Badge.tsx         ← 정확한 뱃지 스타일
│       └── NoticeDropbox.tsx ← 드롭박스 구현
│
└── styles/
    └── tokens.css            ← 모든 CSS 변수
```

### 3.3 방안 3: 명시적 파일 읽기 지시

```markdown
## 개발 시작 전 필수 작업

⚠️ **중요**: 아래 파일을 반드시 먼저 읽고 코드를 참조하세요:

1. `docs/mockups/dashboard-modal-final.html` - 대시보드 레퍼런스
2. `docs/mockups/progress-modal-v5-aligned.html` - 모달 레퍼런스

이 파일의 CSS를 **그대로** 사용하세요. 변형하지 마세요.
```

### 3.4 방안 4: 시각적 체크리스트

```markdown
## 디자인 검증 체크리스트

히어로 카드:
- [ ] 배경이 gradient인가? (단색이면 ❌)
- [ ] Secondary 버튼이 반투명인가? (불투명이면 ❌)

할일 카드:
- [ ] 아이콘에 배경색이 있는가? (없으면 ❌)
- [ ] 뱃지에 배경색이 있는가? (텍스트만이면 ❌)

공지사항:
- [ ] 드롭박스 형태인가? (단순 텍스트면 ❌)
```

---

## 4. 권장 해결책: 통합 접근

### 4.1 새로운 CLAUDE.md 구조

```markdown
# hyeyum-v3 개발 가이드

## ⚠️ 필수 참조 (개발 전 반드시 읽기)

### 1. 목업 파일
- `docs/mockups/dashboard-modal-final.html` ← **이 파일의 CSS를 그대로 사용**

### 2. 핵심 CSS 코드 (복사-붙여넣기용)

[실제 CSS 코드 전체 포함]

### 3. 컴포넌트별 스펙

[각 컴포넌트의 정확한 값 명시]

### 4. 검증 체크리스트

[시각적 검증 항목]
```

### 4.2 스타터 코드 제공

Next.js 프로젝트 생성 후 **기본 스타일과 컴포넌트를 먼저 추가**:

1. `globals.css` - 디자인 토큰
2. `HeroCard.tsx` - 히어로 카드 컴포넌트
3. `TodoList.tsx` - 할일 리스트 컴포넌트
4. `NoticeDropbox.tsx` - 드롭박스 공지

---

## 5. 즉시 실행 계획

### Step 1: CLAUDE.md 재작성
- 추상적 원칙 → 구체적 코드로 변경
- Reference CSS 전체 포함

### Step 2: 스타터 컴포넌트 생성
- HeroCard, TodoItem, Badge, NoticeDropbox
- tokens.css

### Step 3: 검증 체크리스트 추가
- 개발자가 스스로 확인할 수 있도록

### Step 4: 개발 시작 전 읽기 강제
- CLAUDE.md 상단에 "⚠️ 필수 참조" 섹션

---

## 6. 결론

### 문제의 본질
> CLAUDE.md가 **"무엇을 만들어야 하는가"**만 설명하고,
> **"어떻게 만들어야 하는가"**를 설명하지 않았음.

### 해결의 핵심
> 추상적 원칙이 아닌 **구체적인 코드**를 제공해야 함.
> Claude는 "토스 스타일"을 알지만, **"우리의 토스 스타일 해석"**은 모름.

### 핵심 교훈

| Before | After |
|--------|-------|
| "gradient 배경 사용" | `background: linear-gradient(135deg, #3182F6, #2563eb)` |
| "반투명 버튼" | `background: rgba(255,255,255,0.2)` |
| "아이콘 배경색" | `background: #E8F5E9` (정확한 색상 코드) |
| "토스 스타일" | 실제 CSS 코드 전체 |

---

*작성일: 2025-12-10*
*분석 대상: hyeyum-v3 초기 개발 결과물*
