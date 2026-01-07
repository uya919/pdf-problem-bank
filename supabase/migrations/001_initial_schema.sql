-- =====================================================
-- Hyeyum Backoffice - Initial Schema
-- Version: 1.0.0
-- Created: 2025-12-12
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUM TYPES
-- =====================================================

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE registration_status AS ENUM ('inquiry', 'scheduled', 'completed', 'enrolled', 'cancelled');

-- =====================================================
-- 2. PROFILES (연결: auth.users)
-- =====================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'teacher' CHECK (role IN ('director', 'teacher', 'assistant')),
  subjects TEXT[],
  department TEXT CHECK (department IN ('elementary', 'middle', 'high')),
  grade_permissions JSONB DEFAULT '{"grades": []}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- 3. STUDENTS (학생)
-- =====================================================

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  parent_phone TEXT,
  grade TEXT,
  school TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_name ON students(name);

-- =====================================================
-- 4. CLASSES (반)
-- =====================================================

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  schedule JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_name ON classes(name);

-- =====================================================
-- 5. CLASS_ENROLLMENTS (반 등록)
-- =====================================================

CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(class_id, student_id)
);

CREATE INDEX idx_enrollments_class ON class_enrollments(class_id);
CREATE INDEX idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_enrollments_status ON class_enrollments(status);

-- =====================================================
-- 6. ATTENDANCE (출결)
-- =====================================================

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
CREATE INDEX idx_attendance_date ON attendance(date);

-- =====================================================
-- 7. PROGRESS (진도)
-- =====================================================

CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  textbook TEXT,
  start_page INTEGER,
  end_page INTEGER,
  topic TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_progress_class_date ON progress(class_id, date DESC);

-- =====================================================
-- 8. HOMEWORK (숙제)
-- =====================================================

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

CREATE INDEX idx_homework_class ON homework(class_id);
CREATE INDEX idx_homework_due_date ON homework(due_date);

-- =====================================================
-- 9. HOMEWORK_SUBMISSIONS (숙제 제출)
-- =====================================================

CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_submitted' CHECK (status IN ('submitted', 'not_submitted', 'late')),
  submitted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(homework_id, student_id)
);

CREATE INDEX idx_submissions_homework ON homework_submissions(homework_id);
CREATE INDEX idx_submissions_student ON homework_submissions(student_id);

-- =====================================================
-- 10. EXAM_SCORES (시험 성적)
-- =====================================================

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

CREATE INDEX idx_exam_scores_class ON exam_scores(class_id);
CREATE INDEX idx_exam_scores_student ON exam_scores(student_id);
CREATE INDEX idx_exam_scores_date ON exam_scores(exam_date);

-- =====================================================
-- 11. REGISTRATIONS (신규 등록/상담)
-- =====================================================

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
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  consultation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_date ON registrations(consultation_date);

-- =====================================================
-- 12. MEETINGS (회의)
-- =====================================================

CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  attendee_scope TEXT NOT NULL DEFAULT 'all',
  attendee_ids UUID[],
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  minutes TEXT,
  decisions TEXT,
  action_items TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meetings_date ON meetings(meeting_date);
CREATE INDEX idx_meetings_created_by ON meetings(created_by);

-- =====================================================
-- 13. TODOS (할 일)
-- =====================================================

CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT CHECK (category IN ('attendance', 'homework', 'call', 'meeting', 'etc')),
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_todos_user_date ON todos(user_id, due_date);
CREATE INDEX idx_todos_user_completed ON todos(user_id, completed);
CREATE INDEX idx_todos_meeting ON todos(meeting_id);

-- =====================================================
-- 14. ANNOUNCEMENTS (공지사항)
-- =====================================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  announcement_date DATE DEFAULT CURRENT_DATE,
  is_pinned BOOLEAN DEFAULT FALSE,
  show_in_calendar BOOLEAN DEFAULT FALSE,
  visible_group_ids UUID[],
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_announcements_date ON announcements(announcement_date DESC);
CREATE INDEX idx_announcements_pinned ON announcements(is_pinned);

-- =====================================================
-- 15. TEACHER_GROUPS (교사 그룹)
-- =====================================================

CREATE TABLE teacher_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teacher_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES teacher_groups(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(group_id, teacher_id)
);

-- =====================================================
-- 16. RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_group_members ENABLE ROW LEVEL SECURITY;

-- Profiles: 인증된 사용자 조회, 본인만 수정
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Students: 인증된 사용자 CRUD
CREATE POLICY "Students are viewable by authenticated users"
  ON students FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students are insertable by authenticated users"
  ON students FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Students are updatable by authenticated users"
  ON students FOR UPDATE TO authenticated USING (true);

-- Classes: 인증된 사용자 CRUD
CREATE POLICY "Classes are viewable by authenticated users"
  ON classes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Classes are insertable by authenticated users"
  ON classes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Classes are updatable by authenticated users"
  ON classes FOR UPDATE TO authenticated USING (true);

-- Class Enrollments: 인증된 사용자 CRUD
CREATE POLICY "Enrollments are viewable by authenticated users"
  ON class_enrollments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enrollments are insertable by authenticated users"
  ON class_enrollments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enrollments are updatable by authenticated users"
  ON class_enrollments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enrollments are deletable by authenticated users"
  ON class_enrollments FOR DELETE TO authenticated USING (true);

-- Attendance: 인증된 사용자 CRUD
CREATE POLICY "Attendance is viewable by authenticated users"
  ON attendance FOR SELECT TO authenticated USING (true);

CREATE POLICY "Attendance is insertable by authenticated users"
  ON attendance FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Attendance is updatable by authenticated users"
  ON attendance FOR UPDATE TO authenticated USING (true);

-- Progress: 인증된 사용자 CRUD
CREATE POLICY "Progress is viewable by authenticated users"
  ON progress FOR SELECT TO authenticated USING (true);

CREATE POLICY "Progress is insertable by authenticated users"
  ON progress FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Progress is updatable by authenticated users"
  ON progress FOR UPDATE TO authenticated USING (true);

-- Homework: 인증된 사용자 CRUD
CREATE POLICY "Homework is viewable by authenticated users"
  ON homework FOR SELECT TO authenticated USING (true);

CREATE POLICY "Homework is insertable by authenticated users"
  ON homework FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Homework is updatable by authenticated users"
  ON homework FOR UPDATE TO authenticated USING (true);

-- Homework Submissions: 인증된 사용자 CRUD
CREATE POLICY "Submissions are viewable by authenticated users"
  ON homework_submissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Submissions are insertable by authenticated users"
  ON homework_submissions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Submissions are updatable by authenticated users"
  ON homework_submissions FOR UPDATE TO authenticated USING (true);

-- Exam Scores: 인증된 사용자 CRUD
CREATE POLICY "Exam scores are viewable by authenticated users"
  ON exam_scores FOR SELECT TO authenticated USING (true);

CREATE POLICY "Exam scores are insertable by authenticated users"
  ON exam_scores FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Exam scores are updatable by authenticated users"
  ON exam_scores FOR UPDATE TO authenticated USING (true);

-- Registrations: 인증된 사용자 CRUD
CREATE POLICY "Registrations are viewable by authenticated users"
  ON registrations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Registrations are insertable by authenticated users"
  ON registrations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Registrations are updatable by authenticated users"
  ON registrations FOR UPDATE TO authenticated USING (true);

-- Meetings: 인증된 사용자 CRUD
CREATE POLICY "Meetings are viewable by authenticated users"
  ON meetings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Meetings are insertable by authenticated users"
  ON meetings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Meetings are updatable by creator"
  ON meetings FOR UPDATE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "Meetings are deletable by creator"
  ON meetings FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Todos: 본인 것만 CRUD
CREATE POLICY "Todos are viewable by owner"
  ON todos FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Todos are insertable by owner"
  ON todos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Todos are updatable by owner"
  ON todos FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Todos are deletable by owner"
  ON todos FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Announcements: 인증된 사용자 조회
CREATE POLICY "Announcements are viewable by authenticated users"
  ON announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Announcements are insertable by authenticated users"
  ON announcements FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Announcements are updatable by creator"
  ON announcements FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- Teacher Groups: 인증된 사용자 조회
CREATE POLICY "Teacher groups are viewable by authenticated users"
  ON teacher_groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teacher group members are viewable by authenticated users"
  ON teacher_group_members FOR SELECT TO authenticated USING (true);

-- =====================================================
-- 17. UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_progress_updated_at BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON homework
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todos_updated_at BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF INITIAL SCHEMA
-- =====================================================
