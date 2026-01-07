# 412. 공지사항 등록 모달 + @멘션 개발 계획

> **Stage 17-A**: 공지 등록 모달 및 학생 태그 기능

---

## 1. 개요

### 1.1 목표
- 공지사항 등록 모달 구현
- @학생 멘션 (자동완성 검색 + 태그) 기능
- 결석 공지 시 학생 필수 선택

### 1.2 UI 구조

```
┌─────────────────────────────────────┐
│  공지사항 등록                [닫기] │
├─────────────────────────────────────┤
│                                     │
│  공지 유형                          │
│  [🔴긴급] [🟠휴원] [👤결석] [🔵시험]│
│  [🟢특강] [🟣행사] [🟡운영]         │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  결석 학생 (결석 선택 시만 표시)     │
│  ┌─────────────────────────────┐   │
│  │ @ 학생 이름 검색             │   │
│  └─────────────────────────────┘   │
│       ↓ 선택 후                     │
│  ┌─────────────────────────────┐   │
│  │ 홍길동 (중3)            ✕   │   │
│  └─────────────────────────────┘   │
│                                     │
│  제목 *                             │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  설명                               │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  날짜 *                             │
│  ┌─────────────────────────────┐   │
│  │ 2024-12-21                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  대상 (결석 제외)                   │
│  ○ 전체  ○ 관리자만  ○ 강사만      │
│                                     │
├─────────────────────────────────────┤
│         [ 취소 ]  [ 등록하기 ]      │
└─────────────────────────────────────┘
```

### 1.3 참조 문서
- [411_notice_modal_mention_ux_research.md](411_notice_modal_mention_ux_research.md)

---

## 2. 파일 구조

```
frontend/src/
├── components/
│   ├── ui/
│   │   └── Modal.tsx                    # 공통 모달 (신규)
│   │
│   └── admin/
│       └── notices/
│           ├── NoticeFormModal.tsx      # 공지 등록 모달 (신규)
│           ├── NoticeTypeSelector.tsx   # 유형 칩 선택 (신규)
│           ├── VisibilitySelector.tsx   # 대상 라디오 (신규)
│           ├── StudentMention.tsx       # @멘션 입력 (신규)
│           ├── StudentTag.tsx           # 학생 태그 (신규)
│           └── index.ts                 # export 추가
│
├── hooks/
│   ├── useDebouncedValue.ts             # debounce 훅 (신규)
│   ├── useClickOutside.ts               # 외부 클릭 훅 (신규)
│   ├── useStudentSearch.ts              # 학생 검색 (신규)
│   └── useCreateNotice.ts               # 공지 생성 (신규)
│
└── types/
    └── admin.ts                         # TaggedStudent 타입 추가
```

---

## 3. Phase별 개발 계획

### Phase 17A-1: 유틸 훅 생성
**예상 시간**: 20분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `hooks/useDebouncedValue.ts` | debounce 훅 |
| 2 | `hooks/useClickOutside.ts` | 외부 클릭 감지 훅 |

**useDebouncedValue.ts**:
```typescript
import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**useClickOutside.ts**:
```typescript
import { useEffect, RefObject } from 'react';

export function useClickOutside(
  ref: RefObject<HTMLElement>,
  handler: () => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}
```

**완료 조건**:
- [ ] 두 훅 생성
- [ ] 빌드 에러 없음

---

### Phase 17A-2: 공통 Modal 컴포넌트
**예상 시간**: 30분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/ui/Modal.tsx` | 공통 모달 래퍼 |

**Modal.tsx**:
```typescript
import { useEffect } from 'react';
import { X } from 'lucide-react';

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
  // ESC 키로 닫기 + 스크롤 잠금
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

      {/* 모달 */}
      <div
        className={`
          relative bg-white rounded-2xl shadow-xl w-full
          ${sizeClasses[size]}
          animate-scaleIn max-h-[90vh] flex flex-col
        `}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-grey-100 shrink-0">
          <h2 className="text-lg font-bold text-grey-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-grey-100 transition-colors"
          >
            <X className="w-5 h-5 text-grey-400" />
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* 푸터 */}
        {footer && (
          <div className="px-5 py-4 border-t border-grey-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

**tailwind.config.js 애니메이션 추가** (필요 시):
```javascript
// extend.animation에 추가
animation: {
  fadeIn: 'fadeIn 0.2s ease',
  scaleIn: 'scaleIn 0.2s ease',
},
keyframes: {
  fadeIn: {
    '0%': { opacity: '0' },
    '100%': { opacity: '1' },
  },
  scaleIn: {
    '0%': { opacity: '0', transform: 'scale(0.95)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
},
```

**완료 조건**:
- [ ] Modal 컴포넌트 생성
- [ ] ESC 키 닫기 동작
- [ ] 백드롭 클릭 닫기 동작

---

### Phase 17A-3: 타입 정의 확장
**예상 시간**: 10분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `types/admin.ts` | TaggedStudent, CreateNoticeInput 타입 |

**types/admin.ts 추가**:
```typescript
// =====================================================
// 공지 등록 타입 (Stage 17)
// =====================================================

/** 태그된 학생 정보 */
export interface TaggedStudent {
  id: string;
  name: string;
  grade?: string;
  school?: string;
}

/** 공지 생성 입력 */
export interface CreateNoticeInput {
  type: NoticeType;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  visibility: NoticeVisibility;
  taggedStudentId?: string;
  absenceReason?: string;
}

/** 공지 폼 상태 */
export interface NoticeFormState {
  type: NoticeType;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  visibility: NoticeVisibility;
  taggedStudent: TaggedStudent | null;
  absenceReason: string;
  isSubmitting: boolean;
  errors: Record<string, string>;
}
```

**완료 조건**:
- [ ] 타입 정의 추가
- [ ] 빌드 에러 없음

---

### Phase 17A-4: 학생 검색 훅
**예상 시간**: 30분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `hooks/useStudentSearch.ts` | 학생 검색 훅 + Mock |

**useStudentSearch.ts**:
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { TaggedStudent } from '@/types/admin';

// Mock 학생 데이터
const MOCK_STUDENTS: TaggedStudent[] = [
  { id: 'student-1', name: '홍길동', grade: '중3', school: '서울중학교' },
  { id: 'student-2', name: '김철수', grade: '고1', school: '강남고등학교' },
  { id: 'student-3', name: '이영희', grade: '중2', school: '역삼중학교' },
  { id: 'student-4', name: '박민수', grade: '고2', school: '서초고등학교' },
  { id: 'student-5', name: '최지우', grade: '중1', school: '대치중학교' },
  { id: 'student-6', name: '홍길순', grade: '고1', school: '대치고등학교' },
  { id: 'student-7', name: '김영수', grade: '중3', school: '강남중학교' },
  { id: 'student-8', name: '이철호', grade: '고3', school: '서울고등학교' },
];

interface UseStudentSearchOptions {
  query: string;
  enabled?: boolean;
  limit?: number;
}

export function useStudentSearch(options: UseStudentSearchOptions) {
  const { query, enabled = true, limit = 10 } = options;

  return useQuery({
    queryKey: ['students', 'search', query],
    queryFn: async (): Promise<TaggedStudent[]> => {
      // 2글자 미만이면 빈 배열
      if (!query || query.length < 2) return [];

      // Supabase 미설정 시 Mock
      if (!isSupabaseConfigured) {
        const filtered = MOCK_STUDENTS.filter((s) =>
          s.name.includes(query)
        ).slice(0, limit);

        // 약간의 딜레이로 로딩 상태 테스트
        await new Promise((r) => setTimeout(r, 200));
        return filtered;
      }

      // Supabase 검색
      const { data, error } = await supabase
        .from('students')
        .select('id, name, grade_id, school')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .limit(limit);

      if (error) {
        console.error('Student search error:', error);
        return [];
      }

      return (data || []).map((s) => ({
        id: s.id,
        name: s.name,
        grade: s.grade_id,
        school: s.school,
      }));
    },
    enabled: enabled && query.length >= 2,
    staleTime: 30 * 1000,
  });
}
```

**완료 조건**:
- [ ] Mock 데이터로 검색 동작
- [ ] 2글자 이상 입력 시 검색
- [ ] 로딩 상태 표시

---

### Phase 17A-5: StudentTag 컴포넌트
**예상 시간**: 15분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/admin/notices/StudentTag.tsx` | 선택된 학생 태그 |

**StudentTag.tsx**:
```typescript
import { User, X } from 'lucide-react';
import type { TaggedStudent } from '@/types/admin';

interface StudentTagProps {
  student: TaggedStudent;
  onRemove: () => void;
}

export function StudentTag({ student, onRemove }: StudentTagProps) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-2.5 bg-toss-blueLight rounded-xl">
      <div className="w-7 h-7 bg-toss-blue rounded-full flex items-center justify-center">
        <User className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-toss-blue text-sm">{student.name}</span>
        {student.grade && (
          <span className="text-xs text-toss-blue/70">{student.grade}</span>
        )}
      </div>
      <button
        onClick={onRemove}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-toss-blue/20 text-toss-blue ml-1"
        aria-label="학생 태그 제거"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

**완료 조건**:
- [ ] 태그 UI 표시
- [ ] X 버튼 클릭 시 onRemove 호출

---

### Phase 17A-6: StudentMention 컴포넌트
**예상 시간**: 45분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/admin/notices/StudentMention.tsx` | @멘션 자동완성 |

**StudentMention.tsx**:
```typescript
import { useState, useRef, useCallback } from 'react';
import { User, Loader2 } from 'lucide-react';
import { StudentTag } from './StudentTag';
import { useStudentSearch } from '@/hooks/useStudentSearch';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useClickOutside } from '@/hooks/useClickOutside';
import type { TaggedStudent } from '@/types/admin';

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
  placeholder = '학생 이름 검색',
  required = false,
  error,
}: StudentMentionProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // debounce 검색어
  const debouncedQuery = useDebouncedValue(query, 300);

  // 학생 검색
  const { data: students, isLoading } = useStudentSearch({
    query: debouncedQuery,
    enabled: isOpen && debouncedQuery.length >= 2,
  });

  // 외부 클릭 시 닫기
  useClickOutside(containerRef, useCallback(() => setIsOpen(false), []));

  // 학생 선택
  const handleSelect = (student: TaggedStudent) => {
    onChange(student);
    setQuery('');
    setIsOpen(false);
    setHighlightIndex(0);
  };

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || !students?.length) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, students.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (students[highlightIndex]) {
          handleSelect(students[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // 이미 선택된 경우: 태그 표시
  if (value) {
    return (
      <div>
        <StudentTag student={value} onRemove={() => onChange(null)} />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // 선택 안 된 경우: 검색 입력
  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-400 text-lg font-medium">
          @
        </span>
        <input
          ref={inputRef}
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
            w-full pl-8 pr-10 py-3
            border rounded-xl text-sm
            focus:ring-2 focus:ring-toss-blue focus:border-transparent
            transition-colors
            ${error ? 'border-red-300 bg-red-50' : 'border-grey-200'}
          `}
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-grey-400 animate-spin" />
          </span>
        )}
      </div>

      {/* 드롭다운 */}
      {isOpen && students && students.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-grey-100 z-50 max-h-60 overflow-y-auto animate-slideDown">
          {students.map((student, index) => (
            <button
              key={student.id}
              onClick={() => handleSelect(student)}
              className={`
                w-full px-4 py-3 text-left flex items-center gap-3
                transition-colors
                ${index === highlightIndex ? 'bg-toss-blueLight' : 'hover:bg-grey-50'}
              `}
            >
              <div className="w-9 h-9 bg-grey-100 rounded-full flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-grey-500" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-grey-900 text-sm">{student.name}</div>
                {(student.grade || student.school) && (
                  <div className="text-xs text-grey-500 truncate">
                    {[student.grade, student.school].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 검색 결과 없음 */}
      {isOpen && debouncedQuery.length >= 2 && !isLoading && (!students || students.length === 0) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-grey-100 z-50 p-4 text-center">
          <p className="text-sm text-grey-500">검색 결과가 없습니다</p>
        </div>
      )}

      {/* 에러 */}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

**완료 조건**:
- [ ] @ 입력 → 자동완성 드롭다운
- [ ] 키보드 ↑↓ 네비게이션
- [ ] Enter로 선택
- [ ] 외부 클릭 시 닫기
- [ ] 선택 후 태그로 표시

---

### Phase 17A-7: NoticeTypeSelector 컴포넌트
**예상 시간**: 25분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/admin/notices/NoticeTypeSelector.tsx` | 공지 유형 칩 선택 |

**NoticeTypeSelector.tsx**:
```typescript
import {
  AlertTriangle,
  Calendar,
  UserX,
  FileText,
  GraduationCap,
  PartyPopper,
  Settings,
} from 'lucide-react';
import type { NoticeType } from '@/types/admin';
import { NOTICE_TYPE_STYLES } from '@/types/admin';

interface NoticeTypeSelectorProps {
  value: NoticeType;
  onChange: (type: NoticeType) => void;
}

const NOTICE_TYPE_ICONS: Record<NoticeType, React.ElementType> = {
  urgent: AlertTriangle,
  holiday: Calendar,
  absence: UserX,
  exam: FileText,
  special: GraduationCap,
  event: PartyPopper,
  operation: Settings,
};

const NOTICE_TYPE_ORDER: NoticeType[] = [
  'urgent',
  'holiday',
  'absence',
  'exam',
  'special',
  'event',
  'operation',
];

export function NoticeTypeSelector({ value, onChange }: NoticeTypeSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-grey-700 mb-2">
        공지 유형
      </label>
      <div className="flex flex-wrap gap-2">
        {NOTICE_TYPE_ORDER.map((type) => {
          const style = NOTICE_TYPE_STYLES[type];
          const Icon = NOTICE_TYPE_ICONS[type];
          const isSelected = value === type;

          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-2 rounded-lg
                text-sm font-medium transition-all
                ${isSelected
                  ? `${style.badgeBgColor} ${style.badgeTextColor} ring-2 ring-offset-1 ring-current`
                  : 'bg-grey-100 text-grey-600 hover:bg-grey-200'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{style.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**완료 조건**:
- [ ] 7개 유형 칩 표시
- [ ] 선택 상태 스타일
- [ ] 클릭 시 onChange 호출

---

### Phase 17A-8: VisibilitySelector 컴포넌트
**예상 시간**: 15분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/admin/notices/VisibilitySelector.tsx` | 대상 라디오 버튼 |

**VisibilitySelector.tsx**:
```typescript
import type { NoticeVisibility } from '@/types/admin';

interface VisibilitySelectorProps {
  value: NoticeVisibility;
  onChange: (visibility: NoticeVisibility) => void;
}

const VISIBILITY_OPTIONS: { value: NoticeVisibility; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'admin', label: '관리자만' },
  { value: 'teacher', label: '강사만' },
];

export function VisibilitySelector({ value, onChange }: VisibilitySelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-grey-700 mb-2">
        공지 대상
      </label>
      <div className="flex gap-4">
        {VISIBILITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="w-4 h-4 text-toss-blue focus:ring-toss-blue"
            />
            <span className="text-sm text-grey-700">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
```

**완료 조건**:
- [ ] 3개 라디오 버튼
- [ ] 선택 상태 동기화

---

### Phase 17A-9: NoticeFormModal 컴포넌트
**예상 시간**: 45분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/admin/notices/NoticeFormModal.tsx` | 공지 등록 폼 모달 |

**NoticeFormModal.tsx**:
```typescript
import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { NoticeTypeSelector } from './NoticeTypeSelector';
import { VisibilitySelector } from './VisibilitySelector';
import { StudentMention } from './StudentMention';
import { useCreateNotice } from '@/hooks/useCreateNotice';
import { formatDateKey } from '@/utils/weekUtils';
import type { NoticeType, NoticeVisibility, TaggedStudent, NoticeFormState } from '@/types/admin';

interface NoticeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultType?: NoticeType;
}

const INITIAL_STATE: NoticeFormState = {
  type: 'event',
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  visibility: 'all',
  taggedStudent: null,
  absenceReason: '',
  isSubmitting: false,
  errors: {},
};

export function NoticeFormModal({
  isOpen,
  onClose,
  defaultDate,
  defaultType,
}: NoticeFormModalProps) {
  const [form, setForm] = useState<NoticeFormState>({
    ...INITIAL_STATE,
    date: defaultDate || formatDateKey(new Date()),
    type: defaultType || 'event',
  });

  const createNotice = useCreateNotice();
  const isAbsence = form.type === 'absence';

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setForm({
        ...INITIAL_STATE,
        date: defaultDate || formatDateKey(new Date()),
        type: defaultType || 'event',
      });
    }
  }, [isOpen, defaultDate, defaultType]);

  // 결석 공지 선택 시 제목 자동 설정
  useEffect(() => {
    if (isAbsence && form.taggedStudent) {
      setForm((prev) => ({
        ...prev,
        title: `${form.taggedStudent!.name} 결석 예정`,
      }));
    }
  }, [isAbsence, form.taggedStudent]);

  // 필드 업데이트
  const updateField = <K extends keyof NoticeFormState>(
    key: K,
    value: NoticeFormState[K]
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      errors: { ...prev.errors, [key]: '' },
    }));
  };

  // 유효성 검사
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.title.trim()) {
      errors.title = '제목을 입력해주세요';
    }

    if (isAbsence && !form.taggedStudent) {
      errors.taggedStudent = '결석 학생을 선택해주세요';
    }

    if (!form.date) {
      errors.date = '날짜를 선택해주세요';
    }

    setForm((prev) => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  // 제출
  const handleSubmit = async () => {
    if (!validate()) return;

    setForm((prev) => ({ ...prev, isSubmitting: true }));

    try {
      await createNotice.mutateAsync({
        type: form.type,
        title: form.title,
        description: isAbsence ? form.absenceReason : form.description,
        date: form.date,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        visibility: isAbsence ? 'teacher' : form.visibility,
        taggedStudentId: form.taggedStudent?.id,
        absenceReason: form.absenceReason || undefined,
      });

      onClose();
    } catch (error) {
      console.error('Failed to create notice:', error);
      setForm((prev) => ({
        ...prev,
        errors: { submit: '공지 등록에 실패했습니다' },
      }));
    } finally {
      setForm((prev) => ({ ...prev, isSubmitting: false }));
    }
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
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-grey-100 text-grey-700 font-medium rounded-xl hover:bg-grey-200 transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={form.isSubmitting}
            className="flex-1 py-3 bg-toss-blue text-white font-medium rounded-xl hover:bg-toss-blueDark transition-colors disabled:opacity-50"
          >
            {form.isSubmitting ? '등록 중...' : '등록하기'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* 공지 유형 */}
        <NoticeTypeSelector
          value={form.type}
          onChange={(type) => updateField('type', type)}
        />

        {/* 구분선 */}
        <hr className="border-grey-100" />

        {/* 결석 학생 (결석일 때만) */}
        {isAbsence && (
          <div>
            <label className="block text-sm font-medium text-grey-700 mb-2">
              결석 학생 <span className="text-red-500">*</span>
            </label>
            <StudentMention
              value={form.taggedStudent}
              onChange={(student) => updateField('taggedStudent', student)}
              required
              error={form.errors.taggedStudent}
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
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="공지 제목을 입력하세요"
            maxLength={50}
            className={`
              w-full px-4 py-3 border rounded-xl text-sm
              focus:ring-2 focus:ring-toss-blue focus:border-transparent
              ${form.errors.title ? 'border-red-300 bg-red-50' : 'border-grey-200'}
            `}
          />
          {form.errors.title && (
            <p className="mt-1 text-sm text-red-500">{form.errors.title}</p>
          )}
        </div>

        {/* 설명 / 결석 사유 */}
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-2">
            {isAbsence ? '결석 사유' : '설명'}
          </label>
          <textarea
            value={isAbsence ? form.absenceReason : form.description}
            onChange={(e) =>
              updateField(isAbsence ? 'absenceReason' : 'description', e.target.value)
            }
            placeholder={isAbsence ? '예: 병원 예약, 가족 행사' : '공지 내용을 입력하세요'}
            rows={3}
            maxLength={200}
            className="w-full px-4 py-3 border border-grey-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-toss-blue focus:border-transparent"
          />
        </div>

        {/* 날짜 */}
        <div>
          <label className="block text-sm font-medium text-grey-700 mb-2">
            {isAbsence ? '결석 날짜' : '공지 날짜'} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => updateField('date', e.target.value)}
            className={`
              w-full px-4 py-3 border rounded-xl text-sm
              focus:ring-2 focus:ring-toss-blue focus:border-transparent
              ${form.errors.date ? 'border-red-300 bg-red-50' : 'border-grey-200'}
            `}
          />
          {form.errors.date && (
            <p className="mt-1 text-sm text-red-500">{form.errors.date}</p>
          )}
        </div>

        {/* 대상 (결석 아닐 때만) */}
        {!isAbsence && (
          <VisibilitySelector
            value={form.visibility}
            onChange={(v) => updateField('visibility', v)}
          />
        )}

        {/* 결석 공지 안내 */}
        {isAbsence && (
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-700 mb-1">💡 결석 공지 안내</p>
            <ul className="text-xs text-blue-600 space-y-0.5">
              <li>• 담당 강사에게만 공지가 표시됩니다</li>
              <li>• 강사가 확인 시 출결에 자동 반영됩니다</li>
            </ul>
          </div>
        )}

        {/* 제출 에러 */}
        {form.errors.submit && (
          <div className="bg-red-50 rounded-xl p-3 text-sm text-red-600">
            {form.errors.submit}
          </div>
        )}
      </div>
    </Modal>
  );
}
```

**완료 조건**:
- [ ] 전체 폼 레이아웃
- [ ] 결석 선택 시 UI 변경
- [ ] 유효성 검사
- [ ] 제출 로직 연동

---

### Phase 17A-10: 공지 생성 훅
**예상 시간**: 30분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `hooks/useCreateNotice.ts` | 공지 생성 mutation |

**useCreateNotice.ts**:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { CreateNoticeInput, Notice } from '@/types/admin';

export function useCreateNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNoticeInput): Promise<Notice> => {
      // Mock 모드
      if (!isSupabaseConfigured) {
        console.log('Mock: Creating notice', input);

        // Mock 응답
        const mockNotice: Notice = {
          id: `mock-${Date.now()}`,
          title: input.title,
          description: input.description,
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          type: input.type,
          priority: input.type === 'urgent' ? 100 : input.type === 'absence' ? 85 : 50,
          visibility: input.visibility,
          createdAt: new Date().toISOString(),
          isActive: true,
        };

        await new Promise((r) => setTimeout(r, 500));
        return mockNotice;
      }

      // 1. 공지 생성
      const { data: notice, error: noticeError } = await supabase
        .from('notices')
        .insert({
          title: input.title,
          description: input.description,
          date: input.date,
          start_time: input.startTime,
          end_time: input.endTime,
          type: input.type,
          priority: input.type === 'urgent' ? 100 : input.type === 'absence' ? 85 : 50,
          visibility: input.visibility,
          tagged_student_id: input.taggedStudentId,
          absence_reason: input.absenceReason,
          is_active: true,
        })
        .select()
        .single();

      if (noticeError) throw noticeError;

      // 2. 결석 공지일 경우: 담당 강사 등록
      if (input.type === 'absence' && input.taggedStudentId) {
        // 담당 강사 조회
        const { data: teachers } = await supabase
          .from('enrollments')
          .select('classes!inner(teacher_id)')
          .eq('student_id', input.taggedStudentId)
          .eq('is_active', true);

        // 수신자 등록
        const teacherIds = [...new Set(
          teachers?.map((t: any) => t.classes?.teacher_id).filter(Boolean) || []
        )];

        if (teacherIds.length > 0) {
          await supabase.from('notice_recipients').insert(
            teacherIds.map((teacherId) => ({
              notice_id: notice.id,
              teacher_id: teacherId,
            }))
          );
        }
      }

      return {
        id: notice.id,
        title: notice.title,
        description: notice.description,
        date: notice.date,
        startTime: notice.start_time,
        endTime: notice.end_time,
        type: notice.type,
        priority: notice.priority,
        visibility: notice.visibility,
        createdAt: notice.created_at,
        isActive: notice.is_active,
      };
    },
    onSuccess: () => {
      // 공지 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['admin', 'notices'] });
    },
  });
}
```

**완료 조건**:
- [ ] Mock 모드 동작
- [ ] Supabase 저장 로직
- [ ] 결석 공지: 담당 강사 등록
- [ ] 성공 시 목록 갱신

---

### Phase 17A-11: Export 정리 + 통합
**예상 시간**: 20분

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | `components/admin/notices/index.ts` | export 추가 |
| 2 | `components/admin/dashboard/WeeklyCalendar.tsx` | 공지 등록 버튼 |

**notices/index.ts 수정**:
```typescript
// 기존 export 유지
export { NoticeCard } from './NoticeCard';
export { NoticeItem } from './NoticeItem';
export { ImportantNotices } from './ImportantNotices';
export { GeneralNotices } from './GeneralNotices';

// Stage 17: 공지 등록 컴포넌트
export { NoticeFormModal } from './NoticeFormModal';
export { NoticeTypeSelector } from './NoticeTypeSelector';
export { VisibilitySelector } from './VisibilitySelector';
export { StudentMention } from './StudentMention';
export { StudentTag } from './StudentTag';
```

**WeeklyCalendar.tsx 수정**:
```typescript
// import 추가
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { NoticeFormModal } from './notices/NoticeFormModal';

// 컴포넌트 내부
const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);

// 헤더에 버튼 추가
<div className="flex items-center gap-2">
  <button
    onClick={handleGoToday}
    className="px-4 py-2 bg-toss-blue text-white text-sm font-semibold rounded-full"
  >
    오늘
  </button>
  <button
    onClick={() => setIsNoticeModalOpen(true)}
    className="w-10 h-10 flex items-center justify-center bg-grey-100 text-grey-600 rounded-full hover:bg-grey-200 transition-colors"
    aria-label="공지 등록"
  >
    <Plus className="w-5 h-5" />
  </button>
</div>

// 모달
<NoticeFormModal
  isOpen={isNoticeModalOpen}
  onClose={() => setIsNoticeModalOpen(false)}
  defaultDate={selectedDate}
/>
```

**완료 조건**:
- [ ] export 정리
- [ ] 캘린더에 + 버튼
- [ ] 버튼 클릭 시 모달 열림

---

### Phase 17A-12: 빌드 테스트
**예상 시간**: 15분

| 순서 | 작업 |
|------|------|
| 1 | `npm run build` |
| 2 | TypeScript 에러 확인 |
| 3 | 브라우저 테스트 |

**완료 조건**:
- [ ] 빌드 성공
- [ ] 에러 없음
- [ ] 모달 열기/닫기 동작
- [ ] @멘션 동작
- [ ] 공지 등록 동작 (Mock)

---

## 4. 파일 생성 순서 (의존성 기준)

```
1.  hooks/useDebouncedValue.ts        (독립)
2.  hooks/useClickOutside.ts          (독립)
3.  types/admin.ts                    (타입 추가)
4.  components/ui/Modal.tsx           (독립)
5.  hooks/useStudentSearch.ts         (types 의존)
6.  components/admin/notices/StudentTag.tsx       (types 의존)
7.  components/admin/notices/StudentMention.tsx   (훅 + StudentTag 의존)
8.  components/admin/notices/NoticeTypeSelector.tsx (types 의존)
9.  components/admin/notices/VisibilitySelector.tsx (types 의존)
10. hooks/useCreateNotice.ts          (types 의존)
11. components/admin/notices/NoticeFormModal.tsx  (모든 컴포넌트 의존)
12. components/admin/notices/index.ts (export)
13. components/admin/dashboard/WeeklyCalendar.tsx (수정)
```

---

## 5. 예상 총 시간

| Phase | 내용 | 시간 |
|-------|------|------|
| 17A-1 | 유틸 훅 | 20분 |
| 17A-2 | Modal | 30분 |
| 17A-3 | 타입 정의 | 10분 |
| 17A-4 | 학생 검색 훅 | 30분 |
| 17A-5 | StudentTag | 15분 |
| 17A-6 | StudentMention | 45분 |
| 17A-7 | NoticeTypeSelector | 25분 |
| 17A-8 | VisibilitySelector | 15분 |
| 17A-9 | NoticeFormModal | 45분 |
| 17A-10 | useCreateNotice | 30분 |
| 17A-11 | 통합 | 20분 |
| 17A-12 | 빌드 테스트 | 15분 |
| **총계** | | **약 5시간** |

---

## 6. 테스트 체크리스트

### 기능 테스트
- [ ] 모달 열기/닫기 (버튼, ESC, 백드롭)
- [ ] 공지 유형 7개 선택
- [ ] 결석 선택 시 학생 필드 표시
- [ ] @멘션 검색 + 자동완성
- [ ] 학생 선택 → 태그 표시
- [ ] 태그 제거
- [ ] 필수 필드 유효성 검사
- [ ] 공지 등록 (Mock)

### UI 테스트
- [ ] 칩 선택 스타일
- [ ] 드롭다운 애니메이션
- [ ] 에러 상태 표시
- [ ] 로딩 상태 표시

---

*작성일: 2024-12-21*
*참조: 411_notice_modal_mention_ux_research.md*
