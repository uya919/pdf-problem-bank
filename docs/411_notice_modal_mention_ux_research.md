# 411. 공지사항 등록 모달 + @멘션 UX 연구 리포트

> **Stage 17 선행 연구**: 공지 작성 모달 및 학생 태그 UI/UX

---

## 1. 연구 목적

### 1.1 배경
- Stage 16에서 공지사항 표시 기능 완료
- Stage 17에서 결석 공지 + @멘션 기능 필요
- 공지 등록 모달이 아직 없음 → 먼저 구현 필요

### 1.2 연구 범위
1. 공지사항 등록 모달 UI/UX
2. @멘션 (학생 태그) 입력 패턴
3. 기존 코드베이스 활용 방안

---

## 2. 공지사항 등록 모달 분석

### 2.1 모달 유형 비교

| 유형 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **전체 화면 모달** | 화면 전체 덮음 | 집중도 높음, 복잡한 폼 가능 | 무거운 느낌 |
| **중앙 모달** | 중앙에 카드 형태 | 일반적, 익숙함 | 긴 폼에 스크롤 필요 |
| **슬라이드 패널** | 우측/하단에서 슬라이드 | 컨텍스트 유지 | 좁은 공간 |
| **인라인 폼** | 목록 내 확장 | 빠른 입력 | 제한된 기능 |

**권장: 중앙 모달** (일반 공지) + **슬라이드 패널** (빠른 결석 공지)

### 2.2 공지 유형별 입력 필드

#### 일반 공지 (전체 폼)

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| 유형 | ✅ | Select | urgent, holiday, exam, special, event, operation, absence |
| 제목 | ✅ | Text | 최대 50자 |
| 설명 | ❌ | Textarea | 최대 200자 |
| 날짜 | ✅ | Date | 공지 표시 날짜 |
| 시작 시간 | ❌ | Time | 시간 지정 공지 |
| 종료 시간 | ❌ | Time | 시간 지정 공지 |
| 대상 | ✅ | Select | all, admin, teacher |
| 학생 태그 | ❌ | @Mention | 결석 공지 시 필수 |
| 우선순위 | ❌ | Number | 기본값 자동 설정 |

#### 결석 공지 (간소화 폼)

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| 학생 | ✅ | @Mention | 결석 학생 선택 |
| 날짜 | ✅ | Date | 결석 날짜 |
| 사유 | ❌ | Text | 결석 사유 |

### 2.3 토스 스타일 모달 패턴

```
┌─────────────────────────────────────┐
│  ← 공지사항 등록              [닫기] │  ← 헤더 (sticky)
├─────────────────────────────────────┤
│                                     │
│  공지 유형                          │
│  ┌─────────────────────────────┐   │
│  │ 🔴 긴급  │ 🟠 휴원 │ 🔵 시험 │   │  ← 칩 선택
│  │ 🟢 특강  │ 🟣 행사 │ 🟡 운영 │   │
│  │ 👤 결석                      │   │
│  └─────────────────────────────┘   │
│                                     │
│  제목 *                             │
│  ┌─────────────────────────────┐   │
│  │ 공지 제목을 입력하세요        │   │
│  └─────────────────────────────┘   │
│                                     │
│  설명                               │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  날짜 *                             │
│  ┌─────────────────────────────┐   │
│  │ 2024-12-21                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ─────────────────────────────────  │  ← 구분선
│                                     │
│  대상                               │
│  ○ 전체  ○ 관리자만  ○ 강사만      │
│                                     │
├─────────────────────────────────────┤
│         [ 취소 ]  [ 등록하기 ]      │  ← 푸터 (sticky)
└─────────────────────────────────────┘
```

---

## 3. @멘션 UI/UX 패턴 분석

### 3.1 멘션 입력 방식 비교

| 방식 | 설명 | 사용처 | 장점 | 단점 |
|------|------|--------|------|------|
| **인라인 @** | 텍스트 중간에 @입력 | Slack, Discord | 자연스러움 | 구현 복잡 |
| **전용 필드** | 별도 입력 필드 | Notion, Jira | 명확함 | 추가 공간 필요 |
| **칩 입력** | 태그 형태로 추가 | Gmail, Figma | 시각적 명확 | 다중 선택에 적합 |
| **드롭다운** | 클릭으로 선택 | 폼 기반 시스템 | 단순함 | 검색 어려움 |

**권장: 전용 필드 + 칩 입력** (결석 공지는 단일 학생이므로)

### 3.2 자동완성 드롭다운 패턴

```
┌─────────────────────────────────┐
│ @ 학생 이름 검색                 │
└─────────────────────────────────┘
         ↓ 입력 시
┌─────────────────────────────────┐
│ @ 홍길                          │
└─────────────────────────────────┘
┌─────────────────────────────────┐  ← 드롭다운
│ ┌───┐                           │
│ │👤│ 홍길동                     │
│ │   │ 중3 · 서울중학교           │
│ └───┘                           │
├─────────────────────────────────┤
│ ┌───┐                           │
│ │👤│ 홍길순                     │
│ │   │ 고1 · 강남고등학교         │
│ └───┘                           │
└─────────────────────────────────┘
         ↓ 선택 시
┌─────────────────────────────────┐
│ ┌─────────────┐                 │
│ │ 홍길동  ✕   │                 │  ← 태그로 변환
│ └─────────────┘                 │
└─────────────────────────────────┘
```

### 3.3 키보드 인터랙션

| 키 | 동작 |
|----|------|
| `↓` / `↑` | 드롭다운 항목 이동 |
| `Enter` | 선택 |
| `Escape` | 드롭다운 닫기 |
| `Backspace` | 태그 삭제 (입력 비어있을 때) |

### 3.4 상태별 UI

| 상태 | UI |
|------|-----|
| **빈 상태** | `@ 학생 이름 검색` 플레이스홀더 |
| **입력 중** | 검색어 + 드롭다운 |
| **검색 중** | 로딩 스피너 |
| **결과 없음** | "검색 결과가 없습니다" |
| **선택됨** | 학생 태그 (이름 + X 버튼) |
| **에러** | 빨간 테두리 + 에러 메시지 |

---

## 4. 기존 코드베이스 분석

### 4.1 재사용 가능한 컴포넌트

| 컴포넌트 | 위치 | 활용 방안 |
|----------|------|----------|
| `Modal` | 없음 (신규 필요) | 공통 모달 컴포넌트 생성 |
| `Input` | 없음 (Tailwind 직접) | 일관된 스타일 적용 |
| `Button` | 없음 (Tailwind 직접) | 버튼 스타일 통일 |
| `Badge` | `NOTICE_TYPE_STYLES` | 공지 유형 뱃지 |

### 4.2 참고할 기존 패턴

**1. 드롭다운 (DateSelector.tsx)**
```typescript
// 외부 클릭 감지
useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

**2. 검색 + debounce (권장 패턴)**
```typescript
// useDebouncedValue 훅
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**3. 애니메이션 (Tailwind)**
```css
/* 드롭다운 애니메이션 */
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slideDown {
  animation: slideDown 0.2s ease;
}
```

### 4.3 신규 생성 필요 컴포넌트

| 컴포넌트 | 용도 | 우선순위 |
|----------|------|----------|
| `Modal` | 공통 모달 래퍼 | 높음 |
| `NoticeFormModal` | 공지 등록 폼 모달 | 높음 |
| `StudentMention` | @학생 검색/태그 | 높음 |
| `StudentTag` | 선택된 학생 태그 | 높음 |
| `NoticeTypeSelector` | 공지 유형 칩 선택 | 중간 |
| `VisibilitySelector` | 대상 라디오 버튼 | 중간 |

---

## 5. 구현 전략

### 5.1 단계별 접근

```
Phase A: 기본 모달 구조
├── Modal 공통 컴포넌트
├── NoticeFormModal 기본 레이아웃
└── 공지 유형 선택 UI

Phase B: 폼 필드 구현
├── 제목/설명 입력
├── 날짜 선택
├── 대상(visibility) 선택
└── 저장 로직

Phase C: @멘션 기능
├── StudentMention 컴포넌트
├── 학생 검색 훅
├── 자동완성 드롭다운
└── 태그 표시/삭제

Phase D: 결석 공지 특화
├── 결석 유형 선택 시 UI 변경
├── 학생 필수 검증
├── 담당 강사 자동 등록
└── 결석 사유 필드
```

### 5.2 컴포넌트 구조

```
components/admin/notices/
├── Modal.tsx                 # 공통 모달 래퍼
├── NoticeFormModal.tsx       # 공지 등록 모달
├── NoticeTypeSelector.tsx    # 유형 칩 선택
├── VisibilitySelector.tsx    # 대상 라디오
├── StudentMention.tsx        # @학생 검색
├── StudentTag.tsx            # 학생 태그
└── index.ts                  # export
```

### 5.3 상태 관리

```typescript
interface NoticeFormState {
  // 기본 필드
  type: NoticeType;
  title: string;
  description: string;
  date: string;
  startTime?: string;
  endTime?: string;
  visibility: NoticeVisibility;

  // 결석 공지용
  taggedStudent: TaggedStudent | null;
  absenceReason?: string;

  // UI 상태
  isSubmitting: boolean;
  errors: Record<string, string>;
}
```

---

## 6. @멘션 구현 상세

### 6.1 StudentMention 컴포넌트 구조

```typescript
interface StudentMentionProps {
  value: TaggedStudent | null;
  onChange: (student: TaggedStudent | null) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
}

export function StudentMention({
  value,
  onChange,
  placeholder = "학생 이름 검색",
  required = false,
  error,
}: StudentMentionProps) {
  // 내부 상태
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  // 검색
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: students, isLoading } = useStudentSearch({
    query: debouncedQuery,
    enabled: debouncedQuery.length >= 2,
  });

  // 외부 클릭 감지
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setIsOpen(false));

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !students?.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, students.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        handleSelect(students[highlightIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (student: TaggedStudent) => {
    onChange(student);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <StudentTag student={value} onRemove={() => onChange(null)} />
      ) : (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400 text-lg">
            @
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
              setHighlightIndex(0);
            }}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`
              w-full pl-8 pr-4 py-3
              border rounded-xl
              focus:ring-2 focus:ring-toss-blue focus:border-transparent
              ${error ? 'border-red-300' : 'border-grey-200'}
            `}
          />
          {isLoading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner className="w-4 h-4 text-grey-400" />
            </span>
          )}
        </div>
      )}

      {/* 드롭다운 */}
      {isOpen && students && students.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-grey-100 z-50 max-h-60 overflow-y-auto animate-slideDown">
          {students.map((student, index) => (
            <button
              key={student.id}
              onClick={() => handleSelect(student)}
              className={`
                w-full px-4 py-3 text-left flex items-center gap-3
                ${index === highlightIndex ? 'bg-toss-blueLight' : 'hover:bg-grey-50'}
              `}
            >
              <div className="w-9 h-9 bg-grey-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-grey-500" />
              </div>
              <div>
                <div className="font-medium text-grey-900">{student.name}</div>
                <div className="text-xs text-grey-500">
                  {student.grade} · {student.school}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {isOpen && debouncedQuery.length >= 2 && !isLoading && (!students || students.length === 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-grey-100 z-50 p-4 text-center text-grey-500 text-sm">
          검색 결과가 없습니다
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
```

### 6.2 StudentTag 컴포넌트

```typescript
interface StudentTagProps {
  student: TaggedStudent;
  onRemove: () => void;
}

export function StudentTag({ student, onRemove }: StudentTagProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 bg-toss-blueLight rounded-xl">
      <div className="w-6 h-6 bg-toss-blue rounded-full flex items-center justify-center">
        <User className="w-3 h-3 text-white" />
      </div>
      <span className="font-medium text-toss-blue">{student.name}</span>
      <button
        onClick={onRemove}
        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-toss-blue/20 text-toss-blue"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
```

---

## 7. 모달 구현 상세

### 7.1 Modal 공통 컴포넌트

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/50 animate-fadeIn"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div
        className={`
          relative bg-white rounded-2xl shadow-xl w-full ${sizeClasses[size]}
          animate-scaleIn max-h-[90vh] flex flex-col
        `}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-grey-100">
          <h2 className="text-lg font-bold text-grey-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-grey-100"
          >
            <X className="w-5 h-5 text-grey-400" />
          </button>
        </div>

        {/* 본문 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* 푸터 (있는 경우) */}
        {footer && (
          <div className="px-5 py-4 border-t border-grey-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 7.2 NoticeFormModal 구조

```typescript
interface NoticeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultType?: NoticeType;
}

export function NoticeFormModal({
  isOpen,
  onClose,
  defaultDate,
  defaultType,
}: NoticeFormModalProps) {
  // 폼 상태
  const [formState, setFormState] = useState<NoticeFormState>({
    type: defaultType || 'event',
    title: '',
    description: '',
    date: defaultDate || formatDateKey(new Date()),
    visibility: 'all',
    taggedStudent: null,
    absenceReason: '',
    isSubmitting: false,
    errors: {},
  });

  // 결석 공지인지 확인
  const isAbsenceNotice = formState.type === 'absence';

  // 제출 핸들러
  const handleSubmit = async () => {
    // 유효성 검사
    const errors: Record<string, string> = {};

    if (!formState.title.trim()) {
      errors.title = '제목을 입력해주세요';
    }

    if (isAbsenceNotice && !formState.taggedStudent) {
      errors.taggedStudent = '결석 학생을 선택해주세요';
    }

    if (Object.keys(errors).length > 0) {
      setFormState(prev => ({ ...prev, errors }));
      return;
    }

    // 저장 로직...
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="공지사항 등록"
      size="md"
      footer={
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-grey-100 text-grey-700 font-medium rounded-xl"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={formState.isSubmitting}
            className="flex-1 py-3 bg-toss-blue text-white font-medium rounded-xl disabled:opacity-50"
          >
            {formState.isSubmitting ? '등록 중...' : '등록하기'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 공지 유형 선택 */}
        <NoticeTypeSelector
          value={formState.type}
          onChange={(type) => setFormState(prev => ({ ...prev, type }))}
        />

        {/* 결석 공지: 학생 선택 */}
        {isAbsenceNotice && (
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-2">
              결석 학생 <span className="text-red-500">*</span>
            </label>
            <StudentMention
              value={formState.taggedStudent}
              onChange={(student) => setFormState(prev => ({
                ...prev,
                taggedStudent: student,
                // 학생 선택 시 자동으로 제목 설정
                title: student ? `${student.name} 결석 예정` : '',
              }))}
              required
              error={formState.errors.taggedStudent}
            />
          </div>
        )}

        {/* 제목 */}
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-2">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formState.title}
            onChange={(e) => setFormState(prev => ({
              ...prev,
              title: e.target.value,
              errors: { ...prev.errors, title: '' },
            }))}
            placeholder="공지 제목을 입력하세요"
            maxLength={50}
            className={`
              w-full px-4 py-3 border rounded-xl
              ${formState.errors.title ? 'border-red-300' : 'border-grey-200'}
            `}
          />
          {formState.errors.title && (
            <p className="mt-1 text-sm text-red-500">{formState.errors.title}</p>
          )}
        </div>

        {/* 설명 / 결석 사유 */}
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-2">
            {isAbsenceNotice ? '결석 사유' : '설명'}
          </label>
          <textarea
            value={isAbsenceNotice ? formState.absenceReason : formState.description}
            onChange={(e) => setFormState(prev => ({
              ...prev,
              [isAbsenceNotice ? 'absenceReason' : 'description']: e.target.value,
            }))}
            placeholder={isAbsenceNotice ? '예: 병원 예약, 가족 행사' : '공지 내용을 입력하세요'}
            rows={3}
            maxLength={200}
            className="w-full px-4 py-3 border border-grey-200 rounded-xl resize-none"
          />
        </div>

        {/* 날짜 */}
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-2">
            {isAbsenceNotice ? '결석 날짜' : '공지 날짜'} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formState.date}
            onChange={(e) => setFormState(prev => ({ ...prev, date: e.target.value }))}
            className="w-full px-4 py-3 border border-grey-200 rounded-xl"
          />
        </div>

        {/* 대상 (결석 공지가 아닐 때만) */}
        {!isAbsenceNotice && (
          <VisibilitySelector
            value={formState.visibility}
            onChange={(visibility) => setFormState(prev => ({ ...prev, visibility }))}
          />
        )}

        {/* 결석 공지 안내 */}
        {isAbsenceNotice && (
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">💡 결석 공지 안내</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>담당 강사에게만 공지가 표시됩니다</li>
              <li>강사가 확인 시 출결에 자동 반영됩니다</li>
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
```

---

## 8. 권장 개발 순서

### Phase A: 기본 구조 (1시간)

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/ui/Modal.tsx` | 공통 모달 컴포넌트 |
| 2 | `hooks/useDebouncedValue.ts` | debounce 훅 |
| 3 | `hooks/useClickOutside.ts` | 외부 클릭 훅 |

### Phase B: @멘션 (1.5시간)

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `types/admin.ts` | TaggedStudent 타입 |
| 2 | `hooks/useStudentSearch.ts` | 학생 검색 훅 (Mock 포함) |
| 3 | `components/admin/notices/StudentTag.tsx` | 태그 UI |
| 4 | `components/admin/notices/StudentMention.tsx` | 멘션 UI |

### Phase C: 공지 폼 (1.5시간)

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/admin/notices/NoticeTypeSelector.tsx` | 유형 선택 |
| 2 | `components/admin/notices/VisibilitySelector.tsx` | 대상 선택 |
| 3 | `components/admin/notices/NoticeFormModal.tsx` | 폼 모달 |
| 4 | `hooks/useCreateNotice.ts` | 저장 훅 |

### Phase D: 통합 (30분)

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/admin/notices/index.ts` | export |
| 2 | `components/admin/dashboard/WeeklyCalendar.tsx` | 버튼 연동 |
| 3 | 빌드 테스트 | |

---

## 9. 결론

### 9.1 핵심 구현 포인트

1. **Modal**: 공통 컴포넌트로 재사용 가능하게
2. **@멘션**: debounce + 키보드 네비게이션 + 외부 클릭 닫기
3. **결석 공지**: type='absence' 선택 시 UI 동적 변경
4. **폼 검증**: 필수 필드 체크 + 에러 표시

### 9.2 예상 총 개발 시간

| Phase | 시간 |
|-------|------|
| A: 기본 구조 | 1시간 |
| B: @멘션 | 1.5시간 |
| C: 공지 폼 | 1.5시간 |
| D: 통합 | 30분 |
| **총계** | **약 4.5시간** |

### 9.3 우선순위

1. **높음**: Modal, StudentMention, NoticeFormModal
2. **중간**: NoticeTypeSelector, VisibilitySelector
3. **낮음**: 키보드 네비게이션, 애니메이션 polish

---

*작성일: 2024-12-21*
*참조: 410_absence_notice_development_plan.md*
