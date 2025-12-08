# Phase 12: Claude-Friendly 리팩토링 상세 구현 계획

**작성일**: 2025-11-26
**기반 문서**: [21_claude_friendly_refactoring_research.md](21_claude_friendly_refactoring_research.md)
**목표**: Claude Code가 개발/디버깅하기 편한 구조로 개선

---

## 개요

### Phase 12 구성

| Sub-Phase | 내용 | 예상 작업량 | 우선순위 |
|-----------|------|------------|----------|
| **12-1** | Critical 버그 수정 | 소 | 🔴 즉시 |
| **12-2** | 백엔드 유틸리티 모듈 | 중 | 🟠 높음 |
| **12-3** | 프론트엔드 공통 훅 | 중 | 🟠 높음 |
| **12-4** | 상수 및 타입 정리 | 소 | 🟡 중간 |
| **12-5** | 설정 파일 정리 | 소 | 🟡 중간 |
| **12-6** | 로깅 표준화 (선택) | 중 | 🟢 낮음 |

---

## Phase 12-1: Critical 버그 수정

### 목표
- stats.py 런타임 오류 해결
- 불필요한 의존성 제거
- Git 보안 설정

### Task 1.1: stats.py config 속성 수정

**문제 위치**: `backend/app/routers/stats.py`

**현재 코드 (오류)**:
```python
# 라인 52
problems_dir = config.PROBLEMS_DIR / doc_id  # ❌ AttributeError

# 라인 165
labels_dir = config.LABELS_DIR / document_id  # ❌ AttributeError

# 라인 171, 181
blocks_dir = config.BLOCKS_DIR / document_id  # ❌ AttributeError
```

**수정 방향**:
```python
# 올바른 패턴 (다른 라우터에서 사용 중)
doc_dir = config.get_document_dir(document_id)
problems_dir = doc_dir / "problems"
blocks_dir = doc_dir / "blocks"
groups_dir = doc_dir / "groups"
```

**수정 대상 함수**:
1. `get_dashboard_stats()` - 라인 30-110
2. `get_document_stats()` - 라인 130-202

**검증 방법**:
```bash
curl http://localhost:8000/api/stats/dashboard
curl http://localhost:8000/api/stats/documents/{document_id}/stats
```

---

### Task 1.2: 루트 requirements.txt 정리

**현재 상태**:
```
PySide6>=6.6.0        ← 불필요 (GUI 프레임워크)
PyMuPDF>=1.23.0       ← 백엔드에도 있음 (중복)
numpy>=1.24.0         ← 백엔드에도 있음 (중복)
opencv-python>=4.8.0  ← 백엔드에도 있음 (중복)
Pillow>=10.0.0        ← 백엔드에도 있음 (중복)
pydantic>=2.0.0       ← 백엔드에도 있음 (중복)
loguru>=0.7.0         ← 사용하지 않음
python-dotenv>=1.0.0  ← 백엔드에도 있음 (중복)
pytest>=7.4.0         ← 개발용 (tests/ 폴더용)
pytest-qt>=4.2.0      ← 불필요 (Qt 테스트)
```

**옵션 A: 파일 삭제** (권장)
- 루트 requirements.txt 삭제
- 백엔드만 requirements.txt 유지
- README에 설치 방법 안내

**옵션 B: 최소화**
```
# 루트 requirements.txt (src/ 유틸리티용)
PyMuPDF>=1.23.0
numpy>=1.24.0
opencv-python>=4.8.0
Pillow>=10.0.0
python-dotenv>=1.0.0
```

**결정 필요**: 사용자에게 옵션 선택 요청

---

### Task 1.3: .gitignore 추가

**생성할 파일 1**: `/.gitignore` (루트)
```gitignore
# Environment
.env
.env.local
.env.*.local

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
*.egg-info/
.eggs/
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Project specific
dataset_root/
*.log
nul
```

**생성할 파일 2**: `/backend/.gitignore`
```gitignore
# Environment
.env
.env.local

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.eggs/
*.egg-info/

# Virtual environment
venv/
.venv/
```

---

### Phase 12-1 체크리스트

- [ ] stats.py의 config.PROBLEMS_DIR 수정
- [ ] stats.py의 config.LABELS_DIR 수정
- [ ] stats.py의 config.BLOCKS_DIR 수정
- [ ] API 테스트로 검증
- [ ] 루트 requirements.txt 처리 (삭제 또는 정리)
- [ ] 루트 .gitignore 생성
- [ ] backend/.gitignore 생성

---

## Phase 12-2: 백엔드 유틸리티 모듈

### 목표
- 중복 코드 제거
- 재사용 가능한 헬퍼 함수 생성
- 코드 가독성 향상

### 폴더 구조

```
backend/app/
├── utils/                 ← 신규 폴더
│   ├── __init__.py
│   ├── file_utils.py      ← JSON I/O
│   ├── validators.py      ← 문서/페이지 검증
│   ├── formatters.py      ← 시간, 페이지 인덱스 포맷
│   └── image_utils.py     ← Bbox 계산
├── main.py
├── config.py
├── routers/
└── services/
```

---

### Task 2.1: file_utils.py

**기능**: JSON 파일 읽기/쓰기 표준화

```python
# backend/app/utils/file_utils.py
"""
Phase 12-2: 파일 I/O 유틸리티
"""
from pathlib import Path
import json
from typing import Any, Optional


def load_json(path: Path) -> dict:
    """
    JSON 파일을 읽어서 딕셔너리로 반환

    Args:
        path: JSON 파일 경로

    Returns:
        파싱된 딕셔너리

    Raises:
        FileNotFoundError: 파일이 없을 때
        json.JSONDecodeError: JSON 파싱 실패
    """
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict, indent: int = 2) -> None:
    """
    딕셔너리를 JSON 파일로 저장

    Args:
        path: 저장할 파일 경로
        data: 저장할 데이터
        indent: 들여쓰기 (기본값: 2)
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=indent)


def load_json_or_default(path: Path, default: dict = None) -> dict:
    """
    JSON 파일을 읽거나, 없으면 기본값 반환

    Args:
        path: JSON 파일 경로
        default: 기본값 (None이면 빈 딕셔너리)

    Returns:
        파싱된 딕셔너리 또는 기본값
    """
    if default is None:
        default = {}

    if not path.exists():
        return default

    try:
        return load_json(path)
    except (json.JSONDecodeError, Exception):
        return default
```

**적용 대상**:
- blocks.py: 6곳
- documents.py: 4곳
- export.py: 5곳
- stats.py: 3곳

---

### Task 2.2: validators.py

**기능**: 문서/페이지 존재 검증

```python
# backend/app/utils/validators.py
"""
Phase 12-2: 검증 유틸리티
"""
from pathlib import Path
from fastapi import HTTPException
from app.config import config


def validate_document_exists(document_id: str) -> Path:
    """
    문서 디렉토리 존재 확인

    Args:
        document_id: 문서 ID

    Returns:
        문서 디렉토리 경로

    Raises:
        HTTPException(404): 문서가 없을 때
    """
    doc_dir = config.get_document_dir(document_id)
    if not doc_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"문서를 찾을 수 없습니다: {document_id}"
        )
    return doc_dir


def validate_page_exists(document_id: str, page_index: int) -> Path:
    """
    페이지 이미지 파일 존재 확인

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스

    Returns:
        페이지 이미지 경로

    Raises:
        HTTPException(404): 페이지가 없을 때
    """
    doc_dir = validate_document_exists(document_id)
    page_file = doc_dir / "pages" / f"page_{page_index:04d}.png"

    if not page_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"페이지를 찾을 수 없습니다: {page_index}"
        )
    return page_file


def validate_blocks_exist(document_id: str, page_index: int) -> Path:
    """
    블록 JSON 파일 존재 확인

    Args:
        document_id: 문서 ID
        page_index: 페이지 인덱스

    Returns:
        블록 JSON 파일 경로

    Raises:
        HTTPException(404): 블록 데이터가 없을 때
    """
    doc_dir = validate_document_exists(document_id)
    blocks_file = doc_dir / "blocks" / f"page_{page_index:04d}_blocks.json"

    if not blocks_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"블록 데이터를 찾을 수 없습니다: 페이지 {page_index}"
        )
    return blocks_file
```

**적용 대상**:
- 모든 라우터의 문서/페이지 검증 로직

---

### Task 2.3: formatters.py

**기능**: 시간, 페이지 인덱스 등 포맷팅

```python
# backend/app/utils/formatters.py
"""
Phase 12-2: 포맷팅 유틸리티
"""
from datetime import datetime
import re
from typing import Optional


def format_time_ago(timestamp: float) -> str:
    """
    타임스탬프를 '~분 전', '~시간 전' 형식으로 변환

    Args:
        timestamp: Unix 타임스탬프

    Returns:
        상대 시간 문자열
    """
    delta = datetime.now() - datetime.fromtimestamp(timestamp)
    seconds = int(delta.total_seconds())

    if seconds < 60:
        return "방금 전"
    elif seconds < 3600:
        return f"{seconds // 60}분 전"
    elif seconds < 86400:
        return f"{seconds // 3600}시간 전"
    else:
        return f"{delta.days}일 전"


def extract_page_index(filename: str) -> Optional[int]:
    """
    파일명에서 페이지 인덱스 추출

    Args:
        filename: 파일명 (예: "page_0007_blocks.json")

    Returns:
        페이지 인덱스 또는 None

    Examples:
        >>> extract_page_index("page_0007_blocks.json")
        7
        >>> extract_page_index("page_0012_groups.json")
        12
    """
    match = re.search(r'page_(\d+)', filename)
    if match:
        return int(match.group(1))
    return None


def format_page_filename(page_index: int, suffix: str = "") -> str:
    """
    페이지 인덱스를 파일명으로 변환

    Args:
        page_index: 페이지 인덱스
        suffix: 접미사 (예: "_blocks", "_groups")

    Returns:
        포맷된 파일명

    Examples:
        >>> format_page_filename(7, "_blocks")
        "page_0007_blocks"
        >>> format_page_filename(12)
        "page_0012"
    """
    return f"page_{page_index:04d}{suffix}"
```

**적용 대상**:
- stats.py: format_time_ago
- blocks.py, export.py: extract_page_index

---

### Task 2.4: image_utils.py

**기능**: 이미지 처리 관련 유틸리티

```python
# backend/app/utils/image_utils.py
"""
Phase 12-2: 이미지 처리 유틸리티
"""
from typing import List, Tuple


def calculate_bounding_box(blocks: List[dict]) -> Tuple[int, int, int, int]:
    """
    블록들의 통합 바운딩 박스 계산

    Args:
        blocks: 블록 리스트 (각 블록은 "bbox" 키 필요)

    Returns:
        (x1, y1, x2, y2) 튜플

    Raises:
        ValueError: 블록이 비어있을 때
    """
    if not blocks:
        raise ValueError("블록 리스트가 비어있습니다")

    x1 = min(b["bbox"][0] for b in blocks)
    y1 = min(b["bbox"][1] for b in blocks)
    x2 = max(b["bbox"][2] for b in blocks)
    y2 = max(b["bbox"][3] for b in blocks)

    return (x1, y1, x2, y2)


def add_padding(
    bbox: Tuple[int, int, int, int],
    padding: int,
    max_width: int,
    max_height: int
) -> Tuple[int, int, int, int]:
    """
    바운딩 박스에 패딩 추가 (이미지 경계 고려)

    Args:
        bbox: (x1, y1, x2, y2)
        padding: 패딩 픽셀
        max_width: 이미지 최대 너비
        max_height: 이미지 최대 높이

    Returns:
        패딩이 적용된 (x1, y1, x2, y2)
    """
    x1, y1, x2, y2 = bbox

    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(max_width, x2 + padding)
    y2 = min(max_height, y2 + padding)

    return (x1, y1, x2, y2)
```

**적용 대상**:
- export.py: calculate_bounding_box, add_padding

---

### Task 2.5: __init__.py

```python
# backend/app/utils/__init__.py
"""
Phase 12-2: 유틸리티 모듈
"""
from .file_utils import load_json, save_json, load_json_or_default
from .validators import (
    validate_document_exists,
    validate_page_exists,
    validate_blocks_exist
)
from .formatters import (
    format_time_ago,
    extract_page_index,
    format_page_filename
)
from .image_utils import calculate_bounding_box, add_padding

__all__ = [
    # file_utils
    "load_json",
    "save_json",
    "load_json_or_default",
    # validators
    "validate_document_exists",
    "validate_page_exists",
    "validate_blocks_exist",
    # formatters
    "format_time_ago",
    "extract_page_index",
    "format_page_filename",
    # image_utils
    "calculate_bounding_box",
    "add_padding",
]
```

---

### Task 2.6: 라우터 리팩토링

각 라우터 파일에서 중복 코드를 utils로 교체

**예시 - blocks.py 변경**:
```python
# Before
doc_dir = config.get_document_dir(document_id)
if not doc_dir.exists():
    raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다")

blocks_file = doc_dir / "blocks" / f"page_{page_index:04d}_blocks.json"
if not blocks_file.exists():
    raise HTTPException(status_code=404, detail="블록 데이터를 찾을 수 없습니다")

with blocks_file.open("r", encoding="utf-8") as f:
    blocks_data = json.load(f)

# After
from app.utils import validate_blocks_exist, load_json

blocks_file = validate_blocks_exist(document_id, page_index)
blocks_data = load_json(blocks_file)
```

---

### Phase 12-2 체크리스트

- [ ] utils/ 폴더 생성
- [ ] file_utils.py 작성
- [ ] validators.py 작성
- [ ] formatters.py 작성
- [ ] image_utils.py 작성
- [ ] __init__.py 작성
- [ ] blocks.py 리팩토링
- [ ] documents.py 리팩토링
- [ ] export.py 리팩토링
- [ ] stats.py 리팩토링
- [ ] pdf.py 리팩토링
- [ ] 모든 API 테스트

---

## Phase 12-3: 프론트엔드 공통 훅

### 목표
- 중복 로직을 커스텀 훅으로 추출
- PageViewer.tsx 크기 감소
- 재사용성 향상

### 폴더 구조 (변경 후)

```
frontend/src/hooks/
├── useDocuments.ts           (기존)
├── useProblemNumberContext.ts (기존)
├── useSaveGroups.ts          ← 신규
├── useKeyboardShortcuts.ts   ← 신규
├── useFiltersAndSort.ts      ← 신규
├── useModalState.ts          ← 신규
└── useConfirmAction.ts       ← 신규
```

---

### Task 3.1: useSaveGroups.ts

**추출 대상**: PageViewer.tsx의 저장 로직 (약 80줄)

```typescript
// frontend/src/hooks/useSaveGroups.ts
/**
 * Phase 12-3: 그룹 저장 로직 훅
 * PageViewer에서 추출
 */
import { useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ProblemGroup } from '../api/client';
import { useToast } from '../components/Toast';

interface UseSaveGroupsOptions {
  documentId: string;
  debounceMs?: number;
}

interface UseSaveGroupsReturn {
  saveGroups: (groups: ProblemGroup[], pageIndex: number) => Promise<void>;
  saveImmediately: (groups: ProblemGroup[], pageIndex: number) => Promise<void>;
  isSaving: boolean;
  lastSaved: Date | null;
  cancelPendingSave: () => void;
}

export function useSaveGroups({
  documentId,
  debounceMs = 2000,
}: UseSaveGroupsOptions): UseSaveGroupsReturn {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveGroupsMutation = useMutation({
    mutationFn: ({ pageIndex, groups }: { pageIndex: number; groups: any }) =>
      api.savePageGroups(documentId, pageIndex, groups),
  });

  const saveGroups = useCallback(
    async (groups: ProblemGroup[], pageIndex: number) => {
      const groupsData = {
        document_id: documentId,
        page_index: pageIndex,
        groups: groups,
      };

      setIsSaving(true);
      try {
        await saveGroupsMutation.mutateAsync({
          pageIndex,
          groups: groupsData,
        });
        setLastSaved(new Date());
        queryClient.invalidateQueries({
          queryKey: ['problemSummaries', documentId]
        });
      } catch (error) {
        console.error('[SaveGroups] 저장 실패:', error);
        showToast('그룹 저장에 실패했습니다', 'error');
      } finally {
        setIsSaving(false);
      }
    },
    [documentId, queryClient, showToast]
  );

  const saveImmediately = useCallback(
    async (groups: ProblemGroup[], pageIndex: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      await saveGroups(groups, pageIndex);
    },
    [saveGroups]
  );

  const cancelPendingSave = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  return {
    saveGroups,
    saveImmediately,
    isSaving,
    lastSaved,
    cancelPendingSave,
  };
}
```

---

### Task 3.2: useKeyboardShortcuts.ts

**추출 대상**: PageViewer.tsx의 키보드 이벤트 (약 50줄)

```typescript
// frontend/src/hooks/useKeyboardShortcuts.ts
/**
 * Phase 12-3: 키보드 단축키 훅
 */
import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        const keyMatch = e.key === shortcut.key;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : !e.ctrlKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

---

### Task 3.3: useFiltersAndSort.ts

**추출 대상**: DocumentsPage, ProblemBankPage 공통 로직

```typescript
// frontend/src/hooks/useFiltersAndSort.ts
/**
 * Phase 12-3: 필터링 및 정렬 훅
 */
import { useState, useMemo } from 'react';

type SortField = 'name' | 'date' | 'pages' | 'progress';
type SortOrder = 'asc' | 'desc';

interface UseFiltersAndSortOptions<T> {
  items: T[] | undefined;
  searchFields: (keyof T)[];
  defaultSortField?: SortField;
  defaultSortOrder?: SortOrder;
}

interface UseFiltersAndSortReturn<T> {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortField: SortField;
  setSortField: (field: SortField) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  filteredAndSortedItems: T[];
  toggleSortOrder: () => void;
}

export function useFiltersAndSort<T extends Record<string, any>>({
  items,
  searchFields,
  defaultSortField = 'date',
  defaultSortOrder = 'desc',
}: UseFiltersAndSortOptions<T>): UseFiltersAndSortReturn<T> {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const filteredAndSortedItems = useMemo(() => {
    if (!items) return [];

    let result = [...items];

    // 검색 필터
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) =>
          String(item[field]).toLowerCase().includes(query)
        )
      );
    }

    // 정렬
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = String(a.document_id || a.id).localeCompare(
            String(b.document_id || b.id)
          );
          break;
        case 'date':
          comparison = (a.created_at || 0) - (b.created_at || 0);
          break;
        case 'pages':
          comparison = (a.total_pages || 0) - (b.total_pages || 0);
          break;
        case 'progress':
          const progA = a.total_pages ? (a.analyzed_pages / a.total_pages) : 0;
          const progB = b.total_pages ? (b.analyzed_pages / b.total_pages) : 0;
          comparison = progA - progB;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [items, searchQuery, searchFields, sortField, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return {
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    filteredAndSortedItems,
    toggleSortOrder,
  };
}
```

---

### Task 3.4: useModalState.ts

**추출 대상**: 모달 상태 관리 공통 로직

```typescript
// frontend/src/hooks/useModalState.ts
/**
 * Phase 12-3: 모달 상태 관리 훅
 */
import { useState, useCallback, useEffect } from 'react';

interface UseModalStateOptions {
  closeOnEscape?: boolean;
}

interface UseModalStateReturn<T> {
  isOpen: boolean;
  selectedItem: T | null;
  openModal: (item: T) => void;
  closeModal: () => void;
}

export function useModalState<T>({
  closeOnEscape = true,
}: UseModalStateOptions = {}): UseModalStateReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const openModal = useCallback((item: T) => {
    setSelectedItem(item);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setSelectedItem(null);
  }, []);

  // ESC 키로 닫기
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, closeModal]);

  return {
    isOpen,
    selectedItem,
    openModal,
    closeModal,
  };
}
```

---

### Task 3.5: useConfirmAction.ts

**추출 대상**: 삭제 확인 등 공통 로직

```typescript
// frontend/src/hooks/useConfirmAction.ts
/**
 * Phase 12-3: 확인 액션 훅
 */
import { useCallback } from 'react';
import { useToast } from '../components/Toast';

interface UseConfirmActionOptions {
  confirmMessage?: string;
  successMessage?: string;
  errorMessage?: string;
}

export function useConfirmAction<T extends (...args: any[]) => Promise<any>>({
  confirmMessage = '정말 진행하시겠습니까?',
  successMessage = '완료되었습니다',
  errorMessage = '실패했습니다',
}: UseConfirmActionOptions = {}) {
  const { showToast } = useToast();

  const execute = useCallback(
    async (action: T, ...args: Parameters<T>): Promise<boolean> => {
      if (!confirm(confirmMessage)) {
        return false;
      }

      try {
        await action(...args);
        showToast(successMessage, 'success');
        return true;
      } catch (error) {
        console.error('[ConfirmAction] 오류:', error);
        showToast(errorMessage, 'error');
        return false;
      }
    },
    [confirmMessage, successMessage, errorMessage, showToast]
  );

  return { execute };
}
```

---

### Phase 12-3 체크리스트

- [ ] useSaveGroups.ts 작성
- [ ] useKeyboardShortcuts.ts 작성
- [ ] useFiltersAndSort.ts 작성
- [ ] useModalState.ts 작성
- [ ] useConfirmAction.ts 작성
- [ ] PageViewer.tsx에서 useSaveGroups 적용
- [ ] PageViewer.tsx에서 useKeyboardShortcuts 적용
- [ ] DocumentsPage.tsx에서 useFiltersAndSort 적용
- [ ] ProblemBankPage.tsx에서 useFiltersAndSort 적용
- [ ] ProblemBankPage.tsx에서 useModalState 적용
- [ ] 삭제 기능에 useConfirmAction 적용
- [ ] 컴파일 및 기능 테스트

---

## Phase 12-4: 상수 및 타입 정리

### 목표
- 매직 넘버 제거
- any 타입 제거
- 일관된 상수 관리

### 폴더 구조

```
frontend/src/
├── constants/           ← 신규
│   ├── index.ts
│   ├── timing.ts        ← 시간 관련 상수
│   └── ui.ts            ← UI 관련 상수
├── types/               ← 신규 (또는 api/types.ts로 통합)
│   └── index.ts
```

---

### Task 4.1: constants/timing.ts

```typescript
// frontend/src/constants/timing.ts
/**
 * Phase 12-4: 시간 관련 상수
 */

// 자동 저장
export const DEBOUNCE_SAVE_MS = 2000;
export const AUTO_EDIT_DELAY_MS = 100;

// 데이터 갱신 간격
export const REFETCH_DOCUMENTS_MS = 5000;
export const REFETCH_TASK_STATUS_MS = 2000;
export const REFETCH_DASHBOARD_MS = 10000;
export const REFETCH_PROBLEMS_MS = 5000;

// 캐시 유지 시간
export const CACHE_SETTINGS_MS = 5 * 60 * 1000;  // 5분
export const CACHE_DEFAULT_MS = 60 * 1000;       // 1분

// 애니메이션
export const ANIMATION_DURATION_MS = 300;
export const TOAST_DURATION_MS = 3000;
```

---

### Task 4.2: constants/ui.ts

```typescript
// frontend/src/constants/ui.ts
/**
 * Phase 12-4: UI 관련 상수
 */

// 페이지네이션
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// 캔버스
export const CANVAS_MIN_ZOOM = 0.5;
export const CANVAS_MAX_ZOOM = 3.0;
export const CANVAS_ZOOM_STEP = 0.25;

// 블록 선택
export const BLOCK_STROKE_WIDTH = 2;
export const BLOCK_SELECTED_STROKE_WIDTH = 3;
export const GROUP_STROKE_WIDTH = 4;

// 색상 (Tailwind 호환)
export const COLORS = {
  primary: '#3b82f6',      // blue-500
  success: '#22c55e',      // green-500
  warning: '#f59e0b',      // amber-500
  error: '#ef4444',        // red-500
  selected: '#6366f1',     // indigo-500
} as const;
```

---

### Task 4.3: any 타입 제거

**수정 대상 1**: `api/client.ts`
```typescript
// Before
exportPageProblems(..., metadata?: any)
getExportedProblems(...): Promise<any[]>

// After
interface ExportMetadata {
  bookName?: string;
  course?: string;
}

interface ExportedProblem {
  group_id: string;
  page_index: number;
  problem_number: string;
  image_path: string;
  // ... 필요한 필드
}

exportPageProblems(..., metadata?: ExportMetadata)
getExportedProblems(...): Promise<ExportedProblem[]>
```

**수정 대상 2**: `ProblemBankPage.tsx`
```typescript
// Before
const [selectedProblem, setSelectedProblem] = useState<any>(null);

// After
import { ExportedProblem } from '../api/client';
const [selectedProblem, setSelectedProblem] = useState<ExportedProblem | null>(null);
```

**수정 대상 3**: `UploadButton.tsx`
```typescript
// Before
catch (error: any) {

// After
import { AxiosError } from 'axios';
catch (error) {
  const axiosError = error as AxiosError<{ detail: string }>;
  const message = axiosError.response?.data?.detail || axiosError.message;
```

---

### Phase 12-4 체크리스트

- [ ] constants/timing.ts 작성
- [ ] constants/ui.ts 작성
- [ ] constants/index.ts 작성
- [ ] api/client.ts any 타입 제거
- [ ] ProblemBankPage.tsx any 타입 제거
- [ ] ProblemsView.tsx any 타입 제거
- [ ] UploadButton.tsx error 타입 명시
- [ ] 상수를 참조하도록 코드 수정
- [ ] TypeScript 컴파일 검증

---

## Phase 12-5: 설정 파일 정리

### 목표
- 환경 변수 일관성 확보
- 불필요한 파일 정리
- Git 보안 강화

### Task 5.1: 환경 변수 정규화

**통일 방안**: 절대 경로 사용

```bash
# 루트 .env (삭제 또는 아래처럼 수정)
DATASET_ROOT=c:/MYCLAUDE_PROJECT/pdf/dataset_root

# backend/.env (유지)
DATASET_ROOT=c:/MYCLAUDE_PROJECT/pdf/dataset_root
# ... 기존 설정 유지

# frontend/.env (유지)
VITE_API_URL=http://localhost:8000
```

### Task 5.2: TypeScript 타겟 통일

```json
// tsconfig.app.json - 변경
{
  "compilerOptions": {
    "target": "ES2022",  // ES2023 → ES2022로 통일
    // ...
  }
}

// tsconfig.node.json - 변경
{
  "compilerOptions": {
    "target": "ES2022",  // ES2023 → ES2022로 통일
    // ...
  }
}
```

### Task 5.3: 불필요한 CORS 포트 정리

```bash
# backend/.env
# Before
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:5174

# After (포트 3000 제거 - 사용 안 함)
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

---

### Phase 12-5 체크리스트

- [ ] 루트 .env 정리 (삭제 또는 수정)
- [ ] 루트 requirements.txt 처리
- [ ] TypeScript 타겟 버전 통일
- [ ] CORS 설정 정리
- [ ] .env.example 파일 업데이트

---

## Phase 12-6: 로깅 표준화 (선택)

### 목표
- print() → logging 라이브러리
- 구조화된 로그 메시지
- 프로덕션 환경 대비

### Task 6.1: 로깅 설정

```python
# backend/app/logger.py
"""
Phase 12-6: 로깅 설정
"""
import logging
import sys

def setup_logging(level: str = "INFO"):
    """로깅 초기화"""
    logging.basicConfig(
        level=getattr(logging, level),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[
            logging.StreamHandler(sys.stdout),
        ]
    )

def get_logger(name: str) -> logging.Logger:
    """모듈별 로거 생성"""
    return logging.getLogger(name)
```

### Task 6.2: 라우터에 적용

```python
# 각 라우터 파일
from app.logger import get_logger

logger = get_logger(__name__)

# Before
print(f"[API] PDF 업로드 완료: {pdf_path}")
print(f"[API 오류] 문서 목록 조회 실패: {str(e)}")

# After
logger.info(f"PDF 업로드 완료: {pdf_path}")
logger.error(f"문서 목록 조회 실패: {str(e)}")
```

---

### Phase 12-6 체크리스트

- [ ] logger.py 작성
- [ ] main.py에서 setup_logging() 호출
- [ ] pdf.py print → logger
- [ ] blocks.py print → logger
- [ ] documents.py print → logger
- [ ] export.py print → logger
- [ ] stats.py print → logger
- [ ] task_queue.py print → logger

---

## 전체 일정 요약

| Phase | 작업 | 예상 시간 | 의존성 |
|-------|------|----------|--------|
| 12-1 | Critical 버그 수정 | 30분 | 없음 |
| 12-2 | 백엔드 utils | 1시간 | 12-1 |
| 12-3 | 프론트엔드 훅 | 1.5시간 | 없음 |
| 12-4 | 상수/타입 정리 | 45분 | 12-3 |
| 12-5 | 설정 파일 정리 | 20분 | 12-1 |
| 12-6 | 로깅 표준화 | 1시간 | 12-2 |

**총 예상 시간**: 약 5시간 (12-6 포함)

---

## 결정 필요 사항

### 1. 루트 requirements.txt 처리
- **옵션 A**: 파일 삭제 (권장)
- **옵션 B**: 최소화 (PySide6 제거만)

### 2. Phase 12-6 (로깅) 진행 여부
- **옵션 A**: 지금 진행
- **옵션 B**: 나중에 진행 (현재는 print 유지)

### 3. PageViewer 분할 범위
- **옵션 A**: useSaveGroups만 추출 (최소)
- **옵션 B**: 여러 훅으로 분할 (권장)
- **옵션 C**: 하위 컴포넌트까지 분할 (대규모)

---

*계획 작성 완료: 2025-11-26*
*승인 후 Phase 12-1부터 순차 진행*
