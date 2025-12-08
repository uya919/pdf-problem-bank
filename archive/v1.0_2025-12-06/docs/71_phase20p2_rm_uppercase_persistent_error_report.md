# Phase 20-P-2: RM 대문자 버그 - 프론트엔드 지속 에러 리포트

## 개요

**작성일:** 2025-11-29
**Phase:** 20-P-2
**상태:** 분석 완료 - 프론트엔드 캐시 문제 확인
**심각도:** 중간

---

## 1. 문제 현상

### 1.1 사용자 보고

프론트엔드에서 문제 16에 다음과 같이 표시됨:

```
점 $RMA$의 좌표가 $(-3, 1)$이고
```

**기대 결과:**
```
점 $\mathrm{A}$의 좌표가 $(-3, 1)$이고
```

### 1.2 시도한 해결 방법 (모두 실패)

1. 백엔드 서버 재시작
2. 페이지 리로드
3. "다시 파싱" 버튼 클릭

---

## 2. 분석 결과

### 2.1 백엔드 파싱 결과 - 정상 ✓

직접 HMLParser를 호출하여 문제 16을 확인한 결과:

```python
# 실행 코드
parser = HMLParser(file_path)
result = parser.parse()
p = result.problems[15]  # 문제 16

# 결과
content_latex에 'RM' 없음 ✓
content_equations_latex:
  - Eq 5: '\\mathrm{ABC}' ✓
  - Eq 6: '\\mathrm{G}' ✓
  - Eq 7: '\\mathrm{GA}' ✓
  - Eq 8: '\\mathrm{GC}' ✓
  - Eq 11: '\\mathrm{A}' ✓  ← 문제의 'RM A'가 정상 변환됨
  - Eq 13: '\\mathrm{BC}' ✓
```

### 2.2 hwp_to_latex 함수 - 정상 ✓

```python
# HML 파일의 원본 SCRIPT 태그 내용
original = 'RM A`'

# 변환 결과
hwp_to_latex('RM A`') = '\\mathrm{A}'  ✓
```

### 2.3 HML 파일 분석 - 원본 확인

```
Script 168: 'RM A`'
```

HML 파일에는 `RM A`와 backtick(\`)이 포함되어 있으며, 이는 정상적으로 `\mathrm{A}`로 변환됩니다.

---

## 3. 근본 원인

### 3.1 확정된 원인: 프론트엔드 캐시 또는 데이터 소스 불일치

| 계층 | 상태 | 설명 |
|------|------|------|
| HML 파일 | 원본 | `RM A\`` (정상) |
| hwp_latex_converter | 정상 | `RM A\`` → `\mathrm{A}` |
| HMLParser | 정상 | content_latex에 `\mathrm{A}` |
| **프론트엔드** | **문제** | 여전히 `RMA` 또는 `RM A` 표시 |

### 3.2 가능한 원인들

1. **브라우저 캐시**: 이전 파싱 결과가 캐시되어 있음
2. **React Query 캐시**: TanStack Query가 stale 데이터 반환
3. **Service Worker 캐시**: 오래된 API 응답 캐시
4. **LocalStorage/IndexedDB**: 이전 데이터 저장

---

## 4. 해결 방안

### 방안 A: 브라우저 캐시 강제 삭제 (권장)

1. **Chrome DevTools 열기** (F12)
2. **Network 탭** → "Disable cache" 체크
3. **Application 탭** → Storage → "Clear site data" 클릭
4. **페이지 강제 새로고침** (Ctrl+Shift+R)

### 방안 B: React Query 캐시 무효화

프론트엔드 코드에서 캐시 키를 변경하거나 강제 refetch:

```typescript
// 캐시 무효화
queryClient.invalidateQueries(['hangul', 'problems']);

// 또는 강제 refetch
queryClient.refetchQueries(['hangul', 'problems'], { force: true });
```

### 방안 C: API 응답에 캐시 방지 헤더 추가

**backend/app/routers/hangul.py**에 추가:

```python
from fastapi import Response

@router.post("/parse")
async def parse_hangul(file: UploadFile, response: Response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    # ... 기존 코드
```

---

## 5. 검증 방법

### 5.1 백엔드 검증 (이미 완료 - 정상)

```bash
cd backend
python -c "
from app.services.hangul.hml_parser import HMLParser
parser = HMLParser('path/to/file.Hml')
result = parser.parse()
p = result.problems[15]
print('RM in content_latex:', 'RM' in p.content_latex)
"
# 예상 출력: RM in content_latex: False
```

### 5.2 프론트엔드 검증

1. Chrome DevTools (F12) 열기
2. Network 탭에서 API 응답 확인
3. 응답에 `RM A` 또는 `\mathrm{A}` 중 어느 것이 있는지 확인

---

## 6. 테스트 결과 요약

| 테스트 | 결과 |
|--------|------|
| hwp_to_latex('RM A\`') | `\mathrm{A}` ✓ |
| HMLParser 문제 16 파싱 | RM 없음 ✓ |
| 단위 테스트 24개 | 모두 통과 ✓ |
| 회귀 테스트 12개 | 모두 통과 ✓ |
| **프론트엔드 표시** | **RM A 표시 (캐시 문제)** |

---

## 7. 결론

### 7.1 백엔드 수정은 완료됨

Phase 20-P-2 코드 수정은 성공적으로 완료되었습니다:

- `hwp_latex_converter.py`: `re.IGNORECASE` 추가 ✓
- `hml_parser.py`: `_fix_rm_patterns_in_latex()` 메서드 확장 ✓
- 36개 테스트 모두 통과 ✓

### 7.2 프론트엔드 캐시 문제

프론트엔드가 이전 파싱 결과를 캐시하고 있어 새로운 결과가 표시되지 않습니다.

**해결 방법:**
1. 브라우저 캐시 완전 삭제 (Ctrl+Shift+Delete → 모든 데이터 삭제)
2. 시크릿 모드에서 확인
3. 또는 프론트엔드 캐시 전략 수정

---

## 8. 권장 조치

### 즉시 조치 (사용자)

1. **브라우저 캐시 완전 삭제**:
   - Chrome: 설정 → 개인정보 및 보안 → 인터넷 사용 기록 삭제
   - 또는 Ctrl+Shift+Delete → "전체 기간" 선택 → 모든 항목 체크 → 삭제

2. **시크릿 모드에서 테스트**:
   - Ctrl+Shift+N (Chrome)
   - http://localhost:5173 접속
   - 파일 다시 업로드

### 장기 조치 (개발)

1. API 응답에 `Cache-Control: no-store` 헤더 추가
2. 프론트엔드 캐시 키에 버전 또는 타임스탬프 추가
3. "다시 파싱" 버튼이 캐시를 완전히 무효화하도록 수정

---

*Phase 20-P-2 분석 완료: 2025-11-29*
*작성: Claude Code (Opus 4.5)*
