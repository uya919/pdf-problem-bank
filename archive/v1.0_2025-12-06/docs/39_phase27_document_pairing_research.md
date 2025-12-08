# Phase 27: 문서 페어링 영구 연결 기능 연구 리포트

## 요청 사항

사용자가 "문제로 지정" / "해설로 지정"을 선택하면:
1. 두 문서가 **영구적으로 연결**됨
2. 연결 시 **두 문서가 하나로 합쳐지는 애니메이션** 표시
3. 연결 후 **"시작하기" 버튼이 1개**로 통합
4. 버튼 클릭 시 **듀얼 윈도우로 실행**

---

## 현재 구현 상태 분석

### ✅ 이미 존재하는 기능 (70%)

| 구성 요소 | 상태 | 위치 |
|----------|------|------|
| DocumentPair 모델 | ✅ 완료 | `backend/app/models/matching.py` |
| 페어 CRUD API | ✅ 완료 | `backend/app/routers/document_pairs.py` |
| 페어 서비스 | ✅ 완료 | `backend/app/services/document_pair_service.py` |
| 프론트엔드 훅 | ✅ 완료 | `frontend/src/hooks/useDocumentPairs.ts` |
| 페어 카드 UI | ✅ 완료 | `frontend/src/components/matching/DocumentPairCard.tsx` |
| 문서 메뉴 | ⚠️ 일부 | `frontend/src/components/DocumentMenu.tsx` |
| 메뉴-API 연결 | ❌ 미구현 | - |
| 애니메이션 | ❌ 미구현 | - |

### 데이터 구조 (이미 존재)

```python
class DocumentPair(BaseModel):
    id: str                          # 고유 ID
    problem_document_id: str         # 문제 문서 ID
    solution_document_id: str        # 해설 문서 ID
    created_at: datetime             # 생성 시간
    status: str                      # "active" | "archived"
    last_session_id: Optional[str]   # 마지막 매칭 세션
    matched_count: int               # 총 매칭 수
```

### API 엔드포인트 (이미 존재)

```
POST   /api/document-pairs              # 페어 생성
GET    /api/document-pairs              # 목록 조회
GET    /api/document-pairs/{pair_id}    # 단일 조회
DELETE /api/document-pairs/{pair_id}    # 삭제
PUT    /api/document-pairs/{pair_id}    # 업데이트
```

---

## 제안하는 사용자 플로우

### 현재 플로우
```
문서 목록
    ↓
"문제로 지정" 클릭 (문서 A)
"해설로 지정" 클릭 (문서 B)
    ↓
"듀얼 열기" 버튼 표시
    ↓
듀얼 윈도우 열림
    ↓
세션 종료 시 관계 소멸 ❌
```

### 제안 플로우
```
문서 목록
    ↓
"문제로 지정" 클릭 (문서 A) → 파란 뱃지 표시
"해설로 지정" 클릭 (문서 B) → 초록 뱃지 표시
    ↓
확인 다이얼로그: "이 페어를 연결하시겠어요?"
    ↓
API 호출: POST /api/document-pairs
    ↓
🎬 애니메이션: 두 카드가 하나로 합쳐짐
    ↓
"문제-해설 페어" 섹션에 통합 카드 표시
    ↓
"시작하기" 버튼 1개로 듀얼 윈도우 실행
    ↓
관계 영구 유지 ✅
```

---

## 애니메이션 구현 방안

### 옵션 1: 슬라이드 & 머지 (권장)

```typescript
// Framer Motion 사용
import { motion, AnimatePresence } from 'framer-motion';

// 문제 카드: 왼쪽에서 슬라이드
<motion.div
  initial={{ x: -100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: -50, opacity: 0 }}
/>

// 해설 카드: 오른쪽에서 슬라이드
<motion.div
  initial={{ x: 100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: 50, opacity: 0 }}
/>

// 통합 카드: 중앙에서 확대
<motion.div
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
/>
```

### 옵션 2: 공유 레이아웃 애니메이션

```typescript
// layoutId를 사용한 자연스러운 전환
<motion.div layoutId={`doc-${documentId}`}>
  {/* 개별 카드에서 통합 카드로 자연스럽게 이동 */}
</motion.div>
```

### 옵션 3: 카드 접기 효과

```typescript
// 두 카드가 책처럼 접히면서 하나가 됨
<motion.div
  animate={{ rotateY: isPairing ? 90 : 0 }}
  transition={{ duration: 0.5 }}
/>
```

---

## UI/UX 디자인 제안

### 1. 선택 상태 표시

```
┌─────────────────────────┐
│  📕 수학의 바이블 문제집  │
│  ┌──────────────────┐   │
│  │  🔵 문제로 선택됨  │   │  ← 파란 뱃지
│  └──────────────────┘   │
│  [시작하기]             │
└─────────────────────────┘

┌─────────────────────────┐
│  📗 수학의 바이블 해설집  │
│  ┌──────────────────┐   │
│  │  🟢 해설로 선택됨  │   │  ← 초록 뱃지
│  └──────────────────┘   │
│  [시작하기]             │
└─────────────────────────┘
```

### 2. 페어 확인 다이얼로그

```
┌─────────────────────────────────────┐
│   이 문서들을 연결하시겠어요?        │
├─────────────────────────────────────┤
│                                     │
│   📕 수학의 바이블 - 문제집          │
│            ⟷                        │
│   📗 수학의 바이블 - 해설집          │
│                                     │
├─────────────────────────────────────┤
│   [취소]              [연결하기]     │
└─────────────────────────────────────┘
```

### 3. 통합 페어 카드

```
┌─────────────────────────────────────┐
│  📚 문제-해설 페어                   │
├─────────────────────────────────────┤
│  📕 수학의 바이블 - 문제집           │
│  📗 수학의 바이블 - 해설집           │
├─────────────────────────────────────┤
│  매칭: 127개 완료                   │
├─────────────────────────────────────┤
│  [🚀 듀얼 라벨링 시작]    [⚙️ 설정] │
└─────────────────────────────────────┘
```

---

## 구현 단계 계획

### Phase 27-A: 선택 상태 관리 (2-3시간)
```typescript
// useDocumentSelection.ts 생성
const useDocumentSelection = () => {
  const [problemDocId, setProblemDocId] = useState<string | null>(null);
  const [solutionDocId, setSolutionDocId] = useState<string | null>(null);

  const selectAsProblem = (docId: string) => {...};
  const selectAsSolution = (docId: string) => {...};
  const clearSelection = () => {...};
  const isReadyToPair = problemDocId && solutionDocId;

  return { problemDocId, solutionDocId, selectAsProblem, selectAsSolution, isReadyToPair };
};
```

### Phase 27-B: 메뉴-API 연결 (2시간)
- DocumentCard에 메뉴 콜백 추가
- 선택 시 시각적 뱃지 표시
- 페어 생성 API 호출

### Phase 27-C: 확인 다이얼로그 (1-2시간)
- PairConfirmDialog 컴포넌트 생성
- 문서 정보 미리보기
- 확인/취소 버튼

### Phase 27-D: 머지 애니메이션 (3-4시간)
- Framer Motion 애니메이션 구현
- AnimatePresence로 exit 애니메이션
- 페어 카드 등장 애니메이션

### Phase 27-E: 문서 목록 필터링 (2시간)
- 페어된 문서는 개별 목록에서 숨김
- "문제-해설 페어" 섹션에만 표시
- 토글 옵션으로 전체 보기 가능

---

## 예상 작업량

| 단계 | 내용 | 예상 시간 |
|-----|------|----------|
| 27-A | 선택 상태 관리 | 2-3시간 |
| 27-B | 메뉴-API 연결 | 2시간 |
| 27-C | 확인 다이얼로그 | 1-2시간 |
| 27-D | 머지 애니메이션 | 3-4시간 |
| 27-E | 문서 필터링 | 2시간 |
| **합계** | | **10-13시간** |

---

## 위험 요소 및 대응

| 위험 | 심각도 | 대응 방안 |
|-----|--------|----------|
| 애니메이션 성능 이슈 | 🟡 중간 | React.memo, 가상화 적용 |
| 레이아웃 충돌 | 🟡 중간 | layoutId 테스트 철저히 |
| 모바일 성능 | 🟡 중간 | 모바일에서 애니메이션 단순화 |
| 실수로 페어 생성 | 🟢 낮음 | 확인 다이얼로그로 방지 |

---

## 결론

### ✅ 구현 가능성: **높음**

**근거:**
1. DocumentPair 백엔드 API가 **이미 완성됨** (70% 완료)
2. Framer Motion이 **이미 프로젝트에 포함됨**
3. 페어 카드 UI가 **이미 존재함**
4. 필요한 것은 **연결 작업만**

### 🎯 권장 접근 방식

1. **MVP 먼저**: 애니메이션 없이 기본 기능 구현 (4-6시간)
2. **애니메이션 추가**: 사용자 피드백 후 점진적 개선 (3-4시간)
3. **폴리시**: 토스트 알림, 키보드 단축키 등 (2시간)

---

*작성일: 2025-12-03*
