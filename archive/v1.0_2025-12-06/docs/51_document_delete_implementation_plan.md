# 문서 삭제 기능 상세 개발 계획

**작성일**: 2025-12-02
**Phase**: 21.7 (문서 삭제 UX)
**기반 문서**: [50_document_delete_ux_research.md](50_document_delete_ux_research.md)

---

## 목차

1. [현재 상태 분석](#1-현재-상태-분석)
2. [구현 단계 개요](#2-구현-단계-개요)
3. [Step 1: 더보기 메뉴 컴포넌트](#step-1-더보기-메뉴-컴포넌트)
4. [Step 2: 삭제 확인 모달](#step-2-삭제-확인-모달)
5. [Step 3: 토스트 알림 시스템](#step-3-토스트-알림-시스템)
6. [Step 4: RegistrationPage 통합](#step-4-registrationpage-통합)
7. [Step 5: 테스트 및 검증](#step-5-테스트-및-검증)
8. [코드 변경 상세](#코드-변경-상세)

---

## 1. 현재 상태 분석

### 1.1 기존 인프라 (이미 구현됨)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        기존 인프라 현황                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ✅ Backend API                                                         │
│  └── DELETE /api/pdf/documents/{document_id}                           │
│      └── backend/app/routers/pdf.py:231-254                            │
│                                                                         │
│  ✅ API Client                                                          │
│  └── api.deleteDocument(documentId)                                    │
│      └── frontend/src/api/client.ts:197-201                            │
│                                                                         │
│  ✅ React Query Hook                                                    │
│  └── useDeleteDocument()                                               │
│      └── frontend/src/hooks/useDocuments.ts:38-49                      │
│                                                                         │
│  ❌ UI 컴포넌트 (미구현)                                                │
│  └── DocumentCard에 삭제 버튼 없음                                     │
│  └── 확인 모달 없음                                                    │
│  └── 토스트 피드백 없음                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 현재 DocumentCard 구조

```typescript
// frontend/src/pages/RegistrationPage.tsx:73-148

interface DocumentCardProps {
  document: DocumentItem;
  onContinue: (id: string) => void;  // ← 삭제 콜백 없음
}

function DocumentCard({ document, onContinue }: DocumentCardProps) {
  // 현재 구조:
  // [아이콘] [문서이름 + 상태] [시작하기 버튼]
  //
  // 필요한 구조:
  // [아이콘] [문서이름 + 상태] [더보기 ⋮] [시작하기 버튼]
}
```

---

## 2. 구현 단계 개요

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        구현 단계 다이어그램                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1: 더보기 메뉴 컴포넌트 (15분)                                    │
│  ════════════════════════════════════                                   │
│  ├── DocumentMenu.tsx 생성                                             │
│  ├── HeadlessUI Menu 사용                                              │
│  └── 삭제 옵션 포함                                                    │
│           │                                                             │
│           ▼                                                             │
│  Step 2: 삭제 확인 모달 (20분)                                         │
│  ════════════════════════════════════                                   │
│  ├── DeleteConfirmModal.tsx 생성                                       │
│  ├── HeadlessUI Dialog 사용                                            │
│  └── 토스 스타일 경고 UI                                               │
│           │                                                             │
│           ▼                                                             │
│  Step 3: 토스트 알림 시스템 (10분)                                     │
│  ════════════════════════════════════                                   │
│  ├── react-hot-toast 설치 (또는 기존 확인)                             │
│  └── 성공/실패 피드백                                                  │
│           │                                                             │
│           ▼                                                             │
│  Step 4: RegistrationPage 통합 (15분)                                  │
│  ════════════════════════════════════                                   │
│  ├── DocumentCard에 메뉴 추가                                          │
│  ├── 삭제 상태 관리                                                    │
│  └── useDeleteDocument 연결                                            │
│           │                                                             │
│           ▼                                                             │
│  Step 5: 테스트 및 검증 (10분)                                         │
│  ════════════════════════════════════                                   │
│  ├── 삭제 동작 확인                                                    │
│  ├── 목록 갱신 확인                                                    │
│  └── 에러 처리 확인                                                    │
│                                                                         │
│  총 예상 시간: 70분 (약 1시간 10분)                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: 더보기 메뉴 컴포넌트

### 1.1 파일 생성

**새 파일**: `frontend/src/components/DocumentMenu.tsx`

### 1.2 컴포넌트 설계

```typescript
/**
 * DocumentMenu Component
 * Phase 21.7: 문서 더보기 메뉴
 *
 * 토스 스타일 - 깔끔한 드롭다운 메뉴
 */
import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { MoreVertical, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentMenuProps {
  documentId: string;
  documentName: string;
  onDelete: () => void;
  onSettings?: () => void;
}

export function DocumentMenu({
  documentId,
  documentName,
  onDelete,
  onSettings
}: DocumentMenuProps) {
  return (
    <Menu as="div" className="relative">
      {/* 메뉴 버튼 */}
      <Menu.Button
        className={cn(
          'p-2 rounded-lg transition-colors',
          'text-grey-400 hover:text-grey-600 hover:bg-grey-100',
          'focus:outline-none focus:ring-2 focus:ring-toss-blue focus:ring-offset-2'
        )}
        onClick={(e) => e.stopPropagation()} // 카드 클릭 방지
      >
        <MoreVertical className="w-5 h-5" />
      </Menu.Button>

      {/* 드롭다운 메뉴 */}
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items
          className={cn(
            'absolute right-0 z-10 mt-1 w-48',
            'bg-white rounded-xl shadow-lg',
            'border border-grey-100',
            'focus:outline-none',
            'overflow-hidden'
          )}
        >
          {/* 문서 설정 (선택적) */}
          {onSettings && (
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSettings();
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 text-sm text-grey-700',
                    active && 'bg-grey-50'
                  )}
                >
                  <Settings className="w-4 h-4" />
                  문서 설정
                </button>
              )}
            </Menu.Item>
          )}

          {/* 구분선 */}
          {onSettings && <div className="border-t border-grey-100" />}

          {/* 삭제 */}
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 text-sm',
                  'text-error',
                  active && 'bg-red-50'
                )}
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
```

### 1.3 스타일 요구사항

| 요소 | 스타일 |
|------|--------|
| 메뉴 버튼 | `text-grey-400`, hover: `text-grey-600 bg-grey-100` |
| 드롭다운 | `rounded-xl shadow-lg border-grey-100` |
| 일반 항목 | `text-grey-700`, hover: `bg-grey-50` |
| 삭제 항목 | `text-error`, hover: `bg-red-50` |

---

## Step 2: 삭제 확인 모달

### 2.1 파일 생성

**새 파일**: `frontend/src/components/DeleteConfirmModal.tsx`

### 2.2 컴포넌트 설계

```typescript
/**
 * DeleteConfirmModal Component
 * Phase 21.7: 문서 삭제 확인 모달
 *
 * 토스 스타일 - 명확한 경고와 확인
 */
import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  documentName: string;
  totalPages?: number;
  hasLabelingData?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  documentName,
  totalPages,
  hasLabelingData = false
}: DeleteConfirmModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* 배경 오버레이 */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        {/* 모달 컨테이너 */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-grey-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-error" />
                    </div>
                    <Dialog.Title className="text-lg font-semibold text-grey-900">
                      문서 삭제
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-grey-400 hover:text-grey-600 rounded-lg hover:bg-grey-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 본문 */}
                <div className="px-6 py-6">
                  <p className="text-grey-700 mb-4">
                    <strong className="text-grey-900">"{documentName}"</strong>
                    <br />
                    문서를 삭제하시겠습니까?
                  </p>

                  {/* 삭제될 데이터 목록 */}
                  <div className="bg-grey-50 rounded-xl p-4 space-y-2">
                    <p className="text-sm text-grey-600">삭제되는 항목:</p>
                    <ul className="text-sm text-grey-700 space-y-1 ml-4">
                      {totalPages && (
                        <li className="list-disc">페이지 이미지 ({totalPages}개)</li>
                      )}
                      <li className="list-disc">블록 분석 데이터</li>
                      {hasLabelingData && (
                        <li className="list-disc text-error font-medium">
                          라벨링 작업 데이터 (복구 불가)
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* 경고 메시지 */}
                  <p className="text-sm text-grey-500 mt-4">
                    삭제된 문서는 복구할 수 없습니다.
                  </p>
                </div>

                {/* 푸터 (버튼) */}
                <div className="flex gap-3 px-6 py-4 bg-grey-50 border-t border-grey-100">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={onClose}
                    disabled={isDeleting}
                  >
                    취소
                  </Button>
                  <Button
                    variant="solid"
                    className="flex-1 bg-error hover:bg-red-600 text-white"
                    onClick={onConfirm}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '삭제 중...' : '삭제'}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
```

### 2.3 모달 디자인 상세

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     삭제 확인 모달 레이아웃                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  [⚠️ 아이콘]  문서 삭제                                    [✕]  │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │                                                                  │  │
│  │  "251128_중3 정규반_문제지"                                      │  │
│  │  문서를 삭제하시겠습니까?                                        │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │  삭제되는 항목:                                            │ │  │
│  │  │  • 페이지 이미지 (16개)                                    │ │  │
│  │  │  • 블록 분석 데이터                                        │ │  │
│  │  │  • 라벨링 작업 데이터 (복구 불가) ← 빨간색                 │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  │                                                                  │  │
│  │  삭제된 문서는 복구할 수 없습니다.                              │  │
│  │                                                                  │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │  ┌────────────────┐    ┌────────────────────────┐               │  │
│  │  │      취소      │    │        🗑️ 삭제        │               │  │
│  │  │    (회색)      │    │      (빨간색)         │               │  │
│  │  └────────────────┘    └────────────────────────┘               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step 3: 토스트 알림 시스템

### 3.1 의존성 확인

```bash
# package.json 확인 필요
# react-hot-toast 또는 sonner 설치 여부 확인
```

### 3.2 토스트 설정 (react-hot-toast 사용 시)

**수정 파일**: `frontend/src/App.tsx`

```typescript
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      {/* 기존 라우터 */}
      <RouterProvider router={router} />

      {/* 토스트 컨테이너 추가 */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
          },
          success: {
            iconTheme: {
              primary: '#2563eb', // toss-blue
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444', // error
              secondary: '#fff',
            },
          },
        }}
      />
    </>
  );
}
```

### 3.3 토스트 메시지 정의

| 상황 | 타입 | 메시지 |
|------|------|--------|
| 삭제 성공 | `success` | "문서가 삭제되었습니다" |
| 삭제 실패 | `error` | "삭제에 실패했습니다. 다시 시도해주세요" |
| 네트워크 오류 | `error` | "네트워크 오류가 발생했습니다" |

---

## Step 4: RegistrationPage 통합

### 4.1 수정 파일

**파일**: `frontend/src/pages/RegistrationPage.tsx`

### 4.2 변경 사항 상세

#### 4.2.1 Import 추가

```typescript
// 기존 imports
import { useState, useCallback } from 'react';
// ...

// 새로 추가
import { useDeleteDocument } from '@/hooks/useDocuments';
import { DocumentMenu } from '@/components/DocumentMenu';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import toast from 'react-hot-toast';
```

#### 4.2.2 DocumentCardProps 수정

```typescript
interface DocumentCardProps {
  document: DocumentItem;
  onContinue: (id: string) => void;
  onDelete: (document: DocumentItem) => void;  // 추가
}
```

#### 4.2.3 DocumentCard 컴포넌트 수정

```typescript
function DocumentCard({ document, onContinue, onDelete }: DocumentCardProps) {
  const isActionable = document.status === 'ready' || document.status === 'labeling';
  // ...

  return (
    <motion.div /* ... */>
      <Card /* ... */>
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-10 h-10 bg-grey-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <File className="w-5 h-5 text-grey-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* 기존 내용 */}
          </div>

          {/* 더보기 메뉴 (NEW) */}
          <DocumentMenu
            documentId={document.id}
            documentName={document.name}
            onDelete={() => onDelete(document)}
          />

          {/* Action Button */}
          {isActionable && (
            <Button /* ... */>
              {document.status === 'labeling' ? '계속하기' : '시작하기'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
```

#### 4.2.4 RegistrationPage 상태 추가

```typescript
export function RegistrationPage() {
  const navigate = useNavigate();
  const { data: documents, isLoading } = useDocuments();
  const uploadMutation = useUploadPDF();
  const deleteMutation = useDeleteDocument();  // 추가

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);  // 추가

  // ...
}
```

#### 4.2.5 삭제 핸들러 추가

```typescript
// 삭제 클릭 핸들러
const handleDeleteClick = (document: DocumentItem) => {
  // 라벨링 진행/완료 상태면 모달로 확인
  if (document.status === 'labeling' || document.status === 'completed') {
    setDeleteTarget(document);
  } else {
    // 바로 삭제 (confirm 대화상자)
    handleConfirmDelete(document);
  }
};

// 삭제 확인 핸들러
const handleConfirmDelete = async (document: DocumentItem) => {
  try {
    await deleteMutation.mutateAsync(document.id);
    toast.success('문서가 삭제되었습니다');
    setDeleteTarget(null);
  } catch (error) {
    toast.error('삭제에 실패했습니다. 다시 시도해주세요');
  }
};

// 모달 닫기
const handleCloseDeleteModal = () => {
  setDeleteTarget(null);
};
```

#### 4.2.6 JSX에 모달 추가

```typescript
return (
  <div className="p-8 max-w-4xl mx-auto">
    {/* 기존 내용 */}

    {/* 삭제 확인 모달 (NEW) */}
    <DeleteConfirmModal
      isOpen={!!deleteTarget}
      onClose={handleCloseDeleteModal}
      onConfirm={() => deleteTarget && handleConfirmDelete(deleteTarget)}
      isDeleting={deleteMutation.isPending}
      documentName={deleteTarget?.name || ''}
      totalPages={deleteTarget?.totalPages}
      hasLabelingData={deleteTarget?.status === 'labeling' || deleteTarget?.status === 'completed'}
    />
  </div>
);
```

#### 4.2.7 DocumentCard에 onDelete 전달

```typescript
{processingDocs.map(doc => (
  <DocumentCard
    key={doc.id}
    document={doc}
    onContinue={handleContinueLabeling}
    onDelete={handleDeleteClick}  // 추가
  />
))}

{inProgressDocs.map(doc => (
  <DocumentCard
    key={doc.id}
    document={doc}
    onContinue={handleContinueLabeling}
    onDelete={handleDeleteClick}  // 추가
  />
))}

{completedDocs.slice(0, 3).map(doc => (
  <DocumentCard
    key={doc.id}
    document={doc}
    onContinue={handleContinueLabeling}
    onDelete={handleDeleteClick}  // 추가
  />
))}
```

---

## Step 5: 테스트 및 검증

### 5.1 테스트 시나리오

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        테스트 시나리오                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Test 1: 기본 삭제 흐름                                                 │
│  ══════════════════════════                                             │
│  1. RegistrationPage 접속                                               │
│  2. 문서 카드의 ⋮ 버튼 클릭                                            │
│  3. "삭제" 클릭                                                         │
│  4. 확인 모달 표시 확인                                                 │
│  5. "삭제" 버튼 클릭                                                    │
│  6. 토스트 메시지 "문서가 삭제되었습니다" 확인                          │
│  7. 목록에서 문서 사라짐 확인                                           │
│                                                                         │
│  Test 2: 삭제 취소                                                      │
│  ══════════════════════════                                             │
│  1. ⋮ → 삭제 클릭                                                      │
│  2. 모달에서 "취소" 클릭                                                │
│  3. 모달 닫힘 확인                                                      │
│  4. 문서 목록 유지 확인                                                 │
│                                                                         │
│  Test 3: 메뉴 외부 클릭                                                 │
│  ══════════════════════════                                             │
│  1. ⋮ 버튼 클릭 → 메뉴 열림                                            │
│  2. 메뉴 외부 클릭                                                      │
│  3. 메뉴 닫힘 확인                                                      │
│                                                                         │
│  Test 4: 카드 클릭과 메뉴 분리                                          │
│  ══════════════════════════                                             │
│  1. 카드 본문 클릭 → 라벨링 페이지 이동                                 │
│  2. ⋮ 버튼 클릭 → 메뉴만 열림 (페이지 이동 X)                          │
│                                                                         │
│  Test 5: 삭제 실패 처리                                                 │
│  ══════════════════════════                                             │
│  1. 백엔드 서버 중지                                                    │
│  2. 삭제 시도                                                           │
│  3. 에러 토스트 표시 확인                                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 검증 체크리스트

| # | 항목 | 예상 결과 |
|---|------|-----------|
| 1 | 메뉴 버튼 렌더링 | 모든 DocumentCard에 ⋮ 표시 |
| 2 | 메뉴 드롭다운 | 클릭 시 애니메이션과 함께 표시 |
| 3 | 삭제 옵션 스타일 | 빨간색 텍스트 |
| 4 | 모달 표시 | 토스 스타일 경고 UI |
| 5 | 삭제 버튼 로딩 | 삭제 중 "삭제 중..." 표시 |
| 6 | 목록 갱신 | 삭제 후 즉시 목록에서 제거 |
| 7 | 토스트 위치 | 화면 하단 중앙 |

---

## 코드 변경 상세

### 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `frontend/src/components/DocumentMenu.tsx` | 신규 | 더보기 메뉴 컴포넌트 |
| `frontend/src/components/DeleteConfirmModal.tsx` | 신규 | 삭제 확인 모달 |
| `frontend/src/pages/RegistrationPage.tsx` | 수정 | 삭제 기능 통합 |
| `frontend/src/App.tsx` | 수정 | Toaster 추가 (필요시) |
| `frontend/package.json` | 수정 | react-hot-toast 추가 (필요시) |

### 의존성

```json
{
  "dependencies": {
    "@headlessui/react": "^2.x",  // 이미 설치됨
    "react-hot-toast": "^2.x"     // 설치 필요 확인
  }
}
```

---

## 전체 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        삭제 기능 전체 흐름                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  User                UI                      Hook                API    │
│   │                   │                        │                   │    │
│   │  ⋮ 클릭          │                        │                   │    │
│   │ ─────────────────>│                        │                   │    │
│   │                   │                        │                   │    │
│   │                   │ DocumentMenu 열림      │                   │    │
│   │                   │<──────────────────────>│                   │    │
│   │                   │                        │                   │    │
│   │  "삭제" 클릭      │                        │                   │    │
│   │ ─────────────────>│                        │                   │    │
│   │                   │                        │                   │    │
│   │                   │ status 확인            │                   │    │
│   │                   │────────┐               │                   │    │
│   │                   │        │               │                   │    │
│   │                   │<───────┘               │                   │    │
│   │                   │                        │                   │    │
│   │                   │ [labeling/completed]   │                   │    │
│   │                   │ DeleteConfirmModal 표시│                   │    │
│   │                   │<──────────────────────>│                   │    │
│   │                   │                        │                   │    │
│   │  "삭제" 확인      │                        │                   │    │
│   │ ─────────────────>│                        │                   │    │
│   │                   │ deleteMutation.mutate()│                   │    │
│   │                   │───────────────────────>│                   │    │
│   │                   │                        │ DELETE /api/...   │    │
│   │                   │                        │──────────────────>│    │
│   │                   │                        │                   │    │
│   │                   │                        │     200 OK        │    │
│   │                   │                        │<──────────────────│    │
│   │                   │ invalidateQueries()    │                   │    │
│   │                   │<───────────────────────│                   │    │
│   │                   │                        │                   │    │
│   │                   │ toast.success()        │                   │    │
│   │  토스트 표시      │<──────────────────────>│                   │    │
│   │<─────────────────│                        │                   │    │
│   │                   │                        │                   │    │
│   │  목록 갱신됨      │ 문서 목록 리렌더링     │                   │    │
│   │<─────────────────│<──────────────────────>│                   │    │
│   │                   │                        │                   │    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 구현 시작 명령

**"진행해줘"**라고 하시면 위 계획에 따라 순차적으로 구현합니다.

구현 순서:
1. DocumentMenu.tsx 생성
2. DeleteConfirmModal.tsx 생성
3. react-hot-toast 설치 확인 및 설정
4. RegistrationPage.tsx 수정
5. 테스트

---

*작성: Claude Code (Phase 21.7)*
