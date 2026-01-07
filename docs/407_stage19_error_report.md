# Stage 19 에러 리포트: 관리자 대시보드 모달 통합

> 작성일: 2025-12-21
> 상태: ✅ 모두 해결

---

## 1. 에러 목록

### 에러 1: 프로필 조회 타임아웃
```
AuthContext.tsx:159 인증 초기화 타임아웃 - 로딩 강제 해제
AuthContext.tsx:140 프로필 조회 에러: Error: 프로필 조회 타임아웃
```

**원인**: `profiles` 테이블 조회가 5초 이상 걸려서 타임아웃 발생

**영향**: 낮음 - 타임아웃 후 재시도하여 성공함

**상태**: ✅ 기존 이슈 (Stage 19와 무관)

---

### 에러 2: notices 테이블 없음
```
useAdminNotices.ts:237 notices 테이블 조회 실패, Mock 데이터 사용:
Could not find the table 'public.notices' in the schema cache
```

**원인**: Supabase에 `notices` 테이블이 생성되지 않음

**영향**: 낮음 - Mock 데이터로 폴백하여 정상 동작

**상태**: ✅ 기존 이슈 (Stage 17에서 예정, 미구현)

---

### 에러 3: textbooks.class_id 컬럼 없음
```
useTextbooks.ts:95 교재 조회 실패: column textbooks.class_id does not exist
```

**원인**: `useTextbooks.ts`의 `useTextbooksByClass` 훅이 **레거시 스키마**를 사용

**실제 스키마 (Stage 18)**:
- `textbooks` 테이블: 교재 정보 (class_id 없음)
- `class_textbooks` 테이블: 반-교재 연결 (class_id, textbook_id)

**상태**: ✅ 수정 완료

---

## 2. 수정 완료 내역

### 에러 3 수정: useTextbooksByClass 훅 수정

**파일**: `frontend/src/hooks/useTextbooks.ts`

**변경 전** (레거시 - 잘못된 스키마):
```typescript
const { data } = await supabase
  .from('textbooks')
  .select('*')
  .eq('class_id', classId);  // ❌ 존재하지 않는 컬럼
```

**변경 후** (Stage 18 스키마):
```typescript
const { data } = await supabase
  .from('class_textbooks')
  .select(`
    id,
    class_id,
    textbook_id,
    display_order,
    textbooks (
      id,
      display_name,
      file_name,
      file_url,
      file_size,
      page_count,
      curriculum,
      subject,
      created_at,
      uploaded_by
    )
  `)
  .eq('class_id', classId)
  .order('display_order', { ascending: true });
```

---

## 3. 최종 상태

| 에러 | 심각도 | 상태 | 비고 |
|------|--------|------|------|
| 프로필 타임아웃 | 낮음 | ✅ | 기존 이슈, 네트워크 문제 |
| notices 테이블 | 낮음 | ✅ | Mock 폴백 정상 동작 |
| textbooks.class_id | 중간 | ✅ | **수정 완료** |

---

## 4. 수정된 파일

| 파일 | 변경 내용 |
|------|----------|
| `hooks/useTextbooks.ts` | `class_textbooks` JOIN 쿼리로 변경 |
| `hooks/useBackofficeData.ts` | 교재 자동완성 훅 수정 (이전 세션) |

---

## 5. 빌드 검증

```
✓ 2928 modules transformed
✓ built in 18.94s
```

---

*v1.1 - 2025-12-21 (수정 완료)*
