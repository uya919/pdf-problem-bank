# 기술적 안전장치 구현 계획

> Claude가 기존 코드를 복사하지 못하도록 하는 실제 구현 가능한 장치들

**작성일**: 2025-12-10

---

## 1. 구현 가능한 장치 목록

| 장치 | 효과 | 구현 난이도 |
|------|------|------------|
| **Claude 폴더 차단** | hyeyum 폴더 읽기 금지 | ⭐ 쉬움 |
| **ESLint 금지 규칙** | bg-blue-500 사용 시 에러 | ⭐⭐ 보통 |
| **TypeScript 타입 강제** | 토큰만 사용 가능 | ⭐⭐ 보통 |
| **빌드 전 검증 스크립트** | 금지 패턴 검출 | ⭐ 쉬움 |
| **Git Hook** | 커밋 전 자동 검사 | ⭐⭐ 보통 |

---

## 2. 장치 1: Claude 폴더 접근 차단

### 구현: `.claude/settings.local.json`

```json
{
  "permissions": {
    "deny": [
      "Read(**/hyeyum/**)",
      "Read(**/hyeyum-v2/**)",
      "Read(**/hyeyum-v3/**)",
      "Glob(**/hyeyum/**)",
      "Grep(**/hyeyum/**)"
    ]
  }
}
```

### 효과
- Claude가 hyeyum 폴더의 파일을 읽으려 하면 **차단됨**
- Glob, Grep 검색도 차단

---

## 3. 장치 2: ESLint 금지 규칙

### 구현: `eslint.config.js`

```javascript
// eslint.config.js
export default [
  {
    rules: {
      // 커스텀 규칙: 금지된 Tailwind 클래스 검출
      'no-restricted-syntax': [
        'error',
        {
          // bg-blue-500, bg-blue-600 등 금지
          selector: 'Literal[value=/bg-blue-[0-9]+/]',
          message: '❌ bg-blue-* 금지! bg-[#3182F6] 사용하세요.'
        },
        {
          // text-blue-500 금지
          selector: 'Literal[value=/text-blue-[0-9]+/]',
          message: '❌ text-blue-* 금지! text-[#3182F6] 사용하세요.'
        },
        {
          // border-blue-500 금지
          selector: 'Literal[value=/border-blue-[0-9]+/]',
          message: '❌ border-blue-* 금지! border-[#3182F6] 사용하세요.'
        }
      ]
    }
  }
];
```

### 더 강력한 방법: eslint-plugin-tailwindcss 커스텀

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['tailwindcss'],
  rules: {
    'tailwindcss/no-custom-classname': ['warn', {
      // 허용된 클래스만 사용 가능
      whitelist: [
        'bg-\\[#3182F6\\]',
        'bg-\\[#1B64DA\\]',
        'bg-\\[#F2F6FC\\]',
        'bg-\\[#E8F5E9\\]',
        'bg-\\[#E3F2FD\\]',
        'bg-\\[#FFF3E0\\]',
        'bg-white\\/20',
        'bg-gradient-to-br',
        'from-\\[#3182F6\\]',
        'to-\\[#2563eb\\]',
      ]
    }]
  }
};
```

---

## 4. 장치 3: TypeScript 타입 강제

### 구현: `src/components/design-system/tokens.ts`

```typescript
// 색상 토큰 - 이 값만 사용 가능
export const COLORS = {
  primary: '#3182F6',
  primaryDark: '#1B64DA',
  primaryLight: '#F2F6FC',
  white: '#FFFFFF',
  black: '#191F28',
  gray50: '#F9FAFB',
  gray100: '#F2F4F6',
  gray200: '#E5E8EB',
  gray300: '#B0B8C1',
  gray400: '#8B95A1',
  gray500: '#6B7684',
  gray600: '#4E5968',
  gray700: '#333D4B',
  gray900: '#191F28',
  green: '#00C896',
  red: '#F04452',
  orange: '#FF9800',
} as const;

// 타입으로 강제
export type ColorKey = keyof typeof COLORS;
export type ColorValue = typeof COLORS[ColorKey];

// 아이콘 배경색
export const ICON_BG = {
  attendance: '#E8F5E9',
  progress: '#E3F2FD',
  homework: '#FFF3E0',
  schedule: '#F3E5F5',
} as const;

// Tailwind 클래스 - 복사해서 사용
export const TW = {
  // 그라디언트
  heroGradient: 'bg-gradient-to-br from-[#3182F6] to-[#2563eb]',

  // 버튼
  btnPrimary: 'h-10 px-4 bg-white text-[#3182F6] font-semibold rounded-xl',
  btnSecondary: 'h-10 px-4 bg-white/20 text-white font-semibold rounded-xl',
  btnCta: 'h-12 w-full bg-[#3182F6] text-white font-semibold rounded-xl',

  // 입력
  input: 'h-10 px-3 border border-gray-200 rounded-lg text-sm focus:border-[#3182F6] focus:outline-none',

  // 카드
  card: 'bg-white rounded-2xl shadow-sm',

  // 아이콘 박스
  iconBox: 'w-9 h-9 rounded-[10px] flex items-center justify-center',
  iconAttendance: 'w-9 h-9 rounded-[10px] bg-[#E8F5E9] flex items-center justify-center',
  iconProgress: 'w-9 h-9 rounded-[10px] bg-[#E3F2FD] flex items-center justify-center',
  iconHomework: 'w-9 h-9 rounded-[10px] bg-[#FFF3E0] flex items-center justify-center',
} as const;

// 사용 예시
// import { TW } from '@/components/design-system/tokens';
// <div className={TW.heroGradient}>...</div>
// <button className={TW.btnPrimary}>버튼</button>
```

### 컴포넌트에서 강제 사용

```typescript
// src/components/design-system/Button.tsx
import { TW } from './tokens';

type ButtonVariant = 'primary' | 'secondary' | 'cta';

interface ButtonProps {
  variant: ButtonVariant;
  children: React.ReactNode;
  onClick?: () => void;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: TW.btnPrimary,
  secondary: TW.btnSecondary,
  cta: TW.btnCta,
};

export function Button({ variant, children, onClick }: ButtonProps) {
  return (
    <button className={variantStyles[variant]} onClick={onClick}>
      {children}
    </button>
  );
}

// 사용법: <Button variant="primary">확인</Button>
// ❌ className prop 없음 → 임의 스타일 불가
```

---

## 5. 장치 4: 빌드 전 검증 스크립트

### 구현: `scripts/validate-design.ts`

```typescript
// scripts/validate-design.ts
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const FORBIDDEN_PATTERNS = [
  /bg-blue-[0-9]+/g,
  /text-blue-[0-9]+/g,
  /border-blue-[0-9]+/g,
  /bg-gray-[0-9]+/g,  // gray도 우리 토큰 사용
  /rounded-md/g,       // 작은 radius 금지
  /rounded-sm/g,
];

const REQUIRED_PATTERNS = {
  'HeroCard': /bg-gradient-to-br/,
  'Button.*primary': /bg-white.*text-\[#3182F6\]/,
};

async function validate() {
  const files = await glob('src/**/*.tsx');
  let errors: string[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');

    // 금지 패턴 검사
    for (const pattern of FORBIDDEN_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        errors.push(`❌ ${file}: 금지된 패턴 "${matches[0]}" 발견`);
      }
    }

    // hyeyum import 검사
    if (content.includes('hyeyum')) {
      errors.push(`❌ ${file}: "hyeyum" 참조 발견!`);
    }
  }

  if (errors.length > 0) {
    console.error('\n🚫 디자인 검증 실패!\n');
    errors.forEach(e => console.error(e));
    console.error('\n허용된 색상: #3182F6, #1B64DA, #F2F6FC');
    console.error('사용법: import { TW } from "@/components/design-system/tokens"\n');
    process.exit(1);
  }

  console.log('✅ 디자인 검증 통과!');
}

validate();
```

### package.json에 추가

```json
{
  "scripts": {
    "validate": "tsx scripts/validate-design.ts",
    "prebuild": "npm run validate",
    "build": "next build"
  }
}
```

### 효과
- `npm run build` 실행 시 자동으로 검증
- 금지 패턴 있으면 빌드 실패
- 어떤 파일, 어떤 패턴인지 알려줌

---

## 6. 장치 5: Git Pre-commit Hook

### 구현: `.husky/pre-commit`

```bash
#!/bin/sh

echo "🔍 디자인 규칙 검사 중..."

# 금지 패턴 검사
FORBIDDEN=$(grep -r -l "bg-blue-[0-9]" src/ 2>/dev/null || true)
if [ -n "$FORBIDDEN" ]; then
  echo "❌ 금지된 패턴 발견: bg-blue-*"
  echo "파일: $FORBIDDEN"
  echo "→ bg-[#3182F6] 사용하세요"
  exit 1
fi

# hyeyum 참조 검사
HYEYUM_REF=$(grep -r -l "hyeyum" src/ 2>/dev/null || true)
if [ -n "$HYEYUM_REF" ]; then
  echo "❌ hyeyum 참조 발견!"
  echo "파일: $HYEYUM_REF"
  exit 1
fi

echo "✅ 검사 통과!"
```

---

## 7. 종합: 다층 방어 체계

```
┌─────────────────────────────────────────────────────┐
│                    개발 시작                          │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  🛡️ 장치 1: Claude 폴더 차단                         │
│  - hyeyum 폴더 읽기 시도 → 차단                      │
│  - "권한이 없습니다" 메시지                           │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  🛡️ 장치 2: TypeScript 타입 강제                     │
│  - TW.btnPrimary 같은 토큰만 사용 가능               │
│  - 임의 className 작성 시 타입 에러                   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  🛡️ 장치 3: ESLint 실시간 검사                       │
│  - bg-blue-500 작성 → 빨간 밑줄 + 에러 메시지        │
│  - IDE에서 바로 확인 가능                            │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  🛡️ 장치 4: 빌드 전 검증                             │
│  - npm run build → validate 자동 실행               │
│  - 금지 패턴 있으면 빌드 실패                        │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  🛡️ 장치 5: Git Hook                                │
│  - 커밋 시도 → 자동 검사                            │
│  - 위반 시 커밋 차단                                │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    ✅ 안전하게 배포                    │
└─────────────────────────────────────────────────────┘
```

---

## 8. 즉시 적용 가능한 것

### 지금 바로 적용: Claude 폴더 차단

```json
// .claude/settings.local.json의 deny 배열에 추가
{
  "permissions": {
    "deny": [
      "Read(**/hyeyum/**)",
      "Read(**/hyeyum-v2/**)",
      "Read(**/hyeyum-v3/**)",
      "Glob(**/hyeyum/**)",
      "Grep(**/hyeyum/**)"
    ]
  }
}
```

### 프로젝트 초기화 후 적용
1. ESLint 금지 규칙
2. TypeScript 토큰 강제
3. 빌드 전 검증 스크립트
4. Git Hook

---

## 9. 결론

| 장치 | 언제 작동 | 효과 |
|------|----------|------|
| Claude 폴더 차단 | 코드 읽기 시도 시 | hyeyum 참조 원천 차단 |
| ESLint | 코드 작성 중 | 실시간 경고 |
| TypeScript | 코드 작성 중 | 타입 에러로 강제 |
| 빌드 검증 | npm run build | 빌드 실패 |
| Git Hook | git commit | 커밋 차단 |

**5중 방어**로 기존 코드 복사를 방지할 수 있어요.

---

*작성: Claude Code | 2025-12-10*
