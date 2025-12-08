# Phase 34: 문제 명명 시스템 개선 - 개발 계획

**작성일**: 2025-12-03
**근거 문서**: [76_problem_naming_system_analysis.md](76_problem_naming_system_analysis.md)

---

## 1. 목표

### 1.1 문제 이름 형식 변경
```
Before: "베이직쎈 - 공통수학1, 13p, 3"
After:  "베이직쎈_공통수학1_p13_3번"
```

### 1.2 과정 동적 추가
```
Before: 코드에 하드코딩 ['공통수학1', '공통수학2', '수학']
After:  설정 파일에서 관리, 사용자가 추가 가능
```

### 1.3 메타데이터 구조화 (보너스)
```
Before: document_id = "고1_공통수학1_베이직쎈_문제" (파싱 필요)
After:  meta.json에 구조화된 메타데이터 저장
```

---

## 2. 단계별 실행 계획

### Phase 34-A: 문제 이름 형식 변경 (40분)

#### Step A-1: GroupPanel displayName 형식 변경
**파일**: `frontend/src/components/GroupPanel.tsx`

```typescript
// Before (saveEdit 함수 내)
const displayName =
  `${editForm.bookName} - ${editForm.course || ''}, ${editForm.page}p, ${editForm.problemNumber}`;

// After
const displayName =
  `${editForm.bookName}_${editForm.course || ''}_p${editForm.page}_${editForm.problemNumber}번`;
```

#### Step A-2: 백엔드 displayName 형식 변경
**파일**: `backend/app/routers/work_sessions.py`

```python
# sync_problems_from_groups 함수 내
# Before
display_name = f"{display_name}. {problem_number}"

# After
book_name = problem_info.get("bookName", "")
course = problem_info.get("course", "")
page = problem_info.get("page", "")
display_name = f"{book_name}_{course}_p{page}_{problem_number}번"
```

#### Step A-3: 빈 필드 처리
```typescript
// 빈 필드가 있을 때 언더스코어 중복 방지
const parts = [
  editForm.bookName,
  editForm.course,
  `p${editForm.page}`,
  `${editForm.problemNumber}번`
].filter(Boolean);
const displayName = parts.join('_');
```

#### Step A-4: 테스트
- [ ] 그룹 생성 후 displayName 형식 확인
- [ ] 작업 세션에서 문제 이름 표시 확인

---

### Phase 34-B: 메타데이터 구조화 (1시간 40분)

#### Step B-1: meta.json 스키마 확장
**파일**: `backend/app/routers/pdf.py`

```python
# upload_pdf 함수에서 메타데이터 저장
meta = {
    "document_id": document_id,
    "total_pages": total_pages,
    # Phase 34-B: 구조화된 메타데이터 추가
    "metadata": {
        "grade": grade,        # "고1"
        "course": course,      # "공통수학1"
        "series": series,      # "베이직쎈"
        "type": doc_type,      # "문제" | "해설"
    },
    "created_at": time.time(),
    "status": "processing"
}
```

#### Step B-2: 업로드 API 파라미터 확장
**파일**: `frontend/src/api/client.ts`

```typescript
// uploadPDF 함수 확장
uploadPDF: async (
  file: File,
  metadata?: {
    documentId?: string;
    grade?: string;
    course?: string;
    series?: string;
    type?: string;
  }
): Promise<UploadResponse>
```

#### Step B-3: UploadNamingModal에서 메타데이터 전송
**파일**: `frontend/src/components/main/UploadNamingModal.tsx`

```typescript
// handleUpload 함수 수정
const handleUpload = async () => {
  await uploadPDF({
    file,
    documentId: previewName,
    grade,
    course,
    series,
    type,
  });
};
```

#### Step B-4: 그룹 생성 시 기본값 자동 적용
**파일**: `frontend/src/components/GroupPanel.tsx`

```typescript
// startEditing에서 문서 메타데이터 활용
const startEditing = (group: ProblemGroup) => {
  setEditForm({
    bookName: group.problemInfo?.bookName || documentMetadata?.series || defaultBookName,
    course: group.problemInfo?.course || documentMetadata?.course || defaultCourse,
    // ...
  });
};
```

#### Step B-5: 메타데이터 조회 API
**파일**: `backend/app/routers/documents.py`

```python
@router.get("/{document_id}/metadata")
async def get_document_metadata(document_id: str):
    """문서의 구조화된 메타데이터 조회"""
    meta_file = doc_dir / "meta.json"
    meta = load_json(meta_file)
    return meta.get("metadata", {})
```

---

### Phase 34-C: 과정 동적 추가 (2시간 10분)

#### Step C-1: 설정 파일 생성
**파일**: `dataset_root/config/courses.json`

```json
{
  "version": 1,
  "defaultCourses": {
    "고1": ["공통수학1", "공통수학2", "수학"],
    "고2": ["미적분", "확률과통계", "기하", "수학I", "수학II"],
    "고3": ["미적분", "확률과통계", "기하", "수학I", "수학II"],
    "중1": ["수학"],
    "중2": ["수학"],
    "중3": ["수학"]
  },
  "customCourses": {}
}
```

#### Step C-2: 백엔드 API 구현
**파일**: `backend/app/routers/config.py` (신규)

```python
@router.get("/courses")
async def get_courses():
    """과정 목록 조회 (기본 + 사용자 추가)"""

@router.post("/courses")
async def add_course(grade: str, course: str):
    """과정 추가"""

@router.delete("/courses/{grade}/{course}")
async def delete_course(grade: str, course: str):
    """사용자 추가 과정 삭제"""
```

#### Step C-3: 프론트엔드 API 연동
**파일**: `frontend/src/api/client.ts`

```typescript
// 과정 목록 조회
getCourses: async (): Promise<CoursesConfig> => {
  const response = await apiClient.get('/api/config/courses');
  return response.data;
},

// 과정 추가
addCourse: async (grade: string, course: string): Promise<void> => {
  await apiClient.post('/api/config/courses', { grade, course });
},
```

#### Step C-4: UploadNamingModal 동적 과정 로딩
**파일**: `frontend/src/components/main/UploadNamingModal.tsx`

```typescript
// 하드코딩된 COURSES 제거
// const COURSES = { ... };  // 삭제

// API에서 동적 로딩
const { data: coursesConfig } = useQuery({
  queryKey: ['courses'],
  queryFn: () => api.getCourses(),
});

const availableCourses = useMemo(() => {
  if (!coursesConfig) return [];
  const defaults = coursesConfig.defaultCourses[grade] || [];
  const customs = coursesConfig.customCourses[grade] || [];
  return [...defaults, ...customs];
}, [coursesConfig, grade]);
```

#### Step C-5: 과정 추가 UI
**파일**: `frontend/src/components/main/UploadNamingModal.tsx`

```typescript
// 과정 선택 드롭다운에 "새 과정 추가" 옵션
<Select value={course} onChange={setCourse}>
  {availableCourses.map(c => (
    <option key={c} value={c}>{c}</option>
  ))}
  <option value="__add_new__">+ 새 과정 추가...</option>
</Select>

{showAddCourseModal && (
  <AddCourseModal
    grade={grade}
    onAdd={handleAddCourse}
    onClose={() => setShowAddCourseModal(false)}
  />
)}
```

---

## 3. 파일 수정 목록

### Phase 34-A
| 파일 | 작업 |
|------|------|
| `frontend/src/components/GroupPanel.tsx` | displayName 형식 변경 |
| `backend/app/routers/work_sessions.py` | displayName 형식 변경 |

### Phase 34-B
| 파일 | 작업 |
|------|------|
| `backend/app/routers/pdf.py` | 메타데이터 저장 로직 |
| `frontend/src/api/client.ts` | uploadPDF 파라미터 확장 |
| `frontend/src/components/main/UploadNamingModal.tsx` | 메타데이터 전송 |
| `frontend/src/components/GroupPanel.tsx` | 기본값 자동 적용 |
| `backend/app/routers/documents.py` | 메타데이터 조회 API |

### Phase 34-C
| 파일 | 작업 |
|------|------|
| `dataset_root/config/courses.json` | 설정 파일 생성 |
| `backend/app/routers/config.py` | 신규 라우터 |
| `backend/app/main.py` | 라우터 등록 |
| `frontend/src/api/client.ts` | 과정 API 추가 |
| `frontend/src/components/main/UploadNamingModal.tsx` | 동적 로딩 + 추가 UI |

---

## 4. 체크리스트

### Phase 34-A: 문제 이름 형식 변경
```
[ ] Step A-1: GroupPanel displayName 형식 변경
[ ] Step A-2: 백엔드 displayName 형식 변경
[ ] Step A-3: 빈 필드 처리 로직
[ ] Step A-4: 테스트
```

### Phase 34-B: 메타데이터 구조화
```
[ ] Step B-1: meta.json 스키마 확장
[ ] Step B-2: 업로드 API 파라미터 확장
[ ] Step B-3: UploadNamingModal 메타데이터 전송
[ ] Step B-4: 그룹 생성 시 기본값 자동 적용
[ ] Step B-5: 메타데이터 조회 API
[ ] 테스트
```

### Phase 34-C: 과정 동적 추가
```
[ ] Step C-1: courses.json 설정 파일 생성
[ ] Step C-2: 백엔드 API 구현
[ ] Step C-3: 프론트엔드 API 연동
[ ] Step C-4: UploadNamingModal 동적 로딩
[ ] Step C-5: 과정 추가 UI
[ ] 테스트
```

---

## 5. 예상 소요 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| **34-A** | 문제 이름 형식 변경 | 40분 |
| **34-B** | 메타데이터 구조화 | 1시간 40분 |
| **34-C** | 과정 동적 추가 | 2시간 10분 |
| **합계** | | **약 4시간 30분** |

---

## 6. 권장 실행 순서

```
┌────────────────────────────────────────────┐
│ Phase 34-A: 즉시 효과 (40분)               │
│ - displayName 형식만 변경                  │
│ - 바로 "베이직쎈_공통수학1_p13_3번" 확인    │
└────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────┐
│ Phase 34-B: 데이터 구조 개선 (1시간 40분)   │
│ - 그룹 생성 시 자동 기본값 적용             │
│ - 매번 시리즈/과정 입력 불필요              │
└────────────────────────────────────────────┘
                     ↓
┌────────────────────────────────────────────┐
│ Phase 34-C: 과정 추가 기능 (2시간 10분)     │
│ - 새 과정이 필요할 때 실행                  │
│ - 선택적 구현                              │
└────────────────────────────────────────────┘
```

---

## 7. 테스트 시나리오

### Phase 34-A 테스트
1. 기존 문서에서 새 그룹 생성
2. 문항 정보 입력 후 저장
3. displayName이 `시리즈_과정_p페이지_번호번` 형식인지 확인
4. 작업 세션에서 문제 목록 표시 확인

### Phase 34-B 테스트
1. 새 PDF 업로드 (학년, 과정, 시리즈 입력)
2. 그룹 생성 시 시리즈/과정이 자동으로 채워지는지 확인
3. meta.json에 metadata 필드 저장 확인

### Phase 34-C 테스트
1. 업로드 모달에서 과정 목록이 API에서 로드되는지 확인
2. "새 과정 추가" 클릭 → 새 과정 입력
3. 추가한 과정이 드롭다운에 나타나는지 확인
4. 다른 브라우저에서도 추가된 과정 보이는지 확인

---

*승인 시 "Phase 34-A 진행해줘"로 실행*
