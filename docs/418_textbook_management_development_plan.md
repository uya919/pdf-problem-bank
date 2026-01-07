# 418. 교재 관리 시스템 개발 계획

> Stage 18 확장: 교재 관리 분리 + PDF 압축

---

## 개요

| 항목 | 내용 |
|------|------|
| 목표 | 교재 관리 페이지 분리, 반별 교재 선택, PDF 자동 압축 |
| 선행 조건 | Stage 18 PDF 뷰어 완료 ✅ |
| 참조 문서 | [417_textbook_management_system_research.md](417_textbook_management_system_research.md) |

---

## Phase 18-E: 교재 관리 페이지

### Phase 18-E-1: 타입 및 훅 확장

**파일**: `frontend/src/types/textbook.ts`

```typescript
// 추가할 타입
export interface TextbookWithUsage extends Textbook {
  usageCount: number;        // 사용 중인 반 수
  usedByClasses: string[];   // 사용 중인 반 ID 목록
}

export interface TextbookCreateInput {
  displayName: string;
  file: File;
  grade?: string;      // "고1", "중3" 등
  subject?: string;    // "수학", "영어" 등
}
```

**파일**: `frontend/src/hooks/useAllTextbooks.ts` (신규)

```typescript
/**
 * 전체 교재 관리 훅
 * - 모든 교재 조회 (사용 현황 포함)
 * - 교재 업로드
 * - 교재 삭제 (사용 중 확인)
 */

// Mock 데이터
const MOCK_ALL_TEXTBOOKS: TextbookWithUsage[] = [
  {
    id: 'textbook-1',
    displayName: '베이직쎈 고1 공통수학',
    fileName: '베이직쎈_고1_공통수학.pdf',
    fileUrl: '/sample.pdf',
    fileSize: 15000000,
    pageCount: 280,
    grade: '고1',
    subject: '수학',
    uploadedAt: '2025-01-15',
    uploadedBy: 'admin',
    usageCount: 3,
    usedByClasses: ['class-1', 'class-2', 'class-3'],
  },
  // ...
];

export function useAllTextbooks() { ... }
export function useCreateTextbook() { ... }
export function useDeleteTextbook() { ... }
```

**체크리스트**:
- [ ] TextbookWithUsage 타입 추가
- [ ] TextbookCreateInput 타입 추가
- [ ] useAllTextbooks 훅 생성
- [ ] Mock 데이터 작성
- [ ] 빌드 테스트

---

### Phase 18-E-2: 교재 목록 컴포넌트

**파일**: `frontend/src/components/admin/textbook/TextbookList.tsx` (신규)

```typescript
interface TextbookListProps {
  textbooks: TextbookWithUsage[];
  isLoading: boolean;
  onEdit: (textbook: TextbookWithUsage) => void;
  onDelete: (textbook: TextbookWithUsage) => void;
}

/**
 * 교재 목록 테이블
 * - 교재명, 파일 크기, 페이지 수
 * - 학년/과목 태그
 * - 사용 중인 반 수 표시
 * - 편집/삭제 버튼
 */
```

**UI 구조**:
```
┌─────────────────────────────────────────────────────────────┐
│ 교재명              크기    페이지  학년  과목  사용   작업  │
├─────────────────────────────────────────────────────────────┤
│ 베이직쎈 고1       15.2MB   280p   고1   수학  3개반  ✏️ 🗑 │
│ 개념원리 RPM       12.0MB   320p   고1   수학  2개반  ✏️ 🗑 │
│ 쎈 중3 상           8.5MB   240p   중3   수학  1개반  ✏️ 🗑 │
└─────────────────────────────────────────────────────────────┘
```

**체크리스트**:
- [ ] TextbookList 컴포넌트 생성
- [ ] 테이블 UI 구현
- [ ] 사용 중인 반 수 표시
- [ ] 편집/삭제 버튼 연결

---

### Phase 18-E-3: 교재 업로드 모달

**파일**: `frontend/src/components/admin/textbook/TextbookUploadModal.tsx` (신규)

```typescript
interface TextbookUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 교재 업로드 모달
 * - 교재명 입력
 * - 학년/과목 선택
 * - PDF 파일 선택
 * - 50MB 초과 시 압축 옵션 표시
 * - 업로드 진행률
 */
```

**UI 구조**:
```
┌─────────────────────────────────────────────────────────────┐
│ 교재 추가                                              [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  교재명 *                                                   │
│  [베이직쎈 고1 공통수학________________]                     │
│                                                             │
│  학년              과목                                      │
│  [고1 ▼]          [수학 ▼]                                  │
│                                                             │
│  PDF 파일 *                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     📄 파일을 드래그하거나 클릭하여 선택             │   │
│  │         PDF 파일만 가능 (최대 200MB)                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠️ 50MB 초과 파일은 자동으로 압축됩니다                     │
│                                                             │
│                              [취소]  [업로드]               │
└─────────────────────────────────────────────────────────────┘
```

**체크리스트**:
- [ ] TextbookUploadModal 컴포넌트 생성
- [ ] 교재명, 학년, 과목 입력 폼
- [ ] 파일 드래그 앤 드롭 (react-dropzone 재사용)
- [ ] 파일 크기 검증 (200MB 상한)
- [ ] 업로드 mutation 연결

---

### Phase 18-E-4: 교재 관리 페이지

**파일**: `frontend/src/pages/admin/TextbookManagement.tsx` (신규)

```typescript
/**
 * 교재 관리 페이지
 * /admin/textbooks
 *
 * - 교재 목록 표시
 * - 교재 추가 버튼
 * - 검색/필터 (학년, 과목)
 */
```

**UI 구조**:
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 교재 관리                                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [검색________________] [학년 ▼] [과목 ▼]    [+ 교재 추가]  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ TextbookList 컴포넌트                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  총 12개 교재 · 저장 공간 156.8 MB 사용                      │
└─────────────────────────────────────────────────────────────┘
```

**체크리스트**:
- [ ] TextbookManagement 페이지 생성
- [ ] 라우터에 /admin/textbooks 추가
- [ ] 사이드바 메뉴에 "교재 관리" 추가
- [ ] 검색/필터 기능
- [ ] 빌드 테스트

---

## Phase 18-F: 반-교재 연결 시스템

### Phase 18-F-1: 반-교재 연결 타입 및 훅

**파일**: `frontend/src/types/textbook.ts` (추가)

```typescript
// 반-교재 연결 타입
export interface ClassTextbook {
  id: string;
  classId: string;
  textbookId: string;
  textbook: Textbook;
  displayOrder: number;
}
```

**파일**: `frontend/src/hooks/useClassTextbooks.ts` (신규)

```typescript
/**
 * 반별 교재 연결 훅
 * - 반에 연결된 교재 조회
 * - 교재 연결 추가
 * - 교재 연결 해제
 * - 순서 변경
 */

// Mock 데이터
const MOCK_CLASS_TEXTBOOKS: Record<string, ClassTextbook[]> = {
  'class-1': [
    { id: 'ct-1', classId: 'class-1', textbookId: 'textbook-1', displayOrder: 0, textbook: {...} },
    { id: 'ct-2', classId: 'class-1', textbookId: 'textbook-2', displayOrder: 1, textbook: {...} },
  ],
};

export function useClassTextbooks(classId: string) { ... }
export function useLinkTextbook() { ... }
export function useUnlinkTextbook() { ... }
export function useReorderClassTextbooks() { ... }
```

**체크리스트**:
- [ ] ClassTextbook 타입 추가
- [ ] useClassTextbooks 훅 생성
- [ ] 연결/해제/순서변경 mutation
- [ ] Mock 데이터 작성

---

### Phase 18-F-2: 교재 선택 모달

**파일**: `frontend/src/components/admin/class/TextbookSelectorModal.tsx` (신규)

```typescript
interface TextbookSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  linkedTextbookIds: string[];  // 이미 연결된 교재 ID
  onSelect: (textbookId: string) => void;
}

/**
 * 교재 선택 모달
 * - 전체 교재 목록에서 선택
 * - 이미 연결된 교재는 비활성화
 * - 검색/필터 기능
 */
```

**UI 구조**:
```
┌─────────────────────────────────────────────────────────────┐
│ 교재 선택                                              [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [검색________________] [학년 ▼] [과목 ▼]                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ 베이직쎈 고1 공통수학         15.2MB  280페이지    │   │
│  │ ● 개념원리 RPM (이미 연결됨)    12.0MB  320페이지    │   │
│  │ ○ 쎈 중3 상                      8.5MB  240페이지    │   │
│  │ ○ 블랙라벨 고2 수학1            22.3MB  360페이지    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                              [취소]  [선택 완료]            │
└─────────────────────────────────────────────────────────────┘
```

**체크리스트**:
- [ ] TextbookSelectorModal 컴포넌트 생성
- [ ] 교재 목록 표시
- [ ] 이미 연결된 교재 비활성화
- [ ] 검색/필터 기능

---

### Phase 18-F-3: 반 설정에 교재 관리 추가

**파일**: `frontend/src/components/admin/class/ClassTextbookSection.tsx` (신규)

```typescript
interface ClassTextbookSectionProps {
  classId: string;
  className: string;
}

/**
 * 반 설정 페이지 내 교재 섹션
 * - 연결된 교재 목록
 * - 교재 추가 버튼
 * - 교재 순서 변경 (드래그 앤 드롭)
 * - 교재 연결 해제
 */
```

**UI 구조**:
```
┌─────────────────────────────────────────────────────────────┐
│ 사용 교재                                    [+ 교재 추가]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ≡  📄 베이직쎈 고1 공통수학      15.2MB  280p   [X] │   │
│  │ ≡  📄 개념원리 RPM               12.0MB  320p   [X] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 드래그하여 순서를 변경할 수 있습니다                      │
└─────────────────────────────────────────────────────────────┘
```

**체크리스트**:
- [ ] ClassTextbookSection 컴포넌트 생성
- [ ] 연결된 교재 목록 표시
- [ ] 교재 추가 모달 연동
- [ ] 연결 해제 기능
- [ ] 드래그 앤 드롭 순서 변경 (선택적)

---

### Phase 18-F-4: ProgressModal 수정

**파일**: `frontend/src/components/backoffice/modals/ProgressModal.tsx` (수정)

```typescript
// 기존: useTextbooksByClass (반별 직접 업로드된 교재)
// 변경: useClassTextbooks (반에 연결된 교재)

// 변경 사항:
// 1. import 변경
// 2. 훅 교체
// 3. 데이터 구조 맞춤
```

**체크리스트**:
- [ ] useClassTextbooks 훅으로 교체
- [ ] 데이터 구조 맞춤 (ClassTextbook → Textbook)
- [ ] 기존 기능 유지 확인
- [ ] 빌드 테스트

---

## Phase 18-G: PDF 압축 기능

### Phase 18-G-1: pdf-lib 설치 및 압축 유틸리티

**명령어**:
```bash
cd frontend && npm install pdf-lib
```

**파일**: `frontend/src/utils/pdfCompressor.ts` (신규)

```typescript
import { PDFDocument } from 'pdf-lib';

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  pageCount: number;
}

export interface CompressionProgress {
  stage: 'loading' | 'analyzing' | 'compressing' | 'saving';
  progress: number;  // 0-100
  message: string;
}

/**
 * PDF 압축 유틸리티
 *
 * 압축 전략:
 * 1. 메타데이터 제거
 * 2. 객체 스트림 압축
 * 3. 중복 객체 제거
 *
 * @param file - 원본 PDF 파일
 * @param onProgress - 진행률 콜백
 * @returns 압축 결과
 */
export async function compressPdf(
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  // 1. PDF 로드
  onProgress?.({ stage: 'loading', progress: 10, message: 'PDF 로딩 중...' });
  const pdfBytes = await file.arrayBuffer();

  // 2. PDF 문서 파싱
  onProgress?.({ stage: 'analyzing', progress: 30, message: 'PDF 분석 중...' });
  const pdfDoc = await PDFDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });

  const pageCount = pdfDoc.getPageCount();

  // 3. 메타데이터 제거
  onProgress?.({ stage: 'compressing', progress: 50, message: '메타데이터 제거 중...' });
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');

  // 4. 압축 저장
  onProgress?.({ stage: 'saving', progress: 80, message: '압축 저장 중...' });
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  onProgress?.({ stage: 'saving', progress: 100, message: '완료' });

  const compressedFile = new File(
    [compressedBytes],
    file.name,
    { type: 'application/pdf' }
  );

  return {
    compressedFile,
    originalSize: file.size,
    compressedSize: compressedFile.size,
    compressionRatio: compressedFile.size / file.size,
    pageCount,
  };
}

/**
 * 파일 크기가 압축이 필요한지 확인
 */
export function needsCompression(file: File, maxSizeMB: number = 50): boolean {
  return file.size > maxSizeMB * 1024 * 1024;
}
```

**체크리스트**:
- [ ] pdf-lib 설치
- [ ] pdfCompressor.ts 생성
- [ ] compressPdf 함수 구현
- [ ] needsCompression 함수 구현
- [ ] 타입 정의

---

### Phase 18-G-2: 압축 진행률 컴포넌트

**파일**: `frontend/src/components/admin/textbook/CompressionProgress.tsx` (신규)

```typescript
interface CompressionProgressProps {
  originalSize: number;
  progress: CompressionProgress;
  estimatedSize?: number;
}

/**
 * PDF 압축 진행률 표시
 * - 현재 단계 표시
 * - 진행률 바
 * - 예상 압축 크기
 */
```

**UI 구조**:
```
┌─────────────────────────────────────────────────────────────┐
│ PDF 압축 중...                                              │
│                                                             │
│  원본 크기: 85.2 MB                                         │
│                                                             │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  45%       │
│                                                             │
│  📊 메타데이터 제거 중...                                    │
│                                                             │
│  예상 압축 크기: ~42 MB (50% 감소)                           │
└─────────────────────────────────────────────────────────────┘
```

**체크리스트**:
- [ ] CompressionProgress 컴포넌트 생성
- [ ] 진행률 바 UI
- [ ] 단계별 메시지 표시

---

### Phase 18-G-3: 업로드 모달에 압축 통합

**파일**: `frontend/src/components/admin/textbook/TextbookUploadModal.tsx` (수정)

```typescript
// 추가할 로직:
// 1. 파일 선택 시 크기 확인
// 2. 50MB 초과 시 자동 압축 실행
// 3. 압축 진행률 표시
// 4. 압축 완료 후 업로드

const handleFileSelect = async (file: File) => {
  if (needsCompression(file)) {
    setIsCompressing(true);
    const result = await compressPdf(file, setCompressionProgress);
    setSelectedFile(result.compressedFile);
    setCompressionResult(result);
    setIsCompressing(false);
  } else {
    setSelectedFile(file);
  }
};
```

**체크리스트**:
- [ ] needsCompression 체크 추가
- [ ] 자동 압축 로직 추가
- [ ] CompressionProgress 컴포넌트 연동
- [ ] 압축 결과 표시 (원본 크기 vs 압축 크기)
- [ ] 빌드 테스트

---

## 실행 순서 요약

```
Phase 18-E: 교재 관리 페이지
├── 18-E-1: 타입 및 훅 확장
├── 18-E-2: 교재 목록 컴포넌트
├── 18-E-3: 교재 업로드 모달
└── 18-E-4: 교재 관리 페이지
         ↓
Phase 18-F: 반-교재 연결
├── 18-F-1: 반-교재 연결 타입 및 훅
├── 18-F-2: 교재 선택 모달
├── 18-F-3: 반 설정에 교재 관리 추가
└── 18-F-4: ProgressModal 수정
         ↓
Phase 18-G: PDF 압축
├── 18-G-1: pdf-lib 설치 및 압축 유틸리티
├── 18-G-2: 압축 진행률 컴포넌트
└── 18-G-3: 업로드 모달에 압축 통합
         ↓
       빌드 테스트
```

---

## 파일 생성/수정 목록

### 신규 파일

| 파일 | Phase | 설명 |
|------|-------|------|
| `hooks/useAllTextbooks.ts` | 18-E-1 | 전체 교재 관리 훅 |
| `components/admin/textbook/TextbookList.tsx` | 18-E-2 | 교재 목록 테이블 |
| `components/admin/textbook/TextbookUploadModal.tsx` | 18-E-3 | 교재 업로드 모달 |
| `pages/admin/TextbookManagement.tsx` | 18-E-4 | 교재 관리 페이지 |
| `hooks/useClassTextbooks.ts` | 18-F-1 | 반-교재 연결 훅 |
| `components/admin/class/TextbookSelectorModal.tsx` | 18-F-2 | 교재 선택 모달 |
| `components/admin/class/ClassTextbookSection.tsx` | 18-F-3 | 반 설정 교재 섹션 |
| `utils/pdfCompressor.ts` | 18-G-1 | PDF 압축 유틸리티 |
| `components/admin/textbook/CompressionProgress.tsx` | 18-G-2 | 압축 진행률 |

### 수정 파일

| 파일 | Phase | 변경 내용 |
|------|-------|----------|
| `types/textbook.ts` | 18-E-1, 18-F-1 | 타입 추가 |
| `App.tsx` | 18-E-4 | 라우터 추가 |
| `components/layout/AdminSidebar.tsx` | 18-E-4 | 메뉴 추가 |
| `modals/ProgressModal.tsx` | 18-F-4 | 훅 교체 |
| `textbook/TextbookUploadModal.tsx` | 18-G-3 | 압축 통합 |

---

## 테스트 체크리스트

### Phase 18-E 완료 후
- [ ] 교재 관리 페이지 접근 가능
- [ ] 교재 목록 표시
- [ ] 교재 추가 동작
- [ ] 교재 삭제 동작 (사용 중인 교재 경고)

### Phase 18-F 완료 후
- [ ] 반 설정에서 교재 선택 가능
- [ ] 선택한 교재 목록 표시
- [ ] 교재 연결 해제 동작
- [ ] ProgressModal에서 연결된 교재 PDF 보기

### Phase 18-G 완료 후
- [ ] 50MB 초과 파일 업로드 시 자동 압축
- [ ] 압축 진행률 표시
- [ ] 압축 전/후 크기 비교 표시
- [ ] 압축된 PDF 정상 동작

---

*작성일: 2025-12-21*
*Stage 18 확장 개발 계획*
