# Phase 19-C: LaTeX 렌더링 문제 연구 리포트

**작성일**: 2025-11-29
**상태**: 분석 완료 / 해결 필요

---

## 1. 문제 현상

### 1.1 증상
- HML 파일 업로드 후 미리보기에서 수식이 **일반 텍스트로 표시**됨
- 예: `| x-5 | <3` 형태로 표시되어야 할 수식이 KaTeX로 렌더링되지 않음
- `content_latex` 필드가 **빈 문자열("")**로 API에서 반환됨

### 1.2 기대 동작
- 수식은 `$\left| x - 5 \right| < 3$` 형태로 LaTeX 마크업되어야 함
- 프론트엔드의 `MathDisplay` 컴포넌트가 KaTeX로 렌더링해야 함

---

## 2. 코드 분석

### 2.1 백엔드 데이터 흐름

```
[HML 파일] → HMLParser.parse() → ParseResult → to_dict() → JSON 응답
```

#### 2.1.1 `hml_parser.py` - LaTeX 추출 로직 (정상)

```python
# Line 248-311: _get_paragraph_text_with_latex()
def _get_paragraph_text_with_latex(self, p_elem) -> tuple:
    """
    Phase 19-C: 문단에서 텍스트와 LaTeX 버전 모두 추출
    Returns: (plain_text, latex_text, hwp_equations, latex_equations)
    """
    # EQUATION 태그 발견 시:
    latex_eq = hwp_to_latex(eq_text)  # HWP 수식 → LaTeX 변환
    latex_parts.append(f'${latex_eq}$')  # $...$ 패턴으로 감싸기
```

#### 2.1.2 `hml_parser.py` - 문제 본문 매핑 (정상)

```python
# Line 575-643: _find_problem_contents_by_autonum()
problem_contents.append({
    'text': plain_content,
    'latex': latex_content,  # ← LaTeX 버전 저장
    'equations': all_hwp_equations,
    'equations_latex': all_latex_equations
})
```

#### 2.1.3 `hml_parser.py` - ParsedProblem 생성 (정상)

```python
# Line 478-484: _extract_by_endnote()
if i < len(problem_contents):
    content_data = problem_contents[i]
    problem.content_text = content_data['text']
    problem.content_latex = content_data['latex']  # ← content_latex 설정
```

#### 2.1.4 `parser_base.py` - 직렬화 (정상)

```python
# Line 35-50: ParsedProblem.to_dict()
def to_dict(self) -> Dict[str, Any]:
    return {
        "content_latex": self.content_latex,  # ← 직렬화에 포함
        "content_equations_latex": self.content_equations_latex,
        # ...
    }
```

### 2.2 프론트엔드 데이터 흐름

```
API 응답 → ParseResult → HangulUploadPage → MathDisplay 컴포넌트
```

#### 2.2.1 `hangul.ts` - 타입 정의 (정상)

```typescript
export interface ParsedProblem {
  content_latex: string;  // Phase 19-C: LaTeX 포함 텍스트
  content_equations_latex: string[];
  answer_latex: string | null;
  // ...
}
```

#### 2.2.2 `MathDisplay.tsx` - 렌더링 로직 (정상)

```tsx
function renderMixedContent(text: string): string {
  const mathPattern = /\$([^$]+)\$/g;
  // $...$ 패턴을 찾아 KaTeX로 렌더링
}
```

---

## 3. 테스트 결과 비교

| 테스트 방법 | content_latex 값 | 결과 |
|-------------|------------------|------|
| **직접 Python 테스트** | `"수학영역... $\left\| x - 5 \right\| < 3$..."` | **정상** |
| **API 시뮬레이션** (file→temp→parse) | 값 있음 | **정상** |
| **실제 API 호출** (curl) | `""` (빈 문자열) | **실패** |

### 3.1 핵심 발견
> 동일한 코드가 직접 실행 시 정상 작동하나, API를 통해 호출하면 실패함

---

## 4. 근본 원인 분석

### 4.1 주요 원인: 다중 서버 프로세스 충돌

#### 4.1.1 현상
- **8개 이상의 백그라운드 Bash 프로세스**가 동시 실행됨
- 모두 `uvicorn --reload`로 포트 8000에서 서버 실행 시도
- 일부는 Phase 19-C 코드 적용 전의 **구버전 코드**로 실행 중

#### 4.1.2 증거
```
Background Bash 88f253 (uvicorn) - status: running
Background Bash d1ba0e (uvicorn) - status: running
Background Bash a46f1d (uvicorn) - status: running
Background Bash 29732a (uvicorn) - status: running
Background Bash 32dc36 (uvicorn) - status: running
Background Bash 9eebe4 (uvicorn) - status: running
Background Bash f8b2e9 (uvicorn) - status: running
Background Bash 079279 (uvicorn) - status: running
```

#### 4.1.3 메커니즘
1. 첫 번째 서버가 포트 8000을 점유
2. 이후 서버들은 바인딩 실패 또는 부분적 성공
3. **Windows의 `--reload` 옵션**이 파일 변경을 제대로 감지 못함
4. 요청이 **구버전 코드를 실행하는 프로세스**로 라우팅됨
5. 구버전에는 `content_latex` 설정 로직이 없음 → 빈 문자열 반환

### 4.2 보조 원인: 프로세스 종료 실패

- `taskkill //F //PID` 명령이 모든 프로세스를 종료하지 못함
- Uvicorn의 `--reload` 워커 프로세스가 부모 종료 후에도 남아있음
- 새 서버 시작 시 포트 충돌 발생

---

## 5. 데이터 흐름 다이어그램

```
[정상 흐름 - 직접 Python 테스트]

HML 파일 → HMLParser (최신 코드) → ParsedProblem
                                   ↓
                              content_latex = "$...$"
                                   ↓
                              to_dict() → 정상 JSON


[비정상 흐름 - API 호출]

HTTP POST /api/hangul/parse
         ↓
    [포트 8000]
         ↓
┌────────┴────────┐
│                 │
▼                 ▼
[구버전 서버]    [신버전 서버]
(요청 처리)      (대기 중)
     ↓
HMLParser (구 코드)
     ↓
content_latex = ""  ← Phase 19-C 로직 없음!
     ↓
빈 문자열 반환
```

---

## 6. 해결 방안

### 6.1 즉시 조치 (필수)

#### Step 1: 모든 Python 프로세스 강제 종료
```bash
# Windows
taskkill /F /IM python.exe
taskkill /F /IM python3.exe

# 또는 특정 포트 사용 프로세스 찾기
netstat -ano | findstr :8000
taskkill /F /PID <PID>
```

#### Step 2: 포트 확인
```bash
netstat -ano | findstr :8000
# 결과가 없어야 함 (포트 사용 프로세스 없음)
```

#### Step 3: 서버 단일 인스턴스 실행
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6.2 중기 조치 (권장)

#### 6.2.1 개발 환경 스크립트 생성
```batch
@echo off
REM start_dev.bat - 개발 서버 시작 스크립트

echo Stopping existing servers...
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak

echo Starting backend...
cd backend
start "Backend" python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

echo Starting frontend...
cd ../frontend
start "Frontend" npm run dev

echo Development servers started!
```

#### 6.2.2 `--reload` 대신 수동 재시작 고려
- Windows에서 `--reload`의 불안정성 문제
- 코드 변경 시 수동으로 서버 재시작 권장

### 6.3 장기 조치 (선택)

- **Docker 개발 환경** 구축: 프로세스 격리 및 일관된 환경
- **프로세스 관리자** 도입: PM2 또는 Supervisor

---

## 7. 검증 방법

### 7.1 API 응답 확인
```bash
curl -X POST "http://localhost:8000/api/hangul/parse" \
  -F "file=@test.hml" | jq '.problems[0].content_latex'
```

예상 결과:
```
"수학영역 제2교시 $\left| x - 5 \right| < 3$의 해가..."
```

### 7.2 프론트엔드 확인
1. HML 파일 업로드
2. 미리보기에서 수식이 **KaTeX로 렌더링**되는지 확인
3. 수식 부분이 일반 텍스트가 아닌 **수학 폰트**로 표시되어야 함

---

## 8. 결론

### 8.1 코드 상태
- **백엔드 코드: 정상** (Phase 19-C LaTeX 변환 로직 구현됨)
- **프론트엔드 코드: 정상** (MathDisplay 컴포넌트 준비됨)
- **타입 정의: 정상** (content_latex 필드 포함)

### 8.2 문제 원인
- **환경 문제**: 다중 서버 프로세스로 인한 요청 라우팅 오류
- 구버전 코드가 실행되는 좀비 프로세스가 API 요청을 처리함

### 8.3 다음 단계
1. 모든 Python 프로세스 종료
2. 단일 서버 인스턴스 시작
3. API 응답의 `content_latex` 필드 확인
4. 프론트엔드에서 KaTeX 렌더링 확인

---

## 9. 참고 파일

| 파일 | 역할 |
|------|------|
| `backend/app/services/hangul/hml_parser.py` | HML 파싱 및 LaTeX 추출 |
| `backend/app/services/hangul/parser_base.py` | 데이터 구조 정의 |
| `backend/app/services/hangul/hwp_latex_converter.py` | HWP→LaTeX 변환기 |
| `backend/app/routers/hangul.py` | API 엔드포인트 |
| `frontend/src/api/hangul.ts` | API 타입 정의 |
| `frontend/src/components/MathDisplay.tsx` | KaTeX 렌더링 컴포넌트 |
| `frontend/src/pages/HangulUploadPage.tsx` | 업로드 페이지 |

---

*이 리포트는 Phase 19-C LaTeX 렌더링 문제에 대한 면밀한 분석 결과입니다.*
