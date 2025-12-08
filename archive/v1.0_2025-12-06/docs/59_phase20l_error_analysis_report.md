# Phase 20-L: 새로운 버그 심층 분석 리포트

## 개요

Phase 20-K 완료 후 발견된 두 가지 새로운 버그에 대한 **심층 분석 리포트**입니다.

**작성일:** 2025-11-29
**Phase:** 20-L
**상태:** 분석 완료
**분석 모드:** OPUS THINKHARDER

---

## 1. 버그 요약

### 버그 A: 문제 17 - LaTeX 수식이 텍스트로 표시됨
- **증상**: `$\overline{\mathrm{AB}}$` 가 렌더링되지 않고 그대로 텍스트로 표시
- **위치**: 문제 17 content_latex 필드
- **심각도**: 높음

### 버그 B: 문제 18 - 수식 중복 표시
- **증상**: 같은 수식이 본문과 "수식" 섹션에서 2번 표시됨
- **위치**: 문제 18 (및 모든 수식 포함 문제)
- **심각도**: 중간

---

## 2. 버그 A 분석: LaTeX 수식 미렌더링

### 2.1 데이터 흐름 추적

```
[Backend: hml_parser.py]
    Line 386: latex_parts.append(f'${latex_eq}$')
    → content_latex = "텍스트 $\overline{\mathrm{AB}}$ 텍스트"

[API Response]
    → JSON: {"content_latex": "텍스트 $\\overline{\\mathrm{AB}}$ 텍스트"}

[Frontend: MathDisplay.tsx]
    Line 45: const mathPattern = /\$([^$]+)\$/g;
    → $...$ 패턴 찾아 KaTeX로 렌더링
```

### 2.2 잠재적 원인 분석

#### 가설 1: JSON 이스케이프 문제 (신뢰도: 높음)
```python
# Python 문자열
content_latex = "$\\overline{\\mathrm{AB}}$"  # 백슬래시 1개

# JSON 직렬화 후
{"content_latex": "$\\\\overline{\\\\mathrm{AB}}$"}  # 백슬래시 2개로 이스케이프
```

JavaScript에서 JSON 파싱 후:
- 예상: `$\overline{\mathrm{AB}}$`
- 실제: `$\\overline{\\mathrm{AB}}$` (이중 이스케이프)

**KaTeX 결과**: `\\overline`은 유효하지 않은 명령어 → 에러 또는 텍스트 출력

#### 가설 2: 프론트엔드 정규식 매칭 실패 (신뢰도: 중간)
```javascript
// MathDisplay.tsx Line 45
const mathPattern = /\$([^$]+)\$/g;
```

이 정규식에서 `[^$]+`는 `$` 이외의 모든 문자와 매칭됩니다.

**문제 시나리오**:
- 입력: `"두 점 사이의 거리 $\overline{\mathrm{AB}}$ 를 구하시오"`
- 매칭: 정상적으로 `\overline{\mathrm{AB}}` 캡처되어야 함

정규식 자체는 문제없어 보이나, **입력 문자열에 `$` 기호가 추가로 포함**되어 있다면 매칭이 깨질 수 있음.

#### 가설 3: 다중 서버 문제 재발 (신뢰도: 매우 높음)
```
현재 실행 중인 백그라운드 프로세스:
- Background Bash 685482: uvicorn app.main:app
- Background Bash 88f253: uvicorn app.main:app
- Background Bash d1ba0e: uvicorn app.main:app
- Background Bash a46f1d: uvicorn app.main:app
- ... (20개 이상!)
```

**Phase 20-J에서 진단한 문제가 여전히 존재**:
- 여러 서버가 동시 실행 중
- 어떤 서버가 요청을 처리하는지 불분명
- **이전 코드 버전의 서버가 응답**할 가능성 높음

### 2.3 근본 원인

**1차 원인**: 다중 백그라운드 서버 (20개 이상)
**2차 원인**: Phase 20-K 코드 수정이 실제 실행 서버에 반영되지 않음

---

## 3. 버그 B 분석: 수식 중복 표시

### 3.1 코드 구조 분석

#### Backend: content_latex 생성 (hml_parser.py)
```python
# Line 384-386
latex_eq = self._convert_to_latex(eq_text)
latex_equations.append(latex_eq)           # 수식 배열에 추가
latex_parts.append(f'${latex_eq}$')        # content_latex에 인라인으로 추가
```

결과:
```python
content_latex = "점 A에서 $\overline{AB}$ 까지의 거리를..."
content_equations_latex = ["\overline{AB}"]
```

#### Frontend: 표시 로직 (HangulUploadPage.tsx)
```jsx
{/* 1차 표시: content_latex (수식 인라인 포함) */}
<MathDisplay
  latex={problem.content_latex || problem.content_text || '(내용 없음)'}
/>

{/* 2차 표시: 수식 섹션 (별도 표시) */}
{(problem.content_equations_latex?.length > 0) && (
  <div>
    <h4>수식</h4>
    {problem.content_equations_latex.map((eq, i) => (
      <MathDisplay latex={`$${eq}$`} />
    ))}
  </div>
)}
```

### 3.2 중복 발생 메커니즘

```
문제 18의 수식 "X^2 + Y^2 = R^2"

┌─────────────────────────────────────────────┐
│ content_latex (본문):                        │
│ "원의 방정식 $X^2 + Y^2 = R^2$ 에서..."    │ ← 1차 표시
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 수식 섹션:                                   │
│ [수식] $X^2 + Y^2 = R^2$                    │ ← 2차 표시 (중복!)
└─────────────────────────────────────────────┘
```

### 3.3 근본 원인

**설계적 중복**: 같은 수식이 두 곳에 표시되도록 의도적으로 설계됨
- `content_latex`: 본문에 수식을 인라인으로 포함
- `content_equations_latex`: 수식만 별도 배열로 저장하여 참조용으로 표시

**문제점**: 사용자 입장에서는 같은 수식이 2번 보임

---

## 4. 환경 문제: 다중 서버 실행

### 4.1 현재 상태

```
Background Bash 프로세스 목록:
685482, 88f253, d1ba0e, a46f1d, 29732a, 32dc36, 9eebe4,
f8b2e9, 079279, 488fe4, 8f7efc, b17ecd, 83e8af, 042bbb,
17f007, 657ca7, 1665f1, a7ee54 ...
```

**총 20개 이상의 uvicorn 서버가 동시 실행 중!**

### 4.2 영향

| 문제 | 설명 |
|------|------|
| 코드 반영 안됨 | Phase 20-K 수정이 적용된 서버가 요청을 처리하지 않을 수 있음 |
| 예측 불가 | 어떤 서버가 응답할지 로드밸런싱에 따라 달라짐 |
| 포트 충돌 | 동일 포트(8000)에 여러 프로세스 바인딩 시도 |
| 리소스 낭비 | CPU/메모리 과다 사용 |

### 4.3 해결 필요성

**Phase 20-K에서 환경 정리를 했으나, 이후 다시 여러 서버가 생성됨**

---

## 5. 권장 조치

### 5.1 즉시 조치 (환경 정리)

```powershell
# 1. 모든 Python 프로세스 종료
taskkill /F /IM python.exe /T

# 2. __pycache__ 삭제
powershell -Command "Get-ChildItem -Path 'backend' -Recurse -Directory -Filter '__pycache__' | Remove-Item -Recurse -Force"

# 3. 단일 서버만 재시작
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5.2 버그 A 수정 (LaTeX 미렌더링)

환경 정리 후에도 문제가 지속되면:

**Option 1**: 백엔드에서 JSON 이스케이프 확인
```python
# hml_parser.py 디버그 로깅
import json
print(f"[DEBUG] content_latex raw: {repr(content_latex)}")
print(f"[DEBUG] content_latex json: {json.dumps(content_latex)}")
```

**Option 2**: 프론트엔드에서 입력 확인
```javascript
// MathDisplay.tsx 디버그
console.log('MathDisplay input:', JSON.stringify(latex));
console.log('Has $ pattern:', latex.includes('$'));
```

### 5.3 버그 B 수정 (중복 표시)

**Option 1**: "수식" 섹션 제거 (권장)
```jsx
// HangulUploadPage.tsx Line 227-238 제거 또는 조건부 숨김
// content_latex에 이미 수식이 포함되어 있으므로 별도 표시 불필요
```

**Option 2**: 중복 감지 로직 추가
```jsx
// content_latex에 없는 수식만 "수식" 섹션에 표시
const uniqueEquations = equations.filter(eq =>
  !content_latex.includes(`$${eq}$`)
);
```

**Option 3**: UI 디자인 변경
```jsx
// "수식" 섹션을 접히는 상세정보로 변경
<details>
  <summary>수식 목록 ({equations.length}개)</summary>
  {equations.map(...)}
</details>
```

---

## 6. 진단 요약

| 버그 | 근본 원인 | 해결 방법 | 우선순위 |
|------|----------|-----------|----------|
| A: LaTeX 미렌더링 | 다중 서버 + 이전 코드 실행 | 환경 정리 | 긴급 |
| B: 수식 중복 | 설계적 중복 표시 | "수식" 섹션 제거/숨김 | 중간 |

---

## 7. 결론

### 가장 시급한 조치

**환경 정리가 반드시 선행되어야 합니다.**

현재 20개 이상의 서버가 실행 중이어서:
1. Phase 20-K 코드 수정이 반영되지 않음
2. 어떤 버전의 코드가 실행되는지 알 수 없음
3. 모든 디버깅이 무의미해짐

### 다음 단계

1. **환경 완전 정리** (모든 Python 프로세스 종료)
2. **캐시 삭제** (`__pycache__` 제거)
3. **단일 서버 실행** (하나의 터미널에서만)
4. **문제 17, 18 재테스트**
5. **버그 지속 시 추가 디버깅**

---

*분석 완료: 2025-11-29*
*분석 모드: OPUS THINKHARDER*
*작성: Claude Code (Opus 4.5)*
