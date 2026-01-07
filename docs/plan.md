# Hyeyum 백오피스 개발 계획

**최종 업데이트**: 2026-01-04
**목적**: 혜윰학원 백오피스 웹앱 개발 (강사용 + 관리자용)

---

## 전체 진행 현황

| Stage | 내용 | 상태 |
|-------|------|------|
| 1 | 강사용 모바일/태블릿 | ✅ 완료 |
| 2 | 관리자 모바일 목업 | ✅ 완료 |
| 3 | 관리자 PC 목업 (v5) | ✅ 완료 |
| 4 | 새 Supabase 통합 | ✅ 완료 |
| 5 | Timetable Studio 재설계 | ✅ 완료 |
| 6 | 메이크에듀 동기화 | ✅ 완료 |
| 7 | 과목별 반 배정 | ✅ 완료 |
| 8 | 인증 및 권한 시스템 | ✅ 완료 |
| 9 | 강사 관리 CRUD | ✅ 완료 |
| 10 | 사용자 관리 시스템 | ✅ 완료 |
| 11 | 반응형 통합 + 세션 관리 | ✅ 완료 |
| 12 | 순환수업 시스템 | ✅ 완료 |
| 13 | PC 대시보드 캘린더 UI | ✅ 완료 |
| 14 | 순환수업-대시보드 통합 | ✅ 완료 |
| 15 | 날짜 선택 기반 수업 조회 | ✅ 완료 |
| 16 | 캘린더 통합 공지사항 | ✅ 완료 |
| 17 | 공지 모달 + 중요 알림 미리보기 | ✅ 완료 |
| 18 | PDF 교재 뷰어 + 교재 관리 | ✅ 완료 |
| 19 | 시험 관리 시스템 (Supabase 연동) | ✅ 완료 |
| 20 | 월간 캘린더 | ✅ 완료 |
| 28 | 강사 캘린더 중요공지 반응형 표시 | ✅ 완료 |
| 29 | 역할 토글 + UI 통합 | ✅ 완료 |
| 30 | 공휴일 자동 휴강 시스템 | ✅ 완료 |
| 31 | 초등부 담임/부담임 시스템 | ✅ 완료 |
| 32 | 학년 승급 + 반 자동 승급 | ✅ 완료 |
| 33 | 상담 관리 시스템 | ✅ 완료 |
| 35 | 강사 대시보드 순환수업 연동 | ✅ 완료 |
| 36 | 강사 기록 페이지 Supabase 연결 | ✅ 완료 |
| 37 | 학생 상세 페이지 Supabase 연결 | ✅ 완료 |
| 38 | ClassesPage Mock 제거 | ✅ 완료 |
| 39 | Supabase 스키마 수정 (404/400 에러 해결) | ✅ 완료 |

> 완료된 Stage 상세: [plan-archive.md](plan-archive.md)

---

## 완료: Stage 39 - Supabase 스키마 수정 (404/400 에러 해결) ✅

> [에러 리포트](460_supabase_missing_tables_error_report.md) | [상세 개발 계획](461_supabase_schema_fix_development_plan.md)

### 목표
- 브라우저 콘솔의 Supabase 404/400 API 에러 해결
- 누락된 테이블 생성 (holidays, holiday_exceptions)
- 테이블명 차이 해결 (homework_submissions VIEW 생성)
- 컬럼명 불일치 수정 (notes → note)

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 39-A | holidays, holiday_exceptions 테이블 생성 (Supabase SQL) | ✅ |
| 39-B | homework_submissions VIEW 생성 (submissions 테이블 기반) | ✅ |
| 39-C | 프론트엔드 컬럼명 수정 (`notes` → `note`) | ✅ |
| 39-D | 테스트 및 검증 (404/400 에러 해결 확인) | ✅ |

### 해결된 에러

| 에러 | 테이블 | 해결 방법 |
|------|--------|----------|
| 404 | holidays | 테이블 생성 + 2025년 공휴일 17개 삽입 |
| 404 | holiday_exceptions | 테이블 생성 |
| 404 | homework_submissions | VIEW 생성 (submissions 테이블 참조) |
| 400 | attendance | `notes` → `note` 수정 |
| 400 | homework | homework_submissions VIEW로 해결 |

---

## 완료: Stage 37 - 학생 상세 페이지 Supabase 연결 ✅

> [상세 개발 계획](459_mock_data_supabase_connection_plan.md)
> **완료일**: 2026-01-04

### 구현 내용
- StudentDetailPage의 Mock 데이터를 Supabase 실데이터로 교체
- 학생 정보, 성적 기록, 활동 내역, 메모 기능 연결

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 37-A | 학생 기본 정보 + 통계 연결 (`useStudent`, `useStudentStats`) | ✅ |
| 37-B | 성적 기록 연결 (`useStudentScores`) | ✅ |
| 37-C | 활동 내역 연결 (`useStudentActivities`) | ✅ |
| 37-D | 메모 연결 (`useStudentNotes`, `useAddStudentNote`) | ✅ |

### 신규 훅

| 훅 | 파일 | 설명 |
|----|------|------|
| `useStudentStats` | `useStudents.ts` | 학생 통계 (출결률, 숙제률, 점수 추이) |
| `useStudentScores` | `useStudents.ts` | 학생 성적 시계열 데이터 |
| `useStudentActivities` | `useStudents.ts` | 학생 활동 내역 (출결+숙제+시험) |
| `useStudentNotes` | `useStudents.ts` | 학생 메모 조회 |
| `useAddStudentNote` | `useStudents.ts` | 학생 메모 추가 |

---

## 완료: Stage 38 - ClassesPage Mock 제거 ✅

> [상세 개발 계획](459_mock_data_supabase_connection_plan.md)
> **완료일**: 2026-01-04

### 구현 내용
- MOCK_CLASSES, MOCK_SESSIONS 상수 제거 (~150줄)
- classScheduleDates를 Supabase 세션 데이터 기반으로 변경
- filteredSessions를 Supabase 데이터만 사용하도록 수정

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 38-A | classScheduleDates Supabase 연결 | ✅ |

---

## 완료: Stage 30 - 공휴일 자동 휴강 시스템 ✅

> [연구 리포트](434_holiday_auto_management_research.md) | [상세 개발 계획](435_holiday_auto_management_development_plan.md)

### 목표
- 한국 공휴일 자동 휴강 처리
- 공휴일이지만 수업하는 날 예외 관리 (관리자용)
- 강사/관리자 대시보드에 휴강일 표시

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 30-A | holidays, holiday_exceptions 테이블 생성 (Migration) | ✅ |
| 30-B | checkHolidayStatus 함수 (예외 우선 체크) | ✅ |
| 30-C | useHolidayStatus, useHolidays 훅 | ✅ |
| 30-D | getHolidayEmoji 유틸리티 (공휴일별 이모지) | ✅ |
| 30-E | HolidayHeroCard 컴포넌트 | ✅ |
| 30-F | BackofficeDemo 휴강일 연동 (강사용) | ✅ |
| 30-G | AdminDashboard 휴강일 표시 (관리자용) | ✅ |

---

## 완료: Stage 16 - 캘린더 통합 공지사항 (DB 연동) ✅

> [상세 개발 계획](425_stage16_notice_db_development_plan.md)

### 구현 내용
- `notices` 테이블 생성 + RLS 정책 설정
- 공지사항 CRUD API (`api/notices.ts`)
- useAdminNotices, useCreateNotice Supabase 연결
- useUpdateNotice, useDeleteNotice 훅 추가
- NoticeItem 수정/삭제 메뉴 추가

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 16-A | notices 테이블 생성 (Migration) | ✅ |
| 16-B | 공지 API 훅 (api/notices.ts) | ✅ |
| 16-C | useAdminNotices Supabase 연결 | ✅ |
| 16-D | useCreateNotice Supabase 연결 | ✅ |
| 16-E | 공지 수정/삭제 기능 추가 | ✅ |

---

## 완료: Stage 36 - 강사 기록 페이지 Supabase 연결 ✅

> [상세 개발 계획](458_records_page_supabase_integration_plan.md)

### 목표
- 강사용 기록 페이지의 Mock 데이터를 Supabase 실데이터로 교체
- 진도/숙제/성적 탭 Supabase 연결 (출결은 이미 완료)

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 36-A | 진도 탭 Supabase 연결 (`useProgressForTeacherByDate`) | ✅ |
| 36-B | 숙제 탭 Supabase 연결 (직접 Supabase 쿼리) | ✅ |
| 36-C | 성적 탭 Supabase 연결 (직접 Supabase 쿼리) | ✅ |
| 36-D | 테스트 및 디버깅 | ✅ |

### 수정 파일

| 파일 | 수정 내용 |
|------|----------|
| `RecordsPage.tsx` | ProgressTab, HomeworkTab, GradeTab Supabase 연결 |

---

## 완료: Stage 33 - 상담 관리 시스템 ✅

> [연구 리포트](444_consultation_management_system_research.md) | [상세 개발 계획](445_consultation_management_development_plan.md)
> 목업: [신규상담](mockups/consultation_new_student.html) | [학생상담](mockups/consultation_existing_student.html)

### 목표
- 관리자 전용 상담 페이지 (신규상담/학생상담)
- 과목별 반배정 (국영수) - 다중 과목 선택 지원
- 등원 알림 (담당 선생님 + 과목별 관리자)
- 캘린더에 등원 예정 표시 (점 + 학생 이름 일부)

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 33-A | DB 마이그레이션 + 타입 (consultations, consultation_subjects, enrollment_notifications) | ✅ |
| 33-B | API 함수 + 훅 (useConsultations, useSubjectManagers) | ✅ |
| 33-C | 네비게이션 수정 (상담추가, 출결숨김) | ✅ |
| 33-D | 신규상담 폼 UI (과목별 반선택) | ✅ |
| 33-E | 학생상담 UI (기존 학생 검색, 이력) | ✅ |
| 33-F | 상담 목록 + 상세 모달 | ✅ |
| 33-G | 과목별 관리자 설정 UI (다중 선택) | ✅ |
| 33-H | 알림 생성 로직 (즉시 알림) - RPC confirm_enrollment | ✅ |
| 33-I | Railway Worker 스케줄러 (D-1, D-day) | ✅ |
| 33-J | 캘린더 등원 표시 | ✅ |

---

## 완료: Stage 32 - 학년 승급 + 반 자동 승급 ✅

> [연구 리포트](438_class_promotion_with_grade_research.md) | [상세 개발 계획](439_class_promotion_development_plan.md) | [빠른 배정 리포트](440_class_unassigned_quick_assignment_research.md) | [빠른 배정 계획](441_quick_assignment_development_plan.md)

### 목표
- 매년 3월 학년 일괄 승급 시 반(class)도 함께 자동 승급
- "중1 수학 심화" → "중2 수학 심화" 자동 매칭
- 번호 반(정규1, 정규2)은 수동 배정 필요로 표시
- 승급 후 반 해제된 학생 빠른 재배정 UI

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 32-A | class_parser.py (반 이름 파싱 유틸) | ✅ |
| 32-B | /preview/v2 API (반 승급 미리보기) | ✅ |
| 32-C | /execute/v2 API (반 승급 실행) | ✅ |
| 32-D | 프론트엔드 V2 타입 + API 함수 | ✅ |
| 32-E | usePromotionPreviewV2, useExecutePromotionV2 훅 | ✅ |
| 32-F | OperationsPage V2 UI 적용 | ✅ |
| 32-G | result step 빠른 배정 링크 | ✅ |
| 32-H | batch-assign API | ✅ |
| 32-I | assign step 퀵 배정 UI | ✅ |

---

## 완료: Stage 31 - 초등부 담임/부담임 시스템 ✅

> [연구 리포트](436_elementary_dual_teacher_research.md) | [상세 개발 계획](437_dual_teacher_development_plan.md)
> **완료일**: 2026-01-04

### 구현 내용
- 초등부 반에 담임(월/수/금)과 부담임(화/목) 배정
- 반관리 페이지에서 담임/부담임 선택 UI
- 강사 대시보드에서 오늘 요일 기준 담당 수업만 표시

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 31-A | classes 테이블 컬럼 추가 (homeroom_teacher_id, assistant_teacher_id) | ✅ |
| 31-B | TypeScript 타입 업데이트 (ClassData, CreateClassInput) | ✅ |
| 31-C | API 쿼리 수정 (담임/부담임 조인 추가) | ✅ |
| 31-D | ClassManagementPage 테이블 UI (초등부: 담임/부담임 컬럼) | ✅ |
| 31-E | EditClassModal 수정 (초등부: 담임/부담임 선택) | ✅ |
| 31-F | CreateClassModal 수정 (초등부: 담임/부담임 선택) | ✅ |
| 31-G | 강사 대시보드 필터링 (요일별 담당 수업) | ✅ |

### 구현된 파일
- `api/classes.ts`: homeroom_teacher_id, assistant_teacher_id 타입 + 조인 쿼리
- `CreateClassModal.tsx`, `EditClassModal.tsx`: 초등부 담임/부담임 선택 UI
- `BackofficeDemo.tsx`: 요일별 담임/부담임 필터링
- `useWeekData.ts`, `useAttendance.ts`, `useProgress.ts`: 강사 데이터 필터링

---

## 완료: Stage 29 - 역할 토글 + UI 통합 ✅

> [연구 리포트](432_role_toggle_unified_ui_research.md) | [상세 개발 계획](433_role_toggle_unified_ui_development_plan.md)

### 목표
- 관리자가 강사 모드로 전환하여 본인 수업 확인 가능
- 관리자 모바일 → 강사용 4탭 UI 사용
- PC/태블릿 헤더에 강사↔관리자 토글

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 29-A | viewModeStore 생성 (zustand + localStorage) | ✅ |
| 29-B | RoleToggle 컴포넌트 | ✅ |
| 29-C | HomePage 수정 (모바일 분기 제거) | ✅ |
| 29-D | App.tsx 라우팅 수정 (admin-mobile 숨김) | ✅ |
| 29-E | AdminResponsivePage + AdminTopNav 조건부 렌더링 | ✅ |
| 29-F | BackofficeDemo viewMode 연동 | ✅ |

---

## 완료: Stage 28 - 강사 캘린더 중요공지 반응형 표시

> [상세 개발 계획](430_teacher_calendar_notice_display_development_plan.md)

### 목표
- 강사용 캘린더에 중요공지를 반응형으로 표시
- **모바일**: 중요공지 점(dot) 표시
- **태블릿/PC**: 공지 제목 한 줄 표시 (최대 2개, 나머지 +N)

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 28-A | WeekCalendarGrid 개선 (태블릿 공지 텍스트 표시) | ✅ |
| 28-B | MonthlyCalendarModal 반응형 (모바일=점, 태블릿=텍스트) | ✅ |
| 28-C | DateSelector 중요공지 필터 (선택) | ⬜ |

---

## 완료: Stage 19 - 시험 관리 시스템 ✅

> [연구 리포트](419_exam_management_system_ux_research.md) | [상세 개발 계획](420_exam_management_development_plan.md) | [목업](mockups/exam_management_system.html)
> **완료일**: 2026-01-04 (Phase 19-H Supabase 연동)

### 구현 내용
- **시험 생성**: 기본정보 + 문항수 설정
- **O/X 채점**: 빠른 정오 입력 (키보드 지원)
- **결과 분석**: 점수 분포, 오답률 TOP 5, 순위
- **반배정**: 드래그&드롭으로 학생 배정
- **Supabase 연동**: exams, exam_answers 테이블 생성 및 API 연결

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 19-A | 타입 + Mock API + 훅 | ✅ |
| 19-B | 시험 목록 UI (카드형) | ✅ |
| 19-C | 시험 생성 모달 | ✅ |
| 19-D | 성적 입력 UI (O/X 그리드) | ✅ |
| 19-E | 결과 분석 UI | ✅ |
| 19-F | 반배정 UI (드래그&드롭) | ✅ |
| 19-G | 메인 페이지 + 라우팅 | ✅ |
| 19-H | Supabase 연동 | ✅ |

### 19-H Supabase 연동 상세
- **테이블 생성**: exams, exam_answers + RLS 정책
- **API 수정**: api/exams.ts Mock → Supabase 연결
- **기능**: 시험 CRUD, 답안 저장 (upsert), 통계 계산

---

## 완료: Stage 20 - 월간 캘린더 ✅

> [구현가능성 리포트](421_monthly_calendar_feasibility_report.md) | [상세 개발 계획](422_monthly_calendar_development_plan.md)

### 구현 내용
- "오늘" 버튼 → "월간" 버튼으로 변경
- 드롭다운 방식으로 월간 캘린더 표시 (42일 그리드)
- 반응형 공지 표시 (모바일: 점, PC: 텍스트)
- 날짜 선택 시 해당 주로 자동 이동 + 드롭다운 닫기
- 폰트 스타일 변형 2 적용 (18px/600, 셀 64px)

### Phase 목록

| Phase | 작업 | 상태 |
|-------|------|------|
| 20-A | 월간 날짜 유틸리티 (types, weekUtils) | ✅ |
| 20-B | MonthlyCalendarGrid 컴포넌트 | ✅ |
| 20-C | 주간 공지 데이터 훅 확장 (useMonthlyNotices) | ✅ |
| 20-D | WeeklyCalendar 통합 | ✅ |
| 20-E | 폰트 스타일 변형 2 적용 | ✅ |

---

## 최근 완료: Stage 15 - 날짜 선택 기반 수업 조회 ✅

> [상세 개발 계획](403_selected_date_rotation_development_plan.md) | [버그 분석](402_selected_date_rotation_bug_report.md)

### 구현 내용
- 캘린더 날짜 클릭 시 해당 날짜의 수업 표시
- 정규 수업 + 순환수업 모두 선택된 날짜 기준 조회
- 순환수업 주차 계산도 선택된 날짜 기준

| Phase | 작업 | 상태 |
|-------|------|------|
| 15-1 | rotationUtils: getRotationForDate 추가 | ✅ |
| 15-2 | useAdminData: useClassesByDate 추가 | ✅ |
| 15-3 | useAdminData: useTodayAllClasses 수정 | ✅ |
| 15-4 | AdminDashboard: selectedDate 전달 | ✅ |
| 15-5 | 빌드 테스트 및 검증 | ✅ |

---

## 이전 완료: Stage 14 - 순환수업-대시보드 통합 ✅

> [상세 개발 계획](401_rotation_dashboard_integration_plan.md)

### 구현 내용
- 순환수업을 관리자 대시보드 "오늘 수업 일정"에 자동 표시
- 정규 수업과 순환수업 시각적 구분 (보라색 배경)
- 주간 캘린더에 순환수업 요일 마커 표시
- 휴일 등록된 날짜는 취소선으로 표시

| Phase | 작업 | 상태 |
|-------|------|------|
| 14-1 | 타입 정의 (DashboardClass) | ✅ |
| 14-2 | 훅 확장 (useTodayAllClasses) | ✅ |
| 14-3 | UI 컴포넌트 수정 (AdminDashboard) | ✅ |
| 14-4 | 캘린더 마커 추가 (CalendarDayCell) | ✅ |
| 14-5 | 휴일 표시 최적화 | ✅ |

---

## 이전 완료: Stage 13 - PC 대시보드 캘린더 UI ✅

> [상세 개발 계획](400_pc_calendar_dashboard_development_plan.md) | [v5 목업](mockups/admin_pc_calendar_dashboard_v5_toss.html)

### 구현 내용
- PC 관리자 대시보드에 주간 캘린더 추가
- 캘린더에 공지사항 표시 (PC: 텍스트, 모바일: 점)
- Toss UX 철학 적용 (시각적 단순화, Progressive Disclosure, 속도감)
- KPI 카드 v5 스타일로 간소화

| Phase | 작업 | 상태 |
|-------|------|------|
| 13-1 | 타입 및 유틸리티 정의 | ✅ |
| 13-2 | 공지사항 데이터 훅 (useAdminNotices) | ✅ |
| 13-3 | WeeklyCalendar 컴포넌트 | ✅ |
| 13-4 | AdminDashboard 통합 + 날짜 연동 | ✅ |
| 13-5 | KPI 카드 간소화 (v5 스타일) | ✅ |
| 13-6 | 모바일 캘린더 점 표시 | ✅ |

---

## 예정 작업

### Stage 5: Timetable Studio 재설계

> [상세 개발 계획](426_timetable_studio_redesign_development_plan.md)

| 항목 | 내용 |
|------|------|
| **목적** | Mock UI를 토스 스타일 구조화된 시간표 편집기로 재설계 |
| **컨셉** | FigmaJam 무한 캔버스 → 구조화된 시간표 그리드 |
| **핵심 기능** | 드래그&드롭 슬롯 배정, 시나리오 비교 |
| **플랫폼** | PC + 태블릿 (모바일은 읽기 전용) |

| Phase | 작업 | 상태 |
|-------|------|------|
| 5-A | 기반 설정 (테이블, 타입, API, 훅) | ✅ |
| 5-B | 시나리오 관리 UI (목록, 생성, 탭) | ✅ |
| 5-C | 단일 시간표 그리드 (시간축, 요일, 셀) | ✅ |
| 5-D | 반/강사 팔레트 (필터, 드래그 아이템) | ✅ |
| 5-E | 할당 인터랙션 (클릭 배정, 삭제) | ✅ |
| 5-F | 다중 시간표 (탭/카드 전환) | ✅ |
| 5-G | 비교 뷰 (Split, 차이점 하이라이트) | ✅ |
| 5-H | 반응형 최적화 (태블릿/모바일) | ✅ |
| 5-I | 애니메이션 + 폴리시 | ✅ |

---

### Stage 8-6/7: RLS 정책 (완료)

| Phase | 작업 | 상태 |
|-------|------|------|
| 8-6 | 강사-수업 연결 (teacher_classes) | ✅ (classes.teacher_id로 구현) |
| 8-7 | 데이터 필터링 RLS (강사는 본인 학생만) | ✅ (pg_policies 확인됨) |

**구현된 RLS 정책:**
- `teachers_own_classes_select`: 강사는 본인 반만 조회
- `teachers_own_students_select`: 강사는 본인 학생만 조회
- `teachers_own_enrollments_select`: 강사는 본인 등록정보만 조회

---

## 핵심 문서

| 문서 | 내용 |
|------|------|
| [hyeyum-features.md](hyeyum-features.md) | 기능 명세 |
| [supabase-schema.md](supabase-schema.md) | DB 스키마 |
| [business-logic.md](business-logic.md) | 비즈니스 로직 |

## 최근 연구 문서

| 번호 | 문서 | 주제 |
|------|------|------|
| 430 | [teacher_calendar_notice_display_development_plan.md](430_teacher_calendar_notice_display_development_plan.md) | 강사 캘린더 중요공지 반응형 표시 개발 계획 |
| 426 | [timetable_studio_redesign_development_plan.md](426_timetable_studio_redesign_development_plan.md) | Timetable Studio 재설계 상세 계획 |
| 425 | [stage16_notice_db_development_plan.md](425_stage16_notice_db_development_plan.md) | 캘린더 공지사항 DB 연동 계획 |
| 461 | [supabase_schema_fix_development_plan.md](461_supabase_schema_fix_development_plan.md) | Supabase 스키마 수정 개발 계획 |
| 460 | [supabase_missing_tables_error_report.md](460_supabase_missing_tables_error_report.md) | Supabase 404/400 에러 분석 |
| 420 | [exam_management_development_plan.md](420_exam_management_development_plan.md) | 시험 관리 시스템 상세 개발 계획 |
| 419 | [exam_management_system_ux_research.md](419_exam_management_system_ux_research.md) | 시험 관리 시스템 UX 연구 |

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18, TypeScript, Vite |
| 스타일 | Tailwind CSS, 토스 디자인 시스템 |
| 상태관리 | Zustand, TanStack Query |
| 캐러셀 | Embla Carousel |
| Backend | Supabase (`rhejybeufojkfdfntpfg`) |

---

## 핵심 기술 패턴

### Mock Fallback 패턴

```typescript
const { data: realData, isLoading } = useClasses({ teacherId });
const classes = realData || MOCK_CLASSES;
```

### 훅 분리 패턴

```typescript
useClasses()        // 조회
useSaveProgress()   // 저장
useDashboardStats() // 통계
```

---

## 권한 체계

| 역할 | 코드 | 접근 범위 |
|------|------|----------|
| 강사 | `teacher` | 본인 수업 + 본인 학생만 |
| 관리자 | `admin` | 전체 수업/학생 |
| 원장 | `owner` | 전체 + 설정/정산/사용자관리 |

---

## 테스트 계정

| 이메일 | 비밀번호 | 역할 |
|--------|----------|------|
| owner@hyeyum.com | Test1234! | owner |
| admin@hyeyum.com | Test1234! | admin |
| teacher@hyeyum.com | Test1234! | teacher |

---

## 최근 완료 기록 (10개)

| 날짜 | Stage | 내용 |
|------|-------|------|
| 01-04 | 31 | 초등부 담임/부담임 시스템 (이미 구현됨 확인) |
| 01-04 | 8-6/7 | RLS 정책 (이미 구현됨 확인) |
| 01-04 | 19-H | 시험 관리 Supabase 연동 (exams/exam_answers 테이블) |
| 01-04 | 37 | 학생 상세 페이지 Supabase 연결 |
| 01-04 | 38 | ClassesPage Mock 제거 |
| 01-04 | 5 | Timetable Studio 재설계 완료 |
| 12-22 | 16 | 캘린더 통합 공지사항 DB 연동 |
| 12-22 | 20 | 월간 캘린더 (드롭다운 + 변형2 스타일) |
| 12-20 | 15 | 날짜 선택 기반 수업 조회 |
| 12-19 | 14 | 순환수업-대시보드 통합 |
| 12-19 | 13 | PC 대시보드 캘린더 UI |
| 12-19 | 12 | 순환수업 시스템 (DB + UI + 라우팅) |
| 12-18 | 11 | 반응형 통합 + 세션 관리 |
| 12-18 | 10 | 사용자 관리 시스템 (Supabase Auth) |
| 12-17 | 9 | 강사 관리 CRUD |
| 12-17 | 8 | 인증 및 권한 시스템 |
| 12-16 | 7 | 과목별 반 배정 (드래그&드롭) |
| 12-15 | 6 | 메이크에듀 동기화 (Railway Worker) |
| 12-15 | 4 | 새 Supabase 통합 |
| 12-14 | 3 | 관리자 PC 목업 (v5) |
| 12-14 | 2 | 관리자 모바일 목업 |

---

## 명령어 가이드

| 명령어 | 용도 |
|--------|------|
| `Phase X-Y 진행해줘` | 특정 Phase 작업 실행 |
| `opus thinkharder` | 깊은 분석, 리포트 작성 |
| `연구리포트 만들어줘` | 분석만 수행, 개발 진행 금지 |
| `단계별 개발 계획 만들어줘` | 상세 설계 후 개발 계획 작성 |

---

## 리팩토링: Phase 6 - Playwright E2E 테스트

> **목표**: 코드 정리 후 전체 기능이 정상 동작하는지 Playwright로 검증

| Step | 작업 | 상태 |
|------|------|------|
| 6-A | 로컬 서버 시작 (Frontend 3000 + Backend 7000) | ⬜ |
| 6-B | Playwright로 로그인 테스트 | ⬜ |
| 6-C | 강사 대시보드 기능 테스트 | ⬜ |
| 6-D | 관리자 대시보드 기능 테스트 | ⬜ |
| 6-E | Vercel 배포 확인 | ⬜ |

---

*Stage 1~39 전체 완료! + 리팩토링 Phase 5 완료*
