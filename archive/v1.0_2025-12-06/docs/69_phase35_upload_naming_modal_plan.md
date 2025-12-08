# Phase 35: 업로드 네이밍 모달 - 단계별 개발 계획

> **작성일**: 2025-12-03
> **상태**: 계획 수립 완료
> **예상 소요**: 2-3시간
> **선행 조건**: Phase 34.5 완료

---

## 목표

파일 업로드 시 **모달 창**에서 학년/과정/시리즈/타입을 선택하여
올바른 형식(`고1_공통수학1_시리즈명_문제.pdf`)으로 저장

---

## 개발 단계

### Step 1: 백엔드 API 수정 (15분)

**파일**: `backend/app/routers/pdf.py`

**변경 내용**:
- [ ] `/upload` 엔드포인트에 `document_id` 파라미터 추가 (Optional)
- [ ] `document_id`가 전달되면 해당 값 사용, 없으면 기존 로직 유지

**코드 변경**:
```python
@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    document_id: Optional[str] = Form(None),  # 추가
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    # document_id가 전달되면 사용, 아니면 파일명에서 추출
    final_document_id = document_id if document_id else Path(file.filename).stem
```

**테스트**:
- [ ] 기존 업로드 (document_id 없이) 정상 동작 확인
- [ ] document_id 전달 시 해당 이름으로 저장 확인

---

### Step 2: API 클라이언트 수정 (10분)

**파일**: `frontend/src/api/client.ts`

**변경 내용**:
- [ ] `uploadPDF` 함수에 `customDocumentId` 파라미터 추가
- [ ] FormData에 `document_id` 필드 추가

**코드 변경**:
```typescript
uploadPDF: async (
  file: File,
  customDocumentId?: string
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (customDocumentId) {
    formData.append('document_id', customDocumentId);
  }
  // ...
}
```

---

### Step 3: useDocuments Hook 수정 (5분)

**파일**: `frontend/src/hooks/useDocuments.ts`

**변경 내용**:
- [ ] `useUploadPDF` mutation 인터페이스 변경
- [ ] `{ file, documentId }` 객체로 변경

**코드 변경**:
```typescript
export function useUploadPDF() {
  return useMutation({
    mutationFn: ({ file, documentId }: { file: File; documentId?: string }) =>
      api.uploadPDF(file, documentId),
    // ...
  });
}
```

---

### Step 4: 모달 컴포넌트 생성 (1시간)

**파일**: `frontend/src/components/main/UploadNamingModal.tsx` (신규)

**구현 내용**:
- [ ] 모달 레이아웃 (토스 스타일)
- [ ] 학년 선택 (라디오 버튼)
- [ ] 과정 선택 (드롭다운, 학년에 따라 동적)
- [ ] 시리즈 입력 (텍스트 + 자동완성)
- [ ] 타입 선택 (문제/해설 라디오)
- [ ] 파일명 미리보기
- [ ] 입력 검증
- [ ] 제출/취소 버튼

**Props 인터페이스**:
```typescript
interface UploadNamingModalProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (documentId: string) => void;
}
```

**데이터 구조**:
```typescript
// 학년 목록
const GRADES = ['고1', '고2', '고3', '중1', '중2', '중3'];

// 학년별 과정
const COURSES: Record<string, string[]> = {
  '고1': ['공통수학1', '공통수학2'],
  '고2': ['미적분', '확률과통계', '기하'],
  '고3': ['미적분', '확률과통계', '기하'],
  '중1': ['수학'],
  '중2': ['수학'],
  '중3': ['수학'],
};

// 인기 시리즈 (자동완성용)
const POPULAR_SERIES = [
  '수학의바이블', '개념원리', '쎈', '베이직쎈',
  '라이트쎈', '블랙라벨', '자이스토리'
];
```

**UI 구조**:
```
┌─────────────────────────────────────────┐
│ ✕                                       │
│                                         │
│   📄 파일 이름 지정                      │
│                                         │
│   원본: {원본파일명}                     │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │ 학년                             │   │
│   │ ◉고1 ○고2 ○고3 ○중1 ○중2 ○중3  │   │
│   │                                  │   │
│   │ 과정                             │   │
│   │ [공통수학1          ▼]           │   │
│   │                                  │   │
│   │ 시리즈                           │   │
│   │ [수학의바이블        ]           │   │
│   │                                  │   │
│   │ 타입                             │   │
│   │ ◉ 문제집    ○ 해설집             │   │
│   └─────────────────────────────────┘   │
│                                         │
│   저장될 이름:                          │
│   ┌─────────────────────────────────┐   │
│   │ 고1_공통수학1_수학의바이블_문제  │   │
│   └─────────────────────────────────┘   │
│                                         │
│        [취소]      [📤 업로드]          │
└─────────────────────────────────────────┘
```

---

### Step 5: 업로드 섹션 연동 (30분)

**파일**: `frontend/src/components/main/CollapsibleUploadSection.tsx`

**변경 내용**:
- [ ] `pendingFile` 상태 추가
- [ ] `showNamingModal` 상태 추가
- [ ] 파일 드롭 시 모달 열기 (즉시 업로드 X)
- [ ] 모달 확인 시 업로드 실행
- [ ] 모달 취소 시 파일 클리어

**코드 변경**:
```typescript
const [pendingFile, setPendingFile] = useState<File | null>(null);
const [showNamingModal, setShowNamingModal] = useState(false);

const onDrop = useCallback((acceptedFiles: File[]) => {
  const file = acceptedFiles[0];
  if (file) {
    setPendingFile(file);
    setShowNamingModal(true);  // 모달 열기
  }
}, []);

const handleModalConfirm = async (documentId: string) => {
  if (pendingFile) {
    await uploadMutation.mutateAsync({ file: pendingFile, documentId });
    setShowNamingModal(false);
    setPendingFile(null);
  }
};

const handleModalClose = () => {
  setShowNamingModal(false);
  setPendingFile(null);
};
```

---

### Step 6: 테스트 및 디버깅 (30분)

**테스트 항목**:
- [ ] 파일 드래그앤드롭 → 모달 열림 확인
- [ ] 학년 선택 → 과정 목록 변경 확인
- [ ] 모든 필드 입력 → 미리보기 갱신 확인
- [ ] 업로드 버튼 → 파일 저장 확인
- [ ] 저장된 파일명이 올바른 형식인지 확인
- [ ] 전체 찾아보기에서 파일 표시 확인
- [ ] 취소 버튼 → 모달 닫힘 확인
- [ ] ESC 키 → 모달 닫힘 확인
- [ ] 빈 필드로 제출 시 에러 표시 확인

---

## 파일 변경 요약

| 파일 | 작업 | 우선순위 |
|------|------|----------|
| `backend/app/routers/pdf.py` | 수정 | 1 |
| `frontend/src/api/client.ts` | 수정 | 2 |
| `frontend/src/hooks/useDocuments.ts` | 수정 | 3 |
| `frontend/src/components/main/UploadNamingModal.tsx` | **신규** | 4 |
| `frontend/src/components/main/CollapsibleUploadSection.tsx` | 수정 | 5 |

---

## 체크리스트

### 백엔드
- [ ] `/upload` API에 `document_id` 파라미터 추가
- [ ] 하위 호환성 유지 (파라미터 Optional)

### 프론트엔드
- [ ] API 클라이언트 수정
- [ ] Hook 수정
- [ ] 모달 컴포넌트 생성
- [ ] 업로드 섹션 연동

### 테스트
- [ ] 기존 업로드 기능 정상 동작
- [ ] 새 모달 업로드 기능 정상 동작
- [ ] 전체 찾아보기에 표시 확인

---

## 다음 단계

**"진행해줘"** 명령 시:
1. Step 1부터 순차적으로 구현
2. 각 Step 완료 후 테스트
3. 전체 통합 테스트

---

*계획 작성: Claude Code*
*최종 업데이트: 2025-12-03*
