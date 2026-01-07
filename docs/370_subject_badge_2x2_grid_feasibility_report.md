# 과목별 수강 뱃지 2x2 그리드 UI 타당성 분석

> 작성일: 2025-12-17
> 상태: 분석 완료

---

## 1. 요청 사항

### 현재 구현
```
수강 과목 컬럼:
(수)(국)(영)(과)   ← 4개 원형 뱃지, 미배정은 테두리만
 ●  ●  ○  ○
```

### 요청된 변경
```
- 미배정 과목: 뱃지 없음 (아예 표시 안함)
- 배정된 과목만: 과목명 + 반 레벨 표시
- 2x2 그리드 배열
```

### 요청된 레이아웃 예시

**1과목:**
```
┌─────────┐
│ 수 심화반│
└─────────┘
```

**2과목:**
```
┌─────────┬─────────┐
│ 영 정규반│ 수 심화반│
└─────────┴─────────┘
```

**3과목:**
```
┌─────────┬─────────┐
│ 국 A반  │ 수 심화반│
├─────────┼─────────┤
│ 영 정규반│         │
└─────────┴─────────┘
```

**4과목:**
```
┌─────────┬─────────┐
│ 국 정규반│ 수 심화반│
├─────────┼─────────┤
│ 영 정규반│ 과 심화반│
└─────────┴─────────┘
```

---

## 2. 구현 가능성 분석

### ✅ 기술적으로 구현 가능

```tsx
// 핵심 로직
const enrolledSubjects = Object.entries(subjectEnrollments || {})
  .filter(([_, enrollment]) => !!enrollment);

// 2x2 그리드 렌더링
<div className="grid grid-cols-2 gap-1">
  {enrolledSubjects.map(([subject, enrollment]) => (
    <SubjectBadge key={subject} subject={subject} enrollment={enrollment} />
  ))}
</div>
```

---

## 3. 우려되는 점

### 3.1 테이블 레이아웃 불안정

| 문제 | 설명 | 심각도 |
|------|------|--------|
| **높이 불일치** | 1과목 학생 vs 4과목 학생의 행 높이가 다름 | ⚠️ 중간 |
| **열 너비 변동** | 과목 수에 따라 셀 너비가 달라질 수 있음 | ⚠️ 중간 |
| **스크롤 UX** | 행 높이가 다르면 스크롤 시 불안정 | ⚠️ 중간 |

**예시 - 높이 불일치:**
```
┌────────┬──────────┬─────────────────┬─────┐
│ 김민준 │ 중2      │ 수 심화반       │ 95% │  ← 1줄
├────────┼──────────┼─────────────────┼─────┤
│ 이서윤 │ 중2      │ 국 A반  수 심화반│ 88% │  ← 2줄
│        │          │ 영 정규반       │     │
├────────┼──────────┼─────────────────┼─────┤
│ 박지훈 │ 중3      │ 국 A반  수 심화반│ 92% │  ← 2줄
│        │          │ 영 정규반 과 정규│     │
└────────┴──────────┴─────────────────┴─────┘
```

### 3.2 공간 효율성 저하

| 현재 방식 | 요청된 방식 |
|-----------|-------------|
| 고정 너비 ~140px | 가변 너비 ~160-200px |
| 고정 높이 ~28px | 가변 높이 28-56px |

**계산:**
- 현재: 7px × 4 + gap 4px × 3 = 40px 너비
- 요청: "수 심화반" 텍스트 기준 최소 60px × 2 = 120px + gap

### 3.3 정보 밀도 vs 가독성 트레이드오프

| 항목 | 현재 | 요청된 방식 |
|------|------|-------------|
| 한눈에 파악 | ⭐⭐⭐⭐⭐ (4개 동그라미) | ⭐⭐⭐ (텍스트 읽어야 함) |
| 상세 정보 | ⭐⭐ (hover 필요) | ⭐⭐⭐⭐⭐ (바로 보임) |
| 공간 효율 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

### 3.4 정렬 순서 문제

요청된 예시에서 과목 순서가 일관되지 않음:
```
3과목 예시:
국 A반    수 심화반   ← 국, 수
영 정규반            ← 영

하지만 2과목 예시:
영 정규반  수 심화반  ← 영, 수 (국 없이)
```

**해결 방안:**
- Option A: 항상 수→국→영→과 순서 (빈 칸 발생)
- Option B: 등록된 순서대로 채우기 (일관성 부족)
- Option C: 고정 위치 (수=좌상, 국=우상, 영=좌하, 과=우하)

---

## 4. 대안 제안

### 4.1 하이브리드 방식 (권장)

**컴팩트 뱃지 + 텍스트:**
```
┌──────────────────────────────┐
│ (수)심화 (국)정규 (영)정규   │
└──────────────────────────────┘
```

```tsx
// 1줄 가로 배열, 텍스트 포함
<div className="flex flex-wrap gap-1">
  {enrolledSubjects.map(([subject, enrollment]) => (
    <span className={`px-2 py-0.5 rounded-full text-xs ${subjectColor}`}>
      {subjectShort}{levelShort}
    </span>
  ))}
</div>
```

**장점:**
- 높이 일관성 유지 (1줄)
- 공간 효율적
- 과목+레벨 정보 바로 확인

### 4.2 2열 세로 배열

```
┌────────────┐
│ 수 심화반  │
│ 국 정규반  │
│ 영 정규반  │
└────────────┘
```

**장점:**
- 정렬 깔끔
- 읽기 쉬움

**단점:**
- 세로 공간 많이 차지

### 4.3 요청된 2x2 그리드 (고정 위치)

```
┌─────────┬─────────┐
│ 수 심화반│ 국 정규반│  ← 수학, 국어 고정 위치
├─────────┼─────────┤
│ 영 정규반│ 과 정규반│  ← 영어, 과학 고정 위치
└─────────┴─────────┘
```

미등록 과목은 빈 칸으로 처리:
```
1과목(수학만):
┌─────────┬─────────┐
│ 수 심화반│         │
├─────────┼─────────┤
│         │         │
└─────────┴─────────┘
```

---

## 5. 권장 구현 방안

### Option A: 하이브리드 1줄 뱃지 (권장)

```
수강 과목 컬럼:
┌────────────────────────────┐
│ 수심화  국정규  영정규      │  ← 색상별 작은 뱃지
└────────────────────────────┘
```

**구현:**
```tsx
function SubjectBadgesCompact({ subjectEnrollments }) {
  const enrolled = Object.entries(subjectEnrollments || {})
    .filter(([_, e]) => !!e);

  if (enrolled.length === 0) return <span className="text-grey-400">-</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {enrolled.map(([subject, enrollment]) => {
        const config = SUBJECT_CONFIG[subject];
        const levelShort = LEVEL_SHORT[enrollment.level]; // 심→심, 정→정, 기→기
        return (
          <span
            key={subject}
            className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.bgActive} ${config.textActive}`}
          >
            {config.short}{levelShort}
          </span>
        );
      })}
    </div>
  );
}
```

### Option B: 요청된 2x2 그리드

```tsx
function SubjectBadges2x2({ subjectEnrollments }) {
  const subjects: SubjectCode[] = ['math', 'korean', 'english', 'science'];
  const enrolled = subjects.filter(s => !!subjectEnrollments?.[s]);

  if (enrolled.length === 0) return <span className="text-grey-400">-</span>;

  return (
    <div className="grid grid-cols-2 gap-0.5 min-w-[120px]">
      {enrolled.map((subject) => {
        const config = SUBJECT_CONFIG[subject];
        const enrollment = subjectEnrollments[subject];
        return (
          <div
            key={subject}
            className={`px-1.5 py-0.5 rounded text-xs ${config.bgActive} ${config.textActive}`}
          >
            {config.short} {LEVEL_LABELS[enrollment.level]}
          </div>
        );
      })}
    </div>
  );
}
```

---

## 6. 결론

| 옵션 | 구현 난이도 | 공간 효율 | 정보 밀도 | 권장 |
|------|-------------|-----------|-----------|------|
| 현재 (원형 4개) | - | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | |
| 하이브리드 1줄 | 쉬움 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ **권장** |
| 2x2 그리드 | 중간 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 가능 |
| 세로 리스트 | 쉬움 | ⭐⭐ | ⭐⭐⭐⭐⭐ | |

### 최종 권장

**Option A (하이브리드 1줄)** 를 권장합니다.

이유:
1. 테이블 행 높이 일관성 유지
2. 미배정은 표시 안함 (요청 반영)
3. 과목명 + 레벨 바로 확인 가능 (요청 반영)
4. 공간 효율적

요청하신 2x2 그리드도 구현 가능하지만, 테이블 행 높이 불일치 문제가 발생할 수 있습니다.

**어떤 방식으로 진행할까요?**
- A: 하이브리드 1줄 뱃지 (권장)
- B: 요청된 2x2 그리드

---

*작성: Claude Code*
