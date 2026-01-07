# Stage 5: Timetable Studio 재설계 - 상세 개발 계획

**작성일**: 2025-12-22
**목표**: Mock UI 상태의 Timetable Studio를 토스 스타일 구조화된 시간표 편집기로 재설계

---

## 1. 현재 상태 분석

### 1.1 기존 구현 위치
```
frontend/src/pages/admin/OperationsPage.tsx
├── TimetableStudioView (lines 206-323)
├── ToolButton, ToolGroup (lines 362-380)
├── StickyNote (lines 383-410)
├── TimetableWidget (lines 412-456)
├── CalculatorWidget (lines 458-492)
└── MeetingNoteWidget (lines 494-524)
```

### 1.2 현재 기능 (Mock Only)
| 항목 | 상태 | 설명 |
|------|------|------|
| 캔버스 UI | Mock | 점 패턴 배경, 600px 고정 높이 |
| 툴바 | Mock | 선택/포스트잇/표/계산기/그리기 버튼 (동작 없음) |
| 포스트잇 | Mock | 4개 하드코딩 (노랑/파랑/핑크/초록) |
| 시간표 위젯 | Mock | 주간 시간표 예시 (하드코딩) |
| 계산기 위젯 | Mock | 수강료 계산 예시 |
| 회의록 위젯 | Mock | 운영 회의록 예시 |
| 저장/불러오기 | 없음 | 버튼만 존재, 동작 없음 |

### 1.3 재설계 이유
1. **복잡한 캔버스 방식** → 학원 시간표에 과도한 자유도
2. **실용성 부족** → 실제 시간표 편집 불가
3. **데이터 미연결** → Supabase 연동 없음

---

## 2. 재설계 컨셉

### 2.1 핵심 변경
| 기존 | 변경 |
|------|------|
| FigmaJam 무한 캔버스 | 구조화된 시간표 그리드 |
| 자유 배치 위젯 | 시간 슬롯 기반 할당 |
| 시각적 메모 중심 | 실제 시간표 편집 기능 |

### 2.2 새로운 기능 구조
```
TimetableStudioPage
├── 시나리오 관리 (상단 탭)
│   ├── 시나리오 목록 (정규, 방학, 시험 등)
│   └── 새 시나리오 생성
├── 시간표 그리드 (메인)
│   ├── Y축: 시간대 (10:00 ~ 22:00)
│   ├── X축: 요일 (월~토)
│   └── 셀: 반 배정 (드래그&드롭)
├── 반/강사 팔레트 (우측 패널)
│   ├── 반 목록 (색상 코드)
│   ├── 강사 목록
│   └── 필터 (학년/과목)
└── 비교 뷰 (선택적)
    └── 2개 시나리오 나란히 표시
```

### 2.3 사용 시나리오
1. **정규 시간표 작성**: 학기 시작 전 시간표 계획
2. **방학 시간표 계획**: 특강/집중반 시간표
3. **대안 비교**: A안 vs B안 시각적 비교
4. **시간표 확정**: 시나리오 → 실제 반 시간표로 적용

---

## 3. 데이터 모델

### 3.1 Supabase 테이블 설계

```sql
-- 시나리오 (시간표 버전)
CREATE TABLE timetable_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- "2025 1학기", "겨울방학 특강"
  type TEXT DEFAULT 'regular',     -- regular, vacation, exam, draft
  is_active BOOLEAN DEFAULT true,
  start_date DATE,                 -- 적용 시작일
  end_date DATE,                   -- 적용 종료일
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 시간표 슬롯 (시간대별 반 배정)
CREATE TABLE timetable_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES timetable_scenarios(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES teachers(id),
  day_of_week INT NOT NULL,        -- 0=월, 1=화, ..., 5=토
  start_time TIME NOT NULL,        -- 시작 시간
  end_time TIME NOT NULL,          -- 종료 시간
  room TEXT,                       -- 강의실 (선택)
  note TEXT,                       -- 메모
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(scenario_id, day_of_week, start_time, class_id)
);

-- RLS 정책
ALTER TABLE timetable_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자 조회 가능
CREATE POLICY "scenarios_select" ON timetable_scenarios
  FOR SELECT TO authenticated USING (true);

-- admin/owner만 생성/수정/삭제
CREATE POLICY "scenarios_insert" ON timetable_scenarios
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "scenarios_update" ON timetable_scenarios
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "scenarios_delete" ON timetable_scenarios
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner')
  );

-- slots도 동일 정책 적용
CREATE POLICY "slots_select" ON timetable_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "slots_insert" ON timetable_slots
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "slots_update" ON timetable_slots
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );

CREATE POLICY "slots_delete" ON timetable_slots
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
  );
```

### 3.2 TypeScript 타입

```typescript
// types/timetable.ts

export type ScenarioType = 'regular' | 'vacation' | 'exam' | 'draft';

export interface TimetableScenario {
  id: string;
  name: string;
  type: ScenarioType;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableSlot {
  id: string;
  scenarioId: string;
  classId: string;
  teacherId: string;
  dayOfWeek: number;  // 0-5 (월-토)
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  room: string | null;
  note: string | null;

  // JOIN 데이터 (조회 시)
  className?: string;
  classColor?: string;
  teacherName?: string;
}

export interface TimeSlotPosition {
  dayOfWeek: number;
  startTime: string;
}

export interface DragItem {
  type: 'class' | 'slot';
  classId?: string;
  slotId?: string;
}
```

---

## 4. Phase 목록

### Phase 5-A: 기반 설정 + 타입 정의
**목표**: 테이블 생성, 타입, API 기본 구조

| 작업 | 파일 | 설명 |
|------|------|------|
| Migration | Supabase | timetable_scenarios, timetable_slots 테이블 |
| 타입 | types/timetable.ts | TimetableScenario, TimetableSlot |
| API | api/timetable.ts | CRUD 함수 |
| 훅 | hooks/useTimetable.ts | useScenarios, useSlots |

**예상 소요**: 1시간

---

### Phase 5-B: 시나리오 관리 UI
**목표**: 시나리오 목록 + 생성/수정/삭제

| 작업 | 파일 | 설명 |
|------|------|------|
| 목록 컴포넌트 | components/timetable/ScenarioList.tsx | 카드형 목록 |
| 생성 모달 | components/timetable/CreateScenarioModal.tsx | 이름, 유형, 기간 입력 |
| 탭 네비게이션 | components/timetable/ScenarioTabs.tsx | 시나리오 탭 전환 |

**UI 스펙**:
```
┌─────────────────────────────────────────────────────┐
│  📐 Timetable Studio                    [+ 새 시나리오] │
├─────────────────────────────────────────────────────┤
│  [정규 1학기] [방학 특강] [시험기간] [+ 새로 만들기]      │
└─────────────────────────────────────────────────────┘
```

**예상 소요**: 1.5시간

---

### Phase 5-C: 단일 시간표 그리드
**목표**: 주간 시간표 그리드 표시

| 작업 | 파일 | 설명 |
|------|------|------|
| 그리드 컴포넌트 | components/timetable/TimetableGrid.tsx | 메인 그리드 |
| 시간 축 | components/timetable/TimeAxis.tsx | Y축 시간대 (10:00~22:00) |
| 요일 헤더 | components/timetable/DayHeader.tsx | X축 요일 (월~토) |
| 슬롯 셀 | components/timetable/SlotCell.tsx | 개별 셀 (빈 셀 / 할당 셀) |

**UI 스펙**:
```
     │  월   │  화   │  수   │  목   │  금   │  토   │
─────┼───────┼───────┼───────┼───────┼───────┼───────┤
10:00│       │ 중1A  │       │ 중1A  │       │       │
─────┼───────┼───────┼───────┼───────┼───────┼───────┤
11:00│ 중2B  │       │ 중2B  │       │ 중2B  │ 보강  │
─────┼───────┼───────┼───────┼───────┼───────┼───────┤
12:00│       │       │       │       │       │       │
```

**예상 소요**: 2시간

---

### Phase 5-D: 반/강사 팔레트
**목표**: 드래그 가능한 반/강사 목록

| 작업 | 파일 | 설명 |
|------|------|------|
| 팔레트 패널 | components/timetable/ClassPalette.tsx | 우측 사이드 패널 |
| 반 아이템 | components/timetable/ClassItem.tsx | 드래그 가능한 반 칩 |
| 강사 필터 | components/timetable/TeacherFilter.tsx | 강사별 필터 |
| 학년 필터 | components/timetable/GradeFilter.tsx | 학년별 필터 |

**UI 스펙**:
```
┌──────────────────┐
│  반 목록          │
├──────────────────┤
│  학년: [전체 ▼]   │
│  과목: [전체 ▼]   │
├──────────────────┤
│  🔵 중1A 수학     │  ← 드래그 가능
│  🟢 중1B 영어     │
│  🟡 중2A 수학     │
│  🟣 고1A 국어     │
└──────────────────┘
```

**예상 소요**: 1.5시간

---

### Phase 5-E: 할당 인터랙션
**목표**: 드래그&드롭으로 슬롯 배정

| 작업 | 파일 | 설명 |
|------|------|------|
| DnD 컨텍스트 | components/timetable/DndContext.tsx | @dnd-kit 설정 |
| 드롭 영역 | SlotCell.tsx 수정 | 드롭 핸들러 추가 |
| 슬롯 이동 | TimetableGrid.tsx 수정 | 슬롯 간 이동 |
| 삭제 액션 | SlotCell.tsx 수정 | 우클릭 메뉴 / 삭제 버튼 |

**인터랙션**:
1. 팔레트에서 반 드래그 → 빈 셀에 드롭 → 슬롯 생성
2. 기존 슬롯 드래그 → 다른 셀에 드롭 → 슬롯 이동
3. 슬롯 클릭 → 삭제 버튼 → 슬롯 삭제

**예상 소요**: 2시간

---

### Phase 5-F: 다중 시간표 (탭/카드)
**목표**: 여러 시나리오 전환 UI

| 작업 | 파일 | 설명 |
|------|------|------|
| 탭 UI 강화 | ScenarioTabs.tsx 수정 | 활성 시나리오 표시 |
| 카드 뷰 | components/timetable/ScenarioCardView.tsx | 축소 카드 형태 |
| 전환 애니메이션 | TimetableGrid.tsx 수정 | 페이드/슬라이드 효과 |

**예상 소요**: 1시간

---

### Phase 5-G: 비교 뷰
**목표**: 2개 시나리오 나란히 비교

| 작업 | 파일 | 설명 |
|------|------|------|
| 비교 모드 | components/timetable/CompareView.tsx | Split 뷰 |
| 차이점 하이라이트 | CompareView.tsx | 다른 슬롯 강조 표시 |
| 병합 기능 | CompareView.tsx | A→B 슬롯 복사 |

**UI 스펙**:
```
┌────────────────────────┬────────────────────────┐
│    정규 1학기 (v1)      │    정규 1학기 (v2)      │
├────────────────────────┼────────────────────────┤
│  [그리드]              │  [그리드]              │
│                        │   ← 차이점 하이라이트   │
└────────────────────────┴────────────────────────┘
```

**예상 소요**: 1.5시간

---

### Phase 5-H: 반응형 최적화
**목표**: 태블릿/모바일 대응

| 작업 | 파일 | 설명 |
|------|------|------|
| PC | 기본 | 풀 그리드 + 팔레트 |
| 태블릿 | 반응형 | 팔레트 드로어로 변경 |
| 모바일 | 읽기 전용 | 그리드만 표시 (편집 불가) |

**브레이크포인트**:
- PC: 1024px+ → 풀 레이아웃
- 태블릿: 768px~1023px → 팔레트 드로어
- 모바일: ~767px → 읽기 전용 경고

**예상 소요**: 1시간

---

### Phase 5-I: 애니메이션 + 폴리시
**목표**: 토스 스타일 마무리

| 작업 | 설명 |
|------|------|
| 드래그 애니메이션 | 부드러운 드래그 피드백 |
| 슬롯 추가/삭제 | 페이드인/아웃 |
| 로딩 상태 | 스켈레톤 UI |
| 에러 처리 | 토스트 메시지 |
| 빈 상태 | 가이드 일러스트 |

**예상 소요**: 1시간

---

## 5. 파일 구조

```
frontend/src/
├── types/
│   └── timetable.ts                 # [5-A] 타입 정의
├── api/
│   └── timetable.ts                 # [5-A] API 함수
├── hooks/
│   ├── useScenarios.ts              # [5-A] 시나리오 훅
│   └── useSlots.ts                  # [5-A] 슬롯 훅
├── components/timetable/
│   ├── index.ts                     # 배럴 export
│   ├── ScenarioList.tsx             # [5-B] 시나리오 목록
│   ├── ScenarioTabs.tsx             # [5-B] 탭 네비게이션
│   ├── CreateScenarioModal.tsx      # [5-B] 생성 모달
│   ├── TimetableGrid.tsx            # [5-C] 메인 그리드
│   ├── TimeAxis.tsx                 # [5-C] 시간 축
│   ├── DayHeader.tsx                # [5-C] 요일 헤더
│   ├── SlotCell.tsx                 # [5-C] 슬롯 셀
│   ├── ClassPalette.tsx             # [5-D] 반 팔레트
│   ├── ClassItem.tsx                # [5-D] 반 아이템
│   ├── DndContext.tsx               # [5-E] DnD 컨텍스트
│   ├── CompareView.tsx              # [5-G] 비교 뷰
│   └── MobileReadOnly.tsx           # [5-H] 모바일 읽기 전용
└── pages/admin/
    └── TimetableStudioPage.tsx      # 메인 페이지 (OperationsPage에서 분리)
```

---

## 6. 의존성

### 6.1 필요 패키지
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 6.2 기존 시스템 연동
| 시스템 | 연동 내용 |
|--------|----------|
| classes 테이블 | 반 목록 조회 |
| teachers 테이블 | 강사 목록 조회 |
| profiles 테이블 | 권한 체크 |

---

## 7. 테스트 체크리스트

### Phase별 검증
- [ ] 5-A: 테이블 생성 확인, 타입 빌드 성공
- [ ] 5-B: 시나리오 CRUD 동작
- [ ] 5-C: 그리드 렌더링, 시간/요일 표시
- [ ] 5-D: 반 목록 표시, 필터 동작
- [ ] 5-E: 드래그&드롭 슬롯 생성/이동/삭제
- [ ] 5-F: 시나리오 탭 전환
- [ ] 5-G: 비교 뷰 표시
- [ ] 5-H: 반응형 브레이크포인트 동작
- [ ] 5-I: 애니메이션 부드러움

### 통합 테스트
- [ ] 시나리오 생성 → 슬롯 추가 → 저장 → 새로고침 → 데이터 유지
- [ ] 권한: teacher 계정으로 편집 시도 → 차단됨
- [ ] 권한: admin 계정으로 편집 → 성공

---

## 8. 예상 에러 및 대응

| 에러 | 원인 | 해결 |
|------|------|------|
| RLS 권한 오류 | role 체크 실패 | profiles JOIN 확인 |
| 드래그 안됨 | DnD 컨텍스트 누락 | Provider 위치 확인 |
| 슬롯 중복 | UNIQUE 제약 조건 | 시간대 충돌 체크 |
| 타입 불일치 | snake_case ↔ camelCase | 변환 함수 사용 |

---

## 9. 요약

| 항목 | 내용 |
|------|------|
| **총 Phase** | 9개 (5-A ~ 5-I) |
| **예상 총 시간** | 약 12.5시간 |
| **핵심 기능** | 구조화된 시간표 그리드 + 드래그&드롭 할당 |
| **데이터** | Supabase timetable_scenarios, timetable_slots |
| **권한** | admin/owner만 편집, teacher는 조회만 |

---

*작성: Claude Code | Stage 5 개발 계획*
