# 397. 순환수업 시스템 단계별 개발 계획

> 작성일: 2025-12-19
> 기반: [396_rotation_class_system_research.md](./396_rotation_class_system_research.md)
> 목업: [rotation_class_management.html](./mockups/rotation_class_management.html)

---

## 1. 개발 범위 요약

### 1.1 목표
- 3주 주기 순환수업 시스템 구현
- 학년별 활동 패턴 관리 (영어수업, 수학수업, 수학Test)
- 휴일 시 이월 처리 기능
- 관리자 설정 UI (4개 탭)

### 1.2 핵심 기능
| 기능 | 우선순위 | 설명 |
|------|---------|------|
| 순환 패턴 정의 | 필수 | 주차별 학년-활동 매핑 |
| 주차 계산 알고리즘 | 필수 | 휴일 이월 반영 |
| 일정 미리보기 | 필수 | 향후 순환수업 일정 표시 |
| 휴일/예외 관리 | 필수 | 휴일 등록, 이월/스킵 설정 |
| 기본 설정 | 필수 | 요일, 시간, 주기, 대상학년 |
| 대시보드 통합 | 선택 | 오늘의 순환수업 카드 |

---

## 2. 기술 스택 및 의존성

### 2.1 사용 기술
```
Frontend: React + TypeScript + TanStack Query
Backend: Supabase (PostgreSQL + RLS)
상태관리: Zustand (필요시)
스타일: Tailwind CSS (기존 디자인 시스템)
```

### 2.2 기존 코드 재사용
| 파일 | 재사용 항목 |
|------|------------|
| `hooks/useClasses.ts` | 쿼리 패턴, 캐시 키 구조 |
| `api/classes.ts` | Supabase 호출 패턴 |
| `components/admin/classes/` | 모달, 폼 UI 컴포넌트 |
| `lib/supabase.ts` | Supabase 클라이언트 |

### 2.3 필요 환경변수
```
기존 .env.local 사용 (추가 불필요)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
```

---

## 3. DB 스키마 설계

### 3.1 테이블 정의

```sql
-- =============================================
-- 1. rotation_schedules: 순환수업 정의
-- =============================================
CREATE TABLE rotation_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,              -- "수요일 순환수업"
  day_of_week INTEGER NOT NULL,            -- 3 (수요일, 0=일요일)
  start_time TIME NOT NULL,                -- '17:00'
  end_time TIME NOT NULL,                  -- '18:30'
  cycle_weeks INTEGER NOT NULL DEFAULT 3,  -- 순환 주기
  start_date DATE NOT NULL,                -- 1주차 기준일
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. rotation_patterns: 순환 패턴 (주차-학년-활동)
-- =============================================
CREATE TABLE rotation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_schedule_id UUID NOT NULL
    REFERENCES rotation_schedules(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,            -- 1, 2, 3
  grade_id UUID NOT NULL
    REFERENCES grades(id),                 -- 중1, 중2, 중3
  activity_type VARCHAR(50) NOT NULL,      -- 'english_class', 'math_class', 'math_test'
  activity_name VARCHAR(100) NOT NULL,     -- '영어 수업', '수학 수업', '수학 Test'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(rotation_schedule_id, week_number, grade_id)
);

-- =============================================
-- 3. rotation_exceptions: 휴일/예외 관리
-- =============================================
CREATE TABLE rotation_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_schedule_id UUID NOT NULL
    REFERENCES rotation_schedules(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,            -- 휴일 날짜
  reason VARCHAR(200) NOT NULL,            -- '신정', '설날 연휴'
  action_type VARCHAR(20) NOT NULL,        -- 'carry_over' | 'skip'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(rotation_schedule_id, exception_date)
);

-- =============================================
-- 4. rotation_target_grades: 대상 학년
-- =============================================
CREATE TABLE rotation_target_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotation_schedule_id UUID NOT NULL
    REFERENCES rotation_schedules(id) ON DELETE CASCADE,
  grade_id UUID NOT NULL
    REFERENCES grades(id),

  UNIQUE(rotation_schedule_id, grade_id)
);
```

### 3.2 RLS 정책

```sql
-- rotation_schedules: 모든 인증 사용자 읽기, 관리자만 쓰기
ALTER TABLE rotation_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rotation_schedules_read" ON rotation_schedules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rotation_schedules_write" ON rotation_schedules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- 다른 테이블도 동일 패턴 적용
```

### 3.3 인덱스

```sql
CREATE INDEX idx_rotation_patterns_schedule
  ON rotation_patterns(rotation_schedule_id);

CREATE INDEX idx_rotation_exceptions_date
  ON rotation_exceptions(rotation_schedule_id, exception_date);
```

---

## 4. 타입 정의

### 4.1 TypeScript 인터페이스

```typescript
// frontend/src/types/rotation.ts

/** 순환수업 정의 */
export interface RotationSchedule {
  id: string;
  name: string;
  day_of_week: number;  // 0-6 (0=일요일)
  start_time: string;   // 'HH:MM'
  end_time: string;
  cycle_weeks: number;
  start_date: string;   // 'YYYY-MM-DD'
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** 순환 패턴 (주차-학년-활동 매핑) */
export interface RotationPattern {
  id: string;
  rotation_schedule_id: string;
  week_number: number;
  grade_id: string;
  activity_type: 'english_class' | 'math_class' | 'math_test';
  activity_name: string;
  // Join 결과
  grades?: { id: string; name: string };
}

/** 휴일/예외 */
export interface RotationException {
  id: string;
  rotation_schedule_id: string;
  exception_date: string;
  reason: string;
  action_type: 'carry_over' | 'skip';
}

/** 대상 학년 */
export interface RotationTargetGrade {
  id: string;
  rotation_schedule_id: string;
  grade_id: string;
  grades?: { id: string; name: string };
}

/** 특정 날짜의 순환수업 활동 (계산 결과) */
export interface RotationActivity {
  date: string;
  week_number: number;
  is_carried_over: boolean;  // 이월된 주차인지
  activities: {
    grade_id: string;
    grade_name: string;
    activity_type: string;
    activity_name: string;
  }[];
}

/** 활동 유형 옵션 */
export const ACTIVITY_TYPES = {
  english_class: { label: '영어 수업', color: 'emerald' },
  math_class: { label: '수학 수업', color: 'blue' },
  math_test: { label: '수학 Test', color: 'amber' },
} as const;
```

---

## 5. 파일 생성 순서

### 5.1 의존성 그래프

```
types/rotation.ts (타입 정의)
    ↓
api/rotation.ts (API 함수)
    ↓
hooks/useRotation.ts (React Query 훅)
    ↓
utils/rotationUtils.ts (주차 계산 유틸리티)
    ↓
components/admin/rotation/ (컴포넌트)
    ├── RotationSchedulePreview.tsx
    ├── RotationPatternEditor.tsx
    ├── RotationExceptionManager.tsx
    ├── RotationSettings.tsx
    └── index.ts
    ↓
pages/admin/RotationManagement.tsx (페이지)
    ↓
App.tsx 라우팅 추가
```

---

## 6. Phase별 개발 계획

### Phase 1: 인프라 구축

**목표**: DB 스키마 + 타입 + API 함수

**파일 생성 순서**:
1. `supabase/migrations/20251219_rotation_tables.sql`
2. `frontend/src/types/rotation.ts`
3. `frontend/src/api/rotation.ts`

**상세 작업**:

```typescript
// api/rotation.ts - 핵심 함수

/** 순환수업 목록 조회 */
export async function getRotationSchedules(): Promise<RotationSchedule[]>

/** 순환수업 상세 조회 (패턴, 예외, 대상학년 포함) */
export async function getRotationSchedule(id: string): Promise<{
  schedule: RotationSchedule;
  patterns: RotationPattern[];
  exceptions: RotationException[];
  targetGrades: RotationTargetGrade[];
}>

/** 순환수업 생성 */
export async function createRotationSchedule(input: CreateRotationInput): Promise<RotationSchedule>

/** 순환수업 수정 */
export async function updateRotationSchedule(id: string, input: UpdateRotationInput): Promise<void>

/** 패턴 일괄 저장 */
export async function saveRotationPatterns(
  scheduleId: string,
  patterns: Omit<RotationPattern, 'id' | 'rotation_schedule_id'>[]
): Promise<void>

/** 예외 추가 */
export async function addRotationException(input: CreateExceptionInput): Promise<RotationException>

/** 예외 삭제 */
export async function deleteRotationException(id: string): Promise<void>
```

**테스트 체크리스트**:
- [ ] Supabase 콘솔에서 테이블 생성 확인
- [ ] RLS 정책 동작 확인 (관리자만 쓰기)
- [ ] 타입 컴파일 에러 없음

---

### Phase 2: 주차 계산 유틸리티

**목표**: 휴일 이월을 반영한 주차 계산 로직

**파일**:
- `frontend/src/utils/rotationUtils.ts`

**핵심 알고리즘**:

```typescript
// rotationUtils.ts

/**
 * 특정 날짜의 실제 주차 계산 (휴일 이월 반영)
 *
 * @param date - 확인할 날짜
 * @param startDate - 1주차 기준일
 * @param cycleWeeks - 순환 주기 (기본 3)
 * @param exceptions - 휴일 목록
 * @returns { weekNumber, isCarriedOver }
 */
export function getRotationWeekWithExceptions(
  date: Date,
  startDate: Date,
  cycleWeeks: number,
  exceptions: RotationException[]
): { weekNumber: number; isCarriedOver: boolean }

/**
 * 향후 N주 순환수업 일정 생성
 *
 * @param schedule - 순환수업 설정
 * @param patterns - 패턴 목록
 * @param exceptions - 예외 목록
 * @param weeks - 생성할 주 수
 * @returns RotationActivity[]
 */
export function generateRotationSchedule(
  schedule: RotationSchedule,
  patterns: RotationPattern[],
  exceptions: RotationException[],
  weeks: number = 12
): RotationActivity[]

/**
 * 특정 날짜가 순환수업 요일인지 확인
 */
export function isRotationDay(date: Date, dayOfWeek: number): boolean

/**
 * 다음 순환수업 날짜 계산
 */
export function getNextRotationDate(
  fromDate: Date,
  dayOfWeek: number
): Date
```

**이월 로직 상세**:

```typescript
// 이월 처리 예시
// 1/1(수) 휴일, action='carry_over' 인 경우:
//
// 원래 스케줄:
//   12/18 → 1주차
//   12/25 → 2주차
//   1/1   → 3주차 (휴일)
//   1/8   → 1주차
//
// 이월 후:
//   12/18 → 1주차
//   12/25 → 2주차
//   1/1   → 휴일 (스킵)
//   1/8   → 3주차 (이월됨)
//   1/15  → 1주차
```

**테스트 체크리스트**:
- [ ] 기본 주차 계산 정확성
- [ ] 휴일 carry_over 시 주차 밀림 확인
- [ ] 휴일 skip 시 주차 유지 확인
- [ ] 여러 연속 휴일 처리

---

### Phase 3: React Query 훅

**목표**: 데이터 조회/수정 훅 구현

**파일**:
- `frontend/src/hooks/useRotation.ts`

**훅 목록**:

```typescript
// useRotation.ts

/** 순환수업 목록 조회 */
export function useRotationSchedules()

/** 순환수업 상세 조회 */
export function useRotationSchedule(id: string | null)

/** 순환수업 생성 */
export function useCreateRotationSchedule()

/** 순환수업 수정 */
export function useUpdateRotationSchedule()

/** 순환수업 삭제 */
export function useDeleteRotationSchedule()

/** 패턴 일괄 저장 */
export function useSaveRotationPatterns()

/** 예외 추가 */
export function useAddRotationException()

/** 예외 삭제 */
export function useDeleteRotationException()

/** 계산된 일정 조회 (커스텀 훅) */
export function useRotationActivities(scheduleId: string | null, weeks?: number)
```

**쿼리 키 구조**:

```typescript
const rotationKeys = {
  all: ['rotation'] as const,
  schedules: () => [...rotationKeys.all, 'schedules'] as const,
  schedule: (id: string) => [...rotationKeys.all, 'schedule', id] as const,
  activities: (id: string, weeks: number) =>
    [...rotationKeys.all, 'activities', id, weeks] as const,
};
```

**테스트 체크리스트**:
- [ ] CRUD 동작 확인
- [ ] 캐시 무효화 정상 동작
- [ ] 로딩/에러 상태 처리

---

### Phase 4: UI 컴포넌트 - 일정 미리보기 탭

**목표**: 목업의 "일정 미리보기" 탭 구현

**파일**:
- `frontend/src/components/admin/rotation/RotationSchedulePreview.tsx`

**Props 인터페이스**:

```typescript
interface RotationSchedulePreviewProps {
  scheduleId: string;
}
```

**UI 구성**:
1. 이번 주 순환수업 하이라이트 (파란 배경)
2. 학년별 활동 카드 (중1/중2/중3)
3. 향후 일정 리스트 (휴일 표시, 이월 표시)

**예상 에러 케이스**:
- 순환수업이 없는 경우 → 빈 상태 UI
- 패턴이 설정되지 않은 경우 → 경고 메시지

---

### Phase 5: UI 컴포넌트 - 패턴 설정 탭

**목표**: 목업의 "순환 패턴 설정" 탭 구현

**파일**:
- `frontend/src/components/admin/rotation/RotationPatternEditor.tsx`

**Props 인터페이스**:

```typescript
interface RotationPatternEditorProps {
  scheduleId: string;
  cycleWeeks: number;
  targetGradeIds: string[];
  patterns: RotationPattern[];
  onSave: (patterns: RotationPattern[]) => void;
  isSaving: boolean;
}
```

**UI 구성**:
1. 그리드 테이블 (행: 주차, 열: 학년)
2. 각 셀에 활동 유형 Select
3. 활동별 색상 표시
4. 주차 추가/삭제 버튼

**상태 관리**:
```typescript
const [editedPatterns, setEditedPatterns] = useState<PatternGrid>({});
// { '1-gradeId1': 'english_class', '1-gradeId2': 'math_test', ... }
```

---

### Phase 6: UI 컴포넌트 - 휴일/예외 관리 탭

**목표**: 목업의 "휴일/예외 관리" 탭 구현

**파일**:
- `frontend/src/components/admin/rotation/RotationExceptionManager.tsx`

**Props 인터페이스**:

```typescript
interface RotationExceptionManagerProps {
  scheduleId: string;
  exceptions: RotationException[];
  onAdd: (input: CreateExceptionInput) => void;
  onDelete: (id: string) => void;
  isAdding: boolean;
}
```

**UI 구성**:
1. 휴일 추가 폼 (날짜, 사유, 이월/스킵 선택)
2. 등록된 휴일 목록 (삭제 버튼)
3. 이월 규칙 설명 박스

---

### Phase 7: UI 컴포넌트 - 기본 설정 탭

**목표**: 목업의 "기본 설정" 탭 구현

**파일**:
- `frontend/src/components/admin/rotation/RotationSettings.tsx`

**Props 인터페이스**:

```typescript
interface RotationSettingsProps {
  schedule: RotationSchedule;
  targetGradeIds: string[];
  onSave: (input: UpdateRotationInput) => void;
  onDelete: () => void;
  isSaving: boolean;
}
```

**UI 구성**:
1. 순환수업 이름 입력
2. 요일 선택 (버튼 그룹)
3. 시간 입력 (시작/종료)
4. 순환 주기 선택 (2주/3주/4주)
5. 시작 기준일
6. 대상 학년 체크박스
7. 활성화 토글
8. 삭제 버튼 (위험 영역)

---

### Phase 8: 메인 페이지 및 라우팅

**목표**: 순환수업 관리 페이지 통합

**파일**:
- `frontend/src/pages/admin/RotationManagement.tsx`
- `frontend/src/App.tsx` (라우팅 추가)

**페이지 구조**:

```typescript
function RotationManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const { data: schedule } = useRotationSchedule(scheduleId);

  return (
    <AdminLayout>
      <Header title="순환수업 관리" />
      <TabNavigation
        tabs={['schedule', 'pattern', 'exception', 'settings']}
        active={activeTab}
        onChange={setActiveTab}
      />
      <TabContent>
        {activeTab === 'schedule' && <RotationSchedulePreview />}
        {activeTab === 'pattern' && <RotationPatternEditor />}
        {activeTab === 'exception' && <RotationExceptionManager />}
        {activeTab === 'settings' && <RotationSettings />}
      </TabContent>
    </AdminLayout>
  );
}
```

**라우팅**:
```typescript
// App.tsx
<Route path="/admin/rotation" element={<RotationManagement />} />
```

**테스트 체크리스트**:
- [ ] 모든 탭 전환 동작
- [ ] 데이터 로드 및 저장
- [ ] 반응형 (모바일/PC)
- [ ] 에러 핸들링

---

### Phase 9: 사이드바 메뉴 추가

**목표**: 관리자 사이드바에 순환수업 메뉴 추가

**수정 파일**:
- `frontend/src/components/admin/layout/AdminSidebar.tsx`

**추가 메뉴**:
```typescript
{
  label: '순환수업',
  path: '/admin/rotation',
  icon: RefreshIcon,
}
```

---

### Phase 10 (선택): 대시보드 통합

**목표**: 강사 대시보드에 오늘 순환수업 표시

**파일**:
- `frontend/src/components/backoffice/TodayRotationCard.tsx`
- 대시보드 페이지 수정

**UI**:
- 오늘이 순환수업 요일이면 카드 표시
- 학년별 활동, 참여 학생 수 표시

---

## 7. 에러 케이스 및 대응

### 7.1 예상 에러

| 에러 | 원인 | 대응 |
|------|------|------|
| RLS 권한 오류 | 비관리자가 수정 시도 | 프론트에서 역할 확인 후 버튼 숨김 |
| 중복 패턴 | 같은 주차-학년에 중복 저장 | UNIQUE 제약조건, 프론트 검증 |
| 무한 루프 | 모든 날짜가 휴일인 경우 | 최대 반복 횟수 제한 (52주) |
| 빈 패턴 | 패턴 없이 일정 조회 | 빈 상태 UI 표시 |

### 7.2 타입 불일치 예방

```typescript
// API 응답 타입 명시
const { data, error } = await supabase
  .from('rotation_schedules')
  .select('*')
  .returns<RotationSchedule[]>();
```

---

## 8. 테스트 계획

### 8.1 Phase별 테스트

| Phase | 테스트 항목 |
|-------|-----------|
| 1 | SQL 실행, API 호출 |
| 2 | 주차 계산 단위 테스트 |
| 3 | 훅 동작, 캐시 무효화 |
| 4-7 | 컴포넌트 렌더링, 사용자 인터랙션 |
| 8-9 | E2E 플로우 |

### 8.2 시나리오 테스트

1. **기본 플로우**
   - 순환수업 생성 → 패턴 설정 → 일정 확인

2. **휴일 이월**
   - 휴일 추가 → 이월 선택 → 일정 변경 확인

3. **패턴 변경**
   - 기존 패턴 수정 → 저장 → 일정 재계산

---

## 9. 개발 순서 요약

```
Phase 1: DB + 타입 + API (필수)
    ↓
Phase 2: 주차 계산 유틸리티 (필수)
    ↓
Phase 3: React Query 훅 (필수)
    ↓
Phase 4: 일정 미리보기 UI (필수)
    ↓
Phase 5: 패턴 설정 UI (필수)
    ↓
Phase 6: 휴일/예외 관리 UI (필수)
    ↓
Phase 7: 기본 설정 UI (필수)
    ↓
Phase 8: 메인 페이지 + 라우팅 (필수)
    ↓
Phase 9: 사이드바 메뉴 (필수)
    ↓
Phase 10: 대시보드 통합 (선택)
```

---

## 10. 참고

### 10.1 관련 문서
- [396_rotation_class_system_research.md](./396_rotation_class_system_research.md)
- [목업 HTML](./mockups/rotation_class_management.html)

### 10.2 기존 코드 참조
- `hooks/useClasses.ts` - 쿼리 패턴
- `api/classes.ts` - API 구조
- `components/admin/classes/EditClassModal.tsx` - 탭 UI

---

*작성: Claude Code*
*버전: 1.0*
