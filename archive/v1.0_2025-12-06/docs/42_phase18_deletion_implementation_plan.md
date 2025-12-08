# Phase 18: 문제 삭제 기능 및 안정성 개선 구현 계획

**작성일**: 2025-11-28
**Phase**: 18
**작성자**: Claude Code (Opus)
**상태**: 계획 완료, 승인 대기

---

## 1. 안정성 분석 요약

### 1.1 발견된 심각한 문제점

| 심각도 | 문제 | 영향 | 수정 우선순위 |
|--------|------|------|--------------|
| **CRITICAL** | Index.json 동기화 실패 | 데이터 손실 | 즉시 |
| **CRITICAL** | 동시 쓰기 레이스 컨디션 | 데이터 덮어쓰기 | 즉시 |
| **HIGH** | 부분 실패 시 고아 파일 | 디스크 누수 | 이번 Phase |
| **HIGH** | N+1 쿼리 성능 문제 | API 타임아웃 | 이번 Phase |
| **MEDIUM** | Error Boundary 부재 | 페이지 크래시 | 이번 Phase |
| **MEDIUM** | 캐시 무효화 누락 | 오래된 데이터 | 이번 Phase |

### 1. 2 수정 전략

**삭제 기능 구현 전에 안정성 문제를 먼저 해결**해야 합니다. 삭제 기능은 파일 I/O가 많으므로 현재 구조에서는 데이터 손실 위험이 높습니다.

---

## 2. Phase 18 세부 단계

### 개요

```
Phase 18-A: 백엔드 안정성 개선 (파일 잠금, 원자적 저장)
Phase 18-B: DELETE API 구현
Phase 18-C: 프론트엔드 선택 모드 UI
Phase 18-D: 삭제 확인 및 Toast/Undo
Phase 18-E: 프론트엔드 안정성 개선
Phase 18-F: 통합 테스트 및 검증
```

---

## 3. Phase 18-A: 백엔드 안정성 개선

### 3.1 목표
- 파일 잠금으로 동시 쓰기 방지
- 원자적 저장으로 부분 실패 방지
- 인덱스 일관성 보장

### 3.2 구현 상세

#### 3.2.1 파일 잠금 유틸리티 생성

**새 파일**: `backend/app/services/file_lock.py`

```python
"""
Phase 18-A: 파일 잠금 유틸리티

Windows/Linux 호환 파일 잠금 구현
"""
import os
import time
import json
from pathlib import Path
from typing import Any, Optional
from contextlib import contextmanager
import threading

# 프로세스 내 락 (스레드 안전)
_locks: dict[str, threading.Lock] = {}
_locks_lock = threading.Lock()


def get_lock(path: str) -> threading.Lock:
    """경로별 Lock 객체 반환"""
    with _locks_lock:
        if path not in _locks:
            _locks[path] = threading.Lock()
        return _locks[path]


@contextmanager
def file_lock(file_path: Path, timeout: float = 30.0):
    """
    파일 잠금 컨텍스트 매니저

    Usage:
        with file_lock(index_path):
            # 안전한 파일 작업
    """
    lock = get_lock(str(file_path))
    acquired = lock.acquire(timeout=timeout)

    if not acquired:
        raise TimeoutError(f"파일 잠금 획득 실패: {file_path}")

    try:
        yield
    finally:
        lock.release()


def atomic_json_write(file_path: Path, data: Any) -> None:
    """
    원자적 JSON 파일 쓰기

    1. 임시 파일에 쓰기
    2. 임시 파일 → 대상 파일 교체 (원자적)
    """
    temp_path = file_path.with_suffix('.tmp')

    try:
        # 임시 파일에 쓰기
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())  # 디스크에 확실히 쓰기

        # 원자적 교체 (Windows에서는 os.replace 사용)
        os.replace(temp_path, file_path)

    except Exception:
        # 실패 시 임시 파일 정리
        if temp_path.exists():
            temp_path.unlink()
        raise


def safe_json_read(file_path: Path, default: Any = None) -> Any:
    """
    안전한 JSON 파일 읽기

    파일이 없거나 손상된 경우 기본값 반환
    """
    if not file_path.exists():
        return default

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return default
```

#### 3.2.2 hangul.py 리팩토링

**파일**: `backend/app/routers/hangul.py`

**변경 사항**:

1. **임포트 추가**:
```python
from app.services.file_lock import file_lock, atomic_json_write, safe_json_read
```

2. **save_parsed_problems 함수 개선**:

```python
@router.post("/save", response_model=SaveResponse)
async def save_parsed_problems(request: SaveRequest):
    """
    파싱된 문제들을 문제은행에 저장 (Phase 18-A: 안정성 개선)

    - 파일 잠금으로 동시 쓰기 방지
    - 원자적 저장으로 부분 실패 방지
    - 실패 시 롤백
    """
    problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
    problems_dir = problem_bank_dir / 'problems'
    answers_dir = problem_bank_dir / 'answers'
    explanations_dir = problem_bank_dir / 'explanations'
    index_path = problem_bank_dir / 'index.json'

    # 디렉토리 생성
    for dir_path in [problems_dir, answers_dir, explanations_dir]:
        dir_path.mkdir(parents=True, exist_ok=True)

    saved_ids = []
    created_files = []  # 롤백용 추적

    try:
        # 파일 잠금 획득
        with file_lock(index_path):
            # 인덱스 로드
            index_data = safe_json_read(index_path, {
                'problems': [],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            })

            metadata = request.metadata.model_dump()

            for problem_data in request.problems:
                problem_id = problem_data.get('id') or str(uuid.uuid4())

                # 문제 레코드 생성
                problem_record = {
                    'id': problem_id,
                    'number': problem_data.get('number', ''),
                    'content_text': problem_data.get('content_text', ''),
                    'content_images': problem_data.get('content_images', []),
                    'content_equations': problem_data.get('content_equations', []),
                    'metadata': {
                        'subject': metadata.get('subject', ''),
                        'grade': metadata.get('grade', ''),
                        'chapter': metadata.get('chapter', ''),
                        'source': metadata.get('source', ''),
                        'difficulty': metadata.get('difficulty', 3),
                        'tags': metadata.get('tags', []),
                        'points': problem_data.get('points'),
                    },
                    'created_at': datetime.now().isoformat(),
                }

                # 정답 저장
                answer_id = None
                if problem_data.get('answer'):
                    answer_id = str(uuid.uuid4())
                    answer_record = {
                        'id': answer_id,
                        'problem_id': problem_id,
                        'answer': problem_data.get('answer'),
                        'answer_type': problem_data.get('answer_type', 'unknown'),
                        'created_at': datetime.now().isoformat(),
                    }
                    answer_path = answers_dir / f'{answer_id}.json'
                    atomic_json_write(answer_path, answer_record)
                    created_files.append(answer_path)
                    problem_record['answer_id'] = answer_id

                # 해설 저장
                explanation_id = None
                if problem_data.get('explanation'):
                    explanation_id = str(uuid.uuid4())
                    explanation_record = {
                        'id': explanation_id,
                        'problem_id': problem_id,
                        'content': problem_data.get('explanation'),
                        'created_at': datetime.now().isoformat(),
                    }
                    explanation_path = explanations_dir / f'{explanation_id}.json'
                    atomic_json_write(explanation_path, explanation_record)
                    created_files.append(explanation_path)
                    problem_record['explanation_id'] = explanation_id

                # 문제 파일 저장
                problem_path = problems_dir / f'{problem_id}.json'
                atomic_json_write(problem_path, problem_record)
                created_files.append(problem_path)

                # 인덱스에 추가
                index_data['problems'].append({
                    'id': problem_id,
                    'number': problem_record['number'],
                    'subject': metadata.get('subject', ''),
                    'grade': metadata.get('grade', ''),
                    'chapter': metadata.get('chapter', ''),
                    'has_answer': answer_id is not None,
                    'has_explanation': explanation_id is not None,
                })

                saved_ids.append(problem_id)

            # 인덱스 업데이트 (원자적)
            index_data['updated_at'] = datetime.now().isoformat()
            atomic_json_write(index_path, index_data)

        return SaveResponse(
            success=True,
            saved_count=len(saved_ids),
            problem_ids=saved_ids,
            message=f"{len(saved_ids)}개 문제가 저장되었습니다."
        )

    except Exception as e:
        # 롤백: 생성된 파일 삭제
        for file_path in created_files:
            try:
                if file_path.exists():
                    file_path.unlink()
            except Exception:
                pass  # 롤백 실패는 무시

        raise HTTPException(status_code=500, detail=f"저장 오류: {str(e)}")
```

### 3.3 테스트 항목

| 테스트 | 예상 결과 |
|--------|----------|
| 동시 저장 요청 2개 | 두 요청 모두 성공, 데이터 무결 |
| 저장 중 예외 발생 | 롤백, 고아 파일 없음 |
| 디스크 가득 참 시뮬레이션 | 명확한 에러 메시지 |

### 3.4 예상 소요 시간
- 구현: 1-2시간
- 테스트: 30분

---

## 4. Phase 18-B: DELETE API 구현

### 4.1 목표
- 단일 문제 삭제 API
- 다중 문제 삭제 API
- 연관 데이터 (정답, 해설) 동시 삭제

### 4.2 구현 상세

**파일**: `backend/app/routers/hangul.py`

#### 4.2.1 단일 삭제 API

```python
@router.delete("/problems/{problem_id}")
async def delete_problem(problem_id: str):
    """
    Phase 18-B: 단일 문제 삭제

    연관된 정답, 해설 파일도 함께 삭제
    """
    problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
    problems_dir = problem_bank_dir / 'problems'
    answers_dir = problem_bank_dir / 'answers'
    explanations_dir = problem_bank_dir / 'explanations'
    index_path = problem_bank_dir / 'index.json'

    problem_path = problems_dir / f'{problem_id}.json'

    if not problem_path.exists():
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

    try:
        with file_lock(index_path):
            # 문제 데이터 로드 (연관 ID 확인용)
            problem_data = safe_json_read(problem_path, {})

            # 정답 파일 삭제
            if problem_data.get('answer_id'):
                answer_path = answers_dir / f"{problem_data['answer_id']}.json"
                if answer_path.exists():
                    answer_path.unlink()

            # 해설 파일 삭제
            if problem_data.get('explanation_id'):
                explanation_path = explanations_dir / f"{problem_data['explanation_id']}.json"
                if explanation_path.exists():
                    explanation_path.unlink()

            # 문제 파일 삭제
            problem_path.unlink()

            # 인덱스에서 제거
            index_data = safe_json_read(index_path, {'problems': []})
            index_data['problems'] = [
                p for p in index_data['problems']
                if p.get('id') != problem_id
            ]
            index_data['updated_at'] = datetime.now().isoformat()
            atomic_json_write(index_path, index_data)

        return {
            "success": True,
            "deleted_id": problem_id,
            "message": "문제가 삭제되었습니다."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"삭제 오류: {str(e)}")
```

#### 4.2.2 다중 삭제 API

```python
class BulkDeleteRequest(BaseModel):
    """다중 삭제 요청"""
    problem_ids: List[str]


class BulkDeleteResponse(BaseModel):
    """다중 삭제 응답"""
    success: bool
    deleted_count: int
    deleted_ids: List[str]
    failed_ids: List[str]
    message: str


@router.post("/problems/bulk-delete", response_model=BulkDeleteResponse)
async def bulk_delete_problems(request: BulkDeleteRequest):
    """
    Phase 18-B: 다중 문제 삭제

    - 최대 100개까지 한 번에 삭제 가능
    - 일부 실패해도 나머지는 삭제 진행
    """
    if len(request.problem_ids) > 100:
        raise HTTPException(
            status_code=400,
            detail="한 번에 최대 100개까지만 삭제할 수 있습니다."
        )

    if not request.problem_ids:
        raise HTTPException(
            status_code=400,
            detail="삭제할 문제를 선택해주세요."
        )

    problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
    problems_dir = problem_bank_dir / 'problems'
    answers_dir = problem_bank_dir / 'answers'
    explanations_dir = problem_bank_dir / 'explanations'
    index_path = problem_bank_dir / 'index.json'

    deleted_ids = []
    failed_ids = []

    try:
        with file_lock(index_path):
            index_data = safe_json_read(index_path, {'problems': []})

            for problem_id in request.problem_ids:
                problem_path = problems_dir / f'{problem_id}.json'

                if not problem_path.exists():
                    failed_ids.append(problem_id)
                    continue

                try:
                    # 문제 데이터 로드
                    problem_data = safe_json_read(problem_path, {})

                    # 연관 파일 삭제
                    if problem_data.get('answer_id'):
                        answer_path = answers_dir / f"{problem_data['answer_id']}.json"
                        if answer_path.exists():
                            answer_path.unlink()

                    if problem_data.get('explanation_id'):
                        explanation_path = explanations_dir / f"{problem_data['explanation_id']}.json"
                        if explanation_path.exists():
                            explanation_path.unlink()

                    # 문제 파일 삭제
                    problem_path.unlink()
                    deleted_ids.append(problem_id)

                except Exception:
                    failed_ids.append(problem_id)

            # 인덱스 업데이트 (삭제된 것들만)
            index_data['problems'] = [
                p for p in index_data['problems']
                if p.get('id') not in deleted_ids
            ]
            index_data['updated_at'] = datetime.now().isoformat()
            atomic_json_write(index_path, index_data)

        message = f"{len(deleted_ids)}개 문제가 삭제되었습니다."
        if failed_ids:
            message += f" ({len(failed_ids)}개 실패)"

        return BulkDeleteResponse(
            success=len(deleted_ids) > 0,
            deleted_count=len(deleted_ids),
            deleted_ids=deleted_ids,
            failed_ids=failed_ids,
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"삭제 오류: {str(e)}")
```

#### 4.2.3 전체 삭제 API

```python
@router.delete("/problems/all")
async def delete_all_problems(confirm: str = None):
    """
    Phase 18-B: 전체 문제 삭제 (위험!)

    confirm 파라미터에 "DELETE_ALL"을 전달해야 함
    """
    if confirm != "DELETE_ALL":
        raise HTTPException(
            status_code=400,
            detail="전체 삭제를 확인하려면 confirm=DELETE_ALL 파라미터가 필요합니다."
        )

    problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
    problems_dir = problem_bank_dir / 'problems'
    answers_dir = problem_bank_dir / 'answers'
    explanations_dir = problem_bank_dir / 'explanations'
    index_path = problem_bank_dir / 'index.json'

    deleted_count = 0

    try:
        with file_lock(index_path):
            # 모든 파일 삭제
            for dir_path in [problems_dir, answers_dir, explanations_dir]:
                if dir_path.exists():
                    for file_path in dir_path.glob('*.json'):
                        file_path.unlink()
                        deleted_count += 1

            # 인덱스 초기화
            index_data = {
                'problems': [],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            atomic_json_write(index_path, index_data)

        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"모든 문제가 삭제되었습니다. ({deleted_count}개 파일)"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"삭제 오류: {str(e)}")
```

### 4.3 프론트엔드 API 클라이언트 추가

**파일**: `frontend/src/api/hangul.ts`

```typescript
/** 삭제 응답 */
export interface DeleteResponse {
  success: boolean;
  deleted_id?: string;
  deleted_count?: number;
  deleted_ids?: string[];
  failed_ids?: string[];
  message: string;
}

export const hangulApi = {
  // ... 기존 메소드들 ...

  /**
   * Phase 18-B: 단일 문제 삭제
   */
  deleteProblem: async (problemId: string): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(
      `/api/hangul/problems/${problemId}`
    );
    return response.data;
  },

  /**
   * Phase 18-B: 다중 문제 삭제
   */
  bulkDeleteProblems: async (problemIds: string[]): Promise<DeleteResponse> => {
    const response = await apiClient.post<DeleteResponse>(
      '/api/hangul/problems/bulk-delete',
      { problem_ids: problemIds }
    );
    return response.data;
  },

  /**
   * Phase 18-B: 전체 삭제 (위험!)
   */
  deleteAllProblems: async (): Promise<DeleteResponse> => {
    const response = await apiClient.delete<DeleteResponse>(
      '/api/hangul/problems/all',
      { params: { confirm: 'DELETE_ALL' } }
    );
    return response.data;
  },
};
```

### 4.4 예상 소요 시간
- 백엔드 구현: 1-2시간
- 프론트엔드 API: 30분
- 테스트: 30분

---

## 5. Phase 18-C: 프론트엔드 선택 모드 UI

### 5.1 목표
- 문제 카드 체크박스 추가
- 다중 선택 지원 (Shift+클릭)
- 플로팅 액션 바

### 5.2 구현 상세

#### 5.2.1 상태 관리 추가

```typescript
// IntegratedProblemBankPage.tsx

export function IntegratedProblemBankPage() {
  // 기존 상태...
  const [filters, setFilters] = useState<ProblemSearchParams>({ limit: 50, offset: 0 });
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 새로운 선택 모드 상태
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // 선택 핸들러
  const handleSelect = (problemId: string, index: number, shiftKey: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);

      if (shiftKey && lastSelectedIndex !== null) {
        // Shift+클릭: 범위 선택
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);

        for (let i = start; i <= end; i++) {
          if (problems[i]) {
            next.add(problems[i].id);
          }
        }
      } else {
        // 일반 클릭: 토글
        if (next.has(problemId)) {
          next.delete(problemId);
        } else {
          next.add(problemId);
        }
      }

      return next;
    });

    setLastSelectedIndex(index);

    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
  };

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedIds.size === problems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(problems.map(p => p.id)));
    }
  };

  // 선택 모드 종료
  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setLastSelectedIndex(null);
  };

  // ESC 키로 선택 해제
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectionMode) {
        handleClearSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode]);
```

#### 5.2.2 ProblemCard 수정

```typescript
/** 문제 카드 (선택 기능 추가) */
function ProblemCard({
  problem,
  index,
  onClick,
  selected,
  onSelect,
  isSelectionMode,
}: {
  problem: ProblemDetail;
  index: number;
  onClick: () => void;
  selected: boolean;
  onSelect: (id: string, index: number, shiftKey: boolean) => void;
  isSelectionMode: boolean;
}) {
  const difficulty = problem.metadata?.difficulty || 3;
  const hasAnswer = !!problem.answer_id;
  const hasExplanation = !!problem.explanation_id;

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode || e.ctrlKey || e.metaKey) {
      e.preventDefault();
      onSelect(problem.id, index, e.shiftKey);
    } else {
      onClick();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(problem.id, index, e.shiftKey);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "bg-white rounded-lg border p-4 shadow-sm transition-all cursor-pointer group relative",
        selected
          ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50"
          : "border-gray-200 hover:shadow-md hover:border-blue-300"
      )}
    >
      {/* 체크박스 (호버 또는 선택 모드에서 표시) */}
      <div
        className={cn(
          "absolute top-2 left-2 transition-opacity",
          isSelectionMode || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <button
          onClick={handleCheckboxClick}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            selected
              ? "bg-blue-500 border-blue-500 text-white"
              : "border-gray-300 hover:border-blue-400"
          )}
        >
          {selected && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>
      </div>

      {/* 기존 카드 내용 (좌측 패딩 추가) */}
      <div className={cn(isSelectionMode || selected ? "pl-6" : "group-hover:pl-6 transition-all")}>
        {/* ... 기존 내용 ... */}
      </div>
    </div>
  );
}
```

#### 5.2.3 플로팅 액션 바

```typescript
/** 플로팅 선택 액션 바 */
function SelectionActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDelete,
  isDeleting,
}: {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-gray-900 text-white rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
        {/* 선택 개수 */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm font-medium">
            {selectedCount}
          </div>
          <span className="text-sm">개 선택됨</span>
        </div>

        {/* 구분선 */}
        <div className="w-px h-6 bg-gray-600" />

        {/* 액션 버튼들 */}
        <button
          onClick={onSelectAll}
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          {selectedCount === totalCount ? '전체 해제' : '전체 선택'}
        </button>

        <button
          onClick={onClearSelection}
          className="text-sm text-gray-300 hover:text-white transition-colors"
        >
          선택 취소
        </button>

        <div className="w-px h-6 bg-gray-600" />

        {/* 삭제 버튼 */}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center gap-2 px-4 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-full text-sm font-medium transition-colors"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          삭제
        </button>
      </div>
    </div>
  );
}
```

### 5.3 예상 소요 시간
- 상태 관리: 1시간
- 카드 수정: 1시간
- 액션 바: 30분
- 테스트: 30분

---

## 6. Phase 18-D: 삭제 확인 및 Toast/Undo

### 6.1 목표
- 삭제 확인 다이얼로그
- Toast 알림 + Undo 기능
- 단계별 확인 레벨

### 6.2 구현 상세

#### 6.2.1 삭제 확인 다이얼로그

```typescript
/** 삭제 확인 다이얼로그 */
function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  problems,
  isDeleting,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  problems: ProblemDetail[];
  isDeleting: boolean;
}) {
  const [confirmText, setConfirmText] = useState('');

  const count = problems.length;
  const requiresTyping = count > 10;
  const confirmWord = count > 50 ? '삭제' : '';
  const canConfirm = !requiresTyping || confirmText === confirmWord;

  // 다이얼로그 닫힐 때 입력 초기화
  useEffect(() => {
    if (!isOpen) setConfirmText('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* 아이콘 */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        {/* 제목 */}
        <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
          {count > 50 ? '🚨 대량 삭제 경고' : '문제 삭제'}
        </h2>

        {/* 설명 */}
        <p className="text-center text-gray-600 mb-4">
          {count === 1
            ? '이 문제를 삭제하시겠습니까?'
            : `선택한 ${count}개의 문제를 삭제하시겠습니까?`}
        </p>

        {/* 문제 미리보기 (최대 5개) */}
        {count <= 10 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
            <ul className="text-sm text-gray-600 space-y-1">
              {problems.slice(0, 5).map((p) => (
                <li key={p.id} className="truncate">
                  • #{p.number} {p.metadata?.subject && `(${p.metadata.subject})`}
                </li>
              ))}
              {count > 5 && (
                <li className="text-gray-400">... 외 {count - 5}개</li>
              )}
            </ul>
          </div>
        )}

        {/* 타이핑 확인 (11개 이상) */}
        {requiresTyping && (
          <div className="mb-4">
            <p className="text-sm text-red-600 mb-2">
              계속하려면 "{confirmWord || '삭제'}"를 입력하세요.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmWord || '삭제'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        )}

        {/* 경고 */}
        <p className="text-sm text-red-500 text-center mb-6">
          ⚠️ 이 작업은 되돌릴 수 없습니다.
        </p>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm || isDeleting}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                삭제
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 6.2.2 Toast 컴포넌트 (Undo 지원)

**새 파일**: `frontend/src/components/ui/Toast.tsx`

```typescript
/**
 * Phase 18-D: Toast 알림 컴포넌트
 *
 * Undo 기능이 있는 알림
 */
import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  onClose: (id: string) => void;
}

export function Toast({ id, type, message, action, duration = 5000, onClose }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || duration === 0) return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    const tick = () => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        onClose(id);
      } else {
        setProgress((remaining / duration) * 100);
        requestAnimationFrame(tick);
      }
    };

    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [id, duration, isPaused, onClose]);

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : Info;
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border shadow-lg p-4 min-w-[300px] max-w-md',
        colors[type]
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
          {action && (
            <button
              onClick={() => {
                action.onClick();
                onClose(id);
              }}
              className="mt-2 text-sm font-semibold underline hover:no-underline"
            >
              {action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onClose(id)}
          className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 진행 바 */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
        <div
          className="h-full bg-current opacity-30 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Toast 컨테이너 및 훅은 별도 구현
```

### 6.3 예상 소요 시간
- 확인 다이얼로그: 1시간
- Toast 시스템: 1.5시간
- 통합: 30분

---

## 7. Phase 18-E: 프론트엔드 안정성 개선

### 7.1 목표
- Error Boundary 추가
- 캐시 무효화 로직
- 로딩/에러 상태 개선

### 7.2 구현 상세

#### 7.2.1 Error Boundary

**새 파일**: `frontend/src/components/ErrorBoundary.tsx`

```typescript
import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center p-6 max-w-md">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              오류가 발생했습니다
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {this.state.error?.message || '알 수 없는 오류'}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              다시 시도
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### 7.2.2 캐시 무효화

```typescript
// IntegratedProblemBankPage.tsx

import { useQueryClient } from '@tanstack/react-query';

export function IntegratedProblemBankPage() {
  const queryClient = useQueryClient();

  // 삭제 후 캐시 무효화
  const handleDeleteSuccess = useCallback((deletedIds: string[]) => {
    // 문제 목록 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ['problems'] });

    // 통계 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ['problem-bank-stats'] });

    // 개별 문제 캐시 제거
    deletedIds.forEach(id => {
      queryClient.removeQueries({ queryKey: ['problem-detail', id] });
    });

    // 선택 상태 초기화
    handleClearSelection();
  }, [queryClient]);
```

### 7.3 예상 소요 시간
- Error Boundary: 30분
- 캐시 로직: 30분
- 테스트: 30분

---

## 8. Phase 18-F: 통합 테스트

### 8.1 테스트 체크리스트

#### 백엔드 테스트

| 테스트 | 예상 결과 |
|--------|----------|
| 단일 문제 삭제 | 문제 + 연관 파일 삭제, 인덱스 업데이트 |
| 존재하지 않는 문제 삭제 | 404 에러 |
| 다중 삭제 (10개) | 모두 삭제, 인덱스 업데이트 |
| 다중 삭제 (일부 실패) | 성공한 것만 삭제, 실패 목록 반환 |
| 동시 삭제 요청 | 데이터 무결성 유지 |
| 전체 삭제 (confirm 없음) | 400 에러 |
| 전체 삭제 (confirm 있음) | 모든 데이터 삭제 |

#### 프론트엔드 테스트

| 테스트 | 예상 결과 |
|--------|----------|
| 카드 클릭 (일반) | 상세 모달 열림 |
| 카드 클릭 (Ctrl+클릭) | 선택 토글 |
| Shift+클릭 범위 선택 | 범위 내 모두 선택 |
| 전체 선택 버튼 | 모든 카드 선택 |
| ESC 키 | 선택 해제 |
| 삭제 버튼 (1개) | 확인 없이 Toast |
| 삭제 버튼 (5개) | 확인 다이얼로그 |
| 삭제 버튼 (50개) | 타이핑 확인 |
| Undo 버튼 | ??? (구현 방식에 따라) |

### 8.2 성능 테스트

| 테스트 | 기준 |
|--------|------|
| 100개 문제 로드 | < 1초 |
| 50개 동시 삭제 | < 3초 |
| 페이지 전환 | < 500ms |

---

## 9. 일정 요약

| 단계 | 내용 | 예상 시간 |
|------|------|----------|
| 18-A | 백엔드 안정성 | 2시간 |
| 18-B | DELETE API | 2.5시간 |
| 18-C | 선택 모드 UI | 3시간 |
| 18-D | 확인/Toast | 3시간 |
| 18-E | FE 안정성 | 1.5시간 |
| 18-F | 테스트 | 2시간 |
| **합계** | | **14시간** |

---

## 10. 위험 요소 및 대응

| 위험 | 가능성 | 영향 | 대응 |
|------|--------|------|------|
| 파일 잠금 실패 | 낮음 | 높음 | 타임아웃 후 에러 반환 |
| 대용량 삭제 성능 | 중간 | 중간 | 배치 처리, 프로그레스 표시 |
| Undo 구현 복잡 | 높음 | 낮음 | MVP에서는 Undo 생략 가능 |

---

## 11. 결론

Phase 18은 **안정성 개선**과 **삭제 기능 구현**을 함께 진행합니다.

**핵심 우선순위**:
1. 파일 잠금 + 원자적 저장 (데이터 무결성)
2. DELETE API (기본 기능)
3. 다중 선택 UI (사용성)
4. 확인 다이얼로그 (안전장치)

승인 후 Phase 18-A부터 순차 진행합니다.

---

*작성: Claude Code (Opus)*
*날짜: 2025-11-28*
