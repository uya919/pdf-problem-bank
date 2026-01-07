# Frontend - React Application

Teacher and admin interfaces for Hyeyum Academy backoffice.

---

## Module Context

**Role**: User-facing web application for class management, attendance, progress, and homework tracking.

**Dependencies**:
- React 18 with TypeScript
- TanStack Query for server state
- Zustand for client state
- Tailwind CSS with Toss design tokens
- Embla Carousel for hero section

---

## Tech Constraints

### Required Libraries
- `@tanstack/react-query` - All async data
- `@supabase/supabase-js` - Database operations
- `zustand` - Client state only
- `lucide-react` - Icons (no emoji)

### Forbidden
- axios (use fetch or Supabase client)
- styled-components (use Tailwind)
- Redux (use Zustand)
- moment.js (use native Date or date-fns)

---

## Implementation Patterns

### Component Structure
```typescript
// Good: Single responsibility, under 200 lines
export function AttendanceModal({ classId, date, onClose }: Props) {
  const { data, isLoading } = useAttendanceByClassAndDate(classId, date);
  // ... render logic
}

// Bad: God component with multiple concerns
export function BackofficeDemo() {
  // 1500+ lines mixing data, UI, and business logic
}
```

### Hook Pattern
```typescript
// Query hook
export function useClasses(teacherId: string) {
  return useQuery({
    queryKey: ['classes', teacherId],
    queryFn: async () => { /* Supabase call */ },
    enabled: !!teacherId,
  });
}

// Mutation hook
export function useSaveAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (records) => { /* Supabase upsert */ },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
```

### Supabase Query Pattern
```typescript
// Always use explicit FK names for joins
const { data, error } = await supabase
  .from('attendance')
  .select(`
    *,
    student:students!attendance_student_id_fkey(id, name)
  `)
  .eq('class_id', classId);
```

---

## File Structure

```
src/
├── pages/                    # Route components
│   ├── BackofficeDemo.tsx    # Teacher dashboard (refactor target)
│   ├── backoffice/           # Teacher sub-pages
│   └── admin/                # Admin pages
│
├── components/
│   ├── backoffice/           # Teacher components
│   │   ├── modals/           # Attendance, Progress, Homework modals
│   │   └── dashboard/        # Dashboard widgets
│   ├── admin/                # Admin components
│   └── ui/                   # Shared UI (buttons, inputs)
│
├── hooks/
│   ├── backoffice/           # Teacher data hooks
│   │   ├── useAttendance.ts
│   │   ├── useProgress.ts
│   │   └── useClasses.ts
│   └── useAdminData.ts       # Admin hooks (refactor target)
│
├── api/                      # API clients
│   └── client.ts             # Monolithic (refactor target)
│
├── lib/
│   └── supabase.ts           # Supabase client singleton
│
└── types/                    # TypeScript definitions
```

---

## Local Golden Rules

### Do's
- Keep components under 200 lines
- Extract hooks to separate files
- Use TypeScript strict mode
- Memoize expensive computations
- Handle loading and error states

### Don'ts
- Don't put business logic in components
- Don't use `any` type without justification
- Don't create circular dependencies
- Don't mix Supabase calls and render logic
- Don't forget query key invalidation after mutations

---

## Testing

```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Dev server
npm run dev -- --host --port 3000
```

---

*See [./src/pages/AGENTS.md](./src/pages/AGENTS.md) for page-specific rules*
*See [./src/hooks/AGENTS.md](./src/hooks/AGENTS.md) for hook patterns*
