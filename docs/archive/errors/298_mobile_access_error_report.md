# 모바일 접속 불가 에러 리포트

**작성일**: 2025-12-12
**증상**: 같은 WiFi에서 핸드폰으로 PC 서버 접속 불가

---

## 1. 현재 상태

| 항목 | 상태 |
|------|------|
| PC IP | 192.168.219.103 |
| 포트 3000 (Frontend) | **실행 안됨** |
| 포트 8000 (Backend) | **실행 안됨** |

---

## 2. 가능한 원인

### 2.1 서버 미실행 (현재 문제)
- `start cmd /k` 명령이 새 창에서 실행되었지만 에러로 종료됨
- 또는 서버 시작 후 즉시 종료됨

### 2.2 Windows 방화벽
- 포트 3000, 8000이 방화벽에 의해 차단됨
- 외부 네트워크에서 접속 불가

### 2.3 서버 바인딩 문제
- `--host 0.0.0.0` 옵션 누락
- localhost(127.0.0.1)에만 바인딩되어 외부 접속 불가

---

## 3. 해결 방법

### 3.1 수동으로 서버 시작 (권장)

**터미널 1 - 백엔드:**
```bash
cd c:\MYCLAUDE_PROJECT\pdf\backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**터미널 2 - 프론트엔드:**
```bash
cd c:\MYCLAUDE_PROJECT\pdf\frontend
npm run dev -- --host --port 3000
```

### 3.2 Windows 방화벽 규칙 추가

**PowerShell (관리자 권한):**
```powershell
# 포트 3000 허용
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# 포트 8000 허용
New-NetFirewallRule -DisplayName "FastAPI Backend" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

### 3.3 방화벽 임시 비활성화 (테스트용)

**PowerShell (관리자 권한):**
```powershell
# 비활성화
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# 테스트 후 다시 활성화
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

---

## 4. 서버 실행 확인 방법

### 4.1 포트 확인
```bash
netstat -ano | findstr LISTENING | findstr :3000
netstat -ano | findstr LISTENING | findstr :8000
```

결과 예시 (정상):
```
TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    12345
TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING    67890
```

### 4.2 PC에서 접속 테스트
```
http://localhost:3000/backoffice
http://192.168.219.103:3000/backoffice
```

---

## 5. 핸드폰 접속 체크리스트

- [ ] PC와 핸드폰이 같은 WiFi 연결
- [ ] 백엔드 서버 실행 중 (포트 8000)
- [ ] 프론트엔드 서버 실행 중 (포트 3000)
- [ ] 서버가 `0.0.0.0`에 바인딩됨
- [ ] Windows 방화벽에서 포트 허용됨
- [ ] 올바른 IP 주소로 접속 (`192.168.219.103`)

---

## 6. 테스트 URL

```
http://192.168.219.103:3000/backoffice
```

---

*에러 리포트 완료: 2025-12-12*
