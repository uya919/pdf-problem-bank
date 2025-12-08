# 라벨링 시스템 기능 분석 리포트

**작성일**: 2025-12-04
**요청**: 그룹 번호 표시 + 사이드바 페이지 목록 기능 분석
**분석 모드**: Opus Deep Analysis

---

## 1. 요약 (Executive Summary)

| 기능 | 현재 상태 | 구현 가능성 | 난이도 |
|------|----------|------------|-------|
| **그룹 번호 표시** | ✅ 이미 구현됨 | N/A | - |
| **저장된 페이지만 사이드바 표시** | ❌ 미구현 | ✅ 가능 | 중간 |

### 핵심 발견
1. **그룹 번호**: `PageCanvas.tsx`에서 완벽하게 구현됨 - 표시되지 않는다면 UI 가시성 문제
2. **사이드바**: 현재 "방문한 페이지"를 표시 → "저장된 페이지만" 표시로 변경 필요

---

## 2. 기능 1: 그룹 번호 표시

### 2.1 현재 구현 상태: ✅ 완전히 구현됨

#### 구현 위치
```
frontend/src/components/PageCanvas.tsx
├─ Line 83-131: getGroupStyleAndLabel() - 스타일 및 라벨 결정
└─ Line 487-506: <Label> + <Text> - 실제 렌더링
```

#### 구현 로직 (PageCanvas.tsx:83-131)
```typescript
function getGroupStyleAndLabel(group: ProblemGroup): {
  stroke: string;
  fill: string;
  tag: string;
  label: string;  // ← 이것이 그룹 번호
} {
  // 해설 그룹: 연결된 문제 번호 표시
  if (group.link?.linkType === 'solution') {
    const problemNum = ... // 복잡한 파싱
    return { label: `${problemNum}번` };
  }

  // 일반 그룹: problemNumber 또는 group.id
  const problemNumber = group.problemInfo?.problemNumber || group.id;
  return { label: problemNumber };
}
```

#### 렌더링 위치 (PageCanvas.tsx:487-506)
```typescript
<Label
  x={bbox.x + bbox.width - 60}  // 그룹 우상단
  y={bbox.y - 30}               // 그룹 위쪽 30px
  listening={false}
>
  <Tag fill={style.tag} cornerRadius={4} ... />
  <Text
    text={style.label}  // ← 번호가 여기 표시됨
    fontSize={16}
    fontStyle="bold"
    fill="white"
    padding={8}
  />
</Label>
```

### 2.2 번호가 보이지 않는 가능성

#### 가능성 1: 그룹 영역 위쪽 (y - 30) 위치 문제
```
  ┌─────────────┐
  │ [4번]       │ ← 라벨이 그룹 위쪽 30px에 표시
  └─────────────┘
  ┌─────────────────────────────────────┐
  │                                     │
  │      그룹 영역 (점선 박스)           │
  │                                     │
  └─────────────────────────────────────┘
```

**문제**: 그룹이 페이지 상단에 있으면 라벨이 화면 밖으로 나감

#### 가능성 2: problemNumber가 비어있음
```typescript
const problemNumber = group.problemInfo?.problemNumber || group.id;
//                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                    이 값이 없으면 group.id (예: "group-1234")가 표시됨
```

**확인 필요**: 그룹 생성 시 `problemInfo.problemNumber`가 제대로 설정되는지

#### 가능성 3: 캔버스 스케일/줌 문제
- 줌 레벨에 따라 라벨 크기가 달라지지 않아 가독성 문제 발생 가능

### 2.3 우려점 및 개선 제안

| 우려점 | 영향도 | 개선 방안 |
|--------|-------|----------|
| 라벨 위치 (y-30)가 화면 밖 | 중간 | 클램핑 로직 추가 (최소 y=10) |
| problemNumber 미설정 | 낮음 | 그룹 생성 시 기본값 설정 |
| 줌 레벨 대응 미흡 | 낮음 | scale에 따른 fontSize 조정 |

---

## 3. 기능 2: 저장된 페이지만 사이드바 표시

### 3.1 현재 구현 상태: ⚠️ 부분 구현 (요구사항 불일치)

#### 현재 구현 (PageViewer.tsx:696-716)
```typescript
{/* 방문한 다른 페이지들 (접힘) */}
{visitedPages.length > 0 && (
  <div className="space-y-1.5">
    <div className="text-xs text-grey-500 px-2">방문한 페이지</div>
    {visitedPages.map(pageIdx => (
      <button onClick={() => setCurrentPage(pageIdx)}>
        <span>페이지 {pageIdx + 1}</span>
      </button>
    ))}
  </div>
)}
```

**현재 동작**: 사용자가 방문한 모든 페이지 표시
**요구 사항**: 문제가 저장된 페이지만 표시

### 3.2 구현 가능성 분석

#### 방안 A: 프론트엔드에서 필터링 (권장)
```typescript
// 현재
const visitedPages = getVisitedList().filter(p => p !== currentPage);

// 변경안: 그룹이 있는 페이지만
const savedPages = visitedPages.filter(pageIdx => {
  // 해당 페이지의 그룹 수 확인
  return getPageGroupCount(pageIdx) > 0;
});
```

**장점**: 백엔드 수정 불필요
**단점**: 각 페이지별 그룹 데이터를 로드해야 함 (성능 영향)

#### 방안 B: 백엔드 API 추가
```python
# GET /api/documents/{id}/pages-with-groups
@router.get("/{document_id}/pages-with-groups")
async def get_pages_with_groups(document_id: str):
    """그룹이 있는 페이지 인덱스 목록 반환"""
    pages = []
    for groups_file in (doc_path / "groups").glob("page_*_groups.json"):
        # 파일명에서 페이지 번호 추출
        match = re.match(r"page_(\d+)_groups\.json", groups_file.name)
        if match:
            with open(groups_file) as f:
                data = json.load(f)
                if len(data.get("groups", [])) > 0:
                    pages.append(int(match.group(1)))
    return sorted(pages)
```

**장점**: 성능 최적화, 정확한 데이터
**단점**: API 추가 개발 필요

#### 방안 C: 세션 데이터 활용 (최적)
```typescript
// workSessionStore에서 세션의 problems 활용
const session = useWorkSessionStore(state => state.session);
const savedPages = [...new Set(
  session?.problems.map(p => p.pageIndex) || []
)];
```

**장점**: 이미 로드된 데이터 활용, 추가 API 불필요
**단점**: 세션 모드에서만 동작

### 3.3 구현 가능성: ✅ 높음

| 방안 | 난이도 | 소요 시간 | 권장 |
|------|-------|----------|------|
| A: 프론트엔드 필터링 | 쉬움 | 30분 | ⭐ |
| B: 백엔드 API | 중간 | 1시간 | - |
| C: 세션 데이터 활용 | 쉬움 | 20분 | ⭐⭐ |

### 3.4 우려점

| 우려점 | 영향도 | 대응 방안 |
|--------|-------|----------|
| 세션 외부에서 동작 불가 (방안 C) | 중간 | 방안 A와 조합 |
| 대용량 문서 성능 (방안 A) | 낮음 | 캐싱 적용 |
| 실시간 동기화 | 중간 | 저장 후 목록 갱신 |

---

## 4. 종합 구현 계획

### Phase 45-D: 라벨링 UI 개선 (권장)

#### Step 1: 그룹 번호 가시성 확인 (10분)
- [ ] 현재 화면에서 그룹 번호가 실제로 표시되는지 확인
- [ ] 표시되지 않는다면 라벨 위치 조정 (y-30 → 내부로)

#### Step 2: 사이드바 필터링 구현 (30분)
- [ ] 방안 C 적용: 세션 데이터에서 저장된 페이지 추출
- [ ] "방문한 페이지" → "저장된 페이지" 라벨 변경
- [ ] 그룹 수 표시 추가 (선택사항)

#### 예상 결과
```
┌─────────────────────────────┐
│ 저장된 페이지               │
│ ┌─────────────────────────┐ │
│ │ 페이지 3    ⬤ 5문제     │ │
│ │ 페이지 7    ⬤ 3문제     │ │
│ │ 페이지 12   ⬤ 8문제     │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

---

## 5. 리스크 분석

### 5.1 기술적 리스크

| 리스크 | 확률 | 영향 | 완화 전략 |
|--------|------|------|----------|
| 세션 데이터 미로드 상태 | 낮음 | 중간 | 로딩 상태 처리 |
| 그룹 저장 후 목록 미갱신 | 중간 | 낮음 | 저장 콜백에서 갱신 |
| 대용량 문서 성능 | 낮음 | 낮음 | 가상화/지연 로딩 |

### 5.2 UX 리스크

| 리스크 | 확률 | 영향 | 완화 전략 |
|--------|------|------|----------|
| 사용자 혼란 (기존과 다른 동작) | 중간 | 낮음 | 라벨 명확화 |
| 빈 목록 시 혼란 | 낮음 | 낮음 | 안내 메시지 표시 |

---

## 6. 결론 및 권장 사항

### 즉시 확인 필요
1. **그룹 번호 표시**: 실제 라벨링 화면에서 그룹 상단에 번호 배지가 보이는지 확인
   - 보인다면: 정상 동작
   - 안 보인다면: 라벨 위치(y-30) 조정 필요

### 구현 권장
2. **사이드바 개선**: 방안 C (세션 데이터 활용) 적용
   - 가장 빠르고 안정적
   - 기존 데이터 구조 활용
   - 추가 API 불필요

### 예상 소요 시간
- 확인 작업: 10분
- 사이드바 개선: 30분
- 테스트: 20분
- **총 소요: 1시간 이내**

---

*리포트 작성: Claude Opus*
*분석 완료: 2025-12-04*
