# Claude-Friendly 프로젝트 구조 리팩토링 연구 리포트

**작성일**: 2025-11-26
**분석 대상**: 전체 프로젝트 (backend, frontend, config)
**목적**: Claude Code가 개발/디버깅하기 편한 구조 설계

---

## Executive Summary

### 현재 상태 평가

| 영역 | 점수 | 핵심 문제 |
|------|------|----------|
| **백엔드** | 7/10 | stats.py 런타임 오류, 중복 코드 |
| **프론트엔드** | 8/10 | 큰 컴포넌트(510줄), any 타입 5개 |
| **설정 파일** | 6/10 | 버전 불일치, .gitignore 누락, 불필요한 의존성 |

### 핵심 발견사항

1. **🔴 Critical**: `stats.py`에서 존재하지 않는 config 속성 참조 → 런타임 오류
2. **🟠 High**: 루트 `requirements.txt`에 PySide6 (불필요한 GUI 프레임워크)
3. **🟠 High**: PageViewer.tsx 510줄 → 분할 필요
4. **🟡 Medium**: JSON 파일 I/O, 문서 검증 등 중복 코드 다수
5. **🟡 Medium**: .gitignore 루트/백엔드에 없음

---

## Part 1: 백엔드 분석

### 1.1 파일 구조 현황

```
backend/app/
├── main.py           (91줄)   ✅ 양호
├── config.py         (118줄)  ✅ 양호
├── routers/
│   ├── pdf.py        (289줄)  ✅ 양호
│   ├── blocks.py     (266줄)  ✅ 양호
│   ├── documents.py  (135줄)  ✅ 양호
│   ├── export.py     (326줄)  ⚠️ 가장 복잡
│   └── stats.py      (202줄)  🔴 런타임 오류!
└── services/
    └── task_queue.py (182줄)  ✅ 양호
```

### 1.2 Critical Bug: stats.py

**문제 코드** (라인 52, 165, 171, 181):
```python
config.PROBLEMS_DIR    # ❌ 정의되지 않음
config.LABELS_DIR      # ❌ 정의되지 않음
config.BLOCKS_DIR      # ❌ 정의되지 않음
```

**실제 존재하는 속성**:
```python
config.DOCUMENTS_DIR   # ✅ 문서 루트
config.get_document_dir(document_id)  # ✅ 문서별 경로
```

**영향**: Dashboard 통계 API가 완전히 작동하지 않음

### 1.3 중복 코드 패턴

| 패턴 | 발생 위치 | 해결책 |
|------|----------|--------|
| 문서 디렉토리 검증 | 모든 라우터 | `validate_document_exists()` |
| JSON 읽기/쓰기 | 모든 라우터 | `load_json()`, `save_json()` |
| 페이지 인덱스 추출 | export.py, blocks.py | `extract_page_index()` |
| Bbox 계산 | export.py | `calculate_bounding_box()` |
| 시간 포맷팅 | stats.py | `format_time_ago()` |

### 1.4 에러 처리 불일치

```python
# 패턴 1 (blocks.py) - 표준
except HTTPException:
    raise
except Exception as e:
    print(f"[API 오류] ...")
    raise HTTPException(...)

# 패턴 2 (pdf.py) - Traceback 포함
except Exception as e:
    import traceback
    traceback.print_exc()
    raise HTTPException(...)

# 패턴 3 (stats.py) - HTTP 예외 미처리
except Exception as e:
    raise HTTPException(...)
```

---

## Part 2: 프론트엔드 분석

### 2.1 파일 구조 현황

```
frontend/src/
├── api/client.ts        (349줄)  ✅ 타입 완벽
├── components/          (16개)
│   ├── ui/             (8개)    ✅ 재사용 가능
│   └── layout/         (3개)    ✅ 구조화됨
├── hooks/              (2개)    ✅ TanStack Query 활용
├── lib/                (4개)    ⚠️ 디자인시스템 미활용
├── pages/              (11개)
│   └── PageViewer.tsx  (510줄)  🟠 분할 필요!
└── utils/              (1개)
```

### 2.2 큰 컴포넌트 문제

**PageViewer.tsx (510줄)** - 너무 많은 책임:
- 페이지 네비게이션
- 블록 선택 상태 관리
- 그룹 CRUD
- 자동 저장 (debounce)
- 키보드 단축키
- 설정 관리

**권장 분할**:
```
PageViewer.tsx (메인)
├── hooks/useSaveGroups.ts      ← 저장 로직
├── hooks/useKeyboardShortcuts.ts ← 단축키
├── components/PageViewerToolbar.tsx
└── components/PageViewerContent.tsx
```

### 2.3 타입 안전성 문제

**any 타입 5개 발견**:
```typescript
// 1. ProblemBankPage.tsx L30
const [selectedProblem, setSelectedProblem] = useState<any>(null);

// 2-3. api/client.ts
exportPageProblems(..., metadata?: any)
getExportedProblems(...): Promise<any[]>

// 4. UploadButton.tsx
catch (error: any) { ... }

// 5. ProblemsView.tsx
problems가 암시적 any[]
```

### 2.4 중복 코드 패턴

| 패턴 | 발생 위치 | 해결책 |
|------|----------|--------|
| 필터링/정렬 로직 | DocumentsPage, ProblemBankPage | `useFiltersAndSort()` 훅 |
| 로딩/에러 UI | 모든 페이지 | `<LoadingState>`, `<ErrorState>` 컴포넌트 |
| 모달 상태 관리 | 여러 페이지 | `useModalState()` 훅 |
| 삭제 확인 로직 | 여러 페이지 | `useConfirmDelete()` 훅 |

### 2.5 매직 넘버

```typescript
// 현재
setTimeout(() => { ... }, 100);  // 무슨 100ms?
// 자동 저장: 2초 디바운스 (주석만 있음)

// 개선
const AUTO_EDIT_DELAY_MS = 100;
const DEBOUNCE_SAVE_MS = 2000;
```

---

## Part 3: 설정 파일 분석

### 3.1 의존성 문제

**루트 requirements.txt (불필요)**:
```
PySide6>=6.6.0      ❌ GUI 프레임워크 - 현재 사용 안 함
pytest-qt>=4.2.0    ❌ Qt 테스트 - 현재 사용 안 함
```

**버전 관리 정책 불일치**:
| 패키지 | 루트 | 백엔드 |
|--------|------|--------|
| Pillow | >=10.0.0 | ==10.1.0 |
| numpy | >=1.24.0 | ==1.26.2 |
| opencv | >=4.8.0 | ==4.8.1.78 |

### 3.2 .gitignore 누락

```
❌ 루트/.gitignore      → .env 노출 위험!
❌ backend/.gitignore   → __pycache__ 추적 위험
✅ frontend/.gitignore  → 존재함
```

### 3.3 환경 변수 경로 불일치

```bash
# 루트 .env
DATASET_ROOT=./dataset_root        # 상대 경로

# 백엔드 .env
DATASET_ROOT=c:/MYCLAUDE_PROJECT/pdf/dataset_root  # 절대 경로
```

---

## Part 4: 리팩토링 계획

### Phase 12-1: Critical 버그 수정 (즉시)

```
1. stats.py config 속성 수정
   - PROBLEMS_DIR → get_document_dir() 사용
   - LABELS_DIR → get_document_dir() 사용
   - BLOCKS_DIR → get_document_dir() 사용

2. 루트 requirements.txt 정리
   - PySide6 제거
   - pytest-qt 제거
   - 또는 파일 삭제 (백엔드만 사용)
```

### Phase 12-2: 백엔드 유틸리티 모듈 추가

```
backend/app/utils/
├── __init__.py
├── file_utils.py       # load_json, save_json
├── validators.py       # validate_document_exists
├── formatters.py       # format_time_ago, extract_page_index
└── image_utils.py      # calculate_bounding_box
```

### Phase 12-3: 프론트엔드 훅 추가

```
frontend/src/hooks/
├── useDocuments.ts     (기존)
├── useProblemNumberContext.ts (기존)
├── useSaveGroups.ts    ← 신규 (PageViewer에서 추출)
├── useFiltersAndSort.ts ← 신규 (중복 제거)
├── useModalState.ts    ← 신규 (중복 제거)
└── useConfirmAction.ts ← 신규 (삭제 확인 등)
```

### Phase 12-4: 상수 및 타입 정리

```
frontend/src/
├── constants/
│   ├── timing.ts       # DEBOUNCE_MS, REFETCH_INTERVAL 등
│   └── ui.ts           # 매직 넘버 정리
├── types/
│   └── api.ts          # any 타입 제거, 구체적 타입 정의
```

### Phase 12-5: 설정 파일 정리

```
1. .gitignore 추가
   - 루트: .env, __pycache__, node_modules, dist
   - 백엔드: __pycache__, *.pyc, .env

2. 환경 변수 정규화
   - 모든 경로를 절대 경로로 통일
   - 또는 환경별 분리 (.env.development, .env.production)

3. 루트 requirements.txt
   - 삭제하거나 README로 대체
```

### Phase 12-6: 로깅 표준화 (선택)

```python
# 현재: print() 사용
print(f"[API 오류] 조회 실패: {str(e)}")

# 개선: logging 라이브러리
import logging
logger = logging.getLogger(__name__)
logger.error(f"조회 실패: {str(e)}")
```

---

## Part 5: Claude-Friendly 구조 원칙

### 5.1 파일 크기 가이드라인

| 크기 | 권장 | 현재 위반 |
|------|------|----------|
| < 200줄 | 이상적 | - |
| 200-400줄 | 허용 | GroupPanel, PageCanvas |
| > 400줄 | 분할 필요 | **PageViewer (510줄)** |

### 5.2 네이밍 규칙 통일

```
파일명:
- 컴포넌트: PascalCase.tsx (PageViewer.tsx)
- 훅: camelCase.ts (useDocuments.ts)
- 유틸: camelCase.ts (formatters.ts)

변수/함수:
- camelCase 통일 (snake_case 제거)

API 응답:
- snake_case (Python 백엔드 기준)
```

### 5.3 주석 규칙

```typescript
// Phase 12-1: 기능 설명
// 모든 새 코드에 Phase 번호 포함

/**
 * 함수 설명
 * @param documentId - 문서 ID
 * @returns 저장 결과
 */
```

### 5.4 에러 처리 통일

```python
# 백엔드 표준 패턴
try:
    # 로직
except HTTPException:
    raise
except Exception as e:
    logger.error(f"[{함수명}] 오류: {str(e)}")
    raise HTTPException(status_code=500, detail=f"오류: {str(e)}")
```

```typescript
// 프론트엔드 표준 패턴
try {
    await api.someAction();
    showToast('성공', 'success');
} catch (error) {
    console.error('[함수명] 오류:', error);
    showToast('실패했습니다', 'error');
}
```

---

## Part 6: 우선순위 정리

### 즉시 실행 (Phase 12-1)
1. ✅ stats.py config 버그 수정
2. ✅ 루트 requirements.txt 정리
3. ✅ .gitignore 추가

### 단기 (Phase 12-2, 12-3)
4. 백엔드 utils/ 모듈 추가
5. 프론트엔드 공통 훅 추가
6. any 타입 5개 제거

### 중기 (Phase 12-4, 12-5)
7. 상수 파일 정리
8. PageViewer 분할
9. 환경 변수 정규화

### 장기 (Phase 12-6)
10. 로깅 라이브러리 도입
11. 테스트 코드 작성
12. 문서화 보강

---

## 결론

현재 프로젝트는 **Phase 1-11까지 빠르게 기능 개발**에 집중하면서 일부 기술 부채가 쌓인 상태입니다.

**가장 시급한 문제**:
1. `stats.py` 런타임 오류 (Dashboard 작동 안 함)
2. 불필요한 PySide6 의존성
3. .gitignore 누락

이 세 가지를 먼저 해결하고, 이후 단계적으로 코드 품질을 개선하면 Claude Code가 훨씬 효율적으로 개발할 수 있는 구조가 됩니다.

---

*분석 완료: 2025-11-26*
*다음 단계: 사용자 승인 후 Phase 12-1 진행*
