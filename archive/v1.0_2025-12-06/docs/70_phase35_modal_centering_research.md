# Phase 35.1 연구 리포트: 모달 센터링 이슈 분석

> **작성일**: 2025-12-03
> **상태**: 연구 완료
> **작성자**: Claude Code (Opus)
> **문제**: 업로드 네이밍 모달이 화면 하단에 치우쳐 표시됨

---

## 1. 문제 분석

### 1.1 현상

스크린샷에서 확인된 문제:
- 모달이 화면 **정중앙**에 표시되지 않음
- 모달 하단이 화면 경계를 벗어남 (잘림 현상)
- 반응형 대응 미흡

### 1.2 현재 구현 코드

```tsx
// UploadNamingModal.tsx:151-155
<motion.div
  initial={{ opacity: 0, scale: 0.95, y: 20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95, y: 20 }}
  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
>
```

### 1.3 문제 원인 분석

| 원인 | 설명 | 심각도 |
|------|------|--------|
| **높이 미제한** | 모달 내용이 화면 높이를 초과 | 높음 |
| **스크롤 없음** | 내용이 넘쳐도 스크롤 불가 | 높음 |
| **반응형 미적용** | 작은 화면에서 여백 없음 | 중간 |
| **overflow-hidden** | 넘친 콘텐츠가 잘림 | 중간 |

---

## 2. 기술적 상세 분석

### 2.1 현재 모달 구조

```
┌─────────────────────────────────────────┐
│ 모달 전체 (fixed, translate-center)     │
├─────────────────────────────────────────┤
│ 헤더 (px-6 py-4) ~70px                  │
├─────────────────────────────────────────┤
│ 본문 (px-6 py-5 space-y-5)              │
│  - 학년 선택 ~80px                      │
│  - 과정 선택 ~80px                      │
│  - 시리즈 입력 ~80px                    │
│  - 타입 선택 ~80px                      │
│  - 미리보기 ~60px                       │
│  총: ~380px                             │
├─────────────────────────────────────────┤
│ 푸터 (px-6 py-4) ~70px                  │
└─────────────────────────────────────────┘
총 높이: ~520px
```

### 2.2 화면 높이별 영향

| 화면 높이 | 모달 높이 | 상태 |
|-----------|-----------|------|
| 1080px | 520px | ✅ 정상 |
| 900px | 520px | ⚠️ 약간 빡빡 |
| 768px | 520px | ❌ 잘림 |
| 600px | 520px | ❌ 심각한 잘림 |

### 2.3 CSS `translate` 동작 원리

```
┌────────────────────────────────────────────────┐
│                  브라우저 창                    │
│                                                │
│         ┌─────────────────┐                   │
│         │     모달        │                   │
│         │   (520px)      │                   │
│         │                │                   │
│         │                │                   │
│         │                │ ← top: 50%        │
│         │                │   = 중심점 기준    │
│         │                │                   │
│ ───────────────────────────────────────────── │
│         │                │                   │
│         │                │ ← translate-y: -50%│
│         │                │   = 모달 높이의 절반│
│         └─────────────────┘                   │
│                                                │
└────────────────────────────────────────────────┘

문제: 모달이 520px인데 화면이 768px면
      top: 50% = 384px
      translate-y: -50% = -260px
      최종 top = 124px
      모달 하단 = 124 + 520 = 644px > 768px ❌
```

---

## 3. 해결 방안

### 3.1 방안 A: Flexbox 기반 센터링 (권장)

**개념**: 오버레이를 flex container로 만들어 모달을 중앙 배치

```tsx
// 오버레이
<motion.div
  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
             flex items-center justify-center p-4"
>
  {/* 모달 */}
  <motion.div
    className="w-full max-w-lg max-h-[90vh] bg-white rounded-2xl
               shadow-2xl overflow-hidden flex flex-col"
  >
    {/* 헤더: flex-shrink-0 */}
    {/* 본문: flex-1 overflow-y-auto */}
    {/* 푸터: flex-shrink-0 */}
  </motion.div>
</motion.div>
```

**장점**:
- 자동 중앙 정렬
- max-height로 화면 초과 방지
- 본문 스크롤 가능
- 반응형 여백 (p-4)

### 3.2 방안 B: 개선된 Transform 방식

```tsx
<motion.div
  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
             w-full max-w-lg max-h-[90vh] mx-4
             bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
>
```

**장점**:
- 기존 코드 변경 최소화

**단점**:
- 반응형 여백 처리 복잡

### 3.3 방안 C: CSS Grid 방식

```tsx
<div className="fixed inset-0 z-50 grid place-items-center p-4">
  <motion.div className="w-full max-w-lg max-h-[90vh] ...">
```

---

## 4. 권장 구현: 방안 A 상세

### 4.1 구조 변경

```tsx
return (
  <AnimatePresence>
    {isOpen && (
      {/* 통합된 오버레이 + 모달 컨테이너 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={isUploading ? undefined : onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50
                   flex items-center justify-center p-4 overflow-y-auto"
      >
        {/* 모달 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()} // 모달 클릭 시 닫힘 방지
          className="w-full max-w-lg max-h-[calc(100vh-2rem)]
                     bg-white rounded-2xl shadow-2xl
                     flex flex-col overflow-hidden"
        >
          {/* 헤더 - 고정 */}
          <div className="flex-shrink-0 ...">
            ...
          </div>

          {/* 본문 - 스크롤 */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            ...
          </div>

          {/* 푸터 - 고정 */}
          <div className="flex-shrink-0 ...">
            ...
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
```

### 4.2 핵심 CSS 클래스 설명

| 클래스 | 역할 |
|--------|------|
| `flex items-center justify-center` | 모달을 정중앙 배치 |
| `p-4` | 화면 가장자리에서 16px 여백 |
| `overflow-y-auto` | 오버레이 자체 스크롤 (극단적 케이스) |
| `max-h-[calc(100vh-2rem)]` | 화면 높이 - 32px 최대 높이 |
| `flex flex-col` | 모달 내부 Flexbox 레이아웃 |
| `flex-shrink-0` | 헤더/푸터 크기 고정 |
| `flex-1 overflow-y-auto` | 본문만 스크롤 |

---

## 5. 반응형 고려사항

### 5.1 브레이크포인트별 조정

```css
/* 기본 (모바일) */
max-h-[calc(100vh-2rem)]  /* 32px 여백 */
p-4                        /* 16px 패딩 */

/* sm (640px+) */
max-h-[calc(100vh-4rem)]  /* 64px 여백 */
p-6                        /* 24px 패딩 */

/* md (768px+) */
max-h-[85vh]              /* 85% 높이 */
```

### 5.2 Tailwind 적용

```tsx
className="fixed inset-0 ... p-4 sm:p-6"
className="max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] md:max-h-[85vh]"
```

---

## 6. 구현 계획

### 6.1 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `UploadNamingModal.tsx` | 레이아웃 구조 변경 |

### 6.2 단계별 구현

1. **오버레이 구조 변경** (5분)
   - 별도 div → 통합 flex container

2. **모달 클래스 수정** (5분)
   - max-height 추가
   - flex-col 레이아웃

3. **본문 스크롤 적용** (3분)
   - overflow-y-auto
   - flex-1

4. **테스트** (5분)
   - 다양한 화면 크기에서 확인

### 6.3 예상 소요 시간

**총 18분**

---

## 7. 대안: 간단 수정 (최소 변경)

기존 코드를 최대한 유지하면서 수정:

```tsx
// 기존
className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
           w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"

// 수정
className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
           w-full max-w-lg max-h-[90vh] m-4
           bg-white rounded-2xl shadow-2xl z-50
           flex flex-col overflow-hidden"
```

그러나 이 방식은 **불완전**합니다. Flexbox 기반 방식을 권장합니다.

---

## 8. 결론

### 8.1 문제 원인
- 모달 높이(~520px)가 고정되어 있어 작은 화면에서 잘림
- `top-1/2 -translate-y-1/2` 방식은 모달 높이가 화면 높이를 초과하면 상단이 잘림

### 8.2 권장 해결책
- **Flexbox 기반 중앙 정렬** (방안 A)
- max-height와 overflow-y-auto 조합으로 스크롤 지원
- 반응형 여백으로 모든 화면 크기 대응

### 8.3 구현 난이도
- **낮음** (기존 코드 구조 유지, CSS 클래스만 변경)
- 예상 소요: **18분**

---

*리포트 작성: Claude Code (Opus)*
*최종 업데이트: 2025-12-03*
