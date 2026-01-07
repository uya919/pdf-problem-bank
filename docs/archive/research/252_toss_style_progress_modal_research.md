# 토스 스타일 진도기록 모달 연구 리포트

> 목적: "주제 → 진도 → 숙제"를 한눈에 보여주는 모달을 토스 UX 철학으로 설계

---

## 1. 현재 문제점

### 기존 진도 모달 (스크린샷 분석)

```
┌─────────────────────────────────────┐
│ 📖 지난 수업              12/9 (월) │
│ 베이직쎈 p.42-45                   │
│ 이차방정식 풀이                     │  ← 주제/진도 혼재
└─────────────────────────────────────┘
```

**문제:**
1. **정보 순서 불명확**: 주제인지 진도인지 숙제인지 구분 어려움
2. **숙제 누락**: 지난 숙제 정보가 없음
3. **컨텍스트 부족**: "오늘 뭘 해야 하는지" 파악 어려움

### 사용자 니즈

> "지난번에 뭘 했고, 숙제를 뭘 냈는지 알아야 오늘 수업을 준비할 수 있어요"

**필요한 정보 순서:**
1. 주제 (어떤 단원?)
2. 진도 (교재 어디까지?)
3. 숙제 (뭘 내줬지?)

---

## 2. 토스 UX 철학 적용

### 2.1 핵심 원칙

| 원칙 | 설명 | 적용 방안 |
|------|------|----------|
| **1 Thing / 1 Page** | 한 화면에 하나의 목적 | 지난/오늘 구분 명확히 |
| **Context First** | 왜 해야 하는지 먼저 | 지난 수업 → 오늘 수업 순서 |
| **Minimum Input** | 입력 최소화 | 자동완성, 이전 값 활용 |
| **Progressive Disclosure** | 필요할 때만 보여주기 | 숙제 토글, 메모 접기 |

### 2.2 토스의 정보 계층화

토스는 정보를 **시각적 계층**으로 구분합니다:

```
Level 1: 핵심 정보 (크고 굵게)
Level 2: 보조 정보 (작고 회색)
Level 3: 부가 정보 (접힘 또는 숨김)
```

**진도 모달에 적용:**
- Level 1: 주제 ("이차방정식 풀이")
- Level 2: 진도 ("베이직쎈 p.42-45")
- Level 3: 숙제 ("p.46-48 풀이")

---

## 3. 새로운 정보 구조

### 3.1 지난 수업 카드

```
┌─────────────────────────────────────┐
│  📖 지난 수업                12/9  │
├─────────────────────────────────────┤
│                                     │
│  📚 주제                            │
│  이차방정식 풀이                     │  ← Level 1 (굵게)
│                                     │
│  📄 진도                            │
│  베이직쎈 p.42-45                   │  ← Level 2
│                                     │
│  📝 숙제                            │
│  p.46-48 짝수번호                   │  ← Level 2
│  ✓ 제출 6/8명                       │  ← Level 3 (작게)
│                                     │
└─────────────────────────────────────┘
```

### 3.2 오늘 수업 입력

```
┌─────────────────────────────────────┐
│  ✏️ 오늘 수업               12/10  │
├─────────────────────────────────────┤
│                                     │
│  📚 주제                            │
│  ┌─────────────────────────────────┐│
│  │ 이차방정식 응용            │  ││
│  └─────────────────────────────────┘│
│  💡 지난 주제: 이차방정식 풀이       │
│                                     │
│  📄 진도 (교재 / 페이지)            │
│  ┌───────────┐ ┌──────────────────┐ │
│  │ 베이직쎈 ▼│ │ 46-50           │ │
│  └───────────┘ └──────────────────┘ │
│  💡 지난 진도: p.45까지             │
│                                     │
│  📝 숙제 (교재 / 페이지)    [토글]  │
│  ┌───────────┐ ┌──────────────────┐ │
│  │ 베이직쎈 ▼│ │ 51-53 홀수      │ │
│  └───────────┘ └──────────────────┘ │
│  마감 [다음 수업 ▼]                 │
│                                     │
└─────────────────────────────────────┘
```

---

## 4. 토스 스타일 UI 컴포넌트

### 4.1 정보 카드 (읽기 전용)

**디자인 원칙:**
- 배경: `#F8FAFC` (연한 회색)
- 라벨: `#64748B` (회색, 12px)
- 값: `#1E293B` (진한 회색, 14px, 600)
- 간격: 라벨-값 4px, 항목 간 12px

```css
.info-card {
  background: #F8FAFC;
  border-radius: 12px;
  padding: 16px;
}

.info-row {
  margin-bottom: 12px;
}

.info-label {
  font-size: 12px;
  color: #64748B;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #1E293B;
}

.info-sub {
  font-size: 12px;
  color: #94A3B8;
  margin-top: 2px;
}
```

### 4.2 입력 필드 그룹 (진도/숙제)

**토스 스타일 특징:**
- 교재와 페이지를 **한 줄에 배치**
- 교재: 드롭다운 (40% 너비)
- 페이지: 텍스트 입력 (60% 너비)
- 힌트: 입력 필드 아래 작게

```html
<div class="input-group-row">
  <div class="input-group textbook">
    <select>
      <option>베이직쎈</option>
      <option>개념원리</option>
    </select>
  </div>
  <div class="input-group page">
    <input type="text" placeholder="46-50" />
  </div>
</div>
<div class="input-hint">💡 지난 진도: p.45까지</div>
```

```css
.input-group-row {
  display: flex;
  gap: 8px;
}

.input-group.textbook {
  flex: 0 0 40%;
}

.input-group.page {
  flex: 1;
}

.input-hint {
  font-size: 11px;
  color: #94A3B8;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
```

### 4.3 섹션 라벨

**토스 스타일:**
- 아이콘 + 텍스트
- 작은 폰트 (12px)
- 회색 (#64748B)

```html
<div class="section-label">
  <span class="section-icon">📚</span>
  <span class="section-text">주제</span>
</div>
```

---

## 5. 완성된 모달 레이아웃

### 5.1 전체 구조

```
┌─────────────────────────────────────┐
│ ← 수업 기록                   [✕] │
├─────────────────────────────────────┤
│                                     │
│ ┌─ 지난 수업 카드 ─────────────────┐│
│ │                                 ││
│ │  📚 주제                        ││
│ │  이차방정식 풀이                 ││
│ │                                 ││
│ │  📄 진도                        ││
│ │  베이직쎈 p.42-45               ││
│ │                                 ││
│ │  📝 숙제                        ││
│ │  p.46-48 짝수번호 (제출 6/8)    ││
│ │                                 ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─ 오늘 수업 입력 ─────────────────┐│
│ │                                 ││
│ │  📚 주제                        ││
│ │  [이차방정식 응용        ]      ││
│ │  💡 지난: 이차방정식 풀이        ││
│ │                                 ││
│ │  📄 진도                        ││
│ │  [베이직쎈▼] [46-50      ]      ││
│ │  💡 지난: p.45까지               ││
│ │                                 ││
│ │  📝 숙제 내기           [ON]    ││
│ │  [베이직쎈▼] [51-53 홀수 ]      ││
│ │  마감 [다음 수업▼]              ││
│ │                                 ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │         저장하기                 ││
│ └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

### 5.2 토스 스타일 상세

| 요소 | 토스 스타일 |
|------|-------------|
| **모달 헤더** | "수업 기록" (간결하게) |
| **지난 수업** | 회색 배경 카드, 아이콘+라벨+값 |
| **오늘 수업** | 흰색 배경, 입력 필드 |
| **힌트** | 💡 아이콘 + 연한 회색 |
| **저장 버튼** | 파란색 (#3182F6), 큰 터치 영역 |

---

## 6. 인터랙션 상세

### 6.1 자동완성 로직

**교재 자동 선택:**
```javascript
// 지난 진도의 교재가 있으면 자동 선택
const defaultTextbook = lastProgress?.textbook || frequentTextbooks[0];
```

**페이지 자동 제안:**
```javascript
// 지난 페이지 + 1부터 시작
function suggestNextPage(lastPages) {
  const match = lastPages.match(/-(\d+)$/);
  return match ? `${parseInt(match[1]) + 1}-` : '';
}
// "p.42-45" → placeholder "46-"
```

**숙제 자동완성:**
```javascript
// 오늘 진도 기반 숙제 제안
function suggestHomework(todayProgress) {
  return `${todayProgress.pages} 풀이`;
}
// 진도 "46-50" → 숙제 "46-50 풀이"
```

### 6.2 유효성 검사 (토스 스타일)

토스는 **실시간 유효성 검사**를 사용:

```javascript
// 입력 시 즉시 피드백
<input
  onChange={(e) => {
    const isValid = validatePages(e.target.value);
    setError(!isValid ? '페이지 형식: 42-45' : null);
  }}
/>
```

**에러 메시지 스타일:**
- 빨간색 (#F04452)
- 입력 필드 아래
- 간결하게 (예: "페이지를 입력해 주세요")

### 6.3 숙제 토글

```javascript
// 토글 OFF → 숙제 입력 숨김
// 토글 ON → 숙제 입력 표시 + 자동완성

const [showHomework, setShowHomework] = useState(true);

<div className="homework-toggle" onClick={() => setShowHomework(!showHomework)}>
  <span>📝 숙제 내기</span>
  <Toggle checked={showHomework} />
</div>

{showHomework && (
  <div className="homework-fields">
    <InputRow textbook={textbook} page={homeworkPage} />
    <Select label="마감" options={['다음 수업', '3일 후', '1주일 후']} />
  </div>
)}
```

---

## 7. 애니메이션

### 7.1 토스 스타일 모션

| 요소 | 애니메이션 |
|------|------------|
| 모달 진입 | slide-up (0.3s, ease-out) |
| 숙제 토글 | expand/collapse (0.2s) |
| 힌트 표시 | fade-in (0.15s) |
| 저장 성공 | checkmark + fade-out |

### 7.2 Rally 스펙 (토스 인터랙션 라이브러리)

```javascript
// 토스의 Rally 라이브러리 참고
const modalAnimation = {
  initial: { y: '100%' },
  animate: { y: 0 },
  transition: {
    type: 'spring',
    damping: 30,
    stiffness: 300
  }
};
```

---

## 8. 접근성 & 모바일 최적화

### 8.1 터치 영역

- 모든 버튼: 최소 44×44px
- 입력 필드: 48px 높이
- 토글: 44×24px

### 8.2 키보드 최적화

| 입력 필드 | 키보드 타입 |
|-----------|-------------|
| 주제 | 일반 텍스트 |
| 페이지 | 숫자+하이픈 (`inputmode="text"`) |
| 숙제 | 일반 텍스트 |

### 8.3 스크롤 처리

- 모달 내부 스크롤 가능
- 키보드 올라올 때 입력 필드 자동 스크롤
- 버튼 항상 하단 고정 (sticky)

---

## 9. 구현 코드 예시

### 9.1 지난 수업 카드 컴포넌트

```tsx
function PastClassCard({ data }: { data: PastProgress }) {
  return (
    <div className="past-card">
      <div className="past-header">
        <span className="past-icon">📖</span>
        <span className="past-title">지난 수업</span>
        <span className="past-date">{formatDate(data.date)}</span>
      </div>

      <div className="past-content">
        <InfoRow icon="📚" label="주제" value={data.topic} />
        <InfoRow icon="📄" label="진도" value={`${data.textbook} p.${data.pages}`} />
        <InfoRow
          icon="📝"
          label="숙제"
          value={data.homework?.title}
          sub={`제출 ${data.homework?.submitted}/${data.homework?.total}명`}
        />
      </div>
    </div>
  );
}
```

### 9.2 오늘 수업 입력 컴포넌트

```tsx
function TodayClassForm({ lastData, textbooks, onSave }) {
  const [topic, setTopic] = useState('');
  const [textbook, setTextbook] = useState(lastData?.textbook || textbooks[0]);
  const [pages, setPages] = useState('');
  const [showHomework, setShowHomework] = useState(true);
  const [homeworkPages, setHomeworkPages] = useState('');

  const suggestedPage = suggestNextPage(lastData?.pages);

  return (
    <div className="today-form">
      <div className="form-section-title">
        <span>✏️</span>
        <span>오늘 수업</span>
      </div>

      {/* 주제 */}
      <InputField
        icon="📚"
        label="주제"
        value={topic}
        onChange={setTopic}
        hint={`지난: ${lastData?.topic}`}
      />

      {/* 진도 */}
      <InputRow
        icon="📄"
        label="진도"
        textbook={textbook}
        textbooks={textbooks}
        onTextbookChange={setTextbook}
        pages={pages}
        onPagesChange={setPages}
        placeholder={suggestedPage}
        hint={`지난: p.${lastData?.pages?.split('-')[1]}까지`}
      />

      {/* 숙제 토글 */}
      <ToggleSection
        icon="📝"
        label="숙제 내기"
        checked={showHomework}
        onChange={setShowHomework}
      >
        <InputRow
          textbook={textbook}
          textbooks={textbooks}
          pages={homeworkPages}
          onPagesChange={setHomeworkPages}
          placeholder={`${pages} 풀이`}
        />
        <Select
          label="마감"
          options={['다음 수업', '3일 후', '1주일 후']}
        />
      </ToggleSection>

      <Button onClick={onSave} fullWidth>
        저장하기
      </Button>
    </div>
  );
}
```

---

## 10. 기대 효과

### 10.1 사용성 개선

| 지표 | 기존 | 개선 |
|------|------|------|
| 입력 시간 | 60초 | 30초 |
| 컨텍스트 확인 | 별도 페이지 | 모달에서 바로 |
| 숙제 누락률 | 높음 | 토글로 알림 |
| 입력 오류 | 빈번 | 자동완성으로 감소 |

### 10.2 토스 철학 실현

1. **1 Thing / 1 Page**: 수업 기록이라는 하나의 목적
2. **Context First**: 지난 수업 → 오늘 수업 순서
3. **Minimum Input**: 자동완성, 드롭다운, 힌트
4. **Progressive Disclosure**: 숙제 토글

---

## 참고 자료

- [토스 가입 화면 디자인](https://toss.tech/article/toss-signup-process) - 1 Thing / 1 Page 철학
- [토스 UX Writing](https://brunch.co.kr/@chicchoc24/18) - 컨텍스트 제공
- [Progressive Disclosure - NN/g](https://www.nngroup.com/articles/progressive-disclosure/) - 점진적 노출
- [Mobile Form Best Practices](https://www.marketingscoop.com/marketing/the-ultimate-guide-to-mobile-form-design-17-best-practices-for-2024/) - 모바일 폼 디자인

---

## 11. 에러 상태 및 엣지케이스

### 11.1 유효성 검사 에러

**토스 스타일 에러 표시:**
- 입력 필드 테두리: `#F04452` (빨간색)
- 에러 메시지: 필드 바로 아래, 12px, 빨간색
- 흔들림 애니메이션: 0.3s

```
┌─────────────────────────────────────┐
│  📄 진도                            │
│  ┌───────────┐ ┌──────────────────┐ │
│  │ 베이직쎈 ▼│ │                  │ │  ← 빨간 테두리
│  └───────────┘ └──────────────────┘ │
│  ⚠️ 페이지를 입력해 주세요            │  ← 에러 메시지
└─────────────────────────────────────┘
```

**에러 메시지 문구 (토스 스타일):**
| 상황 | 메시지 |
|------|--------|
| 빈 필드 | "페이지를 입력해 주세요" |
| 잘못된 형식 | "페이지 형식: 42-45" |
| 범위 오류 | "시작 페이지가 끝 페이지보다 클 수 없어요" |

### 11.2 엣지케이스 처리

#### Case 1: 첫 수업 (지난 진도 없음)
```
┌─────────────────────────────────────┐
│  📖 지난 수업                       │
│  ┌─────────────────────────────────┐│
│  │  🎉 첫 수업이에요!               ││
│  │  오늘 진도를 기록해 주세요.       ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### Case 2: 숙제 미제출자 있음
```
숙제 제출 현황:
✓ 제출 6/8명
├─ 미제출: 김민수, 이서연
└─ [미제출자 알림 보내기]
```

#### Case 3: 오프라인 상태
```
┌─────────────────────────────────────┐
│  📶 인터넷 연결이 필요해요          │
│  연결 후 다시 시도해 주세요.        │
│  [다시 시도]                        │
└─────────────────────────────────────┘
```

### 11.3 로딩 상태

**스켈레톤 UI (토스 스타일):**
```css
.skeleton {
  background: linear-gradient(
    90deg,
    #F2F4F6 25%,
    #E5E8EB 50%,
    #F2F4F6 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**저장 중 버튼:**
```
┌─────────────────────────────────────┐
│  ⟳ 저장 중...                       │  ← 스피너 + 텍스트
└─────────────────────────────────────┘
```

---

## 12. 시험 점수 기록 확장

### 12.1 Daily-test 기록 모달

```
┌─────────────────────────────────────┐
│ ← Daily-test 점수 입력        [✕]  │
├─────────────────────────────────────┤
│                                     │
│  📅 2025년 12월 10일 (화)           │
│  중3A반 | 이차방정식 풀이            │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 김민수        [  85  ] / 100   ││
│  │ 이서연        [  92  ] / 100   ││
│  │ 박지훈        [  78  ] / 100   ││
│  │ 최유진        [     ] / 100   ││  ← 미입력
│  │ 정하늘        [  88  ] / 100   ││
│  │ 강도윤        [  95  ] / 100   ││
│  │ 윤서아        [     ] / 100   ││  ← 미입력
│  │ 한지우        [  82  ] / 100   ││
│  └─────────────────────────────────┘│
│                                     │
│  💡 평균: 86.7점 | 입력: 6/8명      │
│                                     │
│  ┌─────────────────────────────────┐│
│  │         저장하기                 ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 12.2 점수 입력 최적화

**숫자 키패드:**
```javascript
<input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
  maxLength={3}
/>
```

**자동 이동:**
- 점수 입력 완료 (3자리) → 다음 학생으로 포커스 이동
- Enter 키 → 다음 학생

**빠른 입력:**
- "결" 입력 → 결석 처리
- "0" 입력 → 0점 (응시했지만 0점)

### 12.3 통계 위젯

```
┌─────────────────────────────────────┐
│  📊 Daily-test 통계                 │
├─────────────────────────────────────┤
│  평균: 86.7점  최고: 95점  최저: 78점│
│                                     │
│  분포:                              │
│  90+ ████████ 25%                   │
│  80+ ████████████████ 50%           │
│  70+ ████████ 25%                   │
│  ~70                                │
└─────────────────────────────────────┘
```

---

## 13. 숙제 제출 확인 UI

### 13.1 숙제 목록 화면

```
┌─────────────────────────────────────┐
│ ← 숙제 관리                    [+]  │
├─────────────────────────────────────┤
│                                     │
│  📝 진행 중인 숙제                  │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ p.46-48 짝수번호                ││
│  │ 베이직쎈 | 마감: 12/12           ││
│  │ ████████░░░░░░░░ 6/8 제출       ││
│  │                    [확인하기 →] ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ p.51-53 홀수                    ││
│  │ 베이직쎈 | 마감: 12/14           ││
│  │ ░░░░░░░░░░░░░░░░ 0/8 제출       ││
│  │                    [확인하기 →] ││
│  └─────────────────────────────────┘│
│                                     │
│  📋 완료된 숙제                     │
│  ├ p.42-45 전체 (12/5)             │
│  └ p.38-41 홀수 (12/3)             │
│                                     │
└─────────────────────────────────────┘
```

### 13.2 제출 확인 상세

```
┌─────────────────────────────────────┐
│ ← p.46-48 짝수번호            [⋯]  │
├─────────────────────────────────────┤
│                                     │
│  마감: 12월 12일 (목) | D-2         │
│  ████████████░░░░ 6/8 제출          │
│                                     │
│  ✓ 제출 완료                        │
│  ┌─────────────────────────────────┐│
│  │ ✓ 김민수   12/10 14:30          ││
│  │ ✓ 이서연   12/10 15:45          ││
│  │ ✓ 박지훈   12/10 16:20          ││
│  │ ✓ 최유진   12/10 17:00          ││
│  │ ✓ 정하늘   12/10 18:30          ││
│  │ ✓ 한지우   12/10 19:15          ││
│  └─────────────────────────────────┘│
│                                     │
│  ⏳ 미제출 (2명)                    │
│  ┌─────────────────────────────────┐│
│  │ 🔔 강도윤                  [알림]││
│  │ 🔔 윤서아                  [알림]││
│  └─────────────────────────────────┘│
│                                     │
│  [전체 알림 보내기]                 │
│                                     │
└─────────────────────────────────────┘
```

### 13.3 빠른 제출 체크

**스와이프 제스처:**
- 왼쪽 스와이프 → 미제출 처리
- 오른쪽 스와이프 → 제출 완료

**일괄 처리:**
```
[전체 제출] [전체 미제출] [초기화]
```

---

## 14. 반응형 디자인

### 14.1 Mobile (< 480px)
- 풀스크린 모달 (bottom sheet)
- 한 손 조작 최적화
- 큰 터치 타겟 (48px)

### 14.2 Tablet (480-1023px)
- 중앙 정렬 모달 (max-width: 480px)
- 좌측에 학생 목록 (점수 입력 시)
- 키보드 단축키 지원

### 14.3 Desktop (1024px+)
- 사이드 패널 또는 중앙 모달
- 마우스 호버 효과
- 탭 키 네비게이션

---

## 15. 목업 파일

인터랙티브 HTML 목업이 생성되었습니다:

📁 [progress-modal-toss.html](mockups/progress-modal-toss.html)

**포함 기능:**
- 지난 수업 카드 (읽기 전용)
- 오늘 수업 입력 폼
- 숙제 토글 (Progressive Disclosure)
- 저장 성공 애니메이션
- 토스 컬러 시스템

---

## 16. 다음 단계

### 즉시 구현 가능
1. `ProgressModal.tsx` 컴포넌트 생성
2. `useProgressForm` 커스텀 훅
3. 기존 hyeyum API 연동

### 추가 연구 필요
1. 학생별 특이사항 기록 모달
2. 월간 리포트 화면
3. 학부모 공유 기능

---

*작성일: 2025-12-10*
*업데이트: 2025-12-10 (에러 상태, 시험 점수, 숙제 확인 UI 추가)*
