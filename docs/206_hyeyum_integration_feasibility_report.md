# PDF 라벨링 앱 + Hyeyum 통합 가능성 연구 리포트

**문서 번호**: 206
**작성일**: 2025-12-06
**목적**: PDF 라벨링 앱을 hyeyum 백오피스의 사이드 프로젝트로 통합하는 가능성 분석
**상태**: 연구 단계 (개발 미진행)

---

## 1. 현재 상태 비교

### 1.1 Hyeyum 백오피스

| 항목 | 내용 |
|------|------|
| **위치** | `C:\MYCLAUDE_PROJECT\hyeyum` |
| **Framework** | Next.js 15 (App Router) |
| **React** | React 19 |
| **스타일** | Emotion + Radix UI |
| **상태관리** | Zustand + TanStack Query |
| **DB** | Supabase PostgreSQL + Drizzle ORM |
| **배포** | Vercel Pro ($20/월) |
| **리전** | Seoul (icn1) |
| **페이지 수** | 40+ 페이지 (대시보드, 학생관리, 출결, 회의 등) |

### 1.2 PDF 라벨링 앱

| 항목 | 내용 |
|------|------|
| **위치** | `C:\MYCLAUDE_PROJECT\pdf` |
| **Backend** | FastAPI (Python 3.11) |
| **Frontend** | React 18 + Vite |
| **스타일** | Tailwind CSS |
| **상태관리** | Zustand + TanStack Query |
| **DB** | 파일 기반 (JSON in dataset_root/) |
| **배포** | 로컬 개발 환경 |
| **핵심 의존성** | PyMuPDF, OpenCV, NumPy |

---

## 2. 기술 스택 차이 분석

### 2.1 호환 가능한 부분

```
✅ 상태관리: Zustand (동일)
✅ 데이터 페칭: TanStack Query (동일)
✅ TypeScript 기반
✅ 컴포넌트 기반 React
```

### 2.2 호환 불가능한 부분

```
❌ Backend 언어: Python vs JavaScript
❌ React 버전: 18 vs 19 (마이너 호환성 문제 가능)
❌ 스타일링: Tailwind vs Emotion (완전히 다른 접근)
❌ 빌드 도구: Vite vs Next.js (번들링 방식 차이)
❌ 데이터 저장: 파일시스템 vs PostgreSQL
```

### 2.3 핵심 문제: Python 의존성

PDF 라벨링 앱의 핵심 기능은 Python 라이브러리에 의존:

```python
# 필수 Python 라이브러리 (Vercel에서 실행 불가)
PyMuPDF==1.23.8      # PDF 파싱 및 이미지 변환
opencv-python==4.8.1  # 블록 검출 (컴퓨터 비전)
numpy==1.26.2         # 수치 연산
```

**Vercel Serverless Functions는 Python을 지원하지만:**
- PyMuPDF, OpenCV는 네이티브 바이너리 필요
- 50MB 함수 크기 제한 초과
- Cold start 시간 10초+ 예상

---

## 3. 통합 옵션 분석

### Option A: Frontend만 통합 (권장)

```
┌─────────────────────────────────────────────────────┐
│  Vercel (hyeyum.vercel.app)                        │
│  ┌─────────────────────────────────────────────┐   │
│  │  Next.js App                                 │   │
│  │  ├─ /dashboard/*    (기존 hyeyum)           │   │
│  │  ├─ /students/*     (기존 hyeyum)           │   │
│  │  └─ /labeling/*     (PDF 앱 통합) ← NEW     │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
          │                    │
          ▼                    ▼
┌─────────────────┐   ┌─────────────────────────┐
│  Supabase       │   │  별도 Python 서버       │
│  (PostgreSQL)   │   │  (Railway/Render/EC2)   │
│  - hyeyum 데이터│   │  - PDF 처리             │
│  - 라벨링 메타  │   │  - 블록 검출            │
└─────────────────┘   │  - 이미지 변환          │
                      └─────────────────────────┘
```

**장점:**
- 기존 Python 백엔드 유지 (안정성)
- 프론트엔드 코드만 마이그레이션
- Supabase로 메타데이터 통합 관리

**단점:**
- 별도 Python 서버 비용 발생
- 두 개의 백엔드 관리 필요

**비용:**
- Vercel Pro: $20/월 (기존)
- Python 서버: $5-15/월 (Railway Hobby)
- **총: $25-35/월**

---

### Option B: Supabase Storage + Edge Functions

```
┌─────────────────────────────────────────────────────┐
│  Vercel                                            │
│  └─ Next.js (hyeyum + labeling UI)                │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  Supabase                                          │
│  ├─ PostgreSQL (메타데이터)                        │
│  ├─ Storage (PDF, 이미지 저장)                     │
│  └─ Edge Functions (경량 처리만)                   │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  외부 Python API (필수)                            │
│  - PDF → 이미지 변환                               │
│  - OpenCV 블록 검출                                │
└─────────────────────────────────────────────────────┘
```

**장점:**
- 파일 저장소를 Supabase Storage로 통합
- 메타데이터 일원화

**단점:**
- Python 처리 서버는 여전히 필요
- 아키텍처 복잡도 증가

---

### Option C: Full Next.js 마이그레이션 (비권장)

```
모든 것을 Next.js로 마이그레이션:
- Python 코드 → JavaScript로 재작성
- PyMuPDF → pdf.js (제한적)
- OpenCV → tensorflow.js 또는 WebAssembly
```

**장점:**
- 단일 기술 스택
- Vercel에서 완전 배포

**단점:**
- 6개월+ 개발 기간
- PDF/이미지 처리 품질 저하 우려
- 핵심 자산 (density_analyzer.py) 재작성 필요

---

## 4. Vercel 통합 가능성

### 4.1 가능한 것

| 기능 | Vercel 지원 | 비고 |
|------|-------------|------|
| React 프론트엔드 | ✅ 완전 지원 | Next.js로 마이그레이션 필요 |
| API Routes | ✅ 지원 | Node.js 기반 API만 |
| 이미지 최적화 | ✅ 지원 | next/image 활용 |
| 정적 파일 | ✅ 지원 | public/ 폴더 |

### 4.2 불가능한 것

| 기능 | 이유 | 대안 |
|------|------|------|
| Python 실행 | Vercel은 Node.js 기반 | 별도 서버 필요 |
| PyMuPDF | 네이티브 바이너리 | Railway/Render |
| OpenCV | 패키지 크기 초과 | Railway/Render |
| 파일 시스템 | Serverless 제한 | Supabase Storage |

### 4.3 Vercel Pro 리소스 현황

```
현재 hyeyum 사용량:
├─ Function Execution: ~20% 사용
├─ Bandwidth: ~30% 사용
└─ Build Minutes: ~40% 사용

PDF 앱 추가 시 예상:
├─ Function Execution: +10% (프론트엔드만)
├─ Bandwidth: +20% (이미지 로딩)
└─ Build Minutes: +15%

→ Pro 플랜 범위 내 충분히 수용 가능
```

---

## 5. Supabase 통합 가능성

### 5.1 현재 Supabase 스키마 (hyeyum)

```sql
-- 주요 테이블 (40+ 테이블)
profiles, students, classes, attendance,
homework, consultations, announcements, meetings, ...
```

### 5.2 PDF 라벨링 추가 시 필요한 테이블

```sql
-- 새로 추가할 테이블
CREATE TABLE labeling_documents (
  id UUID PRIMARY KEY,
  name TEXT,
  pdf_url TEXT,  -- Supabase Storage URL
  page_count INTEGER,
  created_at TIMESTAMPTZ,
  user_id UUID REFERENCES profiles(id)
);

CREATE TABLE labeling_pages (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES labeling_documents(id),
  page_number INTEGER,
  image_url TEXT,
  blocks_json JSONB,
  groups_json JSONB
);

CREATE TABLE labeling_sessions (
  id UUID PRIMARY KEY,
  name TEXT,
  problem_doc_id UUID,
  solution_doc_id UUID,
  problems JSONB,
  links JSONB
);
```

### 5.3 Supabase 비용 분석

```
현재 hyeyum 사용량:
├─ Database: ~100MB
├─ Storage: ~500MB
└─ Monthly: Free Tier

PDF 앱 추가 시:
├─ Database: +50MB (메타데이터)
├─ Storage: +5GB (PDF, 이미지)
└─ 예상 비용: Free Tier 초과 가능

Pro Plan ($25/월) 필요 시:
├─ Database: 8GB
├─ Storage: 100GB
└─ 충분한 여유
```

---

## 6. 우려 사항

### 6.1 기술적 우려

| 우려 | 심각도 | 설명 |
|------|--------|------|
| Python 서버 별도 운영 | 🟡 중간 | 추가 인프라 관리 필요 |
| React 버전 차이 | 🟢 낮음 | 18→19 마이그레이션 가능 |
| 스타일 시스템 통합 | 🟡 중간 | Tailwind→Emotion 변환 필요 |
| 빌드 시스템 | 🟢 낮음 | Vite→Next.js 표준 패턴 |

### 6.2 운영적 우려

| 우려 | 심각도 | 설명 |
|------|--------|------|
| 두 프로젝트 의존성 | 🟡 중간 | hyeyum 업데이트가 labeling에 영향 |
| 배포 복잡도 | 🟡 중간 | 2개 서버 동시 관리 |
| 디버깅 난이도 | 🟢 낮음 | 분리된 서비스로 격리 |

### 6.3 비용 우려

| 항목 | 현재 | 통합 후 |
|------|------|---------|
| Vercel | $20/월 | $20/월 (변동 없음) |
| Python 서버 | $0 | $5-15/월 |
| Supabase | Free | $0-25/월 |
| **총** | **$20/월** | **$25-60/월** |

---

## 7. 권장 아키텍처

### Phase 1: 최소 통합 (Option A 변형)

```
┌──────────────────────────────────────────────────────────┐
│  Vercel: hyeyum-edu.vercel.app                          │
│  ├─ /dashboard     (hyeyum 메인)                        │
│  ├─ /labeling      (PDF 라벨링 UI)  ← 신규 라우트       │
│  └─ /api/labeling  (Proxy to Python) ← API Routes      │
└──────────────────────┬───────────────────────────────────┘
                       │
           ┌───────────┴───────────┐
           ▼                       ▼
┌─────────────────────┐   ┌─────────────────────┐
│  Supabase          │   │  Railway/Render     │
│  ├─ PostgreSQL     │   │  └─ FastAPI         │
│  │  (통합 데이터)   │   │     ├─ PDF 처리    │
│  └─ Storage        │   │     ├─ 블록 검출   │
│     (PDF, 이미지)   │   │     └─ 이미지 크롭 │
└─────────────────────┘   └─────────────────────┘
```

### Phase 2: 점진적 마이그레이션

1. **메타데이터 이관**: 파일 JSON → Supabase PostgreSQL
2. **파일 저장 이관**: 로컬 → Supabase Storage
3. **프론트엔드 통합**: React 18 → Next.js 컴포넌트
4. **인증 통합**: Supabase Auth 단일화

---

## 8. 구현 로드맵 (예상)

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| **1** | Python 서버 클라우드 배포 (Railway) | 2시간 |
| **2** | Supabase 스키마 추가 | 2시간 |
| **3** | Next.js 라벨링 라우트 생성 | 4시간 |
| **4** | API Proxy 설정 | 2시간 |
| **5** | 프론트엔드 컴포넌트 마이그레이션 | 16시간 |
| **6** | Supabase Storage 연동 | 4시간 |
| **7** | 테스트 및 안정화 | 8시간 |
| **총** | | **~38시간** |

---

## 9. 결론

### 9.1 구현 가능성: ✅ 가능

PDF 라벨링 앱을 hyeyum의 사이드 프로젝트로 통합하는 것은 **기술적으로 가능**합니다.

### 9.2 핵심 제약

1. **Python 백엔드 필수**: PyMuPDF, OpenCV는 대체 불가
2. **별도 서버 비용**: 월 $5-15 추가
3. **프론트엔드 마이그레이션**: Tailwind → Emotion 변환 필요

### 9.3 권장 사항

| 상황 | 권장 |
|------|------|
| 빠른 통합 원할 때 | Option A (프론트엔드만 통합) |
| 비용 최소화 원할 때 | 현재 상태 유지 (별도 프로젝트) |
| 완전 통합 원할 때 | Option A → Phase 2 점진적 마이그레이션 |

### 9.4 최종 의견

> hyeyum과 PDF 라벨링 앱은 **같은 학원 관리 도메인**에 속하므로 통합의 논리적 근거가 있습니다.
> 그러나 **Python 의존성**으로 인해 완전한 기술 통합은 불가능하며,
> **하이브리드 아키텍처** (Next.js 프론트 + 외부 Python API)가 현실적입니다.
>
> 개발 시간 대비 얻는 이점을 고려하면, **현재 상태를 유지하면서 필요 시 API 연동**하는 것도 좋은 선택입니다.

---

*이 문서는 연구 단계이며, 개발은 진행되지 않았습니다.*
*승인 후 실행: "통합 진행해줘" 또는 "Option A로 시작해줘"*
