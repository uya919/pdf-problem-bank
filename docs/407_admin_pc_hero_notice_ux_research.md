# PC 관리자 대시보드 히어로 섹션 공지사항 UX 연구

**문서 번호**: 407
**작성일**: 2025-12-21
**Stage**: 13 (PC 대시보드 캘린더 UI 확장)
**목적**: 캘린더 기반 히어로 섹션 공지사항 UI/UX 설계

---

## 1. 연구 배경

### 1.1 현재 상태

- **AdminDashboard.tsx**: WeeklyCalendar 컴포넌트가 상단에 위치
- **useAdminNotices.ts**: 공지사항 훅이 존재하지만 빈 배열 반환 (Mock)
- **CalendarDayCell.tsx**: 개별 날짜 셀에 공지 뱃지 표시 (최대 2개)
- **토스 스타일 디자인 시스템**: rounded-3xl, gap 기반 구분, 펄스 애니메이션 등

### 1.2 요구사항

1. 캘린더와 연동되는 히어로 섹션 공지사항 UI 추가
2. 날짜 선택 시 해당 날짜의 공지사항을 강조 표시
3. 학원 관리자에게 적합한 공지 유형 반영
4. 토스 스타일 디자인 철학 유지
5. 정보 밀도와 시각적 임팩트 균형

---

## 2. 벤치마킹 분석

### 2.1 핀테크 앱 히어로 섹션 패턴

#### 토스 디자인 철학
- **시각적 단순화**: 불필요한 요소 제거, 핵심에 집중
- **Progressive Disclosure**: 필요한 정보만 순차적으로 표시
- **속도감**: 즉각적인 피드백, 부드러운 애니메이션
- **둥글둥글함**: rounded-3xl 사용, 부드러운 인상

#### SAP 디지털 디자인 시스템 히어로 패턴
- **배경 옵션**:
  - No Background: 투명 배경, 주변과 자연스러운 통합
  - Solid Colors: 단색 배경, 강한 시각적 임팩트
  - Graphic Patterns: 텍스처 추가, 역동적인 디자인
- **구조**: Caption + Title + Subtitle (Rich Text 지원)
- **CTA**: 행동 유도 버튼 배치

#### 히어로 섹션 베스트 프랙티스 (2025)
- **명확한 가치 제안**: 단일 메시지에 집중
- **타이포그래피**: 대형 폰트로 즉각적인 주목
- **대비**: 배경과 텍스트의 명확한 대비
- **인터랙션**: 스크롤 트리거 애니메이션, 호버 효과
- **최소주의**: 정보 과부하 방지

### 2.2 캘린더 연동 공지사항 패턴

#### Notion 캘린더 뷰
- 우측 패널에 다가오는 이벤트 스냅샷 표시
- 빠른 미팅 생성 기능
- 아이콘 라벨로 빠른 이해 지원
- 명확성과 효율성에 집중

#### 대시보드 배너 위젯 (SmartSuite)
- 대시보드 상단에 시각적 배너 요소
- 사용자가 페이지 맥락을 빠르게 파악
- Caption, Title, Subtitle 커스터마이징
- 배경색 또는 커스텀 이미지 업로드

#### 알림 UX 가이드라인 (Smashing Magazine)
- **정보성 알림**: 캘린더 알림, 지연 알림, 결과 알림
- **행동 유도 알림**: 결제 승인, 업데이트 설치, 친구 요청
- **우선순위 기반**: 중요 알림은 더 많은 주목 받음
- **UI 알림 카드**: 웹 인터페이스에서 비침투적으로 표시

### 2.3 학원 관리 시스템 공지사항 기능

#### 주요 학원 관리 프로그램 분석

**랠리즈 (Rallyz)**
- 모든 기능이 학부모/학생 대상 자동 알림과 연동
- 지각, 조퇴, 보강 등 출석 유형 기록 및 메모

**아이엠스쿨**
- 공지사항, 급식, 시간표, 학사일정, 출결, 입시 정보 한 곳에서 확인
- 통합 뷰 제공

**학원조아**
- 실시간 출결 알림 (학부모 만족)
- 수강료 SMS/푸시 알림 전송
- 간편한 시스템 강조

**클래스업 (ClassUp)**
- 학원 공지 기능
- 학습 리포트 연동
- 자동화 중심

#### 학원 관리자에게 필요한 공지 유형
1. **휴원일**: 법정 공휴일, 방학, 임시 휴무
2. **시험 일정**: 모의고사, 중간/기말고사, 레벨테스트
3. **특별 수업**: 특강, 보강, 심화반 추가 수업
4. **행사**: 학부모 상담 주간, 설명회, 학원 이벤트
5. **운영 알림**: 수강료 납부, 교재 변경, 시간표 조정
6. **긴급 공지**: 휴강, 강사 변경, 긴급 연락사항

---

## 3. UX 설계 원칙

### 3.1 정보 계층 구조

```
[우선순위 1] 긴급 공지 (warning)
    ↓
[우선순위 2] 휴원일 (holiday)
    ↓
[우선순위 3] 시험/행사 (event)
    ↓
[우선순위 4] 일반 공지 (info)
```

### 3.2 시각적 디자인 원칙

#### 토스 스타일 적용
- **둥근 모서리**: rounded-3xl (32px)
- **간격**: gap-3 (12px), gap-4 (16px), gap-5 (20px)
- **배경**: 흰색 카드 (bg-white) + 부드러운 그림자 (shadow-sm)
- **색상 시스템**: 기존 NOTICE_STYLES 활용
  - warning: toss-orange (주황색)
  - holiday: toss-red (빨간색)
  - event: toss-blue (파란색)
  - info: grey (회색)

#### 타이포그래피
- **제목**: text-headline (24px, font-bold)
- **본문**: text-body (16px)
- **메타 정보**: text-body-sm (14px), text-grey-500

#### 애니메이션
- **등장**: animate-slide-down (0.2s ease-out)
- **강조**: animate-pulse-soft (현재 진행 중인 공지)
- **호버**: hover:bg-grey-50 전환
- **클릭**: active:scale-[0.99] 피드백

### 3.3 반응형 전략

| 화면 크기 | 레이아웃 | 표시 개수 |
|----------|---------|----------|
| PC (>1024px) | 가로 배치 (grid-cols-3) | 최대 3개 |
| 태블릿 (768-1024px) | 2열 그리드 (grid-cols-2) | 최대 2개 |
| 모바일 (<768px) | 세로 배치 (grid-cols-1) | 최대 2개 |

---

## 4. 히어로 섹션 설계안

### 4.1 패턴 A: 캘린더 상단 배너 (추천)

#### 구조
```
┌─────────────────────────────────────────────────────┐
│  [아이콘] 오늘의 알림                    [더보기 >]    │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ [!] 긴급  │  │ [달력] 휴원│  │ [별] 시험 │          │
│  │ 제목      │  │ 제목      │  │ 제목     │          │
│  │ 설명...   │  │ 설명...   │  │ 설명...  │          │
│  └──────────┘  └──────────┘  └──────────┘          │
└─────────────────────────────────────────────────────┘
```

#### 장점
- 캘린더와 공지사항을 명확히 분리
- 공지에 충분한 시각적 공간 확보
- 여러 공지를 카드 형태로 나열 가능
- 토스 스타일 카드 그리드와 일관성

#### 단점
- 스크롤 길이 증가
- 캘린더와의 연결성 약함

#### 구현 컴포넌트
- `NoticeBanner.tsx`: 전체 배너 컨테이너
- `NoticeCard.tsx`: 개별 공지 카드
- 위치: WeeklyCalendar 위 (AdminDashboard.tsx)

---

### 4.2 패턴 B: 캘린더 하단 인라인

#### 구조
```
┌─────────────────────────────────────────────────────┐
│  [< 2025년 12월 3주차 >]                   [오늘]    │
│  ┌────┬────┬────┬────┬────┬────┬────┐              │
│  │ 월 │ 화 │ 수 │ 목 │ 금 │ 토 │ 일 │              │
│  │ 16 │ 17 │ 18 │ 19 │ 20 │ 21 │ 22 │              │
│  └────┴────┴────┴────┴────┴────┴────┘              │
│                                                      │
│  📢 오늘의 알림: [!] 12/21(토) 모의고사 (전 학년)    │
└─────────────────────────────────────────────────────┘
```

#### 장점
- 캘린더와 공지의 강한 연결성
- 컴팩트한 레이아웃
- 날짜 선택 시 즉각적인 피드백

#### 단점
- 긴 공지 표시 어려움
- 여러 공지 표시 시 복잡해짐
- 시각적 임팩트 부족

#### 구현 컴포넌트
- `InlineNotice.tsx`: 단일 라인 공지
- 위치: WeeklyCalendar 내부 하단

---

### 4.3 패턴 C: 캘린더-공지 통합형 (혁신안)

#### 구조
```
┌─────────────────────────────────────────────────────┐
│  [< 2025년 12월 3주차 >]                   [오늘]    │
│                                                      │
│  ┌────┬────┬────┬────┬────┬────┬────┐              │
│  │ 월 │ 화 │ 수 │ 목 │ 금 │ 토 │ 일 │              │
│  │ 16 │ 17 │ 18 │ 19 │ 20 │ 21 │ 22 │              │
│  │    │    │    │휴원 │    │[!]  │    │              │
│  └────┴────┴────┴────┴────┴────┴────┘              │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ 📅 12/21(토) 선택됨                           │  │
│  │                                               │  │
│  │ ⚠️  중요: 전국 모의고사 (전 학년)              │  │
│  │     - 시간: 오전 9시~12시                     │  │
│  │     - 준비물: 필기구, 수험표                  │  │
│  │                                               │  │
│  │ 📝 안내: 점심시간 12:30~13:30 연장            │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

#### 장점
- 날짜와 공지의 완벽한 연동
- Progressive Disclosure (선택 시 상세 표시)
- 정보 밀도 최적화
- 토스 스타일 컨텍스트 기반 표시

#### 단점
- 구현 복잡도 높음
- 날짜 선택하지 않으면 공지 안 보임
- 모바일에서 공간 부족 가능성

#### 구현 컴포넌트
- `SelectedDateNotices.tsx`: 선택된 날짜 공지 패널
- 위치: WeeklyCalendar 내부 하단 (확장형)

---

## 5. 추천안: 패턴 A + C 하이브리드

### 5.1 설계 컨셉

**"오늘의 중요 알림 + 선택 날짜 상세 공지"**

#### 레이아웃
```
┌─────────────────────────────────────────────────────┐
│  📢 오늘의 중요 알림                      [전체보기]  │
│  ┌──────────┐  ┌──────────┐                         │
│  │ [!] 긴급  │  │ [달력] 휴원│                         │
│  │ 모의고사  │  │ 12/25 휴원│                         │
│  └──────────┘  └──────────┘                         │
└─────────────────────────────────────────────────────┘
    ↓ gap-4 (16px)
┌─────────────────────────────────────────────────────┐
│  [< 2025년 12월 3주차 >]                   [오늘]    │
│  ┌────┬────┬────┬────┬────┬────┬────┐              │
│  │ 월 │ 화 │ 수 │ 목 │ 금 │ 토 │ 일 │              │
│  │ 16 │ 17 │ 18 │ 19 │ 20 │ 21 │ 22 │              │
│  │    │    │    │휴원 │    │[!]  │    │              │
│  └────┴────┴────┴────┴────┴────┴────┘              │
│                                                      │
│  선택: 12/21(토) - 2건의 알림                        │
│  ┌──────────────────────────────────────────────┐  │
│  │ ⚠️  전국 모의고사 (전 학년) 09:00~12:00        │  │
│  │ 📝 점심시간 연장 안내 12:30~13:30              │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 5.2 동작 방식

#### 초기 상태 (날짜 선택 전)
1. 상단 배너: 오늘(또는 이번 주)의 중요 알림 최대 2개 표시
2. 캘린더: 주간 뷰 표시, 공지 있는 날짜에 아이콘/점 표시
3. 하단 패널: 숨김 또는 "날짜를 선택하세요" 안내

#### 날짜 선택 시
1. 상단 배너: 유지 (변경 없음)
2. 캘린더: 선택된 날짜 강조 (ring-2 ring-toss-blue)
3. 하단 패널: 확장 애니메이션 (animate-slide-down)
   - 선택된 날짜의 모든 공지 표시
   - 공지 유형별 아이콘 + 색상
   - 시간 정보 포함 시 표시

#### 오늘 버튼 클릭 시
1. 캘린더: 오늘로 이동
2. 하단 패널: 오늘의 공지 표시
3. 상단 배너: 오늘의 중요 알림과 동기화

### 5.3 컴포넌트 구조

```typescript
AdminDashboard.tsx
├── TodayNoticeBanner (패턴 A)
│   ├── NoticeCard × N개
│   └── "전체보기" 링크
│
├── WeeklyCalendar
│   ├── CalendarDayCell × 7개
│   │   └── 공지 뱃지 (최대 2개)
│   └── SelectedDateNotices (패턴 C)
│       ├── NoticeItem × N개
│       └── 빈 상태 안내
│
└── TimeSlotGroupList (기존)
```

### 5.4 데이터 흐름

```typescript
// 1. 오늘의 중요 알림 (상단 배너)
const { data: todayImportantNotices } = useAdminNotices({
  weekRange: todayWeekRange,
  priority: 'high', // priority >= 50
  limit: 2
});

// 2. 주간 공지 (캘린더 뱃지)
const { data: noticesByDate } = useAdminNotices({
  weekRange: currentWeekRange,
});

// 3. 선택된 날짜 공지 (하단 패널)
const selectedNotices = noticesByDate?.[selectedDate] || [];
```

---

## 6. 공지 유형별 시각적 디자인

### 6.1 공지 타입 정의 (기존)

```typescript
export type NoticeType = 'warning' | 'info' | 'holiday' | 'event';

export const NOTICE_STYLES: Record<NoticeType, {
  textColor: string;
  dotColor: string;
  bgColor: string;
  badgeBg: string;
}> = {
  warning: {
    textColor: 'text-toss-orange',
    dotColor: 'bg-toss-orange',
    bgColor: 'bg-toss-orangeLight',
    badgeBg: 'bg-toss-orangeLight',
  },
  info: { /* 회색 */ },
  holiday: { /* 빨간색 */ },
  event: { /* 파란색 */ },
};
```

### 6.2 공지 카드 스타일

#### 상단 배너 카드 (TodayNoticeBanner)
```tsx
<div className="bg-white rounded-2xl p-4 hover:bg-grey-50/50 cursor-pointer">
  <div className="flex items-start gap-3">
    {/* 아이콘 */}
    <div className={`w-10 h-10 rounded-xl ${NOTICE_STYLES[type].bgColor} flex items-center justify-center flex-shrink-0`}>
      <AlertCircle className={`w-5 h-5 ${NOTICE_STYLES[type].textColor}`} />
    </div>

    {/* 내용 */}
    <div className="flex-1 min-w-0">
      <h4 className="text-body font-semibold text-grey-900 mb-1 truncate">
        {title}
      </h4>
      <p className="text-body-sm text-grey-600 line-clamp-2">
        {description}
      </p>
      <span className="text-caption text-grey-400 mt-1 block">
        {date} · {type === 'event' ? '행사' : type === 'holiday' ? '휴원' : '알림'}
      </span>
    </div>
  </div>
</div>
```

#### 하단 패널 아이템 (SelectedDateNotices)
```tsx
<div className="flex items-center gap-3 py-3 border-b border-grey-100 last:border-0">
  {/* 시간 (있는 경우) */}
  {startTime && (
    <span className="text-body-sm font-medium text-grey-500 w-16 flex-shrink-0">
      {startTime}
    </span>
  )}

  {/* 아이콘 */}
  <div className={`w-8 h-8 rounded-lg ${NOTICE_STYLES[type].bgColor} flex items-center justify-center flex-shrink-0`}>
    <Icon className={`w-4 h-4 ${NOTICE_STYLES[type].textColor}`} />
  </div>

  {/* 제목 */}
  <span className="text-body text-grey-900 flex-1">
    {title}
  </span>
</div>
```

### 6.3 아이콘 매핑

```typescript
import { AlertCircle, Calendar, Bell, Star } from 'lucide-react';

export const NOTICE_ICONS: Record<NoticeType, LucideIcon> = {
  warning: AlertCircle,   // 느낌표 원
  holiday: Calendar,      // 달력
  event: Star,            // 별
  info: Bell,             // 종
};
```

---

## 7. 반응형 동작

### 7.1 PC (>1024px)

- 상단 배너: 3열 그리드, 최대 3개 카드
- 캘린더: 7일 전체 표시
- 하단 패널: 전체 너비, 좌우 여백 충분

### 7.2 태블릿 (768-1024px)

- 상단 배너: 2열 그리드, 최대 2개 카드
- 캘린더: 7일 전체 표시 (축소)
- 하단 패널: 전체 너비, 여백 축소

### 7.3 모바일 (<768px)

- 상단 배너: 1열, 최대 1개 카드 (나머지는 "더보기")
- 캘린더: 7일 전체 표시 (최소 크기)
- 하단 패널: 전체 너비, 패딩 최소화

---

## 8. 애니메이션 전략

### 8.1 등장 애니메이션

```css
/* 상단 배너 카드 순차 등장 */
.notice-card {
  animation: slideDown 0.2s ease-out;
  animation-delay: calc(var(--index) * 50ms);
}

/* 하단 패널 확장 */
.selected-notices-panel {
  animation: slideDown 0.2s ease-out;
  transform-origin: top;
}
```

### 8.2 상태 전환

```typescript
// 날짜 선택 시
const [isExpanded, setIsExpanded] = useState(false);

useEffect(() => {
  if (selectedNotices.length > 0) {
    setIsExpanded(true);
  } else {
    setIsExpanded(false);
  }
}, [selectedNotices]);
```

### 8.3 호버/클릭 피드백

```tsx
// 카드 호버
className="transition-all duration-200 hover:bg-grey-50/50 active:scale-[0.99]"

// 펄스 효과 (긴급 공지)
{type === 'warning' && (
  <span className="absolute top-2 right-2 w-2 h-2 bg-toss-orange rounded-full animate-pulse-soft" />
)}
```

---

## 9. 접근성 (a11y)

### 9.1 스크린 리더 지원

```tsx
<div role="region" aria-label="오늘의 중요 알림">
  {notices.map((notice) => (
    <button
      key={notice.id}
      role="article"
      aria-label={`${notice.type} 공지: ${notice.title}`}
      onClick={() => handleNoticeClick(notice.id)}
    >
      {/* 카드 내용 */}
    </button>
  ))}
</div>

<div
  role="region"
  aria-label="선택된 날짜의 알림"
  aria-live="polite"
>
  {selectedNotices.length > 0 ? (
    <ul>
      {selectedNotices.map((notice) => (
        <li key={notice.id}>{notice.title}</li>
      ))}
    </ul>
  ) : (
    <p>알림이 없습니다.</p>
  )}
</div>
```

### 9.2 키보드 네비게이션

- Tab: 공지 카드 간 이동
- Enter: 공지 상세 보기
- Escape: 상세 패널 닫기 (모달인 경우)

### 9.3 색상 대비

- 모든 텍스트: WCAG AA 기준 (4.5:1 이상)
- 아이콘: 배경과 충분한 대비
- 상태 표시: 색상만으로 표현하지 않음 (아이콘 병행)

---

## 10. 성능 최적화

### 10.1 데이터 캐싱

```typescript
export function useAdminNotices(options: UseAdminNoticesOptions = {}) {
  return useQuery({
    queryKey: ['admin', 'notices', weekRange?.start, weekRange?.end],
    queryFn: async () => { /* ... */ },
    staleTime: 60 * 1000, // 1분 캐시 (기존)
    cacheTime: 5 * 60 * 1000, // 5분 메모리 유지
  });
}
```

### 10.2 렌더링 최적화

```typescript
// 메모이제이션
const todayNotices = useMemo(() => {
  return noticesByDate?.[todayKey]
    ?.filter((n) => n.priority >= 50)
    ?.slice(0, 2) || [];
}, [noticesByDate, todayKey]);

// 가상화 (긴 리스트인 경우)
import { useVirtualizer } from '@tanstack/react-virtual';
```

### 10.3 이미지 레이지 로딩

```tsx
{notice.imageUrl && (
  <img
    src={notice.imageUrl}
    alt=""
    loading="lazy"
    className="rounded-lg object-cover"
  />
)}
```

---

## 11. 구현 우선순위

### Phase 1: 핵심 기능 (MVP)
- [ ] TodayNoticeBanner 컴포넌트 생성
- [ ] NoticeCard 컴포넌트 생성
- [ ] useAdminNotices 훅 확장 (priority 필터)
- [ ] AdminDashboard에 TodayNoticeBanner 추가

### Phase 2: 날짜 연동
- [ ] SelectedDateNotices 컴포넌트 생성
- [ ] WeeklyCalendar에 하단 패널 추가
- [ ] 날짜 선택 시 패널 확장 애니메이션
- [ ] 빈 상태 처리

### Phase 3: 시각적 폴리시
- [ ] 공지 유형별 아이콘 추가
- [ ] 호버/클릭 애니메이션
- [ ] 긴급 공지 펄스 효과
- [ ] 반응형 그리드 조정

### Phase 4: 상세 기능
- [ ] "전체보기" 모달/페이지
- [ ] 공지 클릭 시 상세 뷰
- [ ] 읽음/안 읽음 상태 관리
- [ ] 푸시 알림 연동 (선택)

---

## 12. 예상 이슈 및 해결책

### 이슈 1: 공지가 너무 많을 때
**문제**: 한 날짜에 5개 이상의 공지
**해결**:
- 상단 배너: 최대 2개, "더보기" 링크
- 하단 패널: 최대 5개, 스크롤 가능
- 우선순위 기반 정렬

### 이슈 2: 공지가 없을 때
**문제**: 빈 상태 UX
**해결**:
```tsx
{selectedNotices.length === 0 && (
  <div className="text-center py-8 text-grey-400">
    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
    <p className="text-body-sm">이 날짜에는 알림이 없습니다.</p>
  </div>
)}
```

### 이슈 3: 긴 공지 제목
**문제**: 카드 레이아웃 깨짐
**해결**:
- truncate (1줄)
- line-clamp-2 (2줄)
- 툴팁으로 전체 텍스트 표시

### 이슈 4: 모바일 스크롤 길이
**문제**: 배너 + 캘린더 + 패널로 인한 긴 스크롤
**해결**:
- 모바일에서 상단 배너 숨김 (또는 최소화)
- Sticky 헤더로 캘린더 고정
- Progressive Disclosure 강화

---

## 13. 테스트 체크리스트

### 기능 테스트
- [ ] 오늘의 중요 알림 2개 표시 확인
- [ ] 날짜 선택 시 해당 날짜 공지 표시
- [ ] 공지 없는 날짜 선택 시 빈 상태 표시
- [ ] "오늘" 버튼 클릭 시 오늘 공지 표시
- [ ] 주 이동 시 공지 데이터 업데이트
- [ ] 공지 유형별 색상/아이콘 올바른 표시

### 반응형 테스트
- [ ] PC: 3열 그리드 레이아웃
- [ ] 태블릿: 2열 그리드 레이아웃
- [ ] 모바일: 1열 레이아웃
- [ ] 화면 크기 변경 시 부드러운 전환

### 애니메이션 테스트
- [ ] 배너 카드 순차 등장 (50ms 간격)
- [ ] 하단 패널 확장 애니메이션 (0.2s)
- [ ] 카드 호버 시 배경 전환
- [ ] 클릭 시 scale 피드백

### 접근성 테스트
- [ ] 스크린 리더로 공지 읽기
- [ ] 키보드로 모든 카드 접근 가능
- [ ] 색상 대비 WCAG AA 통과
- [ ] aria-label 올바른 설정

### 성능 테스트
- [ ] 50개 공지 로딩 시간 < 500ms
- [ ] 날짜 선택 반응 시간 < 100ms
- [ ] 메모리 누수 없음 (개발자 도구 확인)

---

## 14. 향후 확장 가능성

### Phase 5: 고급 기능
- **공지 필터링**: 유형별, 날짜 범위별
- **공지 검색**: 제목/내용 전문 검색
- **공지 생성**: 관리자가 직접 공지 작성
- **반복 공지**: 매주 월요일, 매월 첫째 주 등
- **푸시 알림**: 중요 공지 실시간 알림

### Phase 6: 데이터 분석
- **조회 통계**: 어떤 공지를 많이 보는지
- **읽음률**: 공지별 읽음률 대시보드
- **효과 측정**: 공지 후 행동 변화 분석

### Phase 7: 다국어 지원
- **i18n 적용**: 공지 타입 라벨 번역
- **날짜 포맷**: 로케일별 날짜 형식
- **RTL 레이아웃**: 아랍어 등 우측 정렬 언어

---

## 15. 결론 및 권고사항

### 권장 솔루션
**패턴 A + C 하이브리드** (상단 배너 + 선택 날짜 패널)

### 핵심 장점
1. **정보 계층 명확**: 중요 알림 → 주간 캘린더 → 선택 날짜 상세
2. **토스 스타일 일관성**: 둥근 모서리, 부드러운 애니메이션, 미니멀 디자인
3. **Progressive Disclosure**: 필요한 정보만 단계적 표시
4. **접근성 우수**: 키보드, 스크린 리더 모두 지원
5. **확장 가능성**: 향후 기능 추가 용이

### 주의사항
- 모바일에서 스크롤 길이 관리 (배너 최소화 또는 숨김)
- 공지 데이터 캐싱으로 성능 유지
- 긴급 공지 과다 사용 방지 (사용자 피로도 증가)

### 다음 단계
1. **상세 개발 계획 작성**: 파일별 타입, import 경로, API 스키마 확정
2. **목업 제작**: HTML 프로토타입으로 레이아웃 검증
3. **Phase별 개발 진행**: MVP → 날짜 연동 → 폴리시 → 고급 기능

---

## 참고 자료

- [Best Practices and Creative Hero Section Design Ideas for 2025](https://detachless.com/blog/hero-section-web-design-ideas)
- [10 best hero section examples and what makes them effective](https://blog.logrocket.com/ux-design/hero-section-examples-best-practices/)
- [Calendar Design: UX/UI Tips for Functionality](https://pageflows.com/resources/exploring-calendar-design/)
- [Calendar UI Examples: 33 Inspiring Designs](https://www.eleken.co/blog-posts/calendar-ui)
- [Design Guidelines For Better Notifications UX](https://www.smashingmagazine.com/2025/07/design-guidelines-better-notifications-ux/)
- [Dashboard Design Patterns](https://dashboarddesignpatterns.github.io/)
- [Hero – SAP Digital Design System](https://www.sap.com/design-system/digital/patterns/hero/)
- [Dashboards: Hero Widget | SmartSuite](https://help.smartsuite.com/en/articles/9854363-dashboards-hero-widget)
- [랠리즈 학원관리프로그램](https://www.rallyz.co.kr/)
- [클래스업 무료 학원 자동화 솔루션](https://classup.io/)

---

**작성자**: Claude Code
**검토 필요**: 사용자 피드백 후 상세 개발 계획 작성
**연관 문서**:
- [400_pc_calendar_dashboard_development_plan.md](400_pc_calendar_dashboard_development_plan.md)
- [401_rotation_dashboard_integration_plan.md](401_rotation_dashboard_integration_plan.md)
- [CLAUDE.md](../CLAUDE.md)
