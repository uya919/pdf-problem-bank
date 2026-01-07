# Hyeyum Backoffice - Central Control

Academy management backoffice for teachers and administrators.

---

## Project Context

**Business Goal**: Streamline daily operations for Hyeyum Academy - attendance tracking, progress recording, homework management, and administrative oversight.

**Tech Stack**:
- Frontend: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query
- Backend: Supabase (primary), FastAPI (auxiliary)
- Deployment: Vercel (frontend), Railway (worker), Supabase (database)

**Operational Commands**:
```bash
# Development
cd frontend && npm run dev -- --host --port 3000
cd backend && python -m uvicorn app.main:app --reload --port 7000

# Build
cd frontend && npm run build

# Type Check
cd frontend && npx tsc --noEmit
```

---

## Golden Rules

### Immutable Constraints
- Never commit secrets or API keys
- Never bypass TypeScript strict mode
- Never use port 5173 or 8000 (reserved)
- Never exceed 500 lines per file

### Do's
- Use Supabase client directly for data operations
- Use TanStack Query for all async state
- Use Tailwind CSS for styling (Toss design system)
- Write docstrings for public functions
- Test build after each significant change
- Use explicit FK names in Supabase joins to avoid PGRST201

### Don'ts
- Don't use axios - use fetch or Supabase client
- Don't create new state management - use existing Zustand stores
- Don't add emojis to code or documentation
- Don't create files over 300 lines without splitting
- Don't use inline styles - use Tailwind classes

---

## Standards

### File Naming
- Components: PascalCase (`AttendanceModal.tsx`)
- Hooks: camelCase with `use` prefix (`useAttendance.ts`)
- Utils: camelCase (`dateUtils.ts`)
- Types: PascalCase (`admin.ts` exports `AdminUser`)

### Git Strategy
- Branch: `main` (production), feature branches for major changes
- Commit: Conventional commits (`feat:`, `fix:`, `refactor:`)
- Deploy: Auto-deploy to Vercel on push to main

### Maintenance Policy
- Update AGENTS.md when new patterns emerge
- Archive deprecated code to `docs/archive/`
- Document breaking changes in commit messages

---

## Context Map

- **[Teacher Dashboard (FE)](./frontend/src/pages/AGENTS.md)** - BackofficeDemo.tsx and related pages
- **[React Hooks (FE)](./frontend/src/hooks/AGENTS.md)** - Supabase data hooks and state management
- **[API Clients (FE)](./frontend/src/api/AGENTS.md)** - REST and Supabase API clients
- **[Backend Services (BE)](./backend/AGENTS.md)** - FastAPI routers and sync services

---

## Architecture Overview

```
User Request
    |
    v
[React Pages] --> [Hooks] --> [Supabase Client] --> [Supabase DB]
    |                              |
    v                              v
[Components]              [TanStack Query Cache]
    |
    v
[Modals/Forms] --> [Mutation Hooks] --> [Supabase]
```

### Data Flow Pattern
1. Page mounts, calls custom hook (e.g., `useClasses`)
2. Hook uses `useQuery` with Supabase client
3. Data cached by TanStack Query
4. Mutations use `useMutation` with cache invalidation
5. UI updates automatically via query refetch

---

## Critical Files

| File | Purpose | Lines | Priority |
|------|---------|-------|----------|
| BackofficeDemo.tsx | Teacher dashboard | 1500+ | Refactor target |
| useAdminData.ts | Admin hooks | 1500+ | Refactor target |
| api/client.ts | API client | 1100+ | Refactor target |
| useAttendance.ts | Attendance hooks | 400 | Stable |
| useClasses.ts | Class hooks | 200 | Stable |

---

## Testing Strategy

### Manual Testing (Playwright MCP)
```
1. Navigate to https://hyeyum.vercel.app
2. Login with test credentials
3. Open attendance modal for a class
4. Check all students present
5. Save and verify checkmark appears
6. Reopen modal and verify data persists
```

### Build Verification
```bash
cd frontend && npm run build
# Must complete without errors
```

---

*Last updated: 2025-01-07*
