# 대용량 문제은행 UI/UX 연구 리포트

**작성일**: 2025-12-09
**목적**: 1000개 이상 문제 효율적 표시 및 관리 방안 연구

---

## 1. 현재 시스템 분석

### 1.1 현재 구현 (`CropProblemBank.tsx`)

| 기능 | 구현 상태 | 비고 |
|------|----------|------|
| 검색 | ✅ 완료 | 텍스트 검색 |
| 문서별 그룹화 | ✅ 완료 | `groupBy: 'document' \| 'none'` |
| 그리드/리스트 뷰 | ✅ 완료 | `viewMode: 'grid' \| 'list'` |
| 다중 선택/삭제 | ✅ 완료 | Phase 24-B |
| 해설 연결 표시 | ✅ 완료 | Phase 24-C |

### 1.2 현재 문제점

```
문제: 1000개 이상 문제 시 예상 문제

1. 초기 로딩 시간 증가
   - 모든 문제를 한 번에 렌더링
   - DOM 노드 수 폭발적 증가

2. 스크롤 성능 저하
   - 수천 개의 이미지 동시 로드
   - 메모리 사용량 급증

3. 탐색 어려움
   - 특정 문제 찾기 힘듦
   - 문서별 그룹화만으로 부족
```

---

## 2. 업계 표준 솔루션

### 2.1 데이터 로딩 패턴 비교

| 패턴 | 적합한 상황 | 장점 | 단점 |
|------|------------|------|------|
| **페이지네이션** | 목표 지향적 탐색 | 위치 파악 용이, URL 공유 가능 | 페이지 전환 필요 |
| **무한 스크롤** | 탐색/발견 중심 | 자연스러운 흐름 | 위치 기억 어려움 |
| **가상 스크롤** | 대용량 리스트 | DOM 최적화, 빠른 렌더링 | 검색(Ctrl+F) 불가 |
| **하이브리드** | SaaS 대시보드 | 상태 예측 가능 | 구현 복잡 |

**권장**: 문제은행은 **페이지네이션 + 가상 스크롤 하이브리드** 방식

> 참고: [LogRocket - Pagination vs Infinite Scroll](https://blog.logrocket.com/ux-design/pagination-vs-infinite-scroll-ux/)

### 2.2 가상 스크롤 (Virtual Scrolling)

```
개념: 화면에 보이는 항목만 렌더링

예시: 1000개 문제 중 20개만 DOM에 존재
- 초기 로드: ~20개 DOM 노드
- 스크롤 시: 노드 재활용
- 메모리 사용: 최소화
```

**React 라이브러리**:
- [react-window](https://web.dev/articles/virtualize-long-lists-react-window) - 경량, 단순
- [react-virtualized](https://github.com/bvaughn/react-virtualized) - 기능 풍부
- [react-virtuoso](https://blog.logrocket.com/rendering-large-lists-react-virtualized/) - 가변 높이 지원

### 2.3 계층적 필터링

**Moodle 문제은행 구조**:
```
📁 수학
  📁 고1 공통수학
    📁 1단원: 다항식
      📄 문제 1
      📄 문제 2
    📁 2단원: 방정식
      📄 문제 3
```

> 참고: [Moodle Question Bank Management](https://www.monash.edu/learning-teaching/teachhq/moodle/quiz/how-to/manage-the-question-bank)

---

## 3. 다른 시스템 사례 분석

### 3.1 교육 플랫폼 비교

| 시스템 | 조직 방법 | 필터링 | 특징 |
|--------|----------|--------|------|
| **Moodle** | 계층적 카테고리 | 태그, 카테고리, 난이도 | 랜덤 출제 지원 |
| **Quizlet** | 폴더/세트 | 검색, 최근 학습 | 직관적 UI |
| **Anki** | 덱/서브덱 | 태그, 카드 브라우저 | 100,000+ 카드 처리 |
| **College Board SAT** | 도메인/스킬 | 평가, 도메인, 난이도 | 목표 기반 학습 |
| **Blackbaud** | 뱅크/서브뱅크 | 문제 유형 | 교사별 관리 |

> 참고: [XB Software - Question Bank Software](https://xbsoftware.com/case-studies-webdev/question-bank-software/)

### 3.2 Anki의 대용량 처리

```
특징:
- 100,000+ 카드 무리 없이 처리
- 카드 브라우저: 정렬 + 검색 + 필터
- 태그 시스템: 다중 태그 지원
- 덱 계층: 무제한 하위 덱
```

### 3.3 Quizlet의 UX

```
특징:
- 미니멀리스트 UI
- 툴팁으로 기능 설명
- 폴더 + 세트 2단계 구조
- 빠른 검색
```

---

## 4. 권장 구현 방안

### 4.1 즉시 적용 가능 (Low Effort, High Impact)

#### A. 페이지네이션 추가

```typescript
// useAllExportedProblems 옵션 활용
const { data } = useAllExportedProblems({
  search,
  limit: 50,        // 페이지당 50개
  offset: page * 50 // 현재 페이지
});
```

**UI 변경**:
```
┌────────────────────────────────────────┐
│ 📚 문제은행 (1,234개)                  │
├────────────────────────────────────────┤
│ [검색창] [필터▼] [그룹화▼] [뷰 전환]  │
├────────────────────────────────────────┤
│                                        │
│  문제 카드 그리드 (50개)               │
│                                        │
├────────────────────────────────────────┤
│   << < [1] 2 3 ... 25 > >>            │
│   페이지 1 / 25 (50개씩 보기)          │
└────────────────────────────────────────┘
```

#### B. 고급 필터 패널

```
필터 옵션:
- 문서/교재: [선택▼]
- 학년/과정: [선택▼]
- 페이지 범위: [__ ~ __]
- 해설 연결: [전체 | 연결됨 | 미연결]
- 확정 상태: [전체 | 확정 | 미확정]
- 정렬: [최신순 | 문제번호순 | 페이지순]
```

### 4.2 중기 개선 (Medium Effort)

#### A. 가상 스크롤 적용

```typescript
import { FixedSizeGrid } from 'react-window';

<FixedSizeGrid
  columnCount={4}
  columnWidth={220}
  height={600}
  rowCount={Math.ceil(problems.length / 4)}
  rowHeight={280}
  width={900}
>
  {({ columnIndex, rowIndex, style }) => (
    <ProblemCard
      problem={problems[rowIndex * 4 + columnIndex]}
      style={style}
    />
  )}
</FixedSizeGrid>
```

#### B. 트리 구조 네비게이션

```
┌──────────────┬───────────────────────────┐
│ 📁 교재 목록 │ 문제 리스트              │
│              │                           │
│ ▼ 베이직쎈   │  ┌──────┐ ┌──────┐       │
│   ▼ 공통수학1│  │문제 1│ │문제 2│       │
│     📄 8p    │  └──────┘ └──────┘       │
│     📄 9p    │                           │
│     📄 10p   │  ┌──────┐ ┌──────┐       │
│   ▼ 공통수학2│  │문제 3│ │문제 4│       │
│              │  └──────┘ └──────┘       │
└──────────────┴───────────────────────────┘
```

### 4.3 장기 개선 (High Effort)

#### A. 태그 시스템

```typescript
interface Problem {
  // ... 기존 필드
  tags: string[];  // ["다항식", "인수분해", "중급"]
}
```

**UI**:
```
태그: [다항식 ×] [인수분해 ×] [+ 태그 추가]
```

#### B. 스마트 검색

```
검색 예시:
- "8p 1번" → 8페이지 1번 문제
- "인수분해" → 태그 또는 내용 검색
- "베이직쎈 공통수학" → 교재 필터
```

#### C. 대시보드 통계

```
┌────────────────────────────────────────┐
│ 📊 문제은행 통계                       │
├────────────────────────────────────────┤
│ 총 문제: 1,234개                       │
│ 해설 연결: 987개 (80%)                 │
│ 교재별 분포: [차트]                    │
│ 최근 추가: 오늘 45개                   │
└────────────────────────────────────────┘
```

---

## 5. 구현 우선순위 제안

### Phase 61: 페이지네이션 (1-2시간)

```
1. API 수정: offset/limit 파라미터 적용
2. 페이지네이션 컴포넌트 추가
3. URL 상태 저장 (새로고침 시 페이지 유지)
```

### Phase 62: 고급 필터 (2-3시간)

```
1. 필터 패널 UI 구현
2. 복합 필터 로직 (AND/OR)
3. 필터 상태 URL 저장
```

### Phase 63: 가상 스크롤 (3-4시간)

```
1. react-window 또는 react-virtuoso 적용
2. 그리드/리스트 뷰 모두 지원
3. 스크롤 위치 복원
```

### Phase 64: 트리 네비게이션 (4-6시간)

```
1. 사이드바 트리 컴포넌트
2. 교재 > 페이지 계층 구조
3. 트리 선택 시 필터 적용
```

---

## 6. 기술 스택 권장

| 기능 | 권장 라이브러리 | 대안 |
|------|----------------|------|
| 가상 스크롤 | `react-window` | `react-virtuoso` |
| 테이블 | `@tanstack/react-table` | AG Grid |
| 트리 뷰 | `react-arborist` | 직접 구현 |
| 필터 UI | Headless UI | Radix UI |
| 페이지네이션 | 직접 구현 | React Paginate |

---

## 7. 결론

### 즉시 적용 권장
1. **페이지네이션**: 가장 빠른 성능 개선
2. **필터 고도화**: 사용성 대폭 향상

### 중기 목표
3. **가상 스크롤**: 수천 개 문제도 부드럽게
4. **트리 네비게이션**: 직관적 탐색

### 핵심 원칙
- "페이지당 20-50개" 원칙 유지
- URL에 상태 저장 (공유 가능)
- 점진적 로딩 (필요할 때 더 로드)

---

## 참고 자료

### 데이터 테이블 UX
- [LogRocket - Pagination vs Infinite Scroll](https://blog.logrocket.com/ux-design/pagination-vs-infinite-scroll-ux/)
- [Designerly - Infinite Scroll Best Practices 2024](https://designerly.com/infinite-scroll/)
- [LogRocket - Data Table Design Best Practices](https://blog.logrocket.com/ux-design/data-table-design-best-practices/)

### 가상 스크롤
- [web.dev - Virtualize Large Lists with react-window](https://web.dev/articles/virtualize-long-lists-react-window)
- [LogRocket - Rendering Large Lists with React Virtualized](https://blog.logrocket.com/rendering-large-lists-react-virtualized/)

### 문제은행 시스템
- [XB Software - Question Bank Management System](https://xbsoftware.com/case-studies-webdev/question-bank-software/)
- [Moodle - Question Bank Management](https://www.monash.edu/learning-teaching/teachhq/moodle/quiz/how-to/manage-the-question-bank)
- [OnlineExamMaker - Best Question Bank Systems 2025](https://onlineexammaker.com/kb/7-best-question-bank-systems-for-education-training/)

### LMS UI/UX
- [RiseApps - LMS UI/UX Design Tips 2025](https://riseapps.co/lms-ui-ux-design/)
- [Gyrus - Best Practices for LMS UI](https://www.gyrus.com/blogs/how-to-design-an-effective-lms-user-interface/)

---

*연구 완료: 2025-12-09*
