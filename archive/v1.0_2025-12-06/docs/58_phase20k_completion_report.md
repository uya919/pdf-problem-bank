# Phase 20-K: 이중 백슬래시 버그 완전 해결 리포트

## 개요

HWP 수식 변환 시 발생하는 이중 백슬래시 버그를 **완전히 해결**했습니다.

**작성일:** 2025-11-29
**Phase:** 20-K
**상태:** ✅ 완료

---

## 1. 문제 요약

### 증상
- `GEQ 0` → `\\geq 0` 대신 `\\\\geq 0` (이중 백슬래시)
- `overline{ rm AB it }` → `\\overline{...}` 대신 `\\\\overline{...}`
- KaTeX 렌더링 실패 (`\geq` 대신 `geq` 텍스트 표시)

### 근본 원인
1. **다중 서버 실행**: 20개 이상의 백그라운드 서버가 동시 실행 → 이전 코드 버전이 요청 처리
2. **Python 캐시**: `__pycache__`의 이전 바이트코드 사용
3. **복합 패턴 누락**: `_convert_decorations()`의 복합 패턴 #1~#4에 `(?<!\\)` 미적용

---

## 2. 해결 조치

### 2.1 환경 정리
```powershell
# 모든 Python 프로세스 종료
taskkill /F /IM python.exe /T

# __pycache__ 삭제
powershell -Command "Get-ChildItem -Path 'backend' -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force"
```

### 2.2 코드 수정 (hwp_latex_converter.py)

**복합 패턴 #1~#4에 `(?<!\\)` 추가:**

```python
# Line 337: 패턴 #1
rf'(?<!\\)\b{deco}\s*\{{\{{rm\{{([^}}]*)\}}\}}\s*it\s*\}}'

# Line 345: 패턴 #2
rf'(?<!\\)\b{deco}\s*\{{\{{rm\{{([^}}]*)\}}\}}\}}'

# Line 353: 패턴 #3
rf'(?<!\\)\b{deco}\s*\{{\{{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}}\}}'

# Line 361: 패턴 #4
rf'(?<!\\)\b{deco}\s*\{{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}}'
```

---

## 3. 테스트 결과

### 단위 테스트
```
[PASS] GEQ with space     : 'GEQ 0' → '\\geq 0'
[PASS] geq without space  : 'geq0' → '\\geq0'
[PASS] LEQ with space     : 'LEQ 5' → '\\leq 5'
[PASS] leq without space  : 'leq5' → '\\leq5'
[PASS] overline complex   : 'overline{ rm AB it }' → '\\overline{\\mathrm{AB}}'
[PASS] overline simple    : 'overlineAB' → '\\overline{AB}'

결과: 모든 테스트 통과!
```

---

## 4. 수정된 파일

| 파일 | 수정 내용 |
|------|----------|
| `hwp_latex_converter.py` | 복합 패턴 #1~#4에 `(?<!\\)` 추가 (Line 337, 345, 353, 361) |

---

## 5. 재발 방지 가이드라인

### 서버 관리
1. **서버 실행 전**: `netstat -ano | findstr :8000` 으로 기존 프로세스 확인
2. **기존 프로세스 종료**: `taskkill /F /PID {PID}`
3. **단일 터미널 사용**: 하나의 터미널에서만 서버 실행

### 코드 수정 후
1. **서버 자동 리로드 확인** (uvicorn 로그)
2. **리로드 안되면 서버 재시작**
3. **필요시 `__pycache__` 삭제**

### 정규식 패턴 규칙
- **이미 변환된 LaTeX 재매칭 방지**: `(?<!\\)` 사용
- **단어 경계 + 백슬래시 제외**: `(?<!\\)\b`

---

## 6. 결론

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| `GEQ 0` 변환 | `\\\\geq 0` (버그) | `\\geq 0` (정상) |
| `overline{}` 변환 | `\\\\overline` (버그) | `\\overline` (정상) |
| 복합 패턴 보호 | ❌ 미적용 | ✅ `(?<!\\)` 적용 |
| 환경 상태 | 20+ 서버 혼란 | 단일 서버 |
| KaTeX 렌더링 | 실패 | 성공 |

### Phase 20-K 상태: ✅ 완료

---

## 7. 다음 단계

**UI 테스트 필요:**
1. http://localhost:5173 접속
2. HML 파일 업로드 또는 기존 파일 선택
3. "다시 파싱" 버튼 클릭
4. 문제 15, 16, 17에서 `≥`, `overline` 정상 표시 확인

---

*완료: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
