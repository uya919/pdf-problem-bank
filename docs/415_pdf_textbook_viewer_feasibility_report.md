# 415. PDF 교재 업로드 및 웹 뷰어 연구 리포트

> Stage 18: 진도 기록 시 PDF 교재 페이지 확인 기능

---

## 1. 요청 기능 요약

| 항목 | 내용 |
|------|------|
| **목적** | 강사가 진도 기록 시 "몇 페이지~몇 페이지" 기억이 안 날 때 교재 PDF를 확인 |
| **업로드** | 반별로 최대 2권의 PDF 교재 업로드 |
| **뷰어** | 진도 기록 모달(ProgressModal)에서 웹 PDF 뷰어로 교재 확인 |
| **결과** | "17~20페이지" 형식으로 진도/숙제 범위 입력 |

---

## 2. 현재 시스템 분석

### 2.1 진도 기록 모달 (ProgressModal.tsx)

```
현재 구조:
├── 지난 수업 카드 (lastProgress)
│   ├── 진도: 교재명 + 페이지
│   ├── 숙제: 교재명 + 페이지
│   └── 메모
│
├── 오늘 수업 폼
│   ├── 단원명 입력
│   ├── 진도 (교재 자동완성 + 페이지)  ← 🎯 여기서 PDF 확인 필요
│   ├── 숙제 (교재 자동완성 + 페이지)  ← 🎯 여기서도 확인 필요
│   └── 비고
│
└── 시험 섹션 (학생별 점수)
```

### 2.2 교재 자동완성 (TextbookAutocomplete.tsx)

- 현재: 교재 목록(`textbooks` props)에서 검색/선택
- 확장 필요: 선택된 교재의 PDF 열기 버튼 추가

### 2.3 반(Class) 구조

```typescript
interface ClassWithDetails {
  id: string;
  name: string;
  // ... 기존 필드
  // 추가 필요:
  // textbook_pdf_1?: string;  // PDF 파일 URL
  // textbook_pdf_2?: string;
}
```

---

## 3. 기술적 구현 방안

### 3.1 PDF 저장소

| 옵션 | 장점 | 단점 |
|------|------|------|
| **Supabase Storage** (권장) | 통합 관리, 쉬운 API | 용량 제한 (무료 1GB) |
| Cloudflare R2 | 저렴, 대용량 | 별도 설정 필요 |
| 직접 서버 | 완전 제어 | 관리 부담 |

**권장: Supabase Storage**
- 이미 Supabase 사용 중
- PDF 당 평균 5~20MB, 반당 2권 = 20~40MB
- 10개 반 기준 200~400MB → 무료 플랜 범위

### 3.2 웹 PDF 뷰어 라이브러리

| 라이브러리 | 특징 | 번들 크기 |
|-----------|------|----------|
| **react-pdf** (권장) | React 최적화, 간단한 API | ~500KB |
| pdf.js | Mozilla 공식, 가장 강력 | ~800KB |
| @react-pdf/renderer | PDF 생성용 (목적 다름) | - |
| pdfjs-dist + 커스텀 | 유연하지만 복잡 | ~300KB (코어만) |

**권장: react-pdf**
```tsx
import { Document, Page } from 'react-pdf';

<Document file={pdfUrl}>
  <Page pageNumber={currentPage} />
</Document>
```

### 3.3 UI/UX 흐름

```
1. 진도 기록 모달 열림
   ↓
2. "진도" 또는 "숙제" 입력 행에서 📖 버튼 클릭
   ↓
3. PDF 뷰어 모달/패널 열림
   - 썸네일 그리드 또는 페이지 스크롤
   - 페이지 번호 표시
   ↓
4. 원하는 페이지 범위 선택 (시작/끝)
   ↓
5. "선택" 버튼 → 페이지 번호 자동 입력
```

---

## 4. 데이터 모델 설계

### 4.1 Supabase 테이블 확장

```sql
-- 기존 classes 테이블에 컬럼 추가
ALTER TABLE classes
ADD COLUMN textbook_pdf_1_url TEXT,
ADD COLUMN textbook_pdf_1_name TEXT,
ADD COLUMN textbook_pdf_2_url TEXT,
ADD COLUMN textbook_pdf_2_name TEXT;
```

### 4.2 Storage 버킷 구조

```
supabase-storage/
└── textbooks/
    ├── class_{class_id}/
    │   ├── textbook_1.pdf
    │   └── textbook_2.pdf
    └── ...
```

### 4.3 TypeScript 타입

```typescript
interface ClassTextbook {
  id: string;
  classId: string;
  slot: 1 | 2;          // 1번 교재 또는 2번 교재
  fileName: string;     // "베이직쎈 고1.pdf"
  displayName: string;  // "베이직쎈"
  fileUrl: string;      // Supabase Storage URL
  fileSize: number;     // bytes
  pageCount?: number;   // 총 페이지 수 (옵션)
  uploadedAt: string;
  uploadedBy: string;   // teacher_id
}
```

---

## 5. 컴포넌트 설계

### 5.1 새로 필요한 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `PdfViewerModal` | PDF 뷰어 모달 (페이지 탐색, 선택) |
| `PdfPageGrid` | 페이지 썸네일 그리드 뷰 |
| `TextbookUploader` | PDF 업로드 (반 설정 화면) |
| `TextbookSelector` | 교재 선택 + PDF 열기 버튼 |

### 5.2 PdfViewerModal 기능

```tsx
interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  textbookName: string;
  onSelectRange: (startPage: number, endPage: number) => void;
}

// 기능:
// - 페이지 네비게이션 (이전/다음, 직접 입력)
// - 줌 인/아웃
// - 페이지 범위 선택 모드
// - 썸네일 그리드 뷰 (선택사항)
```

### 5.3 ProgressModal 수정

```tsx
// 기존 ProgressRow에 PDF 버튼 추가
<ProgressRow
  textbook={formData.textbook}
  startPage={formData.startPage}
  endPage={formData.endPage}
  onOpenPdf={() => setShowPdfViewer(true)}  // 🆕 추가
  ...
/>
```

---

## 6. 구현 우선순위

### Phase 18-A: 기반 작업 (Day 1)
1. Supabase Storage 버킷 생성
2. react-pdf 설치 및 기본 설정
3. ClassTextbook 타입 정의

### Phase 18-B: 업로드 기능 (Day 2)
4. TextbookUploader 컴포넌트
5. 반 설정/관리 화면에 업로드 UI 추가
6. Supabase Storage 업로드 API

### Phase 18-C: 뷰어 기능 (Day 3-4)
7. PdfViewerModal 컴포넌트
8. 페이지 네비게이션
9. 페이지 범위 선택

### Phase 18-D: 통합 (Day 5)
10. ProgressModal에 PDF 버튼 추가
11. 선택한 범위 자동 입력
12. 테스트 및 최적화

---

## 7. 우려 사항 및 해결 방안

### 7.1 파일 크기 문제

| 우려 | 영향 | 해결 방안 |
|------|------|----------|
| PDF 크기 (5~50MB) | 업로드/다운로드 시간 | 업로드 시 압축, 진행률 표시 |
| 모바일 데이터 사용 | 사용자 불만 | PDF 캐싱, 필요 시만 로드 |

### 7.2 렌더링 성능

| 우려 | 영향 | 해결 방안 |
|------|------|----------|
| 많은 페이지 PDF | 메모리 과다 사용 | 가상 스크롤, 페이지 단위 로드 |
| 저사양 기기 | 느린 렌더링 | 썸네일 품질 조절, lazy loading |

### 7.3 보안

| 우려 | 영향 | 해결 방안 |
|------|------|----------|
| PDF 무단 접근 | 저작권 문제 | Supabase RLS, signed URL |
| URL 노출 | 외부 공유 가능 | 만료 시간 있는 signed URL |

### 7.4 UX 고려사항

| 우려 | 영향 | 해결 방안 |
|------|------|----------|
| PDF 없는 반 | 기능 무용 | 조건부 렌더링, 업로드 안내 |
| 오프라인 환경 | 뷰어 사용 불가 | 오프라인 경고, 마지막 캐시 사용 |

---

## 8. 질문 및 결정 필요 사항

### 🤔 사용자에게 질문

1. **PDF 업로드 권한**
   - 강사도 업로드 가능? 아니면 관리자만?
   - 권장: 관리자만 (저작권, 통일성)

2. **교재 수 제한**
   - 반당 정확히 2권? 또는 유동적?
   - 권장: 2권 고정 (주교재 + 부교재)

3. **썸네일 그리드 vs 단일 페이지**
   - 빠른 탐색 위한 썸네일 그리드 필요?
   - 권장: 단일 페이지 + 슬라이더 (단순함)

4. **페이지 범위 선택 방식**
   - A) 시작/끝 페이지 각각 선택
   - B) 드래그로 범위 선택
   - 권장: A (모바일 친화적)

5. **PDF 미리보기 위치**
   - A) 별도 모달 (전체 화면)
   - B) 사이드 패널 (화면 분할)
   - 권장: A (모바일 호환)

---

## 9. 예상 일정

| Phase | 내용 | 예상 시간 |
|-------|------|----------|
| 18-A | 기반 작업 | 2~3시간 |
| 18-B | 업로드 기능 | 3~4시간 |
| 18-C | 뷰어 기능 | 4~6시간 |
| 18-D | 통합 및 테스트 | 2~3시간 |
| **합계** | | **11~16시간** |

---

## 10. 결론 및 권장 사항

### ✅ 구현 가능성: **높음**

| 항목 | 평가 |
|------|------|
| 기술적 복잡도 | 중간 (react-pdf 사용 시 간단) |
| Supabase 통합 | 용이 (Storage + RLS) |
| UX 설계 | 명확 (기존 모달에 버튼 추가) |
| 모바일 호환 | 주의 필요 (터치 제스처, 성능) |

### 🎯 핵심 권장 사항

1. **react-pdf + Supabase Storage** 조합 권장
2. **단순한 UI 우선**: 썸네일 그리드보다 슬라이더 방식
3. **점진적 기능 추가**: 기본 뷰어 먼저, 고급 기능 나중에
4. **모바일 테스트 필수**: 터치 인터랙션, 성능 확인

### 📝 다음 단계

사용자 확인 후:
1. 단계별 상세 개발 계획 작성
2. Phase 18-A부터 순차 개발

---

*v1.0 - 2025-12-21*
