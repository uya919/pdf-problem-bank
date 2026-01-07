# Pages - Route Components

Top-level route components for teacher and admin interfaces.

---

## Module Context

**Role**: Entry points for each route. Pages orchestrate data fetching via hooks and compose UI from components.

**Principle**: Pages should be thin - delegate data to hooks, UI to components.

---

## Directory Structure

```
pages/
├── BackofficeDemo.tsx       # Teacher dashboard (main entry)
├── HomePage.tsx             # Landing/redirect page
│
├── backoffice/              # Teacher sub-pages
│   ├── ClassesPage.tsx      # Class list view
│   ├── StudentsPage.tsx     # Student management
│   ├── RecordsPage.tsx      # Historical records
│   └── MorePage.tsx         # Settings/profile
│
├── admin/                   # Admin pages
│   ├── AdminDashboard.tsx   # PC dashboard
│   ├── GradeOverview.tsx    # Grade-level stats
│   ├── AdminMobileHome.tsx  # Mobile home
│   ├── AdminMobileClasses.tsx
│   ├── AdminMobileStudents.tsx
│   ├── AdminMobileNotice.tsx
│   ├── AdminMobileSettings.tsx
│   ├── UsersPage.tsx        # User management
│   ├── ClassManagementPage.tsx
│   ├── ClassAssignmentPage.tsx
│   ├── TimetableStudioPage.tsx
│   ├── RotationManagement.tsx
│   ├── ExamManagement.tsx
│   ├── AttendancePage.tsx
│   ├── ReportsPage.tsx
│   ├── SettlementPage.tsx
│   └── consultation/        # Consultation sub-pages
│
└── auth/                    # Authentication
    ├── LoginPage.tsx
    └── RoleSelectPage.tsx
```

---

## Implementation Pattern

### Ideal Page Structure (Under 200 lines)
```typescript
import { useClasses, useTodayAttendance } from '@/hooks/backoffice';
import { HeroSection, ClassList, QuickActions } from '@/components/backoffice';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { data: classes, isLoading } = useClasses(user?.id);
  const { data: attendance } = useTodayAttendance();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <HeroSection classes={classes} attendance={attendance} />
      <ClassList classes={classes} />
      <QuickActions />
    </div>
  );
}
```

---

## Page Types

### Teacher Pages (Mobile-First)
- Primary target: Phone/tablet
- Touch-friendly interactions
- Swipe gestures for carousel
- Bottom navigation

### Admin Pages (PC-First)
- Primary target: Desktop
- Sidebar navigation
- Dense information display
- Modal-based editing

### Admin Mobile Pages
- Simplified admin interface
- Critical actions only
- Read-heavy, write-light

---

## Local Golden Rules

### Do's
- Keep pages under 200 lines
- Use hooks for all data fetching
- Compose from smaller components
- Handle loading/error states at page level
- Use proper TypeScript types

### Don'ts
- Don't put business logic in pages
- Don't manage modal state inline
- Don't fetch data without hooks
- Don't create monolithic pages
- Don't mix mobile and desktop concerns

---

## Routing

```typescript
// App.tsx routes
<Route path="/backoffice" element={<BackofficeDemo />} />
<Route path="/backoffice/classes" element={<ClassesPage />} />
<Route path="/backoffice/students" element={<StudentsPage />} />
<Route path="/admin" element={<AdminDashboard />} />
<Route path="/admin-mobile" element={<AdminMobileHome />} />
```

---

*Last updated: 2025-01-07*
