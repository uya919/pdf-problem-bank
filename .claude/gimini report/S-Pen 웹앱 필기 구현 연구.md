# **웹 기반 환경에서의 고정밀 스타일러스 입력 처리 및 팜 리젝션 구현 아키텍처 분석: Excalidraw와 Galaxy Tab S-Pen 활용 사례를 중심으로**

## **1\. 서론: 웹과 네이티브 입력 체계의 융합**

현대 모바일 컴퓨팅 환경에서 입력 장치의 다양성은 소프트웨어 아키텍처의 복잡성을 기하급수적으로 증가시켰습니다. 과거의 웹은 마우스와 키보드라는 이진적 입력 도구에 최적화되어 있었으나, 스마트폰과 태블릿의 대중화는 정전식 터치(Capacitive Touch) 인터페이스를 웹의 표준으로 끌어들였습니다. 더 나아가, 삼성 갤럭시 탭(Galaxy Tab) 시리즈의 S-Pen이나 Apple의 Pencil과 같은 전자기 공명(EMR: Electro-Magnetic Resonance) 및 능동형 정전식(Active Capacitive) 스타일러스의 등장은 웹 애플리케이션(Web Application)에 새로운 도전 과제를 제시했습니다.

사용자가 제기한 핵심 현상, 즉 "웹 기반의 오픈소스 화이트보드 도구인 Excalidraw가 갤럭시 탭 환경에서 손가락 터치는 무시하고 S-Pen 입력만을 필기로 인식하는 메커니즘"은 단순한 오류나 우연이 아닌, 고도로 설계된 **입력 의도 파악(Input Intent Disambiguation)** 알고리즘의 결과입니다. 네이티브 앱(Native App)은 운영체제(OS) 수준에서 하드웨어 드라이버에 직접 접근하여 입력 도구를 구분할 수 있는 반면, 웹 앱은 브라우저라는 샌드박스(Sandbox) 위에서 구동됨에도 불구하고 네이티브에 준하는 입력 구분이 가능해졌습니다. 이는 W3C의 포인터 이벤트(Pointer Events) 표준과 이를 구현하는 브라우저 엔진(Blink, WebKit 등), 그리고 애플리케이션 레벨에서의 상태 관리 로직이 정교하게 맞물린 결과입니다.

본 연구 리포트는 Excalidraw가 어떻게 브라우저 환경의 제약을 극복하고 S-Pen의 고유한 하드웨어 특성을 식별하여 '필기'와 '제스처'를 분리해내는지에 대한 기술적 아키텍처를 심층 분석합니다. 이를 위해 입력 장치의 물리적 특성부터 브라우저의 이벤트 루프(Event Loop), 렌더링 파이프라인(Rendering Pipeline), 그리고 사용자 경험(UX) 최적화 전략에 이르기까지 전 계층을 포괄적으로 다룹니다.

## ---

**2\. 하드웨어 추상화 계층과 입력 기술의 이해**

웹 애플리케이션이 S-Pen과 손가락을 구분하는 원리를 이해하기 위해서는 먼저 하드웨어 레벨에서 두 입력이 어떻게 다르게 처리되는지, 그리고 안드로이드 운영체제가 이를 어떻게 브라우저에 전달하는지 파악해야 합니다.

### **2.1 듀얼 디지타이저(Dual Digitizer) 구조**

갤럭시 탭과 같은 현대적인 스타일러스 지원 태블릿은 디스플레이 패널 아래에 두 개의 서로 다른 센서 레이어를 적층하고 있습니다.

| 센서 레이어 | 기술 방식 | 감지 대상 | 주요 특징 |
| :---- | :---- | :---- | :---- |
| **정전식 터치 패널 (Capacitive)** | 상호 정전 용량 (Mutual Capacitance) | 손가락 (전도성 물체) | 다중 터치 지원, 접촉 면적(Radius)이 넓고 불규칙함. 압력 감지 불가(일반적). |
| **전자기 공명 패널 (EMR)** | 유도 기전력 (Inductive Resonance) | S-Pen (수동형 코일 내장) | 호버링(Hovering) 감지, 4096단계 압력 감지, 펜의 기울기(Tilt) 감지, 팜 리젝션의 물리적 기반 제공. |

S-Pen은 배터리가 없는 수동형 장치이지만, 화면 뒤의 EMR 패널에서 발생시키는 자기장을 통해 전력을 공급받고 자신의 위치와 압력 정보를 무선으로 송신합니다. 이 물리적 신호는 안드로이드 커널의 입력 드라이버에 의해 서로 다른 이벤트 스트림으로 분리됩니다. 손가락은 TOOL\_TYPE\_FINGER로, S-Pen은 TOOL\_TYPE\_STYLUS로 태깅되어 상위 계층으로 전달됩니다.

### **2.2 안드로이드의 MotionEvent와 브라우저의 해석**

안드로이드 네이티브 앱은 android.view.MotionEvent 클래스를 통해 이 정보를 직접 수신합니다. 그러나 웹 앱은 브라우저(Chrome, Samsung Internet 등)를 통해야만 합니다. 브라우저는 운영체제로부터 전달받은 로우 레벨(Low-level) 이벤트를 웹 표준 이벤트로 변환하는 **이벤트 브리지(Event Bridge)** 역할을 수행합니다.

과거의 웹 브라우저는 이 변환 과정에서 모든 입력을 MouseEvent나 TouchEvent로 단순화하여 매핑했습니다. 이로 인해 스타일러스 또한 단순히 "정밀한 손가락"으로 인식되었고, S-Pen으로 글씨를 쓰려 하면 손바닥이 닿은 곳에도 점이 찍히거나 화면이 스크롤되는 문제가 발생했습니다. 이러한 한계를 극복하기 위해 도입된 것이 바로 **Pointer Events API**입니다.1

## ---

**3\. 핵심 기술: W3C Pointer Events API와 입력 분리**

Excalidraw가 S-Pen만을 필기 도구로 인식하게 만드는 기술적 중추는 **W3C Pointer Events Level 3** 명세입니다. 이 API는 마우스, 터치, 펜 입력을 하나의 통합된 이벤트 모델로 추상화하면서도, 각 입력 장치의 고유한 물리적 특성을 식별할 수 있는 메타데이터를 보존합니다.

### **3.1 pointerType 속성을 통한 하드웨어 식별**

사용자가 화면에 접촉할 때 브라우저는 pointerdown, pointermove, pointerup 이벤트를 발생시킵니다. 이때 전달되는 PointerEvent 객체는 pointerType이라는 읽기 전용 속성을 포함하고 있으며, 이것이 바로 S-Pen과 손가락을 구분하는 결정적 키(Key)가 됩니다.1

* **"pen"**: 브라우저가 안드로이드 OS로부터 TOOL\_TYPE\_STYLUS 신호를 받았음을 의미합니다. Excalidraw는 이 값이 확인될 때만 캔버스에 선을 그리는 로직을 수행합니다.  
* **"touch"**: 브라우저가 TOOL\_TYPE\_FINGER 신호를 받았음을 의미합니다. Excalidraw는 펜 모드(Pen Mode)가 활성화된 상태에서 이 이벤트가 들어오면, 그리기를 거부하고 캔버스를 이동(Pan)하거나 확대/축소(Zoom)하는 제스처 로직으로 이벤트를 라우팅합니다.  
* **"mouse"**: 갤럭시 탭에 블루투스 마우스나 트랙패드를 연결했을 때 발생합니다. 일반적으로 펜과 동일한 '그리기' 도구로 간주되거나, PC 환경과 동일한 UX를 제공합니다.

이러한 속성 값의 분리는 단순한 문자열 비교(if (event.pointerType \=== 'pen'))만으로도 네이티브 앱 수준의 입력 구분을 가능하게 합니다.4

### **3.2 압력(Pressure)과 기울기(Tilt) 데이터의 활용**

S-Pen의 필기감을 구현하는 데 있어 단순한 위치 좌표(X, Y) 외에 압력과 기울기 데이터는 필수적입니다. Pointer Events API는 이를 pressure, tiltX, tiltY, azimuthAngle 등의 속성으로 표준화하여 제공합니다.5

* **압력 데이터의 정규화**: 안드로이드 디바이스는 0부터 4096(혹은 그 이상)의 압력 단계를 제공하지만, 웹 브라우저는 이를 0.0(터치 없음)에서 1.0(최대 압력) 사이의 부동 소수점(float) 값으로 정규화하여 전달합니다. 손가락 터치는 대부분 압력 하드웨어가 없으므로 0.5 또는 1.0의 고정된 값을 반환하거나, 일부 기기에서는 접촉 면적에 비례한 가상 압력을 반환하기도 합니다.  
* **틸트(Tilt) 인식**: S-Pen은 EMR 방식을 통해 펜이 화면과 이루는 각도를 감지합니다. Excalidraw와 같은 드로잉 앱은 이 데이터를 활용하여 마커 펜이나 연필 브러시의 형상을 동적으로 변경할 수 있습니다. 예를 들어 펜을 눕혀서 쓰면 선이 굵어지거나 쉐이딩 효과가 나타나는 식입니다.5

### **3.3 이벤트 전파와 기본 동작 제어 (Event Propagation & Default Actions)**

웹 브라우저는 기본적으로 터치 입력을 "스크롤"이나 "확대/축소"와 같은 뷰포트 조작(Viewport Manipulation)으로 해석하려는 경향이 있습니다. S-Pen으로 글씨를 쓰려는데 화면이 아래로 스크롤된다면 필기가 불가능할 것입니다. 이를 방지하기 위해 CSS의 touch-action 속성이 사용됩니다.

CSS

/\* 캔버스 요소에 적용되는 CSS \*/  
canvas {  
  touch-action: none;  
}

touch-action: none;은 브라우저에게 "이 영역에서 발생하는 모든 터치 및 펜 입력에 대해 브라우저의 기본 동작(스크롤, 줌 등)을 수행하지 말고, 모든 데이터를 자바스크립트로 넘겨라"라고 지시하는 명령어입니다.7 Excalidraw는 이 속성을 캔버스 영역에 적용함으로써 S-Pen의 움직임이 스크롤로 오인되는 것을 원천 차단하고, 온전한 드로잉 데이터를 확보합니다.

## ---

**4\. 팜 리젝션(Palm Rejection) 알고리즘과 "펜 모드" 구현**

사용자가 경험한 "손가락으로는 안 써지고 S-Pen으로만 써지는" 현상은 Excalidraw 내부의 소프트웨어적 팜 리젝션 로직인 \*\*펜 모드(Pen Mode)\*\*의 작동 결과입니다.

### **4.1 웹에서의 팜 리젝션 난제**

네이티브 앱은 터치 영역의 크기(Major/Minor Axis)나 모양을 정밀하게 분석하여 손가락인지 손바닥인지 구분할 수 있습니다. 그러나 웹 브라우저의 Touch Events API가 제공하는 radiusX, radiusY 정보는 하드웨어 및 브라우저 버전에 따라 정확도가 매우 떨어지거나 실험적인 기능(Experimental)으로 분류되어 있어 신뢰할 수 없습니다.9 따라서 웹 앱은 단순히 접촉 면적만으로는 완벽한 팜 리젝션을 구현하기 어렵습니다.

### **4.2 모달(Modal) 접근 방식: 배타적 입력 상태**

Excalidraw 개발진은 불확실한 하드웨어 데이터에 의존하는 대신, \*\*상태 기반의 배타적 모드(State-based Exclusive Mode)\*\*를 도입하여 이 문제를 해결했습니다.11

1. **자동 감지(Auto-Detection)**: 사용자가 앱을 켠 직후에는 손가락과 펜 모두 그리기 도구로 작동할 수 있는 대기 상태입니다. 그러나 사용자가 S-Pen을 사용하여 화면을 한 번이라도 터치(pointerdown 이벤트 발생 & pointerType \=== 'pen')하는 순간, 애플리케이션의 상태는 '펜 모드'로 전환됩니다.13  
2. **이벤트 필터링(Event Filtering)**: '펜 모드'가 활성화되면, 이벤트 리스너는 들어오는 모든 포인터 이벤트의 pointerType을 검사합니다.  
   * 입력이 **Pen**인 경우: 드로잉 로직으로 전달하여 획(Stroke)을 생성합니다.  
   * 입력이 **Touch**인 경우: 드로잉 로직을 우회합니다. 대신 제스처 인식기(Gesture Recognizer)로 전달하여 캔버스 패닝(Panning)이나 줌(Zoom) 동작을 수행합니다.

이러한 로직 덕분에 사용자는 S-Pen을 쥐고 손바닥을 화면에 댄 채로 글씨를 쓸 수 있게 됩니다. 손바닥이 화면에 닿아 발생시키는 무수히 많은 touch 이벤트들은 필터링 로직에 의해 무시되거나 미세한 화면 이동으로 처리될 뿐, 잉크 자국을 남기지 않게 되는 것입니다.12

### **4.3 알고리즘 시각화 및 코드 패턴**

이 동작을 의사 코드(Pseudo-code)로 표현하면 다음과 같습니다. 이는 Excalidraw와 같은 React 기반 앱에서 이벤트를 처리하는 전형적인 패턴입니다.

JavaScript

// Excalidraw의 입력 처리 로직 개념도

let isPenMode \= false; // 펜 모드 상태 변수

function onPointerDown(event) {  
  const { pointerType, clientX, clientY } \= event;

  // 1\. S-Pen 감지 시 펜 모드 자동 활성화  
  if (pointerType \=== 'pen') {  
    if (\!isPenMode) {  
      isPenMode \= true;  
      showToast("Pen Mode Activated"); // 사용자 피드백  
    }  
  }

  // 2\. 입력 유형에 따른 분기 처리  
  if (isPenMode) {  
    if (pointerType \=== 'pen') {  
      // S-Pen인 경우에만 그리기 시작  
      startDrawing(clientX, clientY, event.pressure);  
    } else if (pointerType \=== 'touch') {  
      // 손가락(손바닥 포함)은 그리기 무시, 캔버스 이동 준비  
      startPanning(event);  
    }  
  } else {  
    // 펜 모드가 아닐 때는 손가락도 그리기 허용 (또는 설정에 따름)  
    startDrawing(clientX, clientY, event.pressure);  
  }  
}

이러한 소프트웨어적 락(Lock) 메커니즘은 하드웨어 센서의 부정확성을 논리적 규칙으로 보완하는 영리한 전략입니다. 사용자는 별도의 설정 없이 자연스럽게 S-Pen을 사용하기 시작하는 행위만으로 최적화된 입력 환경을 경험하게 됩니다.

## ---

**5\. 고성능 렌더링 파이프라인과 지연 시간(Latency) 최소화**

웹 앱이 네이티브 앱과 유사한 필기감을 제공하기 위해서는 단순히 입력을 구분하는 것을 넘어, 입력된 데이터를 화면에 그리는 속도와 부드러움이 보장되어야 합니다. Excalidraw는 이를 위해 **Coalesced Events(병합된 이벤트)** 처리와 **예측 렌더링(Predictive Rendering)** 기술을 활용합니다.

### **5.1 getCoalescedEvents를 이용한 고해상도 트래킹**

S-Pen 하드웨어는 초당 약 240회(240Hz) 이상의 위치 데이터를 전송합니다. 반면, 일반적인 웹 브라우저의 메인 스레드나 화면 주사율은 60Hz 또는 120Hz에 맞춰져 있습니다. 만약 브라우저가 화면을 갱신하는 타이밍(프레임)에 맞춰 가장 마지막 위치 정보 하나만 자바스크립트로 전달한다면, 빠르게 글씨를 쓸 때 곡선이 각지거나 끊겨 보이는 현상(Aliasing)이 발생합니다.

이를 해결하기 위해 PointerEvent 인터페이스는 getCoalescedEvents() 메서드를 제공합니다.3

* **작동 원리**: 브라우저는 자바스크립트가 바빠서 처리하지 못한 사이(프레임 간격 사이)에 발생한 모든 S-Pen의 미세한 움직임 데이터를 버리지 않고 큐(Queue)에 저장해 둡니다.  
* **구현**: pointermove 이벤트가 발생했을 때, Excalidraw는 단순히 현재 이벤트 객체의 좌표만 읽는 것이 아니라 event.getCoalescedEvents()를 호출하여 그 사이에 있었던 수십 개의 중간 좌표들을 모두 가져옵니다. 이를 순서대로 연결하여 렌더링함으로써, 하드웨어 스펙상의 해상도를 온전히 활용한 부드러운 곡선을 그려냅니다.14

### **5.2 잉크 렌더링 알고리즘 (Perfect Freehand)**

Excalidraw는 입력받은 좌표 점들을 단순히 직선으로 연결하지 않습니다. perfect-freehand와 같은 알고리즘 라이브러리를 사용하여 입력된 점들을 바탕으로 가변 두께를 가진 다각형(Polygon)을 생성합니다. 이때 S-Pen의 압력(pressure) 데이터가 선의 굵기(Weight)를 결정하는 매개변수로 작용하여, 실제 펜으로 종이에 쓰는 것과 같은 아날로그적인 느낌을 모사합니다.

또한, 입력 지연(Input Latency)을 시각적으로 숨기기 위해 마지막 입력 좌표로부터 펜이 이동할 것으로 예상되는 지점까지 짧은 선을 미리 그려주는 **예측 렌더링(Prediction)** 기술도 활용될 수 있습니다. PointerEvent.getPredictedEvents() API가 이를 지원하지만, 구현의 복잡성으로 인해 애플리케이션 레벨에서 자체적인 보간(Interpolation) 알고리즘을 사용하는 경우가 많습니다.15

## ---

**6\. 한계점 분석: S-Pen 버튼과 웹의 제약**

사용자가 삼성 노트와 같은 네이티브 앱에서 경험했던 기능 중 웹 앱에서 완벽하게 구현되지 않는 것이 바로 S-Pen 측면 버튼의 활용입니다.

### **6.1 S-Pen 버튼 이벤트의 파편화**

네이티브 안드로이드 개발 환경에서는 버튼 클릭을 명확한 KeyEvent나 특정 액션으로 수신할 수 있습니다. 그러나 웹 브라우저 환경에서 S-Pen 버튼의 동작은 표준화되어 있지 않으며, 브라우저 제조사(Google, Samsung)의 구현에 따라 다릅니다.16

* **배럴 버튼(Barrel Button) 문제**: W3C 명세상 펜의 버튼은 마우스의 보조 버튼 등으로 매핑되어야 하지만, 실제 안드로이드 크롬 브라우저에서는 버튼을 누른 채 화면을 터치하면 이벤트를 중단시키거나 상황에 맞지 않는 컨텍스트 메뉴(우클릭 메뉴)를 호출해버리는 경우가 많습니다.16  
* **지우개 전환의 어려움**: 많은 사용자가 S-Pen 버튼을 누른 채 문지르면 지우개로 작동하기를 기대합니다. 그러나 웹 앱에서는 버튼 눌림 상태(buttons 속성이나 button 속성)가 터치 시작 시점에 정확히 전달되지 않거나, OS 레벨의 제스처(에어 커맨드 등)와 충돌하여 자바스크립트가 이를 가로채지 못하는 경우가 빈번합니다.18

Excalidraw 커뮤니티에서도 이러한 버튼 활용에 대한 요청이 지속적으로 제기되고 있으나, 이는 웹 표준 API의 한계와 안드로이드 웹뷰의 구현 미비로 인해 "완벽한 해결이 불가능하거나 매우 불안정한" 영역으로 남아 있습니다.19 따라서 Excalidraw는 하드웨어 버튼 대신 화면 내의 UI 툴바를 통해 지우개나 선택 도구로 전환하도록 유도하는 UX를 채택하고 있습니다.

## ---

**7\. 비교 분석: Excalidraw (Web) vs Samsung Notes (Native)**

사용자의 이해를 돕기 위해, 갤럭시 탭에서 구동되는 대표적인 필기 앱인 삼성 노트(Native)와 Excalidraw(Web)의 기술적 차이를 비교 요약합니다.

| 비교 항목 | Samsung Notes (Native App) | Excalidraw (Web App/PWA) | 비고 |
| :---- | :---- | :---- | :---- |
| **개발 언어** | Java / Kotlin / C++ | TypeScript / React / HTML5 | 네이티브는 하드웨어 제어에 유리, 웹은 범용성에 유리. |
| **입력 API** | android.view.MotionEvent | W3C Pointer Events | 웹은 OS 이벤트를 브라우저가 한 번 가공하여 전달함. |
| **펜/터치 구분** | getToolType() 메서드로 완벽 구분 | pointerType 속성으로 구분 ('pen', 'touch') | 웹 앱도 API를 통해 네이티브에 준하는 구분 능력 확보. |
| **팜 리젝션** | 하드웨어 호버링 및 터치 면적 분석 기반 | 포인터 타입 기반의 배타적 모드(Mode) 전환 | 웹은 하드웨어 데이터 접근 제약으로 로직 기반 해결책 사용. |
| **지연 시간** | 초저지연 (Low Latency), OS 버퍼 직접 접근 | 브라우저 렌더링 루프에 의존 (다소 높음) | getCoalescedEvents로 궤적의 부드러움은 보완 가능. |
| **S-Pen 버튼** | 지우개, 에어 액션 등 커스텀 매핑 가능 | 지원 미비, 컨텍스트 메뉴 호출 등 충돌 발생 | 웹 표준의 한계로 인한 기능 제약 존재. |

## ---

**8\. 결론: 웹 기술의 진화와 사용자 경험의 승리**

갤럭시 탭에서 실행되는 Excalidraw가 보여주는 "S-Pen으로만 써지는" 동작은 웹 애플리케이션이 네이티브 앱의 영역이었던 고정밀 하드웨어 제어의 경계를 어떻게 허물고 있는지를 보여주는 훌륭한 사례입니다.

이 현상의 이면에는 다음과 같은 기술적 성취가 내재되어 있습니다:

1. **표준화의 힘**: 제조사(Samsung) 독자 규격이 아닌 W3C 표준(Pointer Events)을 통해 웹 앱이 S-Pen을 '특별한 입력 장치'로 인식할 수 있게 되었습니다.  
2. **알고리즘적 해결**: 하드웨어 센서 데이터의 불완전함을 '펜 모드'라는 소프트웨어적 상태 관리를 통해 극복하고, 효과적인 팜 리젝션을 구현했습니다.  
3. **브라우저의 진화**: CSS touch-action과 같은 속성을 통해 브라우저의 간섭을 배제하고 앱이 입력 주도권을 가질 수 있는 환경이 마련되었습니다.

비록 S-Pen 버튼 활용과 같은 일부 기능에서는 여전히 네이티브 앱 대비 한계가 존재하지만, Excalidraw의 사례는 웹 기술만으로도 충분히 전문적인 수준의 디지털 필기 경험을 제공할 수 있음을 증명합니다. 사용자가 경험한 편리함은 "네이티브가 아니라서 안 되는 것"이 아니라, "웹 기술을 극한으로 활용하여 네이티브처럼 동작하게 만든" 개발자들의 노력의 산물입니다.

### ---

**부록: 참고 문헌 및 소스 데이터**

본 리포트는 다음과 같은 기술 문서와 커뮤니티 데이터를 기반으로 작성되었습니다.

* **W3C Specifications**: Pointer Events Level 3, Touch Events Level 2\.3  
* **MDN Web Docs**: PointerEvent.pointerType, PointerEvent.pressure, CSS touch-action.1  
* **Excalidraw GitHub Repository**: Issues \#4202 (Pen Mode), \#4532 (Palm Rejection), Source Code Logic.12  
* **Browser Implementation Data**: Chrome/Blink 엔진의 이벤트 처리 방식 및 getCoalescedEvents 지원 현황.3  
* **User Community Feedback**: Obsidian-Excalidraw 플러그인 및 모바일 사용성 관련 토론.13

#### **참고 자료**

1. PointerEvent: pointerType property \- Web APIs | MDN, 12월 9, 2025에 액세스, [https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/pointerType)  
2. The Complete Guide to Pointer Events. | by Carlos A. Rojas \- Client-Side JavaScript, 12월 9, 2025에 액세스, [https://blog.carlosrojas.dev/the-complete-guide-to-pointer-events-21e44b2f9da0](https://blog.carlosrojas.dev/the-complete-guide-to-pointer-events-21e44b2f9da0)  
3. Pointer Events \- W3C, 12월 9, 2025에 액세스, [https://www.w3.org/TR/pointerevents/](https://www.w3.org/TR/pointerevents/)  
4. Can I recognise (graphic tablet) Pen Pressure in Javascript? \- Stack Overflow, 12월 9, 2025에 액세스, [https://stackoverflow.com/questions/10507341/can-i-recognise-graphic-tablet-pen-pressure-in-javascript](https://stackoverflow.com/questions/10507341/can-i-recognise-graphic-tablet-pen-pressure-in-javascript)  
5. PointerEvent: tiltX property \- Web APIs | MDN, 12월 9, 2025에 액세스, [https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/tiltX](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/tiltX)  
6. Hacking Surface Pen's eraser support into Excalidraw \- Thai Pangsakulyanont, 12월 9, 2025에 액세스, [https://dt.in.th/ExcalidrawSurfacePen](https://dt.in.th/ExcalidrawSurfacePen)  
7. touch-action \- CSS \- MDN Web Docs, 12월 9, 2025에 액세스, [https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)  
8. touch-action \- CSS-Tricks, 12월 9, 2025에 액세스, [https://css-tricks.com/almanac/properties/t/touch-action/](https://css-tricks.com/almanac/properties/t/touch-action/)  
9. Touch events \- Web APIs | MDN, 12월 9, 2025에 액세스, [https://developer.mozilla.org/en-US/docs/Web/API/Touch\_events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)  
10. Touch event \- radius? (SOLVED) \- Questions \- Defold game engine forum, 12월 9, 2025에 액세스, [https://forum.defold.com/t/touch-event-radius-solved/65536](https://forum.defold.com/t/touch-event-radius-solved/65536)  
11. Three for three \- Excalidraw Blog, 12월 9, 2025에 액세스, [https://plus.excalidraw.com/blog/year-three](https://plus.excalidraw.com/blog/year-three)  
12. Pen mode (palm rejection) · Issue \#4202 \- GitHub, 12월 9, 2025에 액세스, [https://github.com/excalidraw/excalidraw/issues/4202](https://github.com/excalidraw/excalidraw/issues/4202)  
13. Enable Palm Rejections immediately when in Freedraw · Issue \#4808 \- GitHub, 12월 9, 2025에 액세스, [https://github.com/excalidraw/excalidraw/issues/4808](https://github.com/excalidraw/excalidraw/issues/4808)  
14. PointerEvent: getCoalescedEvents() method \- Web APIs | MDN, 12월 9, 2025에 액세스, [https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents)  
15. Pointer Events \- W3C on GitHub, 12월 9, 2025에 액세스, [https://w3c.github.io/pointerevents/](https://w3c.github.io/pointerevents/)  
16. How to handle Samsung S-Pen button event in the browser (Javascript)? \- Stack Overflow, 12월 9, 2025에 액세스, [https://stackoverflow.com/questions/62235642/how-to-handle-samsung-s-pen-button-event-in-the-browser-javascript](https://stackoverflow.com/questions/62235642/how-to-handle-samsung-s-pen-button-event-in-the-browser-javascript)  
17. Pen Button Events · Issue \#290 · w3c/pointerevents \- GitHub, 12월 9, 2025에 액세스, [https://github.com/w3c/pointerevents/issues/290](https://github.com/w3c/pointerevents/issues/290)  
18. S Pen compatibility in excalidraw. : r/ObsidianMD \- Reddit, 12월 9, 2025에 액세스, [https://www.reddit.com/r/ObsidianMD/comments/1bbxqja/s\_pen\_compatibility\_in\_excalidraw/](https://www.reddit.com/r/ObsidianMD/comments/1bbxqja/s_pen_compatibility_in_excalidraw/)  
19. Galaxy Tab S9 FE+: Can't get any spen specific events \- Samsung Developer Forums, 12월 9, 2025에 액세스, [https://forum.developer.samsung.com/t/galaxy-tab-s9-fe-cant-get-any-spen-specific-events/38112](https://forum.developer.samsung.com/t/galaxy-tab-s9-fe-cant-get-any-spen-specific-events/38112)  
20. Palm rejection · Issue \#4532 \- GitHub, 12월 9, 2025에 액세스, [https://github.com/excalidraw/excalidraw/issues/4532](https://github.com/excalidraw/excalidraw/issues/4532)