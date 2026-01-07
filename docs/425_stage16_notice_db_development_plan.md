# Stage 16: 캘린더 통합 공지사항 DB 연동 개발 계획

> 작성일: 2025-12-22
> Stage: 16
> 상태: 대기

---

## 1. 현재 상태 분석

### 1.1 구현 완료 (UI)
| 항목 | 파일 | 상태 |
|------|------|------|
| 공지 표시 UI | `ImportantNotices.tsx`, `GeneralNotices.tsx` | ✅ |
| 공지 등록 모달 | `NoticeFormModal.tsx` | ✅ |
| 공지 타입 선택 | `NoticeTypeSelector.tsx` | ✅ |
| 학생 태그 (결석용) | `StudentTag.tsx`, `StudentMention.tsx` | ✅ |
| 주간 공지 훅 | `useAdminNotices.ts` | ✅ (Mock) |
| 월간 공지 훅 | `useMonthlyImportantNotices` | ✅ (Mock) |
| 공지 생성 훅 | `useCreateNotice.ts` | ✅ (Mock) |

### 1.2 미구현 (DB 연동)
| 항목 | 상태 |
|------|------|
| notices 테이블 생성 | ⬜ |
| 공지 CRUD API (Supabase) | ⬜ |
| RLS 정책 | ⬜ |
| 훅 Supabase 연결 | ⬜ |

### 1.3 기존 Supabase 테이블 분석

**announcements 테이블 (기존)**:
```
id, title, content, category, date,
target_grade_ids[], target_class_ids[],
is_important, created_by, created_at
```

**Notice 타입 (프론트엔드)**:
```typescript
interface Notice {
  id: string;
  title: string;
  description?: string;
  date: string;           // 'YYYY-MM-DD'
  startTime?: string;     // 'HH:MM'
  endTime?: string;
  type: NoticeType;       // urgent, holiday, absence, exam, special, event, operation
  priority: number;
  visibility: NoticeVisibility;  // all, admin, teacher
  createdBy?: string;
  createdAt: string;
  isActive: boolean;
  isImportant: boolean;
}
```

### 1.4 테이블 설계 결정

**옵션 A**: `announcements` 테이블 확장
- 장점: 기존 데이터 유지
- 단점: 컬럼 추가 필요, 기존 로직 충돌 가능

**옵션 B**: 새 `notices` 테이블 생성 ✅ 권장
- 장점: 깔끔한 설계, 기존 시스템과 분리
- 단점: 새 테이블 필요

**결정**: 옵션 B - 새 `notices` 테이블 생성
- `announcements`는 기존 hyeyum 시스템용으로 유지
- `notices`는 백오피스 캘린더 전용

---

## 2. 데이터베이스 스키마

### 2.1 notices 테이블

```sql
CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 기본 정보
  title VARCHAR(200) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME,          -- 시간 지정 공지 (선택)
  end_time TIME,

  -- 분류
  type VARCHAR(20) NOT NULL CHECK (type IN (
    'urgent',     -- 긴급 (휴강, 강사 변경)
    'holiday',    -- 휴원 (공휴일, 방학)
    'absence',    -- 결석 알림
    'exam',       -- 시험 (모의고사, 레벨테스트)
    'special',    -- 특강, 보강
    'event',      -- 행사 (학부모 상담, 설명회)
    'operation'   -- 운영 (수강료, 교재 변경)
  )),

  priority INTEGER DEFAULT 0,  -- 높을수록 상단 표시

  -- 공개 범위
  visibility VARCHAR(10) NOT NULL DEFAULT 'all' CHECK (visibility IN (
    'all',      -- 전체
    'admin',    -- 관리자 전용
    'teacher'   -- 강사 전용
  )),

  -- 중요 표시 (캘린더 미리보기)
  is_important BOOLEAN DEFAULT FALSE,

  -- 결석 공지용 (선택)
  tagged_student_id UUID REFERENCES students(id),
  absence_reason TEXT,

  -- 대상 필터 (선택)
  target_grade_ids UUID[],
  target_class_ids UUID[],

  -- 메타
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notices_date ON notices(date);
CREATE INDEX idx_notices_type ON notices(type);
CREATE INDEX idx_notices_visibility ON notices(visibility);
CREATE INDEX idx_notices_active_date ON notices(is_active, date);
```

### 2.2 RLS 정책

```sql
-- RLS 활성화
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- SELECT: 인증된 사용자 + 권한 필터
CREATE POLICY "notices_select" ON notices FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active = true
    AND (
      visibility = 'all'
      OR (visibility = 'admin' AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')
      ))
      OR (visibility = 'teacher' AND EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid()
      ))
    )
  );

-- INSERT: admin/owner만
CREATE POLICY "notices_insert" ON notices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- UPDATE: admin/owner만
CREATE POLICY "notices_update" ON notices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- DELETE: owner만
CREATE POLICY "notices_delete" ON notices FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );
```

---

## 3. Phase 목록

| Phase | 작업 | 예상 파일 |
|-------|------|-----------|
| 16-A | notices 테이블 생성 (Migration) | Supabase SQL |
| 16-B | 공지 API 훅 (CRUD) | `frontend/src/api/notices.ts` |
| 16-C | useAdminNotices Supabase 연결 | `useAdminNotices.ts` 수정 |
| 16-D | useCreateNotice Supabase 연결 | `useCreateNotice.ts` 수정 |
| 16-E | 공지 수정/삭제 기능 추가 | 새 훅 + UI |
| 16-F | 통합 테스트 + 버그 수정 | - |

---

## 4. Phase 상세

### Phase 16-A: notices 테이블 생성

**작업 내용**:
1. Supabase SQL Editor에서 마이그레이션 실행
2. RLS 정책 설정

**SQL 코드**: (섹션 2 참조)

**검증**:
```sql
-- 테이블 확인
SELECT * FROM notices LIMIT 1;

-- RLS 확인
SELECT * FROM pg_policies WHERE tablename = 'notices';
```

---

### Phase 16-B: 공지 API 훅

**신규 파일**: `frontend/src/api/notices.ts`

```typescript
/**
 * 공지사항 API
 *
 * Stage 16: 캘린더 통합 공지사항 DB 연동
 */

import { supabase } from '@/lib/supabase';
import type { Notice, CreateNoticeInput, NoticeVisibility } from '@/types/admin';

// =====================================================
// 타입 변환
// =====================================================

interface NoticeRow {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  type: string;
  priority: number;
  visibility: string;
  is_important: boolean;
  tagged_student_id: string | null;
  absence_reason: string | null;
  target_grade_ids: string[] | null;
  target_class_ids: string[] | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function rowToNotice(row: NoticeRow): Notice {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    date: row.date,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    type: row.type as Notice['type'],
    priority: row.priority,
    visibility: row.visibility as Notice['visibility'],
    isImportant: row.is_important,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    isActive: row.is_active,
  };
}

// =====================================================
// API 함수
// =====================================================

/**
 * 날짜 범위로 공지 조회
 */
export async function fetchNotices(params: {
  startDate: string;
  endDate: string;
  visibility?: NoticeVisibility[];
}): Promise<Notice[]> {
  const { startDate, endDate, visibility = ['all', 'admin', 'teacher'] } = params;

  const { data, error } = await supabase
    .from('notices')
    .select('*')
    .eq('is_active', true)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('visibility', visibility)
    .order('priority', { ascending: false })
    .order('date', { ascending: true });

  if (error) throw error;

  return (data as NoticeRow[]).map(rowToNotice);
}

/**
 * 공지 생성
 */
export async function createNotice(input: CreateNoticeInput): Promise<Notice> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('notices')
    .insert({
      title: input.title,
      description: input.description,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      type: input.type,
      priority: input.type === 'urgent' ? 100 : 50,
      visibility: input.visibility,
      is_important: input.isImportant ?? false,
      tagged_student_id: input.taggedStudentId,
      absence_reason: input.absenceReason,
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error) throw error;

  return rowToNotice(data as NoticeRow);
}

/**
 * 공지 수정
 */
export async function updateNotice(
  id: string,
  input: Partial<CreateNoticeInput>
): Promise<Notice> {
  const { data, error } = await supabase
    .from('notices')
    .update({
      title: input.title,
      description: input.description,
      date: input.date,
      start_time: input.startTime,
      end_time: input.endTime,
      type: input.type,
      visibility: input.visibility,
      is_important: input.isImportant,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return rowToNotice(data as NoticeRow);
}

/**
 * 공지 삭제 (soft delete)
 */
export async function deleteNotice(id: string): Promise<void> {
  const { error } = await supabase
    .from('notices')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}
```

**의존성**: 없음 (신규 파일)

---

### Phase 16-C: useAdminNotices Supabase 연결

**수정 파일**: `frontend/src/hooks/useAdminNotices.ts`

**변경 내용**:
1. Mock 데이터 로직 제거
2. `fetchNotices` API 호출
3. 에러 처리 (테이블 없을 때 graceful 처리)

**핵심 변경**:
```typescript
// 기존
const mockNotices = generateMockNotices();

// 변경
import { fetchNotices } from '@/api/notices';

// queryFn 내부
const notices = await fetchNotices({
  startDate: weekRange.start,
  endDate: weekRange.end,
  visibility: userRole === 'admin'
    ? ['all', 'admin', 'teacher']
    : ['all', 'teacher'],
});
return groupNoticesByDate(notices);
```

---

### Phase 16-D: useCreateNotice Supabase 연결

**수정 파일**: `frontend/src/hooks/useCreateNotice.ts`

**변경 내용**:
1. Mock 저장소 제거
2. `createNotice` API 호출
3. TanStack Query 캐시 무효화

**핵심 변경**:
```typescript
// 기존
const notice = await createNoticeMock(input);

// 변경
import { createNotice as createNoticeApi } from '@/api/notices';
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const notice = await createNoticeApi(input);

// 캐시 무효화
queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });
```

---

### Phase 16-E: 공지 수정/삭제 기능

**신규 파일**:
- `frontend/src/hooks/useUpdateNotice.ts`
- `frontend/src/hooks/useDeleteNotice.ts`

**UI 변경**:
- `NoticeItem.tsx`: 수정/삭제 버튼 추가
- `NoticeFormModal.tsx`: 수정 모드 지원 (editingNotice prop)

**핵심 구현**:
```typescript
// useUpdateNotice.ts
export function useUpdateNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateNoticeInput> }) =>
      updateNotice(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });
    },
  });
}

// useDeleteNotice.ts
export function useDeleteNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteNotice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });
    },
  });
}
```

---

### Phase 16-F: 통합 테스트

**테스트 체크리스트**:
- [ ] 공지 생성 → 캘린더에 표시
- [ ] 중요 공지 → 캘린더 셀에 미리보기
- [ ] 월간 캘린더 → 공지 있는 날짜 표시
- [ ] 공지 수정 → 변경 사항 반영
- [ ] 공지 삭제 → 목록에서 제거
- [ ] 권한별 필터링 (admin/teacher)
- [ ] 에러 처리 (네트워크 오류)

---

## 5. 파일 생성/수정 순서

```
1. [Supabase] notices 테이블 생성 (Phase 16-A)
     ↓
2. [신규] frontend/src/api/notices.ts (Phase 16-B)
     ↓
3. [수정] frontend/src/hooks/useAdminNotices.ts (Phase 16-C)
     ↓
4. [수정] frontend/src/hooks/useCreateNotice.ts (Phase 16-D)
     ↓
5. [신규] frontend/src/hooks/useUpdateNotice.ts (Phase 16-E)
6. [신규] frontend/src/hooks/useDeleteNotice.ts (Phase 16-E)
7. [수정] NoticeItem.tsx - 수정/삭제 버튼 (Phase 16-E)
8. [수정] NoticeFormModal.tsx - 수정 모드 (Phase 16-E)
     ↓
9. [테스트] 통합 테스트 (Phase 16-F)
```

---

## 6. 예상 에러 및 해결책

| 에러 | 원인 | 해결 |
|------|------|------|
| `relation "notices" does not exist` | 테이블 미생성 | Phase 16-A 실행 |
| `permission denied for table notices` | RLS 정책 미설정 | RLS 정책 추가 |
| `new row violates check constraint` | type 값 오류 | type enum 확인 |
| 캐시 업데이트 안됨 | invalidateQueries 누락 | queryKey 확인 |
| visibility 필터 안됨 | RLS 정책 조건 오류 | 정책 수정 |

---

## 7. 환경변수

기존 환경변수 사용 (추가 없음):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## 8. 참조 문서

- [413_important_notice_calendar_preview_research.md](413_important_notice_calendar_preview_research.md)
- [414_important_notice_preview_development_plan.md](414_important_notice_preview_development_plan.md)
- [supabase-schema.md](supabase-schema.md)

---

*작성: Claude Code | Stage 16 개발 계획*
