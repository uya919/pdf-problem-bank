# Phase 19-G: 장식 기호 및 중괄호 패턴 변환 - 개발 계획

**작성일**: 2025-11-29
**기반 문서**: [35_phase19g_hwp_latex_conversion_issues_research_report.md](35_phase19g_hwp_latex_conversion_issues_research_report.md)

---

## 1. 개요

### 1.1 목표
- HWP 장식 기호(`overline`, `bar`, `hat`, `vec` 등)를 LaTeX로 변환
- 중괄호 글꼴 패턴(`{rm{...}}`, `{it{...}}`)을 LaTeX로 변환
- 문제 17번 `overlinermAB = overlinermBC` → `\overline{\mathrm{AB}} = \overline{\mathrm{BC}}` 해결

### 1.2 범위

| 기능 | 우선순위 | 설명 |
|------|---------|------|
| `overline{...}` 변환 | P0 (필수) | 선분 기호 |
| `bar{...}` 변환 | P0 (필수) | 평균/벡터 위 짧은 선 |
| `{rm{...}}` 패턴 | P0 (필수) | 중괄호 로만체 |
| `hat`, `vec`, `dot` 등 | P1 (권장) | 추가 장식 기호 |
| `underline{...}` | P2 (선택) | 밑줄 |

---

## 2. 현재 상태 분석

### 2.1 현재 변환 흐름 (`hwp_latex_converter.py`)

```
convert()
  ├── _preprocess()           # 백틱, 틸데 제거
  ├── _convert_cases()        # Phase 19-F: cases 구조
  ├── _convert_brackets()     # LEFT/RIGHT 괄호
  ├── _convert_fractions()    # {a} over {b} 분수
  ├── _convert_sqrt()         # sqrt{...} 제곱근
  ├── _convert_scripts()      # SUP/SUB 첨자
  ├── _convert_font_commands()# rm, bold, it
  ├── _convert_basic_commands()# COMMAND_MAP
  └── _postprocess()          # 정리
```

### 2.2 문제점

1. **장식 기호 변환 없음**: `overline`, `bar` 등이 처리되지 않음
2. **중괄호 패턴 미지원**: `{rm{AB}}` 형태가 변환되지 않음
3. **변환 순서 문제**: 장식 기호 내부의 글꼴 명령어가 먼저 처리되어야 함

### 2.3 원본 HWP 패턴 분석

```
overline{{rm{AB}} it }= overline{{rm{BC}} it }
│        │    │   │
│        │    │   └── it 지시자 (제거 대상)
│        │    └────── 내용 (AB)
│        └─────────── rm 글꼴 (mathrm으로 변환)
└──────────────────── overline 장식 (overline으로 변환)
```

---

## 3. 단계별 개발 계획

### Step 1: 장식 기호 변환 메서드 추가

**목표**: `overline{...}`, `bar{...}` → `\overline{...}`, `\bar{...}`

**파일**: `backend/app/services/hangul/hwp_latex_converter.py`

**변경 사항**:

```python
# 새 메서드 추가 (Line ~307, _convert_cases 다음)
def _convert_decorations(self, text: str) -> str:
    """
    Phase 19-G: 장식 기호 변환

    overline{x} → \overline{x}
    bar{x} → \bar{x}
    hat{x} → \hat{x}
    vec{x} → \vec{x}
    dot{x} → \dot{x}
    ddot{x} → \ddot{x}
    tilde{x} → \tilde{x}
    underline{x} → \underline{x}
    """
    decorations = [
        'overline', 'underline',  # 긴 장식
        'bar', 'hat', 'vec', 'dot', 'ddot', 'tilde', 'check', 'acute', 'grave', 'breve'
    ]

    for deco in decorations:
        # deco{...} → \deco{...}
        pattern = rf'\b{deco}\s*\{{'
        replacement = rf'\\{deco}{{'
        text = re.sub(pattern, replacement, text)

    return text
```

**테스트 케이스**:
```python
assert hwp_to_latex('overline{AB}') == '\\overline{AB}'
assert hwp_to_latex('bar{x}') == '\\bar{x}'
assert hwp_to_latex('hat{x}') == '\\hat{x}'
```

---

### Step 2: 중괄호 글꼴 패턴 처리

**목표**: `{rm{AB}}`, `{{rm{AB}} it }` → `\mathrm{AB}`

**파일**: `backend/app/services/hangul/hwp_latex_converter.py`

**변경 사항** (`_convert_font_commands` 메서드 수정):

```python
def _convert_font_commands(self, text: str) -> str:
    """글꼴 명령어 변환"""

    # === Phase 19-G: 중괄호 패턴 먼저 처리 ===

    # 1. {{rm{ABC}} it } → \mathrm{ABC}
    # (이중 중괄호 + it 지시자)
    text = re.sub(
        r'\{\{rm\{([^}]*)\}\}\s*it\s*\}',
        r'\\mathrm{\1}',
        text
    )

    # 2. {rm{ABC}} → \mathrm{ABC}
    # (단순 중괄호)
    text = re.sub(
        r'\{rm\{([^}]*)\}\}',
        r'\\mathrm{\1}',
        text
    )

    # 3. {rm{ABC} it } → \mathrm{ABC}
    # (공백 포함)
    text = re.sub(
        r'\{rm\{([^}]*)\}\s*it\s*\}',
        r'\\mathrm{\1}',
        text
    )

    # === 기존 rm 패턴 (공백 구분) ===
    # rm ABC → \mathrm{ABC}
    def replace_rm(match):
        content = match.group(1).strip()
        if content:
            return f'\\mathrm{{{content}}}'
        return ''

    text = self.rm_pattern.sub(replace_rm, text)

    # === 기존 bold, it 처리 ===
    # ... (기존 코드 유지)

    return text
```

**테스트 케이스**:
```python
assert hwp_to_latex('{rm{AB}}') == '\\mathrm{AB}'
assert hwp_to_latex('{{rm{AB}} it }') == '\\mathrm{AB}'
assert hwp_to_latex('{rm{ABC} it }') == '\\mathrm{ABC}'
```

---

### Step 3: 변환 순서 조정

**목표**: 장식 기호 → 중괄호 패턴 → 기존 변환 순서 확립

**파일**: `backend/app/services/hangul/hwp_latex_converter.py`

**변경 사항** (`convert` 메서드 수정):

```python
def convert(self, hwp_eq: str) -> str:
    if not hwp_eq or not hwp_eq.strip():
        return ""

    text = hwp_eq

    # 1. 전처리
    text = self._preprocess(text)

    # Phase 19-F: cases 변환
    text = self._convert_cases(text)

    # === Phase 19-G: 장식 기호 변환 (새로 추가) ===
    text = self._convert_decorations(text)

    # 2. 괄호 처리 (LEFT/RIGHT)
    text = self._convert_brackets(text)

    # 3. 분수 처리 (over)
    text = self._convert_fractions(text)

    # 4. 제곱근 처리 (sqrt)
    text = self._convert_sqrt(text)

    # 5. 위첨자/아래첨자 처리
    text = self._convert_scripts(text)

    # 6. 글꼴 명령어 처리 (rm, it, bold) - Phase 19-G에서 확장
    text = self._convert_font_commands(text)

    # 7. 기본 명령어 변환
    text = self._convert_basic_commands(text)

    # 8. 후처리
    text = self._postprocess(text)

    return text
```

---

### Step 4: Plain Text 변환 업데이트

**목표**: `clean_hwp_equation()`에도 동일한 변환 적용

**파일**: `backend/app/services/hangul/hml_parser.py`

**변경 사항** (`clean_hwp_equation` 함수 수정):

```python
def clean_hwp_equation(equation: str) -> str:
    text = equation

    # Phase 19-F: cases 변환 (기존)
    # ...

    # === Phase 19-G: 장식 기호 변환 ===
    # overline{AB} → AB̅ (또는 단순히 AB)
    # bar{x} → x̄
    # 참고: Plain text에서는 유니코드 결합 문자 사용 또는 단순화

    # 간단한 방식: 장식 기호만 제거하고 내용 유지
    text = re.sub(r'\boverline\s*\{([^}]*)\}', r'(\1)', text)  # overline{AB} → (AB)
    text = re.sub(r'\bbar\s*\{([^}]*)\}', r'\1', text)         # bar{x} → x
    text = re.sub(r'\bhat\s*\{([^}]*)\}', r'\1', text)         # hat{x} → x
    text = re.sub(r'\bvec\s*\{([^}]*)\}', r'\1', text)         # vec{x} → x

    # === Phase 19-G: 중괄호 rm 패턴 ===
    # {rm{AB}} → AB
    # {{rm{AB}} it } → AB
    text = re.sub(r'\{\{rm\{([^}]*)\}\}\s*it\s*\}', r'\1', text)
    text = re.sub(r'\{rm\{([^}]*)\}\}', r'\1', text)
    text = re.sub(r'\{rm\{([^}]*)\}\s*it\s*\}', r'\1', text)

    # 기존 변환 (rm/it/bf 제거 등)
    # ...

    return text.strip()
```

---

### Step 5: 단위 테스트 작성

**파일**: `backend/tests/test_phase19g_decorations.py`

```python
# -*- coding: utf-8 -*-
"""
Phase 19-G: 장식 기호 및 중괄호 패턴 변환 테스트
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.hangul.hml_parser import clean_hwp_equation
from app.services.hangul.hwp_latex_converter import hwp_to_latex


def test_overline_latex():
    """overline → LaTeX 변환 테스트"""
    test_cases = [
        ('overline{AB}', '\\overline{AB}'),
        ('overline{{rm{AB}}}', '\\overline{\\mathrm{AB}}'),
        ('overline{{rm{AB}} it }', '\\overline{\\mathrm{AB}}'),
    ]

    print("=" * 60)
    print("Phase 19-G: overline → LaTeX 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = hwp_to_latex(hwp_input)
        # 공백 무시 비교
        result_normalized = result.replace(' ', '')
        expected_normalized = expected.replace(' ', '')

        if result_normalized == expected_normalized:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input}")
        if status == "FAIL":
            print(f"  기대: {expected}")
            print(f"  결과: {result}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_bar_latex():
    """bar → LaTeX 변환 테스트"""
    test_cases = [
        ('bar{x}', '\\bar{x}'),
        ('bar{ rm AP it  }', '\\bar{\\mathrm{AP}}'),
    ]

    print("\n" + "=" * 60)
    print("Phase 19-G: bar → LaTeX 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = hwp_to_latex(hwp_input)
        if expected.replace(' ', '') in result.replace(' ', ''):
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input} → {result}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_braced_rm_latex():
    """중괄호 rm 패턴 → LaTeX 변환 테스트"""
    test_cases = [
        ('{rm{AB}}', '\\mathrm{AB}'),
        ('{{rm{AB}} it }', '\\mathrm{AB}'),
        ('{rm{ABC} it }', '\\mathrm{ABC}'),
    ]

    print("\n" + "=" * 60)
    print("Phase 19-G: {rm{...}} → LaTeX 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = hwp_to_latex(hwp_input)
        if expected.replace(' ', '') in result.replace(' ', ''):
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input} → {result}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


def test_problem17_case():
    """실제 문제 17번 케이스 테스트"""
    print("\n" + "=" * 60)
    print("Phase 19-G: 문제 17번 실제 케이스 테스트")
    print("=" * 60)

    # 원본 HWP 수식
    hwp_input = "overline{{rm{AB}} it }= overline{{rm{BC}} it }"

    # 기대 결과
    expected_parts = ['\\overline', '\\mathrm{AB}', '\\mathrm{BC}']

    result = hwp_to_latex(hwp_input)

    all_found = all(part in result for part in expected_parts)

    print(f"입력: {hwp_input}")
    print(f"결과: {result}")
    print(f"검증: {'OK' if all_found else 'FAIL'}")

    for part in expected_parts:
        found = part in result
        print(f"  {part}: {'O' if found else 'X'}")

    return all_found


def test_plain_text_decorations():
    """장식 기호 → Plain Text 변환 테스트"""
    test_cases = [
        ('overline{AB}', 'AB'),  # 또는 (AB)
        ('bar{x}', 'x'),
        ('{rm{AB}}', 'AB'),
    ]

    print("\n" + "=" * 60)
    print("Phase 19-G: 장식 기호 → Plain Text 테스트")
    print("=" * 60)

    success = 0
    for hwp_input, expected in test_cases:
        result = clean_hwp_equation(hwp_input)
        # 결과에 기대값이 포함되어 있으면 OK
        if expected in result:
            status = "OK"
            success += 1
        else:
            status = "FAIL"

        print(f"[{status}] {hwp_input} → {result}")

    print(f"\n결과: {success}/{len(test_cases)} 성공")
    return success == len(test_cases)


if __name__ == '__main__':
    results = []
    results.append(("overline → LaTeX", test_overline_latex()))
    results.append(("bar → LaTeX", test_bar_latex()))
    results.append(("{rm{...}} → LaTeX", test_braced_rm_latex()))
    results.append(("문제 17번 케이스", test_problem17_case()))
    results.append(("장식 기호 → Plain Text", test_plain_text_decorations()))

    print("\n" + "=" * 60)
    print("Phase 19-G: 최종 결과")
    print("=" * 60)

    all_passed = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")
        if not passed:
            all_passed = False

    print(f"\n전체: {'모두 통과' if all_passed else '일부 실패'}")
```

---

### Step 6: 통합 테스트

**목표**: 전체 HML 파일 파싱 후 문제 17번 검증

**테스트 스크립트**:
```python
# 문제 17번 API 응답 검증
import requests

hml_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'

with open(hml_path, 'rb') as f:
    files = {'file': ('test.hml', f)}
    response = requests.post('http://127.0.0.1:8000/api/hangul/parse', files=files)

data = response.json()
problem_17 = next(p for p in data['problems'] if p['number'] == '17')

# 검증
latex = problem_17['content_latex']
assert '\\overline' in latex, "overline 변환 실패"
assert '\\mathrm{AB}' in latex, "mathrm{AB} 변환 실패"
assert 'overlinerm' not in latex, "overlinerm이 남아있음"

print("문제 17번 통합 테스트 통과!")
```

---

## 4. 파일 수정 요약

| 파일 | 변경 내용 |
|------|----------|
| `hwp_latex_converter.py` | `_convert_decorations()` 메서드 추가, `_convert_font_commands()` 확장, `convert()` 순서 수정 |
| `hml_parser.py` | `clean_hwp_equation()` 장식 기호/중괄호 패턴 추가 |
| `tests/test_phase19g_decorations.py` | 단위 테스트 파일 생성 |

---

## 5. 개발 체크리스트

### Step 1: 장식 기호 변환
- [ ] `_convert_decorations()` 메서드 추가
- [ ] `overline{...}` → `\overline{...}` 변환
- [ ] `bar{...}` → `\bar{...}` 변환
- [ ] 기타 장식 기호 (hat, vec, dot 등)

### Step 2: 중괄호 패턴 처리
- [ ] `{rm{...}}` → `\mathrm{...}` 변환
- [ ] `{{rm{...}} it }` → `\mathrm{...}` 변환
- [ ] `{rm{...} it }` → `\mathrm{...}` 변환

### Step 3: 변환 순서 조정
- [ ] `convert()` 메서드에 `_convert_decorations()` 호출 추가
- [ ] 장식 기호 → 글꼴 명령어 순서 확인

### Step 4: Plain Text 변환
- [ ] `clean_hwp_equation()` 업데이트
- [ ] 장식 기호 plain text 처리
- [ ] 중괄호 rm 패턴 처리

### Step 5: 테스트
- [ ] `test_phase19g_decorations.py` 생성
- [ ] 단위 테스트 실행 (10/10 통과)

### Step 6: 통합 테스트
- [ ] 서버 재시작
- [ ] 문제 17번 API 검증
- [ ] 웹 UI에서 렌더링 확인

---

## 6. 예상 결과

### Before (현재)
```
문제 17번 화면 표시:
overlinermAB = overlinermBC
```

### After (Phase 19-G 완료 후)
```
문제 17번 화면 표시:
AB̅ = BC̅  (KaTeX 렌더링: \overline{AB} = \overline{BC})
```

---

## 7. 리스크 및 주의사항

### 7.1 변환 순서 의존성
- 장식 기호 내부에 글꼴 명령어가 있으므로, **장식 기호를 먼저 처리**해야 함
- 단, 장식 기호 자체의 `\overline` 변환 후 내부 `{rm{...}}` 처리

### 7.2 중첩 구조
```
overline{{rm{AB}} it }
```
- 이중 중괄호 `{{...}}`가 있음
- 정규식 패턴이 올바르게 매칭되어야 함

### 7.3 회귀 테스트
- Phase 19-F (cases 변환) 정상 동작 확인
- 기존 테스트 케이스 모두 통과 확인

---

## 8. 완료 기준

1. **단위 테스트**: `test_phase19g_decorations.py` 모든 테스트 통과
2. **통합 테스트**: 문제 17번 `\overline{\mathrm{AB}}` 정상 변환
3. **웹 UI**: 문제 17번에서 선분 기호가 KaTeX로 렌더링
4. **회귀 테스트**: Phase 19-F 테스트 모두 통과

---

*Phase 19-G 개발 계획 - 2025-11-29*
