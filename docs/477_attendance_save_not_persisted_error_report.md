# 출결 저장이 유지되지 않는 오류 분석

## 오류 현상
- 출결을 입력하고 저장해도 다시 들어가면 저장된 내용이 표시되지 않음
- 서희주 선생님 계정에서 테스트 시 발생

## 발생 일시
2026-01-05

---

## 근본 원인 분석

### 1. 컬럼명 불일치 (Critical)

**Supabase 테이블 구조 (`attendance`):**
```
| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id          | uuid      | NO          |
| class_id    | uuid      | YES         |
| student_id  | uuid      | YES         |
| date        | date      | NO          |
| status      | varchar   | NO          |
| note        | text      | YES         |  ← "note" (단수형)
| created_at  | timestamp | YES         |
```

**코드에서 사용하는 컬럼명:**

| 파일 | 사용하는 컬럼명 | 올바른 컬럼명 |
|------|----------------|---------------|
| `useAttendance.ts` (line 93) | `notes` | `note` |
| `BackofficeDemo.tsx` (line 1089) | `notes` | `note` |

### 2. 문제 코드 위치

**useAttendance.ts:84-109** - `useSaveAttendance` 훅:
```typescript
export function useSaveAttendance() {
  return useMutation({
    mutationFn: async (records: {
      class_id: string;
      student_id: string;
      date: string;
      status: AttendanceStatus;
      notes?: string;  // ← 여기서 "notes"로 정의
    }[]) => {
      const { data, error } = await (supabase as any)
        .from('attendance')
        .upsert(records, {
          onConflict: 'class_id,student_id,date',
        });
      // ...
    },
  });
}
```

**BackofficeDemo.tsx:1073-1092** - 출결 저장 로직:
```typescript
const records = students
  .map((s) => {
    // ...
    return {
      class_id: classId,
      student_id: enrollment.student.id,
      date: dateStr,
      status: s.status,
      notes,  // ← "notes"로 전달 (테이블은 "note")
    };
  })
```

### 3. Upsert 동작 분석

현재 upsert 로직:
```typescript
.upsert(records, {
  onConflict: 'class_id,student_id,date',
})
```

- UNIQUE 제약조건: `attendance_class_id_student_id_date_key` (class_id, student_id, date)
- upsert 자체는 올바르게 설정됨
- **문제**: `notes` 필드가 테이블에 없으므로 해당 필드는 무시됨 (에러는 발생하지 않음)

### 4. 조회 시 문제

**useAttendance.ts:186-214** - 출결 조회:
```typescript
const { data: attendanceData, error: attError } = await supabase
  .from('attendance')
  .select('student_id, status, note')  // ← 조회는 "note"로 올바름
  .eq('class_id', cls.id)
  .eq('date', date)
  .in('student_id', studentIds);

// ...
type AttRow = { student_id: string; status: string; note?: string | null };
```

조회 로직은 올바르게 `note`를 사용하고 있음.

---

## 추가 발견 사항

### 기본값 표시 문제

**useAttendance.ts:201-215**:
```typescript
const records: AttendanceRecordData[] = studentList.map((student, index) => {
  const att = attMap.get(student.id);
  let status: RecordAttendanceStatus = 'present';  // ← 기본값: 출석

  if (att) {
    // 저장된 데이터가 있으면 해당 상태 사용
  }

  return {
    studentId: student.id,
    studentName: student.name,
    studentColor: STUDENT_COLORS[index % STUDENT_COLORS.length],
    status,  // ← 저장 안 되면 항상 'present' 표시
    note,
  };
});
```

- 저장이 실패해도 조회 시 기본값 `present`로 표시
- 사용자가 저장이 안 된 줄 모를 수 있음

---

## 수정 방안

### 즉시 수정 (Priority: Critical)

1. **useAttendance.ts** - 컬럼명 수정:
```typescript
// Before
notes?: string;

// After
note?: string;
```

2. **BackofficeDemo.tsx** - 저장 로직 수정:
```typescript
// Before
return {
  class_id: classId,
  student_id: enrollment.student.id,
  date: dateStr,
  status: s.status,
  notes,
};

// After
return {
  class_id: classId,
  student_id: enrollment.student.id,
  date: dateStr,
  status: s.status,
  note: notes,  // 변수명은 notes, 컬럼명은 note
};
```

---

## 영향 범위

| 파일 | 수정 필요 |
|------|----------|
| `frontend/src/hooks/backoffice/useAttendance.ts` | O (타입 정의) |
| `frontend/src/pages/BackofficeDemo.tsx` | O (저장 로직) |
| `frontend/src/pages/backoffice/RecordsPage.tsx` | 확인 필요 |

---

## 테스트 체크리스트

- [ ] 출결 저장 후 새로고침해도 유지되는지 확인
- [ ] 지각/결석/출석 모든 상태가 올바르게 저장되는지 확인
- [ ] 사유(note) 필드가 함께 저장되는지 확인
- [ ] Supabase에서 직접 데이터 확인
