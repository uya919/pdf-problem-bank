# Admin Dashboard

Desktop-first dashboard for academy administrators (director/manager).

---

## Overview

**Routes**:
- PC: `/admin`
- Mobile: `/admin-mobile`

**Users**: Director, Manager
**Platform**: PC primary, Mobile secondary

---

## PC Dashboard Features

### 1. Sidebar Navigation

Fixed left sidebar with navigation items.

**Menu Items**:
- Dashboard (home)
- Grade Overview
- Class Management
- Student Management
- Teacher Management
- Timetable Studio
- Notice Board
- Settings

### 2. Grade Overview

Bird's-eye view of all grades.

**Display**:
- Grade cards (Elementary, Middle 1-3, High 1-3)
- Per-grade statistics:
  - Total students
  - Active classes
  - Today's attendance rate
  - Pending tasks

**Interactions**:
- Click grade to filter class list
- Expand for detailed breakdown

### 3. Class Management

CRUD operations for classes.

**Features**:
- Class list with filters
- Create new class modal
- Edit class details
- Assign teachers (main, assistant, homeroom)
- Set schedule (day of week, time)
- Manage enrollments

### 4. Student Management

Student roster and history.

**Features**:
- Student list with search
- Filter by grade, class, status
- Student detail view
- Attendance history
- Progress records
- Contact information

### 5. Teacher Management

Teacher roster and assignments.

**Features**:
- Teacher list
- Class assignments overview
- Schedule visualization
- Performance metrics

### 6. Timetable Studio

Visual schedule editor.

**Features**:
- Week view grid
- Drag-drop class placement
- Conflict detection
- Teacher availability overlay

### 7. Notice Board

Announcements for teachers.

**Features**:
- Create/edit notices
- Pin important notices
- Set visibility (all, specific grade)
- Mention teachers (@teacher)
- Calendar preview for dated notices

---

## Mobile Dashboard Features

Simplified admin interface for on-the-go access.

### 1. Quick Stats

Top cards showing key metrics.

### 2. Today's Overview

- Classes in progress
- Attendance summary
- Urgent notifications

### 3. Quick Actions

- Add student
- Create notice
- Contact teacher

---

## Data Sources

| Feature | Hook | Table |
|---------|------|-------|
| KPI Stats | useAdminKPI | multiple |
| Classes | useAdminClasses | classes |
| Students | useAdminStudents | students |
| Teachers | useAdminTeachers | teachers |
| Notices | useAdminNotices | notices |

---

## Key Files

| File | Purpose |
|------|---------|
| AdminDashboard.tsx | PC layout |
| GradeOverview.tsx | Grade cards |
| AdminMobileHome.tsx | Mobile layout |
| useAdminData.ts | Admin hooks (1500+ lines - refactor target) |

---

## Authorization

- Role-based access control
- Admin routes protected
- Teacher cannot access admin pages
- Redirect to appropriate dashboard on login

---

*Last updated: 2025-01-07*
