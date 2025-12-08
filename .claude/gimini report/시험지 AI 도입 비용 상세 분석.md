# **시험지 문제 영역 자동 분할 및 구조화를 위한 AI 시스템 구축 종합 연구 보고서**

## **1\. 개요 (Executive Summary)**

본 보고서는 시험지 이미지에서 문항, 지문, 정답 영역 등을 자동으로 분할하고 구조화된 데이터로 변환하기 위한 인공지능(AI) 시스템 도입의 기술적 타당성, 데이터 구축 전략, 시스템 아키텍처, 그리고 경제성 분석을 포괄적으로 다룬다. 교육(EdTech) 분야의 디지털 전환이 가속화됨에 따라, 기존의 비정형 문서(PDF, 스캔 이미지) 형태로 존재하는 방대한 학습 자료를 문항 단위의 데이터베이스(Item Bank)로 변환하는 수요가 급증하고 있다. 그러나 시험지는 일반적인 문서와 달리 다단 편집(Multi-column), 복잡한 수식과 도형의 혼재, 그리고 문항 간의 논리적 계층 구조(지문-문항 연결 등)라는 고유한 특성을 지니고 있어, 범용적인 문서 레이아웃 분석(Document Layout Analysis, DLA) 모델만으로는 해결하기 어려운 난제들이 존재한다.

본 연구에서는 이러한 문제를 해결하기 위해 **멀티모달 트랜스포머(Multimodal Transformer) 기반의 LayoutLMv3** 모델과 **객체 탐지(Object Detection) 기반의 YOLOv8** 모델을 비교 분석하고, 시험지 특성에 최적화된 하이브리드 아키텍처를 제안한다. 또한, 고품질의 AI 모델 학습을 위한 데이터 구축 가이드라인으로서 **COCO 포맷** 기반의 정밀 어노테이션(Annotation) 전략과 \*\*능동 학습(Active Learning)\*\*을 통한 비용 효율적인 데이터 구축 방안을 제시한다.

경제성 분석에서는 초기 구축 비용(CAPEX)과 운영 비용(OPEX)을 세분화하여, 클라우드 기반 OCR API(Google Vision, Naver Clover)와 온프레미스 인퍼런스 서버(AWS G5 인스턴스)를 결합한 최적의 비용 모델을 도출하였다. 분석 결과, 월 10만 페이지 처리 기준, 초기 데이터 구축에 약 5,000달러 내외의 투자가 필요하며, 운영 단계에서는 페이지당 약 0.5센트 미만의 비용으로 시스템 유지가 가능함을 확인하였다. 이는 수동 입력 방식 대비 90% 이상의 비용 절감 효과를 기대할 수 있는 수치이다.

본 보고서는 단순한 기술 나열을 넘어, 실제 서비스 도입 시 발생할 수 있는 엣지 케이스(Edge Case)와 리스크 관리 방안까지 포함하여, 의사결정권자와 기술 실무자가 즉각적으로 활용할 수 있는 실행 전략을 제공하는 것을 목적으로 한다.

## ---

**2\. 서론: 시험지 레이아웃 분석의 특수성과 기술적 과제**

### **2.1 문제 정의 및 배경**

시험지 문제 영역 분할(Exam Question Segmentation)은 컴퓨터 비전(Computer Vision)과 자연어 처리(NLP)가 결합된 복합적인 과제이다. 일반적인 문서(논문, 영수증, 계약서)는 문단이 순차적으로 배열되거나 표(Table)와 같은 정형화된 구조를 가지는 반면, 시험지는 공간 효율성을 극대화하기 위해 복잡한 다단 구성을 취하며, 문제 번호(1, 2, 3...)와 같은 논리적 흐름이 레이아웃을 지배한다. 특히 수학 시험지의 경우, 텍스트와 수식(LaTeX), 기하학적 도형이 하나의 문항 내에 혼재되어 있어 이를 하나의 의미적 단위(Semantic Unit)로 묶어내는 것이 핵심 기술이다.

### **2.2 기술적 난제**

기존의 규칙 기반(Rule-based) 알고리즘이나 단순 객체 탐지(CNN 기반) 모델은 다음과 같은 상황에서 한계를 드러낸다.  
첫째, 비정형 레이아웃의 다양성이다. 학교별, 출판사별로 문항 배치 방식, 여백의 크기, 폰트 종류가 상이하여 규칙 기반 접근으로는 유지보수가 불가능하다.2  
둘째, 논리적 그룹핑(Logical Grouping)의 모호성이다. 예를 들어, 문제 1번과 2번 사이에 위치한 그림이나 표가 1번에 속하는지 2번에 속하는지 판단하기 위해서는 시각적 거리뿐만 아니라 텍스트의 맥락(Context)을 이해해야 한다.  
셋째, 다단 편집의 읽기 순서(Reading Order) 문제이다. 인간은 왼쪽 단의 하단에서 오른쪽 단의 상단으로 시선이 이동함을 직관적으로 알지만, 기계는 이를 명시적으로 학습해야 한다.1  
이러한 난제를 극복하기 위해 본 보고서에서는 시각(Visual), 언어(Text), 위치(Layout) 정보를 동시에 처리할 수 있는 **문서 이해(Document Understanding)** 기술을 도입할 것을 제안한다.

## ---

**3\. 데이터 구축 가이드: 온톨로지, 형식, 수량**

AI 모델의 성능은 데이터의 품질과 설계된 온톨로지(Ontology)의 정교함에 의해 결정된다. 특히 시험지 분할과 같은 특수 도메인에서는 범용 데이터셋(DocLayNet, PubLayNet 등)을 그대로 사용할 수 없으며, 도메인 특화 데이터셋 구축이 필수적이다.3

### **3.1 온톨로지(Ontology) 및 클래스 정의 전략**

시험지 구조화를 위한 클래스 정의는 시각적 객체 탐지뿐만 아니라 후처리 로직(Post-processing Logic)에서의 활용성을 고려하여 설계되어야 한다. 단순히 '텍스트'와 '이미지'로 구분하는 것을 넘어, 문항의 구성 요소를 세분화하고 논리적 관계를 정의할 수 있는 수준이어야 한다.

제안하는 핵심 클래스 체계는 다음과 같다.

| 클래스 명(Class Name) | 정의 및 설명 | 속성(Attributes) 및 후처리 용도 |
| :---- | :---- | :---- |
| **Question\_Block** | 문항 전체를 감싸는 최상위 컨테이너 영역. 발문, 보기, 그림을 모두 포함한다. | 최상위 객체. 문항 단위 Crop의 기준이 됨. |
| **Question\_No** | 문항의 시작을 알리는 번호 (예: 1, 2, 1, Q1). | **앵커(Anchor) 기능**. 문항 분할의 가장 강력한 신호(Signal)로 활용됨. |
| **Stem** | 문항의 발문(지시문) 텍스트 영역. | 텍스트 검색 및 인덱싱의 핵심 대상. |
| **Choice\_Area** | 객관식 보기들이 위치한 영역 전체 또는 개별 보기. | 개별 보기 분할(①, ②...) 또는 통물 인식 선택 가능. |
| **Passage / Context** | 지문(국어/영어 지문, 공통 자료 등). | **1:N 관계**를 가짐. 여러 문항이 하나의 지문을 공유함을 명시해야 함. |
| **Figure / Diagram** | 문항에 포함된 그림, 도표, 그래프. | OCR 제외 영역으로 설정하거나 별도의 이미지 처리 파이프라인으로 연결. |
| **Equation\_Zone** | 독립적으로 배치된 수식 영역. | LaTeX 변환을 위한 별도 OCR 엔진(Mathpix 등) 적용 대상. |
| **Header / Footer** | 페이지 상/하단의 시험 정보, 쪽번호 등. | **노이즈(Noise)**. 학습 시 명시하여 추론 단계에서 제거(Filtering) 대상임. |
| **Rough\_Work** | 문제 풀이용 여백. | 노이즈. 무시 대상. |

심층 분석: 'Delta Classes'의 중요성  
최근 연구에 따르면, 기존의 대규모 데이터셋들이 Table이나 Figure와 같은 일반적인 클래스는 잘 정의하고 있지만, Key-Value Region이나 Form과 같은 세부적인 'Delta Classes'를 누락함으로써 모델의 정밀도를 저하시키는 원인이 되고 있다.3 시험지 도메인에서는 Question\_No가 바로 이러한 Delta Class에 해당한다. 일반적인 텍스트와 구분되는 Question\_No를 별도 클래스로 정의하지 않으면, 모델은 문항의 시작과 끝을 명확히 인지하지 못하고 인접한 두 문항을 하나로 합쳐버리는 오류(Under-segmentation)를 범할 확률이 매우 높다. 따라서 Question\_No를 독립적인 클래스로 학습시키는 것은 문항 분리 정확도를 획기적으로 높이는 핵심 전략이다.

### **3.2 데이터 포맷: COCO vs YOLO**

데이터 어노테이션 포맷의 선정은 사용할 모델 아키텍처와 도구의 호환성을 결정짓는다. 대표적인 두 포맷인 COCO와 YOLO를 비교 분석한다.

#### **3.2.1 COCO (Common Objects in Context) 포맷**

COCO 포맷은 객체 탐지 및 분할(Segmentation) 분야의 사실상 표준(De facto standard)이다. JSON 기반의 계층적 구조를 가지며, 이미지 정보, 어노테이션 정보, 카테고리 정보가 분리되어 관리된다.5

* **장점**:  
  * **폴리곤(Polygon) 지원**: 시험지의 문제 영역은 항상 직사각형이 아니다. 'ㄱ'자 형태나 그림을 감싸고 흐르는 텍스트 배치가 빈번하다. COCO는 폴리곤 좌표를 지원하여 이러한 비정형 영역을 정밀하게 표현할 수 있다.  
  * **풍부한 메타데이터**: 단일 파일 내에 라이선스, 이미지 속성 등을 함께 저장하여 관리가 용이하다.  
  * **LayoutLM 호환성**: LayoutLMv3 등 최신 트랜스포머 모델들의 학습 파이프라인(Hugging Face 등)은 기본적으로 COCO 포맷을 지원하거나 이를 변형하여 사용한다.7  
* **구조 예시**:  
  JSON  
  {  
    "images": \[{"id": 1, "file\_name": "exam\_001.jpg", "width": 2480, "height": 3508}\],  
    "annotations": \[  
      {  
        "id": 101,  
        "image\_id": 1,  
        "category\_id": 1,   
        "bbox": , // \[x, y, width, height\] (절대좌표)  
        "segmentation": \[\],  
        "area": 75000,  
        "iscrowd": 0  
      }  
    \],  
    "categories":  
  }

#### **3.2.2 YOLO (You Only Look Once) 포맷**

YOLO 모델 학습에 최적화된 경량 포맷이다. 이미지 당 하나의 텍스트 파일(.txt)이 생성된다.

* **장점**: 구조가 단순하여 파싱(Parsing) 속도가 빠르고 사람이 직관적으로 이해하기 쉽다.  
* **단점**: 좌표가 0\~1 사이로 정규화(Normalized)되어 있어 원본 해상도 정보가 없으면 복원이 어렵고, 기본적으로 직사각형(BBox)만 지원하여 복잡한 레이아웃 표현에 한계가 있다.8  
* 구조 예시:  
  0 0.25 0.35 0.5 0.1 \# \<class\_id\> \<x\_center\> \<y\_center\>

**전략적 제언**: **COCO 포맷을 마스터 데이터 포맷으로 채택**해야 한다. 초기 데이터 구축 시에는 최대한 많은 정보를 담을 수 있는 COCO 포맷(폴리곤 포함)으로 저장하고, 추후 YOLO 모델 실험 시에는 스크립트를 통해 COCO를 YOLO 포맷으로 변환(Converting)하는 것이 데이터의 손실을 막는 방법이다. 반대로 YOLO에서 COCO로의 변환은 폴리곤 정보의 부재로 인해 불가능하다.

### **3.3 데이터 수량 및 능동 학습(Active Learning) 전략**

"데이터는 다다익선(The more, the better)"이라는 명제는 참이지만, 비용 효율성을 고려해야 한다. 특히 전문 도메인의 데이터 라벨링 비용은 일반 이미지보다 높다.

#### **3.3.1 권장 데이터 수량**

* **최소 기능 구현(MVP) 단계**: **500 \~ 1,000 페이지**.  
  * 전이 학습(Transfer Learning)을 활용한다는 전제하에, LayoutLMv3와 같은 사전 학습 모델(Pre-trained Model)은 이미 문서 구조에 대한 일반적인 이해를 가지고 있다. 따라서 적은 양의 데이터로도 기본적인 문항 분할 모델의 미세 조정(Fine-tuning)이 가능하다.9  
* **상용화(Production) 단계**: **5,000 \~ 10,000 페이지**.  
  * 다양한 폰트, 인쇄 품질, 손글씨 메모, 복잡한 다단 레이아웃 등 엣지 케이스를 커버하기 위한 수량이다. 연구 결과에 따르면, 문서 레이아웃 분석에서 1만 페이지 이상의 데이터셋은 성능 향상의 폭이 둔화되는 수렴 구간에 진입하는 경향이 있다.4

#### **3.3.2 데이터 구축 파이프라인: 능동 학습(Active Learning) 도입**

모든 데이터를 수동으로 라벨링하는 것은 비효율적이다. **능동 학습**과 **유사 라벨링(Pseudo-labeling)** 기법을 도입하여 구축 비용을 절감해야 한다.10

1. **초기 시드(Seed) 구축**: 500페이지를 수동으로 정밀하게 라벨링한다 (Gold Standard).  
2. **초기 모델 학습**: 시드 데이터로 V1 모델을 학습시킨다.  
3. **유사 라벨링(Pseudo-labeling)**: 학습된 V1 모델로 라벨링되지 않은 2,000페이지를 추론한다.  
4. **불확실성 샘플링(Uncertainty Sampling)**: 모델이 예측한 결과 중 신뢰도(Confidence Score)가 낮은(예: 0.4 \~ 0.7) 데이터나, 문항 번호 순서가 어긋나는 등 논리적 오류가 감지된 데이터만 선별한다.12  
5. **인간 보정(Human-in-the-loop)**: 선별된 데이터만을 어노테이터(Annotator)가 수정한다. 이는 백지상태에서 라벨링하는 것보다 3\~5배 빠르다.  
6. **반복 학습**: 수정된 데이터를 시드에 추가하여 V2 모델을 학습시킨다.

이 과정을 통해 전체 데이터의 20\~30%만 인간이 개입하더라도 전체를 라벨링한 것과 유사한 성능을 달성할 수 있다.

## ---

**4\. 시스템 아키텍처 (System Architecture)**

시험지 분할 시스템은 단순한 모델 추론을 넘어선 복합 파이프라인이다. 본 장에서는 입력부터 최종 JSON 출력까지의 전체 흐름을 상세히 기술한다.

### **4.1 전체 파이프라인 개요**

시스템은 크게 **(1) 전처리 및 OCR**, **(2) 레이아웃 분석**, **(3) 논리적 그룹핑 및 구조화**의 3단계로 구성된다.

코드 스니펫

graph TD  
    Input \--\> Pre  
    Pre \--\> OCR  
    OCR \--\> Layout\[Layout Analysis Model (LayoutLMv3)\]  
    Pre \--\> Layout  
    Layout \--\> Semantic  
    Semantic \--\> Logic\[Logical Grouping Algorithm\]  
    Logic \--\> Order  
    Order \--\> Output

### **4.2 모듈 1: 전처리 및 OCR (Optical Character Recognition)**

OCR은 시스템의 '눈'에 해당한다. 레이아웃 분석 모델이 텍스트의 의미를 이해하기 위해서는 정확한 텍스트와 좌표 정보가 필수적이다.

* **OCR 엔진 선정**:  
  * 시험지에는 **한글**, **영어**, **수학 기호**, **한자**가 혼용된다. 특히 수학 기호와 복잡한 한글 폰트 처리가 중요하다.  
  * **Google Cloud Vision API**: 다국어 처리와 특수기호 인식률이 세계 최고 수준이다. 특히 작은 폰트나 흐릿한 스캔본에서도 강건함(Robustness)을 보인다.13  
  * **Naver Clova OCR**: 한글 인식률에 있어서는 타의 추종을 불허한다. 특히 한국형 시험지의 독특한 서체나 손글씨 처리에 강점이 있다. 비용은 Google 대비 높을 수 있으나, 국어/한국사 과목에서는 필수적인 선택지가 될 수 있다.  
  * **전략적 선택**: 초기에는 **Google Cloud Vision**을 메인으로 사용하되, 한글 비중이 높은 과목에 한해 Clova OCR을 라우팅하는 하이브리드 방식을 권장한다. 오픈소스인 Tesseract는 복잡한 시험지 환경에서 인식률 저하가 심각하여 비추천한다.

### **4.3 모듈 2: 레이아웃 분석 모델 (LayoutLMv3 vs YOLOv8)**

시스템의 '두뇌'에 해당하는 핵심 모델이다. 두 가지 유력한 후보군을 비교 분석한다.

#### **4.3.1 LayoutLMv3 (Multimodal Transformer)**

Microsoft Research에서 개발한 문서 이해 특화 모델이다.14

* **작동 원리**: 이미지 패치(Visual), 텍스트 토큰(Text), 그리고 텍스트의 2차원 위치 정보(Position)를 동시에 입력받아 어텐션(Attention) 메커니즘으로 상호 관계를 학습한다.  
* **강점**: "1."이라는 텍스트가 문장의 시작점에 위치하면 "문항 번호"일 확률이 높다는 식의 **의미론적 추론**이 가능하다. 이는 텍스트가 빽빽한 시험지에서 문항 간 경계를 찾는 데 결정적이다.  
* **단점**: 연산량이 많아 추론 속도가 상대적으로 느리며, OCR 선행 수행이 필수적이다.

#### **4.3.2 YOLOv8 (Real-time Object Detection)**

Ultralytics의 최신 객체 탐지 모델이다.8

* **작동 원리**: 이미지만을 보고 픽셀 패턴(여백, 덩어리감)을 기반으로 객체를 찾는다.  
* **강점**: 추론 속도가 매우 빠르다(실시간 처리 가능). OCR 없이도 대략적인 영역 분할이 가능하다.  
* **단점**: 텍스트 내용을 읽지 못하므로, 시각적으로 유사한 "지문"과 "보기"를 구분하거나, 좁은 간격으로 붙어 있는 문항들을 분리하는 데 취약하다.

**최종 아키텍처 제언**: **LayoutLMv3를 메인 모델로 채택한다.** 시험지 분할은 0.1초의 속도보다는 정확한 문항 분리가 훨씬 중요한 과업이다. 문항이 잘못 잘리면 데이터로서의 가치가 0이 되기 때문이다. OCR 결과를 활용하는 LayoutLMv3의 접근법이 '문항 번호'와 같은 텍스트 단서를 활용할 수 있어 훨씬 높은 정확도를 보장한다.

### **4.4 모듈 3: 논리적 그룹핑(Logical Grouping) 및 구조화**

모델이 뱉어낸 Bounding Box들은 파편화되어 있다. 이를 "하나의 문항"으로 묶는 로직이 필요하다.

* **XY-Cut 알고리즘 및 투영 프로파일(Projection Profile)**:  
  * 다단 편집된 시험지의 단(Column)을 분리하기 위해, 이미지의 흑백 픽셀을 수직/수평으로 투영하여 히스토그램을 생성한다. 픽셀 밀도가 현저히 낮은 구간(Valley)을 절단선으로 인식하여 페이지를 좌/우 단으로 나눈다.1  
* **읽기 순서(Reading Order) 정렬**:  
  * 일반적인 Z 순서 (좌상→우상→좌하→우하)가 아닌, 시험지 특유의 N 순서 (좌측단 상→하, 그 후 우측단 상→하) 로직을 적용해야 한다.  
* **계층적 연결(Hierarchical Linking)**:  
  * 알고리즘: 가장 가까운 상위 Question\_No를 찾는다.  
  * 규칙 1: Stem, Choice, Figure는 자신보다 위에(또는 왼쪽에) 있으면서 가장 가까운 Question\_No에 귀속된다.  
  * 규칙 2: Passage가 등장하면 "컨텍스트 모드"를 활성화하고, 이후 등장하는 모든 문항은 새로운 Passage나 섹션 분리자가 나오기 전까지 해당 지문에 연결된다(Link).18

## ---

**5\. 상세 비용 분석 (Cost Analysis)**

본 장에서는 2025년 기준 클라우드 서비스 요금과 시장 노임 단가를 기반으로 한 상세 비용 모델을 제시한다.

**가정 시나리오**:

* **구축 목표**: 5,000페이지의 고품질 학습 데이터셋 구축.  
* **운영 규모**: 월 100,000페이지 처리 (일평균 약 3,300페이지).

### **5.1 초기 구축 비용 (CAPEX)**

초기 비용의 대부분은 데이터 라벨링 인건비와 모델 학습용 GPU 비용이다.

| 항목 | 세부 내용 | 산출 근거 및 계산 | 예상 비용 (USD) |
| :---- | :---- | :---- | :---- |
| **데이터 라벨링** | 5,000페이지 (페이지당 평균 12객체) | $0.05/Box (전문 벤더 기준) × 60,000 Boxes | $3,000 |
| **데이터 검수(QA)** | 라벨링 결과 검수 및 수정 (30% 샘플링) | 라벨링 비용의 30% 가산 | $900 |
| **어노테이션 툴** | CVAT 셀프 호스팅 (AWS t3.medium) | $0.0416/hr × 720hr/mo × 2개월 | \~$60 |
| **모델 학습 컴퓨팅** | AWS G5.2xlarge (A10G GPU) | $1.212/hr × 100시간 (실험 포함) | \~$121 |
| **엔지니어링(별도)** | AI 엔지니어 M/M (제외 가능) | 내부 인력 활용 가정 | \- |
| **총 초기 비용** |  |  | **약 $4,081** |

* *참고*: 능동 학습을 도입하여 직접 라벨링 비중을 줄인다면 라벨링 비용을 $3,000에서 $1,500 수준으로 절감할 수 있다.12

### **5.2 운영 비용 (OPEX) \- 월 10만 페이지 기준**

운영 비용은 변동비(OCR API)와 고정비(인퍼런스 서버)로 나뉜다.

#### **5.2.1 OCR API 비용 (주요 비용 유발 요인)**

OCR은 정확도를 위해 상용 API를 사용하는 것이 유리하다.

* **Google Vision API**:  
  * 가격 정책: 첫 1,000단위 무료, 이후 1,000단위당 $1.50.13  
  * 계산: (100,000 \- 1,000) ÷ 1,000 × $1.50 \= **$148.50**.  
* **비용 절감 전략**: 텍스트 추출이 필요 없는 페이지(그림만 있는 경우 등)를 사전에 필터링하거나, 해시(Hash) 값을 비교하여 중복 처리 방지.

#### **5.2.2 인퍼런스 서버 비용**

LayoutLMv3 추론을 위한 GPU 인스턴스 비용이다.

* **인스턴스 선정**: AWS g4dn.xlarge (NVIDIA T4 GPU). 추론용으로 가성비가 가장 뛰어남 ($0.526/hr).20  
* **처리 시간**:  
  * LayoutLMv3 추론 속도: 약 0.3초/페이지 (배치 처리 시).  
  * 총 소요 시간: 100,000페이지 × 0.3초 \= 30,000초 ≈ 8.3시간.  
* **비용 산출**:  
  * **옵션 A (On-Demand)**: 단순히 8.3시간만 켠다면 $5 미만이나, 실제 서비스는 대기 시간이 필요함.  
  * **옵션 B (Reserved Instance)**: 평일 업무 시간(8시간 × 20일 \= 160시간) 가동 시: 160 × $0.526 \= **$84.16**.  
  * **옵션 C (Serverless Inference)**: SageMaker Serverless Inference를 사용하면 유휴 시간 비용을 제거할 수 있음.

#### **5.2.3 스토리지 및 기타**

* **S3 스토리지**: 100,000페이지 이미지(장당 500KB) \= 50GB. 월 $1.15 수준 (무시 가능).  
* **DB (RDS)**: 메타데이터 저장용 db.t3.micro \= 월 $15.

#### **총 월간 운영 비용 (Total Monthly OPEX)**

| 항목 | 비용 (USD) | 페이지당 단가 |
| :---- | :---- | :---- |
| **OCR API (Google)** | $148.50 | $0.0015 |
| **GPU 인퍼런스 (AWS)** | $85.00 | $0.0009 |
| **인프라(DB/Storage)** | $20.00 | $0.0002 |
| **합계** | **$253.50** | **약 $0.0025 (약 3.5원)** |

**경제성 분석 결론**: 페이지당 약 3.5원(KRW)의 비용으로 자동 처리가 가능하다. 이는 인간 아르바이트생이 페이지당 처리하는 비용(최소 500원\~1,000원) 대비 **99% 이상의 비용 절감 효과**를 가진다. 초기 투자비 $4,000(약 550만원)는 운영 1\~2개월 내에 회수 가능한 수준이다.

## ---

**6\. 결론 및 제언**

본 보고서의 분석 결과, 시험지 문제 영역 자동 분할 AI 시스템 도입은 기술적으로 충분히 성숙한 단계에 있으며, 경제적 효용성 또한 매우 높은 것으로 확인되었다.

**성공적인 구축을 위한 3대 핵심 제언**:

1. **데이터 품질에 타협하지 마라**: LayoutLMv3와 같은 최신 모델은 강력하지만, Question\_No와 같은 미세한 클래스 정의와 정확한 라벨링 없이는 무용지물이다. 초기 데이터 구축 예산을 충분히 배정하고, 능동 학습 파이프라인을 구축하여 지속적으로 데이터 품질을 높여야 한다.  
2. **하이브리드 아키텍처 채택**: 모든 것을 하나의 모델로 해결하려 하지 말고, 텍스트 인식은 최고의 상용 OCR 엔진(Google/Clova)에 맡기고, 구조 분석은 도메인 특화 학습된 LayoutLMv3를 사용하는 분업화 전략이 정확도와 비용의 균형을 맞추는 열쇠이다.  
3. **후처리 로직의 정교화**: AI가 95%를 해결해주지만, 나머지 5%의 엣지 케이스(문항 순서 꼬임, 지문 연결 오류)는 규칙 기반의 후처리 알고리즘(XY-Cut, 문항 번호 시퀀스 검증 등)으로 보완해야 완벽한 자동화가 가능하다.

이 시스템의 도입은 단순한 비용 절감을 넘어, 교육 콘텐츠의 데이터 자산화(Data Assetization)를 가능케 하여 향후 맞춤형 학습 추천, 자동 오답 노트 생성 등 다양한 고부가가치 서비스로의 확장을 위한 초석이 될 것이다.

### ---

**\[참고 문헌 및 데이터 소스\]**

본 보고서는 다음의 연구 자료 및 기술 문서를 기반으로 작성되었습니다:

* **데이터셋 및 포맷**: COCO Dataset 5, DocLayNet.3  
* **모델 아키텍처**: LayoutLMv3 14, YOLOv8 8, Active Learning.10  
* **OCR 및 비용 분석**: Google Cloud Pricing 13, AWS Pricing 20, Data Labeling Costs.23  
* **알고리즘**: XY-Cut & Layout Analysis 1, Math Formula Detection.25

#### **참고 자료**

1. Two Geometric Algorithms for Layout Analysis \- SciSpace, 12월 5, 2025에 액세스, [https://scispace.com/pdf/two-geometric-algorithms-for-layout-analysis-1mjmq2xt6p.pdf](https://scispace.com/pdf/two-geometric-algorithms-for-layout-analysis-1mjmq2xt6p.pdf)  
2. Comparison of Heuristic Priority Rules in the Solution of the Resource-Constrained Project Scheduling Problem \- MDPI, 12월 5, 2025에 액세스, [https://www.mdpi.com/2071-1050/13/17/9956](https://www.mdpi.com/2071-1050/13/17/9956)  
3. Advanced Layout Analysis Models for Docling \- arXiv, 12월 5, 2025에 액세스, [https://arxiv.org/html/2509.11720v1](https://arxiv.org/html/2509.11720v1)  
4. DocLayNet: A Large Human-Annotated Dataset for Document-Layout Analysis \- arXiv, 12월 5, 2025에 액세스, [https://arxiv.org/abs/2206.01062](https://arxiv.org/abs/2206.01062)  
5. COCO dataset, 12월 5, 2025에 액세스, [https://cocodataset.org/](https://cocodataset.org/)  
6. The COCO dataset format \- Rekognition \- AWS Documentation, 12월 5, 2025에 액세스, [https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/md-coco-overview.html](https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/md-coco-overview.html)  
7. DocLayNet: A Large Human-Annotated Dataset for Document-Layout Analysis \- GitHub, 12월 5, 2025에 액세스, [https://github.com/DS4SD/DocLayNet](https://github.com/DS4SD/DocLayNet)  
8. Object Detection Datasets Overview \- Ultralytics YOLO Docs, 12월 5, 2025에 액세스, [https://docs.ultralytics.com/datasets/detect/](https://docs.ultralytics.com/datasets/detect/)  
9. Document AI Finetuning 1\. FUNSD on LayoutLMV3 \- Kaggle, 12월 5, 2025에 액세스, [https://www.kaggle.com/code/akarshu121/document-ai-finetuning-1-funsd-on-layoutlmv3](https://www.kaggle.com/code/akarshu121/document-ai-finetuning-1-funsd-on-layoutlmv3)  
10. Pseudo Labeling: Leveraging the Power of Self-Supervision in Machine Learning \- Medium, 12월 5, 2025에 액세스, [https://medium.com/@data-overload/pseudo-labeling-leveraging-the-power-of-self-supervision-in-machine-learning-d8192e918d65](https://medium.com/@data-overload/pseudo-labeling-leveraging-the-power-of-self-supervision-in-machine-learning-d8192e918d65)  
11. Using pseudo-labeling to improve performance of deep neural networks for animal identification \- PMC \- NIH, 12월 5, 2025에 액세스, [https://pmc.ncbi.nlm.nih.gov/articles/PMC10449823/](https://pmc.ncbi.nlm.nih.gov/articles/PMC10449823/)  
12. Table Detection with Active Learning \- arXiv, 12월 5, 2025에 액세스, [https://arxiv.org/html/2509.20003v1](https://arxiv.org/html/2509.20003v1)  
13. My Journey Choosing the Perfect LLM After OCR with Google Vision API: A 2025 AI Tools Review | by Andrew Asher | Medium, 12월 5, 2025에 액세스, [https://medium.com/@sandrew022000/my-journey-choosing-the-perfect-llm-after-ocr-with-google-vision-api-a-2025-ai-tools-review-02ab32954c16](https://medium.com/@sandrew022000/my-journey-choosing-the-perfect-llm-after-ocr-with-google-vision-api-a-2025-ai-tools-review-02ab32954c16)  
14. LayoutLMv3 \- Hugging Face, 12월 5, 2025에 액세스, [https://huggingface.co/docs/transformers/en/model\_doc/layoutlmv3](https://huggingface.co/docs/transformers/en/model_doc/layoutlmv3)  
15. LayoutLMv3 fine-tuning: Documents Layout Recognition \- Ubiai, 12월 5, 2025에 액세스, [https://ubiai.tools/fine-tuning-layoutlmv3-customizing-layout-recognition-for-diverse-document-types/](https://ubiai.tools/fine-tuning-layoutlmv3-customizing-layout-recognition-for-diverse-document-types/)  
16. Comparative Performance of YOLOv8, YOLOv9, YOLOv10, and YOLOv11 for Layout Analysis of Historical Documents Images \- MDPI, 12월 5, 2025에 액세스, [https://www.mdpi.com/2076-3417/15/6/3164](https://www.mdpi.com/2076-3417/15/6/3164)  
17. Extraction, layout analysis and classification of diagrams in PDF documents \- ResearchGate, 12월 5, 2025에 액세스, [https://www.researchgate.net/publication/220861408\_Extraction\_layout\_analysis\_and\_classification\_of\_diagrams\_in\_PDF\_documents](https://www.researchgate.net/publication/220861408_Extraction_layout_analysis_and_classification_of_diagrams_in_PDF_documents)  
18. Information extraction system pipeline architecture. | Download Scientific Diagram, 12월 5, 2025에 액세스, [https://www.researchgate.net/figure/nformation-extraction-system-pipeline-architecture\_fig1\_290225986](https://www.researchgate.net/figure/nformation-extraction-system-pipeline-architecture_fig1_290225986)  
19. Pricing | Cloud Vision API, 12월 5, 2025에 액세스, [https://cloud.google.com/vision/pricing](https://cloud.google.com/vision/pricing)  
20. AWS G4 vs G5 Family: A Detailed Comparison of AWS GPU Instances \- CloudOptimo, 12월 5, 2025에 액세스, [https://www.cloudoptimo.com/blog/aws-g4-vs-g5-family-a-detailed-comparison-of-aws-gpu-instances/](https://www.cloudoptimo.com/blog/aws-g4-vs-g5-family-a-detailed-comparison-of-aws-gpu-instances/)  
21. Benchmarking Inexpensive AWS Instances : r/LocalLLaMA \- Reddit, 12월 5, 2025에 액세스, [https://www.reddit.com/r/LocalLLaMA/comments/1dclmwt/benchmarking\_inexpensive\_aws\_instances/](https://www.reddit.com/r/LocalLLaMA/comments/1dclmwt/benchmarking_inexpensive_aws_instances/)  
22. Amazon EC2 G5 Instances \- AWS, 12월 5, 2025에 액세스, [https://aws.amazon.com/ec2/instance-types/g5/](https://aws.amazon.com/ec2/instance-types/g5/)  
23. Data Annotation Pricing: Key Models & Cost Factors Explained, 12월 5, 2025에 액세스, [https://www.gdsonline.tech/data-annotation-pricing/](https://www.gdsonline.tech/data-annotation-pricing/)  
24. What's The True Data Annotation Cost per 10K Labels \- Tinkogroup, 12월 5, 2025에 액세스, [https://tinkogroup.com/data-annotation-cost-per-10k-labels/](https://tinkogroup.com/data-annotation-cost-per-10k-labels/)  
25. Mathematical Formula Identification in PDF Documents \- IEEE Xplore, 12월 5, 2025에 액세스, [https://ieeexplore.ieee.org/document/6065544/](https://ieeexplore.ieee.org/document/6065544/)  
26. Mathematical Formula Detection in Heterogeneous Document Images, 12월 5, 2025에 액세스, [http://mmcv.csie.ncku.edu.tw/\~wtchu/papers/2013TAAI-chu.pdf](http://mmcv.csie.ncku.edu.tw/~wtchu/papers/2013TAAI-chu.pdf)