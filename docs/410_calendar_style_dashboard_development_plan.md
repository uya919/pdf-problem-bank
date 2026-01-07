# 410. 캘린더 스타일 대시보드 단계별 개발 계획

> **작성일**: 2025-12-21
> **참조**: [409_calendar_style_card_design_research.md](./409_calendar_style_card_design_research.md)
> **목업**: [admin_dashboard_calendar_style.html](./mockups/admin_dashboard_calendar_style.html)

---

## 개요

현재 AdminDashboard의 "현재 진행 중" 섹션을 제거하고, 시간대별 카드 그리드로 수업 상세 정보를 표시하는 기능 구현.

**핵심 변경사항:**
- 구분선 → 배경색 영역 분리 (지난: grey-50, 오늘: blueLight)
- 호버 효과 → 배경색 변화 + scale 피드백
- 진도/숙제 → 책이름_페이지 형식

---

## Phase 1: ClassCard 컴포넌트 생성

### 1.1 파일 생성

**경로**: `frontend/src/components/admin/dashboard/ClassCard.tsx`

### 1.2 타입 정의

```typescript
// frontend/src/types/admin.ts에 추가

export interface ClassProgress {
  bookName: string;      // 책 이름 (쎈, 개념원리 등)
  pageStart: number;     // 시작 페이지
  pageEnd: number;       // 끝 페이지
}

export interface ClassHomework {
  bookName: string;      // 책 이름
  page: number;          // 페이지
  problemStart: number;  // 시작 문제
  problemEnd: number;    // 끝 문제
}

export interface ClassScheduleDetail {
  classId: string;
  className: string;        // 중3 심화
  teacherName: string;      // 김선생
  studentCount: number;     // 5

  // 지난 수업
  lastProgress: ClassProgress | null;
  lastHomework: ClassHomework | null;

  // 오늘 수업
  todayProgress: ClassProgress | null;
  todayHomework: ClassHomework | null;

  // 메모
  memo: string | null;
}
```

### 1.3 ClassCard 컴포넌트 구현

```typescript
// frontend/src/components/admin/dashboard/ClassCard.tsx

interface ClassCardProps {
  data: ClassScheduleDetail;
  onClick?: () => void;
}

export function ClassCard({ data, onClick }: ClassCardProps) {
  // 진도 포맷: "쎈_p.42~45"
  const formatProgress = (p: ClassProgress | null) => {
    if (!p) return '-';
    return `${p.bookName}_p.${p.pageStart}~${p.pageEnd}`;
  };

  // 숙제 포맷: "쎈_p.42 1~15번"
  const formatHomework = (h: ClassHomework | null) => {
    if (!h) return '-';
    return `${h.bookName}_p.${h.page} ${h.problemStart}~${h.problemEnd}번`;
  };

  return (
    <div
      className="bg-white rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:bg-grey-50/50 active:scale-[0.99]"
      onClick={onClick}
    >
      {/* 헤더 */}
      <div className="mb-3">
        <h3 className="text-lg font-bold text-grey-900">{data.className}</h3>
        <p className="text-sm text-grey-500">{data.teacherName} · {data.studentCount}명</p>
      </div>

      {/* 지난 수업 (회색 영역) */}
      <div className="bg-grey-50 rounded-xl p-3 mb-2">
        <div className="flex items-center gap-1.5 mb-2">
          <ChevronLeft className="w-3.5 h-3.5 text-grey-400" />
          <span className="text-xs text-grey-400 font-medium">지난 수업</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-grey-400 w-8">진도</span>
            <span className="text-sm text-grey-700">{formatProgress(data.lastProgress)}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-grey-400 w-8">숙제</span>
            <span className="text-sm text-grey-700">{formatHomework(data.lastHomework)}</span>
          </div>
        </div>
      </div>

      {/* 오늘 수업 (파랑 영역) */}
      <div className="bg-toss-blueLight rounded-xl p-3 mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <ChevronRight className="w-3.5 h-3.5 text-toss-blue" />
          <span className="text-xs text-toss-blue font-medium">오늘 수업</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-toss-blue/70 w-8">진도</span>
            <span className="text-sm text-grey-900 font-medium">{formatProgress(data.todayProgress)}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-toss-blue/70 w-8">숙제</span>
            <span className={`text-sm ${data.todayHomework ? 'text-grey-700' : 'text-grey-400'}`}>
              {formatHomework(data.todayHomework)}
            </span>
          </div>
        </div>
      </div>

      {/* 메모 */}
      {data.memo ? (
        <div className="flex items-center gap-2 text-sm text-grey-600 px-1">
          <MessageSquare className="w-4 h-4 text-grey-400 flex-shrink-0" />
          <span className="truncate">{data.memo}</span>
        </div>
      ) : (
        <div className="text-sm text-grey-400 px-1">-</div>
      )}
    </div>
  );
}
```

### 1.4 체크리스트

- [ ] `ClassProgress`, `ClassHomework`, `ClassScheduleDetail` 타입 추가
- [ ] `ClassCard.tsx` 파일 생성
- [ ] 포맷 함수 구현 (`formatProgress`, `formatHomework`)
- [ ] 호버/클릭 효과 적용
- [ ] Storybook 또는 개별 테스트

---

## Phase 2: TimeSlotSection 컴포넌트 생성

### 2.1 파일 생성

**경로**: `frontend/src/components/admin/dashboard/TimeSlotSection.tsx`

### 2.2 타입 정의

```typescript
// frontend/src/types/admin.ts에 추가

export interface TimeSlotGroup {
  startTime: string;     // "14:00"
  endTime: string;       // "16:00"
  classes: ClassScheduleDetail[];
}
```

### 2.3 TimeSlotSection 컴포넌트 구현

```typescript
// frontend/src/components/admin/dashboard/TimeSlotSection.tsx

interface TimeSlotSectionProps {
  timeSlot: TimeSlotGroup;
  onClassClick?: (classId: string) => void;
}

export function TimeSlotSection({ timeSlot, onClassClick }: TimeSlotSectionProps) {
  return (
    <section className="mb-6">
      {/* 시간대 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-toss-blue" />
          <span className="text-[15px] font-semibold text-grey-800">
            {timeSlot.startTime} ~ {timeSlot.endTime}
          </span>
        </div>
        <span className="text-sm text-grey-400">
          {timeSlot.classes.length}개 수업
        </span>
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {timeSlot.classes.map((cls) => (
          <ClassCard
            key={cls.classId}
            data={cls}
            onClick={() => onClassClick?.(cls.classId)}
          />
        ))}
      </div>
    </section>
  );
}
```

### 2.4 체크리스트

- [ ] `TimeSlotGroup` 타입 추가
- [ ] `TimeSlotSection.tsx` 파일 생성
- [ ] 반응형 그리드 설정 (1/2/3열)
- [ ] ClassCard import 확인

---

## Phase 3: useClassScheduleDetail 훅 생성

### 3.1 파일 생성

**경로**: `frontend/src/hooks/useClassScheduleDetail.ts`

### 3.2 데이터 구조 분석

현재 Supabase 테이블:
- `classes`: 반 정보
- `class_records`: 수업 기록 (진도, 숙제, 메모)
- `profiles`: 강사 정보

### 3.3 훅 구현

```typescript
// frontend/src/hooks/useClassScheduleDetail.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TimeSlotGroup, ClassScheduleDetail } from '../types/admin';

interface UseClassScheduleDetailOptions {
  date: string;           // "2025-12-20"
  subject?: string;       // "math" | "english" | "korean"
}

export function useClassScheduleDetail({ date, subject }: UseClassScheduleDetailOptions) {
  return useQuery({
    queryKey: ['classScheduleDetail', date, subject],
    queryFn: async (): Promise<TimeSlotGroup[]> => {
      // 1. 해당 날짜, 과목의 수업 조회
      let query = supabase
        .from('classes')
        .select(`
          id,
          name,
          start_time,
          end_time,
          subject,
          teacher:profiles(name),
          students:class_students(count)
        `)
        .contains('days_of_week', [getDayOfWeek(date)]);

      if (subject && subject !== 'all') {
        query = query.eq('subject', subject);
      }

      const { data: classes, error } = await query;
      if (error) throw error;

      // 2. 각 수업의 최근 기록 조회 (지난 수업, 오늘 수업)
      const classesWithRecords = await Promise.all(
        classes.map(async (cls) => {
          // 지난 수업 기록
          const { data: lastRecord } = await supabase
            .from('class_records')
            .select('*')
            .eq('class_id', cls.id)
            .lt('date', date)
            .order('date', { ascending: false })
            .limit(1)
            .single();

          // 오늘 수업 기록
          const { data: todayRecord } = await supabase
            .from('class_records')
            .select('*')
            .eq('class_id', cls.id)
            .eq('date', date)
            .single();

          return {
            classId: cls.id,
            className: cls.name,
            teacherName: cls.teacher?.name || '-',
            studentCount: cls.students?.[0]?.count || 0,
            startTime: cls.start_time,
            lastProgress: parseProgress(lastRecord?.progress),
            lastHomework: parseHomework(lastRecord?.homework),
            todayProgress: parseProgress(todayRecord?.progress),
            todayHomework: parseHomework(todayRecord?.homework),
            memo: todayRecord?.memo || lastRecord?.memo || null,
          };
        })
      );

      // 3. 시간대별 그룹핑
      return groupByTimeSlot(classesWithRecords);
    },
    staleTime: 1000 * 60 * 5, // 5분
  });
}

// 헬퍼 함수
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay();
}

function parseProgress(progressStr: string | null): ClassProgress | null {
  if (!progressStr) return null;
  // "쎈_p.42~45" 파싱
  const match = progressStr.match(/(.+)_p\.(\d+)~(\d+)/);
  if (!match) return null;
  return {
    bookName: match[1],
    pageStart: parseInt(match[2]),
    pageEnd: parseInt(match[3]),
  };
}

function parseHomework(homeworkStr: string | null): ClassHomework | null {
  if (!homeworkStr) return null;
  // "쎈_p.42 1~15번" 파싱
  const match = homeworkStr.match(/(.+)_p\.(\d+)\s+(\d+)~(\d+)번/);
  if (!match) return null;
  return {
    bookName: match[1],
    page: parseInt(match[2]),
    problemStart: parseInt(match[3]),
    problemEnd: parseInt(match[4]),
  };
}

function groupByTimeSlot(classes: (ClassScheduleDetail & { startTime: string })[]): TimeSlotGroup[] {
  const groups = new Map<string, ClassScheduleDetail[]>();

  classes.forEach((cls) => {
    const key = cls.startTime;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(cls);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([startTime, classes]) => ({
      startTime,
      endTime: addHours(startTime, 2), // 2시간 후
      classes,
    }));
}

function addHours(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number);
  return `${String(h + hours).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
```

### 3.4 체크리스트

- [ ] `useClassScheduleDetail.ts` 파일 생성
- [ ] Supabase 쿼리 작성
- [ ] 파싱 함수 구현
- [ ] 시간대 그룹핑 로직
- [ ] 에러 핸들링

---

## Phase 4: AdminDashboard 수정

### 4.1 수정 파일

**경로**: `frontend/src/pages/admin/AdminDashboard.tsx`

### 4.2 변경 사항

1. "현재 진행 중인 수업" 섹션 제거
2. 기존 `scheduleGroups` 대신 `useClassScheduleDetail` 사용
3. `TimeSlotSection` 컴포넌트로 렌더링

### 4.3 수정 코드

```typescript
// AdminDashboard.tsx 수정 부분

import { TimeSlotSection } from '../../components/admin/dashboard/TimeSlotSection';
import { useClassScheduleDetail } from '../../hooks/useClassScheduleDetail';

export default function AdminDashboard() {
  // ... 기존 상태 ...

  // 새로운 훅 사용
  const { data: timeSlots, isLoading: detailLoading } = useClassScheduleDetail({
    date: selectedDate,
    subject: globalSubject === 'all' ? undefined : globalSubject,
  });

  // ... 캘린더 렌더링 ...

  return (
    <div>
      {/* 헤더 */}
      {/* 캘린더 */}

      {/* 날짜 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-grey-900">
          {formatDateLabel(selectedDate)} {getSubjectLabel(globalSubject)} 수업
        </h2>
        <span className="text-sm text-grey-500">
          총 {timeSlots?.reduce((acc, ts) => acc + ts.classes.length, 0) || 0}개 수업
        </span>
      </div>

      {/* 시간대별 카드 그리드 */}
      {detailLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : timeSlots && timeSlots.length > 0 ? (
        timeSlots.map((slot) => (
          <TimeSlotSection
            key={slot.startTime}
            timeSlot={slot}
            onClassClick={(classId) => navigate(`/admin/class/${classId}`)}
          />
        ))
      ) : (
        <div className="text-center py-12 text-grey-500">
          해당 날짜에 수업이 없습니다
        </div>
      )}
    </div>
  );
}
```

### 4.4 삭제할 코드

- `CurrentClassCard` 관련 import 및 렌더링
- 기존 `scheduleGroups` 관련 코드 (필요시)

### 4.5 체크리스트

- [ ] "현재 진행 중인 수업" 섹션 제거
- [ ] `useClassScheduleDetail` 훅 연결
- [ ] `TimeSlotSection` 렌더링
- [ ] 로딩/빈 상태 처리
- [ ] 카드 클릭 시 상세 페이지 이동

---

## Phase 5: Mock 데이터 및 테스트

### 5.1 Mock 데이터 생성

Supabase 연동 전 테스트를 위한 Mock 데이터:

```typescript
// frontend/src/mocks/classScheduleDetail.ts

export const MOCK_TIME_SLOTS: TimeSlotGroup[] = [
  {
    startTime: '14:00',
    endTime: '16:00',
    classes: [
      {
        classId: 'cls-1',
        className: '중3 심화',
        teacherName: '김선생',
        studentCount: 5,
        lastProgress: { bookName: '쎈', pageStart: 42, pageEnd: 45 },
        lastHomework: { bookName: '쎈', page: 42, problemStart: 1, problemEnd: 15 },
        todayProgress: { bookName: '쎈', pageStart: 46, pageEnd: 50 },
        todayHomework: null,
        memo: '이차함수 개념 복습 필요',
      },
      // ... 더 많은 수업
    ],
  },
  // ... 더 많은 시간대
];
```

### 5.2 테스트 체크리스트

- [ ] 카드 렌더링 확인
- [ ] 호버/클릭 효과 확인
- [ ] 반응형 그리드 (1/2/3열) 확인
- [ ] 빈 데이터 처리 확인
- [ ] 날짜 변경 시 데이터 갱신 확인

---

## Phase 6: 스타일 미세 조정

### 6.1 Tailwind 설정 확인

`tailwind.config.js`에 필요한 설정이 있는지 확인:

```javascript
// 이미 존재하는지 확인
colors: {
  toss: {
    blueLight: '#E8F3FF',
  },
  grey: {
    50: '#F9FAFB',
  },
}
```

### 6.2 추가 CSS (필요시)

```css
/* index.css에 추가 (필요시) */

/* 카드 호버 시 부드러운 배경 전환 */
.class-card {
  @apply transition-all duration-200;
}

/* 스케일 피드백 */
.class-card:active {
  @apply scale-[0.99];
}
```

### 6.3 체크리스트

- [ ] 색상 토큰 확인
- [ ] 애니메이션 동작 확인
- [ ] 폰트 크기 일관성 확인

---

## 파일 생성/수정 순서

1. `frontend/src/types/admin.ts` - 타입 추가
2. `frontend/src/components/admin/dashboard/ClassCard.tsx` - 새 파일
3. `frontend/src/components/admin/dashboard/TimeSlotSection.tsx` - 새 파일
4. `frontend/src/components/admin/dashboard/index.ts` - export 추가
5. `frontend/src/mocks/classScheduleDetail.ts` - Mock 데이터 (테스트용)
6. `frontend/src/hooks/useClassScheduleDetail.ts` - 새 파일
7. `frontend/src/pages/admin/AdminDashboard.tsx` - 수정

---

## 예상 에러 및 해결책

| 에러 | 원인 | 해결책 |
|------|------|--------|
| `ClassProgress` type not found | 타입 미정의 | Phase 1에서 types/admin.ts에 추가 |
| ChevronLeft import error | lucide-react 미설치 | 이미 설치됨, import 경로 확인 |
| Supabase query error | 테이블/컬럼명 불일치 | 실제 스키마 확인 후 수정 |
| 빈 화면 | Mock fallback 미적용 | `data \|\| MOCK_TIME_SLOTS` 사용 |

---

## 완료 조건

- [ ] 목업과 동일한 UI 렌더링
- [ ] 날짜 선택 시 해당 날짜 수업 표시
- [ ] 과목 필터 동작
- [ ] 호버/클릭 효과 정상 동작
- [ ] 반응형 레이아웃 (모바일/태블릿/PC)
- [ ] 빌드 에러 없음

---

*개발 계획 완료 - Phase별 진행 요청 시 구현 시작*
