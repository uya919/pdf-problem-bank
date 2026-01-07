# Vercel MCP 연결 실패 분석 리포트

> 작성일: 2026-01-06
> 상태: ✅ 원인 파악 완료

---

## 1. 문제 요약

| 항목 | 내용 |
|------|------|
| **증상** | Vercel MCP가 계속 "Failed to connect" 상태 |
| **시도한 패키지** | 4개 이상 |
| **환경** | Windows 11, Claude Code CLI |

---

## 2. 시도한 방법들

### 2.1 공식 원격 MCP (HTTP 방식)
```bash
claude mcp add --transport http vercel https://mcp.vercel.com
```
**결과**: `⚠ Needs authentication`
- OAuth 인증 필요하지만, Claude Code에서 브라우저 OAuth 플로우가 자동으로 시작되지 않음

### 2.2 mcp-vercel 패키지 (비공식)
```bash
claude mcp add vercel -e VERCEL_TOKEN=xxx -- npx -y mcp-vercel
```
**결과**: `✗ Failed to connect`
- npm 패키지: https://www.npmjs.com/package/mcp-vercel
- 환경변수 VERCEL_TOKEN 설정했으나 실패

### 2.3 vercel-mcp-server 패키지
```bash
claude mcp add vercel -- npx -y vercel-mcp-server
```
**결과**: `✗ Failed to connect`

### 2.4 @anthropic-ai/mcp-server-vercel 패키지
```bash
claude mcp add vercel -- npx -y @anthropic-ai/mcp-server-vercel
```
**결과**: 시도 중 중단됨

### 2.5 @vercel/mcp 패키지 (공식)
```bash
claude mcp add vercel -e VERCEL_API_TOKEN=xxx -- npx -y @vercel/mcp
```
**결과**: 시도 중 중단됨

---

## 3. 실패 원인 분석

### 3.1 공식 원격 MCP (https://mcp.vercel.com)

**문제점**:
1. OAuth 인증 플로우 필요
2. Claude Code CLI에서 브라우저 인증 자동 시작 미지원
3. 별도의 인증 토큰 전달 방법이 명확하지 않음

**참고**: Vercel 공식 문서에 따르면 원격 MCP는 브라우저 기반 OAuth를 사용

### 3.2 비공식 npm 패키지들 (mcp-vercel, vercel-mcp-server)

**가능한 원인들**:

1. **환경변수 전달 문제**
   - Claude Code의 `-e` 옵션이 제대로 환경변수를 전달하지 못할 수 있음
   - Windows 환경에서 환경변수 처리 방식 차이

2. **npx 캐시/버전 문제**
   - npx -y 옵션이 최신 버전을 가져오지만, 패키지 자체에 버그가 있을 수 있음
   - 일부 패키지는 유지보수가 중단됨

3. **Windows 호환성**
   - 대부분의 MCP 패키지가 Linux/macOS 환경에서 개발됨
   - Windows에서 stdio 통신 방식에 문제가 있을 수 있음

4. **토큰 형식 불일치**
   - 환경변수 이름이 패키지마다 다름:
     - `VERCEL_TOKEN`
     - `VERCEL_API_TOKEN`
     - `VERCEL_ACCESS_TOKEN`

5. **패키지 시작 시간 초과**
   - Claude Code가 MCP 연결 시 타임아웃이 짧아서 패키지 로딩 전 실패

### 3.3 디버깅 부족

**현재 알 수 없는 것들**:
- 실제 에러 메시지 (npx 실행 시 발생하는 stderr)
- 패키지가 요구하는 정확한 환경변수 이름
- 패키지 버전별 호환성

---

## 4. 추가 조사 필요 사항

### 4.1 각 패키지 직접 실행 테스트
```bash
# 패키지를 직접 실행해서 에러 메시지 확인
npx -y mcp-vercel 2>&1
```

### 4.2 환경변수 확인
```bash
# 어떤 환경변수를 요구하는지 소스코드 확인
# mcp-vercel GitHub 저장소 확인
```

### 4.3 Windows 환경 테스트
```bash
# PowerShell에서 환경변수 설정 후 실행
$env:VERCEL_TOKEN="xxx"
npx -y mcp-vercel
```

### 4.4 다른 성공 사례 조사
- Claude Code + Vercel MCP 성공 사례 검색
- Windows에서 작동하는 설정 방법 확인

---

## 5. 대안 방안

### 5.1 Vercel CLI 직접 사용 (권장)
```bash
# 배포 상태 확인
vercel list

# 최근 배포 로그
vercel logs

# 프로젝트 정보
vercel inspect
```
**장점**: 이미 로그인되어 있고 작동함

### 5.2 Git 기반 배포 확인
```bash
# Git push 후 Vercel 자동 배포 확인
git log --oneline -5
# Vercel 대시보드에서 배포 상태 확인
```

### 5.3 Vercel 대시보드 직접 접속
- URL: https://vercel.com/dashboard
- 브라우저에서 배포 상태, 로그, 에러 확인 가능

### 5.4 Chrome DevTools MCP로 실제 사이트 테스트
```
# 이미 연결된 chrome-devtools MCP 활용
# 실제 배포된 사이트에서 기능 테스트
```

---

## 6. 근본 원인 (Root Cause)

### 🔴 핵심 발견: 패키지가 존재하지 않음!

```bash
# 테스트 결과
npm view mcp-vercel          # 404 Not Found
npm view @vercel/mcp         # 404 Not Found
npm view vercel-mcp-server   # 404 Not Found
```

**시도했던 모든 패키지가 npm 레지스트리에 존재하지 않았음!**

### 실제 존재하는 Vercel MCP 패키지

```bash
npm search vercel mcp
```

| 패키지 | 상태 | 설명 |
|--------|------|------|
| `@vercel/mcp-adapter` | 존재 | Next.js용 MCP 어댑터 (서버용) |
| `mcp-handler` | 존재 | Vercel MCP 어댑터 |
| `@robinson_ai_systems/vercel-mcp` | ✅ 존재 | **50+ 도구 포함, Claude Code용** |

### 작동하는 패키지 테스트

```bash
# @robinson_ai_systems/vercel-mcp 실행 성공
cmd /c "set VERCEL_TOKEN=xxx && npx -y @robinson_ai_systems/vercel-mcp"
# → 정상 실행됨!
```

---

## 7. 해결 방법

### Claude Code에 올바른 패키지 설정

```bash
# 1. 기존 vercel MCP 제거
claude mcp remove vercel

# 2. 올바른 패키지로 추가 (환경변수 포함)
claude mcp add vercel -e VERCEL_TOKEN=YOUR_TOKEN -- npx -y @robinson_ai_systems/vercel-mcp
```

### 주의사항
- 패키지명: `@robinson_ai_systems/vercel-mcp` (비공식이지만 유일하게 작동)
- 환경변수: `VERCEL_TOKEN` (API 토큰)
- Claude Code 재시작 필요

---

## 8. 결론 및 권장 사항

### 현재 상황
- Vercel MCP 연결은 Windows + Claude Code 환경에서 불안정
- 공식/비공식 패키지 모두 연결 실패
- 정확한 원인 파악을 위해 추가 디버깅 필요

### 권장 사항

| 우선순위 | 방안 | 설명 |
|----------|------|------|
| 1 | **Vercel CLI 사용** | 이미 작동 중, 배포 확인 가능 |
| 2 | **패키지 직접 디버깅** | npx 직접 실행으로 에러 메시지 확인 |
| 3 | **Chrome DevTools MCP** | 실제 사이트 기능 테스트 |
| 4 | **GitHub Issue 확인** | 패키지별 알려진 이슈 확인 |

### 다음 단계
1. `npx -y mcp-vercel` 직접 실행하여 에러 메시지 확인
2. 패키지 GitHub 저장소에서 요구 환경변수 확인
3. Windows 환경 관련 이슈 검색
4. 당장은 Vercel CLI로 배포 상태 확인

---

## 7. 참고 자료

- Vercel MCP 공식 문서: https://vercel.com/docs/mcp
- mcp-vercel npm: https://www.npmjs.com/package/mcp-vercel
- Claude Code MCP 문서: https://docs.anthropic.com/claude-code/mcp

---

*v1.0 - 2026-01-06*
