# Teacher Dashboard (Backoffice)

Mobile-first dashboard for academy teachers to manage daily class operations.

---

## Overview

**Route**: `/backoffice`
**Users**: Teachers (instructors)
**Platform**: Mobile + Tablet optimized

---

## Features

### 1. Hero Carousel

Swipeable cards showing today's classes with attendance status.

**Display**:
- Class name
- Time slot
- Student count
- Attendance status (checked/unchecked indicator)

**Interactions**:
- Swipe left/right to navigate classes
- Tap card to open attendance modal
- Auto-advances every 5 seconds

### 2. Task Section

Quick overview of pending tasks.

**Task Types**:
- Attendance not checked (today's classes)
- Progress not recorded
- Homework not verified

**Behavior**:
- Shows count per task type
- Tap to jump to relevant class

### 3. Class List

Scrollable list of today's classes.

**Each Card Shows**:
- Class name
- Time (start - end)
- Student count
- Quick action buttons

**Actions**:
- Attendance button (opens modal)
- Progress button (opens modal)
- Homework button (opens modal)

### 4. Attendance Modal

Full-screen modal for marking attendance.

**Features**:
- Student list with color-coded chips
- Status toggle: Present / Late / Absent
- Note field for each student
- Save button with loading state

**Data Flow**:
1. Open modal with classId and date
2. Load existing attendance from Supabase
3. Merge with student list
4. User modifies statuses
5. Save upserts all records
6. Hero section updates with checkmark

### 5. Progress Modal

Record class progress by student.

**Features**:
- Select textbook/chapter
- Per-student progress input
- Range input (from page - to page)
- Notes field

### 6. Homework Modal

Assign and verify homework.

**Features**:
- Assignment description
- Due date selection
- Student-by-student verification
- Completion toggle

---

## Data Sources

| Feature | Hook | Table |
|---------|------|-------|
| Classes | useClassesForTeacher | classes + enrollments |
| Attendance | useAttendanceByClassAndDate | attendance |
| Progress | useProgress | progress |
| Homework | useHomework | homework |

---

## Key Files

| File | Purpose |
|------|---------|
| BackofficeDemo.tsx | Main page (1500+ lines - refactor target) |
| AttendanceModal.tsx | Attendance UI |
| ProgressModal.tsx | Progress UI |
| HomeworkModal.tsx | Homework UI |
| useAttendance.ts | Attendance hooks |

---

## UX Requirements

- Touch-friendly (44px minimum tap targets)
- Swipe gestures for carousel
- Haptic feedback on save (if supported)
- Loading states for all async operations
- Error toasts with retry option

---

*Last updated: 2025-01-07*
