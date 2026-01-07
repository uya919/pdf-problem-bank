# 강사용 대시보드 중요공지 표시 Feasibility Report

> Stage: 연구 리포트
> 작성일: 2025-12-24
> 목적: 관리자가 등록한 중요공지를 강사용 대시보드에 표시하는 방안 분석

---

## 1. 요구사항 분석

### 1.1 현재 상태

| 구분 | 관리자 (Admin) | 강사 (Teacher) |
|------|---------------|----------------|
| 공지 등록 | O (notices 테이블) | X |
| 중요 공지 표시 | O (ImportantNotices 컴포넌트) | X |
| 캘린더 뱃지 | O (CalendarDayCell) | O (방금 추가됨) |
| 공지 미리보기 | O (isImportant=true) | X |

### 1.2 목표

- 관리자가 `notices` 테이블에 등록한 **중요 공지**(긴급/휴원/결석)를 강사 대시보드에 표시
- 강사가 중요한 학원 운영 정보를 놓치지 않도록 함

---

## 2. 현행 시스템 분석

### 2.1 관리자 중요공지 시스템

```
notices 테이블
├── type: 'urgent' | 'holiday' | 'absence' | 'exam' | 'special' | 'event' | 'operation'
├── visibility: 'all' | 'admin' | 'teacher'
├── is_important: boolean (캘린더 미리보기 표시 여부)
└── priority: number (정렬 우선순위)
```

**중요 공지 판별 기준** (types/admin.ts):
```typescript
export const IMPORTANT_NOTICE_TYPES: NoticeType[] = ['urgent', 'holiday', 'absence'];
```

### 2.2 관리자 대시보드 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| ImportantNotices | `admin/dashboard/notices/ImportantNotices.tsx` | 중요 알림 섹션 (2열 그리드) |
| NoticeCard | `admin/dashboard/notices/NoticeCard.tsx` | 개별 공지 카드 (아이콘+배경색) |
| CalendarDayCell | `admin/dashboard/CalendarDayCell.tsx` | 캘린더 날짜 셀 (공지 뱃지) |
| useNoticesByImportance | `hooks/useAdminNotices.ts` | 중요/일반 공지 분리 훅 |

### 2.3 강사 대시보드 컴포넌트

| 컴포넌트 | 경로 | 역할 |
|----------|------|------|
| BackofficeDemo | `pages/BackofficeDemo.tsx` | 메인 대시보드 |
| TaskBadgeCard | `backoffice/dashboard/TaskBadgeCard.tsx` | 업무 뱃지 (공지/출결/진도/숙제) |
| HeroCarousel | `backoffice/dashboard/HeroCarousel.tsx` | 오늘 수업 캐러셀 |
| DateSelector | `backoffice/dashboard/DateSelector.tsx` | 날짜 선택 (공지 점 추가됨) |

---

## 3. 구현 옵션

### Option A: 히어로 섹션 상단에 중요공지 배너

```
┌─────────────────────────────────────┐
│ ⚠️ [긴급] 12/25 휴강 안내           │ ← 새로 추가
│    12월 25일(수) 전체 휴강입니다    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 📅 12월 24일 (화)                   │
│    [오늘 수업 캐러셀]               │
└─────────────────────────────────────┘
```

**장점**:
- 가장 눈에 띄는 위치
- 중요 정보 즉시 인지
- 관리자 대시보드와 유사한 UX

**단점**:
- 화면 공간 차지
- 공지가 많으면 스크롤 필요

### Option B: TaskBadgeCard 공지 드롭다운 강화

현재 `TaskBadgeCard`의 공지 섹션을 중요/일반으로 분리:

```
[공지 3] [출결 2] [진도 1] [숙제 1]
────────────────────────────────────
🔴 [긴급] 12/25 휴강 안내          ← 중요 공지
🔴 [결석] 김민수 결석 - 병원
────────────────────────────────────
🔵 [시험] 12월 정기테스트 안내      ← 일반 공지
```

**장점**:
- 기존 UI 활용
- 코드 변경 최소화
- 모바일 친화적

**단점**:
- 드롭다운 열어야 확인 가능
- 중요 공지가 묻힐 수 있음

### Option C: 하이브리드 (배너 + 드롭다운)

1. **긴급 공지만** 히어로 상단 배너로 표시
2. **나머지 중요 공지**는 TaskBadgeCard 드롭다운에 표시

```
┌─────────────────────────────────────┐
│ ⚠️ 긴급: 12/25 전체 휴강           │ ← urgent만 배너
└─────────────────────────────────────┘
[공지 2] [출결 2] [진도 1] [숙제 1]
                  ↓ 드롭다운
🔴 [휴원] 12/25 휴원                  ← holiday, absence는 드롭다운
🔵 [시험] 정기테스트 안내
```

**장점**:
- 긴급 상황 즉시 인지
- 화면 공간 효율적 사용
- 중요도에 따른 차등 표시

**단점**:
- 구현 복잡도 증가

### Option D: 플로팅 토스트 알림

화면 하단에 슬라이드업 토스트로 중요 공지 표시:

```
                    [히어로 캐러셀]
                    [TaskBadgeCard]
────────────────────────────────────
│ ⚠️ 긴급 공지: 12/25 휴강 안내 × │
────────────────────────────────────
```

**장점**:
- 레이아웃 변경 최소
- 주의를 끄는 효과

**단점**:
- 매번 닫아야 함
- 여러 개일 때 처리 어려움

---

## 4. 권장 옵션: Option C (하이브리드)

### 4.1 선정 이유

| 평가 기준 | 가중치 | Option A | Option B | Option C | Option D |
|-----------|--------|----------|----------|----------|----------|
| 가시성 | 30% | ★★★ | ★☆☆ | ★★★ | ★★☆ |
| 구현 난이도 | 25% | ★★☆ | ★★★ | ★★☆ | ★★★ |
| 화면 효율 | 20% | ★☆☆ | ★★★ | ★★☆ | ★★★ |
| UX 일관성 | 15% | ★★★ | ★★☆ | ★★★ | ★☆☆ |
| 확장성 | 10% | ★★☆ | ★★★ | ★★★ | ★★☆ |
| **총점** | | 2.35 | 2.35 | **2.60** | 2.20 |

### 4.2 구현 범위

1. **긴급 알림 배너** (urgent 타입만)
   - 히어로 캐러셀 상단에 배치
   - 빨간 배경 + 경고 아이콘
   - 클릭 시 상세 모달 (옵션)

2. **TaskBadgeCard 공지 드롭다운 개선**
   - 중요 공지 (holiday, absence) 상단 정렬
   - 빨간/주황 점으로 구분
   - 공지 유형 뱃지 표시

3. **데이터 훅 연동**
   - `useAdminNotices`를 강사 권한(`userRole='teacher'`)으로 호출
   - visibility='all' 또는 'teacher'인 공지만 조회

---

## 5. 기술 구현 상세

### 5.1 데이터 흐름

```
Supabase notices 테이블
        ↓ (RLS: visibility IN ('all', 'teacher'))
useAdminNotices({ userRole: 'teacher' })
        ↓
BackofficeDemo.tsx
    ├── urgentNotices → UrgentNoticeBanner 컴포넌트
    └── importantNotices → TaskBadgeCard (개선)
```

### 5.2 새로 추가할 컴포넌트

#### UrgentNoticeBanner.tsx
```typescript
interface UrgentNoticeBannerProps {
  notices: Notice[];  // type='urgent'만 필터링된 공지
  onDismiss?: (id: string) => void;
  onClick?: (notice: Notice) => void;
}
```

위치: `frontend/src/components/backoffice/dashboard/UrgentNoticeBanner.tsx`

#### 수정할 파일

| 파일 | 변경 내용 |
|------|----------|
| BackofficeDemo.tsx | useAdminNotices 훅 추가, 배너 렌더링 |
| TaskBadgeCard.tsx | NoticeItem에 type/priority 필드 추가, 정렬 로직 |

### 5.3 RLS 정책 확인

```sql
-- notices 테이블 RLS (이미 구현됨)
CREATE POLICY "teacher_view_notices" ON notices
FOR SELECT USING (
  visibility IN ('all', 'teacher')
  AND is_active = true
);
```

### 5.4 타입 호환성

현재 TaskBadgeCard의 NoticeItem:
```typescript
interface NoticeItem {
  id: string;
  title: string;
  subtitle?: string;
  read: boolean;
}
```

확장 필요:
```typescript
interface NoticeItem {
  id: string;
  title: string;
  subtitle?: string;
  read: boolean;
  type?: NoticeType;      // 추가
  priority?: number;       // 추가
  isImportant?: boolean;   // 추가
}
```

---

## 6. UI/UX 설계

### 6.1 긴급 알림 배너 디자인

```
┌─────────────────────────────────────────────────┐
│ ⚠️ [긴급] 12월 25일 전체 휴강 안내              │
│    성탄절로 인해 전체 수업이 휴강됩니다.        │
│                                          [확인] │
└─────────────────────────────────────────────────┘
```

- 배경: `bg-red-50` 또는 `bg-gradient-to-r from-red-50 to-orange-50`
- 아이콘: AlertTriangle (lucide-react)
- 닫기: 오른쪽 상단 X 버튼 (로컬 상태로 dismissed)

### 6.2 개선된 공지 드롭다운 디자인

```
[공지 3] ← 빨간 뱃지
────────────────────────────────
🔴 [휴원] 12/25 휴원 안내        priority=90
🔴 [결석] 김민수 결석 (병원)     priority=80
🔵 [시험] 정기테스트 안내        priority=50
────────────────────────────────
```

- 중요 공지: 빨간/주황 점 + 유형 뱃지
- 일반 공지: 파란 점

---

## 7. 개발 단계 (Phase 분리)

### Phase 1: 데이터 연동 (1시간)
- [ ] BackofficeDemo에 useAdminNotices 훅 추가
- [ ] userRole='teacher' 설정
- [ ] 선택된 날짜 기반 공지 조회

### Phase 2: 긴급 알림 배너 (1.5시간)
- [ ] UrgentNoticeBanner 컴포넌트 생성
- [ ] urgent 타입 필터링
- [ ] 히어로 상단 배치
- [ ] 로컬 dismiss 상태 관리

### Phase 3: TaskBadgeCard 개선 (1시간)
- [ ] NoticeItem 타입 확장
- [ ] priority 기반 정렬
- [ ] 유형별 점 색상 적용
- [ ] 유형 뱃지 표시

### Phase 4: 테스트 및 통합 (0.5시간)
- [ ] 빌드 확인
- [ ] 실제 공지 데이터 테스트
- [ ] 반응형 확인

---

## 8. 고려사항

### 8.1 성능
- useAdminNotices는 이미 1분 staleTime 캐시 적용
- 추가 API 호출 없이 기존 훅 재사용

### 8.2 UX
- 긴급 배너는 하루에 한 번만 표시 (localStorage)
- 동일 공지 반복 표시 방지

### 8.3 권한
- 강사는 'all' 또는 'teacher' visibility 공지만 조회
- 'admin' 전용 공지는 표시 안 됨

### 8.4 태블릿 대응
- TabletDashboard에도 동일하게 적용 필요
- WeekCalendarGrid 하단에 ImportantNotices 섹션 추가 고려

---

## 9. 결론

관리자 중요공지를 강사 대시보드에 표시하는 것은 **기술적으로 실현 가능**하며, **Option C (하이브리드)** 방식을 권장합니다.

### 예상 효과
- 강사가 학원 운영 정보를 실시간으로 파악
- 휴강/결석 등 중요 사항 놓침 방지
- 관리자-강사 간 정보 공유 개선

### 예상 소요 시간
- 총 4시간 (Phase 1~4)

### 다음 단계
1. 사용자 승인 후 개발 진행
2. Phase별 순차 구현
3. 실제 데이터로 테스트

---

*v1.0 - 2025-12-24*
