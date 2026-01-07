# Supabase 스키마 문서

> Stage 1.2: 데이터베이스 스키마 상세 문서
> 작성일: 2025-12-10

---

## 1. 테이블 관계도

```
profiles (사용자)
    │
    ├──< classes (반) ──< class_enrollments >── students (학생)
    │                           │
    │                           ├──< attendance (출결)
    │                           │
    │                           ├──< exam_scores (시험 성적)
    │                           │
    │                           └──< homework_submissions
    │                                        ↑
    ├──< progress (진도)                     │
    │                                        │
    ├──< homework (숙제) ────────────────────┘
    │
    ├──< registrations (신규 등록)
    │
    ├──< meetings (회의) ──< todos (할 일)
    │
    ├──< announcements (공지)
    │
    ├──< teacher_groups ──< teacher_group_members
    │
    └──< timetable_boards ──< timetable_variants ──< timetable_blocks
```

---

## 2. 핵심 테이블 상세

### 2.1 profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'teacher',  -- 'director', 'teacher', 'assistant'
  subjects TEXT[],               -- ['수학', '영어']
  department TEXT,               -- 'elementary', 'middle', 'high'
  grade_permissions JSONB,       -- { "grades": ["초3", "초4", "중1"] }
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: 본인 프로필만 수정 가능
```

### 2.2 students
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  parent_phone TEXT,
  grade TEXT,                    -- '초3', '중1', '고2'
  school TEXT,
  status TEXT DEFAULT 'active',  -- 'active', 'inactive', 'graduated'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_grade ON students(grade);
```

### 2.3 classes
```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,            -- '중3A반'
  subject TEXT,                  -- '수학'
  teacher_id UUID REFERENCES profiles(id),
  schedule JSONB,                -- [{ "day": "MON", "startTime": "16:00", "endTime": "17:30" }]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classes_teacher ON classes(teacher_id);
```

### 2.4 class_enrollments
```sql
CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active',  -- 'active', 'dropped', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(class_id, student_id)
);

CREATE INDEX idx_enrollments_class ON class_enrollments(class_id);
CREATE INDEX idx_enrollments_student ON class_enrollments(student_id);
```

### 2.5 attendance
```sql
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(class_id, student_id, date)
);

CREATE INDEX idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
```

### 2.6 progress
```sql
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  textbook TEXT,                 -- '개념원리 수학 1'
  start_page INTEGER,
  end_page INTEGER,
  topic TEXT,                    -- '이차함수의 그래프'
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_progress_class_date ON progress(class_id, date DESC);
```

### 2.7 homework & homework_submissions
```sql
CREATE TABLE homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  textbook TEXT,
  start_page INTEGER,
  end_page INTEGER,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_submitted',  -- 'submitted', 'not_submitted', 'late'
  submitted_at TIMESTAMPTZ,
  notes TEXT,

  UNIQUE(homework_id, student_id)
);
```

### 2.8 exam_scores
```sql
CREATE TABLE exam_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL CHECK (exam_type IN (
    'school_midterm_1', 'school_final_1',
    'school_midterm_2', 'school_final_2',
    'daily', 'weekly', 'monthly', 'other'
  )),
  exam_date DATE NOT NULL,
  exam_name TEXT NOT NULL,
  correct_answers INTEGER NOT NULL CHECK (correct_answers >= 0),
  total_questions INTEGER NOT NULL CHECK (total_questions > 0),
  score DECIMAL(5,1) GENERATED ALWAYS AS (
    ROUND((correct_answers::DECIMAL / total_questions::DECIMAL * 100), 1)
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(class_id, student_id, exam_type, exam_date, exam_name)
);
```

### 2.9 registrations
```sql
CREATE TYPE registration_status AS ENUM (
  'inquiry', 'scheduled', 'completed', 'enrolled', 'cancelled'
);

CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  parent_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  grade TEXT,
  subject TEXT,
  consultation_date DATE,
  status registration_status DEFAULT 'inquiry',
  notes TEXT,
  assigned_to UUID REFERENCES profiles(id),
  consultation_id UUID,  -- 상담 연결
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_date ON registrations(consultation_date);
```

### 2.10 meetings & todos
```sql
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  attendee_scope TEXT NOT NULL,  -- 'all', 'specific', 'subject_*', 'department_*'
  attendee_ids UUID[],
  status TEXT DEFAULT 'scheduled',
  minutes TEXT,
  decisions TEXT,
  action_items TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium',  -- 'low', 'medium', 'high'
  category TEXT,                   -- 'attendance', 'homework', 'call', 'meeting', 'etc'
  meeting_id UUID REFERENCES meetings(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_todos_user_date ON todos(user_id, due_date);
CREATE INDEX idx_todos_meeting ON todos(meeting_id);
```

### 2.11 announcements
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  announcement_date DATE,
  is_pinned BOOLEAN DEFAULT FALSE,
  show_in_calendar BOOLEAN DEFAULT FALSE,
  visible_group_ids UUID[],  -- 빈 배열 = 전체 공개
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_date ON announcements(announcement_date DESC);
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned);
```

---

## 3. RLS 정책 요약

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | 인증된 사용자 | 본인만 | 본인만 | - |
| students | 인증된 사용자 | 인증된 사용자 | 인증된 사용자 | 원장만 |
| classes | 인증된 사용자 | 인증된 사용자 | 담당/원장 | 원장만 |
| attendance | 인증된 사용자 | 인증된 사용자 | 인증된 사용자 | - |
| progress | 인증된 사용자 | 인증된 사용자 | 인증된 사용자 | - |
| meetings | 인증된 사용자 | 본인 생성 | 본인 생성 | 본인 생성 |
| todos | 본인 것만 | 본인 것만 | 본인 것만 | 본인 것만 |
| announcements | 그룹 조건 | 원장만 | 원장만 | 원장만 |
| teacher_groups | 인증된 사용자 | 원장만 | 원장만 | 원장만 |

---

## 4. 자주 사용하는 쿼리 패턴

### 4.1 오늘 수업 목록
```sql
SELECT c.*, p.name as teacher_name
FROM classes c
LEFT JOIN profiles p ON c.teacher_id = p.id
WHERE c.schedule @> '[{"day": "MON"}]'::jsonb;
```

### 4.2 반별 학생 목록
```sql
SELECT s.*
FROM students s
JOIN class_enrollments ce ON s.id = ce.student_id
WHERE ce.class_id = :class_id
  AND ce.status = 'active'
ORDER BY s.name;
```

### 4.3 최근 진도
```sql
SELECT *
FROM progress
WHERE class_id = :class_id
ORDER BY date DESC
LIMIT 1;
```

### 4.4 오늘 출결 현황
```sql
SELECT s.name, a.status
FROM students s
LEFT JOIN attendance a ON s.id = a.student_id
  AND a.class_id = :class_id
  AND a.date = CURRENT_DATE
JOIN class_enrollments ce ON s.id = ce.student_id
  AND ce.class_id = :class_id
  AND ce.status = 'active';
```

---

## 5. Supabase 연결 정보

```typescript
// .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]

// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

*작성: Claude Code | 2025-12-10*
*참조: hyeyum/drizzle/*.sql*
