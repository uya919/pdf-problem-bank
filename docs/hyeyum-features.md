# Hyeyum 기능 명세서

> Stage 1.1: UI 코드 차단 전에 추출한 기능 목록
> 작성일: 2025-12-10

---

## 1. 핵심 기능 목록

### 1.1 대시보드 (Dashboard)
| 기능 | 설명 |
|------|------|
| 오늘 일정 | 오늘 수업 목록, 시간별 표시 |
| 빠른 액션 | 출결 체크, 진도 기록 바로가기 |
| TODO 목록 | 할 일 관리 (우선순위, 카테고리별) |
| 공지사항 | 접기/펼치기 가능한 공지 |
| 통계 요약 | 학생 수, 수업 수 등 |

### 1.2 학생 관리 (Students)
| 기능 | 설명 |
|------|------|
| 학생 목록 | 이름, 학년, 학교, 상태 표시 |
| 학생 등록 | 이름, 전화번호, 학부모 연락처 입력 |
| 학생 상세 | 개별 학생 정보 조회/수정 |
| 상태 관리 | active/inactive/graduated 상태 |
| 메모 | 학생별 특이사항 기록 |

### 1.3 반 관리 (Classes)
| 기능 | 설명 |
|------|------|
| 반 목록 | 반 이름, 과목, 담당 선생님 |
| 반 생성 | 이름, 요일, 시간 설정 |
| 학생 배정 | 반에 학생 등록 (enrollment) |
| 반 일정 | 요일/시간별 수업 일정 |

### 1.4 출결 관리 (Attendance)
| 기능 | 설명 |
|------|------|
| 출결 체크 | 출석/결석/지각/사유결석 체크 |
| 날짜별 조회 | 특정 날짜 출결 현황 |
| 반별 조회 | 반별 출결 통계 |
| 상태 종류 | present, absent, late, excused |

### 1.5 진도 관리 (Progress)
| 기능 | 설명 |
|------|------|
| 진도 기록 | 수업일, 교재, 페이지, 주제 입력 |
| 이전 진도 표시 | 지난 수업 내용 자동 표시 |
| 진도 이력 | 반별 진도 히스토리 조회 |

### 1.6 숙제 관리 (Homework)
| 기능 | 설명 |
|------|------|
| 숙제 등록 | 교재, 페이지 범위, 마감일 |
| 제출 확인 | 학생별 숙제 제출 상태 |
| 완료 체크 | 제출/미제출/지각제출 체크 |

### 1.7 신규 등록/상담 (Registrations)
| 기능 | 설명 |
|------|------|
| 상담 등록 | 학생명, 학부모명, 연락처, 상담일 |
| 상태 관리 | inquiry → scheduled → completed → enrolled/cancelled |
| 담당자 배정 | 상담 담당 선생님 지정 |
| 메모 | 상담 내용 기록 |

### 1.8 시험 성적 (Exam Scores)
| 기능 | 설명 |
|------|------|
| 성적 입력 | 맞춘 문항 / 전체 문항 입력 |
| 자동 계산 | 점수 자동 계산 (소수점 1자리) |
| 시험 유형 | 중간고사, 기말고사, Daily/Weekly/Monthly Test |
| 성적 조회 | 학생별, 반별, 시험별 조회 |

### 1.9 회의 관리 (Meetings)
| 기능 | 설명 |
|------|------|
| 회의 등록 | 제목, 일시, 장소, 참석자 |
| 참석자 범위 | 전체/특정인/과목별/부서별 |
| 회의록 | 회의 내용, 결정사항, 액션아이템 |
| TODO 연결 | 회의에서 TODO 자동 생성 |
| 상태 | scheduled/completed/cancelled |

### 1.10 TODO 관리
| 기능 | 설명 |
|------|------|
| TODO 생성 | 제목, 설명, 마감일 |
| 우선순위 | low, medium, high |
| 카테고리 | attendance, homework, call, meeting, etc |
| 완료 체크 | 완료 시 completed_at 기록 |
| 회의 연결 | meeting_id로 회의와 연결 |

### 1.11 공지사항 (Announcements)
| 기능 | 설명 |
|------|------|
| 공지 작성 | 제목, 내용, 공지일 |
| 캘린더 표시 | show_in_calendar 옵션 |
| 그룹 공개 | 특정 그룹에만 공개 가능 |
| 고정 | 상단 고정 기능 |

### 1.12 시간표 스튜디오 (Timetable Studio)
| 기능 | 설명 |
|------|------|
| 보드 관리 | 연도별 시간표 실험 컨테이너 |
| 시나리오 | 보드 내 여러 시나리오 비교 |
| 섹션/레인 | 유연한 요일/시간 구성 |
| 블록 배치 | 드래그앤드롭 시간표 편집 |
| 색상 팔레트 | 블록별 컬러 지정 |

### 1.13 기타 기능
| 기능 | 설명 |
|------|------|
| 특별 수업 (adhoc-classes) | 정규 외 수업 관리 |
| 선생님 그룹 | 과목별/부서별 그룹 관리 |
| 관리자 | 시스템 설정, 권한 관리 |
| 설정 | 개인 설정 |

---

## 2. 데이터베이스 스키마

### 2.1 profiles (사용자)
```sql
-- Supabase Auth 연동
id UUID PRIMARY KEY
email TEXT
name TEXT
role TEXT -- 'director', 'teacher', 'assistant'
subjects TEXT[] -- 담당 과목
department TEXT -- 'elementary', 'middle', 'high'
grade_permissions JSONB -- 학년별 권한
```

### 2.2 students (학생)
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
phone TEXT
parent_phone TEXT
grade TEXT -- '초3', '중1', '고2' 등
school TEXT
status TEXT DEFAULT 'active' -- 'active', 'inactive', 'graduated'
notes TEXT
created_at, updated_at TIMESTAMPTZ
```

### 2.3 classes (반)
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL -- '중3A반'
subject TEXT -- '수학'
teacher_id UUID REFERENCES profiles(id)
schedule JSONB -- 요일/시간 정보
created_at, updated_at TIMESTAMPTZ
```

### 2.4 class_enrollments (반 등록)
```sql
id UUID PRIMARY KEY
class_id UUID REFERENCES classes(id)
student_id UUID REFERENCES students(id)
enrolled_at DATE
status TEXT DEFAULT 'active'
```

### 2.5 attendance (출결)
```sql
id UUID PRIMARY KEY
class_id UUID REFERENCES classes(id)
student_id UUID REFERENCES students(id)
date DATE NOT NULL
status attendance_status -- 'present', 'absent', 'late', 'excused'
note TEXT
created_at, updated_at TIMESTAMPTZ
```

### 2.6 progress (진도)
```sql
id UUID PRIMARY KEY
class_id UUID REFERENCES classes(id)
date DATE NOT NULL
textbook TEXT
start_page INTEGER
end_page INTEGER
topic TEXT
notes TEXT
created_by UUID
created_at, updated_at TIMESTAMPTZ
```

### 2.7 homework (숙제)
```sql
id UUID PRIMARY KEY
class_id UUID REFERENCES classes(id)
title TEXT NOT NULL
description TEXT
textbook TEXT
start_page INTEGER
end_page INTEGER
due_date DATE
created_at, updated_at TIMESTAMPTZ
```

### 2.8 homework_submissions (숙제 제출)
```sql
id UUID PRIMARY KEY
homework_id UUID REFERENCES homework(id)
student_id UUID REFERENCES students(id)
status TEXT -- 'submitted', 'not_submitted', 'late'
submitted_at TIMESTAMPTZ
notes TEXT
```

### 2.9 registrations (신규 등록)
```sql
id UUID PRIMARY KEY
student_name TEXT NOT NULL
parent_name TEXT NOT NULL
phone TEXT NOT NULL
grade TEXT
subject TEXT
consultation_date DATE
status registration_status -- 'inquiry', 'scheduled', 'completed', 'enrolled', 'cancelled'
notes TEXT
assigned_to UUID REFERENCES profiles(id)
created_at, updated_at TIMESTAMPTZ
```

### 2.10 exam_scores (시험 성적)
```sql
id UUID PRIMARY KEY
class_id UUID REFERENCES classes(id)
student_id UUID REFERENCES students(id)
exam_type TEXT -- 'school_midterm_1', 'school_final_1', 'daily', 'weekly', 'monthly'
exam_date DATE NOT NULL
exam_name TEXT NOT NULL
correct_answers INTEGER
total_questions INTEGER
score DECIMAL(5,1) -- 자동 계산
notes TEXT
created_at, updated_at TIMESTAMPTZ
```

### 2.11 meetings (회의)
```sql
id UUID PRIMARY KEY
title TEXT NOT NULL
description TEXT
meeting_date DATE NOT NULL
start_time TIME
end_time TIME
location TEXT
attendee_scope TEXT -- 'all', 'specific', 'subject_*', 'department_*'
attendee_ids UUID[]
status TEXT -- 'scheduled', 'completed', 'cancelled'
minutes TEXT
decisions TEXT
action_items TEXT
created_by UUID
created_at, updated_at TIMESTAMPTZ
```

### 2.12 todos (할 일)
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles(id)
title TEXT NOT NULL
description TEXT
due_date DATE
completed BOOLEAN DEFAULT FALSE
completed_at TIMESTAMPTZ
priority TEXT -- 'low', 'medium', 'high'
category TEXT -- 'attendance', 'homework', 'call', 'meeting', 'etc'
meeting_id UUID REFERENCES meetings(id) -- 회의에서 생성된 경우
created_at, updated_at TIMESTAMPTZ
```

### 2.13 announcements (공지)
```sql
id UUID PRIMARY KEY
title TEXT NOT NULL
content TEXT
announcement_date DATE
is_pinned BOOLEAN DEFAULT FALSE
show_in_calendar BOOLEAN DEFAULT FALSE
visible_group_ids UUID[]
created_by UUID
created_at, updated_at TIMESTAMPTZ
```

### 2.14 teacher_groups (선생님 그룹)
```sql
id UUID PRIMARY KEY
name TEXT NOT NULL
description TEXT
color TEXT DEFAULT '#0066FF'
created_by UUID
created_at, updated_at TIMESTAMPTZ
```

### 2.15 Timetable Studio 테이블

```sql
-- boards: 시간표 보드 (연도별 컨테이너)
-- variants: 시나리오 (보드 내 여러 버전)
-- sections: 섹션 (시나리오 내 구분)
-- lanes: 레인 (커스텀 요일 컬럼)
-- blocks: 시간표 블록 (실제 수업 배치)
```

---

## 3. 라우트 구조

```
(dashboard)/
├── dashboard/         # 메인 대시보드
├── students/          # 학생 관리
│   ├── page.tsx       # 목록
│   └── [id]/          # 상세
├── classes/           # 반 관리
│   ├── page.tsx       # 목록
│   └── [id]/          # 상세/출결/진도
├── attendance/        # 출결 관리
├── registrations/     # 신규 등록/상담
├── consultations/     # 상담 관리
├── meetings/          # 회의 관리
├── announcements/     # 공지사항
├── adhoc-classes/     # 특별 수업
├── timetable-studio/  # 시간표 스튜디오
├── settings/          # 설정
├── admin/             # 관리자
└── more/              # 더보기
```

---

## 4. 주요 타입 정의

### 4.1 출결 상태
```typescript
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
```

### 4.2 등록 상태
```typescript
type RegistrationStatus = 'inquiry' | 'scheduled' | 'completed' | 'enrolled' | 'cancelled';
```

### 4.3 회의 상태
```typescript
type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';
```

### 4.4 TODO
```typescript
type Priority = 'low' | 'medium' | 'high';
type Category = 'attendance' | 'homework' | 'call' | 'meeting' | 'etc';
```

### 4.5 시험 유형
```typescript
type ExamType =
  | 'school_midterm_1' | 'school_final_1'
  | 'school_midterm_2' | 'school_final_2'
  | 'daily' | 'weekly' | 'monthly' | 'other';
```

### 4.6 요일
```typescript
type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
```

---

## 5. 백오피스 MVP 기능 (우선순위)

### 5.1 Phase 1: 필수 기능
1. **대시보드** - 오늘 일정, 빠른 액션
2. **출결 관리** - 출결 체크 모달
3. **진도 관리** - 진도 기록 모달

### 5.2 Phase 2: 핵심 기능
4. **TODO 관리** - 할 일 목록
5. **학생 조회** - 학생 정보 확인
6. **반 조회** - 반 정보 확인

### 5.3 Phase 3: 확장 기능
7. 숙제 관리
8. 시험 성적
9. 회의 관리
10. 공지사항

---

## 6. 참조 문서

| 문서 | 용도 |
|------|------|
| 이 문서 | 기능 명세 (Stage 1.1 결과) |
| `docs/supabase-schema.md` | DB 스키마 상세 (Stage 1.2) |
| `docs/business-logic.md` | 비즈니스 로직 (Stage 1.3) |
| `docs/mockups/dashboard-modal-final.html` | UI 목업 |

---

*작성: Claude Code | 2025-12-10*
*참조: hyeyum/drizzle/*.sql, hyeyum/src/types/*.ts*
