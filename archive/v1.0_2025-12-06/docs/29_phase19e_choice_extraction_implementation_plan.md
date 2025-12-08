# Phase 19-E: 객관식 보기 추출 구현 계획

**작성일**: 2025-11-29
**상태**: 계획 수립 완료
**우선순위**: 안정성 > 기능성

---

## 1. 설계 원칙

### 1.1 안정성 원칙

1. **점진적 구현**: 한 번에 하나의 변경만 수행
2. **테스트 우선**: 각 단계마다 테스트 실행 및 검증
3. **롤백 가능**: 문제 발생 시 이전 상태로 복구 가능
4. **기존 기능 보존**: 문제 본문 추출 기능 손상 금지

### 1.2 변경 범위 최소화

| 파일 | 변경 수준 | 위험도 |
|------|----------|--------|
| `hml_parser.py` | 메서드 수정 | 중간 |
| `parser_base.py` | 필드 추가 | 낮음 |
| Frontend | 표시 로직 | 낮음 |

---

## 2. 현재 상태 분석

### 2.1 데이터 흐름

```
HML P 태그
    ↓
_get_paragraph_text_with_latex()
    - EQUATION: clean_hwp_equation() → 공백 없이 반환
    - CHAR: text 그대로 반환
    - TEXT: text 그대로 반환
    ↓
plain_parts.append(text.strip())  ← 각 P 태그별 trim
    ↓
' '.join(plain_parts)  ← 공백 1개로 연결
    ↓
_clean_problem_content()
    - Line 688: 앞쪽 선택지 패턴 제거 ← 문제!
    ↓
"① 101112 ④ 1314" 출력
```

### 2.2 핵심 문제점

```python
# hml_parser.py Line 688 - 문제의 원인
content = re.sub(r'^[①②③④⑤]\s*[\d\.\w]*\s*[①②③④⑤]\s*[\d\.\w]*\s*', '', content)
```

**의도**: 이전 문제의 선택지가 섞인 경우 제거
**실제 동작**: 정상 선택지까지 제거

### 2.3 HML 선택지 구조

```xml
<!-- 문제 1번 선택지 (P[1], P[2]) -->
<P>
  <CHAR>①</CHAR><TEXT> </TEXT><EQUATION><SCRIPT>rm 1</SCRIPT></EQUATION>
  <CHAR>②</CHAR><TEXT> </TEXT><EQUATION><SCRIPT>rm 2</SCRIPT></EQUATION>
  <CHAR>③</CHAR><TEXT> </TEXT><EQUATION><SCRIPT>rm 3</SCRIPT></EQUATION>
</P>
<P>
  <CHAR>④</CHAR><TEXT> </TEXT><EQUATION><SCRIPT>rm 4</SCRIPT></EQUATION>
  <CHAR>⑤</CHAR><TEXT> </TEXT><EQUATION><SCRIPT>rm 5</SCRIPT></EQUATION>
</P>
```

**특징**:
- 선택지 기호는 `<CHAR>` 태그
- 선택지 값은 `<EQUATION>` 태그 (숫자도 수식 처리)
- 한 P 태그에 2-3개 선택지 포함
- 선택지 사이에 `<TEXT> </TEXT>` 공백

---

## 3. 구현 단계

### 단계 0: 베이스라인 테스트 생성

**목표**: 현재 상태 기록 및 회귀 방지

**파일**: `backend/tests/test_phase19e_choices.py`

```python
# -*- coding: utf-8 -*-
"""
Phase 19-E: 선택지 추출 테스트
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.hangul import HMLParser

TEST_FILE = r"C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml"

def test_baseline_choices():
    """현재 상태 기록"""
    parser = HMLParser(TEST_FILE)
    result = parser.parse()

    print("=" * 60)
    print("Phase 19-E: 선택지 추출 베이스라인")
    print("=" * 60)

    # 문제 1, 3, 6 확인 (다양한 선택지 형식)
    for idx in [0, 2, 5]:
        p = result.problems[idx]
        print(f"\n문제 {p.number}:")
        print(f"  본문: {p.content_text[:80]}...")

        # 선택지 기호 개수 확인
        choice_count = sum(1 for c in '①②③④⑤' if c in p.content_text)
        print(f"  선택지 기호 개수: {choice_count}/5")

        # 숫자 병합 확인
        has_merged = any(x in p.content_text for x in ['101112', '1314', '678910'])
        print(f"  숫자 병합: {'YES - 문제' if has_merged else 'NO - OK'}")

if __name__ == '__main__':
    test_baseline_choices()
```

**검증 포인트**:
- 선택지 기호 5개 존재
- 숫자 병합 없음

---

### 단계 1: 선택지 제거 로직 수정 (최소 변경)

**목표**: Line 688의 문제 해결 - 선택지 제거 → 공백 정규화

**변경 파일**: `hml_parser.py`

**변경 내용**:

```python
# === 변경 전 (Line 688) ===
# 4. 앞쪽 선택지 패턴 제거 (이전 문제의 선택지가 섞인 경우)
content = re.sub(r'^[①②③④⑤]\s*[\d\.\w]*\s*[①②③④⑤]\s*[\d\.\w]*\s*', '', content)

# === 변경 후 ===
# 4. 선택지 공백 정규화 (기호 앞뒤 공백 확보)
# Phase 19-E: 선택지를 제거하지 않고 공백만 정리
content = re.sub(r'([①②③④⑤])(\S)', r'\1 \2', content)  # 기호 뒤 공백
content = re.sub(r'(\S)([①②③④⑤])', r'\1 \2', content)  # 기호 앞 공백
```

**위험도**: 낮음
**테스트**: test_phase19e_choices.py 실행

**롤백**: 원래 코드로 복원

---

### 단계 2: EQUATION 공백 추가

**목표**: clean_hwp_equation() 결과에 공백 추가

**변경 파일**: `hml_parser.py`

**변경 위치**: `_get_paragraph_text_with_latex()` 메서드 내 (Line 273-274)

```python
# === 변경 전 ===
cleaned = clean_hwp_equation(eq_text)
plain_parts.append(cleaned)

# === 변경 후 ===
cleaned = clean_hwp_equation(eq_text)
# Phase 19-E: 수식 뒤 공백 추가 (선택지 숫자 병합 방지)
plain_parts.append(cleaned + ' ')
```

**위험도**: 낮음 (공백 추가만)
**테스트**: 숫자 병합 확인

**부작용 가능성**:
- 일반 수식 뒤에도 공백이 추가됨
- 예: "x^2 + y^2" → "x^2  + y^2 " (이중 공백)

**대응**: 최종 정제 단계에서 이중 공백 제거 (이미 Line 704에 존재)

---

### 단계 3: P 태그 연결 시 줄바꿈 추가

**목표**: P 태그 간 경계 명확화

**변경 파일**: `hml_parser.py`

**변경 위치**: `_find_problem_contents_by_autonum()` 메서드 (Line 635)

```python
# === 변경 전 ===
if plain_text.strip():
    plain_parts.append(plain_text.strip())

# === 변경 후 ===
if plain_text.strip():
    # Phase 19-E: P 태그 경계에 공백 추가
    plain_parts.append(plain_text.strip() + ' ')
```

**위험도**: 낮음
**테스트**: 선택지 행 구분 확인

---

### 단계 4: ParsedProblem에 choices 필드 추가 (선택적)

**목표**: 선택지를 구조화된 데이터로 저장

**변경 파일**: `parser_base.py`

```python
@dataclass
class ParsedProblem:
    """파싱된 개별 문제"""
    # ... 기존 필드 ...

    # Phase 19-E: 선택지 필드
    choices: List[str] = field(default_factory=list)  # ['① 1', '② 2', ...]
    choices_latex: List[str] = field(default_factory=list)
```

**변경 파일**: `parser_base.py` - `to_dict()` 메서드

```python
def to_dict(self) -> Dict[str, Any]:
    return {
        # ... 기존 필드 ...
        "choices": self.choices,           # Phase 19-E
        "choices_latex": self.choices_latex,
    }
```

**위험도**: 낮음 (추가만, 기존 코드 영향 없음)

---

### 단계 5: 선택지 추출 로직 구현 (선택적)

**목표**: 본문에서 선택지 분리

**변경 파일**: `hml_parser.py`

```python
def _extract_choices_from_content(self, content: str) -> tuple:
    """
    Phase 19-E: 본문에서 선택지 분리

    Args:
        content: 문제 본문 (선택지 포함)

    Returns:
        tuple: (본문만, 선택지 리스트)
    """
    # 선택지 패턴: ① ~ ⑤로 시작하는 부분
    choice_pattern = r'([①②③④⑤]\s*[^①②③④⑤]+)'
    matches = re.findall(choice_pattern, content)

    if len(matches) >= 3:  # 최소 3개 선택지 있으면 분리
        # 첫 번째 선택지 위치 찾기
        first_choice = re.search(r'①', content)
        if first_choice:
            body = content[:first_choice.start()].strip()
            choices = [m.strip() for m in matches]
            return body, choices

    return content, []
```

**호출 위치**: `_extract_by_endnote()` 내

```python
# Phase 19-E: 선택지 분리
if i < len(problem_contents):
    content_data = problem_contents[i]

    # 본문에서 선택지 분리
    body_text, choices = self._extract_choices_from_content(content_data['text'])
    body_latex, choices_latex = self._extract_choices_from_content(content_data['latex'])

    problem.content_text = body_text
    problem.content_latex = body_latex
    problem.choices = choices
    problem.choices_latex = choices_latex
```

**위험도**: 중간
**테스트**: 본문과 선택지 분리 확인

---

## 4. 구현 순서 및 체크리스트

### Phase 19-E-1: 긴급 수정 (단계 1-2)

```
[ ] 단계 0: 베이스라인 테스트 생성
    [ ] test_phase19e_choices.py 작성
    [ ] 현재 상태 기록

[ ] 단계 1: 선택지 제거 로직 수정
    [ ] Line 688 변경
    [ ] 테스트 실행
    [ ] 문제 없으면 다음 단계

[ ] 단계 2: EQUATION 공백 추가
    [ ] Line 273-274 변경
    [ ] 테스트 실행
    [ ] 숫자 병합 해결 확인
```

### Phase 19-E-2: 구조화 (단계 3-5) - 선택적

```
[ ] 단계 3: P 태그 연결 개선
    [ ] Line 635 변경
    [ ] 테스트 실행

[ ] 단계 4: ParsedProblem 확장
    [ ] choices 필드 추가
    [ ] to_dict() 수정

[ ] 단계 5: 선택지 추출 로직
    [ ] _extract_choices_from_content() 구현
    [ ] _extract_by_endnote() 수정
    [ ] 프론트엔드 표시 업데이트
```

---

## 5. 테스트 시나리오

### 5.1 정상 케이스

| 테스트 | 입력 | 기대 출력 |
|--------|------|----------|
| 단순 숫자 | ①②③④⑤ 1-5 | ① 1 ② 2 ③ 3 ④ 4 ⑤ 5 |
| 두 자리 숫자 | ①②③④⑤ 10-14 | ① 10 ② 11 ③ 12 ④ 13 ⑤ 14 |
| 수식 포함 | √2, 2√3 등 | ① √2 ② 2√2 ... |

### 5.2 엣지 케이스

| 테스트 | 상황 | 기대 동작 |
|--------|------|----------|
| 선택지 없음 | 주관식 문제 | 본문만 표시 |
| 선택지 3개 | 일부 선택지 | 있는 것만 표시 |
| 수식 선택지 | 복잡한 LaTeX | LaTeX 형식 유지 |

### 5.3 회귀 테스트

| 테스트 | 확인 항목 |
|--------|----------|
| 문제 본문 | 헤더/푸터 미포함 |
| 정답 추출 | 21개 정답 정상 |
| LaTeX 변환 | $ 기호 정상 |

---

## 6. 롤백 계획

### 6.1 단계별 롤백

| 단계 | 롤백 방법 |
|------|----------|
| 단계 1 | Line 688 원복 |
| 단계 2 | Line 273-274 원복 |
| 단계 3 | Line 635 원복 |
| 단계 4 | parser_base.py 원복 (필드 제거) |
| 단계 5 | 새 메서드 제거 |

### 6.2 전체 롤백

```bash
# Git을 사용하지 않는 경우 백업 파일 사용
cp hml_parser.py.bak hml_parser.py
cp parser_base.py.bak parser_base.py
```

---

## 7. 예상 결과

### 7.1 Phase 19-E-1 완료 후

**현재**:
```
문제 3: 삼각형 ABC의 무게중심... ① 101112 ④ 1314
```

**수정 후**:
```
문제 3: 삼각형 ABC의 무게중심... ① 10 ② 11 ③ 12 ④ 13 ⑤ 14
```

### 7.2 Phase 19-E-2 완료 후

**content_text**:
```
삼각형 ABC의 무게중심 G의 좌표가 (2,5)일 때, a+b의 값은? (단, a, b는 상수이다.)
```

**choices**:
```
["① 10", "② 11", "③ 12", "④ 13", "⑤ 14"]
```

---

## 8. 위험 요소 및 대응

| 위험 | 확률 | 영향 | 대응 |
|------|------|------|------|
| 기존 문제 본문 손상 | 낮음 | 높음 | 단계별 테스트 |
| 일부 선택지 누락 | 중간 | 중간 | 패턴 검증 |
| 수식 공백 과다 | 중간 | 낮음 | 정규화 처리 |
| 프론트엔드 호환성 | 낮음 | 낮음 | 기존 필드 유지 |

---

## 9. 승인 체크리스트

구현 시작 전 확인:

- [ ] 베이스라인 테스트 준비됨
- [ ] 롤백 방법 숙지됨
- [ ] 각 단계 테스트 계획 있음
- [ ] 변경 범위 최소화됨

---

*Phase 19-E 구현 계획 - 2025-11-29*
