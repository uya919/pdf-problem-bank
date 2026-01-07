# 409. 결석 공지 시스템 구현 가능성 연구 리포트

> **Stage 16 확장**: 결석 공지 + 자동 출결 연동 시스템

---

## 1. 요구사항 분석

### 1.1 사용자 요청 정리

| 기능 | 설명 |
|------|------|
| **@멘션 태그** | 결석 공지 작성 시 `@학생이름`으로 학생 지정 |
| **담당 강사 한정** | 해당 학생의 담당 강사만 공지 확인 가능 |
| **자동 출결 반영** | 공지 등록 시 해당 학생의 출석 상태를 "결석"으로 자동 변경 |
| **결석 사유 연동** | 공지에 입력한 사유가 출석 기록에도 자동 반영 |

### 1.2 사용 시나리오

```
1. 관리자가 결석 공지 작성
   - 제목: "홍길동 결석 예정"
   - 학생 태그: @홍길동
   - 사유: "병원 예약"
   - 날짜: 2024-12-21

2. 시스템 자동 처리
   - 홍길동의 담당 강사(들) 조회
   - 해당 강사들에게만 공지 표시
   - 12/21 홍길동의 모든 수업 출석을 "결석(사전)"으로 변경
   - 결석 사유에 "병원 예약" 자동 입력

3. 강사 확인
   - 담당 강사만 결석 공지 확인 가능
   - 출석부에서 이미 결석 처리된 상태 확인
```

---

## 2. 구현 가능성 분석

### 2.1 기술적 구현 가능 여부

| 기능 | 가능 여부 | 구현 복잡도 | 비고 |
|------|----------|-------------|------|
| @멘션 태그 UI | ✅ 가능 | 중간 | 자동완성 검색 UI 필요 |
| 학생-강사 매핑 | ✅ 가능 | 낮음 | 기존 enrollments 테이블 활용 |
| 담당 강사 필터링 | ✅ 가능 | 중간 | RLS 정책 또는 visibility 확장 |
| 자동 출결 반영 | ✅ 가능 | 높음 | 트리거 또는 Edge Function |
| 결석 사유 연동 | ✅ 가능 | 낮음 | attendance 테이블 note 필드 |

**결론: 기술적으로 모두 구현 가능**

### 2.2 필요한 데이터베이스 변경

#### 2.2.1 notices 테이블 확장

```sql
-- 기존 notices 테이블에 컬럼 추가
ALTER TABLE notices ADD COLUMN tagged_student_id UUID REFERENCES students(id);
ALTER TABLE notices ADD COLUMN absence_reason TEXT;
ALTER TABLE notices ADD COLUMN auto_attendance BOOLEAN DEFAULT FALSE;

-- 인덱스
CREATE INDEX idx_notices_tagged_student ON notices(tagged_student_id);
```

#### 2.2.2 notice_recipients 테이블 (신규)

```sql
-- 공지 수신자 테이블 (담당 강사 한정용)
CREATE TABLE notice_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(notice_id, teacher_id)
);

CREATE INDEX idx_notice_recipients_teacher ON notice_recipients(teacher_id);
CREATE INDEX idx_notice_recipients_notice ON notice_recipients(notice_id);
```

#### 2.2.3 attendance 테이블 확장 (기존 테이블)

```sql
-- 결석 사유 컬럼 추가 (없다면)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS absence_reason TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS source_notice_id UUID REFERENCES notices(id);
```

---

## 3. 시스템 아키텍처

### 3.1 데이터 흐름

```
┌──────────────────────────────────────────────────────────────┐
│                    결석 공지 등록 Flow                        │
└──────────────────────────────────────────────────────────────┘

  관리자                    Frontend                    Backend/Supabase
    │                         │                              │
    │  1. 결석 공지 작성       │                              │
    │  (@홍길동, 병원예약)     │                              │
    ├────────────────────────>│                              │
    │                         │  2. 학생 검색 (자동완성)       │
    │                         ├─────────────────────────────>│
    │                         │<─────────────────────────────┤
    │                         │  3. 담당 강사 조회             │
    │                         ├─────────────────────────────>│
    │                         │<─────────────────────────────┤
    │                         │                              │
    │                         │  4. 공지 저장 요청             │
    │                         ├─────────────────────────────>│
    │                         │                              │
    │                         │      ┌─────────────────────┐ │
    │                         │      │ Supabase Trigger    │ │
    │                         │      │ OR Edge Function    │ │
    │                         │      └─────────────────────┘ │
    │                         │                              │
    │                         │      5-a. notice_recipients  │
    │                         │           (담당 강사 등록)    │
    │                         │                              │
    │                         │      5-b. attendance 생성    │
    │                         │           (결석 + 사유)       │
    │                         │                              │
    │                         │<─────────────────────────────┤
    │<────────────────────────│  6. 완료 알림                 │
    │                         │                              │
```

### 3.2 담당 강사 조회 로직

```sql
-- 학생의 담당 강사 조회 (enrollments 기반)
SELECT DISTINCT t.id, t.name
FROM enrollments e
JOIN classes c ON e.class_id = c.id
JOIN teachers t ON c.teacher_id = t.id
WHERE e.student_id = :student_id
  AND e.is_active = TRUE
  AND c.is_active = TRUE;
```

### 3.3 자동 출결 처리 옵션

#### Option A: Supabase Database Trigger

```sql
-- 결석 공지 등록 시 자동 출석 처리
CREATE OR REPLACE FUNCTION handle_absence_notice()
RETURNS TRIGGER AS $$
BEGIN
  -- 결석 공지인 경우에만 처리
  IF NEW.type = 'absence' AND NEW.tagged_student_id IS NOT NULL THEN

    -- 1. 담당 강사 조회 및 수신자 등록
    INSERT INTO notice_recipients (notice_id, teacher_id)
    SELECT NEW.id, c.teacher_id
    FROM enrollments e
    JOIN classes c ON e.class_id = c.id
    WHERE e.student_id = NEW.tagged_student_id
      AND e.is_active = TRUE
      AND c.is_active = TRUE
    ON CONFLICT DO NOTHING;

    -- 2. 해당 날짜의 수업 출석을 결석으로 처리
    INSERT INTO attendance (
      student_id, class_id, date, status,
      absence_reason, source_notice_id, created_at
    )
    SELECT
      NEW.tagged_student_id,
      e.class_id,
      NEW.date,
      'absent_notified',  -- 사전 결석
      NEW.absence_reason,
      NEW.id,
      NOW()
    FROM enrollments e
    JOIN classes c ON e.class_id = c.id
    JOIN class_schedules cs ON cs.class_id = c.id
    WHERE e.student_id = NEW.tagged_student_id
      AND e.is_active = TRUE
      AND cs.day_of_week = EXTRACT(DOW FROM NEW.date::DATE)
    ON CONFLICT (student_id, class_id, date)
    DO UPDATE SET
      status = 'absent_notified',
      absence_reason = EXCLUDED.absence_reason,
      source_notice_id = EXCLUDED.source_notice_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_absence_notice_insert
  AFTER INSERT ON notices
  FOR EACH ROW
  EXECUTE FUNCTION handle_absence_notice();
```

#### Option B: Supabase Edge Function

```typescript
// supabase/functions/handle-absence-notice/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { notice } = await req.json();

  if (notice.type !== 'absence' || !notice.tagged_student_id) {
    return new Response(JSON.stringify({ skipped: true }));
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. 담당 강사 조회
  const { data: teachers } = await supabase
    .from('enrollments')
    .select('classes!inner(teacher_id)')
    .eq('student_id', notice.tagged_student_id)
    .eq('is_active', true);

  // 2. 수신자 등록
  const recipients = teachers?.map(t => ({
    notice_id: notice.id,
    teacher_id: t.classes.teacher_id,
  }));

  if (recipients?.length) {
    await supabase.from('notice_recipients').upsert(recipients);
  }

  // 3. 출석 결석 처리
  // ... (해당 날짜 수업 조회 및 출석 생성)

  return new Response(JSON.stringify({ success: true }));
});
```

#### Option C: Frontend + API (가장 단순)

```typescript
// Frontend에서 공지 저장 시 순차 처리
async function createAbsenceNotice(noticeData: AbsenceNoticeInput) {
  // 1. 공지 저장
  const { data: notice } = await supabase
    .from('notices')
    .insert(noticeData)
    .select()
    .single();

  // 2. 담당 강사 조회
  const { data: teachers } = await supabase
    .from('enrollments')
    .select('classes!inner(teacher_id)')
    .eq('student_id', noticeData.tagged_student_id)
    .eq('is_active', true);

  // 3. 수신자 등록
  const recipients = teachers?.map(t => ({
    notice_id: notice.id,
    teacher_id: t.classes.teacher_id,
  }));
  await supabase.from('notice_recipients').insert(recipients);

  // 4. 출석 결석 처리 (해당 날짜 수업 조회)
  const dayOfWeek = new Date(noticeData.date).getDay();
  const { data: classSchedules } = await supabase
    .from('class_schedules')
    .select('class_id')
    .eq('day_of_week', dayOfWeek)
    .in('class_id', /* 학생의 수강 반 목록 */);

  // 5. 출석 레코드 생성
  const attendanceRecords = classSchedules?.map(cs => ({
    student_id: noticeData.tagged_student_id,
    class_id: cs.class_id,
    date: noticeData.date,
    status: 'absent_notified',
    absence_reason: noticeData.absence_reason,
    source_notice_id: notice.id,
  }));
  await supabase.from('attendance').upsert(attendanceRecords);

  return notice;
}
```

---

## 4. 우려 사항 및 리스크

### 4.1 데이터 정합성 문제 ⚠️

| 문제 | 설명 | 심각도 | 해결책 |
|------|------|--------|--------|
| **공지 삭제 시 출석 복구** | 공지를 삭제하면 자동 생성된 결석 기록도 삭제해야 하는가? | 높음 | 소프트 삭제 + 경고 메시지 |
| **공지 수정 시 출석 동기화** | 날짜나 학생 변경 시 기존 출석 기록 처리 | 높음 | 수정 불가 또는 연쇄 업데이트 |
| **중복 공지 등록** | 같은 학생, 같은 날짜로 여러 공지 등록 | 중간 | UNIQUE 제약 또는 경고 |
| **수동 출석과 충돌** | 강사가 이미 수동으로 출석 체크한 경우 | 중간 | 덮어쓰기 전 확인 또는 우선순위 정책 |

### 4.2 비즈니스 로직 모호성 ⚠️

| 질문 | 고려 사항 |
|------|----------|
| **하루에 여러 수업이 있으면?** | 모든 수업을 결석 처리? 특정 수업만? |
| **특정 시간대만 결석이면?** | 오전만 결석, 오후는 출석 가능한 경우 |
| **공지 날짜 ≠ 결석 날짜?** | 공지 작성일과 실제 결석일이 다른 경우 |
| **지각/조퇴도 공지 가능?** | 결석 외 다른 출결 상태도 지원? |
| **반복 결석 (매주 수요일)?** | 정기적인 결석 패턴 지원 여부 |

### 4.3 권한 및 보안 ⚠️

| 문제 | 설명 | 해결책 |
|------|------|--------|
| **강사가 다른 학생 결석 공지 확인** | 담당하지 않는 학생 정보 노출 | RLS 정책 강화 |
| **관리자만 결석 공지 작성 가능?** | 강사도 작성 가능하게 할지 | visibility + 권한 정책 |
| **학생/학부모 접근** | 향후 학부모 앱에서 결석 공지 확인 | 별도 visibility 레벨 필요 |

### 4.4 UX 복잡성 ⚠️

| 문제 | 설명 |
|------|------|
| **@멘션 자동완성 성능** | 학생 수가 많으면 검색 지연 |
| **다중 학생 태그** | 여러 학생이 동시에 결석하는 경우 |
| **강사별 알림** | 담당 강사에게 푸시 알림 필요 여부 |
| **결석 공지 vs 일반 공지 UI** | 두 가지 공지 유형의 작성 폼 분리 |

### 4.5 시스템 복잡도 증가 ⚠️

```
현재 시스템:
  notices → (visibility) → 사용자

확장 후 시스템:
  notices → (visibility + tagged_student)
          → notice_recipients (담당 강사)
          → attendance (자동 생성)
          → (삭제/수정 시 연쇄 처리)
```

**복잡도 증가 요소**:
- 테이블 3개 추가/수정
- 트리거 또는 Edge Function 필요
- RLS 정책 복잡화
- 프론트엔드 @멘션 UI 개발
- 에러 처리 케이스 증가

---

## 5. 대안 비교

### 5.1 Option A: 완전 자동화 (요청된 방식)

```
공지 등록 → 자동 출결 → 담당 강사만 확인
```

| 장점 | 단점 |
|------|------|
| 원클릭 결석 처리 | 구현 복잡도 높음 |
| 관리자 업무 효율화 | 예외 케이스 처리 어려움 |
| 데이터 일관성 | 롤백/수정 복잡 |

### 5.2 Option B: 반자동화 (추천)

```
공지 등록 → 강사에게 알림 → 강사가 출석 확인
```

| 장점 | 단점 |
|------|------|
| 강사 최종 확인 가능 | 추가 클릭 필요 |
| 예외 상황 유연 처리 | 누락 가능성 |
| 구현 복잡도 낮음 | 완전 자동화보다 비효율 |

**추천 이유**: 강사가 "확인" 버튼을 누르면 출결 자동 반영. 실수 방지 + 책임 소재 명확.

### 5.3 Option C: 단순 공지 (최소 구현)

```
공지 등록 → 담당 강사만 확인 (출결은 수동)
```

| 장점 | 단점 |
|------|------|
| 가장 단순 | 수동 출결 필요 |
| 빠른 개발 | 중복 작업 |
| 리스크 최소 | 사용자 불편 |

---

## 6. 권장 구현 방안

### 6.1 1단계: 최소 기능 (MVP)

```
Phase 1: 담당 강사 한정 공지 (2-3일)
├── notices 테이블에 tagged_student_id 추가
├── notice_recipients 테이블 생성
├── 공지 작성 시 @멘션 UI (자동완성)
├── 담당 강사만 공지 조회 (RLS)
└── 출결 연동 없음 (수동 처리)
```

### 6.2 2단계: 출결 연동 (선택)

```
Phase 2: 자동 출결 (추가 1-2일)
├── attendance 테이블 확장
├── 공지 저장 시 출결 자동 생성
├── "출결 반영됨" 표시
└── 삭제 시 경고 메시지
```

### 6.3 3단계: 고급 기능 (향후)

```
Phase 3: 고급 기능
├── 다중 학생 태그 (@홍길동, @김철수)
├── 특정 수업만 결석 지정
├── 푸시 알림 연동
└── 결석 통계 대시보드
```

---

## 7. 결론 및 권장사항

### 7.1 구현 가능성

| 기능 | 가능 여부 | 권장 여부 |
|------|----------|----------|
| @멘션 태그 | ✅ 가능 | ✅ 권장 |
| 담당 강사 한정 | ✅ 가능 | ✅ 권장 |
| 자동 출결 반영 | ✅ 가능 | ⚠️ 2단계 권장 |
| 결석 사유 연동 | ✅ 가능 | ⚠️ 2단계 권장 |

### 7.2 권장 접근 방식

1. **1단계부터 시작**: @멘션 + 담당 강사 한정만 먼저 구현
2. **출결 연동은 검증 후**: 실제 사용 패턴 확인 후 2단계 진행
3. **수동 확인 옵션 유지**: 강사가 "확인" 버튼으로 출결 반영 (완전 자동 X)

### 7.3 주의 사항

- **공지 삭제/수정 정책 명확화** 필수
- **중복 결석 공지 처리 방안** 결정 필요
- **하루 여러 수업 결석 시 처리 방식** 확정 필요
- **테스트 데이터로 충분한 QA** 후 운영 적용

---

## 8. 다음 단계

사용자 결정 필요:

1. **1단계만 진행** vs **1+2단계 동시 진행**?
2. **자동 출결**을 원하면: 완전 자동 vs 강사 확인 후 반영?
3. **다중 학생 태그** 필요 여부?
4. **특정 수업만 결석 지정** 필요 여부?

---

*작성일: 2024-12-21*
*참조: Stage 16 캘린더 통합 공지사항*
