# Hyeyum 백오피스 단계적 개발 계획

> 258, 259, 260번 연구 리포트를 통합한 실행 계획

**작성일**: 2025-12-10
**목표**: 기존 hyeyum UI를 복사하지 않고, 새 디자인 철학으로 백오피스 구축

---

## 전체 로드맵

```
┌─────────────────────────────────────────────────────────────────┐
│  Stage 1: 준비 (차단 전)                                         │
│  - hyeyum 기능 명세서 작성                                       │
│  - Supabase 스키마 문서화                                        │
│  - 비즈니스 로직 정리                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 2: 격리                                                   │
│  - hyeyum UI 코드 접근 차단                                      │
│  - PDF 파일 아카이브                                             │
│  - 새 프로젝트 초기화                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 3: 디자인 시스템                                          │
│  - tokens.ts 작성                                                │
│  - 기본 컴포넌트 (목업 기반)                                     │
│  - 골든 레퍼런스 검증                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 4: 기능 구현                                              │
│  - 대시보드                                                      │
│  - 진도 모달                                                     │
│  - 출결 관리                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Stage 5: Supabase 연동                                          │
│  - 읽기 연동                                                     │
│  - 쓰기 연동                                                     │
│  - 테스트                                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: 준비 (차단 전) ⭐ 중요

> **목적**: UI 코드를 차단하기 전에 "무엇을" 만들어야 하는지 파악

### 1.1 hyeyum 기능 명세서 작성

| 작업 | 설명 | 결과물 |
|------|------|--------|
| 기능 목록 추출 | 어떤 기능들이 있는지 | `docs/hyeyum-features.md` |
| 화면 목록 | 어떤 페이지/화면이 있는지 | 화면 플로우 |
| 사용자 시나리오 | 강사가 어떻게 사용하는지 | 유즈케이스 |

**차단하기 전에 읽을 것:**
```
hyeyum/src/app/           → 라우트 구조
hyeyum/src/types/         → 데이터 타입 (복사해도 됨)
hyeyum/drizzle/           → DB 스키마
```

**차단 후에도 참조 가능:**
```
docs/hyeyum-features.md   → 기능 명세서
docs/supabase-schema.md   → DB 스키마
```

### 1.2 Supabase 스키마 문서화

```sql
-- 예시: docs/supabase-schema.md에 저장할 내용

-- 테이블: classes
CREATE TABLE classes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,        -- "중3A반"
  subject TEXT,              -- "수학"
  teacher_id UUID,
  created_at TIMESTAMP
);

-- 테이블: students
CREATE TABLE students (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  class_id UUID REFERENCES classes(id),
  ...
);

-- 테이블: attendance
-- 테이블: progress
-- 테이블: homework
```

### 1.3 비즈니스 로직 정리

```markdown
# docs/business-logic.md

## 출결 체크 로직
1. 수업 시작 시 자동으로 전체 학생 "미입력" 상태
2. 강사가 개별 학생 출석/결석/지각 체크
3. 결석 시 사유 입력 (선택)
4. 저장 시 부모님께 알림 발송 (선택)

## 진도 기록 로직
1. 이전 수업 진도 자동 표시
2. 오늘 진도 입력 (교재, 페이지)
3. 숙제 입력 (교재, 페이지)
4. 저장 시 다음 수업 "이전 수업"에 반영
```

---

## Stage 2: 격리

> **목적**: UI 코드 오염 방지

### 2.1 Claude 접근 차단 (이미 적용됨 ✅)

```json
// .claude/settings.local.json
{
  "permissions": {
    "deny": [
      "Read(**/hyeyum/**)",
      "Read(**/hyeyum-v2/**)",
      "Read(**/hyeyum-v3/**)",
      "Glob(**/hyeyum/**)",
      "Grep(**/hyeyum/**)"
    ]
  }
}
```

### 2.2 선택적 차단 (개선된 방식)

```json
// 더 정교한 차단: UI는 차단, 타입/스키마는 허용
{
  "permissions": {
    "deny": [
      "Read(**/hyeyum/src/components/**)",
      "Read(**/hyeyum/src/app/**/*.tsx)",
      "Glob(**/hyeyum/src/components/**)",
      "Grep(**/hyeyum/src/components/**)"
    ],
    "allow": [
      "Read(**/hyeyum/src/types/**)",
      "Read(**/hyeyum/drizzle/**)"
    ]
  }
}
```

### 2.3 PDF 파일 아카이브

```bash
# 1. 아카이브 폴더 생성
mkdir archive\pdf-labeling

# 2. PDF 관련 파일 이동
move backend archive\pdf-labeling\
move frontend archive\pdf-labeling\
move src archive\pdf-labeling\
move scripts archive\pdf-labeling\

# 3. 데이터 삭제 (복사본에 있음)
rmdir /s /q dataset_root

# 4. 불필요한 파일 삭제
del *.py
del start_dev.bat
del stop_dev.bat
```

### 2.4 Next.js 프로젝트 초기화

```bash
# 현재 폴더에 Next.js 설치
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-git
```

---

## Stage 3: 디자인 시스템 (핵심)

> **목적**: 목업 기반으로 디자인 시스템 구축, 이후 모든 컴포넌트는 이것만 사용

### 3.1 tokens.ts 작성

```typescript
// src/components/design-system/tokens.ts

// ===== 색상 토큰 =====
export const COLORS = {
  primary: '#3182F6',
  primaryDark: '#1B64DA',
  primaryLight: '#F2F6FC',

  white: '#FFFFFF',
  black: '#191F28',

  gray50: '#F9FAFB',
  gray100: '#F2F4F6',
  gray200: '#E5E8EB',
  gray300: '#B0B8C1',
  gray400: '#8B95A1',
  gray500: '#6B7684',
  gray600: '#4E5968',
  gray700: '#333D4B',
  gray900: '#191F28',

  green: '#00C896',
  red: '#F04452',
  orange: '#FF9800',
} as const;

// ===== 아이콘 배경색 =====
export const ICON_BG = {
  attendance: '#E8F5E9',
  progress: '#E3F2FD',
  homework: '#FFF3E0',
  schedule: '#F3E5F5',
} as const;

// ===== Tailwind 클래스 =====
export const TW = {
  // 그라디언트
  heroGradient: 'bg-gradient-to-br from-[#3182F6] to-[#2563eb]',

  // 버튼
  btnPrimary: 'h-10 px-4 bg-white text-[#3182F6] font-semibold rounded-xl',
  btnSecondary: 'h-10 px-4 bg-white/20 text-white font-semibold rounded-xl',
  btnCta: 'h-12 w-full bg-[#3182F6] text-white font-semibold rounded-xl',

  // 입력
  input: 'h-10 px-3 border border-gray-200 rounded-lg text-sm',

  // 카드
  card: 'bg-white rounded-2xl shadow-sm',

  // 아이콘
  iconAttendance: 'w-9 h-9 rounded-[10px] bg-[#E8F5E9] flex items-center justify-center',
  iconProgress: 'w-9 h-9 rounded-[10px] bg-[#E3F2FD] flex items-center justify-center',
  iconHomework: 'w-9 h-9 rounded-[10px] bg-[#FFF3E0] flex items-center justify-center',
} as const;
```

### 3.2 기본 컴포넌트 (목업에서 추출)

| 컴포넌트 | 소스 | 파일 |
|----------|------|------|
| Button | dashboard-modal-final.html L319-341 | `Button.tsx` |
| Input | dashboard-modal-final.html L691-710 | `Input.tsx` |
| Card | dashboard-modal-final.html L354-371 | `Card.tsx` |
| Badge | dashboard-modal-final.html L400-409 | `Badge.tsx` |
| Modal | dashboard-modal-final.html L489-524 | `BottomSheet.tsx` |

### 3.3 골든 레퍼런스 검증

```markdown
## 검증 체크리스트

HeroCard.tsx 완성 후:
- [ ] 그라디언트 배경 확인 (#3182F6 → #2563eb)
- [ ] 반투명 버튼 확인 (bg-white/20)
- [ ] 목업 스크린샷과 비교
- [ ] 일치하면 다음 진행

불일치 시:
- [ ] dashboard-modal-final.html 다시 확인
- [ ] CSS 값 정확히 복사
- [ ] 수정 후 재검증
```

---

## Stage 4: 기능 구현

> **목적**: 디자인 시스템 컴포넌트만 사용하여 기능 구현

### 4.1 대시보드 (TeacherHome)

```
src/app/page.tsx
├── components/dashboard/
│   ├── HeroCard.tsx         # 그라디언트 히어로
│   ├── NoticeDropbox.tsx    # 접기/펼치기 공지
│   ├── TodoList.tsx         # 아이콘 배경색
│   └── ScheduleTimeline.tsx # 시간별 일정
```

**개발 순서:**
1. HeroCard (골든 레퍼런스)
2. ScheduleTimeline
3. TodoList
4. NoticeDropbox

### 4.2 진도 모달

```
src/components/modals/
├── ProgressModal.tsx        # 바텀시트
├── LastSessionCard.tsx      # 지난 수업 정보
└── TodaySessionForm.tsx     # 오늘 수업 폼
```

### 4.3 파일 크기 제한

| 파일 유형 | 최대 줄 수 |
|-----------|-----------|
| tokens.ts | 60줄 |
| Button.tsx | 50줄 |
| HeroCard.tsx | 100줄 |
| ProgressModal.tsx | 150줄 |
| page.tsx | 150줄 |

**위반 시**: 즉시 분리

---

## Stage 5: Supabase 연동

> **목적**: 기존 hyeyum DB 활용

### 5.1 환경 설정

```typescript
// .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### 5.2 읽기 우선 전략

```typescript
// 1단계: 읽기만
const { data: classes } = await supabase
  .from('classes')
  .select('*')
  .eq('teacher_id', teacherId);

// 2단계: 쓰기 추가
await supabase
  .from('attendance')
  .insert({ student_id, status, date });
```

### 5.3 타입 생성

```bash
# Supabase CLI로 타입 자동 생성
npx supabase gen types typescript --project-id xxx > src/types/database.ts
```

---

## 안전장치 체크리스트

### 개발 중 확인

- [ ] `bg-blue-500` 사용 안 함
- [ ] `bg-[#3182F6]` 사용함
- [ ] 히어로 카드에 그라디언트 있음
- [ ] 아이콘에 컬러 배경 있음
- [ ] 입력 요소 40px (h-10) 높이
- [ ] hyeyum 폴더 참조 안 함
- [ ] 파일 크기 제한 준수

### 빌드 전 확인

```bash
# 금지 패턴 검사
npm run validate

# 빌드
npm run build
```

---

## 실행 순서 요약

| 단계 | 작업 | 예상 시간 | 결과물 |
|------|------|----------|--------|
| **1.1** | hyeyum 기능 명세서 | 1시간 | `docs/hyeyum-features.md` |
| **1.2** | Supabase 스키마 문서화 | 30분 | `docs/supabase-schema.md` |
| **1.3** | 비즈니스 로직 정리 | 30분 | `docs/business-logic.md` |
| **2.1** | Claude 차단 확인 | 5분 | settings.local.json |
| **2.2** | PDF 파일 아카이브 | 30분 | archive/pdf-labeling/ |
| **2.3** | Next.js 초기화 | 30분 | package.json |
| **3.1** | tokens.ts | 30분 | 디자인 토큰 |
| **3.2** | 기본 컴포넌트 | 2시간 | Button, Input, Card... |
| **3.3** | HeroCard 검증 | 30분 | 골든 레퍼런스 |
| **4.1** | 대시보드 | 3시간 | TeacherHome |
| **4.2** | 진도 모달 | 2시간 | ProgressModal |
| **5** | Supabase 연동 | 2시간 | 데이터 연동 |
| | **총** | **~13시간** | |

---

## 다음 단계

**승인 시 Stage 1.1부터 시작:**

1. hyeyum 폴더에서 기능 목록 추출
2. Supabase 스키마 문서화
3. 그 후 UI 코드 완전 차단
4. 새 디자인으로 개발 시작

---

*작성: Claude Code | 2025-12-10*
*참조: 258, 259, 260번 연구 리포트*
