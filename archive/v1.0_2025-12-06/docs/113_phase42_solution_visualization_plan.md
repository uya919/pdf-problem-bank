# Phase 42: 해설 그룹 시각화 개발 계획

> 2025-12-04 | 해설 연결 후 그룹 시각적 표시

---

## 목표

문제 그룹처럼 해설 그룹도 캔버스에 시각적으로 구분되게 표시

```
Before: 해설 그룹이 문제 그룹과 동일한 스타일
After:  해설 그룹은 보라색 + 연결된 문제 번호 뱃지 표시
```

---

## Phase 42-A: 캔버스 색상 구분 (30분)

### A-1: PageCanvas 그룹 스타일 분기

**파일**: `frontend/src/components/PageCanvas.tsx`

**변경 내용**:
```typescript
// 그룹 스타일 결정 함수 추가
const getGroupStyle = (group: ProblemGroup) => {
  const hasLink = group.link != null;
  const linkType = group.link?.linkType;

  if (linkType === 'solution') {
    // 해설 그룹 (문제와 연결됨) - 보라색
    return {
      borderColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      labelBg: 'bg-purple-500',
    };
  }

  // 기본 문제 그룹 - 파란색
  return {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    labelBg: 'bg-blue-500',
  };
};
```

**체크리스트**:
- [ ] getGroupStyle 함수 추가
- [ ] 그룹 렌더링 시 스타일 적용
- [ ] 테스트: 해설 탭에서 연결된 그룹 보라색 확인

---

### A-2: 연결 뱃지 표시

**파일**: `frontend/src/components/PageCanvas.tsx`

**변경 내용**:
```typescript
// 그룹 라벨 결정
const getGroupLabel = (group: ProblemGroup) => {
  if (group.link?.linkType === 'solution') {
    // 연결된 문제 번호 표시 (예: "3번 해설")
    const linkedName = group.link.linkedName || '';
    const match = linkedName.match(/(\d+)/);
    return match ? `${match[1]}번` : group.id;
  }

  // 문제 그룹: 문항번호 또는 ID
  return group.problemInfo?.problemNumber || group.id;
};
```

**체크리스트**:
- [ ] getGroupLabel 함수 추가
- [ ] 라벨 렌더링에 적용
- [ ] 테스트: 해설 그룹에 "3번" 같은 라벨 표시 확인

---

## Phase 42-B: GroupPanel 연결 상태 표시 (30분)

### B-1: 연결 뱃지 컴포넌트

**파일**: `frontend/src/components/GroupPanel.tsx`

**변경 내용**:
```typescript
// 그룹 카드에 연결 상태 뱃지 추가
{group.link && (
  <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
    <Link2 className="w-3 h-3" />
    <span>{group.link.linkedName} 연결</span>
  </div>
)}
```

**체크리스트**:
- [ ] Link2 아이콘 import
- [ ] 그룹 카드에 연결 뱃지 조건부 렌더링
- [ ] 테스트: 해설 그룹 카드에 뱃지 표시 확인

---

### B-2: 그룹 카드 배경색 분기

**파일**: `frontend/src/components/GroupPanel.tsx`

**변경 내용**:
```typescript
// 그룹 카드 클래스 결정
const getCardClassName = (group: ProblemGroup, isSelected: boolean) => {
  const base = 'p-3 rounded-lg border transition-all cursor-pointer';

  if (group.link?.linkType === 'solution') {
    // 해설 그룹
    return `${base} ${isSelected
      ? 'border-purple-400 bg-purple-50'
      : 'border-purple-200 bg-purple-50/50 hover:border-purple-300'}`;
  }

  // 문제 그룹
  return `${base} ${isSelected
    ? 'border-blue-400 bg-blue-50'
    : 'border-gray-200 bg-white hover:border-gray-300'}`;
};
```

**체크리스트**:
- [ ] getCardClassName 함수 추가
- [ ] 그룹 카드에 적용
- [ ] 테스트: 해설 그룹 카드 보라색 배경 확인

---

## Phase 42-C: 타입 확인 및 데이터 검증 (15분)

### C-1: GroupLink 타입 확인

**파일**: `frontend/src/api/client.ts`

**확인 사항**:
```typescript
// 기존 타입 확인
export interface GroupLink {
  linkedGroupId: string;
  linkedDocumentId: string;
  linkedPageIndex: number;
  linkedName?: string;
  linkType: 'problem' | 'solution';
  linkedAt: number;
}

export interface ProblemGroup {
  id: string;
  column: string;
  block_ids: number[];
  status: 'draft' | 'confirmed';
  problemInfo?: ProblemInfo;
  link?: GroupLink;  // ← 이 필드 확인
  // ...
}
```

**체크리스트**:
- [ ] GroupLink 타입에 linkType 있는지 확인
- [ ] ProblemGroup에 link 필드 있는지 확인
- [ ] 없으면 타입 추가

---

### C-2: 백엔드 데이터 검증

**확인 명령**:
```bash
# 해설 그룹 데이터 확인
type dataset_root\{solution_doc_id}\groups\page_0001_groups.json
```

**예상 구조**:
```json
{
  "groups": [{
    "id": "A1",
    "link": {
      "linkedGroupId": "B2",
      "linkedName": "3",
      "linkType": "solution"
    }
  }]
}
```

**체크리스트**:
- [ ] 실제 데이터에 link 필드 있는지 확인
- [ ] linkType이 "solution"인지 확인
- [ ] linkedName에 문제 번호 있는지 확인

---

## Phase 42-D: 테스트 및 마무리 (15분)

### D-1: 통합 테스트

**테스트 시나리오**:
1. 문제 탭에서 문제 그룹 생성 → 파란색 확인
2. 해설 탭에서 문제 선택 후 해설 그룹 생성 → 보라색 확인
3. 해설 그룹에 연결된 문제 번호 표시 확인
4. 페이지 이동 후 다시 돌아와도 스타일 유지 확인

**체크리스트**:
- [ ] 문제 그룹 스타일 정상
- [ ] 해설 그룹 스타일 정상
- [ ] 연결 뱃지 표시 정상
- [ ] 페이지 전환 후에도 유지

---

### D-2: 엣지 케이스 처리

**케이스**:
1. link 필드가 없는 그룹 → 기본 스타일 적용
2. linkType이 없는 경우 → 기본 스타일 적용
3. linkedName이 없는 경우 → group.id 표시

**체크리스트**:
- [ ] null/undefined 방어 코드 추가
- [ ] 기본값 fallback 처리

---

## 파일 변경 요약

| 파일 | 변경 내용 | Phase |
|------|----------|-------|
| `PageCanvas.tsx` | getGroupStyle, getGroupLabel 추가 | 42-A |
| `GroupPanel.tsx` | 연결 뱃지, 카드 배경색 분기 | 42-B |
| `client.ts` | GroupLink 타입 확인/추가 | 42-C |

---

## 예상 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| 42-A | 캔버스 색상 구분 | 30분 |
| 42-B | GroupPanel 연결 표시 | 30분 |
| 42-C | 타입/데이터 검증 | 15분 |
| 42-D | 테스트 및 마무리 | 15분 |
| **합계** | | **1.5시간** |

---

## 결과물 미리보기

### Before
```
┌─────────────────────────────┐
│ [1] 파란 테두리              │  ← 문제/해설 구분 없음
│     해설 내용...            │
└─────────────────────────────┘
```

### After
```
┌─────────────────────────────┐
│ [3번] 보라 테두리            │  ← 해설 그룹임을 시각적으로 구분
│     해설 내용...            │     연결된 문제 번호 표시
└─────────────────────────────┘
```

---

*작성: Claude Code | 2025-12-04*
