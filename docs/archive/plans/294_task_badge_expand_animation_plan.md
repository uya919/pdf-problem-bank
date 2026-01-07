# TaskBadge 확대 애니메이션 개발 계획

> 선택된 뱃지가 확대되고 나머지가 축소되는 애니메이션 구현

**목업**: `docs/mockups/dashboard-badge-expand-v1.html`
**대상 컴포넌트**: `frontend/src/components/backoffice/dashboard/TaskBadgeCard.tsx`

---

## 📋 개발 단계

### Phase 1: CSS 스타일 수정
**예상 시간**: 10분

1. **뱃지 기본 스타일 변경**
   ```css
   /* 비선택 상태 */
   flex: 0.9
   opacity: 0.8
   padding: 12px 4px
   gap: 3px
   ```

2. **선택된 뱃지 스타일**
   ```css
   /* 선택 상태 */
   flex: 1.15
   opacity: 1
   box-shadow: 0 2px 6px rgba(0,0,0,0.08)
   outline: 2px solid [색상]
   ```

3. **화살표 표시/숨김**
   ```css
   /* 비선택: 공간 차지 안 함 */
   display: none

   /* 선택: 표시 */
   display: inline
   ```

4. **트랜지션 추가**
   ```css
   transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)
   ```

---

### Phase 2: TaskBadgeCard.tsx 수정
**예상 시간**: 15분

1. **Tailwind 클래스 업데이트**
   - 비선택 뱃지: `flex-[0.9] opacity-80`
   - 선택 뱃지: `flex-[1.15] opacity-100 shadow-md`

2. **화살표 조건부 렌더링**
   ```tsx
   {isOpen && <ChevronUpIcon size={10} />}
   ```

3. **outline 스타일 추가** (선택 시)
   ```tsx
   className={`... ${isOpen ? 'ring-2 ring-current' : ''}`}
   ```

---

### Phase 3: 테스트 및 미세 조정
**예상 시간**: 10분

1. **iPhone 12 Pro (390px) 테스트**
   - 4개 뱃지가 한 줄에 표시되는지 확인
   - 선택 시 애니메이션 부드러운지 확인

2. **다른 기기 테스트**
   - iPhone SE (375px)
   - Android 일반 (360px)

3. **미세 조정**
   - flex 값 조정 (필요시)
   - 트랜지션 타이밍 조정

---

## 📁 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `TaskBadgeCard.tsx` | 뱃지 스타일 및 애니메이션 |

---

## ✅ 체크리스트

- [ ] Phase 1: CSS 스타일 정의
- [ ] Phase 2: TaskBadgeCard.tsx 수정
- [ ] Phase 3: iPhone 테스트
- [ ] Phase 3: 빌드 확인

---

## 🎯 목표 결과

**Before** (현재):
```
[🔔 공지  ] [✓ 출결 2] [📋 진도 1] [📝 숙제 2]
     5 ▲
```
↑ 공지가 2줄로 넘어감

**After** (구현 후):
```
[🔔 공지 5 ▲] [✓ 출결 2] [📋 진도 1] [📝 숙제 2]
```
↑ 선택 뱃지 확대, 나머지 축소로 한 줄 유지

---

*작성일: 2025-12-12*
