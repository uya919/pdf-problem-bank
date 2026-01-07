# PC 대시보드 이모지 → Lucide 아이콘 변경 계획

> Stage 13-C: 이모지를 회색 심플 아이콘으로 교체

---

## 1. 개요

### 현재 상황
- PC AdminDashboard에서 이모지 사용 중 (📚, 📅, 👥, ✓, ⚠, ⏳)
- 모바일에서는 lucide-react 아이콘 사용 (일관된 회색 톤)

### 목표
- 이모지 → lucide-react 아이콘으로 통일
- 모바일과 PC 간 시각적 일관성 확보
- 회색 톤의 심플한 디자인 적용

---

## 2. 변경 대상 분석

### AdminDashboard.tsx 이모지 사용 위치

| 위치 | 현재 | 변경 후 | lucide 아이콘 |
|------|------|---------|---------------|
| 160행 | 📚 현재 진행 중 | BookOpen | `BookOpen` |
| 232행 | 📅 수업 일정 | Calendar | `Calendar` |
| 300행 | 👥 학생수 | Users | `Users` |
| 307행 | ✓ / ⚠ 출결 상태 | Check / AlertTriangle | `Check`, `AlertTriangle` |
| 315행 | ✓ / ⏳ 진도 상태 | Check / Clock | `Check`, `Clock` |
| 204,212,220행 | ✓ 정상 상태 | Check | `Check` |

---

## 3. Phase별 개발 계획

### Phase 1: Icons.tsx 확장 (5분)

**목표**: 누락된 아이콘 추가

**추가할 아이콘**:
```typescript
import {
  AlertTriangle,  // ⚠ 대체
  Clock,          // ⏳ 대체
} from 'lucide-react';

// 경고 아이콘 (⚠ 대체)
export function AlertIcon({ className = '', size = 20 }: IconProps) {
  return <AlertTriangle className={className} size={size} />;
}

// 시계 아이콘 (⏳ 대체)
export function ClockIcon({ className = '', size = 20 }: IconProps) {
  return <Clock className={className} size={size} />;
}
```

**테스트**: `npm run build` 성공 확인

---

### Phase 2: AdminDashboard 아이콘 교체 (10분)

**목표**: 이모지를 아이콘으로 교체

**파일**: `frontend/src/pages/admin/AdminDashboard.tsx`

**변경 1: import 추가**
```typescript
import {
  BookOpen,
  Calendar,
  Users,
  Check,
  AlertTriangle,
  Clock,
} from 'lucide-react';
```

**변경 2: 섹션 헤더 아이콘**
```tsx
// Before
<span className="text-base">📚</span>

// After
<BookOpen className="w-5 h-5 text-grey-400" />
```

**변경 3: 상태 아이콘**
```tsx
// Before
{attendanceWarning ? '⚠' : '✓'}

// After
{attendanceWarning ? (
  <AlertTriangle className="w-4 h-4 text-orange-500" />
) : (
  <Check className="w-4 h-4 text-green-500" />
)}
```

**테스트**: `npm run build` 성공 확인

---

### Phase 3: ClassCard 컴포넌트 수정 (5분)

**목표**: ClassCard 내부 아이콘 교체

**변경 위치**:
- 👥 학생수 → `Users` 아이콘
- ✓/⚠ 출결 상태 → `Check`/`AlertTriangle` 아이콘
- ✓/⏳ 진도 상태 → `Check`/`Clock` 아이콘

**코드 변경**:
```tsx
// Before
<span>👥 {studentCount}명</span>

// After
<span className="flex items-center gap-1">
  <Users className="w-4 h-4 text-grey-400" />
  <span>{studentCount}명</span>
</span>
```

**테스트**: `npm run build` 성공 확인

---

### Phase 4: OtherSubjectSummary 수정 (3분)

**목표**: 상태 텍스트의 ✓ 교체

**변경**:
```tsx
// Before
status="✓ 정상"

// After (Check 아이콘 사용)
<span className="flex items-center gap-0.5 text-xs text-grey-500">
  <Check className="w-3 h-3" />
  정상
</span>
```

**테스트**: `npm run build` 성공 확인

---

### Phase 5: 최종 빌드 및 검증 (2분)

**목표**: 전체 빌드 성공 및 UI 확인

**테스트 체크리스트**:
- [ ] `npm run build` 성공
- [ ] 현재 진행 중 섹션: BookOpen 아이콘 표시
- [ ] 수업 일정 섹션: Calendar 아이콘 표시
- [ ] ClassCard: Users/Check/AlertTriangle/Clock 아이콘 표시
- [ ] 아이콘 색상: 회색 톤 (text-grey-400)
- [ ] 상태 아이콘 색상: green-500, orange-500 등

---

## 4. 아이콘 색상 가이드

| 용도 | 색상 클래스 |
|------|------------|
| 기본 (섹션 제목) | `text-grey-400` |
| 정상/완료 | `text-green-500` |
| 경고/주의 | `text-orange-500` |
| 진행 중 | `text-blue-500` |
| 대기/미입력 | `text-grey-400` |

---

## 5. 예상 결과

### Before (이모지)
```
📚 현재 진행 중 (14:00 ~ 15:30)
📅 오늘 수업 일정
👥 8명 · 김수학
✓ 출석 8/8  ⏳ 진도 미입력
```

### After (Lucide 아이콘)
```
[BookOpen] 현재 진행 중 (14:00 ~ 15:30)
[Calendar] 오늘 수업 일정
[Users] 8명 · 김수학
[Check] 출석 8/8  [Clock] 진도 미입력
```

→ 회색 톤의 일관된 아이콘 스타일

---

## 6. 롤백 계획

각 Phase는 독립적으로 롤백 가능:
- Phase 1: Icons.tsx에서 추가된 export 삭제
- Phase 2-4: AdminDashboard.tsx git checkout

---

*작성일: 2025-12-19*
*예상 소요 시간: 25분*
