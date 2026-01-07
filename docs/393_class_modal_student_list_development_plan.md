# 393. 반 관리 모달 학생 목록 추가 개발 계획

> 작성일: 2025-12-19
> 기반 리포트: [392_class_modal_student_list_research.md](392_class_modal_student_list_research.md)
> 목업: [mockups/class_modal_with_students.html](mockups/class_modal_with_students.html)

---

## 1. 개요

### 목표
- 반 수정 모달에 **학생 목록 탭** 추가
- 토스 스타일 탭 UI 적용
- 학생 카드 레이아웃 구현

### 예상 결과
```
┌────────────────────────────────────────┐
│ 고1 국어 심화반                    [×]  │
│ 🟢 국어 | 담당: 이한솔 | 학생 5명      │
├────────────────────────────────────────┤
│ [정보 수정]  [학생 (5)]                │ ← 탭
├────────────────────────────────────────┤
│  (탭 내용)                              │
└────────────────────────────────────────┘
```

---

## 2. 수정 파일 목록

| 파일 | 작업 | 설명 |
|------|------|------|
| `api/classes.ts` | 수정 | `getStudentsByClass` 함수 추가 |
| `hooks/useClasses.ts` | 수정 | `useClassStudents` 훅 추가 |
| `components/admin/classes/EditClassModal.tsx` | 수정 | 탭 UI + 헤더 요약 추가 |
| `components/admin/classes/ClassStudentsTab.tsx` | **신규** | 학생 목록 탭 컴포넌트 |
| `components/admin/classes/index.ts` | 수정 | export 추가 |

---

## 3. Phase 1: API 및 훅 추가

### 3.1 api/classes.ts - getStudentsByClass 함수

```typescript
/**
 * 반에 등록된 학생 목록 조회
 */
export interface ClassStudent {
  id: string;
  name: string;
  phone: string | null;
  grade_name: string | null;
  enrolled_at: string;
}

export async function getStudentsByClass(classId: string): Promise<ClassStudent[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select(`
      id,
      enrolled_at,
      students (
        id,
        name,
        phone,
        grades (name)
      )
    `)
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;

  // 데이터 변환
  return (data || []).map((enrollment: any) => ({
    id: enrollment.students?.id || enrollment.id,
    name: enrollment.students?.name || '이름 없음',
    phone: enrollment.students?.phone || null,
    grade_name: enrollment.students?.grades?.name || null,
    enrolled_at: enrollment.enrolled_at,
  }));
}
```

### 3.2 hooks/useClasses.ts - useClassStudents 훅

```typescript
/**
 * 반별 학생 목록 조회 훅
 */
export function useClassStudents(classId: string | null) {
  return useQuery({
    queryKey: ['classStudents', classId],
    queryFn: () => getStudentsByClass(classId!),
    enabled: !!classId,
    staleTime: 30 * 1000, // 30초 캐시
  });
}
```

### 3.3 테스트 체크리스트
- [ ] `getStudentsByClass` 함수가 정상 동작
- [ ] enrollments 테이블에서 학생 정보 조인 성공
- [ ] 빈 결과 시 빈 배열 반환

---

## 4. Phase 2: 학생 목록 탭 컴포넌트

### 4.1 ClassStudentsTab.tsx (신규 파일)

```typescript
/**
 * 반 학생 목록 탭
 * - 학생 카드 리스트
 * - 검색 기능
 * - 빈 상태 처리
 */
import { useState, useMemo } from 'react';
import { useClassStudents } from '../../../hooks/useClasses';

interface ClassStudentsTabProps {
  classId: string;
}

// 연락처 마스킹
function maskPhone(phone: string | null): string {
  if (!phone) return '-';
  // 010-1234-5678 → 010-1234-****
  return phone.replace(/(\d{4})$/, '****');
}

// 날짜 포맷
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// 아바타 색상 (이름 첫 글자 기반)
function getAvatarColor(name: string): { bg: string; text: string } {
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-600' },
    { bg: 'bg-pink-100', text: 'text-pink-600' },
    { bg: 'bg-green-100', text: 'text-green-600' },
    { bg: 'bg-purple-100', text: 'text-purple-600' },
    { bg: 'bg-orange-100', text: 'text-orange-600' },
    { bg: 'bg-teal-100', text: 'text-teal-600' },
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function ClassStudentsTab({ classId }: ClassStudentsTabProps) {
  const { data: students, isLoading, error } = useClassStudents(classId);
  const [searchQuery, setSearchQuery] = useState('');

  // 검색 필터링
  const filteredStudents = useMemo(() => {
    if (!students) return [];
    if (!searchQuery.trim()) return students;

    const query = searchQuery.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(query));
  }, [students, searchQuery]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
        <p className="text-grey-500 mt-2 text-sm">학생 목록 불러오는 중...</p>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">학생 목록을 불러올 수 없습니다</p>
        <p className="text-sm text-grey-400 mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  // 빈 상태
  if (!students?.length) {
    return (
      <div className="p-8 text-center">
        <div className="text-5xl mb-4">👥</div>
        <p className="text-grey-500 mb-4">등록된 학생이 없습니다</p>
        <button className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600">
          학생 배정하기
        </button>
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* 학생 수 & 검색 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-grey-500">총 {students.length}명</span>
        <div className="relative">
          <input
            type="text"
            placeholder="학생 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-sm border border-grey-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grey-400 text-xs">🔍</span>
        </div>
      </div>

      {/* 학생 리스트 */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredStudents.map((student) => {
          const avatarColor = getAvatarColor(student.name);

          return (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 bg-grey-50 rounded-xl hover:bg-grey-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* 아바타 */}
                <div className={`w-9 h-9 ${avatarColor.bg} rounded-full flex items-center justify-center ${avatarColor.text} text-sm font-medium`}>
                  {student.name[0]}
                </div>

                {/* 이름 + 학년 */}
                <div>
                  <div className="font-medium text-grey-900">{student.name}</div>
                  <div className="text-xs text-grey-400">
                    {student.grade_name || '학년 미지정'} | {formatDate(student.enrolled_at)} 등록
                  </div>
                </div>
              </div>

              {/* 연락처 */}
              <div className="text-sm text-grey-500">
                {maskPhone(student.phone)}
              </div>
            </div>
          );
        })}
      </div>

      {/* 검색 결과 없음 */}
      {searchQuery && filteredStudents.length === 0 && (
        <div className="text-center py-8 text-grey-400">
          검색 결과가 없습니다
        </div>
      )}

      {/* 하단 링크 */}
      <div className="mt-4 pt-4 border-t border-grey-100 text-center">
        <button className="text-sm text-blue-500 hover:text-blue-600 font-medium">
          반 배정 관리 →
        </button>
      </div>
    </div>
  );
}
```

### 4.2 index.ts export 추가

```typescript
export { ClassStudentsTab } from './ClassStudentsTab';
```

### 4.3 테스트 체크리스트
- [ ] 학생 카드 정상 렌더링
- [ ] 아바타 색상 다양하게 표시
- [ ] 연락처 마스킹 동작
- [ ] 검색 필터링 동작
- [ ] 빈 상태 UI 표시

---

## 5. Phase 3: EditClassModal 탭 UI 적용

### 5.1 EditClassModal.tsx 수정

#### 5.1.1 import 추가
```typescript
import { ClassStudentsTab } from './ClassStudentsTab';
import { useClassStudents } from '../../../hooks/useClasses';
```

#### 5.1.2 탭 상태 추가
```typescript
// 탭 상태
const [activeTab, setActiveTab] = useState<'info' | 'students'>('info');

// 학생 수 (탭 배지용)
const { data: students } = useClassStudents(isOpen ? classData.id : null);
const studentCount = students?.length || 0;
```

#### 5.1.3 헤더 요약 추가
```tsx
{/* 헤더 - 반 요약 */}
<div className="p-5 border-b border-grey-100">
  <div className="flex items-center justify-between mb-2">
    <h2 className="text-lg font-bold text-grey-900">{classData.name}</h2>
    <button type="button" onClick={onClose} className="p-2 text-grey-400 hover:text-grey-600">
      &times;
    </button>
  </div>
  <div className="flex items-center gap-3 text-sm">
    {/* 과목 배지 */}
    {classData.subjects && (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSubjectColor(classData.subjects.code).bg} ${getSubjectColor(classData.subjects.code).text}`}>
        {classData.subjects.name}
      </span>
    )}
    {/* 담당 강사 */}
    <span className="text-grey-500">
      담당: {classData.teachers?.name || '미배정'}
    </span>
    {/* 학생 수 */}
    <span className="text-grey-500">
      학생 {studentCount}명
    </span>
  </div>
</div>
```

#### 5.1.4 탭 버튼 추가
```tsx
{/* 탭 */}
<div className="px-5 pt-4">
  <div className="flex gap-1 p-1 bg-grey-100 rounded-lg w-fit">
    <button
      type="button"
      onClick={() => setActiveTab('info')}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
        activeTab === 'info'
          ? 'bg-white text-grey-900 shadow-sm'
          : 'text-grey-500 hover:text-grey-700'
      }`}
    >
      정보 수정
    </button>
    <button
      type="button"
      onClick={() => setActiveTab('students')}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
        activeTab === 'students'
          ? 'bg-white text-grey-900 shadow-sm'
          : 'text-grey-500 hover:text-grey-700'
      }`}
    >
      학생 ({studentCount})
    </button>
  </div>
</div>
```

#### 5.1.5 탭 내용 조건부 렌더링
```tsx
{/* 탭 내용 */}
{activeTab === 'info' ? (
  <form onSubmit={handleSubmit}>
    {/* 기존 폼 내용 */}
  </form>
) : (
  <ClassStudentsTab classId={classData.id} />
)}
```

### 5.2 getSubjectColor import

```typescript
import { getSubjectColor } from '../../../hooks/useClasses';
```

### 5.3 테스트 체크리스트
- [ ] 탭 전환 정상 동작
- [ ] 헤더 요약 정보 표시
- [ ] 정보 수정 탭에서 폼 저장 동작
- [ ] 학생 탭에서 목록 표시
- [ ] 탭 배지 학생 수 표시

---

## 6. Phase 4: 빌드 및 테스트

### 6.1 빌드 테스트
```bash
cd frontend
npm run build
```

### 6.2 기능 테스트 체크리스트
- [ ] 모달 열기/닫기
- [ ] 탭 전환 (정보 ↔ 학생)
- [ ] 정보 수정 후 저장
- [ ] 학생 목록 표시
- [ ] 학생 검색
- [ ] 빈 상태 (학생 없는 반)
- [ ] 반응형 레이아웃

### 6.3 에지 케이스
- [ ] 학생이 없는 반
- [ ] 담당 강사가 없는 반
- [ ] 과목이 없는 반
- [ ] 연락처가 없는 학생

---

## 7. 파일별 상세 변경

### 7.1 api/classes.ts

**추가할 내용:**
- `ClassStudent` 인터페이스
- `getStudentsByClass` 함수

**위치:** 파일 하단에 추가

### 7.2 hooks/useClasses.ts

**추가할 내용:**
- `useClassStudents` 훅

**위치:** 기존 훅들 아래에 추가

### 7.3 components/admin/classes/ClassStudentsTab.tsx

**신규 파일 생성**

### 7.4 components/admin/classes/EditClassModal.tsx

**수정할 내용:**
1. import 추가 (ClassStudentsTab, useClassStudents, getSubjectColor)
2. 탭 상태 추가
3. 헤더 요약 영역 추가
4. 탭 버튼 추가
5. 탭 내용 조건부 렌더링

### 7.5 components/admin/classes/index.ts

**추가할 내용:**
```typescript
export { ClassStudentsTab } from './ClassStudentsTab';
```

---

## 8. 예상 소요 시간

| Phase | 작업 | 예상 |
|-------|------|------|
| 1 | API 및 훅 추가 | 10분 |
| 2 | ClassStudentsTab 컴포넌트 | 15분 |
| 3 | EditClassModal 탭 UI | 15분 |
| 4 | 빌드 및 테스트 | 10분 |
| **합계** | | **50분** |

---

## 9. 롤백 계획

문제 발생 시:
1. `ClassStudentsTab.tsx` 파일 삭제
2. `EditClassModal.tsx`를 이전 버전으로 복원
3. API/훅 추가 부분 제거

---

## 10. 개발 순서 요약

```
1. api/classes.ts
   └─ getStudentsByClass 함수 추가

2. hooks/useClasses.ts
   └─ useClassStudents 훅 추가

3. components/admin/classes/ClassStudentsTab.tsx
   └─ 신규 파일 생성

4. components/admin/classes/index.ts
   └─ export 추가

5. components/admin/classes/EditClassModal.tsx
   └─ 탭 UI + 헤더 요약 추가

6. 빌드 테스트
   └─ npm run build
```

