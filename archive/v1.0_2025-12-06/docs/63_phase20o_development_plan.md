# Phase 20-O: 상세 개발 계획서

## 개요

HWP → LaTeX 변환 시스템의 **버그 수정 및 안정화** 계획서입니다.

**작성일:** 2025-11-29
**작성자:** Claude Code (Opus 4.5)
**분석 모드:** OPUS THINKHARDER
**예상 작업량:** 3-4시간

---

## 목차

1. [현재 상태 분석](#1-현재-상태-분석)
2. [수정 대상 버그 목록](#2-수정-대상-버그-목록)
3. [개발 단계별 계획](#3-개발-단계별-계획)
4. [세부 구현 명세](#4-세부-구현-명세)
5. [테스트 계획](#5-테스트-계획)
6. [위험 관리](#6-위험-관리)
7. [롤백 계획](#7-롤백-계획)

---

## 1. 현재 상태 분석

### 1.1 시스템 아키텍처

```
[HWP/HML 파일]
      ↓
[hml_parser.py] → 문제 추출, 텍스트/수식 분리
      ↓
[hwp_latex_converter.py] → HWP 수식 → LaTeX 변환
      ↓
[API Response] → JSON (content_latex, content_equations_latex)
      ↓
[MathDisplay.tsx] → KaTeX 렌더링
      ↓
[화면 표시]
```

### 1.2 관련 파일

| 파일 | 역할 | 수정 필요 |
|-----|------|---------|
| `backend/app/services/hangul/hwp_latex_converter.py` | 수식 변환 | **예** |
| `backend/app/services/hangul/hml_parser.py` | HML 파싱 | **예** |
| `frontend/src/components/MathDisplay.tsx` | 수식 렌더링 | 확인 필요 |

### 1.3 완료된 수정 사항

- **Phase 20-N**: 수식 중복 제거 (문제 18 해결)
  - `_remove_duplicate_inline_equations()` 추가
  - `seen_equations` 집합으로 중복 체크

---

## 2. 수정 대상 버그 목록

### 버그 #1: 분수 변환 실패 (문제 12)

| 항목 | 내용 |
|------|------|
| **증상** | `√5over5` 텍스트로 표시 |
| **원인** | 정규식이 중첩 중괄호 `{{}}` 처리 못함 |
| **영향 범위** | 모든 중첩 분수 수식 |
| **심각도** | 높음 |
| **수정 파일** | `hwp_latex_converter.py` |

### 버그 #2: 텍스트 중복 (문제 17)

| 항목 | 내용 |
|------|------|
| **증상** | (가)(나)(다) 2번 표시 |
| **원인** | HML에서 같은 내용이 다른 P 태그에 반복 |
| **영향 범위** | 조건부 문제 (가/나/다 형식) |
| **심각도** | 높음 |
| **수정 파일** | `hml_parser.py` |

### 버그 #3: 수식 미렌더링 (문제 17)

| 항목 | 내용 |
|------|------|
| **증상** | `$\overline{\mathrm{AB}}$` 텍스트로 표시 |
| **원인** | 프론트엔드 캐시 또는 렌더링 문제 |
| **영향 범위** | 복잡한 LaTeX 수식 |
| **심각도** | 중간 |
| **수정 파일** | 확인 후 결정 |

---

## 3. 개발 단계별 계획

### 전체 일정

```
Phase 20-O
├── Step 1: 환경 준비 (10분)
├── Step 2: 분수 변환 수정 (45분)
│   ├── 2-1: 유틸리티 함수 추가
│   ├── 2-2: _convert_fractions() 재구현
│   └── 2-3: 단위 테스트
├── Step 3: 텍스트 중복 수정 (45분)
│   ├── 3-1: 중복 감지 로직 추가
│   ├── 3-2: _remove_duplicate_text_blocks() 구현
│   └── 3-3: 단위 테스트
├── Step 4: 프론트엔드 확인 (20분)
│   ├── 4-1: 캐시 클리어
│   └── 4-2: MathDisplay 디버깅
├── Step 5: 통합 테스트 (30분)
│   ├── 5-1: 문제 12, 17, 18 재파싱
│   └── 5-2: 브라우저 테스트
└── Step 6: 문서화 및 완료 (15분)
```

---

## 4. 세부 구현 명세

### Step 1: 환경 준비

#### 1-1: 서버 정리

```bash
# 모든 Python 프로세스 종료
taskkill /F /IM python.exe

# __pycache__ 삭제
powershell -Command "Get-ChildItem -Path 'backend' -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force"
```

#### 1-2: 단일 서버 시작

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

### Step 2: 분수 변환 수정

#### 2-1: 균형 중괄호 매칭 함수 추가

**파일**: `hwp_latex_converter.py`
**위치**: 클래스 메서드로 추가

```python
def _find_balanced_braces(self, text: str, start: int) -> Tuple[int, int, str]:
    """
    Phase 20-O: 균형 잡힌 중괄호 내용 추출

    Args:
        text: 검색 대상 문자열
        start: 시작 위치 ('{' 위치)

    Returns:
        Tuple[content_start, content_end, content]
        실패 시 (-1, -1, '')

    Example:
        text = "{\\sqrt{5}} over {3}"
        _find_balanced_braces(text, 0)
        → (1, 10, "\\sqrt{5}")  # 내용 범위와 내용 반환
    """
    if start >= len(text) or text[start] != '{':
        return (-1, -1, '')

    depth = 0
    content_start = start + 1

    for i in range(start, len(text)):
        if text[i] == '{':
            depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0:
                content = text[content_start:i]
                return (content_start, i, content)

    # 짝이 맞지 않음
    return (-1, -1, '')
```

#### 2-2: `_convert_fractions()` 재구현

**변경 전** (현재 코드):
```python
def _convert_fractions(self, text: str) -> str:
    """분수 변환: {a} over {b} → \\frac{a}{b}"""
    def replace_frac(match):
        numerator = match.group(1).strip()
        denominator = match.group(2).strip()
        return f'\\frac{{{numerator}}}{{{denominator}}}'

    # 정규식 기반 (중첩 불가)
    prev = ""
    while prev != text:
        prev = text
        text = self.frac_pattern.sub(replace_frac, text)

    return text
```

**변경 후**:
```python
def _convert_fractions(self, text: str) -> str:
    """
    Phase 20-O: 분수 변환 (균형 중괄호 지원)

    {a} over {b} → \\frac{a}{b}
    {\\sqrt{5}} over {3} → \\frac{\\sqrt{5}}{3}
    """
    result = []
    i = 0
    max_iterations = 100  # 무한 루프 방지

    while i < len(text) and max_iterations > 0:
        max_iterations -= 1

        # '{' 찾기
        if i < len(text) and text[i] == '{':
            # 분자 추출 시도
            num_start, num_end, numerator = self._find_balanced_braces(text, i)

            if numerator:  # 분자 추출 성공
                # 'over' 키워드 확인
                after_num = num_end + 1
                remaining = text[after_num:]
                over_match = re.match(r'\s*over\s*', remaining, re.IGNORECASE)

                if over_match:
                    # 분모 위치
                    denom_start_pos = after_num + over_match.end()

                    if denom_start_pos < len(text) and text[denom_start_pos] == '{':
                        # 분모 추출
                        den_start, den_end, denominator = self._find_balanced_braces(
                            text, denom_start_pos
                        )

                        if denominator:  # 분모 추출 성공
                            # 분자 내부도 재귀적으로 분수 변환
                            numerator = self._convert_fractions(numerator)
                            denominator = self._convert_fractions(denominator)

                            result.append(f'\\frac{{{numerator}}}{{{denominator}}}')
                            i = den_end + 1
                            continue

            # 분수 패턴이 아니면 그대로 추가
            result.append(text[i])
            i += 1
        else:
            result.append(text[i])
            i += 1

    # 남은 문자 추가
    if i < len(text):
        result.append(text[i:])

    return ''.join(result)
```

#### 2-3: 단위 테스트

```python
# 테스트 케이스
test_cases = [
    # 기본 분수
    ('{4} over {5}', '\\frac{4}{5}'),
    ('{a} over {b}', '\\frac{a}{b}'),

    # 중첩 중괄호 (문제 12 케이스)
    ('{\\sqrt{5}} over {5}', '\\frac{\\sqrt{5}}{5}'),
    ('{3 \\sqrt{5}} over {5}', '\\frac{3 \\sqrt{5}}{5}'),
    ('{6 \\sqrt{5}} over {5}', '\\frac{6 \\sqrt{5}}{5}'),

    # 중첩 분수
    ('{{a} over {b}} over {c}', '\\frac{\\frac{a}{b}}{c}'),

    # 복합 수식
    ('{x + 1} over {x - 1}', '\\frac{x + 1}{x - 1}'),

    # 변환 불필요 케이스
    ('x + y', 'x + y'),
    ('{a}', '{a}'),
]

for hwp_input, expected in test_cases:
    result = hwp_to_latex(hwp_input)
    assert result == expected, f"실패: {hwp_input} → {result} (기대: {expected})"
    print(f"OK: {hwp_input} → {result}")
```

---

### Step 3: 텍스트 중복 수정

#### 3-1: 중복 감지 전략

**문제점 분석**:
```
HML 구조:
<P>다음 조건을 만족시킨다.</P>
<P>(가) 삼각형 OAC는...</P>     ← 본문
<P>(나) 선분 AC 위의...</P>
<P>(다) AB = BC이고...</P>
<P>문제: a³+b³의 값은?</P>
... (선택지 영역) ...
<P>(가) 삼각형 OAC는...</P>     ← 중복!
<P>(나) 선분 AC 위의...</P>
<P>(다) AB =...</P>             ← 잘림
```

**전략**:
1. (가), (나), (다) 등 조건 마커 감지
2. 같은 마커가 2번 이상 나오면 첫 번째 세트만 유지
3. 수식이 아닌 텍스트 부분에만 적용

#### 3-2: `_remove_duplicate_text_blocks()` 구현

**파일**: `hml_parser.py`
**위치**: `_remove_duplicate_inline_equations()` 뒤에 추가

```python
def _remove_duplicate_text_blocks(self, content: str) -> str:
    """
    Phase 20-O: 반복되는 텍스트 블록 제거

    HML 파일에서 같은 조건 텍스트가 본문과 선택지 영역에
    반복되는 경우, 첫 번째 세트만 유지합니다.

    Args:
        content: 문제 본문 (content_latex 또는 content_text)

    Returns:
        중복이 제거된 문자열

    Example:
        입력: "(가) A (나) B (다) C ... (가) A (나) B (다) ..."
        출력: "(가) A (나) B (다) C ..."
    """
    if not content:
        return content

    # 조건 마커 패턴들
    marker_patterns = [
        # 한글 조건: (가), (나), (다), ...
        (r'\(가\)', '(가)'),
        (r'\(나\)', '(나)'),
        (r'\(다\)', '(다)'),
        (r'\(라\)', '(라)'),
        (r'\(마\)', '(마)'),

        # 영문 조건: (a), (b), (c), ...
        (r'\(a\)', '(a)'),
        (r'\(b\)', '(b)'),
        (r'\(c\)', '(c)'),

        # 로마 숫자: (i), (ii), (iii), ...
        (r'\(i\)', '(i)'),
        (r'\(ii\)', '(ii)'),

        # 숫자: (1), (2), (3), ...
        (r'\(1\)', '(1)'),
        (r'\(2\)', '(2)'),
    ]

    # 각 마커 패턴에 대해 중복 검사
    for pattern, marker_str in marker_patterns:
        matches = list(re.finditer(pattern, content))

        # 같은 마커가 2번 이상 나오면
        if len(matches) >= 2:
            first_pos = matches[0].start()
            second_pos = matches[1].start()

            # 두 위치 사이에 충분한 내용이 있는지 확인
            # (최소 20자 이상 떨어져 있어야 중복으로 판단)
            if second_pos - first_pos > 20:
                # 두 번째 마커 직전까지만 유지
                # 단, 마커 앞의 공백/문장부호는 제거
                cut_pos = second_pos
                while cut_pos > 0 and content[cut_pos - 1] in ' \t\n.。':
                    cut_pos -= 1

                content = content[:cut_pos].strip()
                break  # 첫 번째 중복만 처리

    return content
```

#### 3-3: 호출 위치 추가

**파일**: `hml_parser.py`
**위치**: `_find_problem_contents_by_autonum()` 내

```python
# 기존 코드 (Line 768-769)
# Phase 20-N: content_latex에서 중복 인라인 수식 제거
latex_content = self._remove_duplicate_inline_equations(latex_content)

# 추가할 코드
# Phase 20-O: 텍스트 블록 중복 제거
latex_content = self._remove_duplicate_text_blocks(latex_content)
plain_content = self._remove_duplicate_text_blocks(plain_content)
```

#### 3-4: 단위 테스트

```python
test_cases = [
    # 한글 조건 중복
    (
        "(가) A입니다. (나) B입니다. (다) C입니다. (가) A입니다. (나) B입니다.",
        "(가) A입니다. (나) B입니다. (다) C입니다."
    ),

    # 영문 조건 중복
    (
        "(a) First (b) Second (a) First again",
        "(a) First (b) Second"
    ),

    # 중복 없는 경우
    (
        "(가) A입니다. (나) B입니다.",
        "(가) A입니다. (나) B입니다."
    ),

    # 수식 포함 케이스
    (
        "(가) $x=1$ (나) $y=2$ (가) $x=1$",
        "(가) $x=1$ (나) $y=2$"
    ),
]

for input_text, expected in test_cases:
    result = parser._remove_duplicate_text_blocks(input_text)
    assert result == expected, f"실패: {input_text[:30]}..."
    print(f"OK: 중복 제거 성공")
```

---

### Step 4: 프론트엔드 확인

#### 4-1: 브라우저 캐시 클리어

```
방법 1: 하드 리로드
- Windows: Ctrl + Shift + R
- Mac: Cmd + Shift + R

방법 2: 개발자 도구
1. F12 → Network 탭
2. "Disable cache" 체크
3. 페이지 새로고침
```

#### 4-2: MathDisplay 디버깅 (필요시)

```javascript
// MathDisplay.tsx에 디버그 로그 추가
export function MathDisplay({ latex, ... }) {
  console.log('[MathDisplay] Input:', JSON.stringify(latex));

  const html = useMemo(() => {
    if (!latex) return '';

    // $ 패턴 확인
    if (latex.includes('$')) {
      console.log('[MathDisplay] Has $ pattern');
      return renderMixedContent(latex);
    }

    return escapeHtml(latex);
  }, [latex, displayMode]);

  // ...
}
```

#### 4-3: API 응답 확인

```bash
# curl로 직접 API 호출
curl http://localhost:8000/api/hangul/parse \
  -X POST \
  -F "file=@test.hwp" \
  | jq '.problems[] | select(.number == "17") | .content_latex'
```

---

### Step 5: 통합 테스트

#### 5-1: 파이썬 통합 테스트

```python
import sys
sys.path.insert(0, 'backend')
from app.services.hangul.hml_parser import HMLParser

# HML 파싱
hml_path = r"테스트파일.Hml"
parser = HMLParser(hml_path)
result = parser.parse()

# 문제별 검증
for p in result.problems:
    print(f"\n=== 문제 {p.number} ===")

    # 분수 변환 확인
    if 'over' in p.content_latex:
        print(f"[경고] 'over' 키워드 발견: {p.content_latex[:50]}...")

    # 중복 확인
    markers = ['(가)', '(나)', '(다)']
    for m in markers:
        count = p.content_latex.count(m)
        if count > 1:
            print(f"[경고] '{m}' {count}번 발견")

    # 수식 렌더링 확인
    if '\\overline' in p.content_latex:
        print(f"[OK] overline 포함")
    if '\\frac' in p.content_latex:
        print(f"[OK] frac 포함")
```

#### 5-2: 브라우저 테스트 체크리스트

| 문제 | 확인 항목 | 예상 결과 |
|-----|---------|----------|
| 12 | 선택지 분수 표시 | √5/5, 3√5/5, 6√5/5 렌더링 |
| 17 | (가)(나)(다) 중복 | 1번씩만 표시 |
| 17 | overline 렌더링 | $\overline{AB}$ 수식 표시 |
| 18 | cases 중복 | 연립부등식 1번만 표시 |

---

### Step 6: 문서화 및 완료

#### 6-1: 코드 주석

모든 새 함수에 Phase 번호와 설명 추가:

```python
def _find_balanced_braces(self, text: str, start: int) -> Tuple[...]:
    """
    Phase 20-O: 균형 잡힌 중괄호 내용 추출
    ...
    """
```

#### 6-2: 완료 리포트 작성

`docs/64_phase20o_completion_report.md` 작성:
- 수정 내용 요약
- 테스트 결과
- 남은 이슈 (있으면)

---

## 5. 테스트 계획

### 5.1 단위 테스트

| 테스트 대상 | 테스트 케이스 수 | 중요도 |
|-----------|---------------|-------|
| `_find_balanced_braces()` | 8 | 높음 |
| `_convert_fractions()` | 10 | 높음 |
| `_remove_duplicate_text_blocks()` | 6 | 높음 |

### 5.2 통합 테스트

| 테스트 | 방법 | 검증 기준 |
|-------|-----|---------|
| 문제 12 파싱 | Python 직접 호출 | `over` 키워드 없음 |
| 문제 17 파싱 | Python 직접 호출 | 마커 중복 없음 |
| 브라우저 표시 | 수동 테스트 | 수식 정상 렌더링 |

### 5.3 회귀 테스트

| 테스트 | 확인 사항 |
|-------|---------|
| 문제 18 | 수식 중복 수정 유지됨 |
| 기존 분수 | `{4} over {5}` 정상 변환 |
| 기존 수식 | overline, cases 등 정상 |

---

## 6. 위험 관리

### 6.1 잠재적 위험

| 위험 | 확률 | 영향 | 대응 |
|-----|-----|-----|------|
| 정규식 성능 저하 | 낮음 | 중간 | 타임아웃 설정 |
| 새 버그 발생 | 중간 | 높음 | 단위 테스트 강화 |
| 다른 문제 영향 | 중간 | 중간 | 회귀 테스트 |

### 6.2 완화 전략

1. **점진적 배포**: 한 함수씩 수정 → 테스트 → 다음 수정
2. **백업**: 수정 전 원본 파일 복사
3. **로깅**: 변환 과정 로그 추가 (디버그 모드)

---

## 7. 롤백 계획

### 7.1 파일 백업

```bash
# 수정 전 백업
cp hwp_latex_converter.py hwp_latex_converter.py.backup.20241129
cp hml_parser.py hml_parser.py.backup.20241129
```

### 7.2 롤백 절차

```bash
# 문제 발생 시 복원
cp hwp_latex_converter.py.backup.20241129 hwp_latex_converter.py
cp hml_parser.py.backup.20241129 hml_parser.py

# 서버 재시작
taskkill /F /IM python.exe
python -m uvicorn app.main:app --reload
```

### 7.3 롤백 기준

- 기존 정상 케이스 실패
- 서버 에러 발생
- 성능 급격히 저하

---

## 승인

이 계획서에 동의하시면 **"진행해줘"**라고 말씀해주세요.

**개발 시작 후 예상 흐름**:
1. Step 1 완료 → "환경 준비 완료" 보고
2. Step 2 완료 → "분수 변환 수정 완료, 테스트 결과: ..." 보고
3. Step 3 완료 → "텍스트 중복 수정 완료, 테스트 결과: ..." 보고
4. Step 4-5 완료 → "통합 테스트 완료" 보고
5. 전체 완료 → 최종 리포트 작성

---

*계획서 작성 완료: 2025-11-29*
*작성 모드: OPUS THINKHARDER*
*작성자: Claude Code (Opus 4.5)*
