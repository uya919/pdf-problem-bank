# 문항 이름 시스템 구현 계획서

**작성일:** 2025-11-25
**버전:** 1.0
**관련 문서:**
- [09_group_sidebar_improvement_report.md](09_group_sidebar_improvement_report.md)
- [10_problem_naming_ui_research_report.md](10_problem_naming_ui_research_report.md)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [Phase 0: 준비 작업](#2-phase-0-준비-작업)
3. [Phase 1: 데이터 구조 확장](#3-phase-1-데이터-구조-확장)
4. [Phase 2: 페이지 오프셋 시스템](#4-phase-2-페이지-오프셋-시스템)
5. [Phase 3: 문항 정보 입력 UI](#5-phase-3-문항-정보-입력-ui)
6. [Phase 4: 자동완성 시스템](#6-phase-4-자동완성-시스템)
7. [Phase 5: 사이드바 개선](#7-phase-5-사이드바-개선)
8. [Phase 6: 고급 기능](#8-phase-6-고급-기능)
9. [테스트 계획](#9-테스트-계획)
10. [일정 요약](#10-일정-요약)

---

## 1. 프로젝트 개요

### 1.1 목표

문항에 체계적인 이름을 부여하고, 효율적으로 입력할 수 있는 UI 구현

**최종 형식:**
```
수학의 바이블 개념on - 공통수학2, 464p, 3
[책이름] - [과정], [페이지]p, [문항번호]
```

### 1.2 핵심 기능

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 페이지 오프셋 | PDF 인덱스 → 실제 책 페이지 자동 계산 | P0 |
| 구조화 입력 | 책이름, 과정, 페이지, 문항번호 분리 입력 | P0 |
| 자동완성 | 이전 입력 기반 제안 | P1 |
| 빠른 입력 | 인라인 입력 + 스마트 파싱 | P2 |
| 이전 복사 | 이전 문항 정보 복제 | P1 |

### 1.3 영향 범위

```
Frontend:
├── components/
│   ├── GroupPanel.tsx          (대폭 수정)
│   ├── ProblemInfoForm.tsx     (신규)
│   ├── PageOffsetSetting.tsx   (신규)
│   └── PageViewer.tsx          (수정)
├── api/
│   └── client.ts               (타입 확장)
└── hooks/
    └── useDocumentSettings.ts  (신규)

Backend:
├── routers/
│   ├── blocks.py               (API 추가)
│   └── documents.py            (설정 API)
└── (JSON 스키마 확장)
```

---

## 2. Phase 0: 준비 작업

**예상 소요: 1시간**

### 2.1 현재 코드 분석

#### Task 0-1: GroupPanel.tsx 구조 파악
```
- 현재 props 인터페이스
- 그룹 생성/삭제 로직
- 상태 관리 방식
```

#### Task 0-2: 데이터 흐름 파악
```
PageViewer.tsx
    ↓ groups, selectedBlocks
GroupPanel.tsx
    ↓ onCreateGroup, onDeleteGroup
API (savePageGroups)
    ↓
JSON 파일 저장
```

#### Task 0-3: 기존 JSON 스키마 확인
```json
// 현재 groups JSON
{
  "document_id": "...",
  "page_index": 0,
  "groups": [
    {
      "id": "L1",
      "column": "L",
      "block_ids": [726, 727, ...]
    }
  ]
}
```

### 2.2 브랜치 생성

```bash
git checkout -b feature/problem-naming-system
```

---

## 3. Phase 1: 데이터 구조 확장

**예상 소요: 2시간**

### 3.1 타입 정의 확장

#### Task 1-1: ProblemGroup 타입 확장

**파일:** `frontend/src/api/client.ts`

```typescript
// 기존
export interface ProblemGroup {
  id: string;
  column: string;
  block_ids: number[];
}

// 확장
export interface ProblemGroup {
  id: string;
  column: string;
  block_ids: number[];

  // 새로 추가
  problemInfo?: ProblemInfo;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProblemInfo {
  bookName: string;        // "수학의 바이블 개념on"
  course: string;          // "공통수학2"
  page: number;            // 464
  problemNumber: string;   // "3", "예제2", "유형01"
  displayName?: string;    // 자동 생성: "책이름 - 과정, 페이지p, 번호"

  // 선택 필드
  difficulty?: 'easy' | 'medium' | 'hard';
  problemType?: string;
  tags?: string[];
}
```

#### Task 1-2: DocumentSettings 타입 추가

**파일:** `frontend/src/api/client.ts`

```typescript
export interface DocumentSettings {
  document_id: string;

  // 페이지 오프셋 설정
  pageOffset: {
    startPage: number;     // 첫 번째 PDF 페이지의 실제 책 페이지
    increment: number;     // 페이지당 증가량 (기본: 1)
  };

  // 기본 문항 정보 (자동완성용)
  defaultBookName?: string;
  defaultCourse?: string;

  // 마지막 사용 정보
  lastUsedPage?: number;
  lastUsedProblemNumber?: string;
}
```

#### Task 1-3: API 함수 추가

**파일:** `frontend/src/api/client.ts`

```typescript
// 문서 설정 조회
getDocumentSettings: async (documentId: string): Promise<DocumentSettings> => {
  const response = await apiClient.get(`/api/documents/${documentId}/settings`);
  return response.data;
},

// 문서 설정 저장
saveDocumentSettings: async (
  documentId: string,
  settings: Partial<DocumentSettings>
): Promise<{ message: string }> => {
  const response = await apiClient.put(
    `/api/documents/${documentId}/settings`,
    settings
  );
  return response.data;
},
```

### 3.2 백엔드 API 추가

#### Task 1-4: 문서 설정 엔드포인트

**파일:** `backend/app/routers/documents.py` (신규 또는 기존 확장)

```python
@router.get("/documents/{document_id}/settings")
async def get_document_settings(document_id: str):
    """문서별 설정 조회"""
    doc_dir = config.get_document_dir(document_id)
    settings_file = doc_dir / "settings.json"

    if not settings_file.exists():
        # 기본 설정 반환
        return {
            "document_id": document_id,
            "pageOffset": {
                "startPage": 1,
                "increment": 1
            }
        }

    with settings_file.open("r", encoding="utf-8") as f:
        return json.load(f)


@router.put("/documents/{document_id}/settings")
async def save_document_settings(document_id: str, settings: dict):
    """문서별 설정 저장"""
    doc_dir = config.get_document_dir(document_id)
    settings_file = doc_dir / "settings.json"

    # 기존 설정과 병합
    existing = {}
    if settings_file.exists():
        with settings_file.open("r", encoding="utf-8") as f:
            existing = json.load(f)

    merged = {**existing, **settings, "document_id": document_id}

    with settings_file.open("w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    return {"message": "설정이 저장되었습니다"}
```

#### Task 1-5: main.py에 라우터 등록

```python
from app.routers import documents
app.include_router(documents.router, prefix="/api", tags=["documents"])
```

### 3.3 하위 호환성 보장

#### Task 1-6: 마이그레이션 로직

기존 groups JSON에 `problemInfo`가 없어도 정상 동작하도록:

```typescript
// GroupPanel.tsx
const getDisplayName = (group: ProblemGroup): string => {
  if (group.problemInfo?.displayName) {
    return group.problemInfo.displayName;
  }
  // 기존 형식 (L1, R2 등)
  return group.id;
};
```

---

## 4. Phase 2: 페이지 오프셋 시스템

**예상 소요: 3시간**

### 4.1 오프셋 설정 컴포넌트

#### Task 2-1: PageOffsetSetting 컴포넌트 생성

**파일:** `frontend/src/components/PageOffsetSetting.tsx`

```typescript
interface PageOffsetSettingProps {
  documentId: string;
  currentPdfPage: number;
  onSettingsChange: (settings: PageOffsetSettings) => void;
}

interface PageOffsetSettings {
  startPage: number;
  increment: number;
}

export function PageOffsetSetting({
  documentId,
  currentPdfPage,
  onSettingsChange
}: PageOffsetSettingProps) {
  const [startPage, setStartPage] = useState(1);
  const [increment, setIncrement] = useState(1);
  const [isEditing, setIsEditing] = useState(false);

  // 계산된 현재 페이지
  const calculatedPage = startPage + (currentPdfPage * increment);

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">페이지 설정</span>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-blue-600 text-sm"
        >
          {isEditing ? '완료' : '수정'}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-24">시작 페이지:</label>
            <input
              type="number"
              value={startPage}
              onChange={(e) => setStartPage(Number(e.target.value))}
              className="w-20 px-2 py-1 border rounded"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 w-24">증가량:</label>
            <input
              type="number"
              value={increment}
              onChange={(e) => setIncrement(Number(e.target.value))}
              className="w-20 px-2 py-1 border rounded"
              min={1}
            />
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-700">
          PDF {currentPdfPage + 1}페이지 →
          <span className="font-bold text-blue-600"> 책 {calculatedPage}페이지</span>
        </div>
      )}
    </div>
  );
}
```

#### Task 2-2: 훅 생성 - useDocumentSettings

**파일:** `frontend/src/hooks/useDocumentSettings.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, DocumentSettings } from '../api/client';

export function useDocumentSettings(documentId: string) {
  const queryClient = useQueryClient();

  // 설정 조회
  const { data: settings, isLoading } = useQuery({
    queryKey: ['documentSettings', documentId],
    queryFn: () => api.getDocumentSettings(documentId),
    enabled: !!documentId,
  });

  // 설정 저장
  const { mutate: saveSettings } = useMutation({
    mutationFn: (newSettings: Partial<DocumentSettings>) =>
      api.saveDocumentSettings(documentId, newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries(['documentSettings', documentId]);
    },
  });

  // 페이지 번호 계산 헬퍼
  const calculateBookPage = (pdfPageIndex: number): number => {
    if (!settings?.pageOffset) return pdfPageIndex + 1;
    const { startPage, increment } = settings.pageOffset;
    return startPage + (pdfPageIndex * increment);
  };

  return {
    settings,
    isLoading,
    saveSettings,
    calculateBookPage,
  };
}
```

### 4.2 PageViewer에 통합

#### Task 2-3: PageViewer.tsx 수정

**파일:** `frontend/src/components/PageViewer.tsx`

```typescript
// 기존 imports에 추가
import { PageOffsetSetting } from './PageOffsetSetting';
import { useDocumentSettings } from '../hooks/useDocumentSettings';

export function PageViewer({ documentId, ... }) {
  const { settings, saveSettings, calculateBookPage } =
    useDocumentSettings(documentId);

  // 현재 책 페이지 번호
  const currentBookPage = calculateBookPage(pageIndex);

  return (
    <div>
      {/* 상단 툴바에 페이지 설정 추가 */}
      <div className="toolbar">
        <PageOffsetSetting
          documentId={documentId}
          currentPdfPage={pageIndex}
          onSettingsChange={(newSettings) => {
            saveSettings({ pageOffset: newSettings });
          }}
        />

        {/* 현재 페이지 표시 */}
        <span>
          PDF: {pageIndex + 1} / 책: {currentBookPage}p
        </span>
      </div>

      {/* 캔버스, 사이드바 등 */}
    </div>
  );
}
```

### 4.3 페이지 이동 시 자동 업데이트

#### Task 2-4: 페이지 변경 감지

```typescript
// PageViewer.tsx 내부
useEffect(() => {
  // 페이지 변경 시 currentBookPage 자동 업데이트
  // GroupPanel에 전달
}, [pageIndex, settings]);
```

---

## 5. Phase 3: 문항 정보 입력 UI

**예상 소요: 4시간**

### 5.1 문항 정보 입력 폼

#### Task 3-1: ProblemInfoForm 컴포넌트 생성

**파일:** `frontend/src/components/ProblemInfoForm.tsx`

```typescript
interface ProblemInfoFormProps {
  initialData?: ProblemInfo;
  defaultBookPage: number;
  onSave: (info: ProblemInfo) => void;
  onCancel: () => void;
}

export function ProblemInfoForm({
  initialData,
  defaultBookPage,
  onSave,
  onCancel
}: ProblemInfoFormProps) {
  const [bookName, setBookName] = useState(initialData?.bookName || '');
  const [course, setCourse] = useState(initialData?.course || '');
  const [page, setPage] = useState(initialData?.page || defaultBookPage);
  const [problemNumber, setProblemNumber] = useState(
    initialData?.problemNumber || ''
  );

  // 실시간 미리보기
  const displayName = useMemo(() => {
    if (!bookName) return '';
    let name = bookName;
    if (course) name += ` - ${course}`;
    if (page) name += `, ${page}p`;
    if (problemNumber) name += `, ${problemNumber}`;
    return name;
  }, [bookName, course, page, problemNumber]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      bookName,
      course,
      page,
      problemNumber,
      displayName
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* 책이름 */}
      <div>
        <label className="block text-sm font-medium mb-1">책이름</label>
        <input
          type="text"
          value={bookName}
          onChange={(e) => setBookName(e.target.value)}
          placeholder="수학의 바이블 개념on"
          className="w-full px-3 py-2 border rounded-lg"
          autoFocus
        />
      </div>

      {/* 과정 */}
      <div>
        <label className="block text-sm font-medium mb-1">과정</label>
        <input
          type="text"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder="공통수학2"
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      {/* 페이지 + 문항번호 (한 줄) */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">페이지</label>
          <div className="flex items-center">
            <input
              type="number"
              value={page}
              onChange={(e) => setPage(Number(e.target.value))}
              className="w-20 px-3 py-2 border rounded-lg"
            />
            <span className="ml-1 text-gray-500">p</span>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">문항번호</label>
          <input
            type="text"
            value={problemNumber}
            onChange={(e) => setProblemNumber(e.target.value)}
            placeholder="3, 예제2, 유형01"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* 미리보기 */}
      {displayName && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <span className="text-sm text-gray-600">미리보기:</span>
          <p className="font-medium text-blue-800">{displayName}</p>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          취소
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          저장
        </button>
      </div>
    </form>
  );
}
```

### 5.2 모달 래퍼

#### Task 3-2: ProblemInfoModal 컴포넌트

**파일:** `frontend/src/components/ProblemInfoModal.tsx`

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/Dialog';
import { ProblemInfoForm } from './ProblemInfoForm';

interface ProblemInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: ProblemGroup;
  defaultBookPage: number;
  onSave: (groupId: string, info: ProblemInfo) => void;
}

export function ProblemInfoModal({
  isOpen,
  onClose,
  group,
  defaultBookPage,
  onSave
}: ProblemInfoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>문항 정보 입력</DialogTitle>
        </DialogHeader>

        <ProblemInfoForm
          initialData={group.problemInfo}
          defaultBookPage={defaultBookPage}
          onSave={(info) => {
            onSave(group.id, info);
            onClose();
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
```

### 5.3 GroupPanel 통합

#### Task 3-3: GroupPanel.tsx 수정

**파일:** `frontend/src/components/GroupPanel.tsx`

```typescript
// 기존 props에 추가
interface GroupPanelProps {
  groups: ProblemGroup[];
  selectedBlocks: number[];
  currentBookPage: number;  // 추가
  onCreateGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
  onGroupSelect: (blockIds: number[]) => void;
  onUpdateGroupInfo: (groupId: string, info: ProblemInfo) => void;  // 추가
}

export function GroupPanel({
  groups,
  selectedBlocks,
  currentBookPage,
  onCreateGroup,
  onDeleteGroup,
  onGroupSelect,
  onUpdateGroupInfo,
}: GroupPanelProps) {
  const [editingGroup, setEditingGroup] = useState<ProblemGroup | null>(null);

  return (
    <Card className="h-full flex flex-col">
      {/* 헤더 */}
      <CardHeader>...</CardHeader>

      <CardContent>
        {/* 그룹 목록 */}
        {groups.map((group, index) => (
          <div key={group.id} className="group-card">
            {/* 그룹 헤더 */}
            <div className="flex items-center justify-between">
              <span className="order-number">{index + 1}</span>

              {/* 문항 이름 (클릭하면 편집) */}
              <button
                onClick={() => setEditingGroup(group)}
                className="flex-1 text-left"
              >
                {group.problemInfo?.displayName || (
                  <span className="text-gray-400">
                    이름 추가하기...
                  </span>
                )}
              </button>

              {/* 편집/삭제 버튼 */}
              <div className="actions">
                <button onClick={() => setEditingGroup(group)}>
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => onDeleteGroup(group.id)}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 간단한 정보 */}
            <div className="text-sm text-gray-500">
              {group.column} 컬럼 · {group.block_ids.length}개 블록
            </div>
          </div>
        ))}
      </CardContent>

      {/* 문항 정보 편집 모달 */}
      {editingGroup && (
        <ProblemInfoModal
          isOpen={!!editingGroup}
          onClose={() => setEditingGroup(null)}
          group={editingGroup}
          defaultBookPage={currentBookPage}
          onSave={(groupId, info) => {
            onUpdateGroupInfo(groupId, info);
            setEditingGroup(null);
          }}
        />
      )}
    </Card>
  );
}
```

### 5.4 그룹 정보 업데이트 로직

#### Task 3-4: PageViewer에서 업데이트 핸들러

**파일:** `frontend/src/components/PageViewer.tsx`

```typescript
const handleUpdateGroupInfo = async (groupId: string, info: ProblemInfo) => {
  // 그룹 찾기
  const updatedGroups = groups.map(group => {
    if (group.id === groupId) {
      return {
        ...group,
        problemInfo: info,
        updatedAt: new Date().toISOString()
      };
    }
    return group;
  });

  // 저장
  await api.savePageGroups(documentId, pageIndex, {
    document_id: documentId,
    page_index: pageIndex,
    groups: updatedGroups
  });

  // 상태 업데이트
  refetchGroups();
};
```

---

## 6. Phase 4: 자동완성 시스템

**예상 소요: 4시간**

### 6.1 마스터 데이터 관리

#### Task 4-1: 마스터 데이터 저장소

**파일:** `backend/app/routers/master_data.py`

```python
from fastapi import APIRouter
from pathlib import Path
import json

router = APIRouter()

MASTER_DATA_FILE = Path("dataset_root/master_data.json")


def load_master_data():
    if not MASTER_DATA_FILE.exists():
        return {"books": [], "courses": []}
    with MASTER_DATA_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_master_data(data):
    MASTER_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with MASTER_DATA_FILE.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@router.get("/master/books")
async def get_books():
    """책 목록 조회 (자동완성용)"""
    data = load_master_data()
    # 사용 횟수 순 정렬
    books = sorted(data.get("books", []),
                   key=lambda x: x.get("usageCount", 0),
                   reverse=True)
    return books


@router.post("/master/books")
async def add_or_update_book(book_data: dict):
    """책 추가/업데이트"""
    data = load_master_data()
    books = data.get("books", [])

    # 기존 책 찾기
    existing = next((b for b in books if b["name"] == book_data["name"]), None)

    if existing:
        existing["usageCount"] = existing.get("usageCount", 0) + 1
        existing["lastUsed"] = book_data.get("lastUsed")
        if book_data.get("courses"):
            existing["courses"] = list(set(
                existing.get("courses", []) + book_data["courses"]
            ))
    else:
        book_data["usageCount"] = 1
        books.append(book_data)

    data["books"] = books
    save_master_data(data)
    return {"message": "저장 완료"}


@router.get("/master/courses")
async def get_courses(book_name: str = None):
    """과정 목록 조회 (책 기준 필터링 가능)"""
    data = load_master_data()

    if book_name:
        # 특정 책의 과정만 반환
        book = next((b for b in data.get("books", [])
                     if b["name"] == book_name), None)
        if book:
            return book.get("courses", [])
        return []

    # 모든 과정 반환
    return data.get("courses", [])
```

### 6.2 프론트엔드 자동완성 훅

#### Task 4-2: useAutoComplete 훅

**파일:** `frontend/src/hooks/useAutoComplete.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

interface Book {
  name: string;
  courses: string[];
  usageCount: number;
  lastUsed?: string;
}

export function useAutoComplete() {
  const queryClient = useQueryClient();

  // 책 목록 조회
  const { data: books = [] } = useQuery<Book[]>({
    queryKey: ['masterBooks'],
    queryFn: async () => {
      const response = await apiClient.get('/api/master/books');
      return response.data;
    },
  });

  // 과정 목록 조회 (책 기준)
  const getCourses = (bookName: string): string[] => {
    const book = books.find(b => b.name === bookName);
    return book?.courses || [];
  };

  // 책 사용 기록
  const { mutate: recordBookUsage } = useMutation({
    mutationFn: async (bookData: Partial<Book>) => {
      await apiClient.post('/api/master/books', bookData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['masterBooks']);
    },
  });

  // 책 이름 자동완성 필터
  const filterBooks = (query: string): Book[] => {
    if (!query) return books.slice(0, 5);  // 최근 5개
    const lower = query.toLowerCase();
    return books.filter(b =>
      b.name.toLowerCase().includes(lower)
    ).slice(0, 10);
  };

  return {
    books,
    getCourses,
    filterBooks,
    recordBookUsage,
  };
}
```

### 6.3 자동완성 UI 컴포넌트

#### Task 4-3: AutoCompleteInput 컴포넌트

**파일:** `frontend/src/components/ui/AutoCompleteInput.tsx`

```typescript
import { useState, useRef, useEffect } from 'react';

interface AutoCompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  onSelect?: (value: string) => void;
}

export function AutoCompleteInput({
  value,
  onChange,
  suggestions,
  placeholder,
  onSelect
}: AutoCompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 필터링된 제안
  const filtered = suggestions.filter(s =>
    s.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 10);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIndex]) {
          onChange(filtered[highlightIndex]);
          onSelect?.(filtered[highlightIndex]);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
          setHighlightIndex(0);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg"
      />

      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {filtered.map((item, index) => (
            <li
              key={item}
              onClick={() => {
                onChange(item);
                onSelect?.(item);
                setIsOpen(false);
              }}
              className={`px-3 py-2 cursor-pointer ${
                index === highlightIndex
                  ? 'bg-blue-50 text-blue-700'
                  : 'hover:bg-gray-50'
              }`}
            >
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 6.4 ProblemInfoForm에 자동완성 통합

#### Task 4-4: 자동완성 적용

**파일:** `frontend/src/components/ProblemInfoForm.tsx` (수정)

```typescript
import { AutoCompleteInput } from './ui/AutoCompleteInput';
import { useAutoComplete } from '../hooks/useAutoComplete';

export function ProblemInfoForm({ ... }) {
  const { books, getCourses, filterBooks, recordBookUsage } = useAutoComplete();

  // 책 선택 시 과정 목록 업데이트
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);

  const handleBookSelect = (selectedBook: string) => {
    setBookName(selectedBook);
    setAvailableCourses(getCourses(selectedBook));
  };

  return (
    <form>
      {/* 책이름 - 자동완성 */}
      <AutoCompleteInput
        value={bookName}
        onChange={setBookName}
        suggestions={filterBooks(bookName).map(b => b.name)}
        placeholder="수학의 바이블 개념on"
        onSelect={handleBookSelect}
      />

      {/* 과정 - 연동 드롭다운 */}
      <AutoCompleteInput
        value={course}
        onChange={setCourse}
        suggestions={availableCourses}
        placeholder="공통수학2"
      />

      {/* ... 나머지 필드 */}
    </form>
  );
}
```

---

## 7. Phase 5: 사이드바 개선

**예상 소요: 3시간**

### 7.1 그룹 카드 리디자인

#### Task 5-1: 새로운 그룹 카드 디자인

**파일:** `frontend/src/components/GroupCard.tsx`

```typescript
interface GroupCardProps {
  group: ProblemGroup;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function GroupCard({
  group,
  index,
  isSelected,
  onSelect,
  onEdit,
  onDelete
}: GroupCardProps) {
  const hasInfo = !!group.problemInfo?.displayName;

  return (
    <div
      onClick={onSelect}
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      {/* 순서 번호 */}
      <div className="absolute -left-3 -top-3 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
        {index + 1}
      </div>

      {/* 문항 이름 또는 플레이스홀더 */}
      <div className="mb-2">
        {hasInfo ? (
          <p className="font-medium text-gray-900">
            {group.problemInfo.displayName}
          </p>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-gray-400 hover:text-blue-600 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            이름 추가하기
          </button>
        )}
      </div>

      {/* 메타 정보 */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Badge variant="outline" className={
          group.column === 'L' ? 'border-blue-300' : 'border-purple-300'
        }>
          {group.column} 컬럼
        </Badge>
        <span>{group.block_ids.length}개 블록</span>
      </div>

      {/* 호버 시 액션 버튼 */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <Edit2 className="w-4 h-4 text-gray-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 hover:bg-red-100 rounded"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>
  );
}
```

### 7.2 블록 ID 표시 제거

#### Task 5-2: GroupPanel 간소화

기존의 block_ids.map() 부분 완전 제거:

```typescript
// 제거
{group.block_ids.map((blockId) => (
  <span key={blockId} className="px-2 py-0.5 text-xs...">
    #{blockId}
  </span>
))}

// 대체
<span className="text-sm text-gray-500">
  {group.block_ids.length}개 블록 포함
</span>
```

### 7.3 이전 문항 복사 기능

#### Task 5-3: 복사 기능 추가

**파일:** `frontend/src/components/GroupPanel.tsx` (추가)

```typescript
const handleCopyFromPrevious = (targetGroup: ProblemGroup) => {
  // 직전 그룹 찾기
  const currentIndex = groups.findIndex(g => g.id === targetGroup.id);
  if (currentIndex <= 0) return;

  const previousGroup = groups[currentIndex - 1];
  if (!previousGroup.problemInfo) return;

  // 페이지와 문항번호만 증가
  const newInfo: ProblemInfo = {
    ...previousGroup.problemInfo,
    problemNumber: incrementProblemNumber(previousGroup.problemInfo.problemNumber),
    displayName: undefined  // 재계산
  };

  onUpdateGroupInfo(targetGroup.id, newInfo);
};

// 문항번호 증가 헬퍼
const incrementProblemNumber = (num: string): string => {
  const match = num.match(/(\d+)$/);
  if (match) {
    const n = parseInt(match[1], 10);
    return num.replace(/\d+$/, String(n + 1));
  }
  return num;
};
```

---

## 8. Phase 6: 고급 기능

**예상 소요: 4시간**

### 8.1 키보드 단축키

#### Task 6-1: 단축키 시스템

**파일:** `frontend/src/hooks/useKeyboardShortcuts.ts`

```typescript
import { useEffect, useCallback } from 'react';

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    // 입력 필드에서는 비활성화
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
      return;
    }

    const key = [
      e.ctrlKey && 'ctrl',
      e.shiftKey && 'shift',
      e.altKey && 'alt',
      e.key.toLowerCase()
    ].filter(Boolean).join('+');

    if (shortcuts[key]) {
      e.preventDefault();
      shortcuts[key]();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

#### Task 6-2: PageViewer에 단축키 적용

```typescript
// PageViewer.tsx
useKeyboardShortcuts({
  'n': () => handleCreateGroup(),          // 새 그룹
  'e': () => setEditingGroup(selectedGroup), // 편집
  'delete': () => handleDeleteGroup(),      // 삭제
  'ctrl+d': () => handleCopyFromPrevious(), // 이전 복사
  'ctrl+s': () => handleSaveAll(),          // 저장
  'arrowleft': () => goToPreviousPage(),    // 이전 페이지
  'arrowright': () => goToNextPage(),       // 다음 페이지
});
```

### 8.2 빠른 입력 모드

#### Task 6-3: QuickInput 컴포넌트

**파일:** `frontend/src/components/QuickInput.tsx`

```typescript
interface QuickInputProps {
  onSubmit: (info: ProblemInfo) => void;
  suggestions: string[];
  defaultBookPage: number;
}

export function QuickInput({
  onSubmit,
  suggestions,
  defaultBookPage
}: QuickInputProps) {
  const [value, setValue] = useState('');

  // 패턴 파싱: "책이름 - 과정, 페이지p, 문항"
  const parseInput = (input: string): ProblemInfo | null => {
    // 정규식: 책이름 - 과정, 페이지p, 문항
    const match = input.match(
      /^(.+?)\s*-\s*(.+?),\s*(\d+)p?,\s*(.+)$/
    );

    if (match) {
      return {
        bookName: match[1].trim(),
        course: match[2].trim(),
        page: parseInt(match[3], 10),
        problemNumber: match[4].trim(),
        displayName: input.trim()
      };
    }

    return null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const parsed = parseInput(value);
      if (parsed) {
        onSubmit(parsed);
        setValue('');
      }
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="책이름 - 과정, 페이지p, 문항번호"
        className="w-full px-3 py-2 border rounded-lg"
      />

      {/* 제안 목록 */}
      {value && suggestions.length > 0 && (
        <ul className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg">
          {suggestions.map(s => (
            <li
              key={s}
              onClick={() => setValue(s)}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 8.3 일괄 편집

#### Task 6-4: 선택된 그룹들 일괄 편집

```typescript
// 여러 그룹 선택 후 일괄 적용
const handleBulkEdit = (commonInfo: Partial<ProblemInfo>) => {
  const updatedGroups = groups.map((group, index) => {
    if (selectedGroupIds.includes(group.id)) {
      return {
        ...group,
        problemInfo: {
          ...group.problemInfo,
          ...commonInfo,
          // 문항번호만 자동 증가
          problemNumber: commonInfo.problemNumber
            ? incrementBy(commonInfo.problemNumber, index)
            : group.problemInfo?.problemNumber
        }
      };
    }
    return group;
  });

  saveAllGroups(updatedGroups);
};
```

---

## 9. 테스트 계획

### 9.1 단위 테스트

```typescript
// __tests__/problemInfo.test.ts

describe('ProblemInfo', () => {
  describe('displayName 생성', () => {
    it('모든 필드가 있을 때', () => {
      const info = {
        bookName: '수학의 바이블',
        course: '공통수학2',
        page: 464,
        problemNumber: '3'
      };
      expect(generateDisplayName(info))
        .toBe('수학의 바이블 - 공통수학2, 464p, 3');
    });

    it('과정이 없을 때', () => {
      const info = {
        bookName: '수학의 바이블',
        page: 464,
        problemNumber: '3'
      };
      expect(generateDisplayName(info))
        .toBe('수학의 바이블, 464p, 3');
    });
  });

  describe('페이지 오프셋', () => {
    it('기본 계산', () => {
      const settings = { startPage: 460, increment: 1 };
      expect(calculateBookPage(0, settings)).toBe(460);
      expect(calculateBookPage(4, settings)).toBe(464);
    });

    it('2씩 증가', () => {
      const settings = { startPage: 460, increment: 2 };
      expect(calculateBookPage(0, settings)).toBe(460);
      expect(calculateBookPage(2, settings)).toBe(464);
    });
  });
});
```

### 9.2 통합 테스트

```typescript
// __tests__/integration/groupNaming.test.ts

describe('그룹 이름 지정 워크플로우', () => {
  it('새 그룹 생성 후 이름 지정', async () => {
    // 1. 블록 선택
    // 2. 그룹 생성
    // 3. 이름 입력 모달 열기
    // 4. 정보 입력
    // 5. 저장 확인
    // 6. JSON 파일 확인
  });

  it('페이지 이동 시 페이지 번호 자동 증가', async () => {
    // 1. 시작 페이지 460 설정
    // 2. 다음 페이지 이동
    // 3. 새 그룹 생성
    // 4. 페이지 필드가 461인지 확인
  });
});
```

### 9.3 E2E 테스트 시나리오

| 시나리오 | 단계 | 예상 결과 |
|----------|------|----------|
| 기본 플로우 | 블록 선택 → 그룹 생성 → 이름 입력 → 저장 | JSON에 problemInfo 포함 |
| 자동완성 | 책이름 입력 시작 → 드롭다운 표시 | 이전 사용 기록 표시 |
| 페이지 오프셋 | 설정 → 페이지 이동 | 자동 계산된 페이지 표시 |
| 복사 기능 | Ctrl+D | 이전 그룹 정보 + 번호 증가 |

---

## 10. 일정 요약

### 전체 타임라인

```
Week 1 (Day 1-2): Phase 0-1
├── Day 1 AM: 준비 작업, 코드 분석
├── Day 1 PM: 데이터 구조 확장
└── Day 2: 백엔드 API, 테스트

Week 1 (Day 3-4): Phase 2-3
├── Day 3: 페이지 오프셋 시스템
└── Day 4: 문항 정보 입력 UI

Week 2 (Day 5-6): Phase 4-5
├── Day 5: 자동완성 시스템
└── Day 6: 사이드바 개선

Week 2 (Day 7): Phase 6 + 마무리
├── AM: 키보드 단축키, 빠른 입력
└── PM: 테스트, 버그 수정, 문서화
```

### Phase별 체크리스트

#### Phase 0: 준비 (1시간)
- [ ] 현재 코드 분석
- [ ] 브랜치 생성
- [ ] 개발 환경 확인

#### Phase 1: 데이터 구조 (2시간)
- [ ] ProblemGroup 타입 확장
- [ ] DocumentSettings 타입 추가
- [ ] 백엔드 API 추가
- [ ] 하위 호환성 테스트

#### Phase 2: 페이지 오프셋 (3시간)
- [ ] PageOffsetSetting 컴포넌트
- [ ] useDocumentSettings 훅
- [ ] PageViewer 통합
- [ ] 설정 저장/로드

#### Phase 3: 입력 UI (4시간)
- [ ] ProblemInfoForm 컴포넌트
- [ ] ProblemInfoModal 컴포넌트
- [ ] GroupPanel 통합
- [ ] 저장 로직

#### Phase 4: 자동완성 (4시간)
- [ ] 마스터 데이터 API
- [ ] useAutoComplete 훅
- [ ] AutoCompleteInput 컴포넌트
- [ ] Cascading 연동

#### Phase 5: 사이드바 (3시간)
- [ ] GroupCard 리디자인
- [ ] 블록 ID 제거
- [ ] 이전 복사 기능

#### Phase 6: 고급 기능 (4시간)
- [ ] 키보드 단축키
- [ ] 빠른 입력 모드
- [ ] 일괄 편집

---

## 부록: 파일 변경 요약

### 신규 파일

| 파일 | 설명 |
|------|------|
| `frontend/src/components/PageOffsetSetting.tsx` | 페이지 오프셋 설정 |
| `frontend/src/components/ProblemInfoForm.tsx` | 문항 정보 입력 폼 |
| `frontend/src/components/ProblemInfoModal.tsx` | 입력 모달 |
| `frontend/src/components/GroupCard.tsx` | 그룹 카드 |
| `frontend/src/components/ui/AutoCompleteInput.tsx` | 자동완성 입력 |
| `frontend/src/components/QuickInput.tsx` | 빠른 입력 |
| `frontend/src/hooks/useDocumentSettings.ts` | 문서 설정 훅 |
| `frontend/src/hooks/useAutoComplete.ts` | 자동완성 훅 |
| `frontend/src/hooks/useKeyboardShortcuts.ts` | 단축키 훅 |
| `backend/app/routers/documents.py` | 문서 설정 API |
| `backend/app/routers/master_data.py` | 마스터 데이터 API |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `frontend/src/api/client.ts` | 타입 확장, API 추가 |
| `frontend/src/components/GroupPanel.tsx` | 대폭 리팩토링 |
| `frontend/src/components/PageViewer.tsx` | 오프셋, 핸들러 추가 |
| `backend/app/main.py` | 라우터 등록 |

---

**작성 완료:** 2025-11-25
**다음 단계:** 사용자 승인 후 Phase 0부터 구현 시작

