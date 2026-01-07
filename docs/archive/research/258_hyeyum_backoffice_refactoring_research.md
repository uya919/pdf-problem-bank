# Hyeyum 백오피스 리팩토링 연구 리포트

> 이 폴더(pdf)를 hyeyum 백오피스 메인 프로젝트로 전환

**작성일**: 2025-12-10
**핵심 변경**: PDF 라벨링 → `pdf - 복사본`으로 이관, 이 폴더는 hyeyum 백오피스 전용

---

## 1. 프로젝트 구조 변경

### 1.1 현재 상황

| 폴더 | 역할 | 상태 |
|------|------|------|
| `C:\MYCLAUDE_PROJECT\hyeyum` | 운영 중인 hyeyum | Vercel 배포, **수정 불가** |
| `C:\MYCLAUDE_PROJECT\pdf` | PDF 라벨링 도구 | 이 폴더 |
| `C:\MYCLAUDE_PROJECT\pdf - 복사본` | PDF 라벨링 복사본 | 새로 복사됨 |

### 1.2 변경 후 구조

| 폴더 | 새 역할 |
|------|---------|
| `hyeyum` | 운영 (그대로 유지) |
| `pdf` | **hyeyum 백오피스 리팩토링** ⬅️ 메인 |
| `pdf - 복사본` | PDF 라벨링 작업 계속 |

---

## 2. 폴더 정리 계획

### 2.1 유지할 것 (디자인 자산)

```
pdf/
├── docs/
│   ├── mockups/                    # 디자인 목업 ⬅️ 핵심 자산
│   │   ├── dashboard-modal-final.html
│   │   ├── progress-modal-v5-aligned.html
│   │   └── ...
│   ├── 255_ui_ux_design_system.md  # UI/UX 철학
│   └── 258_*.md                    # 이 리포트
```

### 2.2 아카이브할 것 (PDF 관련)

```
pdf/
├── backend/          # → archive/pdf-labeling/
├── frontend/         # → archive/pdf-labeling/
├── src/              # → archive/pdf-labeling/
├── dataset_root/     # → 삭제 (복사본에 있음)
└── scripts/          # → archive/pdf-labeling/
```

### 2.3 새로 생성할 것 (백오피스)

```
pdf/  (이름 변경: hyeyum-backoffice 권장)
├── CLAUDE.md                    # 새 프로젝트 가이드
├── package.json
├── tailwind.config.ts
│
├── src/
│   ├── app/                     # Next.js App Router
│   ├── components/
│   │   ├── design-system/       # 디자인 시스템
│   │   ├── dashboard/           # 대시보드
│   │   ├── modals/              # 모달
│   │   └── layout/              # 레이아웃
│   ├── hooks/
│   ├── lib/
│   └── types/
│
├── docs/
│   ├── mockups/                 # 기존 목업 유지
│   └── plan.md                  # 개발 계획
│
└── archive/
    └── pdf-labeling/            # 기존 PDF 코드 백업
```

---

## 3. Claude-Friendly 모듈화 원칙

### 3.1 파일 크기 규칙

| 분류 | 최대 줄 수 | 예시 |
|------|-----------|------|
| 디자인 토큰 | 50줄 | `tokens.ts` |
| 기본 컴포넌트 | 100줄 | `Button.tsx`, `Input.tsx` |
| 복합 컴포넌트 | 150줄 | `HeroCard.tsx`, `TodoList.tsx` |
| 페이지 | 200줄 | `page.tsx` |
| 모달 | 200줄 | `ProgressModal.tsx` |

### 3.2 디자인 시스템 구조

```
src/components/design-system/
├── tokens.ts           # 색상, 크기 상수
├── Button.tsx          # Primary, Secondary, Ghost
├── Input.tsx           # 40px 높이 통일
├── Card.tsx            # 기본 카드
├── Badge.tsx           # 상태 뱃지
├── Modal.tsx           # 바텀시트
├── Icon.tsx            # 아이콘 + 배경
└── index.ts            # 통합 export
```

### 3.3 컴포넌트 작성 규칙

```typescript
/**
 * HeroCard - 대시보드 그라디언트 히어로 카드
 *
 * 디자인 스펙:
 * - 배경: linear-gradient(135deg, #3182F6, #2563eb)
 * - 버튼: primary(white), secondary(white/20)
 *
 * @example
 * <HeroCard
 *   classInfo={{ name: "중3A반", subject: "수학", studentCount: 8 }}
 *   schedule={{ start: "17:00", end: "19:00", minutesUntil: 5 }}
 *   onAttendance={() => {}}
 *   onProgress={() => {}}
 * />
 */
export function HeroCard({ classInfo, schedule, onAttendance, onProgress }: HeroCardProps) {
  return (
    <div className="bg-gradient-to-br from-[#3182F6] to-[#2563eb] rounded-2xl p-5 text-white">
      {/* ... */}
    </div>
  );
}
```

---

## 4. 새 CLAUDE.md 설계

### 4.1 구조

```markdown
# Hyeyum 백오피스 (강사용 모바일 앱)

## 1. 프로젝트 개요
- 목적, 기술 스택, 폴더 구조

## 2. 디자인 시스템 (필수)
- 색상 토큰 (복사 가능한 코드)
- 크기 토큰 (40px 높이 등)
- Tailwind 클래스 매핑

## 3. 컴포넌트 가이드
- 각 컴포넌트 사용법
- Props 타입
- 예시 코드

## 4. 금지 패턴
- ❌ 하면 안 되는 것
- ✅ 해야 하는 것

## 5. 개발 명령어
```

### 4.2 핵심 내용: 디자인 토큰 (복사 가능)

```typescript
// src/components/design-system/tokens.ts

// === 색상 ===
export const colors = {
  // Primary
  blue: '#3182F6',
  blueDark: '#1B64DA',
  blueLight: '#F2F6FC',

  // Neutral
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

  // Semantic
  green: '#00C896',
  red: '#F04452',
  orange: '#FF9800',
} as const;

// === 아이콘 배경색 ===
export const iconBg = {
  attendance: '#E8F5E9',  // 출결 - 연두
  progress: '#E3F2FD',    // 진도 - 연파랑
  homework: '#FFF3E0',    // 숙제 - 연주황
  schedule: '#F3E5F5',    // 일정 - 연보라
} as const;

// === 크기 ===
export const sizes = {
  inputHeight: '40px',      // 모든 입력 요소
  buttonHeightLg: '48px',   // CTA 버튼
  iconSize: '36px',         // 아이콘 박스
  borderRadius: '12px',     // 기본 radius
  borderRadiusLg: '16px',   // 카드 radius
} as const;
```

### 4.3 Tailwind 클래스 매핑

```typescript
// Tailwind 클래스 (CLAUDE.md에 포함)

// 히어로 카드 그라디언트
const heroGradient = "bg-gradient-to-br from-[#3182F6] to-[#2563eb]";

// 버튼
const btnPrimary = "bg-white text-[#3182F6] font-semibold";
const btnSecondary = "bg-white/20 text-white font-semibold";
const btnCta = "h-12 bg-[#3182F6] text-white font-semibold rounded-xl";

// 입력
const inputBase = "h-10 px-3 border border-gray-200 rounded-lg text-sm";

// 아이콘 배경
const iconBgAttendance = "w-9 h-9 rounded-[10px] bg-[#E8F5E9] flex items-center justify-center";
const iconBgProgress = "w-9 h-9 rounded-[10px] bg-[#E3F2FD] flex items-center justify-center";
const iconBgHomework = "w-9 h-9 rounded-[10px] bg-[#FFF3E0] flex items-center justify-center";
```

---

## 5. 개발 단계

### Phase 0: 폴더 정리 (30분)
- [ ] PDF 관련 파일 → `archive/pdf-labeling/`
- [ ] `dataset_root/` 삭제
- [ ] 불필요한 파일 정리

### Phase 1: 프로젝트 초기화 (1시간)
- [ ] Next.js 14 설치
- [ ] Tailwind CSS 설정
- [ ] 새 CLAUDE.md 작성

### Phase 2: 디자인 시스템 (2시간)
- [ ] `tokens.ts` - 색상, 크기 상수
- [ ] `Button.tsx` - Primary, Secondary
- [ ] `Input.tsx` - 40px 높이
- [ ] `Card.tsx`, `Badge.tsx`, `Modal.tsx`

### Phase 3: 레이아웃 (1시간)
- [ ] `Header.tsx`
- [ ] `BottomNav.tsx`
- [ ] `app/layout.tsx`

### Phase 4: 대시보드 (3시간)
- [ ] `HeroCard.tsx` - 그라디언트
- [ ] `NoticeDropbox.tsx` - 접기/펼치기
- [ ] `TodoList.tsx` - 아이콘 배경색
- [ ] `ScheduleTimeline.tsx`

### Phase 5: 진도 모달 (2시간)
- [ ] `ProgressModal.tsx`
- [ ] 폼 컴포넌트들

### Phase 6: Supabase 연동 (2시간)
- [ ] 기존 hyeyum DB 스키마 확인
- [ ] 읽기 연동
- [ ] 쓰기 연동

---

## 6. Supabase 연동 전략

### 6.1 기존 hyeyum 테이블 활용

기존 Supabase 프로젝트를 그대로 사용:

```typescript
// .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### 6.2 주요 테이블 (예상)

| 테이블 | 용도 | 접근 |
|--------|------|------|
| `classes` | 반 정보 | 읽기 |
| `students` | 학생 정보 | 읽기 |
| `schedules` | 수업 일정 | 읽기/쓰기 |
| `attendance` | 출결 | 읽기/쓰기 |
| `progress` | 진도 | 읽기/쓰기 |
| `homework` | 숙제 | 읽기/쓰기 |

---

## 7. 폴더 이름 변경 고려

### Option A: 그대로 `pdf` 유지
- 장점: 폴더 이동 불필요
- 단점: 이름이 프로젝트와 맞지 않음

### Option B: `hyeyum-backoffice`로 변경 ✅ 추천
- 장점: 명확한 프로젝트 이름
- 단점: 폴더 이름 변경 필요

```bash
# 변경 방법
cd C:\MYCLAUDE_PROJECT
ren pdf hyeyum-backoffice
```

---

## 8. 실행 계획 요약

| 순서 | 작업 | 예상 시간 |
|------|------|----------|
| 1 | PDF 파일 아카이브 | 30분 |
| 2 | 폴더 이름 변경 (선택) | 5분 |
| 3 | Next.js 초기화 | 30분 |
| 4 | CLAUDE.md 작성 | 30분 |
| 5 | 디자인 시스템 구축 | 2시간 |
| 6 | 대시보드 구현 | 3시간 |
| 7 | 모달 구현 | 2시간 |
| 8 | Supabase 연동 | 2시간 |
| **총** | | **~11시간** |

---

## 9. 다음 단계

승인 시 진행:

1. **PDF 파일 아카이브**
   ```bash
   mkdir archive\pdf-labeling
   move backend archive\pdf-labeling\
   move frontend archive\pdf-labeling\
   move src archive\pdf-labeling\
   rmdir /s dataset_root
   ```

2. **Next.js 프로젝트 초기화**
   ```bash
   npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir
   ```

3. **새 CLAUDE.md 작성**
   - 디자인 토큰 포함
   - Tailwind 클래스 매핑
   - 금지 패턴 명시

---

*작성: Claude Code | 2025-12-10*
