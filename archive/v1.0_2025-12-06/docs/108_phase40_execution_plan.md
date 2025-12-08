w# Phase 40: 라벨링 UI 리팩토링 실행 계획

> 2025-12-04 | 목업 승인 후 작성
> 참고: [mockup_labeling_ui.html](mockup_labeling_ui.html)

---

## 목표 UI (승인됨)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← 고1 공통수학1 - 베이직쎈         [?] [⚙️]    2/7 완료  [내보내기] │
├─────────┬───────────────────────────────────────────┬───────────────┤
│ 미연결 5│   [< 이전]    1/120 (책 15p)    [다음 >]  │ ▼ 17p    4/7 │
│ ○ 3번  │   ━━━━■□□□□□□□□□□□□□□□□□□□□□□□□□□ 1%      │   1 ✓        │
│ ○ 4번  │ ┌─────────────────────────────────────┐   │   2 ✓        │
│ ○ 5번  │ │         PDF 캔버스                  │   │   3 ✓        │
│ ○ 6번  │ │                                     │   │   4 편집중    │
│ ○ 7번  │ │                                     │   │ ────────────  │
│ ─────── │ │                                     │   │ ▶ 10p  7/7 ✓ │
│ 완료  2 │ │                                     │   │ ▶ 8p   5/5 ✓ │
│ ✓ 1→R1 │ └─────────────────────────────────────┘   │ ▶ 5p   6/6 ✓ │
│ ✓ 2→R2 │   ← → 페이지 | G 그룹 | Esc 해제         │              │
└─────────┴───────────────────────────────────────────┴───────────────┘
```

---

## 실행 단계 (총 5단계)

### Step 1: 파일 정리 (20분)

**목적**: 불필요한 파일 제거, 깔끔한 시작점 확보

```
작업 내용:
[ ] 1-1. 백업 파일 삭제
    - frontend/src/pages/PageViewer.tsx.backup
    - frontend/src/pages/PageViewer.tsx.backup-20251126-144518
    - frontend/src/components/PageCanvas.tsx.backup

[ ] 1-2. 빌드 확인
    - cd frontend && npm run build

완료 조건: 빌드 성공
```

---

### Step 2: UI 요소 삭제 (30분)

**목적**: 불필요한 UI 제거, 화면 정리

```
작업 내용:
[ ] 2-1. PageViewer.tsx에서 삭제
    - 보라색 그라데이션 헤더 (L627-641)
    - "페이지 미리보기" 헤더 (L660-662)
    - 하단 통계 카드 4개 (L700-756)

[ ] 2-2. 브라우저에서 확인
    - 삭제된 요소가 사라졌는지 확인
    - 기존 기능 정상 작동 확인

완료 조건: 화면에서 3개 요소 제거됨, 기능 정상
```

---

### Step 3: 헤더 + 네비게이션 간소화 (1시간)

**목적**: 목업처럼 간결한 헤더와 네비게이션 구현

```
작업 내용:
[ ] 3-1. LabelingHeader.tsx 생성 (새 파일)
    위치: frontend/src/components/labeling/LabelingHeader.tsx
    내용:
    - 뒤로가기 버튼
    - 문서명 + 진행률 텍스트
    - 도움말/설정 아이콘 버튼
    - 내보내기 버튼

[ ] 3-2. SimpleNavigation.tsx 생성 (새 파일)
    위치: frontend/src/components/labeling/SimpleNavigation.tsx
    내용:
    - [< 이전] 버튼
    - 페이지 정보 (1/120 + 책 페이지)
    - 진행률 바
    - [다음 >] 버튼
    - 단축키 힌트 (한 줄)

[ ] 3-3. PageViewer.tsx 수정
    - 기존 헤더 → LabelingHeader로 교체
    - 기존 PageNavigation → SimpleNavigation으로 교체

[ ] 3-4. 브라우저에서 확인

완료 조건: 목업과 동일한 헤더/네비게이션
```

---

### Step 4: 아코디언 그룹 패널 (1.5시간)

**목적**: 페이지별 아코디언 UI 구현

```
작업 내용:
[ ] 4-1. useVisitedPages.ts 훅 생성 (새 파일)
    위치: frontend/src/hooks/useVisitedPages.ts
    내용:
    - 방문한 페이지 목록 관리
    - localStorage 영속화
    - markVisited(pageIndex) 함수

[ ] 4-2. PageSection.tsx 생성 (새 파일)
    위치: frontend/src/components/labeling/PageSection.tsx
    내용:
    - 아코디언 헤더 (페이지번호 + 진행률)
    - 펼침/접힘 상태
    - 그룹 목록 (펼쳤을 때)

[ ] 4-3. AccordionGroupPanel.tsx 생성 (새 파일)
    위치: frontend/src/components/labeling/AccordionGroupPanel.tsx
    내용:
    - 현재 페이지 섹션 (항상 펼침)
    - 완료된 페이지 섹션들 (접힘)
    - 기존 GroupPanel 로직 재사용

[ ] 4-4. PageViewer.tsx 수정
    - 기존 GroupPanel → AccordionGroupPanel로 교체
    - useVisitedPages 훅 연결
    - 페이지 전환 시 방문 기록

[ ] 4-5. 브라우저에서 확인
    - 현재 페이지 펼쳐짐
    - 페이지 이동 시 이전 페이지 접힘
    - 완료된 페이지 체크 표시

완료 조건: 목업과 동일한 아코디언 동작
```

---

### Step 5: 최종 정리 및 테스트 (30분)

**목적**: 코드 정리, 전체 테스트

```
작업 내용:
[ ] 5-1. 미사용 import 정리
    - PageViewer.tsx
    - 기타 수정된 파일

[ ] 5-2. 기존 컴포넌트 정리
    - PageNavigation.tsx → 삭제 또는 _archived로 이동
    - GroupPanel.tsx → 삭제 또는 _archived로 이동

[ ] 5-3. 전체 기능 테스트
    - 블록 선택 → 그룹 생성
    - 문항 정보 편집 → 저장
    - 페이지 이동 (화살표 키)
    - 그룹 삭제
    - 내보내기

[ ] 5-4. 빌드 확인
    - npm run build

완료 조건: 모든 기능 정상, 빌드 성공
```

---

## 파일 생성/수정 요약

### 새로 생성 (5개)
```
frontend/src/components/labeling/
├── LabelingHeader.tsx        (50줄)
├── SimpleNavigation.tsx      (80줄)
├── AccordionGroupPanel.tsx   (200줄)
└── PageSection.tsx           (100줄)

frontend/src/hooks/
└── useVisitedPages.ts        (50줄)
```

### 수정 (1개)
```
frontend/src/pages/PageViewer.tsx
- 760줄 → 약 400줄 (UI 요소 삭제 + 새 컴포넌트 사용)
```

### 삭제/아카이브 (5개)
```
삭제:
- PageViewer.tsx.backup
- PageViewer.tsx.backup-20251126-144518
- PageCanvas.tsx.backup

아카이브 (선택):
- PageNavigation.tsx → _archived/
- GroupPanel.tsx → _archived/
```

---

## 예상 시간

| 단계 | 작업 | 시간 |
|------|------|------|
| Step 1 | 파일 정리 | 20분 |
| Step 2 | UI 요소 삭제 | 30분 |
| Step 3 | 헤더 + 네비게이션 | 1시간 |
| Step 4 | 아코디언 패널 | 1.5시간 |
| Step 5 | 최종 정리 | 30분 |
| **합계** | | **3시간 50분** |

---

## 실행 명령

각 단계 완료 후 "다음 단계 진행해줘"라고 말씀해주시면 됩니다.

시작하시겠습니까? "Step 1 진행해줘"라고 하시면 시작합니다.

---

*계획 작성: 2025-12-04*
