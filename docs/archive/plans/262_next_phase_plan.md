# Hyeyum 백오피스 다음 단계 계획

> Stage 1-5 완료 후 실제 앱 완성을 위한 계획
> 작성일: 2025-12-10

---

## 현재 완료 상태

| Stage | 내용 | 상태 |
|-------|------|------|
| 1 | 기능 명세서, 스키마, 비즈니스 로직 문서화 | ✅ |
| 2 | hyeyum UI 차단 (deny 규칙) | ✅ |
| 3 | 디자인 시스템 (tokens, Button, Card 등) | ✅ |
| 4 | 백오피스 컴포넌트 (HeroCard, TodoList, ProgressModal) | ✅ |
| 5 | Supabase 연동 (클라이언트, hooks) | ✅ |

---

## Phase 6: 페이지 통합

### 6.1 데모 페이지 생성
```
목적: 만든 컴포넌트들이 실제로 작동하는지 확인

파일: frontend/src/pages/BackofficeDemo.tsx

내용:
- DashboardHeroCard 렌더링
- TodoList 렌더링
- NoticeDropbox 렌더링
- ProgressModal 열기/닫기 테스트
```

### 6.2 라우팅 구성
```
현재 PDF 라벨링 앱과 백오피스를 분리

옵션 A: 별도 라우트
- /labeling/* → 기존 PDF 라벨링
- /backoffice/* → 새 백오피스

옵션 B: 탭/모드 전환
- 상단에 "라벨링 | 백오피스" 탭
```

---

## Phase 7: 인증 시스템

### 7.1 로그인 페이지
```
파일: frontend/src/pages/Login.tsx

컴포넌트:
- 이메일 입력
- 비밀번호 입력
- 로그인 버튼
- 에러 메시지

스타일: 디자인 시스템 사용
```

### 7.2 인증 보호
```typescript
// ProtectedRoute 컴포넌트
if (!isAuthenticated) {
  return <Navigate to="/login" />;
}
return children;
```

---

## Phase 8: 대시보드 완성

### 8.1 실제 데이터 연동
```
현재: 목업 데이터
목표: Supabase에서 실제 데이터 조회

- useTodayClasses → 오늘 수업 목록
- useLastProgress → 최근 진도
- TODO 목록 조회/저장
```

### 8.2 출결 체크 모달
```
파일: frontend/src/components/backoffice/modals/AttendanceModal.tsx

기능:
- 학생 목록 표시
- 출석/결석/지각/사유결석 선택
- 저장
```

---

## Phase 9: 테스트 및 배포

### 9.1 로컬 테스트
```bash
# 프론트엔드 실행
cd frontend && npm run dev

# 백오피스 데모 페이지 접속
http://localhost:5173/backoffice
```

### 9.2 빌드 검증
```bash
npm run build
# 에러 없이 빌드 성공 확인
```

### 9.3 배포 (선택)
```
옵션:
- Vercel (현재 hyeyum 배포 중)
- 별도 URL로 배포
- 또는 로컬 개발만 진행
```

---

## 우선순위 정리

| 순서 | 작업 | 예상 시간 | 필수 여부 |
|------|------|----------|----------|
| 1 | 데모 페이지 생성 | 30분 | ⭐ 필수 |
| 2 | 라우팅 구성 | 30분 | ⭐ 필수 |
| 3 | 로그인 페이지 | 1시간 | 선택 |
| 4 | 실제 데이터 연동 | 2시간 | 선택 |
| 5 | 출결 체크 모달 | 1시간 | 선택 |
| 6 | 빌드 및 테스트 | 30분 | ⭐ 필수 |

---

## 즉시 실행 가능한 작업

**"진행해줘" 시 다음 작업 실행:**

1. BackofficeDemo.tsx 페이지 생성
2. App.tsx에 라우팅 추가
3. 프론트엔드 빌드 테스트

---

*작성: Claude Code | 2025-12-10*
