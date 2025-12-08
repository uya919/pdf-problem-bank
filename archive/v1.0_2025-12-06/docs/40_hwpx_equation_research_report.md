# HWPX 수식 렌더링 연구 리포트

**작성일**: 2025-11-28
**Phase**: 17
**작성**: Claude Code (Opus)

---

## 1. 문제 정의

### 1.1 현재 상태
통합 문제은행에서 수식이 다음과 같이 표시됨:
```
수식입니다. a ^{3}  TIMES a ^{2}
```

### 1.2 목표 상태
수식이 렌더링되어 다음과 같이 표시되어야 함:
```
a³ × a²
```

---

## 2. HWPX 파일 구조 분석

### 2.1 HWPX 파일 구조
```
파일.hwpx (ZIP 압축)
├── mimetype
├── version.xml
├── Contents/
│   ├── header.xml        # 문서 메타데이터
│   ├── section0.xml      # 본문 (핵심!)
│   └── content.hpf       # 콘텐츠 목록
├── BinData/
│   └── image*.jpg/png    # 이미지 파일
├── Preview/
│   ├── PrvText.txt       # 텍스트 미리보기
│   └── PrvImage.png      # 이미지 미리보기
└── META-INF/
    └── manifest.xml      # 매니페스트
```

### 2.2 section0.xml 구조
```xml
<hp:p>  <!-- 문단 (paragraph) -->
  <hp:run>  <!-- 텍스트 세그먼트 -->
    <hp:t>정답 </hp:t>  <!-- 일반 텍스트 -->
  </hp:run>
  <hp:equation>  <!-- 수식 -->
    <hp:script>a ^{3} TIMES a ^{2}</hp:script>  <!-- 수식 스크립트 -->
  </hp:equation>
</hp:p>
```

### 2.3 XML 네임스페이스
```
hp = http://www.hancom.co.kr/hwpml/2011/paragraph
hc = http://www.hancom.co.kr/hwpml/2011/core
```

---

## 3. Hancom Equation Script 문법

### 3.1 기본 문법 요소

| 문법 | 의미 | LaTeX 대응 | 예시 |
|------|------|------------|------|
| `^{n}` | 위첨자 (지수) | `^{n}` | `a^{3}` → a³ |
| `_{n}` | 아래첨자 | `_{n}` | `a_{1}` → a₁ |
| `TIMES` | 곱셈 기호 | `\times` | `a TIMES b` → a × b |
| `÷` | 나눗셈 기호 | `\div` | `a÷b` → a ÷ b |
| `over` | 분수 | `\frac{}{}` | `{a} over {b}` → a/b |
| `sqrt` | 제곱근 | `\sqrt{}` | `sqrt{a}` → √a |
| `root{n}of` | n제곱근 | `\sqrt[n]{}` | `root{3}of{a}` → ³√a |
| `LEFT (` | 왼쪽 괄호 | `\left(` | |
| `RIGHT )` | 오른쪽 괄호 | `\right)` | |
| `bold{}` | 굵게 | `\mathbf{}` | |
| `!=` | 같지 않음 | `\neq` | `a!=0` → a ≠ 0 |
| `` ` `` | 공백 | `\,` | |

### 3.2 사용 빈도 분석 (샘플 파일 기준)

| 요소 | 빈도 |
|------|------|
| 위첨자 `^{}` | 1,540회 |
| 분수 `over` | 834회 |
| n제곱근 `root` | 326회 |
| 제곱근 `sqrt` | 239회 |
| 곱셈 `TIMES` | 197회 |
| 괄호 `LEFT/RIGHT` | 110회 |
| 굵게 `bold` | 91회 |
| 아래첨자 `_{}` | 60회 |

### 3.3 복잡한 수식 예시

**원본 (Hancom Script)**:
```
{N times 28^{{1} over {2}} times 4^{-{3} over {4}}} over {N times 14^{{1} over {2}} times 8^{-{3} over {4}}}
```

**LaTeX 변환**:
```latex
\frac{N \times 28^{\frac{1}{2}} \times 4^{-\frac{3}{4}}}{N \times 14^{\frac{1}{2}} \times 8^{-\frac{3}{4}}}
```

---

## 4. 현재 파서의 문제점

### 4.1 hwpx_parser.py 분석

```python
# 현재 코드 (문제점)
def extract_text_recursive(elem):
    if elem.text:
        text = elem.text.strip()
        if text:
            texts.append(text)
    # ...
```

**문제점**:
1. `<hp:equation>` 요소를 특별히 처리하지 않음
2. `<hp:script>` 내용이 추출되지 않음
3. 텍스트와 수식의 순서 관계가 유지되지 않음

### 4.2 추출된 데이터 (현재)

```json
[
  "[ ~ ] 다음 식을 간단히 하시오. (단,  )",
  " 정답 ",
  " 정답 "
]
```

수식이 완전히 누락됨!

---

## 5. 해결 방안

### 5.1 접근법 비교

| 접근법 | 장점 | 단점 | 난이도 |
|--------|------|------|--------|
| **A. LaTeX 변환 + KaTeX** | 고품질 렌더링, 표준 포맷 | 변환 로직 필요 | 중 |
| **B. Unicode 변환** | 간단, 추가 라이브러리 불필요 | 복잡한 수식 한계 | 하 |
| **C. 이미지 렌더링** | 완벽한 호환 | 서버 부하, 검색 불가 | 상 |
| **D. MathML 변환** | 웹 표준 | 브라우저 지원 제한 | 중 |

### 5.2 권장 접근법: A + B 혼합

1. **간단한 수식**: Unicode 직접 변환
   - `a^{3}` → `a³`
   - `TIMES` → `×`

2. **복잡한 수식**: LaTeX + KaTeX 렌더링
   - 분수, 루트 등 복잡한 구조

---

## 6. 구현 계획

### 6.1 Phase 17-A: 수식 추출 개선

**파일**: `backend/app/services/hangul/hwpx_parser.py`

```python
def _parse_section_file(self, section_path: Path) -> List[Dict]:
    """섹션 XML 파일 파싱 - 수식 포함"""
    content_items = []

    for para in root.findall('.//hp:p', ns):
        para_content = []
        for elem in para:
            if elem.tag.endswith('t'):
                para_content.append({
                    'type': 'text',
                    'content': elem.text
                })
            elif elem.tag.endswith('equation'):
                script = elem.find('.//hp:script', ns)
                if script is not None:
                    para_content.append({
                        'type': 'equation',
                        'script': script.text,
                        'latex': self.convert_to_latex(script.text)
                    })
        content_items.append(para_content)

    return content_items
```

### 6.2 Phase 17-B: Hancom Script → LaTeX 변환기

**파일**: `backend/app/services/hangul/equation_converter.py`

```python
class HancomToLatexConverter:
    """Hancom 수식 스크립트를 LaTeX로 변환"""

    REPLACEMENTS = [
        (r'TIMES', r'\\times'),
        (r'÷', r'\\div'),
        (r'!=', r'\\neq'),
        (r'\{([^}]+)\}\s*over\s*\{([^}]+)\}', r'\\frac{\1}{\2}'),
        (r'sqrt\s*\{([^}]+)\}', r'\\sqrt{\1}'),
        (r'root\s*\{(\d+)\}\s*of\s*\{([^}]+)\}', r'\\sqrt[\1]{\2}'),
        (r'LEFT\s*\(', r'\\left('),
        (r'RIGHT\s*\)', r'\\right)'),
        (r'bold\{([^}]+)\}', r'\\mathbf{\1}'),
        (r'`', r'\\,'),  # 공백
    ]

    def convert(self, hancom_script: str) -> str:
        result = hancom_script
        for pattern, replacement in self.REPLACEMENTS:
            result = re.sub(pattern, replacement, result)
        return result
```

### 6.3 Phase 17-C: 프론트엔드 KaTeX 통합

**설치**:
```bash
npm install katex
```

**컴포넌트**: `frontend/src/components/MathRenderer.tsx`

```tsx
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  latex: string;
  display?: boolean;  // 블록 vs 인라인
}

export function MathRenderer({ latex, display = false }: MathRendererProps) {
  const html = katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false
  });

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
```

---

## 7. 데이터 모델 변경

### 7.1 현재 문제 스키마

```typescript
interface Problem {
  content_text: string;  // 텍스트만
  content_equations: string[];  // 별도 배열
}
```

### 7.2 개선된 스키마

```typescript
interface ContentItem {
  type: 'text' | 'equation';
  content: string;  // 텍스트 또는 원본 스크립트
  latex?: string;   // LaTeX 변환 (수식만)
}

interface Problem {
  content: ContentItem[];  // 순서 유지
  content_text: string;    // 검색용 플랫 텍스트
}
```

---

## 8. UI/UX 개선

### 8.1 문제 카드 표시

**Before**:
```
수식입니다. a ^{3}  TIMES a ^{2}
```

**After**:
```
a³ × a²
```

### 8.2 문제 상세 모달

- 문제 내용: 텍스트와 수식이 자연스럽게 혼합
- 정답: 수식 렌더링 + 하이라이트
- 풀이: 단계별 수식 표시

---

## 9. 마이그레이션 계획

### 9.1 기존 데이터 처리

1. 기존 JSON 파일 백업
2. 새로운 스키마로 변환 스크립트 실행
3. 변환 실패 항목 로그 및 수동 검토

### 9.2 점진적 적용

1. **Phase 17-A**: 파서 개선 (신규 파일)
2. **Phase 17-B**: 변환기 구현
3. **Phase 17-C**: 프론트엔드 렌더링
4. **Phase 17-D**: 기존 데이터 마이그레이션

---

## 10. 테스트 계획

### 10.1 변환기 테스트 케이스

| 입력 | 예상 출력 (LaTeX) |
|------|-------------------|
| `a^{3}` | `a^{3}` |
| `a TIMES b` | `a \times b` |
| `{a} over {b}` | `\frac{a}{b}` |
| `sqrt{a}` | `\sqrt{a}` |
| `root{3}of{a}` | `\sqrt[3]{a}` |

### 10.2 렌더링 테스트

1. 단순 지수: `a³`
2. 분수: 분자/분모
3. 루트: √, ³√
4. 복합 수식: 지수 + 분수 + 루트

---

## 11. 예상 일정

| 단계 | 작업 | 예상 복잡도 |
|------|------|-------------|
| 17-A | 파서 개선 | 중 |
| 17-B | LaTeX 변환기 | 중 |
| 17-C | KaTeX 통합 | 하 |
| 17-D | 데이터 마이그레이션 | 중 |
| 17-E | 테스트 및 디버깅 | 중 |

---

## 12. 참고 자료

- [KaTeX Documentation](https://katex.org/docs/api.html)
- [HWPML 2011 Specification](http://www.hancom.co.kr/hwpml/)
- [LaTeX Math Symbols](https://www.overleaf.com/learn/latex/Mathematical_expressions)

---

*작성: Claude Code (Opus)*
*날짜: 2025-11-28*
