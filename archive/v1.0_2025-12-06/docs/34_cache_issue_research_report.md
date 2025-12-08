# 캐시 문제 연구 리포트

**작성일**: 2025-11-29
**상태**: 분석 완료

---

## 1. 문제 현상

### 1.1 증상
- 백엔드 코드 수정 후에도 웹에서 이전 데이터가 표시됨
- 문제 15번: 수정된 cases 변환이 적용되지 않음
- 백엔드 직접 테스트 시 정상 동작 확인

### 1.2 확인된 사실

**백엔드 데이터 (정상)**:
```
content_text: { x ^{2} -2x-3 ≥ 0 / x ^{2} - (a+5 )x+5a<0 }
content_latex: \begin{cases}x ^{2} - 2x - 3 \geq 0 \\ ...\end{cases}
```

**웹 표시 (이전 데이터)**:
```
{cases{x ^{2} - 2x - 3 ≥Wgeq 0# x ^{2} - Wleft...
```

---

## 2. 캐시 원인 분석

### 2.1 프로젝트 캐시 레이어

```
┌─────────────────────────────────────────────────────────────────┐
│                    사용자 브라우저                               │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: React State 캐시                                      │
│  - useState(parseResult) 저장                                   │
│  - 파일 재업로드 없으면 유지                                     │
│  - ⚠️ 가장 가능성 높음                                          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: React Query 캐시                                      │
│  - staleTime: 5분                                               │
│  - gcTime: 5분                                                  │
│  - parseFile은 mutation → 캐시 미사용                           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: 브라우저 HTTP 캐시                                    │
│  - POST 요청은 일반적으로 캐시 안 됨                             │
│  - 단, Cache-Control 헤더에 따라 다름                           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4: Vite HMR 캐시                                         │
│  - 프론트엔드 코드 변경 시에만 해당                              │
│  - 백엔드 변경은 관계 없음                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI 백엔드                               │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5: Python __pycache__                                    │
│  - PYTHONDONTWRITEBYTECODE=1 → 해결됨                           │
│  - --reload 옵션 → 파일 변경 감지                               │
├─────────────────────────────────────────────────────────────────┤
│  Layer 6: 다중 서버 인스턴스                                    │
│  - 포트 8000에 단일 서버만 실행 중 (PID 51704)                  │
│  - 문제 없음                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 핵심 원인: React State 캐시

**HangulUploadPage.tsx 분석**:

```typescript
// 파싱 결과가 React state에 저장됨
const [parseResult, setParseResult] = useState<ParseResult | null>(null);

// mutation 성공 시 state 업데이트
const parseMutation = useMutation({
  mutationFn: (file: File) => hangulApi.parseFile(file),
  onSuccess: (data) => {
    setParseResult(data);  // ← 여기서 저장
  }
});
```

**문제점**:
1. 사용자가 파일을 업로드하면 `parseResult`에 저장
2. 백엔드 코드가 변경되어도 **state는 유지**
3. 새로운 데이터를 받으려면 **파일을 다시 업로드**해야 함

---

## 3. 해결 방법

### 3.1 즉시 해결 (사용자 액션)

| 방법 | 설명 | 효과 |
|------|------|------|
| **파일 재업로드** | 같은 HML 파일을 다시 드래그앤드롭 | React state 갱신 |
| **페이지 새로고침** | F5 또는 브라우저 새로고침 버튼 | React state 초기화 |
| **강제 새로고침** | Ctrl+Shift+R (Windows) | 브라우저 캐시도 무시 |
| **시크릿 모드** | Ctrl+Shift+N (Chrome) | 모든 캐시 우회 |

### 3.2 중기 해결 (개발 개선)

#### 옵션 A: 새로고침 버튼 추가

```typescript
// HangulUploadPage.tsx에 추가
const handleRefresh = async () => {
  if (file) {
    parseMutation.mutate(file);
  }
};

// UI에 새로고침 버튼 추가
<button onClick={handleRefresh}>
  <RefreshCw /> 다시 파싱
</button>
```

#### 옵션 B: 개발 중 자동 새로고침

```typescript
// 개발 환경에서만 백엔드 변경 시 자동 refetch
if (import.meta.env.DEV) {
  // WebSocket 또는 polling으로 백엔드 버전 체크
}
```

#### 옵션 C: Cache-Control 헤더 설정

```python
# FastAPI 응답에 캐시 비활성화 헤더 추가
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return response
```

### 3.3 장기 해결 (아키텍처 개선)

| 방안 | 설명 | 복잡도 |
|------|------|--------|
| 버전 태깅 | API 응답에 파서 버전 포함, 버전 변경 시 자동 refetch | 중간 |
| React Query 사용 | mutation → query 변경, 자동 invalidation | 중간 |
| 서버 푸시 | WebSocket으로 백엔드 변경 알림 | 높음 |

---

## 4. 현재 상황 요약

### 4.1 캐시 레이어 상태

| 레이어 | 상태 | 조치 필요 |
|--------|------|----------|
| Python __pycache__ | ✅ 해결됨 (PYTHONDONTWRITEBYTECODE=1) | - |
| 서버 인스턴스 | ✅ 단일 서버 실행 | - |
| Uvicorn reload | ✅ 파일 변경 감지됨 | - |
| React State | ⚠️ 이전 데이터 유지 | 파일 재업로드 |
| 브라우저 캐시 | ⚠️ 가능성 낮음 | 강제 새로고침 |

### 4.2 권장 조치

**지금 즉시**:
1. 같은 HML 파일을 **다시 업로드** (드래그앤드롭)
2. 또는 **Ctrl+Shift+R**로 강제 새로고침

**개발 편의성 개선** (선택):
3. "다시 파싱" 버튼 추가 검토

---

## 5. 백엔드 정상 동작 확인

```bash
# 직접 테스트 결과 (정상)
=== 문제 15번 content_text ===
연립부등식 { x ^{2} -2x-3 ≥ 0 / x ^{2} - (a+5 )x+5a<0 } 을 만족시키는...

=== 문제 15번 content_latex ===
연립부등식 $\begin{cases}x ^{2} - 2x - 3 \\geq 0 \\ x ^{2} - \left( a + 5 \right)x + 5a < 0\end{cases}$...

=== cases 패턴 확인 ===
content_text에 {cases{ 포함: False  ← 변환 완료
content_latex에 begin{cases} 포함: True  ← LaTeX 변환 완료
```

---

## 6. 결론

### 6.1 근본 원인
- **React State 캐시**: 파일 업로드 후 `parseResult` state가 유지됨
- 백엔드 코드 변경이 프론트엔드 state에 자동 반영되지 않음

### 6.2 즉시 해결책
1. **같은 HML 파일을 다시 업로드** (가장 확실)
2. 또는 **Ctrl+Shift+R** 강제 새로고침

### 6.3 개발 워크플로우 권장

```
백엔드 코드 수정
    ↓
서버 자동 reload (--reload 옵션)
    ↓
프론트엔드에서 파일 재업로드  ← 필수!
    ↓
새로운 데이터 확인
```

---

*캐시 문제 연구 리포트 - 2025-11-29*
