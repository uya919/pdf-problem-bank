-- =====================================================
-- Hyeyum Backoffice - Seed Data (테스트용)
-- Version: 1.0.0
-- Created: 2025-12-12
--
-- 주의: 이 파일은 개발/테스트 환경에서만 사용하세요!
-- 프로덕션 환경에서는 실행하지 마세요.
-- =====================================================

-- =====================================================
-- 1. 테스트 학생 데이터
-- =====================================================

INSERT INTO students (name, phone, parent_phone, grade, school, status, notes) VALUES
  ('박성빈', '010-1234-5678', '010-8765-4321', '중3', '한빛중학교', 'active', '수학 심화반'),
  ('이사랑', '010-2345-6789', '010-9876-5432', '중3', '한빛중학교', 'active', NULL),
  ('김민수', '010-3456-7890', '010-0987-6543', '중2', '새빛중학교', 'active', '영어 병행'),
  ('정유진', '010-4567-8901', '010-1098-7654', '중2', '새빛중학교', 'active', NULL),
  ('최지현', '010-5678-9012', '010-2109-8765', '중1', '푸른중학교', 'active', '기초반 추천'),
  ('강도윤', '010-6789-0123', '010-3210-9876', '중1', '푸른중학교', 'active', NULL),
  ('윤서연', '010-7890-1234', '010-4321-0987', '중3', '한빛중학교', 'active', '내신 대비'),
  ('임하준', '010-8901-2345', '010-5432-1098', '중2', '새빛중학교', 'active', NULL);

-- =====================================================
-- 2. 테스트 반 데이터
-- =====================================================

INSERT INTO classes (name, subject, schedule) VALUES
  ('중3A반', '수학', '[{"day":"MON","startTime":"17:00","endTime":"19:00"},{"day":"WED","startTime":"17:00","endTime":"19:00"}]'),
  ('중2A반', '수학', '[{"day":"TUE","startTime":"18:00","endTime":"20:00"},{"day":"THU","startTime":"18:00","endTime":"20:00"}]'),
  ('중1A반', '수학', '[{"day":"FRI","startTime":"16:00","endTime":"18:00"}]');

-- =====================================================
-- 3. 테스트 반 등록 데이터
-- =====================================================

-- 중3A반: 박성빈, 이사랑, 윤서연
INSERT INTO class_enrollments (class_id, student_id, status)
SELECT c.id, s.id, 'active'
FROM classes c, students s
WHERE c.name = '중3A반' AND s.name IN ('박성빈', '이사랑', '윤서연');

-- 중2A반: 김민수, 정유진, 임하준
INSERT INTO class_enrollments (class_id, student_id, status)
SELECT c.id, s.id, 'active'
FROM classes c, students s
WHERE c.name = '중2A반' AND s.name IN ('김민수', '정유진', '임하준');

-- 중1A반: 최지현, 강도윤
INSERT INTO class_enrollments (class_id, student_id, status)
SELECT c.id, s.id, 'active'
FROM classes c, students s
WHERE c.name = '중1A반' AND s.name IN ('최지현', '강도윤');

-- =====================================================
-- 4. 테스트 진도 데이터
-- =====================================================

INSERT INTO progress (class_id, date, textbook, start_page, end_page, topic, notes)
SELECT c.id, CURRENT_DATE - 7, '개념원리 수학 3-1', 45, 52, '이차함수의 그래프', '기본 개념 설명 완료'
FROM classes c WHERE c.name = '중3A반';

INSERT INTO progress (class_id, date, textbook, start_page, end_page, topic, notes)
SELECT c.id, CURRENT_DATE - 5, '개념원리 수학 3-1', 53, 60, '이차함수의 최대최소', '예제 풀이'
FROM classes c WHERE c.name = '중3A반';

INSERT INTO progress (class_id, date, textbook, start_page, end_page, topic, notes)
SELECT c.id, CURRENT_DATE - 3, '개념원리 수학 2-1', 30, 38, '일차함수', '복습 필요'
FROM classes c WHERE c.name = '중2A반';

-- =====================================================
-- 5. 테스트 숙제 데이터
-- =====================================================

INSERT INTO homework (class_id, title, description, textbook, start_page, end_page, due_date)
SELECT c.id, '이차함수 유형 연습', 'p.53~60 홀수번', '개념원리 수학 3-1', 53, 60, CURRENT_DATE + 3
FROM classes c WHERE c.name = '중3A반';

INSERT INTO homework (class_id, title, description, textbook, start_page, end_page, due_date)
SELECT c.id, '일차함수 복습', 'p.30~38 전체', '개념원리 수학 2-1', 30, 38, CURRENT_DATE + 5
FROM classes c WHERE c.name = '중2A반';

-- =====================================================
-- 6. 테스트 출결 데이터 (오늘 기준)
-- =====================================================

-- 중3A반 오늘 출결 (월요일 가정)
INSERT INTO attendance (class_id, student_id, date, status, note)
SELECT c.id, s.id, CURRENT_DATE, 'present', NULL
FROM classes c, students s
WHERE c.name = '중3A반' AND s.name = '박성빈';

INSERT INTO attendance (class_id, student_id, date, status, note)
SELECT c.id, s.id, CURRENT_DATE, 'present', NULL
FROM classes c, students s
WHERE c.name = '중3A반' AND s.name = '이사랑';

INSERT INTO attendance (class_id, student_id, date, status, note)
SELECT c.id, s.id, CURRENT_DATE, 'late', '10분 지각'
FROM classes c, students s
WHERE c.name = '중3A반' AND s.name = '윤서연';

-- =====================================================
-- 7. 테스트 공지사항
-- =====================================================

INSERT INTO announcements (title, content, announcement_date, is_pinned, show_in_calendar) VALUES
  ('12월 겨울방학 특강 안내', '겨울방학 특강 신청을 받습니다. 자세한 내용은 첨부 파일을 확인해주세요.', CURRENT_DATE, true, false),
  ('12월 시험 일정', '12월 정기 평가 일정입니다. 중3: 12/15, 중2: 12/16, 중1: 12/17', CURRENT_DATE - 3, false, true),
  ('학원 운영 시간 변경', '12월 24일~1월 1일 휴원합니다.', CURRENT_DATE - 7, false, false);

-- =====================================================
-- END OF SEED DATA
-- =====================================================
