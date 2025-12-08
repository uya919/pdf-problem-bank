# React Frontend (Phase 2)

PDF 라벨링 시스템의 React 프론트엔드입니다.

## 주요 기능

### Phase 2: 기본 UI
- **PDF 업로드**: 드래그 & 드롭 또는 파일 선택으로 PDF 업로드
- **문서 목록**: 업로드된 문서 목록 조회 (자동 갱신)
- **진행률 표시**: 백그라운드 분석 진행률 실시간 표시
- **문서 삭제**: 불필요한 문서 삭제

## 기술 스택

- **Vite 7.2.2**: 빠른 개발 서버 및 빌드 도구
- **React 18**: UI 라이브러리
- **TypeScript**: 타입 안전성
- **Tailwind CSS**: 유틸리티 CSS 프레임워크
- **React Query (@tanstack/react-query)**: 서버 상태 관리
- **Axios**: HTTP 클라이언트

## 설치 및 실행

### 1. 의존성 설치

```bash
cd frontend
npm install
```

### 2. 환경 변수 설정

`.env` 파일 확인:

```bash
VITE_API_URL=http://localhost:8000
```

### 3. 개발 서버 실행

```bash
npm run dev
```

프론트엔드가 http://localhost:5173 에서 실행됩니다.

### 4. 백엔드 연동

백엔드 서버가 http://localhost:8000 에서 실행 중이어야 합니다.

```bash
# 백엔드 디렉토리에서
cd ../backend
python -m app.main
```

## 프로젝트 구조

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts          # API 클라이언트 및 타입 정의
│   ├── components/
│   │   ├── UploadButton.tsx   # PDF 업로드 버튼
│   │   └── DocumentList.tsx   # 문서 목록
│   ├── hooks/
│   │   └── useDocuments.ts    # React Query hooks
│   ├── App.tsx                # 메인 앱 컴포넌트
│   ├── main.tsx               # 진입점
│   └── index.css              # Tailwind CSS
├── .env                       # 환경 변수
├── vite.config.ts             # Vite 설정 (proxy 포함)
├── tailwind.config.js         # Tailwind CSS 설정
└── package.json               # 의존성
```

## API 연동

### API 클라이언트 (`src/api/client.ts`)

모든 백엔드 API 엔드포인트에 대한 타입 안전 클라이언트:

```typescript
import { api } from './api/client';

// 문서 목록 조회
const documents = await api.getDocuments();

// PDF 업로드
const result = await api.uploadPDF(file);

// 페이지 블록 조회
const blocks = await api.getPageBlocks(documentId, pageIndex);
```

### React Query Hooks (`src/hooks/useDocuments.ts`)

React Query를 사용한 데이터 fetching:

```typescript
import { useDocuments, useUploadPDF } from './hooks/useDocuments';

// 문서 목록 (자동 갱신)
const { data, isLoading } = useDocuments();

// PDF 업로드
const uploadMutation = useUploadPDF();
await uploadMutation.mutateAsync(file);
```

## 주요 컴포넌트

### `UploadButton`

PDF 업로드 버튼 및 진행률 표시:

```tsx
<UploadButton />
```

- 파일 선택 또는 드래그 & 드롭
- 업로드 진행률 표시
- 백그라운드 작업 진행률 실시간 표시

### `DocumentList`

문서 목록 표시:

```tsx
<DocumentList onSelectDocument={setSelectedDocument} />
```

- 문서별 진행률 표시
- 문서 선택 및 삭제
- 5초마다 자동 갱신 (백그라운드 작업 확인)

## 빌드

프로덕션 빌드:

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

프리뷰:

```bash
npm run preview
```

## 다음 단계 (Phase 3)

페이지 뷰어 및 블록 선택 기능:
- react-konva를 사용한 캔버스 뷰어
- 페이지 이미지 표시
- 블록 오버레이 및 선택
- 드래그로 그룹 생성
- 그룹 편집 및 저장

## 개발 참고사항

### Proxy 설정

`vite.config.ts`에서 API 요청을 백엔드로 프록시:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

### 환경 변수

Vite 환경 변수는 `VITE_` 접두사가 필요합니다:

```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

### React Query 설정

자동 갱신 및 캐싱 설정:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

## 라이선스

내부 프로젝트
