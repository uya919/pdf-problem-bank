# 이모지 → SVG 아이콘 마이그레이션 계획

> 작성일: 2025-12-12
> 목표: 플랫폼별 이모지 차이 해결, 일관된 UI 제공

---

## 1. 현황 분석

### 현재 사용 중인 이모지

| 이모지 | 용도 | 파일 | 우선순위 |
|--------|------|------|----------|
| 📅 | 날짜/캘린더 | DateSelector, HeroCarousel, ScheduleTimeline | 높음 |
| 📆 | 월간 캘린더 | DateSelector | 높음 |
| 🟢 | 연결 상태 (온라인) | BackofficeDemo | 높음 |
| 🔴 | 연결 상태 (오프라인) | BackofficeDemo | 높음 |
| 👤 | 사용자 프로필 | BackofficeDemo | 높음 |
| 🔔 | 알림/공지 | TaskBadgeCard, NoticeAndTodoCard | 높음 |
| 📝 | 진도/숙제/기록 | 여러 파일 | 높음 |
| 📚 | 문제은행 | HangulUploadPage, ProblemsView | 낮음 |
| ✅ | 체크/완료 | GroupPanel, PageViewer (로그) | 낮음 |

### 영향 받는 파일 (11개)

1. `BackofficeDemo.tsx` - 🟢🔴👤
2. `DateSelector.tsx` - 📅📆
3. `HeroCarousel.tsx` - 📅📝
4. `TaskBadgeCard.tsx` - 🔔📝
5. `NoticeAndTodoCard.tsx` - 🔔
6. `ScheduleTimeline.tsx` - 📅
7. `DashboardHeroCard.tsx` - 📝
8. `ProgressModal.tsx` - 📝
9. `TestSection.tsx` - 📝
10. `ProgressTimelineSection.tsx` - 📝
11. `HangulUploadPage.tsx`, `ProblemsView.tsx` - 📚

---

## 2. 아이콘 라이브러리 선택

### 추천: Lucide Icons

| 항목 | 내용 |
|------|------|
| 패키지 | `lucide-react` |
| 장점 | 경량, React 네이티브, Tailwind 호환, 400+ 아이콘 |
| 스타일 | Stroke 기반 (토스 디자인과 유사) |
| 번들 크기 | Tree-shaking 지원으로 사용한 아이콘만 포함 |

### 대안
- **Heroicons**: Tailwind 팀 제작, 비슷한 품질
- **Phosphor Icons**: 더 많은 아이콘, 약간 무거움

---

## 3. 아이콘 매핑

| 이모지 | Lucide 아이콘 | 컴포넌트 |
|--------|--------------|----------|
| 📅 | `Calendar` | 날짜 선택 |
| 📆 | `CalendarDays` | 월간 캘린더 |
| 🟢 | `Circle` (fill green) | 온라인 상태 |
| 🔴 | `Circle` (fill red) | 오프라인 상태 |
| 👤 | `User` | 사용자 |
| 🔔 | `Bell` | 알림 |
| 📝 | `FileText` or `ClipboardList` | 진도/숙제 |
| 📚 | `BookOpen` | 문제은행 |
| ✅ | `Check` or `CheckCircle` | 완료 |

---

## 4. 구현 계획

### Phase 1: 설치 및 아이콘 컴포넌트 생성 (30분)

```bash
cd frontend
npm install lucide-react
```

**아이콘 래퍼 컴포넌트 생성**: `components/ui/Icons.tsx`

```typescript
import {
  Calendar,
  CalendarDays,
  Circle,
  User,
  Bell,
  FileText,
  BookOpen,
  Check,
  // ... 필요한 아이콘 추가
} from 'lucide-react';

// 상태 표시용 원형 아이콘
export function StatusDot({ status }: { status: 'online' | 'offline' }) {
  return (
    <Circle
      className={`w-2 h-2 ${status === 'online' ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`}
    />
  );
}

// 재사용 가능한 아이콘 export
export {
  Calendar as CalendarIcon,
  CalendarDays as CalendarMonthIcon,
  User as UserIcon,
  Bell as BellIcon,
  FileText as NoteIcon,
  BookOpen as BookIcon,
  Check as CheckIcon,
};
```

### Phase 2: Backoffice 핵심 컴포넌트 교체 (1시간)

**우선순위 높음 (사용자에게 자주 보이는 것)**:

1. `BackofficeDemo.tsx`
   - 🟢🔴 → `StatusDot`
   - 👤 → `UserIcon`

2. `DateSelector.tsx`
   - 📅 → `CalendarIcon`
   - 📆 → `CalendarMonthIcon`

3. `TaskBadgeCard.tsx`
   - 🔔 → `BellIcon`
   - 📝 → `NoteIcon`

4. `HeroCarousel.tsx`
   - 📅 → `CalendarIcon`
   - 📝 → `NoteIcon`

### Phase 3: 나머지 컴포넌트 교체 (30분)

- NoticeAndTodoCard
- ScheduleTimeline
- DashboardHeroCard
- ProgressModal
- TestSection
- ProgressTimelineSection

### Phase 4: PDF 라벨링 관련 (선택적)

- HangulUploadPage
- ProblemsView
- GroupPanel
- PageViewer (로그만 해당)

---

## 5. 코드 변경 예시

### Before (이모지)
```tsx
<span className="text-lg">📅</span>
<span>{connectionStatus.label}</span> // '🟢 hyeyum 연결됨'
```

### After (SVG 아이콘)
```tsx
import { CalendarIcon, StatusDot } from '@/components/ui/Icons';

<CalendarIcon className="w-5 h-5 text-gray-600" />
<div className="flex items-center gap-1">
  <StatusDot status={connectionStatus.connected ? 'online' : 'offline'} />
  <span>{connectionStatus.connected ? 'hyeyum 연결됨' : 'Mock 데이터'}</span>
</div>
```

---

## 6. 예상 소요 시간

| 단계 | 작업 | 시간 |
|------|------|------|
| Phase 1 | 설치 + Icons.tsx 생성 | 30분 |
| Phase 2 | 핵심 컴포넌트 4개 | 1시간 |
| Phase 3 | 나머지 컴포넌트 6개 | 30분 |
| Phase 4 | PDF 관련 (선택) | 30분 |
| **총계** | | **2~2.5시간** |

---

## 7. 테스트 체크리스트

- [ ] Windows 브라우저에서 아이콘 표시 확인
- [ ] iPhone Safari에서 아이콘 표시 확인
- [ ] Android Chrome에서 아이콘 표시 확인
- [ ] 다크모드 대응 (필요시)
- [ ] 아이콘 크기/색상 일관성 확인

---

## 8. 롤백 계획

문제 발생 시:
1. `lucide-react` 제거: `npm uninstall lucide-react`
2. Git에서 이전 커밋으로 복원
3. 이모지 버전으로 복귀

---

## 9. 추가 고려사항

### 디자인 시스템 통합
아이콘 컴포넌트를 `components/design-system/`에 추가하여 전체 앱에서 일관되게 사용

### 접근성
- `aria-label` 추가
- 스크린 리더 지원

### 성능
- Tree-shaking으로 사용 아이콘만 번들에 포함
- 예상 추가 번들 크기: ~10KB (gzip 후)

---

*작성: Claude Code | 이모지 마이그레이션 계획*
