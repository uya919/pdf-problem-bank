# 리팩토링 실패 방지 연구 리포트

> 기존 hyeyum 코드를 복사하지 않고 완전히 새로운 디자인으로 개발하는 방법

**작성일**: 2025-12-10
**문제**: 리팩토링 시 Claude가 기존 코드를 그대로 복사하여 새 디자인 철학이 적용되지 않음

---

## 1. 실패 사례 분석

### 1.1 문제 상황

```
사용자 의도:
- 완전히 새로운 Toss 스타일 UI/UX
- 그라디언트 히어로, 아이콘 배경색, 40px 높이 통일
- 목업(dashboard-modal-final.html) 기반 개발

실제 결과:
- 기존 hyeyum의 플랫한 디자인 그대로
- 큰 파일들을 복사해서 사용
- 결국 기존 프로젝트와 동일한 결과물
```

### 1.2 왜 이런 일이 발생하는가?

| 원인 | 설명 |
|------|------|
| **참조 편향** | Claude가 비슷한 컴포넌트를 찾아 기존 코드를 참조 |
| **경로 탐색** | `C:\MYCLAUDE_PROJECT\hyeyum`을 자동으로 검색 |
| **이름 유사성** | `Button.tsx`, `Card.tsx` 등 동일한 파일명 → 기존 코드 복사 |
| **컨텍스트 오염** | 기존 코드를 읽으면 그 패턴이 컨텍스트에 남음 |
| **편의성** | 새로 작성하는 것보다 복사가 빠름 |

### 1.3 구체적인 실패 시나리오

```typescript
// 사용자가 원한 것 (새 디자인)
<div className="bg-gradient-to-br from-[#3182F6] to-[#2563eb]">
  <button className="bg-white/20 text-white">진도 기록</button>
</div>

// Claude가 실제로 만든 것 (기존 복사)
<div className="bg-white border rounded-lg">
  <button className="bg-blue-500 text-white">진도 기록</button>
</div>
```

---

## 2. 핵심 우려사항

### 2.1 컨텍스트 오염 (Context Pollution)

```
위험한 시나리오:
1. Claude가 "Button 컴포넌트 어떻게 만들지?" 생각
2. hyeyum/src/components/Button.tsx 를 읽음
3. 그 패턴이 컨텍스트에 남음
4. 새 Button을 만들 때 무의식적으로 같은 패턴 사용
```

**결과**: 목업과 완전히 다른 결과물

### 2.2 파일 크기 함정

기존 hyeyum의 큰 파일들:
- `Dashboard.tsx` (500줄+)
- `StudentList.tsx` (400줄+)
- `ProgressModal.tsx` (600줄+)

**위험**: Claude가 "이미 있는 걸 왜 다시 만들어?"라고 판단하고 복사

### 2.3 암묵적 패턴 상속

```typescript
// 기존 hyeyum 패턴
const colors = {
  primary: 'bg-blue-500',
  secondary: 'bg-gray-200',
}

// 새 디자인에서도 무의식적으로 같은 패턴
const colors = {
  primary: 'bg-blue-500',  // ❌ 복사됨
  secondary: 'bg-gray-200', // ❌ 복사됨
}

// 원래 원한 것
const colors = {
  primary: 'bg-[#3182F6]',  // ✅ 새 디자인
  secondary: 'bg-white/20', // ✅ 새 디자인
}
```

---

## 3. 방지 전략

### 3.1 전략 1: 물리적 격리 ⭐⭐⭐

**hyeyum 폴더에 절대 접근하지 않도록 명시**

```markdown
# CLAUDE.md에 추가

## ⛔ 절대 금지 (CRITICAL)

다음 폴더의 코드를 **절대로** 읽거나 참조하지 마세요:
- `C:\MYCLAUDE_PROJECT\hyeyum\`
- `C:\MYCLAUDE_PROJECT\hyeyum-v2\`

이 프로젝트는 완전히 새로운 디자인 시스템입니다.
기존 코드를 참조하면 디자인이 오염됩니다.
```

### 3.2 전략 2: 목업 우선 개발 ⭐⭐⭐

**항상 목업 HTML을 먼저 읽고 시작**

```markdown
# CLAUDE.md에 추가

## 개발 순서 (필수)

새 컴포넌트를 만들기 전에 **반드시** 다음 파일을 읽으세요:
1. `docs/mockups/dashboard-modal-final.html`
2. `src/components/design-system/tokens.ts`

⚠️ 다른 프로젝트의 코드를 참조하지 마세요.
```

### 3.3 전략 3: 디자인 토큰 강제 ⭐⭐⭐

**모든 스타일은 토큰을 통해서만 사용**

```typescript
// src/components/design-system/tokens.ts
// 이 파일의 값만 사용 가능

export const COLORS = {
  primary: '#3182F6',      // ✅ 유일하게 허용된 primary
  primaryDark: '#1B64DA',
  // bg-blue-500 사용 금지
} as const;

export const TAILWIND = {
  heroGradient: 'bg-gradient-to-br from-[#3182F6] to-[#2563eb]',
  btnPrimary: 'bg-white text-[#3182F6]',
  btnSecondary: 'bg-white/20 text-white',
  // 다른 클래스 사용 금지
} as const;
```

### 3.4 전략 4: 컴포넌트 이름 차별화 ⭐⭐

**기존과 다른 이름 사용으로 검색 방지**

```
기존 hyeyum          새 백오피스
-----------          -----------
Button.tsx      →    TossButton.tsx
Card.tsx        →    TossCard.tsx
Modal.tsx       →    BottomSheet.tsx
Dashboard.tsx   →    TeacherHome.tsx
```

### 3.5 전략 5: 작은 파일 원칙 ⭐⭐

**파일당 100줄 이하로 제한**

```markdown
# CLAUDE.md에 추가

## 파일 크기 제한

| 파일 유형 | 최대 줄 수 |
|-----------|-----------|
| 토큰/상수 | 50줄 |
| 기본 컴포넌트 | 80줄 |
| 복합 컴포넌트 | 120줄 |
| 페이지 | 150줄 |

⚠️ 이 제한을 넘으면 분리하세요.
⚠️ 기존 프로젝트에서 큰 파일을 복사하지 마세요.
```

### 3.6 전략 6: 체크리스트 강제 ⭐⭐

**매 컴포넌트 완성 시 확인**

```markdown
# CLAUDE.md에 추가

## 컴포넌트 완성 체크리스트

새 컴포넌트를 만들 때마다 확인:

- [ ] 그라디언트 배경 사용? (히어로 카드)
- [ ] #3182F6 사용? (bg-blue-500 ❌)
- [ ] 40px 높이 통일? (입력 요소)
- [ ] 아이콘 배경색 사용? (#E8F5E9, #E3F2FD, #FFF3E0)
- [ ] hyeyum 폴더 참조 안 함?
- [ ] 목업과 비교 완료?
```

---

## 4. CLAUDE.md 강화 버전

```markdown
# Hyeyum 백오피스 (강사용 모바일 앱)

---

## ⛔ 절대 금지 사항

### 1. 다른 프로젝트 참조 금지
```
절대로 읽지 마세요:
- C:\MYCLAUDE_PROJECT\hyeyum\*
- C:\MYCLAUDE_PROJECT\hyeyum-v2\*
- C:\MYCLAUDE_PROJECT\hyeyum-v3\*
```

### 2. 금지된 Tailwind 클래스
```
❌ bg-blue-500, bg-blue-600 (Tailwind 기본)
❌ bg-white border (플랫 디자인)
❌ rounded-md (작은 radius)

✅ bg-[#3182F6] (우리 primary)
✅ bg-gradient-to-br from-[#3182F6] to-[#2563eb] (히어로)
✅ rounded-xl, rounded-2xl (큰 radius)
```

### 3. 금지된 패턴
```typescript
// ❌ 절대 금지
<div className="bg-white border rounded-lg p-4">

// ✅ 올바른 패턴
<div className="bg-white rounded-2xl shadow-sm p-5">
```

---

## ✅ 필수 개발 순서

새 컴포넌트 만들기 전:

1. `docs/mockups/dashboard-modal-final.html` 읽기
2. `src/components/design-system/tokens.ts` 확인
3. 해당 섹션의 CSS 복사
4. React 컴포넌트로 변환

⚠️ 다른 프로젝트 코드를 **절대** 참조하지 마세요.

---

## 디자인 토큰 (복사해서 사용)

### 색상
```typescript
primary: '#3182F6'
primaryDark: '#1B64DA'
primaryLight: '#F2F6FC'
```

### 그라디언트
```typescript
heroGradient: 'bg-gradient-to-br from-[#3182F6] to-[#2563eb]'
```

### 아이콘 배경
```typescript
attendance: '#E8F5E9'  // 출결 - 연두
progress: '#E3F2FD'    // 진도 - 연파랑
homework: '#FFF3E0'    // 숙제 - 연주황
```

### 크기
```typescript
inputHeight: '40px'     // h-10
buttonHeight: '48px'    // h-12
iconBox: '36px'         // w-9 h-9
```
```

---

## 5. 개발 워크플로우 제안

### Phase 0: 환경 격리
```bash
# hyeyum 폴더 접근 차단 (Windows)
# .claude/settings.local.json에 추가
{
  "ignorePatterns": [
    "C:/MYCLAUDE_PROJECT/hyeyum/**",
    "C:/MYCLAUDE_PROJECT/hyeyum-v2/**"
  ]
}
```

### Phase 1: 디자인 시스템 먼저
```
1. tokens.ts 작성 (색상, 크기 상수)
2. TossButton.tsx (목업에서 복사)
3. TossInput.tsx (40px 높이)
4. TossCard.tsx (shadow-sm, rounded-2xl)
```

### Phase 2: 골든 레퍼런스 생성
```
1. HeroCard.tsx 완성 (그라디언트 확인)
2. 스크린샷 찍어서 목업과 비교
3. 일치하면 다음 진행
4. 불일치하면 수정
```

### Phase 3: 점진적 확장
```
1. 디자인 시스템 컴포넌트만 사용
2. 새 컴포넌트는 반드시 목업 참조
3. 매번 체크리스트 확인
```

---

## 6. 위험 시나리오 & 대응

### 시나리오 1: Claude가 hyeyum 폴더를 검색

```
상황: "Button 컴포넌트가 있나 찾아볼게요"
위험: hyeyum/src/components/Button.tsx 발견

대응: CLAUDE.md에 "다른 폴더 검색 금지" 명시
```

### 시나리오 2: 비슷한 기능 구현 시

```
상황: "출결 체크 기능을 만들어야 해요"
위험: "hyeyum에 이미 있으니 참고할게요"

대응: "목업의 출결 체크 버튼 스타일대로 만드세요" 명시
```

### 시나리오 3: 큰 파일 생성 시도

```
상황: "Dashboard.tsx에 모든 기능을 넣을게요"
위험: 500줄 파일 → 기존 패턴 복사 가능성

대응: 100줄 제한 강제, 작은 컴포넌트로 분리
```

---

## 7. 성공 지표

### 시각적 확인
- [ ] 히어로 카드에 그라디언트 있음
- [ ] 버튼이 반투명 화이트 (bg-white/20)
- [ ] 아이콘에 컬러 배경 있음
- [ ] 입력 요소 40px 높이 통일
- [ ] 전체적으로 목업과 일치

### 코드 확인
- [ ] `bg-blue-500` 사용 없음
- [ ] `hyeyum` 폴더 import 없음
- [ ] 모든 색상이 tokens.ts에서 옴
- [ ] 파일당 150줄 이하

---

## 8. 결론

### 핵심 방지책 3가지

1. **물리적 격리**: hyeyum 폴더 접근 금지 명시
2. **목업 우선**: 항상 HTML 목업 먼저 읽기
3. **토큰 강제**: 모든 스타일은 tokens.ts 통해서만

### 사용자 역할

개발 중 다음 상황 발생 시 즉시 중단:
- "hyeyum 폴더에서 참고할게요" → ❌ 중단
- "기존 컴포넌트를 가져올게요" → ❌ 중단
- `bg-blue-500` 사용 → ❌ 수정 요청

---

*작성: Claude Code | 2025-12-10*
