# Phase 14-2 내보내기 디버깅 상세 리포트

**날짜**: 2025-11-27
**심각도**: Critical (해결됨)
**상태**: 완료

---

## 1. 문제 요약

### 증상
- 11페이지에서 "내보내기" 버튼 클릭 시 404 에러 지속
- 코드 수정 후 브라우저 새로고침해도 동일 에러 발생

### 에러 메시지
```
POST http://localhost:8000/api/export/documents/베이직쎈 중등 2-1/pages/11/export 404 (Not Found)
"페이지 이미지를 찾을 수 없습니다"
```

---

## 2. 디버깅 과정

### 2.1 초기 분석

**코드 수정 확인**:
```python
# export.py 라인 62-68 - 수정됨
image_file = doc_dir / "pages" / f"page_{page_index:04d}.png"
if not image_file.exists():
    # WebP 파일도 확인
    image_file = doc_dir / "pages" / f"page_{page_index:04d}.webp"
    if not image_file.exists():
        raise HTTPException(status_code=404, detail="페이지 이미지를 찾을 수 없습니다")
```
→ 코드는 정확히 수정되어 있었음

### 2.2 파일 시스템 확인

```bash
$ ls dataset_root/documents/베이직쎈 중등 2-1/pages/
page_0011.webp  (존재함, 123KB)
```
→ WebP 이미지 파일 정상 존재

### 2.3 서버 상태 분석

**발견된 문제**:
1. 두 개의 백엔드 서버 인스턴스가 존재했음
2. 하나는 이전 세션에서 실행된 서버 (수정 전 코드)
3. 다른 하나는 새로 시작된 서버 (수정 후 코드)

**로그 비교**:

| 서버 | 블록 분석 결과 | 코드 버전 |
|------|---------------|----------|
| f0b3dd (이전) | "11~20페이지, 총 0개 블록" | 수정 전 |
| ac5cb2 (새로) | "11~20페이지, 총 8622개 블록" | 수정 후 |

### 2.4 리로드 실패 확인

```
WARNING: WatchFiles detected changes in 'app\routers\export.py'. Reloading...
```
→ 리로드 감지 메시지 후 "Started server process" 확인 메시지 없음
→ 리로드가 중간에 실패하거나 완료되지 않았을 가능성

---

## 3. 근본 원인

### 원인 1: 서버 리로드 불완전

Uvicorn의 `--reload` 옵션이 파일 변경을 감지했지만, 리로드 과정이 완전히 완료되지 않았습니다.

**가능한 원인**:
- 백그라운드 작업 중 리로드 시도
- 파일 락 문제
- 리로드 중 예외 발생

### 원인 2: 복수 서버 인스턴스

여러 Claude Code 세션에서 각각 서버를 실행하여 동일 포트에 대해 리로더 프로세스가 충돌했을 수 있습니다.

---

## 4. 해결 방법

### 즉시 해결
```bash
# 1. 모든 기존 서버 프로세스 종료
taskkill //F //PID <process_id>

# 또는
netstat -ano | findstr :8000
taskkill //F //PID <PID>

# 2. 서버 완전 재시작
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 검증
```bash
# API 테스트
curl -X POST "http://localhost:8000/api/export/documents/베이직쎈%20중등%202-1/pages/11/export"

# 결과
{"exported_count":7,"problems":[...]}
```

---

## 5. 수정된 버그 요약

| 버그 | 파일 | 수정 내용 | 상태 |
|------|------|----------|------|
| WebP 미검색 (export.py) | `export.py:62-68` | PNG 없을 시 WebP 확인 | ✅ 수정됨 |
| 서버 리로드 실패 | 운영 문제 | 서버 완전 재시작 | ✅ 해결됨 |

---

## 6. 향후 권장사항

### 6.1 서버 관리
1. 코드 수정 후 서버 응답이 없으면 **완전 재시작** 권장
2. `--reload` 옵션 사용 시 리로드 완료 메시지 확인:
   ```
   INFO: Started server process [xxxxx]
   INFO: Application startup complete.
   ```

### 6.2 코드 변경 시 체크리스트
1. 파일 저장 확인
2. 서버 리로드 로그 확인
3. API 직접 테스트 (curl 또는 브라우저)
4. 필요시 서버 완전 재시작

### 6.3 복수 세션 주의
- 여러 터미널/세션에서 동일 포트 서버 실행 금지
- 이전 세션의 서버 프로세스 확인 후 종료

---

## 7. 검증 결과

### API 테스트 성공
```json
{
  "exported_count": 7,
  "problems": [
    {"group_id": "L1", "image_path": "..._L1.png", "bbox": [157,452,677,623]},
    {"group_id": "L2", "image_path": "..._L2.png", "bbox": [157,835,675,1063]},
    {"group_id": "L3", "image_path": "..._L3.png", "bbox": [157,1230,655,1500]},
    {"group_id": "R1", "image_path": "..._R1.png", "bbox": [725,328,1149,544]},
    {"group_id": "R2", "image_path": "..._R2.png", "bbox": [726,749,1239,798]},
    {"group_id": "R3", "image_path": "..._R3.png", "bbox": [725,1003,1239,1185]},
    {"group_id": "R4", "image_path": "..._R4.png", "bbox": [726,1390,1244,1509]}
  ]
}
```

### 프론트엔드 검증
브라우저에서 http://localhost:5173 접속 후:
1. "베이직쎈 중등 2-1" 문서 선택
2. 11페이지 이동
3. "내보내기" 버튼 클릭
4. 성공 메시지 확인

---

## 8. 타임라인

| 시간 | 작업 |
|------|------|
| T+0 | 에러 보고: 404 Not Found |
| T+5 | export.py WebP 지원 코드 수정 |
| T+10 | 브라우저 새로고침 - 여전히 404 |
| T+15 | 서버 로그 분석 - 리로드 불완전 발견 |
| T+20 | 복수 서버 인스턴스 발견 |
| T+25 | 모든 서버 종료 및 재시작 |
| T+30 | API 테스트 성공 |

---

*리포트 작성: Claude Code*
*날짜: 2025-11-27*
