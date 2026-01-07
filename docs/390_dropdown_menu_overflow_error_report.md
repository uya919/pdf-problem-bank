# 드롭다운 메뉴 오버플로우 에러 리포트

**작성일**: 2025-12-19
**상태**: 분석 완료
**관련 파일**: `frontend/src/components/admin/users/UserActionsMenu.tsx`

---

## 1. 문제 설명

### 증상
- `/admin/users` (사용자 관리) 페이지에서 강사 목록 중 가장 아래에 있는 사용자의 설정(⋯) 버튼을 클릭하면
- 드롭다운 메뉴가 화면(캔버스) 아래로 내려가서 보이지 않음

### 재현 단계
1. `/admin/users` 접속
2. 강사 목록 스크롤하여 맨 아래로 이동
3. 마지막 강사의 "⋯" 버튼 클릭
4. 드롭다운 메뉴가 화면 아래로 벗어남

---

## 2. 원인 분석

### 현재 코드 (UserActionsMenu.tsx:89)

```typescript
{isOpen && (
  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-grey-200 py-1 z-10">
    {/* 메뉴 아이템들... */}
  </div>
)}
```

### 문제점

| 속성 | 값 | 설명 |
|------|-----|------|
| `position` | `absolute` | 부모 요소 기준 절대 위치 |
| `top` | `top-full` | 트리거 버튼 아래에 위치 |
| `mt-1` | `margin-top: 0.25rem` | 버튼과 4px 간격 |

**핵심 문제**: `top-full`은 항상 버튼 아래에 메뉴를 배치하므로, 화면 하단에 있는 버튼 클릭 시 메뉴가 뷰포트 밖으로 나감

### 드롭다운 메뉴 크기
- 권한 변경 (2개): 약 80px
- 비밀번호 리셋: 약 40px
- 비활성화: 약 40px
- 패딩/마진: 약 20px
- **총 높이**: 약 180~200px

---

## 3. 해결 방안

### Option A: 뷰포트 경계 감지 (권장)

```typescript
import { useState, useRef, useEffect } from 'react';

export function UserActionsMenu({ user, onResetPassword }: UserActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 200; // 예상 메뉴 높이
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // 아래 공간이 부족하고 위에 공간이 있으면 위로 열기
      if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
        setOpenDirection('up');
      } else {
        setOpenDirection('down');
      }
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button ref={buttonRef} onClick={() => setIsOpen(!isOpen)}>⋯</button>

      {isOpen && (
        <div className={`absolute right-0 w-48 bg-white rounded-xl shadow-lg ${
          openDirection === 'up'
            ? 'bottom-full mb-1'
            : 'top-full mt-1'
        }`}>
          {/* 메뉴 아이템 */}
        </div>
      )}
    </div>
  );
}
```

**장점**:
- 자동으로 위/아래 공간 감지
- 사용자 경험 최적화

**단점**:
- 코드 복잡성 증가

### Option B: CSS max-height + overflow-auto

```typescript
<div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg max-h-[50vh] overflow-y-auto">
```

**장점**: 간단한 수정
**단점**: 메뉴가 잘릴 수 있음 (스크롤 필요)

### Option C: 포탈(Portal) 사용

```typescript
import { createPortal } from 'react-dom';

// 메뉴를 document.body에 직접 렌더링
{isOpen && createPortal(
  <div style={{ position: 'fixed', top: menuPosition.y, left: menuPosition.x }}>
    {/* 메뉴 */}
  </div>,
  document.body
)}
```

**장점**: 부모 요소의 overflow 영향 없음
**단점**: 위치 계산 복잡

---

## 4. 권장 해결책

**Option A (뷰포트 경계 감지)** 권장

이유:
1. 자연스러운 UX (위/아래 자동 전환)
2. 다른 위치에서도 동일하게 작동
3. 구현 복잡도 대비 효과가 큼

---

## 5. 수정 대상 파일

| 파일 | 작업 |
|------|------|
| `frontend/src/components/admin/users/UserActionsMenu.tsx` | 드롭다운 방향 감지 로직 추가 |

---

## 6. 개발 계획

### Phase 1: UserActionsMenu 수정

1. `buttonRef` 추가하여 버튼 위치 참조
2. `openDirection` state 추가 (`'up' | 'down'`)
3. `useEffect`에서 메뉴 열릴 때 공간 계산
4. 조건부 className으로 `top-full` 또는 `bottom-full` 적용

### Phase 2: 테스트

| 테스트 | 예상 결과 |
|--------|----------|
| 목록 상단 사용자 클릭 | 메뉴가 아래로 열림 |
| 목록 하단 사용자 클릭 | 메뉴가 위로 열림 |
| 창 크기 조절 | 방향 자동 재계산 |

---

## 7. 참조

- [Radix UI Dropdown Menu](https://www.radix-ui.com/primitives/docs/components/dropdown-menu) - 오픈소스 드롭다운 참조
- [Tailwind CSS Position](https://tailwindcss.com/docs/position)
