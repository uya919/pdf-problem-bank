# 로그인 RLS 에러 리포트

> 작성일: 2025-12-17
> 상태: 분석 완료 → 수정 필요

---

## 1. 에러 현상

### 증상
- 로그인 시 500 에러 발생
- `profiles` 테이블 조회 실패
- Auth state는 `SIGNED_IN`으로 변경되지만 프로필 조회 실패

### 콘솔 로그
```
Auth state changed: SIGNED_IN
Failed to load resource: the server responded with a status of 500 ()
프로필 조회 실패: Object
```

### 요청 URL
```
/rest/v1/profiles?select=*&id=eq.dde48d24-8627-4458-a0ca-353bc049689a
```

---

## 2. 원인 분석

### RLS 정책 확인 결과

| 정책 이름 | 명령 | 조건 |
|-----------|------|------|
| Users can view own profile | SELECT | `auth.uid() = id` |
| **Admins can view all profiles** | SELECT | `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))` |

### 문제점: **재귀 RLS (Recursive RLS)**

```
사용자가 profiles 조회 요청
  ↓
RLS 정책 "Admins can view all profiles" 평가
  ↓
profiles 테이블에서 현재 사용자 role 확인 (서브쿼리)
  ↓
다시 RLS 정책 평가 필요 ← 무한 재귀!
  ↓
500 Internal Server Error
```

**Admins can view all profiles** 정책이 `profiles` 테이블 자체를 참조하여 재귀 호출이 발생합니다.

---

## 3. 해결 방안

### 방안 1: SECURITY DEFINER 함수 사용 (권장)

```sql
-- 1. 사용자 role을 반환하는 함수 생성 (RLS 우회)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$;

-- 2. 기존 정책 삭제
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- 3. 새 정책 생성 (함수 사용)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'owner')
  );
```

### 방안 2: auth.jwt()에서 role 확인

```sql
-- JWT claims에서 role 확인 (profiles 테이블 참조 안함)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    (auth.jwt() ->> 'role')::text IN ('admin', 'owner')
  );
```

**단점**: JWT에 role이 포함되어 있어야 함 (별도 설정 필요)

### 방안 3: 본인 프로필만 조회 허용 (간단)

```sql
-- Admin 정책 삭제 (본인 프로필만 조회)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
```

**단점**: 관리자도 다른 사용자 프로필 조회 불가

---

## 4. 권장 해결책

**방안 1 (SECURITY DEFINER 함수)** 적용

```sql
-- Step 1: 함수 생성
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = user_id;
$$;

-- Step 2: 기존 SELECT 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Step 3: 새 SELECT 정책 생성
-- 본인 프로필은 항상 조회 가능
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admin/Owner는 모든 프로필 조회 가능 (함수 사용으로 재귀 방지)
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'owner')
  );

-- Step 4: UPDATE 정책도 동일하게 수정
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'owner')
  );
```

---

## 5. 적용 후 테스트

1. 로그인 테스트 (owner 계정)
2. 프로필 조회 확인
3. `/admin/users` 페이지에서 사용자 목록 조회

---

## 6. 참고

- Supabase RLS 재귀 문제: https://supabase.com/docs/guides/auth/row-level-security
- SECURITY DEFINER 함수: RLS를 우회하여 실행됨

---

*작성: Claude Code*
