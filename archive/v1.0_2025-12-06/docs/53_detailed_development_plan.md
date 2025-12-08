# 차세대 문제은행 시스템 - 상세 개발 계획서

## Phase 21+: 단계별 개발 가이드

**작성일**: 2025-11-30
**분석 수준**: Opus ThinkHarder (Deep Planning)
**참조**: [52_comprehensive_problem_bank_research_report.md](52_comprehensive_problem_bank_research_report.md)

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [전체 아키텍처](#2-전체-아키텍처)
3. [Phase A: 데이터 기반 구축](#3-phase-a-데이터-기반-구축)
4. [Phase B: 문제은행 UI](#4-phase-b-문제은행-ui)
5. [Phase C: 라벨링 + 분류 통합](#5-phase-c-라벨링--분류-통합)
6. [Phase D: 시험지 빌더](#6-phase-d-시험지-빌더)
7. [Phase E: 고급 기능](#7-phase-e-고급-기능)
8. [공통 인프라](#8-공통-인프라)
9. [마이그레이션 전략](#9-마이그레이션-전략)
10. [테스트 전략](#10-테스트-전략)

---

## 1. 프로젝트 개요

### 1.1 비전
```
"학원 선생님이 5분 만에 맞춤형 시험지를 만들 수 있는 문제은행 시스템"
```

### 1.2 핵심 목표
| 목표 | 현재 | 목표 |
|------|------|------|
| 문제 검색 | 불가능 (폴더 브라우징만) | 30초 내 검색 |
| 시험지 제작 | 30분 | 5분 |
| 분류 체계 | 평면 (책/페이지) | 5단계 (학년→유형) |
| UI/UX | 기능 중심 | 토스 수준 직관성 |

### 1.3 Phase 의존성 그래프
```
Phase A (데이터 기반)
    ├── A-1: 분류 체계 DB
    ├── A-2: Problem 모델
    └── A-3: 분류 선택 컴포넌트
           │
           ▼
Phase B (문제은행 UI)    ←─┬─── Phase C (라벨링 개선)
    ├── B-1: 메인 레이아웃    │      ├── C-1: 분류 선택 통합
    ├── B-2: 문제 카드        │      ├── C-2: 태그 시스템
    ├── B-3: 분류 트리        │      ├── C-3: 난이도 설정
    ├── B-4: 필터 시스템      │      └── C-4: 자동 분류 제안
    └── B-5: 검색             │
           │                  │
           └────────┬─────────┘
                    │
                    ▼
           Phase D (시험지 빌더)
               ├── D-1: 빌더 UI
               ├── D-2: 드래그&드롭
               ├── D-3: PDF 내보내기
               └── D-4: 정답지 생성
                    │
                    ▼
           Phase E (고급 기능)
               ├── E-1: ML 자동 분류
               ├── E-2: 유사 문제 추천
               └── E-3: 통계 대시보드
```

---

## 2. 전체 아키텍처

### 2.1 시스템 아키텍처 (TO-BE)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend (React 18)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐            │
│  │   홈      │  │ 문제은행   │  │ 라벨링    │  │ 시험지    │            │
│  │ Dashboard │  │ProblemBank│  │ Labeling  │  │ Worksheet │            │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘            │
│         │              │              │              │                  │
│         └──────────────┴──────────────┴──────────────┘                  │
│                                │                                         │
│                    ┌───────────┴───────────┐                            │
│                    │    공통 컴포넌트       │                            │
│                    │  - ClassificationTree  │                            │
│                    │  - ProblemCard         │                            │
│                    │  - FilterSystem        │                            │
│                    │  - SearchBar           │                            │
│                    └───────────────────────┘                            │
├─────────────────────────────────────────────────────────────────────────┤
│                           API Layer (TanStack Query)                     │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  useClassification() │ useProblems() │ useWorksheets() │ ...     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Backend (FastAPI)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │ /api/classify │  │ /api/problems │  │/api/worksheets│               │
│  │   분류 API    │  │   문제 API    │  │  시험지 API   │               │
│  └───────────────┘  └───────────────┘  └───────────────┘               │
│                                │                                         │
│                    ┌───────────┴───────────┐                            │
│                    │     Services          │                            │
│                    │  - ClassificationSvc  │                            │
│                    │  - ProblemSvc         │                            │
│                    │  - WorksheetSvc       │                            │
│                    │  - AutoClassifier     │                            │
│                    └───────────────────────┘                            │
├─────────────────────────────────────────────────────────────────────────┤
│                           Data Layer                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  dataset_root/                                                     │  │
│  │  ├── classification/    # 분류 체계 데이터                        │  │
│  │  ├── problems/          # 문제 데이터                             │  │
│  │  ├── worksheets/        # 시험지 데이터                           │  │
│  │  ├── folders/           # 폴더 구조                               │  │
│  │  └── documents/         # 기존 문서 (마이그레이션 대상)           │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 디렉토리 구조 (TO-BE)
```
pdf/
├── backend/
│   └── app/
│       ├── routers/
│       │   ├── classification.py      # [NEW] 분류 API
│       │   ├── problems.py             # [NEW] 문제 API
│       │   ├── worksheets.py           # [NEW] 시험지 API
│       │   ├── folders.py              # [NEW] 폴더 API
│       │   └── ... (기존 유지)
│       │
│       ├── services/
│       │   ├── classification/
│       │   │   ├── __init__.py
│       │   │   ├── tree_service.py     # [NEW] 분류 트리 서비스
│       │   │   └── auto_classifier.py  # [NEW] 자동 분류
│       │   │
│       │   ├── problems/
│       │   │   ├── __init__.py
│       │   │   ├── problem_service.py  # [NEW] 문제 CRUD
│       │   │   └── search_service.py   # [NEW] 검색 서비스
│       │   │
│       │   └── worksheets/
│       │       ├── __init__.py
│       │       ├── worksheet_service.py # [NEW]
│       │       └── pdf_exporter.py      # [NEW]
│       │
│       ├── models/
│       │   ├── __init__.py
│       │   ├── classification.py       # [NEW] 분류 모델
│       │   ├── problem.py              # [NEW] 문제 모델
│       │   └── worksheet.py            # [NEW] 시험지 모델
│       │
│       └── data/
│           └── classification/
│               ├── math_tree.json      # [NEW] 분류 트리 데이터
│               └── keywords.json       # [NEW] 키워드 매핑
│
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── classification.ts       # [NEW] 분류 API 클라이언트
│       │   ├── problems.ts             # [NEW] 문제 API 클라이언트
│       │   └── worksheets.ts           # [NEW] 시험지 API 클라이언트
│       │
│       ├── components/
│       │   ├── classification/
│       │   │   ├── ClassificationTree.tsx    # [NEW]
│       │   │   ├── ClassificationPicker.tsx  # [NEW]
│       │   │   └── ClassificationBreadcrumb.tsx # [NEW]
│       │   │
│       │   ├── problem/
│       │   │   ├── ProblemCard.tsx           # [REFACTOR]
│       │   │   ├── ProblemGrid.tsx           # [NEW]
│       │   │   ├── ProblemDetail.tsx         # [NEW]
│       │   │   └── ProblemFilters.tsx        # [NEW]
│       │   │
│       │   ├── worksheet/
│       │   │   ├── WorksheetBuilder.tsx      # [NEW]
│       │   │   ├── WorksheetPreview.tsx      # [NEW]
│       │   │   └── ProblemDragItem.tsx       # [NEW]
│       │   │
│       │   └── ui/
│       │       ├── BottomSheet.tsx           # [NEW]
│       │       ├── SearchBar.tsx             # [NEW]
│       │       ├── FilterChip.tsx            # [NEW]
│       │       └── Skeleton.tsx              # [NEW]
│       │
│       ├── pages/
│       │   ├── ProblemBankPage.tsx           # [REFACTOR]
│       │   ├── WorksheetBuilderPage.tsx      # [NEW]
│       │   └── WorksheetListPage.tsx         # [NEW]
│       │
│       ├── hooks/
│       │   ├── useClassification.ts          # [NEW]
│       │   ├── useProblems.ts                # [NEW]
│       │   ├── useWorksheets.ts              # [NEW]
│       │   └── useInfiniteScroll.ts          # [NEW]
│       │
│       └── types/
│           ├── classification.ts             # [NEW]
│           ├── problem.ts                    # [NEW]
│           └── worksheet.ts                  # [NEW]
│
└── dataset_root/
    ├── classification/
    │   └── math_tree.json                    # [NEW]
    │
    ├── problems/
    │   ├── index.json                        # [NEW] 문제 인덱스
    │   └── {problem_id}/
    │       ├── problem.json
    │       ├── image.png
    │       └── thumbnail.png
    │
    ├── worksheets/
    │   ├── index.json                        # [NEW]
    │   └── {worksheet_id}/
    │       ├── worksheet.json
    │       └── exports/
    │
    └── folders/
        └── structure.json                    # [NEW]
```

---

## 3. Phase A: 데이터 기반 구축

### 3.1 Phase A-1: 분류 체계 DB 구축

#### 목표
수학비서 5단계 분류 체계 (22,927 노드)를 시스템에 통합

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| A-1-1 | 분류 데이터 JSON 구조 설계 | 노드 ID, 부모-자식 관계, 메타데이터 | `classification_schema.json` |
| A-1-2 | 분류 데이터 파일 생성 | 수학비서 데이터 기반 JSON 생성 | `math_tree.json` |
| A-1-3 | 백엔드 모델 정의 | Pydantic 모델 정의 | `models/classification.py` |
| A-1-4 | 분류 서비스 구현 | 트리 조회, 검색, 캐싱 | `services/classification/` |
| A-1-5 | REST API 구현 | 엔드포인트 정의 | `routers/classification.py` |
| A-1-6 | 프론트엔드 타입 정의 | TypeScript 인터페이스 | `types/classification.ts` |
| A-1-7 | API 클라이언트 구현 | TanStack Query 훅 | `api/classification.ts` |

#### A-1-1: 분류 데이터 JSON 스키마

```json
// dataset_root/classification/math_tree.json
{
  "version": "1.0",
  "metadata": {
    "source": "mathsecr.com",
    "lastUpdated": "2025-11-30",
    "totalNodes": 22927,
    "levels": ["grade", "majorUnit", "middleUnit", "minorUnit", "type"]
  },
  "tree": [
    {
      "id": 1,
      "code": "01",
      "name": "중1-1",
      "fullName": "01 중1-1",
      "level": 1,
      "parentId": null,
      "order": 1,
      "problemCount": 0,
      "children": [
        {
          "id": 101,
          "code": "01",
          "name": "소인수분해",
          "fullName": "01 소인수분해",
          "level": 2,
          "parentId": 1,
          "order": 1,
          "problemCount": 0,
          "children": [
            // ... 중단원, 소단원, 유형
          ]
        }
      ]
    },
    // ... 17개 학년
  ],
  "flatIndex": {
    // ID → 노드 빠른 접근용
    "1": { "path": [1], "fullPath": "중1-1" },
    "101": { "path": [1, 101], "fullPath": "중1-1 > 소인수분해" },
    // ...
  }
}
```

#### A-1-3: 백엔드 모델 (Pydantic)

```python
# backend/app/models/classification.py
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class ClassificationLevel(str, Enum):
    GRADE = "grade"           # 학년 (Level 1)
    MAJOR_UNIT = "majorUnit"  # 대단원 (Level 2)
    MIDDLE_UNIT = "middleUnit"  # 중단원 (Level 3)
    MINOR_UNIT = "minorUnit"  # 소단원 (Level 4)
    TYPE = "type"             # 유형 (Level 5)

class ClassificationNode(BaseModel):
    """분류 트리 노드"""
    id: int
    code: str                   # "01", "02" 등
    name: str                   # "이차방정식"
    fullName: str               # "03 이차방정식"
    level: int                  # 1-5
    parentId: Optional[int]
    order: int                  # 정렬 순서
    problemCount: int = 0       # 하위 문제 수 (캐시)
    children: List['ClassificationNode'] = []

class ClassificationPath(BaseModel):
    """분류 경로 (선택된 분류)"""
    gradeId: Optional[int] = None
    majorUnitId: Optional[int] = None
    middleUnitId: Optional[int] = None
    minorUnitId: Optional[int] = None
    typeId: Optional[int] = None

    # 캐시된 텍스트 (표시용)
    gradeName: Optional[str] = None
    fullPath: Optional[str] = None  # "공통수학1 > 이차방정식 > ..."

class ClassificationSearchResult(BaseModel):
    """분류 검색 결과"""
    node: ClassificationNode
    path: str                   # 전체 경로 텍스트
    matchType: str              # "exact", "prefix", "contains"
    score: float                # 관련도 점수
```

#### A-1-5: REST API 설계

```python
# backend/app/routers/classification.py
from fastapi import APIRouter, Query
from typing import List, Optional

router = APIRouter(prefix="/api/classification", tags=["classification"])

@router.get("/tree")
async def get_classification_tree(
    level: Optional[int] = Query(None, ge=1, le=5),
    parentId: Optional[int] = None
) -> List[ClassificationNode]:
    """
    분류 트리 조회

    - level: 특정 레벨만 조회 (1-5)
    - parentId: 특정 노드의 자식만 조회
    - 둘 다 없으면 전체 트리 반환
    """
    pass

@router.get("/tree/{nodeId}")
async def get_classification_node(nodeId: int) -> ClassificationNode:
    """특정 노드 조회 (자식 포함)"""
    pass

@router.get("/path/{nodeId}")
async def get_classification_path(nodeId: int) -> ClassificationPath:
    """노드의 전체 경로 조회"""
    pass

@router.get("/search")
async def search_classification(
    query: str = Query(..., min_length=1),
    level: Optional[int] = Query(None, ge=1, le=5),
    limit: int = Query(20, le=100)
) -> List[ClassificationSearchResult]:
    """
    분류 검색

    - query: 검색어
    - level: 특정 레벨에서만 검색
    - limit: 최대 결과 수
    """
    pass

@router.get("/grades")
async def get_grades() -> List[ClassificationNode]:
    """학년 목록 (Level 1) 조회"""
    pass

@router.get("/popular")
async def get_popular_classifications(
    limit: int = Query(10, le=50)
) -> List[ClassificationNode]:
    """자주 사용되는 분류 조회"""
    pass
```

#### A-1-6: 프론트엔드 타입

```typescript
// frontend/src/types/classification.ts

export type ClassificationLevel =
  | 'grade'       // 학년
  | 'majorUnit'   // 대단원
  | 'middleUnit'  // 중단원
  | 'minorUnit'   // 소단원
  | 'type';       // 유형

export interface ClassificationNode {
  id: number;
  code: string;
  name: string;
  fullName: string;
  level: number;
  parentId: number | null;
  order: number;
  problemCount: number;
  children: ClassificationNode[];
}

export interface ClassificationPath {
  gradeId?: number;
  majorUnitId?: number;
  middleUnitId?: number;
  minorUnitId?: number;
  typeId?: number;
  gradeName?: string;
  fullPath?: string;
}

export interface ClassificationSearchResult {
  node: ClassificationNode;
  path: string;
  matchType: 'exact' | 'prefix' | 'contains';
  score: number;
}
```

#### A-1-7: API 클라이언트 훅

```typescript
// frontend/src/api/classification.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from './client';

// 분류 트리 조회
export function useClassificationTree(
  level?: number,
  parentId?: number
) {
  return useQuery({
    queryKey: ['classification', 'tree', level, parentId],
    queryFn: () => api.get('/api/classification/tree', {
      params: { level, parentId }
    }).then(r => r.data),
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });
}

// 학년 목록 조회
export function useGrades() {
  return useQuery({
    queryKey: ['classification', 'grades'],
    queryFn: () => api.get('/api/classification/grades').then(r => r.data),
    staleTime: Infinity, // 변경되지 않음
  });
}

// 분류 검색
export function useClassificationSearch(query: string) {
  return useQuery({
    queryKey: ['classification', 'search', query],
    queryFn: () => api.get('/api/classification/search', {
      params: { query }
    }).then(r => r.data),
    enabled: query.length > 0,
  });
}

// 노드 경로 조회
export function useClassificationPath(nodeId: number | null) {
  return useQuery({
    queryKey: ['classification', 'path', nodeId],
    queryFn: () => api.get(`/api/classification/path/${nodeId}`).then(r => r.data),
    enabled: nodeId !== null,
  });
}
```

---

### 3.2 Phase A-2: Problem 데이터 모델 마이그레이션

#### 목표
기존 `ProblemGroup` 중심에서 `Problem` 중심 모델로 전환

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| A-2-1 | Problem 모델 설계 | 새로운 문제 엔티티 정의 | `models/problem.py` |
| A-2-2 | 저장소 구조 설계 | 파일/폴더 구조 정의 | 디렉토리 구조 |
| A-2-3 | Problem 서비스 구현 | CRUD, 검색, 필터링 | `services/problems/` |
| A-2-4 | REST API 구현 | 문제 관련 엔드포인트 | `routers/problems.py` |
| A-2-5 | 마이그레이션 스크립트 | 기존 데이터 변환 | `scripts/migrate_problems.py` |
| A-2-6 | 프론트엔드 타입 정의 | TypeScript 인터페이스 | `types/problem.ts` |
| A-2-7 | API 클라이언트 구현 | TanStack Query 훅 | `api/problems.ts` |

#### A-2-1: Problem 모델 상세

```python
# backend/app/models/problem.py
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime
from uuid import uuid4

class ProblemSource(BaseModel):
    """문제 출처 정보"""
    type: Literal["book", "exam", "custom"]
    name: str                       # "수학의 바이블" 또는 "2020 교육청 6월"
    page: Optional[int] = None
    problemNumber: Optional[str] = None
    year: Optional[int] = None
    organization: Optional[str] = None  # "교육청", "평가원", "수능"

    # 원본 문서 참조 (라벨링 시스템 연동)
    documentId: Optional[str] = None
    groupId: Optional[str] = None

class ProblemContent(BaseModel):
    """문제 콘텐츠"""
    imageUrl: str                   # 문제 이미지 경로
    thumbnailUrl: str               # 썸네일 경로
    latex: Optional[str] = None     # LaTeX 수식 (HML에서 추출)
    ocrText: Optional[str] = None   # OCR 추출 텍스트

    # 객관식 전용
    choices: Optional[List[str]] = None  # ["①", "②", "③", "④", "⑤"]

    # 정답/해설
    answer: Optional[str] = None
    answerType: Optional[Literal["number", "text", "choice"]] = None
    solution: Optional[str] = None
    solutionImageUrl: Optional[str] = None

class Problem(BaseModel):
    """문제 엔티티"""
    # 식별자
    id: str = Field(default_factory=lambda: str(uuid4()))

    # 분류 정보
    classification: Optional[ClassificationPath] = None

    # 문제 속성
    questionType: Literal["multiple_choice", "short_answer", "essay"] = "short_answer"
    difficulty: int = Field(5, ge=1, le=10)  # 1-10
    points: Optional[float] = None           # 배점

    # 콘텐츠
    content: ProblemContent

    # 출처
    source: ProblemSource

    # 태그
    tags: List[str] = []

    # 메타데이터
    createdAt: datetime = Field(default_factory=datetime.now)
    updatedAt: datetime = Field(default_factory=datetime.now)
    createdBy: str = "system"

    # 사용 통계
    usageCount: int = 0
    lastUsedAt: Optional[datetime] = None
    isFavorite: bool = False

class ProblemFilter(BaseModel):
    """문제 필터링 조건"""
    # 분류 필터
    gradeIds: Optional[List[int]] = None
    majorUnitIds: Optional[List[int]] = None
    middleUnitIds: Optional[List[int]] = None
    minorUnitIds: Optional[List[int]] = None
    typeIds: Optional[List[int]] = None

    # 속성 필터
    questionTypes: Optional[List[str]] = None
    difficultyMin: Optional[int] = None
    difficultyMax: Optional[int] = None

    # 출처 필터
    sourceTypes: Optional[List[str]] = None
    years: Optional[List[int]] = None
    organizations: Optional[List[str]] = None

    # 기타
    tags: Optional[List[str]] = None
    hasAnswer: Optional[bool] = None
    hasSolution: Optional[bool] = None
    isFavorite: Optional[bool] = None

    # 검색
    searchQuery: Optional[str] = None

    # 페이지네이션
    page: int = 1
    pageSize: int = 20

    # 정렬
    sortBy: str = "createdAt"
    sortOrder: Literal["asc", "desc"] = "desc"
```

#### A-2-2: 저장소 구조

```
dataset_root/
├── problems/
│   ├── index.json                    # 전체 인덱스 (ID, 분류, 기본정보)
│   │
│   └── {problem_id}/                 # 개별 문제 폴더
│       ├── problem.json              # 문제 메타데이터
│       ├── image.png                 # 원본 이미지
│       ├── thumbnail.png             # 썸네일 (200x300)
│       └── solution.png              # 해설 이미지 (있는 경우)
│
└── problems_cache/                   # 캐시 (빠른 조회용)
    ├── by_grade/
    │   ├── 01.json                   # 중1-1 문제 목록
    │   └── ...
    ├── by_tag/
    │   ├── 이차방정식.json
    │   └── ...
    └── search_index.json             # 전문 검색 인덱스
```

#### A-2-4: REST API 설계

```python
# backend/app/routers/problems.py
from fastapi import APIRouter, Query, Body, HTTPException
from typing import List, Optional

router = APIRouter(prefix="/api/problems", tags=["problems"])

# === 조회 ===

@router.get("/")
async def list_problems(
    # 분류 필터
    gradeIds: Optional[List[int]] = Query(None),
    majorUnitIds: Optional[List[int]] = Query(None),
    typeIds: Optional[List[int]] = Query(None),

    # 속성 필터
    questionType: Optional[str] = None,
    difficultyMin: Optional[int] = Query(None, ge=1, le=10),
    difficultyMax: Optional[int] = Query(None, ge=1, le=10),

    # 기타 필터
    tags: Optional[List[str]] = Query(None),
    hasAnswer: Optional[bool] = None,
    isFavorite: Optional[bool] = None,

    # 검색
    q: Optional[str] = None,

    # 페이지네이션
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),

    # 정렬
    sortBy: str = "createdAt",
    sortOrder: str = "desc"
) -> ProblemListResponse:
    """문제 목록 조회 (필터링, 검색, 페이지네이션)"""
    pass

@router.get("/{problemId}")
async def get_problem(problemId: str) -> Problem:
    """문제 상세 조회"""
    pass

@router.get("/by-classification/{nodeId}")
async def get_problems_by_classification(
    nodeId: int,
    includeChildren: bool = True,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100)
) -> ProblemListResponse:
    """특정 분류의 문제 조회"""
    pass

@router.get("/recent")
async def get_recent_problems(
    limit: int = Query(10, le=50)
) -> List[Problem]:
    """최근 추가된 문제"""
    pass

@router.get("/favorites")
async def get_favorite_problems(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100)
) -> ProblemListResponse:
    """즐겨찾기 문제"""
    pass

# === 생성/수정 ===

@router.post("/")
async def create_problem(problem: ProblemCreate) -> Problem:
    """문제 생성"""
    pass

@router.put("/{problemId}")
async def update_problem(
    problemId: str,
    problem: ProblemUpdate
) -> Problem:
    """문제 수정"""
    pass

@router.patch("/{problemId}/classification")
async def update_problem_classification(
    problemId: str,
    classification: ClassificationPath
) -> Problem:
    """문제 분류 변경"""
    pass

@router.patch("/{problemId}/favorite")
async def toggle_favorite(
    problemId: str,
    isFavorite: bool
) -> Problem:
    """즐겨찾기 토글"""
    pass

@router.delete("/{problemId}")
async def delete_problem(problemId: str) -> dict:
    """문제 삭제"""
    pass

# === 일괄 작업 ===

@router.post("/bulk/classification")
async def bulk_update_classification(
    problemIds: List[str],
    classification: ClassificationPath
) -> dict:
    """여러 문제 분류 일괄 변경"""
    pass

@router.post("/bulk/tags")
async def bulk_add_tags(
    problemIds: List[str],
    tags: List[str]
) -> dict:
    """여러 문제에 태그 일괄 추가"""
    pass

# === 통계 ===

@router.get("/stats/overview")
async def get_problem_stats() -> ProblemStats:
    """문제 통계 (총 개수, 분류별, 난이도별)"""
    pass

@router.get("/stats/by-classification")
async def get_stats_by_classification(
    level: int = Query(1, ge=1, le=5)
) -> List[ClassificationStats]:
    """분류별 문제 수 통계"""
    pass
```

#### A-2-6: 프론트엔드 타입

```typescript
// frontend/src/types/problem.ts

import { ClassificationPath } from './classification';

export type QuestionType = 'multiple_choice' | 'short_answer' | 'essay';
export type SourceType = 'book' | 'exam' | 'custom';

export interface ProblemSource {
  type: SourceType;
  name: string;
  page?: number;
  problemNumber?: string;
  year?: number;
  organization?: string;
  documentId?: string;
  groupId?: string;
}

export interface ProblemContent {
  imageUrl: string;
  thumbnailUrl: string;
  latex?: string;
  ocrText?: string;
  choices?: string[];
  answer?: string;
  answerType?: 'number' | 'text' | 'choice';
  solution?: string;
  solutionImageUrl?: string;
}

export interface Problem {
  id: string;
  classification?: ClassificationPath;
  questionType: QuestionType;
  difficulty: number;
  points?: number;
  content: ProblemContent;
  source: ProblemSource;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  usageCount: number;
  lastUsedAt?: string;
  isFavorite: boolean;
}

export interface ProblemFilter {
  gradeIds?: number[];
  majorUnitIds?: number[];
  middleUnitIds?: number[];
  minorUnitIds?: number[];
  typeIds?: number[];
  questionTypes?: QuestionType[];
  difficultyMin?: number;
  difficultyMax?: number;
  sourceTypes?: SourceType[];
  years?: number[];
  organizations?: string[];
  tags?: string[];
  hasAnswer?: boolean;
  hasSolution?: boolean;
  isFavorite?: boolean;
  searchQuery?: string;
}

export interface ProblemListResponse {
  items: Problem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProblemStats {
  total: number;
  byQuestionType: Record<QuestionType, number>;
  byDifficulty: Record<number, number>;
  byGrade: Record<string, number>;
  recentlyAdded: number;
  favorites: number;
}
```

---

### 3.3 Phase A-3: 분류 선택 컴포넌트

#### 목표
사용자가 쉽게 5단계 분류를 선택할 수 있는 UI 컴포넌트 개발

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| A-3-1 | ClassificationTree 컴포넌트 | 트리 뷰 네비게이션 | `ClassificationTree.tsx` |
| A-3-2 | ClassificationPicker 컴포넌트 | 모달/바텀시트 선택기 | `ClassificationPicker.tsx` |
| A-3-3 | ClassificationBreadcrumb 컴포넌트 | 선택된 경로 표시 | `ClassificationBreadcrumb.tsx` |
| A-3-4 | useClassificationPicker 훅 | 선택 상태 관리 | `useClassificationPicker.ts` |
| A-3-5 | 스토리북 문서화 | 컴포넌트 사용 예시 | `*.stories.tsx` |

#### A-3-1: ClassificationTree 컴포넌트

```tsx
// frontend/src/components/classification/ClassificationTree.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import { ClassificationNode } from '@/types/classification';
import { cn } from '@/lib/utils';

interface ClassificationTreeProps {
  /** 트리 데이터 */
  data: ClassificationNode[];

  /** 선택된 노드 ID */
  selectedId?: number | null;

  /** 확장된 노드 ID 목록 */
  expandedIds?: number[];

  /** 노드 선택 콜백 */
  onSelect?: (node: ClassificationNode) => void;

  /** 노드 확장/축소 콜백 */
  onToggle?: (nodeId: number, expanded: boolean) => void;

  /** 선택 가능한 레벨 (없으면 모든 레벨) */
  selectableLevels?: number[];

  /** 문제 수 표시 여부 */
  showCounts?: boolean;

  /** 검색 하이라이트 */
  highlightText?: string;

  /** 컴팩트 모드 */
  compact?: boolean;
}

export function ClassificationTree({
  data,
  selectedId,
  expandedIds = [],
  onSelect,
  onToggle,
  selectableLevels,
  showCounts = true,
  highlightText,
  compact = false,
}: ClassificationTreeProps) {
  const [localExpandedIds, setLocalExpandedIds] = useState<Set<number>>(
    new Set(expandedIds)
  );

  const isExpanded = useCallback((nodeId: number) => {
    return localExpandedIds.has(nodeId);
  }, [localExpandedIds]);

  const toggleExpand = useCallback((nodeId: number) => {
    setLocalExpandedIds(prev => {
      const next = new Set(prev);
      const wasExpanded = next.has(nodeId);
      if (wasExpanded) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      onToggle?.(nodeId, !wasExpanded);
      return next;
    });
  }, [onToggle]);

  const isSelectable = useCallback((level: number) => {
    if (!selectableLevels) return true;
    return selectableLevels.includes(level);
  }, [selectableLevels]);

  const renderNode = (node: ClassificationNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const expanded = isExpanded(node.id);
    const selected = selectedId === node.id;
    const selectable = isSelectable(node.level);

    return (
      <div key={node.id}>
        {/* 노드 행 */}
        <div
          className={cn(
            'flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer',
            'transition-colors duration-150',
            selected && 'bg-primary-100 text-primary-700',
            !selected && 'hover:bg-gray-100',
            !selectable && 'opacity-60 cursor-default',
            compact ? 'py-1.5 text-sm' : 'py-2'
          )}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(node.id);
            }
            if (selectable) {
              onSelect?.(node);
            }
          }}
        >
          {/* 확장 아이콘 */}
          {hasChildren ? (
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </motion.div>
          ) : (
            <div className="w-4 h-4" /> // 스페이서
          )}

          {/* 폴더/파일 아이콘 */}
          {hasChildren ? (
            <Folder className="w-4 h-4 text-primary-500" />
          ) : (
            <File className="w-4 h-4 text-gray-400" />
          )}

          {/* 노드 이름 */}
          <span className={cn(
            'flex-1 truncate',
            selected && 'font-medium'
          )}>
            {highlightText ? (
              <HighlightedText text={node.name} highlight={highlightText} />
            ) : (
              node.name
            )}
          </span>

          {/* 문제 수 */}
          {showCounts && node.problemCount > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {node.problemCount.toLocaleString()}
            </span>
          )}
        </div>

        {/* 자식 노드 */}
        <AnimatePresence>
          {expanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {node.children.map(child => renderNode(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="overflow-y-auto">
      {data.map(node => renderNode(node, 0))}
    </div>
  );
}

// 검색 하이라이트 헬퍼
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight) return <>{text}</>;

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => (
        <span
          key={i}
          className={
            part.toLowerCase() === highlight.toLowerCase()
              ? 'bg-yellow-200 font-medium'
              : ''
          }
        >
          {part}
        </span>
      ))}
    </>
  );
}
```

#### A-3-2: ClassificationPicker 컴포넌트

```tsx
// frontend/src/components/classification/ClassificationPicker.tsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronRight, Check } from 'lucide-react';
import { ClassificationNode, ClassificationPath } from '@/types/classification';
import { ClassificationTree } from './ClassificationTree';
import { useClassificationTree, useClassificationSearch } from '@/api/classification';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';

interface ClassificationPickerProps {
  /** 현재 선택된 분류 */
  value?: ClassificationPath | null;

  /** 선택 변경 콜백 */
  onChange: (classification: ClassificationPath) => void;

  /** 열림 상태 */
  open: boolean;

  /** 닫기 콜백 */
  onClose: () => void;

  /** 선택 가능한 최소 레벨 (기본: 5 = 유형까지) */
  minSelectLevel?: number;

  /** 타이틀 */
  title?: string;
}

export function ClassificationPicker({
  value,
  onChange,
  open,
  onClose,
  minSelectLevel = 4,  // 소단원 이상 선택 가능
  title = '분류 선택',
}: ClassificationPickerProps) {
  // 검색어
  const [searchQuery, setSearchQuery] = useState('');

  // 단계별 선택 상태
  const [selectedPath, setSelectedPath] = useState<number[]>(
    value ? buildPathFromClassification(value) : []
  );

  // 현재 보여줄 레벨
  const [currentLevel, setCurrentLevel] = useState(1);

  // 트리 데이터
  const { data: treeData } = useClassificationTree();

  // 검색 결과
  const { data: searchResults } = useClassificationSearch(searchQuery);

  // 현재 레벨의 노드들
  const currentNodes = useMemo(() => {
    if (!treeData) return [];

    let nodes = treeData;
    for (let i = 0; i < selectedPath.length; i++) {
      const selectedNode = nodes.find(n => n.id === selectedPath[i]);
      if (!selectedNode?.children) break;
      nodes = selectedNode.children;
    }
    return nodes;
  }, [treeData, selectedPath]);

  // 선택된 노드들의 이름 경로
  const selectedNames = useMemo(() => {
    if (!treeData) return [];

    const names: string[] = [];
    let nodes = treeData;

    for (const id of selectedPath) {
      const node = nodes.find(n => n.id === id);
      if (node) {
        names.push(node.name);
        nodes = node.children || [];
      }
    }
    return names;
  }, [treeData, selectedPath]);

  // 노드 선택
  const handleSelect = (node: ClassificationNode) => {
    const newPath = [...selectedPath.slice(0, currentLevel - 1), node.id];
    setSelectedPath(newPath);

    // 자식이 있으면 다음 레벨로
    if (node.children?.length) {
      setCurrentLevel(currentLevel + 1);
    }
  };

  // 레벨 클릭 (브레드크럼)
  const handleLevelClick = (level: number) => {
    setCurrentLevel(level);
    setSelectedPath(selectedPath.slice(0, level - 1));
  };

  // 선택 완료
  const handleConfirm = () => {
    if (selectedPath.length >= minSelectLevel) {
      const classification = buildClassificationFromPath(selectedPath, treeData!);
      onChange(classification);
      onClose();
    }
  };

  // 검색 결과 선택
  const handleSearchSelect = (result: any) => {
    const path = result.path;
    setSelectedPath(path);
    setSearchQuery('');
    setCurrentLevel(path.length + 1);
  };

  return (
    <BottomSheet open={open} onClose={onClose} height="85vh">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 검색바 */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="분류 검색..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm"
          />
        </div>

        {/* 브레드크럼 */}
        {selectedPath.length > 0 && !searchQuery && (
          <div className="mt-3 flex items-center gap-1 text-sm overflow-x-auto">
            <button
              onClick={() => handleLevelClick(1)}
              className="text-gray-500 hover:text-gray-700 whitespace-nowrap"
            >
              전체
            </button>
            {selectedNames.map((name, i) => (
              <React.Fragment key={i}>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <button
                  onClick={() => handleLevelClick(i + 2)}
                  className={cn(
                    'whitespace-nowrap',
                    i === selectedNames.length - 1
                      ? 'text-primary-600 font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 overflow-y-auto p-4">
        {searchQuery ? (
          // 검색 결과
          <div className="space-y-2">
            {searchResults?.map((result: any) => (
              <button
                key={result.node.id}
                onClick={() => handleSearchSelect(result)}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg"
              >
                <div className="font-medium">{result.node.name}</div>
                <div className="text-xs text-gray-500 mt-1">{result.path}</div>
              </button>
            ))}
            {searchResults?.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                검색 결과가 없습니다
              </div>
            )}
          </div>
        ) : (
          // 트리 네비게이션
          <div className="space-y-1">
            {currentNodes.map(node => (
              <button
                key={node.id}
                onClick={() => handleSelect(node)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-lg',
                  'transition-colors duration-150',
                  selectedPath.includes(node.id)
                    ? 'bg-primary-50 text-primary-700'
                    : 'hover:bg-gray-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">{node.code}</span>
                  <span>{node.name}</span>
                  {node.problemCount > 0 && (
                    <span className="text-xs text-gray-400">
                      ({node.problemCount})
                    </span>
                  )}
                </div>
                {node.children?.length ? (
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                ) : (
                  selectedPath.includes(node.id) && (
                    <Check className="w-5 h-5 text-primary-500" />
                  )
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 푸터 */}
      <div className="sticky bottom-0 bg-white border-t p-4">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedPath.length < minSelectLevel}
            className="flex-1"
          >
            선택 완료
          </Button>
        </div>
        {selectedPath.length < minSelectLevel && (
          <p className="text-xs text-gray-500 text-center mt-2">
            {['학년', '대단원', '중단원', '소단원', '유형'][minSelectLevel - 1]}까지 선택해주세요
          </p>
        )}
      </div>
    </BottomSheet>
  );
}

// 헬퍼 함수들
function buildPathFromClassification(classification: ClassificationPath): number[] {
  const path: number[] = [];
  if (classification.gradeId) path.push(classification.gradeId);
  if (classification.majorUnitId) path.push(classification.majorUnitId);
  if (classification.middleUnitId) path.push(classification.middleUnitId);
  if (classification.minorUnitId) path.push(classification.minorUnitId);
  if (classification.typeId) path.push(classification.typeId);
  return path;
}

function buildClassificationFromPath(
  path: number[],
  tree: ClassificationNode[]
): ClassificationPath {
  const result: ClassificationPath = {};
  let nodes = tree;

  for (let i = 0; i < path.length; i++) {
    const node = nodes.find(n => n.id === path[i]);
    if (!node) break;

    switch (i) {
      case 0:
        result.gradeId = node.id;
        result.gradeName = node.name;
        break;
      case 1:
        result.majorUnitId = node.id;
        break;
      case 2:
        result.middleUnitId = node.id;
        break;
      case 3:
        result.minorUnitId = node.id;
        break;
      case 4:
        result.typeId = node.id;
        break;
    }

    nodes = node.children || [];
  }

  // fullPath 생성
  result.fullPath = buildFullPathText(path, tree);

  return result;
}

function buildFullPathText(path: number[], tree: ClassificationNode[]): string {
  const names: string[] = [];
  let nodes = tree;

  for (const id of path) {
    const node = nodes.find(n => n.id === id);
    if (node) {
      names.push(node.name);
      nodes = node.children || [];
    }
  }

  return names.join(' > ');
}
```

---

## 4. Phase B: 문제은행 UI

### 4.1 Phase B-1: 메인 레이아웃 리디자인

#### 목표
토스 스타일의 직관적인 메인 레이아웃 구현

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| B-1-1 | AppShell 컴포넌트 | 전체 앱 레이아웃 | `AppShell.tsx` |
| B-1-2 | 사이드바 리디자인 | 네비게이션 + 분류 트리 | `Sidebar.tsx` |
| B-1-3 | 헤더 리디자인 | 검색 + 사용자 메뉴 | `Header.tsx` |
| B-1-4 | 라우터 구조 변경 | 새로운 페이지 구조 | `App.tsx` |
| B-1-5 | 테마/스타일 시스템 | CSS 변수, 유틸리티 | `theme.ts`, `globals.css` |

#### B-1-1: AppShell 컴포넌트

```tsx
// frontend/src/components/layout/AppShell.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(280);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <Header
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      {/* 메인 컨테이너 */}
      <div className="flex pt-16">  {/* 헤더 높이만큼 패딩 */}
        {/* 사이드바 */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: sidebarWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed left-0 top-16 bottom-0 bg-white border-r overflow-hidden z-40"
            >
              <Sidebar width={sidebarWidth} />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* 메인 컨텐츠 */}
        <main
          className={cn(
            'flex-1 transition-all duration-200',
            sidebarOpen ? `ml-[${sidebarWidth}px]` : 'ml-0'
          )}
          style={{ marginLeft: sidebarOpen ? sidebarWidth : 0 }}
        >
          <div className="p-6 max-w-7xl mx-auto">
            {children || <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}
```

#### B-1-2: 사이드바 리디자인

```tsx
// frontend/src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Database,
  Edit3,
  FileText,
  Settings,
  ChevronDown,
  Star,
  Clock,
  Tag,
  Search,
} from 'lucide-react';
import { ClassificationTree } from '@/components/classification/ClassificationTree';
import { useGrades } from '@/api/classification';
import { cn } from '@/lib/utils';

interface SidebarProps {
  width: number;
}

export function Sidebar({ width }: SidebarProps) {
  const location = useLocation();
  const [showTree, setShowTree] = useState(true);
  const { data: grades } = useGrades();

  const navItems = [
    { path: '/', icon: Home, label: '홈' },
    { path: '/problems', icon: Database, label: '문제은행' },
    { path: '/labeling', icon: Edit3, label: '라벨링' },
    { path: '/worksheets', icon: FileText, label: '시험지' },
    { path: '/settings', icon: Settings, label: '설정' },
  ];

  const quickLinks = [
    { path: '/problems?favorite=true', icon: Star, label: '즐겨찾기' },
    { path: '/problems?sort=recent', icon: Clock, label: '최근 추가' },
    { path: '/problems/tags', icon: Tag, label: '태그 관리' },
  ];

  const isProblemBank = location.pathname.startsWith('/problems');

  return (
    <div className="flex flex-col h-full" style={{ width }}>
      {/* 검색 */}
      <div className="p-4">
        <NavLink
          to="/search"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg',
            'bg-gray-100 text-gray-500 hover:bg-gray-200',
            'transition-colors duration-150'
          )}
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">검색...</span>
          <kbd className="ml-auto text-xs bg-white px-1.5 py-0.5 rounded border">
            ⌘K
          </kbd>
        </NavLink>
      </div>

      {/* 메인 네비게이션 */}
      <nav className="px-3">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1',
              'transition-colors duration-150',
              isActive
                ? 'bg-primary-50 text-primary-700 font-medium'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 구분선 */}
      <div className="mx-4 my-3 border-t" />

      {/* 빠른 링크 */}
      <div className="px-3">
        <div className="px-3 mb-2 text-xs font-medium text-gray-400 uppercase">
          빠른 접근
        </div>
        {quickLinks.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5',
              'transition-colors duration-150 text-sm',
              isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* 분류 트리 (문제은행 페이지에서만) */}
      {isProblemBank && (
        <>
          <div className="mx-4 my-3 border-t" />

          <div className="flex-1 overflow-hidden flex flex-col">
            <button
              onClick={() => setShowTree(!showTree)}
              className="flex items-center justify-between px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <span>분류</span>
              <motion.div animate={{ rotate: showTree ? 180 : 0 }}>
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            {showTree && grades && (
              <div className="flex-1 overflow-y-auto px-2">
                <ClassificationTree
                  data={grades}
                  compact
                  showCounts
                  onSelect={(node) => {
                    // 분류 선택 시 필터 적용
                    window.location.href = `/problems?classification=${node.id}`;
                  }}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

---

### 4.2 Phase B-2: 문제 카드 컴포넌트

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| B-2-1 | ProblemCard 리디자인 | 토스 스타일 카드 | `ProblemCard.tsx` |
| B-2-2 | ProblemGrid 컴포넌트 | 그리드/리스트 뷰 | `ProblemGrid.tsx` |
| B-2-3 | ProblemDetail 모달 | 상세 보기 | `ProblemDetail.tsx` |
| B-2-4 | 가상화 스크롤 | 대량 데이터 최적화 | `useVirtualScroll.ts` |

#### B-2-1: ProblemCard 리디자인

```tsx
// frontend/src/components/problem/ProblemCard.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Star,
  MoreHorizontal,
  Check,
  BookOpen,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { Problem } from '@/types/problem';
import { LazyImage } from '@/components/ui/LazyImage';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface ProblemCardProps {
  problem: Problem;
  view?: 'grid' | 'list';
  selected?: boolean;
  onSelect?: () => void;
  onFavorite?: () => void;
  onAddToWorksheet?: () => void;
  onViewDetail?: () => void;
}

export function ProblemCard({
  problem,
  view = 'grid',
  selected,
  onSelect,
  onFavorite,
  onAddToWorksheet,
  onViewDetail,
}: ProblemCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // 난이도 색상
  const difficultyColor = getDifficultyColor(problem.difficulty);

  // 문제 유형 라벨
  const questionTypeLabel = {
    multiple_choice: '객관식',
    short_answer: '주관식',
    essay: '서술형',
  }[problem.questionType];

  if (view === 'list') {
    return <ProblemCardList problem={problem} {...{ selected, onSelect, onFavorite, onAddToWorksheet, onViewDetail }} />;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      className={cn(
        'relative bg-white rounded-xl border overflow-hidden',
        'transition-shadow duration-200',
        selected ? 'ring-2 ring-primary-500 border-primary-500' : 'border-gray-200',
        isHovered && 'shadow-lg'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onViewDetail}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {/* 문제 번호 */}
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-semibold text-gray-700">
            {problem.source.problemNumber || '#'}
          </div>

          {/* 배지들 */}
          <Badge variant="outline" size="sm">{questionTypeLabel}</Badge>
          {problem.content.answer && (
            <Badge variant="success" size="sm">정답O</Badge>
          )}
          {problem.content.solution && (
            <Badge variant="info" size="sm">해설O</Badge>
          )}
        </div>

        {/* 난이도 */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: difficultyColor }}
          />
          <span className="text-sm text-gray-500">
            {getDifficultyLabel(problem.difficulty)} {problem.difficulty}
          </span>
        </div>
      </div>

      {/* 이미지 */}
      <div className="relative aspect-[4/3] bg-gray-50">
        <LazyImage
          src={problem.content.thumbnailUrl}
          alt="문제 이미지"
          className="w-full h-full object-contain"
        />

        {/* 호버 오버레이 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onAddToWorksheet?.();
            }}
            className="p-2 bg-white rounded-full shadow-lg"
          >
            <Plus className="w-5 h-5 text-primary-600" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              onFavorite?.();
            }}
            className="p-2 bg-white rounded-full shadow-lg"
          >
            <Star
              className={cn(
                'w-5 h-5',
                problem.isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'
              )}
            />
          </motion.button>
        </motion.div>

        {/* 선택 체크박스 */}
        {onSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={cn(
              'absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center',
              'transition-colors duration-150',
              selected
                ? 'bg-primary-500 border-primary-500'
                : 'bg-white/80 border-gray-300 hover:border-primary-400'
            )}
          >
            {selected && <Check className="w-4 h-4 text-white" />}
          </button>
        )}
      </div>

      {/* 분류 정보 */}
      {problem.classification?.fullPath && (
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-xs text-gray-500 truncate" title={problem.classification.fullPath}>
            📍 {problem.classification.fullPath}
          </p>
        </div>
      )}

      {/* 출처 */}
      <div className="px-3 py-2">
        <p className="text-xs text-gray-500 truncate">
          📚 {problem.source.name}
          {problem.source.page && ` p.${problem.source.page}`}
        </p>
      </div>

      {/* 태그 */}
      {problem.tags.length > 0 && (
        <div className="px-3 pb-3">
          <div className="flex flex-wrap gap-1">
            {problem.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
            {problem.tags.length > 3 && (
              <span className="text-xs text-gray-400">
                +{problem.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// 헬퍼 함수들
function getDifficultyColor(difficulty: number): string {
  if (difficulty <= 2) return '#4CAF50';  // 쉬움
  if (difficulty <= 4) return '#8BC34A';  // 약간 쉬움
  if (difficulty <= 6) return '#FF9800';  // 보통
  if (difficulty <= 8) return '#F44336';  // 어려움
  return '#9C27B0';                        // 매우 어려움
}

function getDifficultyLabel(difficulty: number): string {
  if (difficulty <= 2) return '쉬움';
  if (difficulty <= 4) return '보통↓';
  if (difficulty <= 6) return '보통';
  if (difficulty <= 8) return '어려움';
  return '킬러';
}

// 리스트 뷰용 컴포넌트
function ProblemCardList({ problem, ...props }: ProblemCardProps) {
  // 리스트 형태의 카드 구현
  // ... (생략)
}
```

---

### 4.3 Phase B-3: 분류 트리 네비게이션

> Phase A-3에서 구현한 컴포넌트 활용

---

### 4.4 Phase B-4: 필터 시스템

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| B-4-1 | FilterBar 컴포넌트 | 상단 필터 바 | `FilterBar.tsx` |
| B-4-2 | FilterBottomSheet 컴포넌트 | 전체 필터 바텀시트 | `FilterBottomSheet.tsx` |
| B-4-3 | FilterChip 컴포넌트 | 개별 필터 칩 | `FilterChip.tsx` |
| B-4-4 | useFilters 훅 | 필터 상태 관리 | `useFilters.ts` |

#### B-4-1: FilterBar 컴포넌트

```tsx
// frontend/src/components/problem/FilterBar.tsx
import React from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { FilterChip } from './FilterChip';
import { ProblemFilter } from '@/types/problem';
import { Button } from '@/components/ui/Button';

interface FilterBarProps {
  filters: ProblemFilter;
  onFilterChange: (filters: ProblemFilter) => void;
  onOpenFullFilter: () => void;
  totalCount: number;
}

export function FilterBar({
  filters,
  onFilterChange,
  onOpenFullFilter,
  totalCount,
}: FilterBarProps) {
  // 활성 필터 목록 생성
  const activeFilters = getActiveFilters(filters);

  const removeFilter = (key: keyof ProblemFilter) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFilterChange(newFilters);
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  return (
    <div className="bg-white border-b sticky top-16 z-30">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 필터 버튼 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenFullFilter}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          필터
          {activeFilters.length > 0 && (
            <span className="bg-primary-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </Button>

        {/* 활성 필터 칩들 */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {activeFilters.map(filter => (
            <FilterChip
              key={filter.key}
              label={filter.label}
              value={filter.value}
              onRemove={() => removeFilter(filter.key as keyof ProblemFilter)}
            />
          ))}
        </div>

        {/* 결과 수 & 초기화 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-gray-500">
            {totalCount.toLocaleString()}개
          </span>
          {activeFilters.length > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 빠른 필터 (학년) */}
      <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {['중1', '중2', '중3', '고1', '고2', '고3'].map(grade => (
          <button
            key={grade}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full whitespace-nowrap',
              'transition-colors duration-150',
              filters.gradeIds?.includes(gradeToId(grade))
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            onClick={() => toggleGrade(grade, filters, onFilterChange)}
          >
            {grade}
          </button>
        ))}

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* 난이도 빠른 필터 */}
        {['쉬움', '보통', '어려움'].map(level => (
          <button
            key={level}
            className={cn(
              'px-3 py-1.5 text-sm rounded-full whitespace-nowrap',
              'transition-colors duration-150',
              isDifficultyActive(level, filters)
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            onClick={() => toggleDifficulty(level, filters, onFilterChange)}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}

// 헬퍼 함수들 (생략)
```

#### B-4-2: FilterBottomSheet 컴포넌트

```tsx
// frontend/src/components/problem/FilterBottomSheet.tsx
import React, { useState, useEffect } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ProblemFilter } from '@/types/problem';

interface FilterBottomSheetProps {
  open: boolean;
  onClose: () => void;
  filters: ProblemFilter;
  onApply: (filters: ProblemFilter) => void;
}

export function FilterBottomSheet({
  open,
  onClose,
  filters,
  onApply,
}: FilterBottomSheetProps) {
  // 임시 필터 상태 (적용 전)
  const [tempFilters, setTempFilters] = useState<ProblemFilter>(filters);

  // 필터가 열릴 때 현재 값으로 초기화
  useEffect(() => {
    if (open) {
      setTempFilters(filters);
    }
  }, [open, filters]);

  const handleApply = () => {
    onApply(tempFilters);
    onClose();
  };

  const handleReset = () => {
    setTempFilters({});
  };

  // 필터 변경 결과 미리보기 개수 (API 호출)
  const previewCount = useFilterPreviewCount(tempFilters);

  return (
    <BottomSheet open={open} onClose={onClose} height="85vh">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white z-10 px-4 py-3 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">필터</h2>
        <button onClick={handleReset} className="text-sm text-primary-600">
          초기화
        </button>
      </div>

      {/* 필터 섹션들 */}
      <div className="p-4 space-y-6">
        {/* 학년 */}
        <FilterSection title="학년">
          <div className="flex flex-wrap gap-2">
            {GRADES.map(grade => (
              <ToggleButton
                key={grade.id}
                label={grade.name}
                active={tempFilters.gradeIds?.includes(grade.id)}
                onClick={() => toggleArrayFilter('gradeIds', grade.id, tempFilters, setTempFilters)}
              />
            ))}
          </div>
        </FilterSection>

        {/* 난이도 */}
        <FilterSection title="난이도">
          <div className="space-y-3">
            <RangeSlider
              min={1}
              max={10}
              value={[tempFilters.difficultyMin || 1, tempFilters.difficultyMax || 10]}
              onChange={([min, max]) => {
                setTempFilters({
                  ...tempFilters,
                  difficultyMin: min,
                  difficultyMax: max,
                });
              }}
              labels={['쉬움', '', '', '', '보통', '', '', '', '', '킬러']}
            />
          </div>
        </FilterSection>

        {/* 문제 유형 */}
        <FilterSection title="문제 유형">
          <div className="flex gap-2">
            {QUESTION_TYPES.map(type => (
              <ToggleButton
                key={type.value}
                label={type.label}
                active={tempFilters.questionTypes?.includes(type.value)}
                onClick={() => toggleArrayFilter('questionTypes', type.value, tempFilters, setTempFilters)}
              />
            ))}
          </div>
        </FilterSection>

        {/* 출처 */}
        <FilterSection title="출처">
          <div className="flex flex-wrap gap-2">
            {SOURCE_TYPES.map(type => (
              <ToggleButton
                key={type.value}
                label={type.label}
                active={tempFilters.sourceTypes?.includes(type.value)}
                onClick={() => toggleArrayFilter('sourceTypes', type.value, tempFilters, setTempFilters)}
              />
            ))}
          </div>

          {/* 연도 (출처가 exam일 때) */}
          {tempFilters.sourceTypes?.includes('exam') && (
            <div className="mt-3">
              <label className="text-sm text-gray-500">연도</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {YEARS.map(year => (
                  <ToggleButton
                    key={year}
                    label={year.toString()}
                    active={tempFilters.years?.includes(year)}
                    onClick={() => toggleArrayFilter('years', year, tempFilters, setTempFilters)}
                  />
                ))}
              </div>
            </div>
          )}
        </FilterSection>

        {/* 기타 */}
        <FilterSection title="기타">
          <div className="space-y-3">
            <ToggleSwitch
              label="정답 있는 문제만"
              checked={tempFilters.hasAnswer === true}
              onChange={(checked) => {
                setTempFilters({
                  ...tempFilters,
                  hasAnswer: checked || undefined,
                });
              }}
            />
            <ToggleSwitch
              label="해설 있는 문제만"
              checked={tempFilters.hasSolution === true}
              onChange={(checked) => {
                setTempFilters({
                  ...tempFilters,
                  hasSolution: checked || undefined,
                });
              }}
            />
            <ToggleSwitch
              label="즐겨찾기만"
              checked={tempFilters.isFavorite === true}
              onChange={(checked) => {
                setTempFilters({
                  ...tempFilters,
                  isFavorite: checked || undefined,
                });
              }}
            />
          </div>
        </FilterSection>
      </div>

      {/* 푸터 */}
      <div className="sticky bottom-0 bg-white border-t p-4">
        <Button onClick={handleApply} className="w-full">
          필터 적용 ({previewCount.toLocaleString()}개)
        </Button>
      </div>
    </BottomSheet>
  );
}

// 서브 컴포넌트들 (생략)
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-medium mb-3">{title}</h3>
      {children}
    </div>
  );
}
```

---

### 4.5 Phase B-5: 검색 기능

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| B-5-1 | SearchBar 컴포넌트 | 전역 검색바 | `SearchBar.tsx` |
| B-5-2 | SearchModal 컴포넌트 | 검색 모달 (⌘K) | `SearchModal.tsx` |
| B-5-3 | 백엔드 검색 API | 전문 검색 구현 | `search_service.py` |
| B-5-4 | 검색 결과 페이지 | 검색 결과 표시 | `SearchResultsPage.tsx` |

---

## 5. Phase C: 라벨링 + 분류 통합

### 5.1 Phase C-1: 분류 선택 통합

#### 목표
라벨링 워크플로우에 분류 선택 단계 추가

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| C-1-1 | 그룹 저장 플로우 수정 | 분류 선택 단계 추가 | `GroupPanel.tsx` 수정 |
| C-1-2 | 분류 선택 통합 | ClassificationPicker 연동 | |
| C-1-3 | 문제 생성 API 수정 | 분류 정보 포함 | `problems.py` 수정 |

#### C-1-1: 그룹 저장 플로우

```tsx
// 그룹 저장 시 분류 선택 플로우

// 1. 기존: 그룹 선택 → 저장
// 2. 신규: 그룹 선택 → 분류 선택 → 저장

// GroupPanel.tsx에 추가
const handleSaveGroup = async () => {
  // 분류 선택 모달 열기
  setShowClassificationPicker(true);
};

const handleClassificationConfirm = async (classification: ClassificationPath) => {
  setShowClassificationPicker(false);

  // 문제 생성 API 호출
  await createProblem({
    groupId: selectedGroup.id,
    classification,
    // ... 기타 정보
  });

  toast.success('문제가 저장되었습니다');
};
```

---

### 5.2 Phase C-2: 태그 시스템

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| C-2-1 | TagInput 컴포넌트 | 태그 입력/자동완성 | `TagInput.tsx` |
| C-2-2 | 태그 관리 API | CRUD, 자동완성 | `routers/tags.py` |
| C-2-3 | 태그 관리 페이지 | 태그 목록/편집 | `TagsPage.tsx` |

---

### 5.3 Phase C-3: 난이도 설정

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| C-3-1 | DifficultyPicker 컴포넌트 | 1-10 난이도 선택 | `DifficultyPicker.tsx` |
| C-3-2 | 라벨링 UI 통합 | 난이도 입력 추가 | |

---

### 5.4 Phase C-4: 자동 분류 제안

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| C-4-1 | 키워드 매핑 데이터 | 키워드 → 분류 매핑 | `keywords.json` |
| C-4-2 | AutoClassifier 서비스 | 규칙 기반 분류 제안 | `auto_classifier.py` |
| C-4-3 | 제안 UI | 분류 선택 시 제안 표시 | |

#### C-4-2: AutoClassifier 서비스

```python
# backend/app/services/classification/auto_classifier.py
from typing import List, Optional
from ..models.classification import ClassificationPath, ClassificationSuggestion
import json
import re

class AutoClassifier:
    """규칙 기반 자동 분류 제안 서비스"""

    def __init__(self):
        self.keyword_map = self._load_keyword_map()
        self.equation_patterns = self._load_equation_patterns()

    def _load_keyword_map(self) -> dict:
        """키워드 → 분류 매핑 로드"""
        with open('app/data/classification/keywords.json', 'r', encoding='utf-8') as f:
            return json.load(f)

    def _load_equation_patterns(self) -> list:
        """수식 패턴 로드"""
        return [
            # (패턴, 분류 경로, 점수)
            (r'x\^2\s*[\+\-]', 'majorUnit:이차방정식', 0.8),
            (r'\\sqrt', 'majorUnit:제곱근', 0.7),
            (r'\\frac', 'majorUnit:분수', 0.5),
            (r'\\sin|\\cos|\\tan', 'majorUnit:삼각함수', 0.9),
            (r'\\lim', 'majorUnit:극한', 0.9),
            (r"\\frac{d}{dx}|f'\\(x\\)", 'majorUnit:미분', 0.9),
            (r'\\int', 'majorUnit:적분', 0.9),
            (r'\\sum', 'majorUnit:수열', 0.7),
            (r'\\binom|C_|P_', 'majorUnit:확률', 0.8),
        ]

    def suggest(
        self,
        text: Optional[str] = None,
        latex: Optional[str] = None,
        source_name: Optional[str] = None,
        limit: int = 5
    ) -> List[ClassificationSuggestion]:
        """
        분류 제안 생성

        Args:
            text: OCR 추출 텍스트
            latex: LaTeX 수식
            source_name: 출처 이름 (예: "2020 교육청 고1")
            limit: 최대 제안 수

        Returns:
            분류 제안 목록 (점수 내림차순)
        """
        suggestions = []

        # 1. 출처 기반 추론
        if source_name:
            grade_suggestion = self._infer_from_source(source_name)
            if grade_suggestion:
                suggestions.append(grade_suggestion)

        # 2. 키워드 기반 추론
        if text:
            keyword_suggestions = self._infer_from_keywords(text)
            suggestions.extend(keyword_suggestions)

        # 3. 수식 패턴 기반 추론
        if latex:
            equation_suggestions = self._infer_from_equations(latex)
            suggestions.extend(equation_suggestions)

        # 중복 제거 및 점수 합산
        merged = self._merge_suggestions(suggestions)

        # 점수 내림차순 정렬
        merged.sort(key=lambda x: x.score, reverse=True)

        return merged[:limit]

    def _infer_from_source(self, source_name: str) -> Optional[ClassificationSuggestion]:
        """출처에서 학년 추론"""
        patterns = [
            (r'고1|공통수학', 'grade:07', '공통수학1'),
            (r'고2|미적분', 'grade:11', '미적분'),
            (r'고2|확통|확률과\s*통계', 'grade:12', '확률과통계'),
            (r'고3|기하', 'grade:13', '기하'),
            (r'중1', 'grade:01', '중1-1'),
            (r'중2', 'grade:03', '중2-1'),
            (r'중3', 'grade:05', '중3-1'),
        ]

        for pattern, grade_code, grade_name in patterns:
            if re.search(pattern, source_name, re.IGNORECASE):
                return ClassificationSuggestion(
                    classification=ClassificationPath(
                        gradeId=int(grade_code.split(':')[1]),
                        gradeName=grade_name
                    ),
                    score=0.6,
                    reason=f"출처 '{source_name}'에서 학년 추론"
                )

        return None

    def _infer_from_keywords(self, text: str) -> List[ClassificationSuggestion]:
        """키워드에서 분류 추론"""
        suggestions = []

        for keyword, mapping in self.keyword_map.items():
            if keyword in text:
                suggestions.append(ClassificationSuggestion(
                    classification=ClassificationPath(**mapping['classification']),
                    score=mapping.get('score', 0.5),
                    reason=f"키워드 '{keyword}' 감지"
                ))

        return suggestions

    def _infer_from_equations(self, latex: str) -> List[ClassificationSuggestion]:
        """수식 패턴에서 분류 추론"""
        suggestions = []

        for pattern, classification_key, score in self.equation_patterns:
            if re.search(pattern, latex):
                level, name = classification_key.split(':')
                suggestions.append(ClassificationSuggestion(
                    classification=ClassificationPath(**{f'{level}Name': name}),
                    score=score,
                    reason=f"수식 패턴 감지: {name}"
                ))

        return suggestions

    def _merge_suggestions(
        self,
        suggestions: List[ClassificationSuggestion]
    ) -> List[ClassificationSuggestion]:
        """중복 제안 병합 및 점수 합산"""
        merged = {}

        for suggestion in suggestions:
            key = self._get_suggestion_key(suggestion)
            if key in merged:
                merged[key].score = min(1.0, merged[key].score + suggestion.score * 0.5)
                merged[key].reason += f"; {suggestion.reason}"
            else:
                merged[key] = suggestion

        return list(merged.values())

    def _get_suggestion_key(self, suggestion: ClassificationSuggestion) -> str:
        """제안의 고유 키 생성"""
        c = suggestion.classification
        return f"{c.gradeId}-{c.majorUnitId}-{c.middleUnitId}-{c.minorUnitId}-{c.typeId}"
```

---

## 6. Phase D: 시험지 빌더

### 6.1 Phase D-1: 시험지 빌더 UI

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| D-1-1 | WorksheetBuilder 컴포넌트 | 메인 빌더 UI | `WorksheetBuilder.tsx` |
| D-1-2 | WorksheetPreview 컴포넌트 | 실시간 미리보기 | `WorksheetPreview.tsx` |
| D-1-3 | Worksheet 모델 및 API | 시험지 CRUD | `routers/worksheets.py` |

---

### 6.2 Phase D-2: 드래그&드롭 편집

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| D-2-1 | DndContext 설정 | 드래그&드롭 컨텍스트 | |
| D-2-2 | ProblemDragItem 컴포넌트 | 드래그 가능 문제 | `ProblemDragItem.tsx` |
| D-2-3 | WorksheetDropZone 컴포넌트 | 드롭 영역 | `WorksheetDropZone.tsx` |

---

### 6.3 Phase D-3: PDF 내보내기

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| D-3-1 | PDF 생성 서비스 | 시험지 PDF 생성 | `pdf_exporter.py` |
| D-3-2 | 레이아웃 옵션 | 1단/2단, A4/B4 | |
| D-3-3 | 내보내기 API | PDF 다운로드 엔드포인트 | |

---

### 6.4 Phase D-4: 정답지/해설지 생성

#### 작업 목록

| 순서 | 태스크 | 상세 내용 | 산출물 |
|------|--------|----------|--------|
| D-4-1 | 정답지 생성 | 정답만 포함된 PDF | |
| D-4-2 | 해설지 생성 | 해설 포함 PDF | |
| D-4-3 | 내보내기 옵션 UI | 내보내기 설정 모달 | |

---

## 7. Phase E: 고급 기능

### 7.1 Phase E-1: ML 기반 자동 분류

> 충분한 학습 데이터 축적 후 진행

#### 작업 목록

| 순서 | 태스크 | 상세 내용 |
|------|--------|----------|
| E-1-1 | 학습 데이터 수집 파이프라인 | 사용자 분류 데이터 수집 |
| E-1-2 | 분류 모델 학습 | KoBERT + 수식 임베딩 |
| E-1-3 | 추론 서비스 | 실시간 분류 제안 |

---

### 7.2 Phase E-2: 유사 문제 추천

#### 작업 목록

| 순서 | 태스크 | 상세 내용 |
|------|--------|----------|
| E-2-1 | 문제 임베딩 생성 | 문제별 벡터 표현 |
| E-2-2 | 유사도 검색 | 벡터 기반 유사 문제 검색 |
| E-2-3 | 추천 UI | 유사 문제 표시 |

---

### 7.3 Phase E-3: 통계 대시보드

#### 작업 목록

| 순서 | 태스크 | 상세 내용 |
|------|--------|----------|
| E-3-1 | 통계 API | 분류별, 기간별 통계 |
| E-3-2 | 대시보드 UI | 차트, 그래프 |
| E-3-3 | 내보내기 | 통계 데이터 내보내기 |

---

## 8. 공통 인프라

### 8.1 새로 추가할 UI 컴포넌트

| 컴포넌트 | 용도 | 참조 |
|----------|------|------|
| `BottomSheet` | 모바일 친화적 모달 | Radix UI |
| `SearchBar` | 전역 검색 | 토스 스타일 |
| `FilterChip` | 필터 표시/제거 | Material |
| `Skeleton` | 로딩 상태 | 토스 스타일 |
| `RangeSlider` | 범위 선택 | Radix UI |
| `ToggleSwitch` | On/Off 토글 | |
| `Toast` | 알림 메시지 | 이미 있음 |
| `VirtualList` | 가상화 리스트 | react-virtual |

### 8.2 새로 추가할 훅

| 훅 | 용도 |
|----|------|
| `useDebounce` | 검색 입력 디바운스 |
| `useInfiniteScroll` | 무한 스크롤 |
| `useLocalStorage` | 로컬 저장소 |
| `useMediaQuery` | 반응형 감지 |
| `useKeyboardShortcut` | 키보드 단축키 (이미 있음) |

### 8.3 의존성 추가

```json
// frontend/package.json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slider": "^1.0.0",
    "@radix-ui/react-switch": "^1.0.0",
    "@tanstack/react-virtual": "^3.0.0",
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^7.0.0",
    "fuse.js": "^7.0.0",
    "react-hot-toast": "^2.4.0"
  }
}
```

---

## 9. 마이그레이션 전략

### 9.1 데이터 마이그레이션

```
Phase 1: 병렬 운영
├── 기존 시스템 유지
├── 새 Problem 테이블 생성
└── 새로 라벨링하는 문제는 새 시스템에 저장

Phase 2: 기존 데이터 변환
├── ProblemGroup → Problem 변환 스크립트
├── 분류 미지정 상태로 마이그레이션
└── 점진적 분류 작업

Phase 3: 전환 완료
├── 기존 시스템 읽기 전용
├── 모든 기능 새 시스템으로
└── 기존 데이터 아카이브
```

### 9.2 마이그레이션 스크립트

```python
# scripts/migrate_problems.py
"""기존 ProblemGroup을 새 Problem 모델로 마이그레이션"""

import json
from pathlib import Path
from uuid import uuid4
from datetime import datetime

def migrate_document(document_path: Path):
    """문서 하나 마이그레이션"""
    groups_dir = document_path / 'groups'
    problems_dir = document_path / 'problems'

    # 그룹 데이터 로드
    for group_file in groups_dir.glob('page_*_groups.json'):
        with open(group_file, 'r', encoding='utf-8') as f:
            group_data = json.load(f)

        for group in group_data.get('groups', []):
            # Problem 생성
            problem = {
                'id': str(uuid4()),
                'classification': None,  # 나중에 분류
                'questionType': 'short_answer',
                'difficulty': 5,
                'content': {
                    'imageUrl': group.get('crop_image_path', ''),
                    'thumbnailUrl': '',  # 썸네일 생성 필요
                },
                'source': {
                    'type': 'book',
                    'name': group_data.get('document_id', ''),
                    'page': group_data.get('page_index', 0) + 1,
                    'problemNumber': group.get('id', ''),
                    'documentId': group_data.get('document_id'),
                    'groupId': group.get('id'),
                },
                'tags': [],
                'createdAt': datetime.now().isoformat(),
                'updatedAt': datetime.now().isoformat(),
                'createdBy': 'migration',
                'usageCount': 0,
                'isFavorite': False,
            }

            # 저장
            save_problem(problem)

def save_problem(problem: dict):
    """Problem을 새 저장소에 저장"""
    problem_dir = PROBLEMS_ROOT / problem['id']
    problem_dir.mkdir(parents=True, exist_ok=True)

    # 메타데이터 저장
    with open(problem_dir / 'problem.json', 'w', encoding='utf-8') as f:
        json.dump(problem, f, ensure_ascii=False, indent=2)

    # 이미지 복사 (생략)
    # 썸네일 생성 (생략)
```

---

## 10. 테스트 전략

### 10.1 테스트 범위

| 레벨 | 대상 | 도구 |
|------|------|------|
| Unit | 서비스 로직, 유틸리티 | pytest, vitest |
| Integration | API 엔드포인트 | pytest + httpx |
| Component | React 컴포넌트 | vitest + Testing Library |
| E2E | 주요 사용자 플로우 | Playwright |

### 10.2 주요 테스트 케이스

```
분류 시스템:
├── 트리 조회 API 테스트
├── 검색 API 테스트
├── 분류 선택 컴포넌트 테스트
└── 자동 분류 제안 테스트

문제 관리:
├── 문제 CRUD API 테스트
├── 필터링/검색 테스트
├── 문제 카드 컴포넌트 테스트
└── 무한 스크롤 테스트

시험지 빌더:
├── 시험지 생성 API 테스트
├── 드래그&드롭 테스트
├── PDF 생성 테스트
└── 내보내기 플로우 테스트
```

---

## 부록: 우선순위 요약

### Must Have (Phase A + B 핵심)
1. 분류 체계 DB 구축 (A-1)
2. Problem 데이터 모델 (A-2)
3. 분류 선택 컴포넌트 (A-3)
4. 문제 카드 UI (B-2)
5. 기본 필터링 (B-4)

### Should Have (Phase B 나머지 + C)
6. 메인 레이아웃 리디자인 (B-1)
7. 분류 트리 네비게이션 (B-3)
8. 검색 기능 (B-5)
9. 라벨링 + 분류 통합 (C-1)
10. 태그 시스템 (C-2)

### Could Have (Phase D)
11. 시험지 빌더 (D-1, D-2)
12. PDF 내보내기 (D-3)
13. 정답지 생성 (D-4)

### Won't Have Now (Phase E)
14. ML 자동 분류
15. 유사 문제 추천
16. 통계 대시보드

---

**작성**: Claude Code (Opus ThinkHarder)
**버전**: 1.0
**최종 수정**: 2025-11-30
