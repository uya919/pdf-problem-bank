# Hooks - Data Management Layer

Custom React hooks for Supabase data operations and client state.

---

## Module Context

**Role**: Bridge between React components and Supabase database. All async data operations go through hooks.

**Dependencies**:
- TanStack Query (useQuery, useMutation)
- Supabase JS client
- Zustand (for auth state only)

---

## Directory Structure

```
hooks/
├── index.ts                 # Barrel file (re-exports admin + backoffice)
│
├── admin/                   # Admin PC/Mobile hooks (refactored)
│   ├── index.ts             # Admin barrel file
│   ├── types.ts             # Shared types (160 lines)
│   ├── useAdminTodayClasses.ts   # Today's classes queries
│   ├── useAdminGradeData.ts      # Grade stats/classes
│   ├── useAdminClassRecords.ts   # Progress records
│   ├── useAdminMobileData.ts     # Mobile data queries
│   ├── useAdminKPI.ts            # KPI metrics
│   └── useAdminDashboard.ts      # Dashboard aggregation
│
├── backoffice/              # Teacher-facing hooks (Supabase connected)
│   ├── index.ts             # Barrel file
│   ├── types.ts             # Shared types
│   ├── useAttendance.ts     # Attendance CRUD
│   ├── useProgress.ts       # Progress tracking
│   ├── useHomework.ts       # Homework management
│   ├── useClasses.ts        # Class queries
│   └── useWeekData.ts       # Weekly data aggregation
│
├── useAdminData.ts          # Re-export from admin/ (deprecated)
├── useAuth.ts               # Authentication state
├── useClasses.ts            # Shared class hooks
├── useBackofficeData.ts     # Re-export (deprecated)
├── useDocuments.ts          # Document/PDF metadata
└── useTextbooks.ts          # Textbook management
```

---

## Implementation Patterns

### Query Hook Template
```typescript
/**
 * Fetch attendance records for a class on a specific date
 */
export function useAttendanceByClassAndDate(
  classId: string | null,
  date: string | null
) {
  return useQuery({
    queryKey: ['attendance', 'class', classId, 'date', date],
    queryFn: async () => {
      if (!classId || !date) return [];

      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status, note')
        .eq('class_id', classId)
        .eq('date', date);

      if (error) throw error;
      return data;
    },
    enabled: isSupabaseConfigured && !!classId && !!date,
  });
}
```

### Mutation Hook Template
```typescript
/**
 * Save attendance records with upsert
 */
export function useSaveAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (records: AttendanceRecord[]) => {
      const { data, error } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'class_id,student_id,date' });

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
```

---

## Query Key Conventions

| Pattern | Example | Use Case |
|---------|---------|----------|
| `[entity]` | `['classes']` | All classes |
| `[entity, id]` | `['classes', 'abc123']` | Single class |
| `[entity, filter, value]` | `['attendance', 'date', '2025-01-07']` | Filtered list |
| `[entity, subtype, ...params]` | `['attendance', 'class', id, 'date', date]` | Complex query |

### Invalidation Rules
- `invalidateQueries({ queryKey: ['attendance'] })` - Invalidates ALL attendance queries
- `refetchQueries({ predicate })` - Force immediate refetch
- Always invalidate after mutations

---

## Local Golden Rules

### Do's
- Always check `enabled` condition before query
- Use explicit return types
- Handle null/undefined inputs gracefully
- Invalidate related queries on mutation success
- Add docstring with JSDoc format

### Don'ts
- Don't call Supabase directly in components
- Don't forget to handle error state
- Don't use `any` for Supabase responses
- Don't create hooks over 200 lines
- Don't mix query and mutation in same hook

---

*Last updated: 2025-01-07*
