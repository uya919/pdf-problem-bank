# **차세대 모바일 웹앱 OMR 및 적응형 수학 키패드 구축 전략 보고서: 토스(Toss)의 심플리시티(Simplicity) 원칙을 적용한 교육 기술 혁신**

## **1\. 서론 및 전략적 비전**

### **1.1 디지털 교육 환경의 변화와 입력 방식의 한계**

대한민국의 교육 환경은 디지털 대전환의 시기를 맞이하여 콘텐츠의 전달 방식에서 비약적인 발전을 이루었습니다. 초고화질의 강의 영상, AI 기반의 맞춤형 문제 추천 시스템 등은 이미 보편화되었으나, 정작 학생이 학습의 결과물인 '정답'을 입력하는 상호작용 단계는 여전히 아날로그적인 방식이나 PC 중심의 인터페이스에 머물러 있습니다. 특히 모바일 환경에서의 수학 수식 입력은 복잡한 특수 기호와 좁은 화면이라는 물리적 제약으로 인해 학습자의 인지적 부하를 가중시키는 주요 병목 구간으로 작용하고 있습니다.1

본 보고서는 이러한 문제를 해결하기 위해 비바리퍼블리카(토스)가 금융 산업에서 증명한 '심플리시티(Simplicity)'와 '설명이 필요 없는 디자인(Design that needs no explanation)'의 철학을 교육 기술(EdTech)에 접목한 '모바일 웹앱용 OMR 및 수학 키패드'의 기획 및 구축 전략을 제시합니다.4 우리는 학생들이 스마트폰이라는 제한된 인터페이스 속에서도 한국 수학 교육과정에 최적화된 수식(단답형), 객관식, OX 정답을 직관적이고 유려하게 입력할 수 있는 시스템을 설계함으로써, 기술이 학습의 도구가 아닌 방해물이 되는 현상을 타파하고자 합니다.

### **1.2 토스(Toss) 스타일의 재해석과 적용**

토스의 디자인 원칙은 단순한 미적 간결함을 넘어 사용자가 목표를 달성하는 과정에서의 불필요한 인지적 마찰을 제거하는 데에 그 핵심이 있습니다.6 금융 서비스에서 복잡한 인증 절차와 난해한 용어를 걷어내고 '송금'이라는 본질에 집중했듯이, 본 프로젝트는 수학 문제 풀이 과정에서 '입력'이라는 행위를 무의식적이고 자연스러운 흐름으로 전환하는 것을 목표로 합니다.

이를 위해 본 기획안은 기존의 범용 공학용 계산기 인터페이스가 가진 복잡성—수십 개의 버튼이 한 번에 나열되어 사용자를 압도하는 방식—을 전면적으로 거부합니다. 대신 사용자의 학습 단계(초·중·고)와 문제의 유형(대수, 기하, 미적분 등)에 따라 필요한 도구만을 적시(Just-in-Time)에 제공하는 '맥락 인식형(Context-Aware) 인터페이스'를 제안합니다. 이는 토스가 'Simplicity 23' 컨퍼런스에서 강조한 비전 주도형 디자인(Vision-Driven Design)의 실천이며, 모바일 퍼스트(Mobile First) 원칙에 입각하여 가장 작은 화면에서부터 설계를 시작해 점진적으로 기능을 확장하는 전략을 따릅니다.4

## **2\. 디자인 철학: 교육을 위한 급진적 단순함(Radical Simplicity)**

### **2.1 인지적 부하의 최소화와 '원 페이지 원 포커스'**

토스 UX의 강력함은 사용자가 한 번에 하나의 과업에만 집중하도록 유도하는 데에서 비롯됩니다.4 기존의 모바일 OMR 시스템들이 한 화면에 10개 이상의 문항을 나열하여 사용자로 하여금 스크롤과 터치 좌표 유지에 신경 쓰게 만들었다면, 본 기획은 '문항 단위의 몰입형 인터페이스'를 지향합니다. 스마트폰 화면에서 하나의 문항은 하나의 카드(Card) 형태로 제시되며, 정답 입력 창과 키패드는 해당 문항의 맥락에 종속되어 유기적으로 동작합니다. 이는 사용자가 "내가 지금 3번 문제를 풀고 있는데 마킹은 4번에 하는 실수"를 원천적으로 차단하며, 오로지 수학적 사고에만 집중할 수 있는 '몰입(Flow)' 상태를 유도합니다.9

### **2.2 설명이 필요 없는 인터랙션 (Intuitive Interaction)**

사용자가 매뉴얼을 읽어야만 사용할 수 있는 UI는 실패한 디자인입니다. 특히 수학 키패드에서 분수($\\frac{a}{b}$)를 입력하거나 지수($x^n$)를 입력하는 과정이 직관적이지 않다면, 학생은 수학 실력이 부족해서가 아니라 입력 방식을 몰라서 오답을 제출하게 됩니다. 본 기획은 토스의 마이크로 인터랙션 철학을 반영하여, 사용자의 제스처와 입력 의도를 예측하는 '스마트 커서(Smart Cursor)'와 '자동 완성(Auto-Completion)' 기능을 도입합니다.6 예를 들어, 괄호를 열면 닫는 괄호가 반투명하게 미리 표시되거나, 분수 입력을 위해 나눗셈 기호를 누르면 즉시 분모/분자 입력 모드로 전환되는 식의 능동적 보조 장치를 마련합니다.

### **2.3 시각적 위계와 브랜드 아이덴티티의 융합**

토스의 디자인 언어는 과감한 여백, 명확한 타이포그래피, 그리고 기능적인 색상 사용으로 정의됩니다.6 본 OMR 및 키패드 시스템 역시 이러한 시각적 위계를 따릅니다.

* **타이포그래피:** 가독성이 극대화된 산세리프 서체(예: Pretendard)를 사용하여 수식과 텍스트를 명확히 구분합니다.  
* **색상:** 중요한 행동 유도 버튼(CTA)에는 토스 블루(\#3182F6)를 사용하여 명확한 행동 지침을 제공하되, 오류 메시지나 경고에는 부드러운 톤을 사용하여 학생이 위축되지 않도록 배려합니다.10  
* **모션:** 화면 전환이나 키패드 노출 시 부드러운 물리 기반 애니메이션을 적용하여 앱이 살아있는 듯한 반응성을 제공합니다. 이는 단순한 장식이 아니라, 사용자가 자신의 입력이 시스템에 정확히 전달되었음을 확신하게 만드는 피드백 장치로 기능합니다.6

## **3\. 한국 수학 교육과정 심층 분석 및 입력 요구사항**

한국의 수학 교육과정은 학년별로 사용하는 기호와 수식의 복잡도가 극명하게 달라집니다. 따라서 모든 기능을 욱여넣은 단일 키패드가 아닌, 교육과정 단계에 맞춘 '적응형 키패드 레이아웃'이 필수적입니다.11

### **3.1 초등학교 과정 (1\~6학년): 직관적 연산과 분수**

초등학교 과정에서는 사칙연산과 분수, 소수의 개념이 주를 이룹니다. 이 단계의 학생들에게 복잡한 공학용 계산기 레이아웃은 혼란만 가중시킬 뿐입니다.

* **필수 기호:** $+$, $-$, $\\times$, $\\div$ (프로그래밍용 \*, /가 아닌 교과서 표기 준수), $=$, $()$.  
* **특이 사항:** 대분수($1 \\frac{1}{2}$)의 입력이 빈번하며, 이를 위한 전용 입력 템플릿이 필요합니다. 또한 네모 칸($\\square$) 채우기 문제 유형에 대응하여, 커서가 네모 칸 사이를 직관적으로 이동할 수 있어야 합니다.  
* **UX 전략:** 키패드에서 알파벳($x, y$)과 고등 수학 기호($\\sqrt{}, \\pi$)를 완전히 제거하고, 숫자 버튼과 연산 기호의 크기를 키워 터치 정확도를 높입니다.11

### **3.2 중학교 과정 (1\~3학년): 문자와 식, 기하의 시작**

중학교부터는 문자의 사용(방정식)과 음수, 거듭제곱, 부등식이 본격적으로 등장합니다.11

* **필수 기호:** 변수 $x, y, a, b$, 지수($x^2$), 제곱근($\\sqrt{}$), 부등호($\<, \>, \\le, \\ge$), 파이($\\pi$).  
* **특이 사항:** 연립방정식과 같이 줄바꿈이 필요한 수식 입력이 요구됩니다. 또한 순서쌍 $(x, y)$ 입력 시 쉼표(,)의 사용이 잦아집니다.  
* **UX 전략:** 숫자 키패드 옆에 '변수 전용 패널'을 신설하되, QWERTY 키보드 전체를 보여주는 것이 아니라 문제 풀이에 주로 쓰이는 변수들만 선별적으로 보여주는 '스마트 변수 레일'을 적용합니다.

### **3.3 고등학교 과정 (1\~3학년): 추상적 기호와 함수**

고등학교 과정은 미적분, 확률과 통계, 기하 벡터 등 고도화된 수식을 다룹니다.12

* **필수 기호:** 삼각함수($\\sin, \\cos, \\tan$), 로그($\\log, \\ln$), 극한($\\lim$), 시그마($\\sum$), 적분($\\int$), 집합 기호($\\in, \\subset, \\cup, \\cap$), 무한대($\\infty$).  
* **특이 사항:** 수식의 구조가 다층적(예: 적분 구간 안에 분수가 있고 그 안에 지수가 있는 형태)으로 변하므로, 입력 시 커서의 위계(Hierarchy) 관리가 매우 중요해집니다.  
* **UX 전략:** 탭(Tab) 기반의 기능 확장을 통해 기본 화면은 심플하게 유지하되, 필요시 '함수', '기호' 탭으로 전환하여 고급 기호에 접근할 수 있도록 설계합니다. 이는 토스가 복잡한 투자/대출 상품을 별도의 탭으로 구조화한 방식과 유사합니다.5

## **4\. 모바일 OMR 및 키패드 UX/UI 상세 설계**

본 장에서는 앞서 정립한 철학과 분석을 바탕으로 실제 구현될 화면과 인터랙션의 상세 설계를 다룹니다.

### **4.1 전체 레이아웃 구조 (The Anatomy of the Screen)**

화면은 크게 세 가지 영역으로 구분되며, 각 영역은 모바일 환경에서의 엄지손가락 도달 범위(Thumb Zone)를 고려하여 배치됩니다.3

| 영역 | 구성 요소 | 역할 및 특징 |
| :---- | :---- | :---- |
| **상단 헤더 (Header)** | 진행률 바, 타이머, 문제 번호 내비게이션 | 현재 풀고 있는 문제의 위치와 남은 시간을 직관적으로 인지. 토스 앱의 상단 바와 같이 최소한의 정보만 표시하여 시선을 분산시키지 않음. |
| **콘텐츠 영역 (Body)** | 문제 텍스트, 수식 이미지, 보기(객관식의 경우) | KaTeX 기반의 고품질 수식 렌더링 적용.14 충분한 여백(Whitespace)을 두어 가독성 확보. |
| **입력 및 제어 영역 (Bottom Sheet)** | 정답 입력창, 스마트 키패드, 제출 버튼 | 화면 하단 40\~50%를 차지하며, 키보드가 올라올 때 콘텐츠 영역을 밀어올려 가려짐 방지. |

### **4.2 입력 방식별 UX 시나리오**

#### **4.2.1 객관식 (Multiple Choice) 문항**

기존 OMR의 작고 빽빽한 원형 마킹 영역은 모바일 터치 환경에서 오입력을 유발하는 주원인입니다. 이를 해결하기 위해 '카드형 선택지'를 도입합니다.

* **디자인:** 각 선택지(①, ②, ③...)는 화면 가로폭을 가득 채우는 버튼 형태(높이 48px 이상)로 제공됩니다.15  
* **인터랙션:** 선택지를 터치하면 토스 블루 색상으로 배경이 채워지며, 미세한 햅틱(Haptic) 피드백을 통해 물리적 확신을 줍니다.  
* **취소 및 수정:** 이미 선택된 답안을 다시 터치하면 선택이 해제되며, 다른 답안을 터치하면 즉시 변경됩니다. 별도의 '수정' 버튼 없이 직관적인 토글 방식을 채택합니다.

#### **4.2.2 OX (진위형) 문항**

단순한 두 개의 버튼을 넘어, 제스처를 활용한 흥미 요소를 가미합니다.

* **디자인:** 화면 중앙 하단에 크게 'O(파란색 동그라미)'와 'X(빨간색 가위표)' 버튼을 배치합니다.  
* **스와이프 인터랙션:** 틴더(Tinder)나 카드 UI에서 착안하여, 문제 카드를 오른쪽으로 밀면 'O', 왼쪽으로 밀면 'X'가 선택되는 제스처 기능을 지원합니다.9 이는 반복적인 문제 풀이의 지루함을 덜고 게임화(Gamification) 요소를 제공합니다.

#### **4.2.3 단답형 수식 입력 (Short Answer Math Input)**

이 프로젝트의 핵심 기능인 수학 키패드는 '적응형(Adaptive)'과 '지능형(Intelligent)'이라는 두 가지 키워드로 정의됩니다.

\[적응형 키패드 레이아웃 전략\]  
우리는 학년과 문제 유형에 따라 키패드의 구성을 동적으로 변화시키는 '동적 레이아웃 엔진'을 탑재합니다.

| 레이아웃 모드 | 활성화 조건 | 키패드 구성 (주요 키) |
| :---- | :---- | :---- |
| **기본 숫자형** | 초등 전 과정, 단순 계산 문제 | 0-9 숫자 패드(우측), 사칙연산(중앙), 지우기/이동(상단) |
| **분수/소수형** | 분수, 비율 문제 태그 감지 시 | 기본 숫자형 \+ 대분수 템플릿, 소수점, 약분 제안 버튼 |
| **대수형 (Algebra)** | 중등 방정식, 함수 문제 | 좌측에 $x, y, a, b$ 변수 탭 추가. 지수($x^\\square$), 괄호 강조 |
| **고등 함수형** | 고등 미적분, 기하 문제 | 삼각함수, 로그, 미분 기호 등이 포함된 확장 드로어(Drawer) 제공 |

**\[토스 스타일의 마이크로 인터랙션\]**

* **스마트 분수 입력:** 기존 수식 편집기에서는 분수 버튼을 누르고 분자를 입력한 뒤, 방향키를 눌러 분모로 이동해야 하는 번거로움이 있었습니다. 본 키패드는 분수 선($/$)을 누르는 순간, 커서가 자동으로 분모로 이동하거나, 입력된 숫자가 있다면 그것을 분자로 올리고 분모 입력 대기 상태로 전환하는 'Flow-Through' 방식을 적용합니다.16  
* **오류 예방 피드백:** 괄호를 닫지 않고 제출 버튼을 누르려 할 때, 시스템은 붉은색 경고창을 띄우는 대신 닫는 괄호 버튼($)$)을 은은하게 진동시키거나 하이라이트 처리하여 사용자가 스스로 오류를 인지하고 수정하도록 유도합니다 (Nudge).17

### **4.3 내비게이션과 제출 프로세스**

토스의 송금 과정처럼, 문제 풀이의 흐름도 끊김이 없어야 합니다.

* **자동 진행 (Auto-Advance):** 객관식 답안을 선택하거나 단답형 입력을 완료하고 '엔터'를 누르면, 별도의 '다음' 버튼 터치 없이 부드러운 슬라이드 애니메이션과 함께 다음 문제로 넘어갑니다. 이는 사용자의 몰입을 유지하는 데 결정적인 역할을 합니다.4  
* **검토 모드:** 모든 문제를 풀고 나면, 전체 문항의 답안을 한눈에 볼 수 있는 '그리드 뷰'를 제공합니다. 풀지 않은 문제는 회색, 푼 문제는 파란색으로 표시되어 누락된 문항을 직관적으로 찾을 수 있습니다.

## **5\. 기술적 구현 전략 및 아키텍처**

사용자에게 심플함을 제공하기 위해서는 백엔드와 프론트엔드의 기술적 구조가 고도로 정교해야 합니다. 모바일 웹앱(PWA) 환경에서 네이티브 앱 수준의 퍼포먼스를 내기 위한 기술 스택을 선정하고 비교 분석합니다.

### **5.1 수식 렌더링 및 입력 엔진 선정**

모바일 웹에서의 수식 입력은 성능 최적화가 관건입니다. 주요 라이브러리인 MathJax, KaTeX, MathLive를 비교 분석한 결과는 다음과 같습니다.14

| 라이브러리 | 장점 | 단점 | 본 프로젝트 적합성 |
| :---- | :---- | :---- | :---- |
| **MathJax** | 가장 방대한 LaTeX 지원, 호환성 우수 | 렌더링 속도가 느림, 무거운 자바스크립트 번들 크기 | **낮음** (모바일에서의 로딩 지연 및 레이아웃 리플로우 우려) |
| **KaTeX** | 동기식 렌더링으로 속도가 매우 빠름, 가벼움 | 편집기(Editor) 기능 부재, 단순 렌더링 용도 | **중간** (문제 텍스트 표시용으로만 사용) |
| **MathLive** | **웹 컴포넌트 기반 수식 입력기**, 가상 키보드 커스터마이징 용이, 접근성(ARIA) 지원 우수 | 초기 설정 복잡성 존재 | **최상** (입력기 코어로 채택) |

**\[결정된 아키텍처\]**

* **입력 엔진:** **MathLive**를 핵심 엔진으로 채택합니다. MathLive는 \<math-field\>라는 웹 컴포넌트를 제공하여 개발자가 키패드 UI를 완전히 커스터마이징(Custom Virtual Keyboard)할 수 있게 해주며, LaTeX 뿐만 아니라 MathJSON 포맷으로의 수출입을 지원하여 데이터 처리가 용이합니다.16  
* **문제 표시:** 정적인 문제 텍스트의 렌더링에는 **KaTeX**를 사용하여 렌더링 속도를 극대화합니다.6

### **5.2 프론트엔드 프레임워크 및 PWA 전략**

* **Framework:** **React**를 기반으로 하여 컴포넌트 재사용성을 높입니다. 수식 입력 필드, 키패드, 문제 카드를 독립적인 컴포넌트로 관리합니다.  
* **PWA (Progressive Web App):** 앱스토어 설치 없이도 홈 화면에 아이콘을 추가하여 네이티브 앱처럼 사용할 수 있게 합니다. 서비스 워커(Service Worker)를 활용하여 네트워크가 불안정한 교실 환경에서도 문제 데이터가 캐싱(Caching)되어 끊김 없는 풀이 경험을 제공합니다.7  
* **터치 최적화:** 모바일 브라우저의 고질적인 300ms 터치 지연을 제거하기 위해 FastClick 기법을 적용하거나 React의 OnTouchStart 이벤트를 적극 활용하여 즉각적인 반응성을 확보합니다.15

### **5.3 반응형 디자인과 기기 호환성**

* **뷰포트(Viewport) 관리:** 모바일 사파리(iOS) 등에서 입력창 포커스 시 화면이 확대되는 현상을 방지하기 위해 \<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"\> 태그를 적용하여 의도치 않은 레이아웃 붕괴를 막습니다.21  
* **다크 모드 지원:** 토스의 디자인 시스템과 마찬가지로, 시스템 설정에 따른 다크 모드를 완벽 지원합니다. 특히 야간 자율학습 시 눈의 피로를 줄이기 위해 고대비 명암비(High Contrast Ratio)를 준수합니다.

## **6\. 경쟁 서비스 벤치마킹 및 차별화 요소**

기존의 수학 문제 풀이 앱들과 비교하여 본 기획안이 갖는 차별점을 명확히 합니다.

| 비교 항목 | QANDA / Photomath | GeoGebra / Desmos | 본 기획 (Toss Style) |
| :---- | :---- | :---- | :---- |
| **주요 목적** | 사진 촬영을 통한 문제 검색 및 풀이 확인 | 그래프 시각화 및 공학적 탐구 | **평가 및 학습 데이터 입력 (OMR)** |
| **입력 방식** | 카메라 OCR 중심, 보조적인 키패드 | 함수 그래프를 그리기 위한 복잡한 명령어 입력 | **한국 교육과정에 최적화된 직관적 단답형 입력** |
| **UI 복잡도** | 기능이 많아 메뉴가 복잡함 | 전문가용 툴에 가까워 진입장벽 높음 | **불필요한 기능 제거, 학습 단계별 맞춤 UI** |
| **접근성** | 시각적 정보 위주 | 마우스/키보드 친화적 (데스크탑 중심) | **모바일 터치 최적화, 스크린 리더 지원** |

**\[차별화 포인트\]**

1. **한국형 수식 최적화:** 해외 앱들이 지원하지 않는 한국식 대분수 표기나 교육과정 특유의 정답 형식을 완벽하게 지원합니다.  
2. **로그인 없는 접근성 (Passwordless):** 토스가 공인인증서를 없앴듯이, 복잡한 회원가입 절차 없이 '학생 식별 코드'나 '임시 QR 로그인' 만으로 즉시 시험에 응시할 수 있는 간편 인증 흐름을 도입합니다.26 이는 교실 현장에서 교사가 학생들을 빠르게 접속시키는 데 결정적인 이점을 제공합니다.

## **7\. 향후 확장성 및 데이터 활용 방안**

### **7.1 필기 인식(Handwriting Recognition)의 도입**

현재 기획은 키패드 입력을 중심으로 하지만, 향후 태블릿 사용자를 위해 손글씨 인식 기능을 추가할 수 있습니다. MathLive는 기본적으로 필기 인식 모듈과의 통합을 지원하므로, 학생이 수식을 그리면 이를 자동으로 LaTeX로 변환하여 입력창에 채워주는 하이브리드 입력 방식을 구현할 수 있습니다.16

### **7.2 학습 데이터 분석을 통한 개인화**

입력된 데이터를 바탕으로 학생의 취약점을 분석합니다. 단순히 정답/오답 여부뿐만 아니라, '입력 소요 시간', '지우기 버튼 사용 횟수' 등의 행동 데이터를 수집하여 "이 학생은 분수 계산에서 주저하는 경향이 있다"와 같은 정성적 인사이트를 도출하고 교사에게 리포트로 제공합니다. 이는 '데이터 중심 디자인'이라는 토스의 철학을 교육적 가치로 확장하는 것입니다.6

## **8\. 결론**

본 보고서에서 제안한 '모바일 웹앱용 OMR 및 수학 키패드'는 기술적 화려함보다는 사용자의 본질적 니즈인 '편리하고 정확한 입력'에 집중한 결과물입니다. 토스(Toss)의 심플리시티 원칙을 교육 도구에 적용함으로써, 우리는 학생들이 복잡한 인터페이스와 싸우는 대신 수학 문제 자체에 몰입할 수 있는 환경을 제공할 수 있습니다.

한국 수학 교육과정에 대한 깊은 이해를 바탕으로 설계된 적응형 키패드, 모바일 환경에 최적화된 웹 기술(MathLive, React PWA), 그리고 사용자를 배려하는 마이크로 인터랙션의 결합은 기존 에듀테크 시장에 새로운 UX 표준을 제시할 것입니다. 이는 단순한 도구의 개선을 넘어, 학습 경험 자체를 혁신하는 중요한 마일스톤이 될 것입니다.

#### **참고 자료**

1. Complexity of Simplicity: What Really Is Behind Simple UI/UX Design \- Eleken, 12월 6, 2025에 액세스, [https://www.eleken.co/blog-posts/the-complexity-of-simplicity-in-ui-ux-design](https://www.eleken.co/blog-posts/the-complexity-of-simplicity-in-ui-ux-design)  
2. Mobile First Web Design: The Only Way to Develop (Or Is It?) \- Topflight Apps, 12월 6, 2025에 액세스, [https://topflightapps.com/ideas/mobile-first-design-guide/](https://topflightapps.com/ideas/mobile-first-design-guide/)  
3. UX/UI Best Practices for Modern Mobile App Design | by Carlos Smith \- Medium, 12월 6, 2025에 액세스, [https://medium.com/@CarlosSmith24/ux-ui-best-practices-for-modern-mobile-app-design-4d927ba7424a](https://medium.com/@CarlosSmith24/ux-ui-best-practices-for-modern-mobile-app-design-4d927ba7424a)  
4. Toss Launches Season 4 of Online Design Conference 'Simplicity' \- 금융이 알고 싶을 때, 토스피드, 12월 6, 2025에 액세스, [https://toss.im/tossfeed/article/simplicity4\_](https://toss.im/tossfeed/article/simplicity4_)  
5. Toss Simplicity 25 \- Design Compass, 12월 6, 2025에 액세스, [https://designcompass.org/en/2025/04/28/toss-simplicity/](https://designcompass.org/en/2025/04/28/toss-simplicity/)  
6. How Toss Became a Design Powerhouse: 10 Years of UX Evolution | by Kloudy | Medium, 12월 6, 2025에 액세스, [https://medium.com/@posinity/how-toss-became-a-design-powerhouse-10-years-of-ux-evolution-e9fc0c51d180](https://medium.com/@posinity/how-toss-became-a-design-powerhouse-10-years-of-ux-evolution-e9fc0c51d180)  
7. What is Mobile First? — updated 2025 | IxDF \- The Interaction Design Foundation, 12월 6, 2025에 액세스, [https://www.interaction-design.org/literature/topics/mobile-first](https://www.interaction-design.org/literature/topics/mobile-first)  
8. 12월 6, 2025에 액세스, [https://www.ecorn.agency/blog/mobile-first-design-principles\#:\~:text=At%20its%20heart%2C%20the%20mobile,start%20with%20a%20small%20backpack.](https://www.ecorn.agency/blog/mobile-first-design-principles#:~:text=At%20its%20heart%2C%20the%20mobile,start%20with%20a%20small%20backpack.)  
9. Mobile Design Patterns | Best Practices \- Page Flows, 12월 6, 2025에 액세스, [https://pageflows.com/resources/mobile-design-patterns/](https://pageflows.com/resources/mobile-design-patterns/)  
10. \[Hands-On\] PhotoMath 2.0 Gets Material Design And A New Keyboard, Still Feels Like A Gifted Mathlete Living Inside Your Phone, 12월 6, 2025에 액세스, [https://www.androidpolice.com/2016/03/08/hands-on-photomath-2-0-gets-material-design-and-a-new-keyboard-still-feels-like-a-gifted-mathlete-living-inside-your-phone/](https://www.androidpolice.com/2016/03/08/hands-on-photomath-2-0-gets-material-design-and-a-new-keyboard-still-feels-like-a-gifted-mathlete-living-inside-your-phone/)  
11. Korea, Rep. of \- The Mathematics Curriculum in Primary and Lower Secondary Grades – TIMSS 2015 Encyclopedia, 12월 6, 2025에 액세스, [https://timssandpirls.bc.edu/timss2015/encyclopedia/countries/korea/the-mathematics-curriculum-in-primary-and-lower-secondary-grades/](https://timssandpirls.bc.edu/timss2015/encyclopedia/countries/korea/the-mathematics-curriculum-in-primary-and-lower-secondary-grades/)  
12. School Mathematics Curriculum in Korea, 12월 6, 2025에 액세스, [https://tatagyes.wordpress.com/wp-content/uploads/2007/10/115181\_kurikulum-korea.pdf](https://tatagyes.wordpress.com/wp-content/uploads/2007/10/115181_kurikulum-korea.pdf)  
13. An overview of the Korea's 2022 revised mathematics curriculum, 12월 6, 2025에 액세스, [http://acme.ecnu.edu.cn/\_upload/article/files/aa/f8/00728d4c48ab99037551de4be12c/44ba7b6a-c295-4db5-9542-ead57ac88450.pdf](http://acme.ecnu.edu.cn/_upload/article/files/aa/f8/00728d4c48ab99037551de4be12c/44ba7b6a-c295-4db5-9542-ead57ac88450.pdf)  
14. MathJax | Beautiful math in all browsers., 12월 6, 2025에 액세스, [https://www.mathjax.org/](https://www.mathjax.org/)  
15. Mobile Navigation Best Practices, Patterns & Examples (2026) \- Design Studio UI/UX, 12월 6, 2025에 액세스, [https://www.designstudiouiux.com/blog/mobile-navigation-ux/](https://www.designstudiouiux.com/blog/mobile-navigation-ux/)  
16. mathlive \- NPM, 12월 6, 2025에 액세스, [https://www.npmjs.com/package/mathlive](https://www.npmjs.com/package/mathlive)  
17. Essential Maths App for Students: QANDA Review \- Lemon8-app, 12월 6, 2025에 액세스, [https://www.lemon8-app.com/@peachie.suga/7425047439193080325?region=us](https://www.lemon8-app.com/@peachie.suga/7425047439193080325?region=us)  
18. mathlive vs mdast-util-math vs react-katex | OpenText Core SCA \- Debricked, 12월 6, 2025에 액세스, [https://debricked.com/select/compare/npm-react-katex-vs-npm-mathlive-vs-npm-mdast-util-math](https://debricked.com/select/compare/npm-react-katex-vs-npm-mathlive-vs-npm-mdast-util-math)  
19. compare performance MathJax vs MathQuill vs Katex \- Stack Overflow, 12월 6, 2025에 액세스, [https://stackoverflow.com/questions/27217242/compare-performance-mathjax-vs-mathquill-vs-katex](https://stackoverflow.com/questions/27217242/compare-performance-mathjax-vs-mathquill-vs-katex)  
20. arnog/mathlive: Web components for math display and input \- GitHub, 12월 6, 2025에 액세스, [https://github.com/arnog/mathlive](https://github.com/arnog/mathlive)  
21. Desmos API v1.11 documentation, 12월 6, 2025에 액세스, [https://www.desmos.com/api](https://www.desmos.com/api)  
22. Desmos API v1.3 documentation, 12월 6, 2025에 액세스, [https://www.desmos.com/api/v1.3/docs/index.html](https://www.desmos.com/api/v1.3/docs/index.html)  
23. QANDA: AI Math & Study Helper \- Apps on Google Play, 12월 6, 2025에 액세스, [https://play.google.com/store/apps/details?id=com.mathpresso.qanda\&hl=en\_US](https://play.google.com/store/apps/details?id=com.mathpresso.qanda&hl=en_US)  
24. Use Math keyboard to input a problem \- Photomath Help, 12월 6, 2025에 액세스, [https://support.google.com/photomath/answer/14335006?hl=en](https://support.google.com/photomath/answer/14335006?hl=en)  
25. Tips & tricks \- GeoGebra, 12월 6, 2025에 액세스, [https://www.geogebra.org/m/HQEJqFRa](https://www.geogebra.org/m/HQEJqFRa)  
26. Drag & Drop Passwordless Authentication Platform \- Descope, 12월 6, 2025에 액세스, [https://www.descope.com/use-cases/passwordless-authentication](https://www.descope.com/use-cases/passwordless-authentication)  
27. Passwordless Authentication made easy with Cognito: a step-by-step guide, 12월 6, 2025에 액세스, [https://theburningmonk.com/2023/03/passwordless-authentication-made-easy-with-cognito-a-step-by-step-guide/](https://theburningmonk.com/2023/03/passwordless-authentication-made-easy-with-cognito-a-step-by-step-guide/)