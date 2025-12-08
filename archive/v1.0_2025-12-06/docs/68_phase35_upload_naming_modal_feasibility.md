# Phase 35 구현 가능성 리포트: 업로드 시 이름 지정 모달

> **작성일**: 2025-12-03
> **상태**: 연구 완료
> **작성자**: Claude Code (Opus)
> **결론**: ✅ 구현 가능 (난이도: 중)

---

## 1. Executive Summary

### 요청 기능
파일 업로드 시 **모달 창**이 열려서 **학년/과정/시리즈/타입**을 선택하면
자동으로 올바른 형식의 파일명으로 저장

### 구현 가능성
**✅ 완전히 구현 가능**

| 항목 | 평가 |
|------|------|
| 기술적 가능성 | ⭐⭐⭐⭐⭐ |
| 구현 난이도 | 중간 |
| 예상 소요 시간 | 2-3시간 |
| 기존 코드 영향 | 낮음 |

---

## 2. 현재 시스템 분석

### 2.1 업로드 플로우 (현재)

```
┌─────────────────────────────────────────────────────────────┐
│  사용자                                                     │
│    │                                                        │
│    ├── 파일 선택/드래그 ──────────────────────────┐        │
│    │                                              │        │
│    │                                              ▼        │
│    │                                    ┌─────────────────┐│
│    │                                    │ CollapsibleUpload││
│    │                                    │ Section.tsx     ││
│    │                                    └────────┬────────┘│
│    │                                             │        │
│    │                                             ▼        │
│    │                                    ┌─────────────────┐│
│    │                                    │ useUploadPDF()  ││
│    │                                    │ → api.uploadPDF ││
│    │                                    └────────┬────────┘│
│    │                                             │        │
│    │                                             ▼        │
│    │                                    ┌─────────────────┐│
│    │                                    │ POST /api/pdf/  ││
│    │                                    │ upload          ││
│    │                                    │                 ││
│    │                                    │ document_id =   ││
│    │                                    │ file.filename   ││
│    │                                    └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2.2 현재 코드 위치

| 레이어 | 파일 | 역할 |
|--------|------|------|
| UI | `CollapsibleUploadSection.tsx` | 드래그앤드롭 영역 |
| Hook | `useDocuments.ts` → `useUploadPDF()` | React Query mutation |
| API | `api/client.ts` → `api.uploadPDF()` | FormData 전송 |
| Backend | `routers/pdf.py` → `/upload` | 파일 저장 + 처리 |

### 2.3 핵심 코드

**프론트엔드 (api/client.ts:374)**
```typescript
uploadPDF: async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);  // 현재: 파일만 전송
  // ...
}
```

**백엔드 (routers/pdf.py:60)**
```python
# 현재: 원본 파일명에서 document_id 추출
document_id = Path(file.filename).stem
```

---

## 3. 제안 설계

### 3.1 새로운 업로드 플로우

```
┌─────────────────────────────────────────────────────────────┐
│  사용자                                                     │
│    │                                                        │
│    ├── 파일 선택/드래그 ────────────────────┐              │
│    │                                        │              │
│    │                                        ▼              │
│    │                              ┌─────────────────────┐  │
│    │                              │ 📋 UploadNamingModal│  │
│    │                              │                     │  │
│    │                              │ ┌─────────────────┐ │  │
│    │                              │ │ 학년: [고1 ▼]   │ │  │
│    │                              │ └─────────────────┘ │  │
│    │                              │ ┌─────────────────┐ │  │
│    │                              │ │ 과정: [공통수학1]│ │  │
│    │                              │ └─────────────────┘ │  │
│    │                              │ ┌─────────────────┐ │  │
│    │                              │ │ 시리즈: [수바]  │ │  │
│    │                              │ └─────────────────┘ │  │
│    │                              │ ┌─────────────────┐ │  │
│    │                              │ │ 타입: ○문제 ○해설│ │  │
│    │                              │ └─────────────────┘ │  │
│    │                              │                     │  │
│    │                              │ 미리보기:           │  │
│    │                              │ 고1_공통수학1_수학의│  │
│    │                              │ 바이블_문제.pdf     │  │
│    │                              │                     │  │
│    │                              │ [취소] [업로드]     │  │
│    │                              └──────────┬──────────┘  │
│    │                                         │             │
│    │                                         ▼             │
│    │                              ┌─────────────────────┐  │
│    │                              │ api.uploadPDF(      │  │
│    │                              │   file,             │  │
│    │                              │   customDocumentId  │  │
│    │                              │ )                   │  │
│    │                              └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 UI 디자인 (토스 스타일)

```
┌────────────────────────────────────────────────────────────┐
│                                                        ✕   │
│                                                            │
│      📄 파일 이름 지정                                     │
│                                                            │
│      원본: 베이직쎈+고등+공통수학1해설.pdf                  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  학년                                               │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  ◉ 고1   ○ 고2   ○ 고3                       │  │   │
│  │  │  ○ 중1   ○ 중2   ○ 중3                       │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │  과정                                               │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  공통수학1                                ▼   │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │  시리즈                                             │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  베이직쎈                                     │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │  타입                                               │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │  ○ 문제집                ◉ 해설집            │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│      저장될 이름:                                          │
│      ┌────────────────────────────────────────────────┐   │
│      │  고1_공통수학1_베이직쎈_해설.pdf               │   │
│      └────────────────────────────────────────────────┘   │
│                                                            │
│           ┌──────────┐        ┌──────────────────┐        │
│           │   취소   │        │   📤 업로드      │        │
│           └──────────┘        └──────────────────┘        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 4. 구현 계획

### 4.1 파일 구조

```
frontend/src/
├── components/
│   └── main/
│       ├── CollapsibleUploadSection.tsx  # 수정
│       └── UploadNamingModal.tsx         # 신규 ⭐
├── hooks/
│   └── useDocuments.ts                   # 수정 (uploadPDF 시그니처)
└── api/
    └── client.ts                         # 수정 (customDocumentId 추가)

backend/app/
└── routers/
    └── pdf.py                            # 수정 (document_id 파라미터)
```

### 4.2 구현 단계

#### Step 1: 백엔드 API 수정 (15분)

```python
# routers/pdf.py
@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    document_id: Optional[str] = Form(None),  # 추가
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # document_id가 전달되면 사용, 아니면 파일명에서 추출
    final_document_id = document_id or Path(file.filename).stem
    # ...
```

#### Step 2: API 클라이언트 수정 (10분)

```typescript
// api/client.ts
uploadPDF: async (
  file: File,
  customDocumentId?: string  // 추가
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (customDocumentId) {
    formData.append('document_id', customDocumentId);
  }
  // ...
}
```

#### Step 3: Hook 수정 (5분)

```typescript
// hooks/useDocuments.ts
export function useUploadPDF() {
  return useMutation({
    mutationFn: ({ file, documentId }: { file: File; documentId?: string }) =>
      api.uploadPDF(file, documentId),
    // ...
  });
}
```

#### Step 4: 모달 컴포넌트 생성 (1시간)

```typescript
// components/main/UploadNamingModal.tsx
interface UploadNamingModalProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (documentId: string) => void;
}

export function UploadNamingModal({ file, isOpen, onClose, onConfirm }: UploadNamingModalProps) {
  const [grade, setGrade] = useState<string>('고1');
  const [course, setCourse] = useState<string>('');
  const [series, setSeries] = useState<string>('');
  const [type, setType] = useState<'문제' | '해설'>('문제');

  // 파일명 미리보기
  const previewName = `${grade}_${course}_${series}_${type}.pdf`;

  // 제출
  const handleSubmit = () => {
    const documentId = `${grade}_${course}_${series}_${type}`;
    onConfirm(documentId);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {/* UI */}
    </Modal>
  );
}
```

#### Step 5: 업로드 섹션 수정 (30분)

```typescript
// components/main/CollapsibleUploadSection.tsx
const [pendingFile, setPendingFile] = useState<File | null>(null);
const [showNamingModal, setShowNamingModal] = useState(false);

const onDrop = useCallback((acceptedFiles: File[]) => {
  const file = acceptedFiles[0];
  if (file) {
    setPendingFile(file);
    setShowNamingModal(true);  // 모달 열기
  }
}, []);

const handleConfirm = async (documentId: string) => {
  if (pendingFile) {
    await uploadMutation.mutateAsync({ file: pendingFile, documentId });
    setShowNamingModal(false);
    setPendingFile(null);
  }
};
```

---

## 5. 데이터 구조

### 5.1 학년/과정 데이터

```typescript
const GRADES = {
  high: ['고1', '고2', '고3'],
  middle: ['중1', '중2', '중3'],
  elementary: ['초3', '초4', '초5', '초6'],
};

const COURSES: Record<string, string[]> = {
  '고1': ['공통수학1', '공통수학2', '수학'],
  '고2': ['미적분', '확률과통계', '기하'],
  '고3': ['미적분', '확률과통계', '기하'],
  '중1': ['수학'],
  '중2': ['수학'],
  '중3': ['수학'],
  // ...
};
```

### 5.2 시리즈 자동완성 (선택적)

```typescript
const POPULAR_SERIES = [
  '수학의바이블',
  '개념원리',
  '쎈',
  '베이직쎈',
  '라이트쎈',
  '블랙라벨',
  '수학의정석',
  '자이스토리',
  // ...
];
```

---

## 6. UX 개선 사항

### 6.1 스마트 기본값

원본 파일명에서 정보 추출 시도:

```typescript
function extractFromFilename(filename: string) {
  // "베이직쎈+고등+공통수학1해설" 분석
  const hints = {
    grade: filename.includes('고등') ? '고1' :
           filename.includes('중등') ? '중1' : null,
    type: filename.includes('해설') ? '해설' :
          filename.includes('문제') ? '문제' : null,
    series: extractSeriesName(filename),  // "베이직쎈" 추출
  };
  return hints;
}
```

### 6.2 최근 입력 기억

```typescript
// localStorage에 마지막 선택 저장
const [lastSelection, setLastSelection] = useLocalStorage('lastUploadSelection', {
  grade: '고1',
  course: '공통수학1',
});
```

### 6.3 입력 검증

```typescript
const isValid = grade && course && series && type;
const isDuplicate = existingDocuments.includes(previewName);
```

---

## 7. 기술적 고려사항

### 7.1 기존 코드 영향

| 영역 | 영향 | 대응 |
|------|------|------|
| 백엔드 API | **낮음** | 기존 파라미터 유지, 새 파라미터 추가 |
| 프론트엔드 Hook | **낮음** | 인터페이스 확장 |
| 기존 업로드 버튼 | **없음** | 별도로 유지 가능 |

### 7.2 하위 호환성

- `document_id` 파라미터는 **선택적(Optional)**
- 기존 업로드 방식도 그대로 동작
- 기존 `UploadButton.tsx`는 수정 불필요

### 7.3 에러 처리

```typescript
// 중복 파일명 체크
if (existingDocuments.includes(documentId)) {
  alert('같은 이름의 문서가 이미 존재합니다');
  return;
}

// 필수 필드 검증
if (!grade || !series || !type) {
  alert('모든 필드를 입력해주세요');
  return;
}
```

---

## 8. 리스크 및 대응

| 리스크 | 확률 | 대응 |
|--------|------|------|
| 사용자가 잘못된 정보 입력 | 중간 | 미리보기 표시, 확인 단계 |
| 중복 파일명 | 낮음 | 업로드 전 중복 체크 |
| 모달 닫기 시 파일 손실 | 낮음 | 확인 메시지 표시 |

---

## 9. 결론

### 9.1 구현 가능성 평가

| 항목 | 평가 |
|------|------|
| 기술적 실현 가능성 | ✅ 완전 가능 |
| 기존 시스템 영향 | ✅ 최소화 가능 |
| 사용자 경험 | ✅ 크게 개선 |
| 유지보수성 | ✅ 양호 |

### 9.2 예상 효과

1. **정확한 파일명**: 파싱 실패 방지
2. **사용자 편의**: 직관적 UI로 간편 입력
3. **데이터 일관성**: 표준화된 naming convention
4. **검색 정확도**: 전체 찾아보기 기능 활용 가능

### 9.3 권장사항

**✅ 구현 권장**

Phase 35로 진행 시:
1. 백엔드 API 수정 (15분)
2. API 클라이언트 수정 (10분)
3. Hook 수정 (5분)
4. 모달 컴포넌트 생성 (1시간)
5. 업로드 섹션 연동 (30분)
6. 테스트 및 디버깅 (30분)

**총 예상 소요: 2-3시간**

---

## 10. 다음 단계

사용자 승인 시:
1. Phase 35 계획 문서 작성
2. 단계별 구현 시작
3. 브라우저 테스트

---

*리포트 작성: Claude Code (Opus)*
*최종 업데이트: 2025-12-03*
