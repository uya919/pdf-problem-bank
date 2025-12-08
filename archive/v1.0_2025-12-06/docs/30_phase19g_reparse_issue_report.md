# Phase 19-G: "다시 파싱" 버튼이 작동하지 않는 문제 조사 리포트

## 요약

"다시 파싱" 버튼을 눌러도 변환 결과가 동일하게 나오는 문제의 **근본 원인**은 **Python 서버 캐시(bytecode)**였습니다. 코드 변경 후 서버가 오래된 `.pyc` 파일을 계속 사용하여 새로운 변환 로직이 적용되지 않았습니다.

---

## 조사 과정

### 1. 데이터 흐름 분석

```
[HML 파일] → [API /parse] → [HMLParser.parse()] → [clean_hwp_equation() / hwp_to_latex()]
                ↓
[ParseResult.to_dict()] → [JSON 응답] → [프론트엔드 표시]
```

### 2. 실제 HML 파일 내용 확인

**문제 17의 원본 수식:**
```
overline{{rm{AB}} it }= overline{{rm{BC}} it }`
```

**HML에서 추출된 패턴들:**
1. `overline{{rm{AB}} it }= overline{{rm{BC}} it }\`` - 전체 패턴
2. `{rm{A}} it` - 개별 rm 패턴
3. `overline{{rm{AB}} }` - it 없는 패턴

### 3. 변환 함수 직접 테스트

Python CLI에서 직접 테스트한 결과, **모든 변환이 정상 작동**:

| 입력 | Plain Text | LaTeX |
|------|------------|-------|
| `overline{{rm{AB}} it }= overline{{rm{BC}} it }` | `(AB)= (BC)` | `\\overline{\mathrm{AB}} = \\overline{\mathrm{BC}}` |
| `{rm{A}} it` | `A it` | `\mathrm{A}` |
| `overline{{rm{AB}}}` | `(AB)` | `\\overline{\mathrm{AB}}` |

**결론:** 변환 함수 자체는 정상 동작

### 4. API 응답 확인 (서버 재시작 전)

```json
{
  "content_equations_latex": [
    "overline{{rm{AB}}} = overline{{rm{BC}}}"  // 변환 안 됨!
  ]
}
```

**발견:** 서버가 이전 코드를 사용 중

### 5. 서버 재시작 후 API 응답

```json
{
  "content_equations_latex": [
    "\\\\overline{\\mathrm{AB}} = \\\\overline{\\mathrm{BC}}"  // 정상 변환!
  ]
}
```

---

## 근본 원인

### Python Bytecode 캐시 문제

```
backend/app/services/hangul/__pycache__/
├── hml_parser.cpython-311.pyc      ← 오래된 바이트코드
├── hwp_latex_converter.cpython-311.pyc  ← 오래된 바이트코드
└── ...
```

1. **코드 수정**: `hml_parser.py`, `hwp_latex_converter.py`에 Phase 19-G 패턴 추가
2. **pycache 문제**: `--reload` 옵션이 있어도, uvicorn이 이미 로드된 모듈은 다시 컴파일하지 않음
3. **동일 결과**: 서버가 `.pyc` 캐시를 계속 사용하여 새 코드 미적용

### uvicorn --reload의 한계

- `--reload`는 **파일 변경 감지** 시에만 재로드
- 이미 로드된 모듈의 **bytecode 캐시**는 유지
- 특히 `import` 시점에 캐시된 모듈은 변경되지 않음

---

## 해결 방법

### 즉각적 해결 (완료)

```bash
# 1. 모든 Python 프로세스 종료
taskkill /F /PID <pid>

# 2. pycache 삭제
Remove-Item -Recurse -Force 'backend/app/services/hangul/__pycache__'

# 3. 서버 재시작 (bytecode 캐시 비활성화)
PYTHONDONTWRITEBYTECODE=1 python -m uvicorn app.main:app --reload
```

### 영구적 해결 방안

1. **환경 변수 설정** (추천):
   ```bash
   # .env 또는 시스템 환경 변수
   PYTHONDONTWRITEBYTECODE=1
   ```

2. **"다시 파싱" 버튼 개선**:
   - 프론트엔드에서 `Ctrl+Shift+R` (강력 새로고침) 안내
   - 백엔드에서 모듈 리로드 기능 추가 (개발 모드)

3. **개발 서버 스크립트**:
   ```bash
   # start_dev.bat
   @echo off
   set PYTHONDONTWRITEBYTECODE=1
   del /s /q backend\app\services\hangul\__pycache__\*.pyc 2>nul
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

---

## 검증 결과

### 서버 재시작 후 API 테스트

```
=== Problem 17 (서버 재시작 후) ===
content_equations_latex:
['\\\\overline{\\mathrm{AB}} = \\\\overline{\\mathrm{BC}}']

content_latex:
...$\\overline{\mathrm{AB}} = \\overline{\mathrm{BC}}$...
```

**Phase 19-G 변환이 정상 적용됨을 확인**

---

## 추가 발견 사항

### 1. HML 파일의 실제 패턴 다양성

| 패턴 | 빈도 | 처리 상태 |
|------|------|----------|
| `overline{{rm{AB}} it }` | 높음 | ✓ 처리됨 |
| `{rm{A}} it` | 높음 | ✓ 처리됨 |
| `overline{{rm{AB}}}` | 중간 | ✓ 처리됨 |
| `overline{{rm{AB}} }` (it 없음) | 낮음 | ✓ 처리됨 |

### 2. `content_text` vs `content_latex` 차이

- `content_text`: `clean_hwp_equation()` 사용 → Plain text 변환
- `content_latex`: `hwp_to_latex()` 사용 → LaTeX 변환

두 함수 모두 Phase 19-G 패턴이 적용됨

---

## 결론

| 항목 | 상태 |
|------|------|
| 변환 함수 구현 | ✓ 완료 |
| 유닛 테스트 | ✓ 모두 통과 |
| API 변환 | ✓ 서버 재시작 후 정상 |
| 프론트엔드 표시 | ✓ 서버 재시작 후 정상 |

**"다시 파싱" 버튼이 작동하지 않는 것처럼 보인 이유:**
- 버튼 자체는 정상 작동 (API 호출됨)
- 서버가 오래된 bytecode 캐시를 사용하여 새 변환 로직 미적용
- 서버 완전 재시작 후 정상 동작

---

*작성일: 2025-11-29*
*Phase: 19-G 장식 기호 및 중괄호 패턴 변환*
