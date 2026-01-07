# 상담 관리 시스템 연구 리포트

> 작성일: 2025-12-27
> 목적: 관리자 전용 상담 페이지 + 신규 등원 알림 시스템 분석

---

## 1. 요구사항 요약

### 1.1 상담 페이지 기본 요구사항

| 항목 | 내용 |
|------|------|
| 접근 권한 | 관리자 전용 (강사 모드에서 숨김) |
| 위치 | 관리자 네비게이션에 추가 |
| 구조 | 좌측 사이드바: 신규상담 / 학생상담 |

### 1.2 신규상담 폼 필드

| 필드명 | 필수 | 타입 | 비고 |
|--------|------|------|------|
| 학생 이름 | ✅ | text | - |
| 학년 | - | select | grades 테이블 연동 |
| 학교명 | - | text | - |
| 상담 일자 | ✅ | date | - |
| 학생 휴대폰 | - | tel | - |
| 보호자 연락처 | - | tel | - |
| 희망 수업 요일/시간 | - | text | 예: 월수금 오후 5시 |
| 수강 과목 | - | multi-select | subjects 테이블 연동 |
| 반배정 | - | select | classes 테이블 연동 |
| 비고 | - | textarea | - |

### 1.3 학생상담

- 기존 등록 학생 검색/선택
- 상담 이력 조회/추가
- 상담 내용 기록

### 1.4 신규 등원 알림 시스템

```
상담 완료 → 등원 날짜 확정 → 담당 반 선생님께 알림

알림 타이밍:
1. 등원 날짜 확정 시 (즉시)
2. 등원 전날 (D-1)
3. 등원 당일 (D-day)

알림 내용:
"신규 ㅁㅁㅁ학생 ㅁ월 ㅁ일 신규 등원 예정"
```

---

## 2. 현재 시스템 분석

### 2.1 관련 기존 기능

| 기능 | 파일 | 상태 |
|------|------|------|
| 역할 토글 (강사/관리자) | `RoleToggle.tsx` | ✅ 구현됨 |
| 관리자 네비게이션 | `AdminSidebar.tsx` | ✅ 구현됨 |
| 공지 시스템 | `notices` 테이블 | ✅ 구현됨 |
| 학생 관리 | `students` 테이블 | ✅ 구현됨 |
| 반 배정 | `enrollments` 테이블 | ✅ 구현됨 |

### 2.2 네비게이션 구조 (현재)

**강사 모드:**
- 대시보드
- 수업 관리
- 학생 관리
- 출결 관리 ← 숨김 예정

**관리자 모드:**
- 대시보드
- 수업 관리
- 학생 관리
- 출결 관리 ← 숨김 예정
- 운영 관리
- **상담 관리** ← 추가 예정 (관리자 전용)

---

## 3. 데이터베이스 설계

### 3.1 신규 테이블: `consultations`

```sql
CREATE TABLE consultations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 상담 대상 (신규 or 기존 학생)
  student_id UUID REFERENCES students(id),  -- NULL이면 신규 상담

  -- 신규 상담 시 학생 정보
  student_name VARCHAR(100),
  grade_id UUID REFERENCES grades(id),
  school_name VARCHAR(100),
  student_phone VARCHAR(20),
  parent_phone VARCHAR(20),

  -- 상담 정보
  consultation_date DATE NOT NULL,
  preferred_schedule TEXT,  -- "월수금 오후 5시"
  subjects UUID[],          -- subject_id 배열
  assigned_class_id UUID REFERENCES classes(id),
  notes TEXT,

  -- 등원 정보
  enrollment_date DATE,     -- 확정된 등원 날짜
  enrollment_status VARCHAR(20) DEFAULT 'pending',
  -- pending: 상담 중
  -- confirmed: 등원 확정
  -- enrolled: 등원 완료
  -- cancelled: 취소

  -- 메타
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 신규 테이블: `enrollment_notifications`

```sql
CREATE TABLE enrollment_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID REFERENCES consultations(id),

  -- 알림 대상
  teacher_id UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),

  -- 알림 내용
  student_name VARCHAR(100),
  enrollment_date DATE,

  -- 알림 스케줄
  notification_type VARCHAR(20),  -- 'immediate', 'd-1', 'd-day'
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. 구현 가능성 분석

### 4.1 상담 페이지 (✅ 구현 가능)

| 항목 | 난이도 | 비고 |
|------|--------|------|
| 관리자 전용 라우팅 | 쉬움 | 역할 체크 로직 추가 |
| 신규상담 폼 | 쉬움 | 기존 폼 패턴 재사용 |
| 학생상담 (기존 학생 검색) | 보통 | 학생 검색 API 필요 |
| 상담 CRUD | 쉬움 | 표준 CRUD 패턴 |

### 4.2 신규 등원 알림 시스템

| 항목 | 난이도 | 구현 방식 |
|------|--------|----------|
| 즉시 알림 | 쉬움 | 등원 확정 시 notices 테이블에 INSERT |
| D-1, D-day 알림 | **보통~어려움** | 스케줄러 필요 |

#### 알림 스케줄링 방식 비교

| 방식 | 장점 | 단점 |
|------|------|------|
| **A. 서버 크론잡** | 안정적, 정확한 시간 | Railway/Supabase에서 별도 설정 필요 |
| **B. Supabase Edge Function + pg_cron** | Supabase 네이티브 | pg_cron 확장 필요, Pro 플랜 |
| **C. 클라이언트 폴링** | 구현 쉬움 | 앱 열려 있어야 함, 비효율적 |
| **D. Railway Worker 확장** | 기존 인프라 활용 | 이미 Railway Worker 있음 ✅ |

**권장: 방식 D (Railway Worker 확장)**

현재 `railway-worker`가 이미 존재하므로, 여기에 스케줄러 기능을 추가하는 것이 가장 효율적입니다.

```python
# railway-worker/scheduler.py (예시)
async def check_enrollment_notifications():
    """매일 아침 실행되는 알림 체크"""
    today = datetime.now().date()
    tomorrow = today + timedelta(days=1)

    # D-1 알림: 내일 등원 예정인 학생
    d1_consultations = await get_consultations_by_date(tomorrow)
    for c in d1_consultations:
        await send_notification(c, 'd-1')

    # D-day 알림: 오늘 등원 예정인 학생
    dday_consultations = await get_consultations_by_date(today)
    for c in dday_consultations:
        await send_notification(c, 'd-day')
```

---

## 5. 우려 사항 및 해결 방안

### 5.1 알림 전송 누락

| 우려 | 해결 |
|------|------|
| Railway Worker 중단 시 알림 누락 | `is_sent` 플래그로 재시도 로직 구현 |
| 중복 알림 | `sent_at` 타임스탬프로 중복 방지 |

### 5.2 시간대 문제

| 우려 | 해결 |
|------|------|
| UTC vs KST 혼동 | 모든 시간을 KST로 저장, 서버에서 KST 기준 처리 |
| 알림 시간 (아침 몇 시?) | 설정 가능하게 (기본: 오전 9시) |

### 5.3 담당 선생님 특정

| 우려 | 해결 |
|------|------|
| 반에 여러 선생님 | `classes.teacher_id` 기준 (담당 강사) |
| 초등부 담임/부담임 | 둘 다에게 알림 전송 |

### 5.4 알림 수신 방식

| 방식 | 현재 상태 | 비고 |
|------|----------|------|
| 인앱 공지 | ✅ 가능 | `notices` 테이블 활용 |
| 푸시 알림 | ❌ 미구현 | PWA 푸시 필요 (추후) |
| 카카오톡 | ❌ 미구현 | 알림톡 API 필요 (추후) |

**1차 구현: 인앱 공지 방식 (notices 테이블)**

---

## 6. 질문 사항

### Q1. 상담 후 학생 등록 프로세스

```
신규 상담 → 등원 확정 → 학생 자동 등록?
```

**옵션:**
- A: 상담 시 바로 students 테이블에 INSERT (비활성 상태)
- B: 등원 확정 시 students 테이블에 INSERT
- C: 수동으로 학생 등록 후 연결

**권장: 옵션 B** - 등원 확정 시 자동 학생 등록

### Q2. 학생상담 범위

- 기존 학생의 상담 이력만 기록?
- 진도 상담, 학부모 상담 등 유형 구분 필요?
- 상담 예약 기능 필요?

### Q3. 알림 대상 범위

- 담당 반 선생님만?
- 원장/매니저도 포함?
- 학부모 알림 (카카오톡)?

---

## 7. UI/UX 목업 계획

### 7.1 목업 파일 구조

```
docs/mockups/
├── consultation_new_student.html      # 신규상담 폼
├── consultation_existing_student.html # 학생상담 (기존 학생)
├── consultation_list.html             # 상담 목록
└── enrollment_notification.html       # 등원 알림 미리보기
```

### 7.2 신규상담 화면 레이아웃

```
┌─────────────────────────────────────────────────────────┐
│ [관리자 상단 네비게이션]                                 │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ 📋 상담  │  신규 상담 등록                               │
│          │  ──────────────────────────────────────────  │
│ > 신규상담│                                              │
│   학생상담│  [학생 정보]                                 │
│          │  학생 이름 *  [________________]              │
│          │  학년        [선택 ▼]                         │
│          │  학교명      [________________]              │
│          │                                              │
│          │  [연락처]                                    │
│          │  학생 휴대폰  [________________]              │
│          │  보호자 연락처 [________________]             │
│          │                                              │
│          │  [상담 정보]                                 │
│          │  상담 일자 *  [2025-12-27]                   │
│          │  희망 요일/시간 [월수금 오후 5시]             │
│          │  수강 과목    [□수학 □영어 □국어]            │
│          │  반배정      [선택 ▼]                        │
│          │                                              │
│          │  [등원 정보]                                 │
│          │  등원 예정일  [2025-01-02]                   │
│          │  ☑ 등원 확정 시 담당 선생님께 알림            │
│          │                                              │
│          │  비고                                        │
│          │  [                                     ]     │
│          │  [                                     ]     │
│          │                                              │
│          │  [취소]                    [상담 저장]       │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### 7.3 알림 미리보기

```
┌─────────────────────────────────────────┐
│ 🔔 새 알림                              │
├─────────────────────────────────────────┤
│ 📌 신규 등원 안내                        │
│                                         │
│ 신규 김민수 학생이                       │
│ 1월 2일 (목) 고1 수학 기초반에           │
│ 등원 예정입니다.                         │
│                                         │
│ 등원 예정일: 2025-01-02                 │
│ 배정 반: 고1 수학 기초반                 │
│ 보호자 연락처: 010-1234-5678            │
│                                         │
│                           [확인]        │
└─────────────────────────────────────────┘
```

---

## 8. 개발 단계 제안

### Stage 33: 상담 관리 시스템

| Phase | 내용 | 예상 작업량 |
|-------|------|------------|
| Phase 1 | 네비게이션 수정 (출결 숨김, 상담 추가) | 소 |
| Phase 2 | DB 테이블 생성 (consultations) | 소 |
| Phase 3 | 신규상담 폼 UI | 중 |
| Phase 4 | 신규상담 CRUD API | 중 |
| Phase 5 | 학생상담 UI (기존 학생 검색) | 중 |
| Phase 6 | 등원 확정 시 즉시 알림 | 소 |
| Phase 7 | Railway Worker 스케줄러 (D-1, D-day) | 중~대 |
| Phase 8 | 알림 목록 UI | 소 |

---

## 9. 결론

### 구현 가능성: ✅ 가능

| 기능 | 가능성 | 난이도 |
|------|--------|--------|
| 관리자 전용 상담 페이지 | ✅ | 쉬움 |
| 신규상담 폼 | ✅ | 쉬움 |
| 학생상담 (기존 학생) | ✅ | 보통 |
| 즉시 알림 | ✅ | 쉬움 |
| D-1, D-day 스케줄 알림 | ✅ | 보통 |

### 권장 구현 순서

1. **목업 제작** → 사용자 확인
2. **Phase 1-4**: 신규상담 기본 기능
3. **Phase 5**: 학생상담
4. **Phase 6-7**: 알림 시스템
5. **Phase 8**: 알림 UI

---

## 10. 다음 단계

목업 파일을 먼저 제작하여 UI/UX를 확인하시겠습니까?

- [ ] `consultation_new_student.html` - 신규상담 폼
- [ ] `consultation_existing_student.html` - 학생상담
- [ ] `enrollment_notification.html` - 등원 알림

---

*v1.0 - 2025-12-27*
