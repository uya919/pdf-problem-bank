# 414. 중요 공지 캘린더 미리보기 개발 계획

> Stage 17-B: 중요 체크 + 캘린더 날짜 셀 미리보기

---

## Phase 17B-1: 타입 확장

### 수정 파일
- `frontend/src/types/admin.ts`

### 변경 내용
```typescript
// Notice 인터페이스에 추가
isImportant: boolean;  // 중요 체크 (캘린더 미리보기 표시)

// CreateNoticeInput에 추가
isImportant?: boolean;

// NoticeFormState에 추가
isImportant: boolean;
```

---

## Phase 17B-2: NoticeFormModal 수정

### 수정 파일
- `frontend/src/components/admin/notice/NoticeFormModal.tsx`

### 변경 내용
1. INITIAL_FORM_STATE에 `isImportant: false` 추가
2. 공지 유형 선택 아래에 중요 체크박스 추가
3. onSubmit에 isImportant 전달

---

## Phase 17B-3: useCreateNotice 수정

### 수정 파일
- `frontend/src/hooks/useCreateNotice.ts`

### 변경 내용
- createNoticeMock에서 isImportant 저장

---

## Phase 17B-4: useAdminNotices Mock 데이터 수정

### 수정 파일
- `frontend/src/hooks/useAdminNotices.ts`

### 변경 내용
- MOCK_NOTICES에 isImportant 필드 추가
- 일부 공지에 isImportant: true 설정

---

## Phase 17B-5: CalendarDayCell 확장

### 수정 파일
- `frontend/src/components/admin/dashboard/CalendarDayCell.tsx`

### 변경 내용
1. `importantNotice?: Notice | null` prop 추가
2. 미리보기 렌더링 (📌 + 제목 일부)
3. PC만 텍스트, 모바일은 아이콘

---

## Phase 17B-6: WeeklyCalendar 연동

### 수정 파일
- `frontend/src/components/admin/dashboard/WeeklyCalendar.tsx`

### 변경 내용
1. 주간 공지 데이터 조회 추가
2. 날짜별 중요 공지 계산
3. CalendarDayCell에 importantNotice 전달

---

## Phase 17B-7: 빌드 테스트

```bash
npm run build
```

---

*작성일: 2025-12-21*
