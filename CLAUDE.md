@docs/plan.md

# Hyeyum Backoffice System

혜윰학원 강사/관리자용 백오피스 웹앱

---

## Claude 작업 규칙

### 필수 기록 규칙
- 새로운 Phase/Stage 논의 시 → 즉시 plan.md에 기록
- 중요 결정사항 → 즉시 해당 문서에 기록
- 세션 종료 전 → 진행 상황 plan.md 업데이트
- Phase 완료 시 → plan.md 상태 업데이트

---

## 1. Project Overview

| Item | Description |
|------|-------------|
| Purpose | Class management, attendance/progress/homework tracking for academy |
| Users | Teachers (instructors), Admin (director/manager) |
| Stack | React 18, TypeScript, Vite, Tailwind CSS, Supabase |
| Deployment | Vercel (Frontend), Railway (Worker), Supabase (DB) |

---

## 2. Development Server

```bash
# Frontend (port 3000)
cd frontend
npm run dev -- --host --port 3000

# Backend (port 7000) - optional, most APIs use Supabase directly
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 7000
```

**URLs**:
- Teacher Dashboard: http://localhost:3000/backoffice
- Admin PC: http://localhost:3000/admin
- Admin Mobile: http://localhost:3000/admin-mobile
- Production: https://hyeyum.vercel.app

**Port Rules**:
- Frontend: 3000 (required)
- Backend: 7000 (required)
- 5173, 8000: Reserved for other projects

---

## 3. Folder Structure

```
pdf/
├── frontend/src/
│   ├── pages/
│   │   ├── BackofficeDemo.tsx          # Teacher dashboard
│   │   ├── backoffice/                 # Teacher pages
│   │   │   ├── ClassesPage.tsx
│   │   │   ├── StudentsPage.tsx
│   │   │   └── RecordsPage.tsx
│   │   ├── admin/                      # Admin pages
│   │   │   ├── AdminDashboard.tsx      # PC dashboard
│   │   │   ├── GradeOverview.tsx       # Grade overview
│   │   │   └── AdminMobile*.tsx        # Mobile pages
│   │   └── auth/                       # Authentication
│   │
│   ├── components/
│   │   ├── backoffice/                 # Teacher components
│   │   │   ├── modals/                 # Attendance, Progress, Homework modals
│   │   │   └── dashboard/              # Dashboard widgets
│   │   ├── admin/                      # Admin components
│   │   │   ├── layout/                 # PC layout
│   │   │   └── mobile/                 # Mobile components
│   │   └── ui/                         # Shared UI components
│   │
│   ├── hooks/
│   │   ├── backoffice/                 # Teacher data hooks (Supabase)
│   │   │   ├── useAttendance.ts
│   │   │   ├── useProgress.ts
│   │   │   └── useClasses.ts
│   │   └── useAdminData.ts             # Admin data hooks
│   │
│   ├── api/                            # API clients
│   └── lib/supabase.ts                 # Supabase client
│
├── backend/app/                        # FastAPI backend
│   ├── routers/
│   │   ├── sync.py                     # Makeedu sync
│   │   ├── admin_users.py              # User management
│   │   └── grade_promotion.py          # Grade promotion
│   └── services/
│       └── sync_manager.py             # Sync logic
│
├── railway-worker/                     # Railway scraper
│   ├── worker.py                       # Main worker
│   └── scrape_makeedu.py               # Makeedu scraper
│
└── docs/
    ├── plan.md                         # Development plan
    └── mockups/                        # HTML mockups
```

---

## 4. Key Features

### Teacher (Backoffice)
- Daily class schedule with hero carousel
- Attendance check (present/late/absent)
- Progress tracking per class
- Homework assignment and verification
- Student profile and history

### Admin
- Grade overview dashboard
- Class management (CRUD)
- Teacher management
- Notice/announcement system
- Rotation class scheduling
- Makeedu student sync

---

## 5. Development Rules

### Code Standards
- Max 300 lines per file (recommend)
- TypeScript strict mode
- Docstrings for all public functions
- No hardcoded secrets

### Workflow
1. Research Report (analysis only, no code)
2. Development Plan (detailed steps)
3. Phase-by-phase implementation
4. Build test after each phase

### Commands
| Command | Purpose |
|---------|---------|
| `Phase X` | Execute specific phase |
| `opus thinkharder` | Deep analysis |
| `error` + log | Debug |

---

## 6. Database (Supabase)

### Core Tables
- `students` - Student info
- `classes` - Class definitions
- `enrollments` - Student-class mapping
- `attendance` - Attendance records
- `progress` - Progress records
- `homework` - Homework assignments
- `teachers` - Teacher profiles
- `notices` - Announcements

### Key Patterns
```typescript
// React Query with Supabase
const { data, isLoading } = useQuery({
  queryKey: ['attendance', classId, date],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', classId);
    if (error) throw error;
    return data;
  }
});
```

---

## 7. External Services

| Service | Purpose | Config |
|---------|---------|--------|
| Supabase | Database + Auth | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Vercel | Frontend hosting | Auto-deploy from main |
| Railway | Worker service | `RAILWAY_TOKEN` |
| NAS | PDF storage | `NAS_HOST`, `NAS_USER`, `NAS_PASSWORD` |

---

## 8. Troubleshooting

| Issue | Solution |
|-------|----------|
| Port conflict | `netstat -ano \| findstr :3000` then taskkill |
| TypeScript error | Check type definitions, fix mismatches |
| Supabase 404 | Verify table exists, check RLS policies |
| CORS error | Check Supabase/Backend CORS config |

---

## 9. References

- [docs/plan.md](docs/plan.md) - Development plan
- [docs/supabase-schema.md](docs/supabase-schema.md) - Database schema
- [docs/business-logic.md](docs/business-logic.md) - Business rules

---

*v2.0 - 2025-01-07 - Refactored for Hyeyum Backoffice*
