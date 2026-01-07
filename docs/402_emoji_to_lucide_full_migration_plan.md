# 전체 이모지 → Lucide 아이콘 마이그레이션 계획

> Stage 13-D: 프로젝트 전체 이모지 통일

---

## 1. 개요

### 현재 상태
- AdminDashboard.tsx: ✅ 완료
- 나머지 파일들: 이모지 사용 중

### 목표
- 모든 UI 이모지를 Lucide 아이콘으로 교체
- 회색 톤의 일관된 디자인 적용
- 플랫폼별 이모지 렌더링 차이 해소

---

## 2. 변경 대상 파일 분류

### 우선순위 1 (핵심 UI - 6개 파일)

| 파일 | 이모지 | 변경 필요 |
|------|--------|----------|
| `AdminMobileHome.tsx` | 👥, ✓ | Users, Check |
| `AdminRightSidebar.tsx` | ✓, 📝, 📚, 👤, 🔔, ⚠, 📢 | Check, FileText, BookOpen, User, Bell, AlertTriangle, Megaphone |
| `ReportsPage.tsx` | 📚, ✅, ⚠️, 📝 | BookOpen, CheckCircle, AlertTriangle, FileText |
| `AttendancePage.tsx` | ✅, 📚, ⚠️, ✓ | CheckCircle, BookOpen, AlertTriangle, Check |
| `OperationsPage.tsx` | 📚, 📅, 👥, 🔔, 📝, ✅, ⏳, ⚠️ | BookOpen, Calendar, Users, Bell, FileText, CheckCircle, Clock, AlertTriangle |
| `SettlementPage.tsx` | ⚠️, ✅, ⏳ | AlertTriangle, CheckCircle, Clock |

### 우선순위 2 (인증/사용자 관리 - 4개 파일)

| 파일 | 이모지 | 변경 필요 |
|------|--------|----------|
| `LoginPage.tsx` | 👤 | User |
| `ChangePasswordModal.tsx` | ✅, ✓, ○ | CheckCircle, Check, Circle |
| `CreateUserModal.tsx` | ✅, 👤, ⚠️ | CheckCircle, User, AlertTriangle |
| `ResetPasswordModal.tsx` | ✅, ⚠️, 👤 | CheckCircle, AlertTriangle, User |

### 우선순위 3 (컴포넌트 - 5개 파일)

| 파일 | 이모지 | 변경 필요 |
|------|--------|----------|
| `ClassDetailModal.tsx` | ⚠️, 👤, 📚 | AlertTriangle, User, BookOpen |
| `TaskBadgeCard.tsx` | ✓ | Check |
| `HeroCarousel.tsx` | 👁, ✓ | Eye, Check |
| `ClassGridView.tsx` | 👁, ✓ | Eye, Check |
| `StudentSection.tsx` | 👥 | Users |

### 우선순위 4 (기타 - 5개 파일)

| 파일 | 이모지 | 변경 필요 |
|------|--------|----------|
| `UserActionsMenu.tsx` | ✓, 🚫, ✅, ⚠️ | Check, Ban, CheckCircle, AlertTriangle |
| `RotationManagement.tsx` | 📅 | Calendar |
| `ClassAssignmentPage.tsx` | 👥, ✓ | Users, Check |
| `HangulUploadPage.tsx` | 📚 | BookOpen |
| `ProblemsView.tsx` | 📚 | BookOpen |

---

## 3. Phase별 개발 계획

### Phase 1: Icons.tsx 확장 (5분)

**목표**: 누락된 아이콘 추가

**추가할 아이콘**:
```typescript
import {
  // 기존 + 추가
  Eye,           // 👁 대체
  Ban,           // 🚫 대체
  Megaphone,     // 📢 대체
  Circle,        // ○ 대체
} from 'lucide-react';

// 래퍼 함수 추가
export function EyeIcon({ className = '', size = 20 }: IconProps) {
  return <Eye className={className} size={size} />;
}

export function BanIcon({ className = '', size = 20 }: IconProps) {
  return <Ban className={className} size={size} />;
}

export function MegaphoneIcon({ className = '', size = 20 }: IconProps) {
  return <Megaphone className={className} size={size} />;
}

export function CircleIcon({ className = '', size = 20 }: IconProps) {
  return <Circle className={className} size={size} />;
}
```

---

### Phase 2: 핵심 UI - AdminMobileHome (10분)

**파일**: `pages/admin/AdminMobileHome.tsx`

**변경 내용**:
```tsx
// import 추가
import { Users, Check } from 'lucide-react';

// 258행: 👥 → Users
<Users className="w-4 h-4 text-grey-400" />
{cls.attendance.present}/{cls.attendance.total}

// 261행: ✓ → Check
<Check className="w-4 h-4 text-green-500" />
```

---

### Phase 3: 핵심 UI - AdminRightSidebar (15분)

**파일**: `components/admin/layout/AdminRightSidebar.tsx`

**변경 내용**:
```tsx
// import 추가
import { Check, FileText, BookOpen, User, Bell, AlertTriangle, Megaphone } from 'lucide-react';

// 42-44행: quickActions 아이콘
{ icon: <Check className="w-4 h-4" />, label: '출결 체크', ... }
{ icon: <FileText className="w-4 h-4" />, label: '진도 기록', ... }
{ icon: <BookOpen className="w-4 h-4" />, label: '숙제 확인', ... }

// 104-107행: IconButton 아이콘
<User className="w-5 h-5" />
<Check className="w-5 h-5" />
<Bell className="w-5 h-5" />

// 187행: alert 타입별 아이콘
{alert.type === 'warning' ? <AlertTriangle /> : <Megaphone />}
```

---

### Phase 4: 핵심 UI - ReportsPage (10분)

**파일**: `pages/admin/ReportsPage.tsx`

**변경 내용**:
```tsx
// import 추가
import { BookOpen, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

// 132-133행: 탭 아이콘
{ id: 'progress', label: '진도', icon: <BookOpen className="w-4 h-4" /> }
{ id: 'attendance', label: '출결', icon: <CheckCircle className="w-4 h-4" /> }

// 243, 313행: 📚 → BookOpen
// 274, 398행: ⚠️ → AlertTriangle
// 383행: ✅ → CheckCircle
// 548-549행: 아이콘 맵
homework: <FileText className="w-4 h-4" />,
progress: <BookOpen className="w-4 h-4" />,
```

---

### Phase 5: 핵심 UI - AttendancePage (10분)

**파일**: `pages/admin/AttendancePage.tsx`

**변경 내용**:
```tsx
// import 추가
import { CheckCircle, BookOpen, AlertTriangle, Check } from 'lucide-react';

// 313행: icon="✅" → icon={<CheckCircle />}
// 339행: 📚 → BookOpen
// 398행: ⚠️ → AlertTriangle
// 501행: ✓ → Check, ? → HelpCircle
```

---

### Phase 6: 핵심 UI - OperationsPage (15분)

**파일**: `pages/admin/OperationsPage.tsx`

**변경 내용**:
```tsx
// import 추가
import { BookOpen, Calendar, Users, Bell, FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

// 56-58행, 85행: 메뉴 아이콘
{ id: 'classes', icon: <BookOpen />, label: '반 관리' }
{ id: 'schedule', icon: <Calendar />, label: '시간표 관리' }
{ id: 'teachers', icon: <Users />, label: '강사 관리' }
{ id: 'notification', icon: <Bell />, label: '알림 설정' }

// 나머지 이모지도 동일하게 변경
```

---

### Phase 7: 핵심 UI - SettlementPage (5분)

**파일**: `pages/admin/SettlementPage.tsx`

**변경 내용**:
```tsx
// import 추가
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

// 159행: ⚠️ → AlertTriangle
// 181행: ✅ → CheckCircle
// 189행, 357행: ⏳ → Clock
```

---

### Phase 8: 인증/사용자 관리 (15분)

**파일들**:
- `LoginPage.tsx`: 👤 → User
- `ChangePasswordModal.tsx`: ✅→CheckCircle, ✓→Check, ○→Circle
- `CreateUserModal.tsx`: ✅→CheckCircle, 👤→User, ⚠️→AlertTriangle
- `ResetPasswordModal.tsx`: ✅→CheckCircle, ⚠️→AlertTriangle, 👤→User

---

### Phase 9: 컴포넌트 (15분)

**파일들**:
- `ClassDetailModal.tsx`: ⚠️→AlertTriangle, 👤→User, 📚→BookOpen
- `TaskBadgeCard.tsx`: ✓→Check
- `HeroCarousel.tsx`: 👁→Eye, ✓→Check
- `ClassGridView.tsx`: 👁→Eye, ✓→Check
- `StudentSection.tsx`: 👥→Users

---

### Phase 10: 기타 파일 (10분)

**파일들**:
- `UserActionsMenu.tsx`: ✓→Check, 🚫→Ban, ✅→CheckCircle, ⚠️→AlertTriangle
- `RotationManagement.tsx`: 📅→Calendar
- `ClassAssignmentPage.tsx`: 👥→Users, ✓→Check
- `HangulUploadPage.tsx`: 📚→BookOpen
- `ProblemsView.tsx`: 📚→BookOpen

---

### Phase 11: 빌드 테스트 및 검증 (5분)

**테스트 체크리스트**:
- [ ] `npm run build` 성공
- [ ] PC 대시보드 아이콘 표시 확인
- [ ] 모바일 대시보드 아이콘 표시 확인
- [ ] 인증 페이지 아이콘 표시 확인
- [ ] 관리자 페이지 아이콘 표시 확인

---

## 4. 아이콘 매핑 테이블

| 이모지 | Lucide 아이콘 | 용도 |
|--------|--------------|------|
| 📚 | `BookOpen` | 수업/교재/문제은행 |
| 📅 | `Calendar` | 일정/캘린더 |
| 📝 | `FileText` | 진도/노트/기록 |
| 👥 | `Users` | 학생/그룹 |
| 👤 | `User` | 사용자/프로필 |
| 🔔 | `Bell` | 알림 |
| ✓ / ✅ | `Check` / `CheckCircle` | 완료/확인 |
| ⚠ / ⚠️ | `AlertTriangle` | 경고/주의 |
| ⏳ | `Clock` | 대기/진행중 |
| 👁 | `Eye` | 보기/확인됨 |
| 🚫 | `Ban` | 비활성화/금지 |
| 📢 | `Megaphone` | 공지/알림 |
| ○ | `Circle` | 미완료/빈 상태 |

---

## 5. 아이콘 스타일 가이드

### 크기
- 섹션 헤더: `w-5 h-5`
- 인라인 텍스트: `w-4 h-4`
- 작은 상태표시: `w-3 h-3`

### 색상
- 기본: `text-grey-400`
- 정상/완료: `text-green-500`
- 경고: `text-orange-500`
- 오류: `text-red-500`
- 정보: `text-blue-500`

---

## 6. 예상 소요 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| 1 | Icons.tsx 확장 | 5분 |
| 2 | AdminMobileHome | 10분 |
| 3 | AdminRightSidebar | 15분 |
| 4 | ReportsPage | 10분 |
| 5 | AttendancePage | 10분 |
| 6 | OperationsPage | 15분 |
| 7 | SettlementPage | 5분 |
| 8 | 인증/사용자 관리 | 15분 |
| 9 | 컴포넌트 | 15분 |
| 10 | 기타 파일 | 10분 |
| 11 | 빌드 테스트 | 5분 |
| **총** | | **약 2시간** |

---

## 7. 롤백 계획

각 Phase는 독립적으로 롤백 가능:
```bash
git checkout -- <파일경로>
```

---

*작성일: 2025-12-20*
*이전 완료: AdminDashboard.tsx (Stage 13-C)*
