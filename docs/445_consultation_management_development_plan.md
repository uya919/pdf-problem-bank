# Stage 33: 상담 관리 시스템 개발 계획

> 작성일: 2025-12-27
> 참조: [연구 리포트](444_consultation_management_system_research.md)
> 목업: [신규상담](mockups/consultation_new_student.html) | [학생상담](mockups/consultation_existing_student.html)

---

## 1. 목표

### 1.1 핵심 기능
| 기능 | 설명 |
|------|------|
| **신규상담** | 신규 학생 상담 폼 (학년, 과목, 반배정 등) |
| **학생상담** | 기존 학생 상담 이력 조회/추가 |
| **등원 알림** | 담당 선생님 + 과목별 관리자에게 알림 |
| **캘린더 표시** | 등원 예정일에 점 + 학생 이름 일부 표시 |

### 1.2 알림 대상
```
1. 담당 반 선생님 (classes.teacher_id)
2. 과목별 관리자 (새 필드: subject_managers)
   - 수학 관리자: 수학 수강 학생 등원 시 알림
   - 영어 관리자: 영어 수강 학생 등원 시 알림
   - 국어 관리자: 국어 수강 학생 등원 시 알림
```

### 1.3 알림 타이밍
| 타이밍 | 트리거 | 방식 |
|--------|--------|------|
| 즉시 | 등원 확정 시 | DB INSERT 트리거 |
| D-1 | 등원 전날 | Railway Worker 스케줄러 |
| D-day | 등원 당일 | Railway Worker 스케줄러 |

---

## 2. 데이터베이스 설계

### 2.1 새 테이블: `consultations`

```sql
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 상담 대상 (신규 or 기존 학생)
  student_id UUID REFERENCES students(id),  -- NULL이면 신규 상담

  -- 신규 상담 시 학생 정보
  student_name VARCHAR(100) NOT NULL,
  grade_id UUID REFERENCES grades(id),
  school_name VARCHAR(100),
  student_phone VARCHAR(20),
  parent_phone VARCHAR(20),

  -- 상담 정보
  consultation_date DATE NOT NULL,
  preferred_schedule TEXT,  -- "월수금 오후 5시"
  notes TEXT,

  -- 등원 정보
  enrollment_date DATE,     -- 확정된 등원 날짜
  enrollment_status VARCHAR(20) DEFAULT 'pending',
  -- pending: 상담 중
  -- confirmed: 등원 확정
  -- enrolled: 등원 완료 (학생 등록됨)
  -- cancelled: 취소

  -- 메타
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_consultations_status ON consultations(enrollment_status);
CREATE INDEX idx_consultations_enrollment_date ON consultations(enrollment_date);
CREATE INDEX idx_consultations_student ON consultations(student_id);
```

### 2.2 새 테이블: `consultation_subjects` (상담-과목 매핑)

```sql
CREATE TABLE consultation_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),  -- 배정된 반 (NULL 가능)

  UNIQUE(consultation_id, subject_id)
);

CREATE INDEX idx_consultation_subjects_consultation ON consultation_subjects(consultation_id);
```

### 2.3 새 테이블: `enrollment_notifications`

```sql
CREATE TABLE enrollment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,

  -- 알림 대상
  recipient_id UUID NOT NULL REFERENCES profiles(id),
  recipient_type VARCHAR(20) NOT NULL,  -- 'teacher', 'subject_manager'

  -- 알림 정보
  student_name VARCHAR(100) NOT NULL,
  enrollment_date DATE NOT NULL,
  class_name VARCHAR(100),
  subject_name VARCHAR(50),

  -- 알림 스케줄
  notification_type VARCHAR(20) NOT NULL,  -- 'immediate', 'd-1', 'd-day'
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrollment_notifications_scheduled ON enrollment_notifications(scheduled_at)
  WHERE is_sent = FALSE;
CREATE INDEX idx_enrollment_notifications_recipient ON enrollment_notifications(recipient_id);
```

### 2.4 `subjects` 테이블 확장 (과목별 관리자)

```sql
-- subjects 테이블에 관리자 배열 추가
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS manager_ids UUID[] DEFAULT '{}';

-- 코멘트
COMMENT ON COLUMN subjects.manager_ids IS '과목별 관리자 ID 배열 (다중 선택 가능)';
```

---

## 3. 타입 정의

### 3.1 `frontend/src/types/consultation.ts` (NEW)

```typescript
// 상담 상태
export type ConsultationStatus = 'pending' | 'confirmed' | 'enrolled' | 'cancelled';

// 알림 타입
export type NotificationType = 'immediate' | 'd-1' | 'd-day';

// 상담 과목 정보
export interface ConsultationSubject {
  id: string;
  consultation_id: string;
  subject_id: string;
  class_id: string | null;
  // 조인 데이터
  subjects?: {
    id: string;
    name: string;
    code: string;
  };
  classes?: {
    id: string;
    name: string;
  };
}

// 상담 데이터
export interface Consultation {
  id: string;
  student_id: string | null;
  student_name: string;
  grade_id: string | null;
  school_name: string | null;
  student_phone: string | null;
  parent_phone: string | null;
  consultation_date: string;
  preferred_schedule: string | null;
  notes: string | null;
  enrollment_date: string | null;
  enrollment_status: ConsultationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // 조인 데이터
  grades?: { id: string; name: string };
  consultation_subjects?: ConsultationSubject[];
  students?: { id: string; name: string };
}

// 상담 생성 입력
export interface CreateConsultationInput {
  student_id?: string | null;
  student_name: string;
  grade_id?: string | null;
  school_name?: string | null;
  student_phone?: string | null;
  parent_phone?: string | null;
  consultation_date: string;
  preferred_schedule?: string | null;
  notes?: string | null;
  enrollment_date?: string | null;
  enrollment_status?: ConsultationStatus;
  // 과목별 반배정
  subjects: Array<{
    subject_id: string;
    class_id?: string | null;
  }>;
  // 알림 설정
  notify_on_confirm?: boolean;
}

// 등원 알림
export interface EnrollmentNotification {
  id: string;
  consultation_id: string;
  recipient_id: string;
  recipient_type: 'teacher' | 'subject_manager';
  student_name: string;
  enrollment_date: string;
  class_name: string | null;
  subject_name: string | null;
  notification_type: NotificationType;
  scheduled_at: string;
  sent_at: string | null;
  is_sent: boolean;
}

// 과목 관리자 설정
export interface SubjectWithManagers {
  id: string;
  name: string;
  code: string;
  color: string;
  manager_ids: string[];
  // 조인된 관리자 프로필
  managers?: Array<{ id: string; name: string }>;
}
```

---

## 4. Phase 목록

### Phase 33-A: DB 마이그레이션 + 타입

| 작업 | 파일 |
|------|------|
| consultations 테이블 | `supabase/migrations/012_consultations.sql` |
| consultation_subjects 테이블 | 같은 파일 |
| enrollment_notifications 테이블 | 같은 파일 |
| subjects.manager_ids 컬럼 추가 | 같은 파일 |
| RLS 정책 | 같은 파일 |
| 타입 정의 | `frontend/src/types/consultation.ts` |

---

### Phase 33-B: API 함수 + 훅

| 작업 | 파일 |
|------|------|
| 상담 CRUD API | `frontend/src/api/consultations.ts` |
| 과목 관리자 API | `frontend/src/api/subjects.ts` 확장 |
| useConsultations 훅 | `frontend/src/hooks/useConsultations.ts` |
| useSubjectManagers 훅 | `frontend/src/hooks/useSubjectManagers.ts` |

**API 함수 목록:**

```typescript
// consultations.ts
export async function getConsultations(filters?: ConsultationFilters): Promise<Consultation[]>
export async function getConsultation(id: string): Promise<Consultation | null>
export async function createConsultation(input: CreateConsultationInput): Promise<Consultation>
export async function updateConsultation(id: string, input: Partial<Consultation>): Promise<void>
export async function deleteConsultation(id: string): Promise<void>
export async function confirmEnrollment(id: string, enrollmentDate: string): Promise<void>

// subjects.ts 확장
export async function updateSubjectManagers(subjectId: string, managerIds: string[]): Promise<void>
export async function getSubjectsWithManagers(): Promise<SubjectWithManagers[]>
```

---

### Phase 33-C: 네비게이션 수정

| 작업 | 파일 |
|------|------|
| AdminSidebar에 상담관리 추가 | `components/admin/layout/AdminSidebar.tsx` |
| 출결현황 숨김 처리 | 같은 파일 |
| 라우팅 추가 | `App.tsx` |

**AdminSidebar 변경사항:**

```typescript
const MENU_ITEMS: MenuItem[] = [
  // ... 기존 메뉴
  {
    id: 'consultation',
    label: '상담 관리',
    icon: <MessageSquare className="w-5 h-5" />,
    children: [
      { label: '신규 상담', path: '/admin/consultation/new' },
      { label: '학생 상담', path: '/admin/consultation/student' },
      { label: '상담 목록', path: '/admin/consultation/list' },
    ],
  },
  // 출결현황 제거 또는 숨김
];
```

---

### Phase 33-D: 신규상담 폼 UI

| 작업 | 파일 |
|------|------|
| 신규상담 페이지 | `pages/admin/consultation/NewConsultation.tsx` |
| 학년 선택 | grades API 연동 |
| 과목별 반선택 | classes API 연동 (학년+과목 필터) |
| 등원 확정 체크박스 | 알림 생성 트리거 |

**주요 컴포넌트 구조:**

```
NewConsultation.tsx
├── 학생 정보 섹션
│   ├── 이름 (필수)
│   ├── 학년 (select)
│   ├── 학교명
│   ├── 학생 휴대폰
│   └── 보호자 연락처
├── 상담 정보 섹션
│   ├── 상담 일자 (필수)
│   └── 희망 요일/시간
├── 수강 과목 & 반배정 섹션
│   ├── 국어 체크 → 반 선택
│   ├── 영어 체크 → 반 선택
│   └── 수학 체크 → 반 선택
├── 등원 정보 섹션
│   ├── 등원 예정일
│   └── 등원 확정 시 알림 체크박스
└── 비고 섹션
```

---

### Phase 33-E: 학생상담 UI

| 작업 | 파일 |
|------|------|
| 학생상담 페이지 | `pages/admin/consultation/StudentConsultation.tsx` |
| 학생 검색 컴포넌트 | `components/admin/consultation/StudentSearch.tsx` |
| 상담 이력 목록 | `components/admin/consultation/ConsultationHistory.tsx` |
| 새 상담 추가 폼 | 기존 폼 재사용 |

---

### Phase 33-F: 상담 목록 + 상세

| 작업 | 파일 |
|------|------|
| 상담 목록 페이지 | `pages/admin/consultation/ConsultationList.tsx` |
| 상담 카드 컴포넌트 | `components/admin/consultation/ConsultationCard.tsx` |
| 상담 상세 모달 | `components/admin/consultation/ConsultationDetailModal.tsx` |
| 등원 확정 버튼 | 상태 변경 + 알림 생성 |

---

### Phase 33-G: 과목별 관리자 설정 UI

| 작업 | 파일 |
|------|------|
| 설정 페이지 확장 | `pages/admin/Settings.tsx` 또는 새 페이지 |
| 관리자 선택 컴포넌트 | `components/admin/SubjectManagerSettings.tsx` |
| 다중 선택 (체크박스) | profiles 조회 (role: admin/owner) |

**UI 구조:**

```
┌─────────────────────────────────────────┐
│ 과목별 관리자 설정                        │
├─────────────────────────────────────────┤
│ 국어 관리자                              │
│ ☑ 김원장  ☐ 이관리자  ☐ 박매니저         │
├─────────────────────────────────────────┤
│ 영어 관리자                              │
│ ☐ 김원장  ☑ 이관리자  ☐ 박매니저         │
├─────────────────────────────────────────┤
│ 수학 관리자                              │
│ ☑ 김원장  ☐ 이관리자  ☑ 박매니저         │
└─────────────────────────────────────────┘
```

---

### Phase 33-H: 알림 생성 로직

| 작업 | 파일/위치 |
|------|----------|
| 즉시 알림 생성 함수 | `frontend/src/api/notifications.ts` |
| notices 테이블에 INSERT | 기존 공지 시스템 활용 |
| 알림 대상 계산 로직 | 담당 선생님 + 과목 관리자 |

**알림 생성 로직:**

```typescript
async function createEnrollmentNotifications(
  consultation: Consultation,
  enrollmentDate: string
): Promise<void> {
  const recipients: Array<{ id: string; type: string }> = [];

  // 1. 담당 반 선생님 추가
  for (const cs of consultation.consultation_subjects || []) {
    if (cs.class_id) {
      const classData = await getClass(cs.class_id);
      if (classData?.teacher_id) {
        recipients.push({ id: classData.teacher_id, type: 'teacher' });
      }
    }
  }

  // 2. 과목별 관리자 추가
  for (const cs of consultation.consultation_subjects || []) {
    const subject = await getSubjectWithManagers(cs.subject_id);
    for (const managerId of subject.manager_ids || []) {
      recipients.push({ id: managerId, type: 'subject_manager' });
    }
  }

  // 3. 중복 제거 후 알림 생성
  const uniqueRecipients = [...new Set(recipients.map(r => r.id))];

  // 4. notices 테이블에 INSERT (즉시 알림)
  for (const recipientId of uniqueRecipients) {
    await createNotice({
      title: `신규 등원 안내: ${consultation.student_name}`,
      content: `${consultation.student_name} 학생이 ${enrollmentDate}에 등원 예정입니다.`,
      target_type: 'user',
      target_id: recipientId,
      is_important: true,
      notice_date: new Date().toISOString().split('T')[0],
    });
  }

  // 5. enrollment_notifications에 D-1, D-day 스케줄 저장
  // (Railway Worker가 처리)
}
```

---

### Phase 33-I: Railway Worker 스케줄러

| 작업 | 파일 |
|------|------|
| 스케줄러 함수 | `railway-worker/scheduler.py` |
| D-1 알림 체크 | 매일 아침 실행 |
| D-day 알림 체크 | 매일 아침 실행 |
| notices 테이블 INSERT | Supabase API 호출 |

**scheduler.py 구조:**

```python
import asyncio
from datetime import datetime, timedelta
from supabase import create_client

async def check_enrollment_notifications():
    """매일 아침 실행되는 알림 체크"""
    today = datetime.now().date()
    tomorrow = today + timedelta(days=1)

    # D-1 알림: 내일 등원 예정
    await send_notifications_for_date(tomorrow, 'd-1')

    # D-day 알림: 오늘 등원 예정
    await send_notifications_for_date(today, 'd-day')

async def send_notifications_for_date(target_date, notification_type):
    """특정 날짜의 등원 알림 전송"""
    notifications = supabase.table('enrollment_notifications')\
        .select('*')\
        .eq('enrollment_date', target_date.isoformat())\
        .eq('notification_type', notification_type)\
        .eq('is_sent', False)\
        .execute()

    for notif in notifications.data:
        # notices 테이블에 공지 생성
        await create_notice_for_notification(notif)

        # 전송 완료 표시
        supabase.table('enrollment_notifications')\
            .update({'is_sent': True, 'sent_at': datetime.now().isoformat()})\
            .eq('id', notif['id'])\
            .execute()
```

---

### Phase 33-J: 캘린더 등원 표시

| 작업 | 파일 |
|------|------|
| 캘린더 데이터 확장 | `hooks/useAdminNotices.ts` 확장 |
| CalendarDayCell 수정 | 등원 마커 추가 |
| 등원 정보 조회 훅 | `hooks/useEnrollmentDates.ts` |

**캘린더 표시 형식:**

```
┌─────────────────┐
│       2         │
│ • 김○수 등원    │  ← 등원 예정 표시
│ 📌 중요공지     │  ← 기존 공지
└─────────────────┘
```

---

## 5. 파일 생성/수정 순서

### 의존성 순서

```
1. types/consultation.ts (타입 먼저)
   ↓
2. supabase/migrations/012_consultations.sql (DB 스키마)
   ↓
3. api/consultations.ts (API 함수)
   api/subjects.ts (확장)
   ↓
4. hooks/useConsultations.ts (훅)
   hooks/useSubjectManagers.ts
   ↓
5. components/admin/layout/AdminSidebar.tsx (네비게이션)
   App.tsx (라우팅)
   ↓
6. pages/admin/consultation/NewConsultation.tsx
   pages/admin/consultation/StudentConsultation.tsx
   pages/admin/consultation/ConsultationList.tsx
   ↓
7. components/admin/consultation/* (하위 컴포넌트)
   ↓
8. api/notifications.ts (알림 생성)
   ↓
9. railway-worker/scheduler.py (스케줄러)
   ↓
10. hooks/useEnrollmentDates.ts + 캘린더 수정
```

---

## 6. 에러 예측 및 대응

### 6.1 타입 관련

| 예상 에러 | 해결 |
|----------|------|
| `consultation_subjects` 조인 타입 | Supabase 쿼리에 `consultation_subjects(*, subjects(*), classes(*))` 명시 |
| `manager_ids` UUID[] 타입 | Supabase에서 배열 타입 올바르게 처리 |

### 6.2 권한 관련

| 예상 에러 | 해결 |
|----------|------|
| RLS 정책 누락 | 마이그레이션에서 모든 CRUD 정책 추가 |
| 관리자만 접근 | 프론트엔드에서 role 체크 + RLS 정책 |

### 6.3 알림 관련

| 예상 에러 | 해결 |
|----------|------|
| 중복 알림 | recipient_id + consultation_id + notification_type UNIQUE 제약 |
| 시간대 문제 | 모든 날짜를 KST로 저장, 서버도 KST 기준 |

---

## 7. 테스트 체크리스트

### Phase 33-A
- [ ] consultations 테이블 생성 확인
- [ ] consultation_subjects 테이블 생성 확인
- [ ] enrollment_notifications 테이블 생성 확인
- [ ] subjects.manager_ids 컬럼 추가 확인
- [ ] RLS 정책 테스트

### Phase 33-B
- [ ] 상담 생성 API 테스트
- [ ] 상담 조회 API 테스트 (조인 포함)
- [ ] 과목 관리자 설정 API 테스트

### Phase 33-C
- [ ] 사이드바에 상담관리 메뉴 표시
- [ ] 출결현황 숨김 확인
- [ ] /admin/consultation/* 라우팅 동작

### Phase 33-D
- [ ] 신규상담 폼 렌더링
- [ ] 학년 선택 시 반 목록 필터링
- [ ] 과목 체크 시 반 선택 필드 표시
- [ ] 상담 저장 성공

### Phase 33-E
- [ ] 학생 검색 동작
- [ ] 상담 이력 표시
- [ ] 새 상담 추가 성공

### Phase 33-F
- [ ] 상담 목록 표시 (필터링)
- [ ] 상담 상세 모달
- [ ] 등원 확정 버튼 동작

### Phase 33-G
- [ ] 과목별 관리자 설정 UI
- [ ] 다중 선택 저장
- [ ] 저장 후 반영 확인

### Phase 33-H
- [ ] 등원 확정 시 즉시 알림 생성
- [ ] 담당 선생님에게 공지 표시
- [ ] 과목 관리자에게 공지 표시

### Phase 33-I
- [ ] Railway Worker 스케줄러 동작
- [ ] D-1 알림 전송
- [ ] D-day 알림 전송

### Phase 33-J
- [ ] 캘린더에 등원 마커 표시
- [ ] 등원 예정 학생 이름 일부 표시

---

## 8. plan.md 업데이트 내용

```markdown
## Stage 33: 상담 관리 시스템

> [연구 리포트](444_consultation_management_system_research.md) | [상세 개발 계획](445_consultation_management_development_plan.md)

### 목표
- 관리자 전용 상담 페이지 (신규상담/학생상담)
- 과목별 반배정 (국영수)
- 등원 알림 (담당 선생님 + 과목별 관리자)
- 캘린더에 등원 예정 표시

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 33-A | DB 마이그레이션 + 타입 | ⬜ |
| 33-B | API 함수 + 훅 | ⬜ |
| 33-C | 네비게이션 수정 (상담추가, 출결숨김) | ⬜ |
| 33-D | 신규상담 폼 UI | ⬜ |
| 33-E | 학생상담 UI | ⬜ |
| 33-F | 상담 목록 + 상세 | ⬜ |
| 33-G | 과목별 관리자 설정 UI | ⬜ |
| 33-H | 알림 생성 로직 | ⬜ |
| 33-I | Railway Worker 스케줄러 | ⬜ |
| 33-J | 캘린더 등원 표시 | ⬜ |
```

---

*v1.0 - 2025-12-27*
