# Phase 19-G: HWP-LaTeX 변환 오류 연구 리포트

**작성일**: 2025-11-29
**상태**: 연구 완료

---

## 1. 문제 현상

### 1.1 사용자 보고 증상

스크린샷에서 발견된 변환 오류:

| 문제 | 화면 표시 | 기대 표시 |
|------|----------|----------|
| 15번 | `geq0` | `≥ 0` (또는 `\geq 0`) |
| 17번 | `overlinermAB = overlinermBC` | `$\overline{AB} = \overline{BC}$` |
| 18번 | `geqx - 5`, `leqx + 4` | `\geq x - 5`, `\leq x + 4` |

---

## 2. 원인 분석

### 2.1 문제별 진단

#### 문제 15번, 18번: **프론트엔드 캐시 문제**

**API 테스트 결과 (정상)**:
```
문제 15번 content_latex:
\begin{cases}x ^{2} - 2x - 3 \\geq 0 \\ x ^{2} - \left( a + 5 \right)x + 5a < 0\end{cases}
→ cases 변환: ✅
→ geq 변환: ✅

문제 18번 content_latex:
\begin{cases} - 2 \left( x - 2 \right)\\geq x - 5 \\ \frac{1}{2} x \\leq x + 4\end{cases}
→ geq 변환: ✅
→ leq 변환: ✅
```

**결론**: 백엔드 변환은 정상. 사용자가 보는 것은 **React State에 캐시된 이전 데이터**.

**해결 방법**:
- **Ctrl+Shift+R** 강제 새로고침 후 HML 파일 재업로드
- 또는 시크릿 모드에서 접속

---

#### 문제 17번: **overline 변환 로직 누락 (실제 버그)**

**원본 HWP 수식**:
```
overline{{rm{AB}} it }= overline{{rm{BC}} it }
```

**현재 변환 결과**:
```
overline{{rm{AB}}} = overline{{rm{BC}}}
```

**기대 변환 결과**:
```latex
\overline{\mathrm{AB}} = \overline{\mathrm{BC}}
```

**원인**: `hwp_latex_converter.py`에 다음 변환이 누락됨:
1. `overline{...}` → `\overline{...}` 변환
2. `{rm{...}}` 중괄호 패턴 처리 (현재 `rm 텍스트` 형태만 지원)

---

### 2.2 추가 발견된 누락 패턴

HML 파일에서 발견된 HWP 명령어 사용 빈도:

| 명령어 | 발견 횟수 | 현재 지원 | LaTeX 변환 |
|--------|----------|----------|-----------|
| `rm{...}` | 11회 | ❌ 부분 지원 | `\mathrm{...}` |
| `sqrt{...}` | 8회 | ✅ 지원 | `\sqrt{...}` |
| `overline{...}` | 4회 | ❌ 미지원 | `\overline{...}` |
| `cases{...}` | 2회 | ✅ 지원 | `\begin{cases}...\end{cases}` |
| `bar{...}` | 2회 | ❌ 미지원 | `\bar{...}` |

**추가 패턴 예시**:
```
bar{ rm AP it  }  → \bar{\mathrm{AP}}  (선분 기호)
```

---

## 3. 기술적 분석

### 3.1 현재 변환 로직 흐름

```python
# hwp_latex_converter.py convert() 메서드
def convert(self, hwp_eq: str) -> str:
    text = hwp_eq

    # 1. 전처리
    text = self._preprocess(text)

    # 2. cases 변환 (Phase 19-F)
    text = self._convert_cases(text)

    # 3. 괄호 처리 (LEFT/RIGHT)
    text = self._convert_brackets(text)

    # 4. 분수 처리 (over)
    text = self._convert_fractions(text)

    # 5. 제곱근 처리 (sqrt)
    text = self._convert_sqrt(text)

    # 6. 위첨자/아래첨자
    text = self._convert_scripts(text)

    # 7. 글꼴 명령어 (rm, bold, it)
    text = self._convert_font_commands(text)

    # 8. 기본 명령어 (COMMAND_MAP)
    text = self._convert_basic_commands(text)

    # 9. 후처리
    text = self._postprocess(text)

    return text
```

### 3.2 누락된 변환 로직

#### 3.2.1 `overline{...}` 변환

**현재 상태**: COMMAND_MAP에 없음, 별도 처리 없음

**필요한 처리**:
```python
# overline{content} → \overline{content}
text = re.sub(r'\boverline\s*\{([^}]*)\}', r'\\overline{\1}', text)
```

**복잡한 케이스**:
```
overline{{rm{AB}} it }
↓
\overline{\mathrm{AB}}
```
- 이중 중괄호 `{{...}}`
- 내부 `rm{AB}` 처리
- `it` 지시자 제거

#### 3.2.2 `bar{...}` 변환

**필요한 처리**:
```python
# bar{content} → \bar{content}
text = re.sub(r'\bbar\s*\{([^}]*)\}', r'\\bar{\1}', text)
```

#### 3.2.3 `{rm{...}}` 중괄호 패턴

**현재 상태**: `rm 텍스트` 패턴만 지원
```python
self.rm_pattern = re.compile(r'\brm\s+([A-Za-z0-9]+)')
```

**필요한 추가 처리**:
```python
# {rm{ABC}} → \mathrm{ABC}
text = re.sub(r'\{rm\{([^}]*)\}\}', r'\\mathrm{\1}', text)
```

---

## 4. HWP 수식편집기 문법 분석

### 4.1 글꼴 지시자

| HWP | 의미 | LaTeX |
|-----|------|-------|
| `rm` | Roman (직립체) | `\mathrm{}` |
| `it` | Italic (기울임) | 기본값 (제거) |
| `bf` | Bold (굵게) | `\mathbf{}` |

### 4.2 장식 기호

| HWP | 의미 | LaTeX |
|-----|------|-------|
| `overline{x}` | 윗줄 (선분) | `\overline{x}` |
| `bar{x}` | 짧은 윗줄 | `\bar{x}` |
| `underline{x}` | 밑줄 | `\underline{x}` |
| `hat{x}` | 모자 기호 | `\hat{x}` |
| `vec{x}` | 벡터 화살표 | `\vec{x}` |
| `dot{x}` | 점 (미분) | `\dot{x}` |
| `ddot{x}` | 두 점 (이계미분) | `\ddot{x}` |
| `tilde{x}` | 물결표 | `\tilde{x}` |

### 4.3 구조적 명령어

| HWP | 의미 | LaTeX |
|-----|------|-------|
| `{a} over {b}` | 분수 | `\frac{a}{b}` |
| `sqrt{x}` | 제곱근 | `\sqrt{x}` |
| `{cases{a#b}}` | 연립방정식 | `\begin{cases}a\\b\end{cases}` |
| `matrix{a&b#c&d}` | 행렬 | `\begin{matrix}...\end{matrix}` |

---

## 5. 변환 순서 의존성 분석

```
┌─────────────────────────────────────────────────────────────┐
│  입력: overline{{rm{AB}} it }                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: overline 구조 변환                                  │
│  overline{{rm{AB}} it } → \overline{{rm{AB}} it }           │
│  ⚠️ 내부 중괄호 처리 전에 overline 먼저 처리                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: {rm{...}} 중괄호 패턴 처리                          │
│  \overline{{rm{AB}} it } → \overline{\mathrm{AB} it }       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: it 지시자 제거                                      │
│  \overline{\mathrm{AB} it } → \overline{\mathrm{AB}}        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  출력: \overline{\mathrm{AB}}                                │
└─────────────────────────────────────────────────────────────┘
```

**핵심 통찰**: 변환 순서가 중요!
1. 구조적 명령어 (overline, bar, etc.) 먼저
2. 내부 글꼴 명령어 (rm, it, bf) 나중에

---

## 6. 권장 해결 방안

### 6.1 즉시 해결 (사용자)

| 문제 | 해결 방법 |
|------|----------|
| 15번, 18번 | **Ctrl+Shift+R** 후 HML 파일 재업로드 |
| 17번 | Phase 19-G 개발 필요 (백엔드 수정) |

### 6.2 개발 필요 (Phase 19-G)

**우선순위 1 - 장식 기호 변환**:
```python
def _convert_decorations(self, text: str) -> str:
    """장식 기호 변환: overline, bar, hat, vec 등"""
    # overline{...} → \overline{...}
    text = re.sub(r'\boverline\s*\{', r'\\overline{', text)

    # bar{...} → \bar{...}
    text = re.sub(r'\bbar\s*\{', r'\\bar{', text)

    # 추가: hat, vec, dot, tilde 등
    for deco in ['hat', 'vec', 'dot', 'ddot', 'tilde', 'underline']:
        text = re.sub(rf'\b{deco}\s*\{{', rf'\\{deco}{{', text)

    return text
```

**우선순위 2 - 중괄호 rm 패턴 처리**:
```python
def _convert_font_commands(self, text: str) -> str:
    # 기존 코드...

    # 추가: {rm{ABC}} → \mathrm{ABC}
    text = re.sub(r'\{rm\{([^}]*)\}\}', r'\\mathrm{\1}', text)

    # 추가: {rm{ABC} it } → \mathrm{ABC} (it 제거)
    text = re.sub(r'\{rm\{([^}]*)\}\s*it\s*\}', r'\\mathrm{\1}', text)

    return text
```

**우선순위 3 - 변환 순서 조정**:
```python
def convert(self, hwp_eq: str) -> str:
    # ...

    # Phase 19-G: 장식 기호 먼저 (overline, bar 등)
    text = self._convert_decorations(text)  # NEW

    # 기존 순서 유지
    text = self._convert_brackets(text)
    text = self._convert_fractions(text)
    # ...
```

---

## 7. 테스트 케이스 제안

### 7.1 overline 변환 테스트

```python
test_cases = [
    # (입력, 기대 출력)
    ('overline{AB}', '\\overline{AB}'),
    ('overline{{rm{AB}}}', '\\overline{\\mathrm{AB}}'),
    ('overline{{rm{AB}} it }', '\\overline{\\mathrm{AB}}'),
    ('overline{{rm{AB}} it }= overline{{rm{BC}} it }',
     '\\overline{\\mathrm{AB}} = \\overline{\\mathrm{BC}}'),
]
```

### 7.2 bar 변환 테스트

```python
test_cases = [
    ('bar{x}', '\\bar{x}'),
    ('bar{ rm AP it  }', '\\bar{\\mathrm{AP}}'),
]
```

### 7.3 복합 패턴 테스트

```python
test_cases = [
    # overline + cases
    ('{cases{overline{AB} GEQ 0#x LEQ 5}}',
     '\\begin{cases}\\overline{AB} \\geq 0 \\\\ x \\leq 5\\end{cases}'),
]
```

---

## 8. 결론

### 8.1 발견된 문제 요약

| 문제 유형 | 원인 | 해결 방법 |
|----------|------|----------|
| 15번, 18번 `geq/leq` | 프론트엔드 캐시 | 강제 새로고침 + 재업로드 |
| 17번 `overline` | 변환 로직 누락 | Phase 19-G 개발 |
| `bar{...}` | 변환 로직 누락 | Phase 19-G 개발 |
| `{rm{...}}` | 중괄호 패턴 미지원 | Phase 19-G 개발 |

### 8.2 권장 조치

**즉시**:
1. 사용자: **Ctrl+Shift+R** 후 HML 파일 재업로드 (15번, 18번 해결)

**단기 (Phase 19-G)**:
2. `overline` 변환 로직 추가
3. `bar` 변환 로직 추가
4. 중괄호 rm 패턴 처리 추가

**중기**:
5. 기타 장식 기호 (hat, vec, dot, tilde 등) 지원
6. 변환 순서 최적화

---

*Phase 19-G 연구 리포트 - 2025-11-29*
