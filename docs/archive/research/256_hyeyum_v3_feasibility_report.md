# hyeyum-v3 리팩토링 구현 가능성 리포트

> 기존 hyeyum을 새로운 UI/UX 철학과 모듈화된 구조로 제로베이스 리팩토링

---

## 1. 현황 분석

### 1.1 기존 hyeyum 규모

| 항목 | 수치 |
|------|------|
| TypeScript 파일 | 386개 |
| 주요 기능 | 14개 모듈 |
| 큰 파일 (1000줄+) | 4개 |
| DB 테이블 | 20개+ |

### 1.2 주요 기능 목록

| 기능 | 복잡도 | 우선순위 |
|------|--------|----------|
| 대시보드 (원장/강사) | 🔴 High | P0 |
| 출결 관리 | 🟡 Medium | P0 |
| 진도 기록 | 🔴 High | P0 |
| 숙제 관리 | 🟡 Medium | P1 |
| 학생 관리 | 🟡 Medium | P1 |
| 수업/반 관리 | 🟡 Medium | P1 |
| 시험 점수 | 🟡 Medium | P2 |
| 상담 시스템 | 🟢 Low | P2 |
| 순환수업 | 🔴 High | P2 |
| 공지사항 | 🟢 Low | P3 |
| To-Do | 🟢 Low | P3 |
| 신규 등록 | 🟢 Low | P3 |
| 임시수업 | 🟡 Medium | P3 |
| 계정 관리 | 🟡 Medium | P1 |

### 1.3 기술 스택

| 영역 | 기존 (hyeyum) | v3 (유지) |
|------|--------------|-----------|
| Framework | Next.js 15 | Next.js 15 |
| Language | TypeScript | TypeScript |
| Backend | Supabase | **동일** (기존 DB 연결) |
| State | React Query + Context | React Query + Zustand |
| Styling | Emotion | Tailwind CSS |
| UI | Radix UI | 토스 디자인 시스템 |

---

## 2. 구현 가능성: ✅ 높음

### 2.1 가능한 이유

1. **동일한 백엔드 사용**
   - Supabase DB 스키마 변경 없음
   - 기존 API/RLS 정책 그대로 활용
   - 마이그레이션 불필요

2. **점진적 이관 가능**
   - 기능별 독립 개발
   - hyeyum은 그대로 운영
   - 완성 후 Vercel 도메인만 교체

3. **명확한 디자인 시스템**
   - UI/UX 철학 문서화 완료 (255_ui_ux_design_system.md)
   - 모달 디자인 확정 (progress-modal-v5)
   - 대시보드 목업 확정

4. **모듈화 기준 정립**
   - 파일당 300줄 제한
   - React Query 훅 패턴 통일
   - 컴포넌트 분리 원칙

---

## 3. 우려 사항 및 대응 방안

### 3.1 🔴 High Risk

#### (1) 대규모 코드량
**문제**: 386개 파일을 새 디자인으로 재작성

**대응**:
- Phase별 우선순위 개발 (P0 → P1 → P2 → P3)
- 핵심 기능(대시보드, 출결, 진도) 먼저 완성
- 나머지는 기존 hyeyum 계속 사용

**예상 기간**:
- P0 (핵심): 2-3주
- P1 (필수): 2-3주
- 전체 완성: 6-8주

#### (2) 복잡한 비즈니스 로직
**문제**: 순환수업, 임시수업 등 복잡한 로직 재구현

**대응**:
- 기존 훅/서비스 로직 최대한 재사용
- UI만 새 디자인으로 교체
- 복잡한 기능은 후순위로

#### (3) 인증/권한 시스템
**문제**: 원장/강사/조교 역할별 권한

**대응**:
- 기존 AuthContext 로직 그대로 활용
- RLS 정책 변경 없음
- 프론트엔드 권한 체크만 새로 구현

### 3.2 🟡 Medium Risk

#### (1) 디자인 일관성 유지
**문제**: 개발 중 디자인 드리프트 발생 가능

**대응**:
- 디자인 토큰 CSS 변수로 정의
- 공통 컴포넌트 먼저 완성 후 페이지 개발
- 체크리스트로 검증

#### (2) 두 버전 동시 운영
**문제**: 버그 수정 시 양쪽 모두 적용 필요

**대응**:
- hyeyum은 버그 수정만 (기능 추가 X)
- v3 우선 개발, 기능 완성 후 이관
- 공유 가능한 유틸/타입은 별도 패키지화 고려

#### (3) 테스트 부재
**문제**: 기존에 테스트 코드 없음

**대응**:
- v3에서 핵심 훅 단위테스트 추가
- E2E 테스트는 MVP 이후 고려
- 수동 QA 체크리스트 작성

### 3.3 🟢 Low Risk

#### (1) Supabase 연결
- 환경변수만 복사하면 즉시 연결
- 동일 프로젝트 URL 사용

#### (2) Vercel 배포
- 새 프로젝트로 배포
- 완성 후 도메인만 교체
- 롤백 용이 (기존 hyeyum 유지)

---

## 4. 아키텍처 제안

### 4.1 폴더 구조 (Claude 최적화)

```
hyeyum-v3/
├── .claude/
│   └── memory/           # Claude 메모리
├── docs/
│   ├── plan.md           # 개발 계획
│   └── design/           # 디자인 문서 (pdf에서 복사)
│
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # 인증 페이지
│   │   ├── (dashboard)/  # 메인 대시보드
│   │   └── api/          # API Routes
│   │
│   ├── components/
│   │   ├── ui/           # 기본 UI (Button, Input, Modal...)
│   │   ├── layout/       # 레이아웃 (Sidebar, Header, Nav)
│   │   └── features/     # 기능별 컴포넌트
│   │       ├── dashboard/
│   │       ├── attendance/
│   │       ├── progress/
│   │       └── ...
│   │
│   ├── hooks/
│   │   ├── queries/      # React Query 조회 훅
│   │   ├── mutations/    # React Query 변경 훅
│   │   └── ui/           # UI 관련 훅
│   │
│   ├── lib/
│   │   ├── supabase/     # Supabase 클라이언트
│   │   └── utils/        # 유틸리티
│   │
│   ├── stores/           # Zustand 스토어
│   │
│   ├── styles/
│   │   └── tokens.css    # 디자인 토큰
│   │
│   └── types/            # TypeScript 타입
│
├── CLAUDE.md             # Claude 가이드
└── package.json
```

### 4.2 파일 크기 제한

| 종류 | 최대 라인 | 초과 시 |
|------|----------|---------|
| 페이지 | 200줄 | 컴포넌트 분리 |
| 컴포넌트 | 150줄 | 하위 컴포넌트 분리 |
| 훅 | 100줄 | 유틸 함수 분리 |

### 4.3 디자인 토큰

```css
/* styles/tokens.css */
:root {
  /* Colors */
  --blue: #3182F6;
  --gray-50: #F9FAFB;
  --gray-900: #191F28;

  /* Spacing */
  --space-2: 8px;
  --space-4: 16px;

  /* Component Sizes */
  --input-height: 40px;
  --btn-height: 48px;
}
```

---

## 5. 개발 로드맵

### Phase 0: 프로젝트 세팅 (1일)
- [ ] Next.js 프로젝트 생성
- [ ] Tailwind CSS 설정
- [ ] Supabase 연결
- [ ] CLAUDE.md, plan.md 작성
- [ ] 디자인 토큰 설정

### Phase 1: 공통 컴포넌트 (3-4일)
- [ ] Button, Input, Modal 컴포넌트
- [ ] Layout (Sidebar, BottomNav)
- [ ] 인증 컨텍스트
- [ ] React Query 설정

### Phase 2: P0 기능 (2주)
- [ ] 강사 대시보드
- [ ] 출결 체크
- [ ] 진도 기록 모달

### Phase 3: P1 기능 (2주)
- [ ] 학생 관리
- [ ] 수업 관리
- [ ] 숙제 관리
- [ ] 계정 관리

### Phase 4: P2-P3 기능 (2주)
- [ ] 시험 점수
- [ ] 상담 시스템
- [ ] 순환수업
- [ ] 나머지 기능

### Phase 5: QA 및 배포 (1주)
- [ ] 전체 기능 테스트
- [ ] 버그 수정
- [ ] Vercel 배포
- [ ] 도메인 교체

---

## 6. 결론

### 6.1 권장 사항

✅ **진행 권장**

이유:
1. 동일 백엔드 사용으로 마이그레이션 리스크 없음
2. 점진적 이관으로 운영 중단 없음
3. 명확한 디자인 시스템으로 일관성 유지 가능
4. 모듈화로 유지보수성 크게 향상

### 6.2 핵심 성공 요소

1. **P0 기능 집중**: 대시보드, 출결, 진도 먼저 완성
2. **디자인 일관성**: 토큰 시스템 철저히 준수
3. **점진적 이관**: 기능별로 완성 후 사용 시작
4. **문서화**: Claude 메모리로 컨텍스트 유지

### 6.3 예상 결과

| 항목 | Before (hyeyum) | After (v3) |
|------|-----------------|------------|
| 파일당 평균 라인 | 300-500줄 | 100-150줄 |
| 큰 파일 (500줄+) | 20개+ | 0개 |
| 디자인 일관성 | 혼재 | 통일 |
| 모바일 UX | 부분적 | 완전 최적화 |
| 코드 재사용성 | 낮음 | 높음 |

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [255_ui_ux_design_system.md](255_ui_ux_design_system.md) | UI/UX 디자인 시스템 |
| [254_dashboard_modal_design_connection_research.md](254_dashboard_modal_design_connection_research.md) | 대시보드-모달 연결 |
| [progress-modal-v5-aligned.html](mockups/progress-modal-v5-aligned.html) | 확정 모달 목업 |
| [teacher-dashboard-workflow-comparison.html](mockups/teacher-dashboard-workflow-comparison.html) | 대시보드 1안 목업 |

---

*작성일: 2025-12-10*
