# 390. 아이디 로그인 방식 개발 계획 (Option A)

> 작성일: 2025-12-19
> 목표: 이메일 대신 아이디만 입력하는 로그인 UX

---

## 1. 개요

### 현재 방식
```
이메일: dlgksthf0820@hyeyum.com
비밀번호: ****
```

### 변경 후 방식
```
아이디: dlgksthf0820
비밀번호: ****
```

### 내부 동작
- 사용자 입력: `dlgksthf0820`
- 자동 변환: `dlgksthf0820@hyeyum.com`
- Supabase Auth: 기존 이메일 방식 그대로 유지

---

## 2. 수정 파일

| 파일 | 수정 내용 |
|------|-----------|
| `frontend/src/pages/auth/LoginPage.tsx` | 아이디 입력 → 이메일 변환 |
| `frontend/src/contexts/AuthContext.tsx` | signIn 함수 도메인 자동 추가 (선택) |

---

## 3. 상세 구현

### Phase 1: LoginPage.tsx 수정

#### 3.1 상수 정의
```typescript
// 학원 이메일 도메인
const EMAIL_DOMAIN = '@hyeyum.com';
```

#### 3.2 state 변경
```typescript
// Before
const [email, setEmail] = useState('');

// After
const [username, setUsername] = useState('');
```

#### 3.3 이메일 변환 함수
```typescript
/**
 * 아이디를 이메일로 변환
 * - 이미 @가 포함되어 있으면 그대로 사용 (하위 호환)
 * - 없으면 @hyeyum.com 추가
 */
const toEmail = (input: string): string => {
  if (input.includes('@')) {
    return input; // 이미 이메일 형식
  }
  return `${input}${EMAIL_DOMAIN}`;
};
```

#### 3.4 handleSubmit 수정
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setIsLoading(true);

  try {
    const email = toEmail(username); // 아이디 → 이메일 변환
    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      } else {
        setError(error.message);
      }
      return;
    }

    navigate(from, { replace: true });
  } catch (err) {
    setError('로그인 중 오류가 발생했습니다.');
  } finally {
    setIsLoading(false);
  }
};
```

#### 3.5 UI 변경
```tsx
{/* Before: 이메일 */}
<label htmlFor="email">이메일</label>
<input
  id="email"
  type="email"
  placeholder="email@example.com"
  ...
/>

{/* After: 아이디 */}
<label htmlFor="username">아이디</label>
<input
  id="username"
  type="text"
  placeholder="아이디 입력"
  autoComplete="username"
  ...
/>
```

#### 3.6 아이콘 변경
```tsx
// Before
<span>📧</span>

// After
<span>👤</span>
```

---

## 4. 하위 호환성

| 입력 | 변환 결과 | 설명 |
|------|-----------|------|
| `dlgksthf0820` | `dlgksthf0820@hyeyum.com` | 아이디만 입력 |
| `dlgksthf0820@hyeyum.com` | `dlgksthf0820@hyeyum.com` | 기존 이메일 형식 |
| `admin@other.com` | `admin@other.com` | 외부 이메일 (관리자용) |

---

## 5. 전체 코드 변경

### LoginPage.tsx 수정 부분

```typescript
// 상단에 상수 추가
const EMAIL_DOMAIN = '@hyeyum.com';

// state 변경
const [username, setUsername] = useState('');

// 변환 함수 추가
const toEmail = (input: string): string => {
  if (input.includes('@')) return input;
  return `${input}${EMAIL_DOMAIN}`;
};

// handleSubmit에서 변환 사용
const email = toEmail(username);
const { error } = await signIn(email, password);

// 에러 메시지 변경
setError('아이디 또는 비밀번호가 올바르지 않습니다.');

// input 변경
<label htmlFor="username">아이디</label>
<span>👤</span>
<input
  id="username"
  type="text"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  placeholder="아이디 입력"
  autoComplete="username"
/>

// 버튼 disabled 조건
disabled={isLoading || !username || !password}
```

---

## 6. 테스트 체크리스트

- [ ] `dlgksthf0820` 입력 시 로그인 성공
- [ ] `dlgksthf0820@hyeyum.com` 입력 시 로그인 성공 (하위 호환)
- [ ] 잘못된 아이디 입력 시 적절한 에러 메시지
- [ ] 잘못된 비밀번호 입력 시 적절한 에러 메시지
- [ ] Enter 키로 폼 제출 가능
- [ ] 로그인 후 정상 리다이렉트

---

## 7. 추가 개선 (선택)

### 7.1 비밀번호 표시/숨기기 토글
```tsx
const [showPassword, setShowPassword] = useState(false);

<input type={showPassword ? 'text' : 'password'} />
<button onClick={() => setShowPassword(!showPassword)}>
  {showPassword ? '🙈' : '👁️'}
</button>
```

### 7.2 아이디 저장 (Remember Me)
```tsx
const [rememberMe, setRememberMe] = useState(false);

useEffect(() => {
  const saved = localStorage.getItem('savedUsername');
  if (saved) setUsername(saved);
}, []);

// 로그인 성공 시
if (rememberMe) {
  localStorage.setItem('savedUsername', username);
}
```

---

## 8. 예상 결과

### Before
![이메일 로그인](before.png)
```
📧 이메일: dlgksthf0820@hyeyum.com
```

### After
![아이디 로그인](after.png)
```
👤 아이디: dlgksthf0820
```

---

## 9. 구현 순서

1. **Phase 1**: LoginPage.tsx 수정 (핵심)
2. **Phase 2**: 테스트 및 검증
3. **Phase 3 (선택)**: 비밀번호 토글, 아이디 저장 추가

