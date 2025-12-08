# HML 미주(ENDNOTE) 기반 문제 추출 연구 리포트

**작성일**: 2025-11-28
**작성자**: Claude Code (Opus)
**분석 파일**: 내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml

---

## 1. Executive Summary

### 1.1 문제 현상
```
기대 문제 수: 21개
실제 검출 수: 16개 (또는 0개)
누락된 문제: 5개 (18~21번 주관식/서술형)
```

### 1.2 핵심 발견
| 항목 | 값 | 의미 |
|------|-----|------|
| **ENDNOTE 태그** | 21개 | 정확히 21문제 |
| **AUTONUM(Endnote)** | 21개 | 문제 번호 1~21 |
| **객관식 문제** | 17개 | ①~⑤ 보기 있음 |
| **주관식/서술형** | 4개 | 보기 없음 (18~21번) |
| **배점 태그** | 16개 | 일부 문제 배점 없음 |

### 1.3 근본 원인
현재 파서가 **"보기(①~⑤) 패턴"**으로만 문제를 검출하기 때문에,
**보기가 없는 주관식/서술형 문제 4개가 누락**됨.

---

## 2. HML 미주(ENDNOTE) 구조 분석

### 2.1 한컴오피스 미주 시스템
```
한컴오피스에서 미주(Endnote)는:
1. 본문에 작은 숫자(위첨자) 삽입
2. 문서 끝에 해당 번호의 주석 표시
3. HML에서는 ENDNOTE 태그로 표현

시험지 제작 시 활용:
- 각 문제 끝에 미주 번호 삽입
- 미주 내용에 [정답] 기록
- 인쇄 시 "빠른 정답" 페이지로 출력
```

### 2.2 XML 구조
```xml
<!-- 문제 본문에서 미주 참조 -->
<P>
  <TEXT>부등식 |x-5| < 3을 만족시키는...</TEXT>
  <AUTONUM NumberType="Endnote" Number="1"/>  <!-- 문제 1번 마커 -->
</P>

<!-- 문서 끝 미주 섹션 -->
<ENDNOTE>
  <P>
    <TEXT>[정답] ②</TEXT>
  </P>
</ENDNOTE>
```

### 2.3 AUTONUM 태그 구조
```
NumberType 종류:
- "Endnote": 미주 번호 (문제 번호)
- "Page": 페이지 번호
- "TotalPage": 전체 페이지 수

발견된 AUTONUM(Endnote):
- Number 1~21 (총 21개)
- 각각 해당 ENDNOTE와 연결
```

---

## 3. 문제별 상세 분석

### 3.1 객관식 문제 (1~17번)
```
특징:
- ① ② ③ ④ ⑤ 보기 패턴 있음
- [정답] 뒤에 원문자 (①~⑤)
- 대부분 배점 태그 있음

예시 (문제 2):
본문: "두 점 A(-1, 2), B(7, -6)에 대하여 선분 AB의 중점을
       지나고 기울기가 4인 직선의 방정식은?"
보기: ① 4x-y=0 ② 4x-y-7=0 ③ 4x-y+7=0 ④ 4x-y-14=0 ⑤ 4x-y+14=0
정답: ④
배점: [4.20점]
```

### 3.2 주관식/서술형 문제 (18~21번)
```
특징:
- ① ~ ⑤ 보기 없음
- 정답이 수식 또는 값
- 18~20번: 단답형
- 21번: 서술형 (풀이과정 요구)

문제 18:
  유형: 연립부등식 풀이
  정답: -8 ≤ x ≤ 3
  배점: [4.00점]

문제 19:
  유형: 직선의 방정식 구하기
  정답: y = -3x + 10 또는 y = -3x - 10
  배점: 명시 안 됨

문제 20:
  유형: 값 구하기
  정답: 60
  배점: 명시 안 됨

문제 21:
  유형: 서술형 (풀이과정 + 답)
  내용: 삼각형 OAP의 넓이 구하기
  정답: 15/2
  배점: [7.00점]
```

### 3.3 정답 전체 목록 (미주 기반)
| 번호 | 유형 | 정답 | 배점 |
|------|------|------|------|
| 1 | 객관식 | ② | - |
| 2 | 객관식 | ④ | 4.20점 |
| 3 | 객관식 | ① | 4.30점 |
| 4 | 객관식 | ③ | 4.60점 |
| 5 | 객관식 | ④ | - |
| 6 | 객관식 | ③ | - |
| 7 | 객관식 | ⑤ | 4.70점 |
| 8 | 객관식 | ① | 4.70점 |
| 9 | 객관식 | ③ | 4.70점 |
| 10 | 객관식 | ④ | 4.90점 |
| 11 | 객관식 | ⑤ | 4.90점 |
| 12 | 객관식 | ① | 4.90점 |
| 13 | 객관식 | ② | 4.90점 |
| 14 | 객관식 | ② | - |
| 15 | 객관식 | ⑤ | 5.00점 |
| 16 | 객관식 | ① | 5.00점 |
| 17 | 객관식 | ⑤ | 5.00점 |
| 18 | 주관식 | -8≤x≤3 | 4.00점 |
| 19 | 주관식 | y=-3x±10 | - |
| 20 | 단답형 | 60 | - |
| 21 | 서술형 | 15/2 | 7.00점 |

---

## 4. 현재 파서의 한계점

### 4.1 문제점 분석
```python
# 현재 방식: 보기 패턴 기반
# ① ~ ⑤ 연속 패턴이 있어야 문제로 인식

choice_groups = re.findall(
    r'①[^①]*②[^②]*③[^③]*④[^④]*⑤[^⑤]*',
    all_text
)
# 결과: 16개 (실제 보기 그룹 17개 중 일부)

# 주관식 문제 18~21번은:
# - 보기가 없음
# - [정답] 뒤에 수식/값
# - 검출 불가능
```

### 4.2 누락 원인
| 원인 | 영향 |
|------|------|
| 보기 패턴 의존 | 주관식 4문제 누락 |
| ENDNOTE 미활용 | 문제 수 파악 불가 |
| AUTONUM 미활용 | 문제 번호 추출 불가 |
| 문제 유형 미구분 | 객관식/주관식 혼동 |

---

## 5. 해결 방안

### 5.1 방안 A: ENDNOTE 기반 추출 (권장)

**원리**:
1. ENDNOTE 태그 수 = 문제 수
2. 각 ENDNOTE에서 정답 추출
3. AUTONUM으로 문제 본문 위치 파악
4. 문제 유형 자동 분류

```python
def extract_problems_by_endnote(root):
    """ENDNOTE 기반 문제 추출"""
    problems = []
    endnotes = list(root.iter('ENDNOTE'))

    for i, note in enumerate(endnotes):
        problem = ParsedProblem(number=str(i + 1))

        # 정답 추출
        note_text = ''.join(note.itertext()).strip()
        ans_match = re.search(r'\[정답\]\s*(.+)', note_text)
        if ans_match:
            answer = ans_match.group(1).strip()
            # 객관식 vs 주관식 구분
            if re.match(r'^[①②③④⑤]$', answer):
                problem.answer_type = 'choice'
                problem.answer = answer
            else:
                problem.answer_type = 'subjective'
                problem.answer = answer

        problems.append(problem)

    return problems  # 21개 문제
```

### 5.2 방안 B: AUTONUM 위치 기반 본문 추출

```python
def extract_problem_content_by_autonum(root):
    """AUTONUM으로 문제 본문 위치 파악"""
    problem_positions = []

    for p in root.iter('P'):
        for autonum in p.iter('AUTONUM'):
            if autonum.get('NumberType') == 'Endnote':
                num = int(autonum.get('Number', 0))
                # 이 P 태그 이전의 텍스트가 문제 본문
                problem_positions.append({
                    'number': num,
                    'p_element': p
                })

    return problem_positions  # 21개 위치
```

### 5.3 방안 C: 하이브리드 방식

```python
def extract_problems_hybrid(root):
    """ENDNOTE + AUTONUM + 보기패턴 결합"""
    # 1. ENDNOTE로 문제 수와 정답 파악
    endnotes = list(root.iter('ENDNOTE'))
    total_problems = len(endnotes)  # 21

    # 2. AUTONUM으로 문제 위치 파악
    autonum_positions = find_autonum_positions(root)

    # 3. 보기 패턴으로 문제 유형 구분
    for problem in problems:
        if has_choice_pattern(problem.content):
            problem.type = 'multiple_choice'
        else:
            problem.type = 'subjective'

    return problems
```

---

## 6. 구현 권장 사항

### 6.1 Phase 19-B: ENDNOTE 기반 파싱 (즉시 구현)

**수정 파일**: `backend/app/services/hangul/hml_parser.py`

```python
class HMLParser(HangulParserBase):

    def parse(self) -> ParseResult:
        # 기존 코드...

        # Phase 19-B: ENDNOTE 기반 추출 시도
        endnotes = list(self.root.iter('ENDNOTE'))
        if len(endnotes) > 0:
            result.problems = self._extract_by_endnote(endnotes)
        else:
            # 기존 방식 폴백
            result.problems = self.extractor.extract_problems(paragraphs)

    def _extract_by_endnote(self, endnotes) -> List[ParsedProblem]:
        """ENDNOTE 기반 문제 추출"""
        problems = []

        for i, note in enumerate(endnotes):
            problem = ParsedProblem(number=str(i + 1))
            note_text = ''.join(note.itertext()).strip()

            # 정답 추출
            ans_match = re.search(r'\[정답\]\s*(.+)', note_text)
            if ans_match:
                raw_answer = ans_match.group(1).strip()
                # HWP 수식 정리
                answer = clean_hwp_equation(raw_answer)

                # 유형 구분
                if re.match(r'^[①②③④⑤]$', answer):
                    problem.answer_type = 'choice'
                else:
                    problem.answer_type = 'subjective'

                problem.answer = answer

            problems.append(problem)

        return problems
```

### 6.2 Phase 19-C: 문제 본문 매핑 (후속 구현)

1. AUTONUM 위치로 문제 본문 범위 파악
2. 이전 문제의 AUTONUM ~ 현재 AUTONUM 사이 텍스트
3. 배점 태그 위치로 문제 경계 보정

### 6.3 Phase 19-D: 문제 유형 자동 분류

| 유형 | 판별 기준 |
|------|-----------|
| 객관식 | 정답이 ①~⑤ |
| 단답형 | 정답이 숫자 또는 짧은 수식 |
| 서술형 | "풀이", "과정" 키워드 또는 7점 이상 |

---

## 7. "빠른 정답" 섹션 분석

### 7.1 현재 상태
```
"빠른 정답" 텍스트 위치: 4777
내용: Base64 인코딩된 바이너리 데이터

해석:
- 이 부분은 "빠른 정답" 이미지의 Base64 인코딩
- 텍스트로 "1) ② 2) ④ ..." 형태가 아님
- 한컴이 이미지로 삽입한 것으로 추정
```

### 7.2 활용 가능성
```
- 텍스트로 존재하지 않아 직접 파싱 불가
- BINDATA로 이미지 추출 후 OCR 가능 (복잡)
- ENDNOTE 기반이 더 신뢰성 높음
```

---

## 8. 결론

### 8.1 핵심 발견
| 항목 | 내용 |
|------|------|
| **실제 문제 수** | 21개 (ENDNOTE 기준) |
| **객관식** | 17개 (1~17번) |
| **주관식/서술형** | 4개 (18~21번) |
| **누락 원인** | 보기 패턴 의존으로 주관식 누락 |

### 8.2 권장 해결책

**1순위**: ENDNOTE 기반 추출
- 가장 정확한 문제 수 파악
- 정답 추출 신뢰성 높음
- 구현 복잡도 낮음

**2순위**: AUTONUM 위치 기반 본문 추출
- 문제 본문 정확히 분리
- ENDNOTE와 결합하여 완전한 정보

**3순위**: 하이브리드 방식
- 기존 보기 패턴 + ENDNOTE + AUTONUM
- 다양한 형식의 시험지 호환

### 8.3 예상 결과
```
구현 전: 16개 검출 (또는 0개)
구현 후: 21개 검출 (100%)

추가 정보:
- 문제 유형 자동 분류 (객관식/주관식/서술형)
- 정답 정확도 향상
- 배점 정보 매핑
```

---

## 부록 A: ENDNOTE 전체 내용

```
미주  1: [정답] ②
미주  2: [정답] ④
미주  3: [정답] ①
미주  4: [정답] ③
미주  5: [정답] ④
미주  6: [정답] ③
미주  7: [정답] ⑤
미주  8: [정답] ①
미주  9: [정답] ③
미주 10: [정답] ④
미주 11: [정답] ⑤
미주 12: [정답] ①
미주 13: [정답] ②
미주 14: [정답] ②
미주 15: [정답] ⑤
미주 16: [정답] ①
미주 17: [정답] ⑤
미주 18: [정답] -8 ≤ x ≤ 3
미주 19: [정답] y = -3x + 10 또는 y = -3x - 10
미주 20: [정답] 60
미주 21: [정답] 15/2
```

## 부록 B: AUTONUM 구조

```
AUTONUM  4: NumberType='Endnote', Number='1'  (문제 1)
AUTONUM  5: NumberType='Endnote', Number='2'  (문제 2)
...
AUTONUM 24: NumberType='Endnote', Number='21' (문제 21)
```

## 부록 C: 테스트 코드

```python
# ENDNOTE 기반 21문제 추출 테스트
import xml.etree.ElementTree as ET

file_path = r'내신 2024년 인천 미추홀구 인화여고...Hml'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

root = ET.fromstring(content)
endnotes = list(root.iter('ENDNOTE'))

print(f"문제 수: {len(endnotes)}")  # 21

for i, note in enumerate(endnotes):
    text = ''.join(note.itertext()).strip()
    print(f"문제 {i+1}: {text}")
```

---

*작성: Claude Code (Opus)*
*날짜: 2025-11-28*
*분석 도구: Python xml.etree.ElementTree, regex*
