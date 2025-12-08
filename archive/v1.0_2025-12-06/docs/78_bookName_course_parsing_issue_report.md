# 책이름/과정 기본값 문제 분석 리포트

**작성일**: 2025-12-03
**심각도**: Medium (기능 동작하나 UX 불편)
**상태**: 근본 원인 분석 완료

---

## 1. 문제 현상

### 현재 상태 (문제)
```
책이름: "고1_공통수학_베이직쎈_문제"  ← document_id 전체!
과정:   ""                            ← 비어있음
```

### 원하는 상태
```
책이름: "베이직쎈"      ← 시리즈명만
과정:   "공통수학1"     ← 과정명만
```

---

## 2. 데이터 흐름 분석

### 2.1 현재 저장된 데이터

**파일**: `dataset_root/documents/고1_공통수학1_베이직쎈_문제/settings.json`

```json
{
  "defaultBookName": "고1_공통수학_베이직쎈_문제",  // ← 문제!
  "defaultCourse": "",                              // ← 비어있음!
  "document_id": "고1_공통수학1_베이직쎈_문제"
}
```

### 2.2 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. PDF 업로드 (UploadNamingModal)                               │
├─────────────────────────────────────────────────────────────────┤
│ 입력:                                                           │
│   학년: "고1"                                                   │
│   과정: "공통수학1"                                             │
│   시리즈: "베이직쎈"                                            │
│   타입: "문제"                                                  │
│                                                                 │
│ 생성:                                                           │
│   document_id = "고1_공통수학1_베이직쎈_문제"                    │
│                                                                 │
│ ⚠️ 문제: 개별 필드(grade, course, series)가 저장되지 않음!      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. settings.json 초기화 (문서 첫 열기 시)                        │
├─────────────────────────────────────────────────────────────────┤
│ DocumentSettingsModal에서 사용자가 직접 입력                     │
│                                                                 │
│ 기본값 제안: document_id 그대로                                  │
│   → "고1_공통수학1_베이직쎈_문제"                                │
│                                                                 │
│ ⚠️ 문제: document_id를 파싱하여 시리즈/과정 분리 안함!          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. 그룹 생성 시 (GroupPanel)                                    │
├─────────────────────────────────────────────────────────────────┤
│ bookName = documentSettings.defaultBookName                     │
│          = "고1_공통수학_베이직쎈_문제"                          │
│                                                                 │
│ course = documentSettings.defaultCourse                         │
│        = ""                                                     │
│                                                                 │
│ ⚠️ 결과: 잘못된 값이 그대로 사용됨!                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 근본 원인

### 원인 1: 메타데이터 미저장 (주요 원인)

**PDF 업로드 시**:
```typescript
// UploadNamingModal.tsx
const previewName = `${grade}_${course}_${series}_${type}`;
// "고1_공통수학1_베이직쎈_문제"

await uploadPDF(file, previewName);  // document_id로만 전달
// grade, course, series, type 개별 저장 안함!
```

**meta.json**에 저장되는 것:
```json
{
  "document_id": "고1_공통수학1_베이직쎈_문제",
  "total_pages": 191,
  "status": "ready"
  // ⚠️ grade, course, series, type 필드 없음!
}
```

### 원인 2: document_id 파싱 부재

**DocumentSettingsModal** 또는 **settings.json 초기화** 시:
- document_id에서 시리즈/과정을 파싱하는 로직 없음
- 사용자가 직접 입력해야 함 → 대부분 document_id 전체를 복사

### 원인 3: 기본값 로직 부재

**documents.py의 기본 settings**:
```python
default_settings = {
    "document_id": document_id,
    "pageOffset": { "startPage": 1, "increment": 1 },
    # defaultBookName, defaultCourse 기본값 없음!
}
```

---

## 4. 해결 방안

### 방안 A: document_id 파싱 (즉시 적용 가능)

document_id 형식: `{학년}_{과정}_{시리즈}_{타입}`

```typescript
function parseDocumentId(documentId: string): {
  grade: string;
  course: string;
  series: string;
  type: string;
} {
  const parts = documentId.split('_');
  // 마지막 = 타입 (문제/해설)
  // 마지막에서 두번째 = 시리즈
  // 첫번째 = 학년
  // 나머지 = 과정

  const type = parts[parts.length - 1];  // "문제" 또는 "해설"
  const series = parts[parts.length - 2];  // "베이직쎈"
  const grade = parts[0];  // "고1"
  const course = parts.slice(1, -2).join('_');  // "공통수학1"

  return { grade, course, series, type };
}
```

**적용 위치**:
1. `DocumentSettingsModal` 초기값 설정
2. `documents.py` 기본 settings 생성 시

### 방안 B: 메타데이터 구조화 (Phase 34-B)

PDF 업로드 시 meta.json에 구조화된 메타데이터 저장:

```json
{
  "document_id": "고1_공통수학1_베이직쎈_문제",
  "metadata": {
    "grade": "고1",
    "course": "공통수학1",
    "series": "베이직쎈",
    "type": "문제"
  }
}
```

---

## 5. 권장 해결 순서

### 즉시 수정 (Phase 34-A-2): document_id 파싱

| 단계 | 작업 | 파일 |
|------|------|------|
| 1 | parseDocumentId 유틸리티 함수 생성 | `utils/documentUtils.ts` |
| 2 | DocumentSettingsModal 초기값에 적용 | `DocumentSettingsModal.tsx` |
| 3 | settings.json 기본값 생성 시 적용 | `documents.py` |
| 4 | 기존 settings.json 마이그레이션 (선택) | 스크립트 |

**예상 시간**: 30분

### 장기 해결 (Phase 34-B): 메타데이터 구조화

이미 계획된 Phase 34-B에서 처리

---

## 6. 파싱 로직 상세

### document_id 패턴 분석

```
고1_공통수학1_베이직쎈_문제
│    │        │      │
│    │        │      └─ 타입 (마지막)
│    │        └─ 시리즈 (마지막에서 2번째)
│    └─ 과정 (중간, 여러 단어 가능)
└─ 학년 (첫번째)

예외 케이스:
- "중1_수학_쎈_문제" → 과정이 한 단어
- "고2_수학1_블랙라벨_해설" → 과정이 한 단어
- "고1_공통수학1_2_베이직쎈_문제" → 과정에 언더스코어 포함 가능?
```

### 안전한 파싱 로직

```typescript
export function parseDocumentId(documentId: string): {
  grade: string;
  course: string;
  series: string;
  type: string;
} | null {
  const parts = documentId.split('_');

  // 최소 4개 부분 필요: 학년_과정_시리즈_타입
  if (parts.length < 4) return null;

  // 타입 검증 (마지막)
  const type = parts[parts.length - 1];
  if (type !== '문제' && type !== '해설') return null;

  // 학년 검증 (첫번째)
  const grade = parts[0];
  const validGrades = ['고1', '고2', '고3', '중1', '중2', '중3'];
  if (!validGrades.includes(grade)) return null;

  // 시리즈 (마지막에서 2번째)
  const series = parts[parts.length - 2];

  // 과정 (나머지)
  const course = parts.slice(1, -2).join('_');

  return { grade, course, series, type };
}
```

---

## 7. 테스트 케이스

| document_id | grade | course | series | type |
|-------------|-------|--------|--------|------|
| `고1_공통수학1_베이직쎈_문제` | 고1 | 공통수학1 | 베이직쎈 | 문제 |
| `고2_미적분_블랙라벨_해설` | 고2 | 미적분 | 블랙라벨 | 해설 |
| `중3_수학_쎈_문제` | 중3 | 수학 | 쎈 | 문제 |
| `고1_공통수학1_공통수학2_베이직쎈_문제` | 고1 | 공통수학1_공통수학2 | 베이직쎈 | 문제 |

---

## 8. 결론

### 근본 원인
1. PDF 업로드 시 메타데이터(grade, course, series)가 구조화되어 저장되지 않음
2. document_id를 파싱하여 기본값을 추출하는 로직 없음
3. 사용자가 설정 모달에서 document_id 전체를 그대로 입력

### 권장 조치
**Phase 34-A-2**로 document_id 파싱 로직을 추가하여 즉시 해결

### 예상 효과
- 책이름 필드: "베이직쎈" (시리즈명만)
- 과정 필드: "공통수학1" (과정명만)
- 사용자 수동 입력 불필요

---

*승인 시 "Phase 34-A-2 진행해줘"로 실행*
