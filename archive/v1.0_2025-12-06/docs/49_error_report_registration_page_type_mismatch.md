# 에러 리포트: 등록 페이지 문서 목록 표시 실패

**작성일**: 2025-12-02
**심각도**: 🔴 Critical (UI 완전 미작동)
**상태**: 🔧 분석 완료, 수정 필요

---

## 1. 증상

사용자 보고: "PDF 업로드 후 진행되다가 끊긴다"

### 실제 상황

| 단계 | 상태 | 설명 |
|------|------|------|
| PDF 업로드 | ✅ 성공 | `POST /api/pdf/upload → 200 OK` |
| 블록 분석 | ✅ 성공 | 16페이지 전체 분석 완료 |
| 데이터 저장 | ✅ 성공 | 파일시스템에 저장됨 |
| API 응답 | ✅ 성공 | `GET /api/pdf/documents → 200 OK` |
| **UI 표시** | ❌ **실패** | 문서 카드가 표시되지 않음 |

---

## 2. 근본 원인

### 2.1 타입 불일치 (Type Mismatch)

**RegistrationPage.tsx에서 기대하는 타입:**
```typescript
interface DocumentItem {
  id: string;           // ❌ API: document_id
  name: string;         // ❌ API: 없음
  status: DocumentStatus; // ❌ API: 없음
  progress?: number;    // ❌ API: 없음
  totalPages?: number;  // ❌ API: total_pages (camelCase 불일치)
  labeledPages?: number; // ❌ API: 없음
  createdAt: string;    // ❌ API: created_at (타입도 number)
}
```

**API가 실제로 반환하는 타입 (api/client.ts):**
```typescript
interface Document {
  document_id: string;
  total_pages: number;
  analyzed_pages: number;
  created_at: number;  // Unix timestamp
}
```

### 2.2 필드별 불일치 상세

| RegistrationPage 기대 | API 실제 응답 | 문제 |
|----------------------|---------------|------|
| `id` | `document_id` | 필드명 불일치 |
| `name` | (없음) | 필드 누락 |
| `status` | (없음) | 필드 누락 → **필터링 실패** |
| `totalPages` | `total_pages` | camelCase 불일치 |
| `labeledPages` | (없음) | 필드 누락 |
| `createdAt` (string) | `created_at` (number) | 타입 + 필드명 불일치 |

---

## 3. 코드 분석

### 3.1 문제가 되는 코드

**RegistrationPage.tsx:186-192**
```typescript
// 문서를 상태별로 분류
const inProgressDocs = documents?.filter(d =>
  d.status === 'labeling' || d.status === 'ready'  // ❌ d.status는 undefined!
) || [];

const completedDocs = documents?.filter(d =>
  d.status === 'completed'  // ❌ 항상 false
) || [];

const processingDocs = documents?.filter(d =>
  d.status === 'uploading' || d.status === 'processing'  // ❌ 항상 false
) || [];
```

### 3.2 잘못된 타입 캐스팅

**RegistrationPage.tsx:276**
```typescript
document={doc as DocumentItem}  // ❌ 강제 캐스팅, 런타임 에러 유발
```

---

## 4. 영향 범위

| 기능 | 영향 |
|------|------|
| 문서 목록 표시 | ❌ 모든 문서가 표시되지 않음 |
| 라벨링 시작 버튼 | ❌ 문서가 없으므로 버튼도 없음 |
| 진행률 표시 | ❌ labeledPages 없어서 0% 표시 |
| 상태 필터링 | ❌ 모든 필터가 빈 배열 반환 |

---

## 5. 수정 방안

### 5.1 Option A: API 응답 변환 (권장)

RegistrationPage에서 API 응답을 DocumentItem으로 변환:

```typescript
// useDocuments 결과를 DocumentItem으로 매핑
const mappedDocuments = documents?.map(doc => ({
  id: doc.document_id,
  name: doc.document_id,  // document_id를 이름으로 사용
  status: determineStatus(doc),  // analyzed_pages 기반 상태 계산
  totalPages: doc.total_pages,
  labeledPages: 0,  // TODO: API에서 가져오기
  createdAt: new Date(doc.created_at * 1000).toISOString(),
})) || [];

function determineStatus(doc: Document): DocumentStatus {
  if (doc.analyzed_pages === 0) return 'processing';
  if (doc.analyzed_pages < doc.total_pages) return 'processing';
  // TODO: 라벨링 상태 확인 로직 필요
  return 'ready';
}
```

### 5.2 Option B: API 확장

백엔드 API에 누락된 필드 추가:
- `name`: 파일 원본 이름
- `status`: 문서 상태
- `labeled_pages`: 라벨링된 페이지 수

### 5.3 Option C: 타입 통일

두 타입을 하나로 통일하고 전체 코드베이스 수정

---

## 6. 권장 수정 순서

```
1. RegistrationPage.tsx 수정 (즉시 효과)
   - documents를 DocumentItem으로 매핑하는 로직 추가
   - status 판단 로직 구현

2. API 확장 (중기)
   - GET /api/pdf/documents에 name, status 필드 추가
   - labeled_pages 카운트 추가

3. 타입 정리 (장기)
   - DocumentItem과 Document 타입 통합
   - 전체 코드베이스 리팩토링
```

---

## 7. 즉시 적용 가능한 수정

### RegistrationPage.tsx 수정

```typescript
// 기존 코드 (line 186-192)
const inProgressDocs = documents?.filter(d =>
  d.status === 'labeling' || d.status === 'ready'
) || [];

// 수정 코드
const mappedDocs: DocumentItem[] = documents?.map(doc => ({
  id: doc.document_id,
  name: doc.document_id,
  status: doc.analyzed_pages < doc.total_pages ? 'processing' : 'ready',
  totalPages: doc.total_pages,
  labeledPages: 0,
  createdAt: new Date(doc.created_at * 1000).toISOString(),
})) || [];

const processingDocs = mappedDocs.filter(d => d.status === 'processing');
const inProgressDocs = mappedDocs.filter(d => d.status === 'ready');
const completedDocs = mappedDocs.filter(d => d.status === 'completed');
```

---

## 8. 테스트 계획

1. RegistrationPage 수정 후 새로고침
2. 업로드된 문서가 목록에 표시되는지 확인
3. "시작하기" 버튼 클릭 시 라벨링 페이지로 이동하는지 확인
4. 새 PDF 업로드 후 목록에 추가되는지 확인

---

## 9. 관련 파일

| 파일 | 역할 |
|------|------|
| `frontend/src/pages/RegistrationPage.tsx` | 등록 페이지 UI |
| `frontend/src/api/client.ts` | API 타입 정의 |
| `frontend/src/hooks/useDocuments.ts` | 문서 조회 훅 |
| `backend/app/routers/pdf.py` | PDF API 엔드포인트 |

---

## 10. 결론

- **PDF 업로드는 정상 동작** (백엔드 완료)
- **UI가 문서를 표시하지 못함** (프론트엔드 타입 불일치)
- **즉시 수정 가능**: RegistrationPage.tsx에서 데이터 매핑 추가

---

*Phase 21.5에서 UI 재설계 시 기존 API 타입과 맞추지 않아 발생한 문제*
