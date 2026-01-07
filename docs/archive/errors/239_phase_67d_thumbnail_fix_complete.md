# Phase 67-D: 썸네일 표시 문제 수정 완료

**작성일**: 2025-12-09
**상태**: 완료

---

## 1. 문제 원인

Phase 67-C에서 정사각형 카드(`aspect-square`)에 `object-cover`를 적용하여
세로로 긴 문제 이미지의 **상단만 잘려서 표시**되는 문제 발생.

```
Before (Phase 67-C):
┌──────┐ ┌──────┐ ┌──────┐
│-5xy² │ │-5xy² │ │-5xy² │  ← 다 똑같아 보임 (상단만 표시)
└──────┘ └──────┘ └──────┘
```

---

## 2. 해결 방법

`object-cover` → `object-contain`으로 변경하고 배경색 추가:

```tsx
// Before (문제)
<img className="absolute inset-0 w-full h-full object-cover" />

// After (수정)
<div className="absolute inset-0 bg-grey-50 flex items-center justify-center p-1">
  <img className="max-w-full max-h-full object-contain rounded" />
</div>
```

---

## 3. 수정 내용

### 파일: TossProblemCard.tsx

| 항목 | Before | After |
|------|--------|-------|
| 이미지 스타일 | `object-cover` | `object-contain` |
| 컨테이너 | 없음 | `bg-grey-50` + flex centering |
| 패딩 | 없음 | `p-1` (여백) |
| 카드 배경 | `bg-grey-100` | `bg-white` |

---

## 4. 결과

```
After (Phase 67-D):
┌──────┐ ┌──────┐ ┌──────┐
│┌────┐│ │┌────┐│ │┌────┐│
││문제││ ││문제││ ││문제││  ← 각각 다른 전체 이미지
││전체││ ││전체││ ││전체││
│└────┘│ │└────┘│ │└────┘│
│ 1번  │ │ 2번  │ │ 3번  │
└──────┘ └──────┘ └──────┘
```

- 세로로 긴 이미지가 전체 표시됨
- 좌우 여백은 `bg-grey-50` 배경색으로 채움
- 각 카드마다 다른 문제 내용이 명확히 보임

---

## 5. 빌드 결과

```
✓ built in 24.25s
```

---

*Phase 67-D 완료: 2025-12-09*
