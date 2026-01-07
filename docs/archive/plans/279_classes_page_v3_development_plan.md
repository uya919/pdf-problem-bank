# ClassesPage v3 개발 계획

> 작성일: 2025-12-11
> 목업: `docs/mockups/classes-page-v3-segment-control.html`
> 참조: 275, 276, 277, 278번 연구 리포트

---

## 1. 현재 vs 목표

| 항목 | 현재 (v2) | 목표 (v3) |
|------|-----------|-----------|
| 기간 선택 | 없음 | **세그먼트 컨트롤** (2회/3회/5회/월간) |
| 헤더 | 반 정보만 | **반 정보 + 세그먼트 통합** (56px) |
| 출석 | 출석률 % | **기간별 결석자 명단** |
| 진도 | 최근 1회 | **기간별 타임라인** |
| 시험 | Daily/Weekly/Monthly 탭 | **기간별 시험 결과** |
| 학생 | 중간 위치 | **최하단 고정** |
| UI 패턴 | 아코디언 | **카드 섹션** |

---

## 2. 재사용 가능 컴포넌트

| 컴포넌트 | 파일 | 상태 |
|----------|------|------|
| MonthlyCalendarModal | `modals/MonthlyCalendarModal.tsx` | ✅ 재사용 |
| BottomSheet | `modals/BottomSheet.tsx` | ✅ 재사용 |
| BottomNavBar | `pages/backoffice/components/BottomNavBar.tsx` | ✅ 재사용 |

---

## 3. 개발 Phase

### Phase 1: 기간 선택 컴포넌트

**1.1 PeriodSegmentControl.tsx** (신규)
```
위치: frontend/src/components/backoffice/classes/PeriodSegmentControl.tsx
```

기능:
- 세그먼트 버튼: 2회 / 3회 / 5회 / 월간
- 미니 사이즈 (높이 28px)
- "월간" 클릭 시 MonthlyCalendarModal 열기
- 날짜 범위 자동 계산

Props:
```typescript
interface PeriodSegmentControlProps {
  selectedPeriod: '2회' | '3회' | '5회' | '월간';
  onPeriodChange: (period: string) => void;
  onOpenMonthly: () => void;
}
```

---

### Phase 2: 헤더 통합 컴포넌트

**2.1 ClassHeaderCard.tsx** (신규)
```
위치: frontend/src/components/backoffice/classes/ClassHeaderCard.tsx
```

기능:
- 행 1: 반 이름 + 세그먼트 컨트롤
- 행 2: 과목/시간 + 날짜 범위
- 높이: ~56px

레이아웃:
```
┌─────────────────────────────────────────┐
│ 중3A반            [2회][3회][5회][월간] │
│ 수학 · 월/수/금 17:00        12/9~12/11 │
└─────────────────────────────────────────┘
```

---

### Phase 3: 결석자 섹션

**3.1 AbsenceSection.tsx** (신규)
```
위치: frontend/src/components/backoffice/classes/AbsenceSection.tsx
```

기능:
- 날짜별 결석자 그룹핑
- 결석 사유 표시 (병원, 무단 등)
- "연락" 버튼 → ContactBottomSheet 열기
- 전원 출석 시 "👏 전원 출석!" 메시지

데이터 구조:
```typescript
interface AbsenceData {
  date: string;           // "12/11 (수)"
  isToday?: boolean;
  students: Array<{
    id: string;
    name: string;
    reason?: string;      // "병원", "무단" 등
  }>;
}
```

---

### Phase 4: 연락하기 바텀시트

**4.1 ContactBottomSheet.tsx** (신규)
```
위치: frontend/src/components/backoffice/modals/ContactBottomSheet.tsx
```

기능:
- 학생 본인 연락처
- 보호자 연락처
- 전화/문자 버튼

---

### Phase 5: 진도 타임라인 섹션

**5.1 ProgressTimelineSection.tsx** (신규)
```
위치: frontend/src/components/backoffice/classes/ProgressTimelineSection.tsx
```

기능:
- 타임라인 형태 (●/○ 마커)
- 날짜별 수업 내용
- 단원, 교재, 페이지
- 숙제 상태 (완료/미완료)

레이아웃:
```
● 12/11 (수) - 오늘
  3단원. 이차방정식 응용
  베이직쎈 p.46-50
  📝 숙제 p.51-53 (8문제)
─────────────────────
● 12/9 (월)
  3단원. 이차방정식 풀이
  베이직쎈 p.42-45
  ✓ 숙제 완료 6/8
```

---

### Phase 6: 시험 섹션

**6.1 TestSection.tsx** (신규)
```
위치: frontend/src/components/backoffice/classes/TestSection.tsx
```

기능:
- 기간별 시험 목록
- 시험 유형 뱃지 (Daily/Weekly/Monthly)
- 통계: 평균, 최고, 최저
- 분포 바 (상/중/하)
- "상세 →" → TestDetailBottomSheet 열기

---

### Phase 7: 시험 상세 바텀시트

**7.1 TestDetailBottomSheet.tsx** (신규)
```
위치: frontend/src/components/backoffice/modals/TestDetailBottomSheet.tsx
```

기능:
- 학생별 점수 목록
- 점수 바 시각화
- 색상: 상위(녹색), 중위(황색), 하위(적색)

---

### Phase 8: 학생 섹션

**8.1 StudentSection.tsx** (신규)
```
위치: frontend/src/components/backoffice/classes/StudentSection.tsx
```

기능:
- 학생 칩 그리드
- 기본 5명 표시 + "더보기"
- 최하단 배치

---

### Phase 9: 페이지 통합

**9.1 ClassesPage.tsx 업데이트**
```
위치: frontend/src/pages/backoffice/ClassesPage.tsx
```

변경사항:
- v2 코드 → v3 구조로 교체
- 새 컴포넌트들 통합
- 기간 상태 관리 추가
- MonthlyCalendarModal 연동

---

## 4. 데이터 구조

### 4.1 ClassSession 타입
```typescript
interface ClassSession {
  id: string;
  date: string;           // "2024-12-11"
  dayOfWeek: string;      // "수"
  isToday?: boolean;

  // 출결
  attendance: {
    absent: Array<{
      studentId: string;
      studentName: string;
      reason?: string;
    }>;
  };

  // 진도
  progress: {
    chapter: string;
    textbook: string;
    pages: string;
    homework?: {
      range: string;
      submitted: number;
      total: number;
    };
  };

  // 시험 (해당 수업에 시험이 있었다면)
  test?: {
    type: 'daily' | 'weekly' | 'monthly';
    range: string;
    scores: Array<{
      studentId: string;
      studentName: string;
      score: number;
    }>;
  };
}
```

### 4.2 기간별 데이터 조회
```typescript
// 기간별 수업 조회 함수
function getSessionsByPeriod(
  classId: string,
  period: '2회' | '3회' | '5회' | '월간',
  monthRange?: { start: Date; end: Date }
): ClassSession[]
```

---

## 5. 파일 구조

### 신규 파일 (9개)
```
frontend/src/components/backoffice/classes/
├── PeriodSegmentControl.tsx    # Phase 1
├── ClassHeaderCard.tsx         # Phase 2
├── AbsenceSection.tsx          # Phase 3
├── ProgressTimelineSection.tsx # Phase 5
├── TestSection.tsx             # Phase 6
├── StudentSection.tsx          # Phase 8
└── index.ts                    # Export

frontend/src/components/backoffice/modals/
├── ContactBottomSheet.tsx      # Phase 4
└── TestDetailBottomSheet.tsx   # Phase 7
```

### 수정 파일 (2개)
```
frontend/src/pages/backoffice/ClassesPage.tsx      # Phase 9
frontend/src/components/backoffice/modals/index.ts # Export 추가
```

---

## 6. 구현 순서 (권장)

| 순서 | Phase | 컴포넌트 | 의존성 |
|------|-------|----------|--------|
| 1 | P1 | PeriodSegmentControl | 없음 |
| 2 | P2 | ClassHeaderCard | P1 |
| 3 | P4 | ContactBottomSheet | BottomSheet |
| 4 | P3 | AbsenceSection | P4 |
| 5 | P5 | ProgressTimelineSection | 없음 |
| 6 | P7 | TestDetailBottomSheet | BottomSheet |
| 7 | P6 | TestSection | P7 |
| 8 | P8 | StudentSection | 없음 |
| 9 | P9 | ClassesPage 통합 | 모두 |

---

## 7. Mock 데이터 계획

현재 `ClassesPage.tsx`의 `MOCK_CLASSES` 데이터를 확장:

```typescript
const MOCK_SESSIONS: ClassSession[] = [
  {
    id: 's1',
    date: '2024-12-11',
    dayOfWeek: '수',
    isToday: true,
    attendance: {
      absent: [
        { studentId: '4', studentName: '이사랑', reason: undefined },
        { studentId: '5', studentName: '박성빈', reason: '무단' },
      ]
    },
    progress: {
      chapter: '3단원. 이차방정식 응용',
      textbook: '베이직쎈',
      pages: 'p.46-50',
      homework: { range: 'p.51-53', submitted: 0, total: 8 }
    },
    test: {
      type: 'daily',
      range: '이차방정식 p.42-50',
      scores: [
        { studentId: '1', studentName: '김민수', score: 95 },
        // ...
      ]
    }
  },
  // 더 많은 세션...
];
```

---

## 8. 테스트 체크리스트

### UI 검증
- [ ] 세그먼트 클릭 → 기간 변경 확인
- [ ] 월간 클릭 → 캘린더 모달 열림
- [ ] 결석자 "연락" → 바텀시트 열림
- [ ] 시험 "상세" → 바텀시트 열림
- [ ] 반 탭 변경 → 데이터 갱신

### 레이아웃 검증
- [ ] 헤더 높이 ~56px 확인
- [ ] 세그먼트 터치 영역 최소 28px
- [ ] 모바일 반응형 (390px 기준)
- [ ] 스크롤 동작 확인

---

## 9. 주요 색상

| 용도 | 색상 코드 |
|------|-----------|
| Primary Blue | `#3182F6` |
| Text Primary | `#191F28` |
| Text Secondary | `#6B7684` |
| Text Tertiary | `#8B95A1` |
| Background | `#F9FAFB` |
| Card | `#FFFFFF` |
| Border | `#E5E8EB` |
| Success | `#22C55E` |
| Warning | `#F59E0B` |
| Danger | `#EF4444` |

---

## 10. 다음 단계

1. **Phase 1 시작**: PeriodSegmentControl 구현
2. 컴포넌트 단위 테스트
3. 페이지 통합
4. 실기기 테스트

---

*"1탭 = 1액션, 라벨 없이도 의미 전달"*
