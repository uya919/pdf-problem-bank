# Vercel MCP 연결 연구계획

## 현재 상태

| 항목 | 상태 |
|------|------|
| MCP 서버 | `vercel: npx -y @vercel/mcp` |
| 연결 상태 | ❌ Failed to connect |
| 다른 MCP | ✅ supabase, railway, context7 등 정상 |

---

## 문제 원인 분석

### 1. 로컬 패키지 vs 원격 MCP

현재 설정:
```
npx -y @vercel/mcp
```

**문제점**: `@vercel/mcp`는 **로컬 실행용 CLI 도구**가 아니라 **원격 MCP 서버**입니다.

### 2. Vercel MCP 공식 방식

Vercel MCP는 다른 MCP와 다르게 **원격 서버(Remote MCP)** 방식을 사용합니다:

| MCP 유형 | 예시 | 연결 방식 |
|----------|------|----------|
| 로컬 MCP | supabase, railway | `npx -y @package/mcp` |
| **원격 MCP** | **vercel** | `https://mcp.vercel.com` |

---

## 해결 방안

### 방안 1: 원격 MCP URL 사용 (권장)

Vercel 공식 MCP 엔드포인트:
```
https://mcp.vercel.com
```

프로젝트별 엔드포인트 (더 정확한 컨텍스트):
```
https://mcp.vercel.com/teams/{team-slug}/projects/{project-slug}
```

### 방안 2: Claude Code 설정 방법

Claude Code에서 원격 MCP 추가:

```bash
# 기존 실패한 vercel MCP 제거
claude mcp remove vercel

# 원격 MCP로 추가 (HTTP transport)
claude mcp add vercel --transport http --url https://mcp.vercel.com
```

또는 수동으로 `.claude.json` 또는 `.mcp.json` 수정:

```json
{
  "mcpServers": {
    "vercel": {
      "url": "https://mcp.vercel.com",
      "transport": "http"
    }
  }
}
```

### 방안 3: 비공식 로컬 MCP 패키지 사용

GitHub에 비공식 로컬 Vercel MCP가 있음:
- [nganiet/mcp-vercel](https://github.com/nganiet/mcp-vercel)
- [Quegenx/vercel-mcp-server](https://github.com/Quegenx/vercel-mcp-server)

```bash
claude mcp add vercel -- npx -y mcp-vercel
```

**단점**: 비공식이므로 Vercel API 토큰 직접 설정 필요

---

## 설정 단계별 계획

### Phase 1: 기존 설정 제거

```bash
claude mcp remove vercel -s user
claude mcp remove vercel -s project
```

### Phase 2: 원격 MCP 방식 시도

```bash
# HTTP transport로 원격 MCP 추가
claude mcp add vercel --transport http --url https://mcp.vercel.com
```

### Phase 3: OAuth 인증

원격 Vercel MCP는 **OAuth 인증**이 필요합니다:
1. 최초 연결 시 브라우저에서 Vercel 로그인
2. 권한 승인 (consent screen)
3. 토큰 자동 저장

### Phase 4: 연결 테스트

```bash
claude mcp list
```

---

## 대안: Vercel CLI 직접 사용

MCP 연결이 어려우면 Vercel CLI로 배포 상태 확인 가능:

```bash
# 로그인
vercel login

# 배포 목록
vercel list

# 최근 배포 상태
vercel inspect <deployment-url>
```

---

## 참고 자료

- [Vercel MCP 공식 문서](https://vercel.com/docs/mcp/vercel-mcp)
- [Vercel MCP 소개 블로그](https://vercel.com/blog/introducing-vercel-mcp-connect-vercel-to-your-ai-tools)
- [MCP 서버 Vercel 배포 가이드](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)

---

## 예상 결과

| 방안 | 성공 가능성 | 비고 |
|------|-------------|------|
| 원격 MCP (공식) | 높음 | OAuth 인증 필요 |
| 비공식 로컬 MCP | 중간 | API 토큰 설정 필요 |
| Vercel CLI | 높음 | MCP 아님, 수동 명령 |

---

## 추천 진행 순서

1. **원격 MCP 방식 시도** (공식, 가장 안정적)
2. 실패 시 **비공식 로컬 MCP** 시도
3. 그래도 안 되면 **Vercel CLI** 사용
