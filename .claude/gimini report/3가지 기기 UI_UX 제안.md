# **멀티 플랫폼 교육 애플리케이션을 위한 적응형 UI/UX 설계 및 Claude Code 기반 개발 전략 심층 보고서**

## **1\. 서론: 옴니채널 학습 환경의 진화와 개발 패러다임의 전환**

### **1.1. 디지털 학습 경험의 파편화와 통합의 필요성**

현대의 디지털 교육 환경은 단일 기기의 경계를 넘어섰다. 학습자들은 하루라는 시간 속에서 다양한 맥락(Context)을 오가며 여러 디바이스를 유기적으로 활용한다. 등하굣길의 흔들리는 버스 안에서는 스마트폰을 통해 짧은 퀴즈를 풀거나 학습 현황을 확인하고(Micro-learning), 학교나 도서관 같은 정적인 환경에서는 태블릿을 활용해 강의 영상을 시청하며 스타일러스 펜으로 필기를 수행한다(Active Learning). 그리고 가정이나 연구실의 데스크탑 환경에서는 복잡한 데이터를 분석하거나 긴 호흡의 작문 및 심화 학습을 수행한다(Deep Work). 이러한 '옴니채널(Omni-channel)' 학습 환경에서 사용자 경험(UX)의 핵심은 기기 간의 단절 없는 연결성(Seamlessness)과 각 기기의 물리적 특성에 최적화된 인터페이스(Interface)를 제공하는 데 있다.

본 보고서는 핸드폰(Mobile), 태블릿(Tablet), PC(Desktop)라는 세 가지 상이한 폼팩터를 아우르는 효율적이고 일관된 UI/UX 설계 전략을 심층적으로 분석한다. 특히, 단순히 화면의 크기만을 고려하는 반응형 웹(Responsive Web)의 개념을 넘어, 각 기기가 학습 여정(Learning Journey)에서 담당하는 역할과 사용자의 인지적 부하(Cognitive Load)를 고려한 '적응형 사용자 경험(Adaptive UX)'을 제안한다.

### **1.2. AI 에이전트(Claude Code)를 활용한 개발 프로세스의 혁신**

전통적인 프론트엔드 개발 프로세스에서 3가지 플랫폼을 동시에 지원하는 UI를 구축하는 것은 막대한 리소스가 소요되는 작업이었다. 각기 다른 해상도, 입력 방식(터치 vs 마우스 vs 펜), 그리고 운영체제의 제약 사항을 모두 코드로 구현해야 하기 때문이다. 그러나 귀하께서 도입하고자 하는 **Claude Code**와 같은 AI 코딩 에이전트는 이러한 개발 패러다임을 근본적으로 변화시키고 있다.1

Claude Code는 단순한 코드 자동 완성을 넘어, 프로젝트의 전체 맥락을 이해하고 아키텍처 수준의 리팩토링과 테스트 주도 개발(TDD)을 수행할 수 있는 강력한 CLI(Command Line Interface) 도구이다. 본 보고서에서는 UI/UX 설계 원칙뿐만 아니라, 이를 실제 프로덕트로 구현하는 과정에서 Claude Code를 어떻게 활용해야 하는지에 대한 구체적인 '프롬프트 엔지니어링(Prompt Engineering)' 전략과 워크플로우 가이드를 포함한다.3 특히 한국의 대표적인 핀테크 앱 '토스(Toss)'가 보여준 '심플리시티(Simplicity)' 디자인 원칙4을 교육 도메인에 접목하고, 이를 AI 에이전트를 통해 기술적으로 구현하는 방안을 상세히 기술할 것이다.

## ---

**2\. 핵심 디자인 철학: 인지 과학과 Simplicity의 결합**

### **2.1. 토스(Toss)의 'Simplicity' 원칙의 교육적 재해석**

한국 시장에서 압도적인 UX 표준을 정립한 토스(Toss)의 디자인 철학은 "사용자가 생각할 필요가 없는 직관성"으로 요약된다.4 복잡한 금융 절차를 극도로 단순화한 이 원칙은, 학습 내용 자체의 난이도로 인해 이미 높은 인지 부하를 겪고 있는 학습자들에게 필수적인 요소이다.

#### **2.1.1. 인지 부하 이론(Cognitive Load Theory)에 기반한 UI**

교육심리학의 인지 부하 이론에 따르면, 인간의 작업 기억(Working Memory) 용량은 한정되어 있다. 따라서 UI는 학습 외적인 '외생적 부하(Extraneous Load)'를 최소화해야 한다.

* **시각적 명료성 (Visual Clarity)**: 화면의 요소가 많을수록 학습자의 주의력은 분산된다. 토스가 송금 과정에서 불필요한 정보를 모두 제거했듯, 교육 앱의 문제 풀이 화면에서는 '문제', '답안 입력', '타이머' 외의 모든 요소를 숨겨야 한다(Progressive Disclosure).  
* **맥락적 안내 (Contextual Guidance)**: 사용자가 다음에 무엇을 해야 할지 고민하게 해서는 안 된다. 학습 완료 후 '다음 학습 추천'이나 '오답 노트 작성' 버튼이 적절한 타이밍에 강조되어야 한다.

### **2.2. 디자인 시스템의 아토믹(Atomic) 구조와 토큰화**

효율적인 크로스 플랫폼 개발을 위해, 그리고 Claude Code가 일관된 코드를 생성할 수 있도록 돕기 위해 **아토믹 디자인(Atomic Design)** 방법론을 채택해야 한다. 버튼, 입력 필드와 같은 '원자(Atom)' 단위부터 시작하여 '분자(Molecule)', '유기체(Organism)'로 확장되는 컴포넌트 구조는 AI가 이해하고 조립하기에 가장 적합한 형태이다.

#### **2.2.1. Tailwind CSS 기반의 반응형 토큰 설계**

CSS 클래스 이름을 고민할 필요 없는 Tailwind CSS는 AI 에이전트와의 협업에 최적화되어 있다.5 디자인 토큰을 다음과 같이 정의하여 기기별 일관성을 유지한다.

| 토큰 범주 (Category) | 모바일 (Mobile) | 태블릿 (Tablet) | PC (Desktop) |
| :---- | :---- | :---- | :---- |
| **Grid Layout** | 1 Column (grid-cols-1) | 2 Columns (grid-cols-2) | 3\~4 Columns (grid-cols-3/4) |
| **Typography (Body)** | 16px (가독성 최소치) | 16px\~18px | 16px\~18px |
| **Touch Target** | 44px 이상 (필수) | 44px 이상 (권장) | 32px (마우스 정밀도) |
| **Input Height** | 48px | 48px | 40px |
| **Modal/Sheet** | Bottom Sheet | Dialog / Split Pane | Center Modal |

이러한 토큰 정의는 Claude Code의 설정 파일(CLAUDE.md)에 명시되어, AI가 코드를 생성할 때 자동으로 각 플랫폼에 맞는 클래스를 적용하도록 강제해야 한다.7

## ---

**3\. 플랫폼별 심층 UI/UX 전략**

### **3.1. 핸드폰 (Mobile): "Focus & Immediacy" (집중과 즉시성)**

모바일 환경은 화면 크기의 제약이 가장 크지만, 사용자의 접근성은 가장 높다. 따라서 짧은 호흡의 학습(Micro-learning)과 현황 확인에 최적화된 UX를 제공해야 한다.

#### **3.1.1. 바텀 시트(Bottom Sheet) 중심의 인터랙션 설계**

최근 모바일 UX 트렌드 분석에 따르면, 페이지 이동(Navigation)보다는 \*\*바텀 시트(Bottom Sheet)\*\*를 활용한 인터랙션이 주류를 이루고 있다.8 이는 화면 상단까지 손가락을 뻗기 힘든 대화면 스마트폰 시대에 '엄지손가락 영역(Thumb Zone)'을 배려한 결과이다.

* **구현 전략**:  
  * **학습 상세 정보**: 문제 리스트에서 특정 문제를 탭했을 때, 새로운 페이지로 이동하는 대신 하프(Half) 바텀 시트를 띄워 문제의 상세 내용과 해설을 보여준다. 이는 사용자가 현재의 맥락(리스트)을 잃지 않게 돕는다.  
  * **옵션 선택**: 학년 변경, 과목 필터링 등은 드롭다운 메뉴 대신 바텀 시트의 피커(Picker) UI를 사용한다.  
  * **Claude Code 활용**: Claude에게 \*"Radix UI의 Dialog 컴포넌트와 Framer Motion을 결합하여, 드래그로 닫을 수 있고(dismissible), 모바일 화면 높이의 40%와 90% 지점에 스냅(snap)되는 재사용 가능한 Bottom Sheet 컴포넌트를 생성해줘"\*라고 구체적으로 지시한다.

#### **3.1.2. 모바일 OMR과 카드 스택(Card Stack) UI**

좁은 화면에서 긴 지문과 답안 입력란을 동시에 보여주는 것은 난제이다. 이를 해결하기 위해 두 가지 패턴을 제안한다.

* **스티키 OMR 바 (Sticky OMR Bar)**: 긴 지문을 스크롤하더라도, 답안을 선택하는 1\~5번 버튼이나 주관식 입력창은 화면 하단에 항상 고정(Sticky)되어야 한다.10  
* **틴더(Tinder) 스타일 카드 UI**: 단어 암기나 OX 퀴즈의 경우, 좌우 스와이프 제스처를 활용한 카드 스택 UI를 적용한다. 이는 모바일의 터치 인터페이스에 가장 직관적이며, 게임화(Gamification) 요소를 통해 학습 몰입도를 높인다.

#### **3.1.3. 엄지손가락 친화적(Thumb-Friendly) 레이아웃**

핵심 액션 버튼(제출, 다음 문제, 힌트 보기)은 모두 화면 하단 1/3 영역에 배치해야 한다. 반면, '나가기'나 '설정'과 같이 자주 사용하지 않거나 실수를 방지해야 하는 버튼은 상단 모서리에 배치하여 의도적인 조작을 유도한다.

### **3.2. 태블릿 (Tablet): "Multitasking & Creation" (멀티태스킹과 창작)**

태블릿은 콘텐츠 소비 도구이자 창작 도구이다. 교육 앱에서 태블릿 사용자는 강의를 보며 필기하거나, 교재를 보며 문제를 푸는 멀티태스킹을 수행한다.

#### **3.2.1. 스플릿 스크린(Split Screen) 대응과 반응형 그리드**

안드로이드와 iPadOS 모두 앱을 화면의 1/2 또는 1/3 크기로 실행하는 스플릿 뷰를 지원한다.11 앱이 전체 화면일 때와 분할 화면일 때의 레이아웃이 유연하게 변해야 한다.

* **Fluid Layout**: 고정 픽셀(px) 대신 퍼센트(%)나 flex-grow 속성을 사용하여 컨테이너 너비에 따라 콘텐츠가 유동적으로 흐르도록 한다.  
* **Breakpoint 관리**: Tailwind CSS의 md (768px) 브레이크포인트뿐만 아니라, 스플릿 뷰 상황을 고려한 세밀한 컨테이너 쿼리(Container Queries) 적용이 필요할 수 있다. Claude Code에게 \*"CSS Container Queries를 사용하여 부모 컨테이너의 너비에 따라 폰트 사이즈와 패딩이 조절되는 문제 카드 컴포넌트를 작성해줘"\*라고 요청한다.

#### **3.2.2. 펜 인터랙션과 팜 리젝션(Palm Rejection)**

태블릿 사용자의 상당수는 스타일러스 펜(Apple Pencil, S-Pen)을 사용한다.

* **쓰기 모드 전환**: 화면 한구석에 플로팅된 '펜 모드' 버튼을 두어, 이를 활성화하면 터치 입력을 스크롤이 아닌 '그리기'로 인식하도록 전환한다.  
* **캔버스 레이어**: 문제 텍스트 위에 투명한 캔버스 레이어를 덧씌워, 사용자가 문제 위에 직접 밑줄을 긋거나 메모를 할 수 있게 한다. 이는 실제 종이 문제집을 푸는 경험을 디지털로 이식하는 핵심 기능이다.

#### **3.2.3. 내비게이션 레일(Navigation Rail)**

태블릿의 가로 모드(Landscape)에서는 모바일의 하단 탭 바가 비효율적이다. 좌측에 세로형 '내비게이션 레일'을 배치하여 공간 활용도를 높이고, 엄지손가락으로 메뉴를 쉽게 조작할 수 있게 한다.

### **3.3. PC (Desktop): "Management & Analysis" (관리와 분석)**

PC는 교사나 관리자, 또는 심화 학습을 하는 학생이 주로 사용한다. 넓은 화면과 키보드/마우스를 활용한 생산성 향상이 핵심이다.

#### **3.3.1. 3-Pane 대시보드 레이아웃**

정보의 밀도(Density)를 높여 한눈에 전체 현황을 파악할 수 있는 **3-Pane Layout**을 적용한다.13

* **Pane 1 (Navigation)**: 대메뉴 (대시보드, 강좌, 학생 관리, 설정).  
* **Pane 2 (List)**: 선택한 메뉴의 하위 목록 (학생 리스트, 문제지 목록). 검색 필터와 정렬 기능 포함.  
* **Pane 3 (Detail)**: 선택한 항목의 상세 정보 (학생별 성적 그래프, 문제 편집기).  
* **구현 전략**: 이 레이아웃은 데이터 탐색 속도를 비약적으로 높여준다. Claude Code에게 \*"AdminLTE 스타일의 3단 레이아웃을 Tailwind CSS Grid로 구현하되, 각 패널의 너비를 사용자가 조절할 수 있는 Resizable Handle 기능을 추가해줘"\*라고 요청할 수 있다.

#### **3.3.2. 키보드 단축키와 파워 유저 기능**

마우스 이동을 최소화하기 위해 키보드 단축키(Keyboard Shortcuts)를 적극 도입한다.

* J / K: 리스트 상하 이동  
* Enter: 상세 보기 진입  
* Esc: 모달 닫기 또는 뒤로 가기  
* Ctrl \+ F: 앱 내 검색창 포커스  
* **힌트 제공**: 화면 하단이나 툴팁을 통해 단축키 가이드를 제공하여 학습 곡선을 낮춘다.

#### **3.3.3. 데이터 시각화 (Data Visualization)**

PC의 넓은 화면은 복잡한 학습 데이터를 시각화하기에 최적이다.

* **히트맵(Heatmap)**: 학습 지속성을 보여주는 캘린더 히트맵.  
* **레이더 차트**: 과목별 강점과 약점을 비교 분석.  
* **Sankey Diagram**: 학생의 문제 풀이 경로와 이탈 지점을 시각화.  
* **라이브러리**: React 생태계의 Recharts나 Tremor 라이브러리를 사용하여, Claude Code가 빠르고 아름다운 차트 코드를 생성하도록 유도한다.

## ---

**4\. 교육 특화 기능: 수식 입력 및 문제 풀이 시스템 (The Math Input Challenge)**

수학 및 과학 교육 앱의 가장 큰 기술적 장벽은 \*\*수식 입력(Math Input)\*\*이다. 일반적인 쿼티(QWERTY) 키보드로는 분수, 루트, 적분 기호 등을 입력하기 어렵다. 이는 3가지 플랫폼에서 각기 다른 방식으로 해결되어야 한다.

### **4.1. 수식 입력 라이브러리 선정: MathLive vs MathQuill**

기술적 검토 결과, 본 프로젝트에는 **MathLive** 라이브러리 도입을 강력히 권장한다.15

* **MathQuill**: 전통적인 라이브러리이나 jQuery 의존성이 있어 React/Next.js 환경과 통합이 매끄럽지 않으며, 모바일 터치 지원이 제한적이다.  
* **MathLive**: 최신 웹 컴포넌트(Web Components) 표준을 따르며, **가상 키보드(Virtual Keyboard)** 기능이 내장되어 있다. 터치 인터페이스에 최적화되어 있으며, 접근성(Screen Reader) 지원이 뛰어나 시각 장애 학생을 위한 보조 공학적 측면에서도 유리하다. 또한 JSON 설정을 통해 키보드 레이아웃을 자유롭게 커스터마이징할 수 있다.18

### **4.2. 플랫폼별 맞춤형 가상 키보드 설계 (한국 교육과정 반영)**

한국의 수학 교육과정은 특유의 기호 사용 빈도를 가진다(예: 나눗셈 기호 $\\div$의 빈번한 사용, 대분수 등). MathLive의 커스텀 레이아웃 기능을 활용해 이를 반영해야 한다.19

* **모바일 (Mobile)**: 화면의 40%를 차지하는 키보드 영역을 효율적으로 쓰기 위해 **탭(Tab)** 구조를 도입한다.  
  * \[숫자/연산\]: 기본 사칙연산과 숫자.  
  * \[함수\]: $\\sin, \\cos, \\log, \\lim$ 등.  
  * \[기호\]: $\\pi, \\infty, \\theta, \\sqrt{}$ 등.  
  * **UX 팁**: 자주 쓰는 변수($x, y, a, b$)는 숫자 탭에 함께 배치하여 탭 전환 횟수를 줄인다.  
* **태블릿/PC**: 화면 하단에 전체 키패드를 펼쳐서(Full-width) 탭 전환 없이 한 번에 입력할 수 있는 '확장 모드'를 제공한다. PC 사용자를 위해서는 물리 키보드의 /를 누르면 분수 모드로, ^를 누르면 지수 모드로 자동 전환되는 단축키 매핑을 지원한다.

### **4.3. 필기 인식(Handwriting OCR) 기술 통합**

수식 입력의 가장 자연스러운 방식은 '손으로 쓰는 것'이다.

* **기술 스택**: **MyScript iink SDK** (유료, 최고의 인식률) 또는 **Google ML Kit Digital Ink Recognition** (무료, 준수한 성능)을 통합한다.21  
* **UX 워크플로우**:  
  1. 입력창 옆의 '펜' 아이콘 터치.  
  2. 입력 영역이 드로잉 캔버스로 전환됨.  
  3. 사용자가 수식을 그리면 약 0.5초의 딜레이(Debounce) 후 상단에 변환된 디지털 수식 미리보기를 표시한다.  
  4. 오인식된 경우, 해당 글자 위에 덧쓰거나 지우기 제스처(Scribble)로 수정할 수 있게 한다.23

## ---

**5\. Claude Code를 활용한 효율적 개발 및 구현 가이드**

귀하께서 사용 중인 **Claude Code**는 단순한 챗봇이 아니라, 터미널 환경에서 프로젝트의 파일 시스템을 직접 제어하고 코드를 생성하는 \*\*에이전트(Agent)\*\*이다. 이 도구의 잠재력을 100% 끌어내기 위한 구체적인 전략을 제시한다.

### **5.1. CLAUDE.md: 프로젝트의 '헌법' 만들기**

Claude Code가 프로젝트의 맥락을 잃지 않고 일관된 코드를 생성하도록 하려면, 프로젝트 루트 디렉토리에 CLAUDE.md 파일을 생성해야 한다.24 이 파일은 Claude Code가 실행될 때마다 자동으로 참조하는 컨텍스트 파일이다.

**CLAUDE.md 구성 예시**:

# **Project Context: Edu-Platform (Mobile/Tablet/PC)**

## **Tech Stack**

* Framework: Next.js 14 (App Router)  
* Language: TypeScript  
* Styling: Tailwind CSS (Mobile-first approach)  
* State Management: Zustand  
* Math Engine: MathLive

## **UI/UX Guidelines (Based on Toss Simplicity)**

1. **Responsive Strategy**:  
   * Mobile (\< 768px): Use Bottom Sheets for details.  
   * Tablet (768px \- 1024px): Use Split View.  
   * Desktop (\> 1024px): Use Modals and 3-Pane Layouts.  
2. **Components**:  
   * Use shadcn/ui based components in @/components/ui.  
   * All interactive elements MUST have aria-label for accessibility.  
3. **Coding Standards**:  
   * Functional Components with Named Exports.  
   * Use clsx and tailwind-merge for class handling.  
   * Implement TDD: Write tests before implementation.

## **Common Commands**

* Build: npm run build  
* Test: npm run test  
* Lint: npm run lint  
  이 파일을 작성해두면, 매번 프롬프트에 "Tailwind를 써줘", "모바일 먼저 고려해줘"라고 반복할 필요가 없어진다.

### **5.2. 프롬프트 엔지니어링: 구조화된 지시 내리기**

Claude Code에게 모호한 지시 대신, 역할과 제약 조건을 명확히 하는 구조화된 프롬프트를 사용해야 한다.7

* **나쁜 예**: "반응형 그리드 만들어줘."  
* **좋은 예 (Expert Prompt)**:  
  "학생 성적을 보여주는 GradeCardList 컴포넌트를 생성해. CLAUDE.md의 가이드라인을 따르고 다음 요구사항을 충족해야 해:  
  1. **레이아웃**: 모바일에서는 1열 세로 스크롤, 태블릿에서는 2열 그리드, PC에서는 3열 그리드로 반응형 처리(grid-cols-\* 사용).  
  2. **인터랙션**: 카드를 클릭하면 studentId를 URL 파라미터로 넘기고 상세 페이지로 라우팅.  
  3. **스타일**: 각 카드는 호버 시 scale-105 변환 효과와 그림자(shadow-lg)가 적용되어야 함.  
  4. **테스트**: 다양한 뷰포트 크기에서 그리드 컬럼 수가 맞는지 확인하는 Playwright 테스트 코드도 작성해."

### **5.3. CLI 워크플로우와 TDD 자동화**

Claude Code의 CLI 명령어를 활용하여 개발 속도를 높인다.1

1. **초기화**: /init 명령어로 프로젝트 컨텍스트 로드.  
2. **테스트 작성 (Red)**: claude "MathInput 컴포넌트가 '1/2' 입력 시 분수 형태로 렌더링되는지 확인하는 테스트 코드를 작성해."  
3. **구현 (Green)**: 테스트가 실패하는 것을 확인한 후, claude "테스트를 통과하도록 MathLive를 사용하여 컴포넌트를 구현해."  
4. **리팩토링**: claude "컴포넌트의 가독성을 높이고 중복 코드를 제거해."

이러한 **'테스트 주도 개발(TDD)'** 방식은 UI가 복잡해질수록 버그를 줄이고 안정성을 높이는 데 결정적인 역할을 한다.

## ---

**6\. 사용성 테스트 및 품질 보증 (UX Research & QA)**

### **6.1. 플랫폼별 필수 점검 체크리스트**

개발된 UI가 각 플랫폼에서 의도대로 작동하는지 검증하기 위한 체크리스트이다.

| 항목 | 모바일 (Mobile) | 태블릿 (Tablet) | PC (Desktop) |
| :---- | :---- | :---- | :---- |
| **입력 영역** | 엄지손가락 터치(44px+)가 편한가? | 펜 입력 시 손바닥 오작동은 없는가? | 탭(Tab) 키로 포커스 이동이 가능한가? |
| **키보드** | 가상 키보드가 입력창을 가리지 않는가? | 외장 키보드 연결 시 단축키 작동하나? | 수식 입력 단축키가 직관적인가? |
| **레이아웃** | 가로 모드 회전 시 UI가 깨지지 않는가? | 스플릿 뷰(1/2, 1/3)에서 가독성 유지되나? | 창 크기 조절 시 그리드가 유연한가? |
| **데이터** | 핵심 정보 위주로 표시되는가? | 사이드바 내비게이션이 편리한가? | 대량 데이터 로딩 시 스켈레톤 UI가 뜨나? |

### **6.2. 모바일 퍼스트(Mobile First) vs 모바일 온리(Mobile Only)**

'모바일 퍼스트'는 훌륭한 전략이지만, PC 화면에서 모바일 UI를 단순히 확대해 놓은 듯한 '모바일 온리' 디자인은 피해야 한다. PC에서는 여백을 줄이고 정보 밀도를 높여 전문가용 도구(Pro Tool)의 느낌을 주어야 한다. Claude Code에게 \*"PC 뷰(lg:)에서는 폰트 사이즈를 줄이고, 패딩을 조절하여 한 화면에 더 많은 행(Row)이 보이게 수정해줘"\*라고 명시적으로 요청하여 이를 조정한다.

## ---

**7\. 결론 및 제언 (Conclusion)**

귀하께서 목표로 하는 **"핸드폰, 태블릿, PC 3가지 플랫폼을 아우르는 효율적인 교육용 UI/UX"** 프로젝트는 단순한 반응형 웹사이트 구축을 넘어선 도전이다. 이는 각 기기의 물리적 제약과 사용자의 심리적 맥락을 깊이 이해하고, 이를 \*\*'적응형 디자인(Adaptive Design)'\*\*으로 승화시키는 과정이다.

본 보고서의 핵심 제언을 요약하면 다음과 같다:

1. **UX 전략의 이원화**: 코드베이스는 하나(Next.js)로 통일하되, 사용자 경험은 기기별로 분화하라. 모바일은 **'집중과 단순함(Bottom Sheet)'**, 태블릿은 **'생산성과 필기(Split View & Pen)'**, PC는 \*\*'관리와 조망(Dashboard)'\*\*이라는 각각의 테마를 가져야 한다.  
2. **수식 입력의 혁신**: 교육 앱의 핵심인 수식 입력 경험을 위해 **MathLive** 라이브러리를 도입하고, 한국 교육과정에 최적화된 커스텀 키보드를 제공하여 사용자의 진입 장벽을 낮추어야 한다.  
3. **Claude Code의 전략적 활용**: AI 에이전트를 단순 코딩 도구가 아닌 '주니어 개발자'처럼 활용하라. CLAUDE.md를 통해 디자인 시스템과 코딩 컨벤션을 학습시키고, TDD와 프롬프트 엔지니어링을 통해 반복적인 UI 구현 작업을 자동화함으로써, 개발자는 핵심 비즈니스 로직과 학습 알고리즘 고도화에 집중해야 한다.

이러한 전략적 접근은 귀하의 교육 애플리케이션이 기술적 완성도와 사용자 만족도라는 두 가지 목표를 모두 달성하는 데 견고한 토대가 될 것이다.

#### **참고 자료**

1. 20 Claude Code CLI Commands to Make Your 10x Productive \- Apidog, 12월 6, 2025에 액세스, [https://apidog.com/blog/claude-code-cli-commands/](https://apidog.com/blog/claude-code-cli-commands/)  
2. How I use Claude Code (+ my best tips) \- Builder.io, 12월 6, 2025에 액세스, [https://www.builder.io/blog/claude-code](https://www.builder.io/blog/claude-code)  
3. Claude Code: Best practices for agentic coding \- Anthropic, 12월 6, 2025에 액세스, [https://www.anthropic.com/engineering/claude-code-best-practices](https://www.anthropic.com/engineering/claude-code-best-practices)  
4. What makes a good product? \- 금융이 알고 싶을 때, 토스피드, 12월 6, 2025에 액세스, [https://toss.im/tossfeed/article/tossproductprinciples](https://toss.im/tossfeed/article/tossproductprinciples)  
5. Tailwind CSS tutorial \- responsive grid explained \- TW Elements, 12월 6, 2025에 액세스, [https://tw-elements.com/learn/te-foundations/tailwind-css/responsiveness/](https://tw-elements.com/learn/te-foundations/tailwind-css/responsiveness/)  
6. Responsive design \- Core concepts \- Tailwind CSS, 12월 6, 2025에 액세스, [https://tailwindcss.com/docs/responsive-design](https://tailwindcss.com/docs/responsive-design)  
7. Practical Use Cases of Prompt Engineering in Web Development \- Web Grapple, 12월 6, 2025에 액세스, [https://blog.webgrapple.com/practical-use-cases-of-prompt-engineering-in-web-development/](https://blog.webgrapple.com/practical-use-cases-of-prompt-engineering-in-web-development/)  
8. Best Examples of Mobile App Bottom Sheets \- Plotline, 12월 6, 2025에 액세스, [https://www.plotline.so/blog/mobile-app-bottom-sheets](https://www.plotline.so/blog/mobile-app-bottom-sheets)  
9. Mobile Bottom Sheet Design \- Mobbin, 12월 6, 2025에 액세스, [https://mobbin.com/explore/mobile/ui-elements/bottom-sheet](https://mobbin.com/explore/mobile/ui-elements/bottom-sheet)  
10. Design a better form. For desktop & mobile screens | by Allie Paschal | Bootcamp \- Medium, 12월 6, 2025에 액세스, [https://medium.com/design-bootcamp/design-a-better-form-b9adaa372fb3](https://medium.com/design-bootcamp/design-a-better-form-b9adaa372fb3)  
11. Android split-screen \- Material Design, 12월 6, 2025에 액세스, [https://m2.material.io/design/platform-guidance/android-split-screen.html](https://m2.material.io/design/platform-guidance/android-split-screen.html)  
12. 5 student engagement strategies using split screen mode | SMART Technologies, 12월 6, 2025에 액세스, [https://www.smarttech.com/education/resources/blog/5-classroom-activities-using-split-screen-mode-on-iq](https://www.smarttech.com/education/resources/blog/5-classroom-activities-using-split-screen-mode-on-iq)  
13. Free Bootstrap Admin Template \- AdminLTE.IO, 12월 6, 2025에 액세스, [https://adminlte.io/](https://adminlte.io/)  
14. 43 Best Free Dashboard Templates For Admins 2025 \- Colorlib, 12월 6, 2025에 액세스, [https://colorlib.com/wp/free-dashboard-templates/](https://colorlib.com/wp/free-dashboard-templates/)  
15. mathlive \- NPM, 12월 6, 2025에 액세스, [https://www.npmjs.com/package/mathlive](https://www.npmjs.com/package/mathlive)  
16. gotitinc/mathlive \- NPM, 12월 6, 2025에 액세스, [https://www.npmjs.com/package/@gotitinc/mathlive](https://www.npmjs.com/package/@gotitinc/mathlive)  
17. A customizable math keyboard for React \- GitHub, 12월 6, 2025에 액세스, [https://github.com/krirkrirk/react-math-keyboard](https://github.com/krirkrirk/react-math-keyboard)  
18. Virtual Keyboard \- MathLive, 12월 6, 2025에 액세스, [https://mathlive.io/mathfield/guides/virtual-keyboard/](https://mathlive.io/mathfield/guides/virtual-keyboard/)  
19. Math Keyboard \- Apps on Google Play, 12월 6, 2025에 액세스, [https://play.google.com/store/apps/details?id=com.fairbird.math\_keyboard\&hl=en\_US](https://play.google.com/store/apps/details?id=com.fairbird.math_keyboard&hl=en_US)  
20. Configuration options \- MathLive Docs, 12월 6, 2025에 액세스, [https://new.mizanedu.com/backend/web/nadiya\_assets/plugins/mathlive-master/docs/tutorial-CONFIG.html](https://new.mizanedu.com/backend/web/nadiya_assets/plugins/mathlive-master/docs/tutorial-CONFIG.html)  
21. MyScript Notes (formerly Nebo), 12월 6, 2025에 액세스, [https://www.myscript.com/notes/](https://www.myscript.com/notes/)  
22. OCR With Google AI, 12월 6, 2025에 액세스, [https://cloud.google.com/use-cases/ocr](https://cloud.google.com/use-cases/ocr)  
23. Full example \- MyScript Developer, 12월 6, 2025에 액세스, [https://developer.myscript.com/docs/interactive-ink/4.1/web/iinkts/full-example/](https://developer.myscript.com/docs/interactive-ink/4.1/web/iinkts/full-example/)  
24. Using CLAUDE.MD files: Customizing Claude Code for your codebase, 12월 6, 2025에 액세스, [https://www.claude.com/blog/using-claude-md-files](https://www.claude.com/blog/using-claude-md-files)  
25. Claude Code CLI Cheatsheet: config, commands, prompts, \+ best practices \- Shipyard.build, 12월 6, 2025에 액세스, [https://shipyard.build/blog/claude-code-cheat-sheet/](https://shipyard.build/blog/claude-code-cheat-sheet/)