# 노트북-데스크톱 분산 작업 환경 연구 리포트

**작성일**: 2025-12-05
**문서 번호**: 156
**목적**: 노트북(라벨링) ↔ 데스크톱(딥러닝) 워크플로우 설계

---

## Executive Summary

### 작업 환경

| 장비 | 용도 | 특징 |
|------|------|------|
| **노트북** | 라벨링, 일상 작업 | 이동성, GPU 없음/약함 |
| **데스크톱** | 딥러닝 학습 | RTX 4070 (12GB VRAM) |

### 권장 솔루션: NAS 중심 동기화

```
노트북 (라벨링)          NAS (dataset_root)         데스크톱 (학습)
     │                        │                         │
     │   라벨링 데이터 저장    │                         │
     │ ──────────────────────→│                         │
     │                        │    자동 동기화           │
     │                        │────────────────────────→│
     │                        │                         │
     │                        │      학습된 모델        │
     │                        │←────────────────────────│
     │    모델 다운로드        │                         │
     │←───────────────────────│                         │
```

---

## 1. 현재 시스템 분석

### 1.1 이미 가지고 있는 것

```
dataset_root/ (NAS 동기화 폴더)
├── documents/           # PDF → 이미지 변환 결과
│   └── {document_id}/
│       ├── pages/       # 페이지 이미지
│       ├── blocks/      # 블록 JSON
│       ├── groups/      # 그룹 JSON
│       └── problems/    # 크롭된 문제 이미지
└── work_sessions/       # 작업 세션 데이터
```

**핵심 포인트**: 이미 NAS 기반 동기화 구조가 있음!

### 1.2 추가로 필요한 것

```
dataset_root/
├── ... (기존)
└── ai_training/         # 새로 추가
    ├── labels/          # YOLO 형식 라벨 데이터
    │   ├── train/
    │   └── val/
    ├── models/          # 학습된 모델
    │   ├── yolov8_v1.pt
    │   └── yolov8_v2.pt
    └── configs/         # 학습 설정
        └── dataset.yaml
```

---

## 2. 워크플로우 옵션 비교

### 옵션 A: NAS 직접 동기화 (권장)

```
┌─────────────────────────────────────────────────────────────┐
│                        NAS 서버                             │
│                     (dataset_root)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   images/   │  │   labels/   │  │   models/   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
         ↑                 ↑                 ↓
         │                 │                 │
    ┌────┴────┐      ┌─────┴─────┐     ┌────┴────┐
    │ 노트북  │      │  노트북   │     │데스크톱 │
    │ (이미지)│      │ (라벨링)  │     │ (학습)  │
    └─────────┘      └───────────┘     └─────────┘
```

| 장점 | 단점 |
|------|------|
| 자동 동기화 | NAS 필요 (이미 있음) |
| 실시간 반영 | 네트워크 속도 의존 |
| 추가 설정 최소 | |

### 옵션 B: 클라우드 라벨링 도구 (Roboflow)

```
┌─────────────────────────────────────────────────────────────┐
│                    Roboflow (클라우드)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Upload    │→ │   Label     │→ │   Export    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
         ↑                                    ↓
    ┌────┴────┐                         ┌────┴────┐
    │ 노트북  │                         │데스크톱 │
    │(업로드) │                         │(다운로드│
    └─────────┘                         │ + 학습) │
                                        └─────────┘
```

| 장점 | 단점 |
|------|------|
| 어디서나 접근 | 데이터 외부 저장 |
| 내장 라벨링 도구 | 무료 한도 (1000장) |
| 자동 증강 기능 | 인터넷 필요 |

### 옵션 C: Git LFS 기반

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub / GitLab                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  repository (Git LFS로 대용량 파일 관리)             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         ↑                                    ↓
    ┌────┴────┐                         ┌────┴────┐
    │ 노트북  │  git push               │데스크톱 │
    │         │ ───────────────────────→│         │
    └─────────┘                         └─────────┘
```

| 장점 | 단점 |
|------|------|
| 버전 관리 | 설정 복잡 |
| 변경 이력 추적 | 대용량 비용 (LFS) |

---

## 3. 권장 워크플로우 상세 설계

### 3.1 전체 흐름

```
[노트북]                    [NAS]                    [데스크톱]
   │                          │                          │
   │  1. 웹앱에서 라벨링       │                          │
   │     (Label Studio)       │                          │
   │  ─────────────────────→  │                          │
   │                          │  2. 자동 동기화           │
   │                          │  ─────────────────────→  │
   │                          │                          │
   │                          │                          │  3. 학습 스크립트 실행
   │                          │                          │     python train.py
   │                          │                          │
   │                          │  4. 모델 저장             │
   │                          │  ←─────────────────────  │
   │                          │                          │
   │  5. 추론 테스트          │                          │
   │  ←─────────────────────  │                          │
   │                          │                          │
```

### 3.2 단계별 상세

#### 1단계: 라벨링 (노트북)

```
옵션 A: Label Studio (로컬)
- 노트북에서 Label Studio 실행
- NAS의 이미지 폴더 직접 참조
- 라벨 결과 NAS에 저장

옵션 B: 커스텀 웹앱 (현재 시스템 확장)
- 현재 PageViewer 기반 라벨링 UI 확장
- 라벨 데이터 → ai_training/labels/ 저장
```

#### 2단계: 데이터 동기화 (자동)

```
NAS 동기화 설정 (이미 있음):
- Synology Drive / QNAP Qsync 등
- 또는 Windows 네트워크 드라이브 마운트

동기화 대상:
dataset_root/ai_training/
├── labels/     ← 노트북에서 생성
├── images/     ← 심볼릭 링크 또는 복사
└── models/     → 데스크톱에서 생성
```

#### 3단계: 학습 (데스크톱)

```python
# train.py (데스크톱에서 실행)

from ultralytics import YOLO
from pathlib import Path

# NAS 경로 (네트워크 드라이브)
NAS_PATH = Path("Z:/dataset_root/ai_training")  # 예시

# 데이터셋 설정
dataset_yaml = NAS_PATH / "configs/dataset.yaml"

# 모델 학습
model = YOLO("yolov8m.pt")
model.train(
    data=str(dataset_yaml),
    epochs=100,
    imgsz=1024,
    batch=8,
    device=0,  # RTX 4070
    project=str(NAS_PATH / "models"),
    name="question_detector_v1"
)

print(f"모델 저장 완료: {NAS_PATH / 'models'}")
```

#### 4단계: 모델 배포 (자동)

```
학습 완료 후:
NAS/ai_training/models/question_detector_v1/
├── weights/
│   ├── best.pt      ← 최고 성능 모델
│   └── last.pt      ← 마지막 체크포인트
└── results.csv      ← 학습 로그

노트북에서 자동으로 접근 가능 (NAS 동기화)
```

---

## 4. 라벨링 도구 비교

### 4.1 옵션별 비교

| 도구 | 설치 | 사용성 | NAS 연동 | 추천도 |
|------|------|--------|----------|--------|
| **Roboflow** | 불필요 (웹) | ★★★★★ | 업로드 필요 | 초보자 추천 |
| **Label Studio** | Docker | ★★★★☆ | 직접 마운트 | 유연성 |
| **커스텀 웹앱** | 이미 있음 | ★★★★☆ | 네이티브 | 통합성 |
| **CVAT** | Docker | ★★★☆☆ | 복잡 | 대규모용 |

### 4.2 권장: 2단계 접근

```
Phase 1: Roboflow로 빠르게 시작 (1~2주)
- 무료 계정 (1000장)
- 웹에서 바로 라벨링
- 원클릭 YOLO 포맷 내보내기
- 어디서나 접근 (노트북, 폰)

Phase 2: 커스텀 웹앱으로 전환 (나중에)
- 현재 시스템에 라벨링 기능 추가
- NAS 직접 연동
- 완전한 통합
```

---

## 5. Roboflow 워크플로우 (권장 Phase 1)

### 5.1 전체 흐름

```
[노트북 - 어디서나]              [Roboflow 클라우드]              [데스크톱]
        │                              │                            │
        │  1. 이미지 업로드             │                            │
        │  ──────────────────────────→ │                            │
        │                              │                            │
        │  2. 웹에서 라벨링             │                            │
        │  (브라우저)                   │                            │
        │                              │                            │
        │                              │  3. YOLO 포맷 다운로드      │
        │                              │ ─────────────────────────→ │
        │                              │                            │
        │                              │                            │  4. 학습
        │                              │                            │
        │                              │  5. 모델 업로드 (선택)      │
        │                              │ ←───────────────────────── │
        │                              │                            │
        │  6. 추론 테스트 (웹)          │                            │
        │ ←────────────────────────────│                            │
```

### 5.2 구체적 단계

#### 1단계: Roboflow 프로젝트 생성

```
1. roboflow.com 가입 (무료)
2. New Project 생성
   - Project Name: "수학문제집_문제영역"
   - Project Type: "Object Detection"
   - Classes: "Question_Block"
```

#### 2단계: 이미지 업로드

```
노트북에서:
- dataset_root/documents/{doc_id}/pages/*.png 선택
- 드래그 앤 드롭으로 업로드
- 또는 Roboflow CLI 사용:

pip install roboflow
roboflow upload ./pages --api_key YOUR_KEY
```

#### 3단계: 웹에서 라벨링

```
Roboflow 웹 UI:
- 문제 영역 드래그로 박스
- 단축키: B (박스 도구), 1 (첫 번째 클래스)
- 자동 저장
- 어디서나 접근 (카페, 이동 중)
```

#### 4단계: 데스크톱에서 다운로드 & 학습

```python
# download_and_train.py (데스크톱)

from roboflow import Roboflow
from ultralytics import YOLO

# Roboflow에서 데이터셋 다운로드
rf = Roboflow(api_key="YOUR_API_KEY")
project = rf.workspace().project("수학문제집_문제영역")
dataset = project.version(1).download("yolov8")

# 학습
model = YOLO("yolov8m.pt")
model.train(
    data=f"{dataset.location}/data.yaml",
    epochs=100,
    imgsz=1024,
    batch=8
)
```

### 5.3 Roboflow 무료 한도

| 항목 | 무료 한도 |
|------|----------|
| 이미지 | 1,000장 |
| 프로젝트 | 3개 |
| 버전 | 무제한 |
| 팀원 | 1명 |
| API 호출 | 1,000/월 |

**충분함**: 100~200페이지 라벨링에는 충분

---

## 6. NAS 기반 커스텀 워크플로우 (Phase 2)

### 6.1 디렉토리 구조

```
NAS (Z:\dataset_root\)
├── documents/              # 기존 문서 데이터
├── work_sessions/          # 기존 세션 데이터
│
└── ai_training/            # 새로 추가
    ├── raw_images/         # 원본 이미지 (pages에서 복사/링크)
    │   ├── train/
    │   │   ├── page_001.png
    │   │   └── page_002.png
    │   └── val/
    │
    ├── labels/             # YOLO 형식 라벨
    │   ├── train/
    │   │   ├── page_001.txt
    │   │   └── page_002.txt
    │   └── val/
    │
    ├── models/             # 학습된 모델
    │   ├── v1/
    │   │   ├── best.pt
    │   │   └── results.csv
    │   └── v2/
    │
    └── configs/
        └── dataset.yaml
```

### 6.2 dataset.yaml

```yaml
# NAS/ai_training/configs/dataset.yaml

path: Z:/dataset_root/ai_training  # 데스크톱 기준 경로
train: raw_images/train
val: raw_images/val

names:
  0: Question_Block
```

### 6.3 라벨 파일 형식 (YOLO)

```
# labels/train/page_001.txt
# <class_id> <x_center> <y_center> <width> <height> (0~1 정규화)

0 0.25 0.15 0.45 0.20
0 0.25 0.45 0.45 0.25
0 0.75 0.15 0.45 0.30
```

### 6.4 현재 시스템에서 라벨 내보내기

```python
# backend/app/services/label_exporter.py

from pathlib import Path
import json

def export_groups_to_yolo(document_id: str, output_dir: Path):
    """
    groups.json → YOLO 라벨 형식 변환

    현재 그룹핑 결과를 YOLOv8 학습용으로 내보내기
    """
    groups_dir = Path(f"dataset_root/documents/{document_id}/groups")
    pages_dir = Path(f"dataset_root/documents/{document_id}/pages")

    for groups_file in groups_dir.glob("*_groups.json"):
        with open(groups_file) as f:
            data = json.load(f)

        page_name = groups_file.stem.replace("_groups", "")
        page_image = pages_dir / f"{page_name}.png"

        # 이미지 크기
        from PIL import Image
        img = Image.open(page_image)
        img_w, img_h = img.size

        # YOLO 라벨 생성
        labels = []
        for group in data.get("groups", []):
            bbox = group.get("combinedBbox")
            if bbox:
                # YOLO 형식: x_center, y_center, width, height (정규화)
                x_center = (bbox["x"] + bbox["width"]/2) / img_w
                y_center = (bbox["y"] + bbox["height"]/2) / img_h
                width = bbox["width"] / img_w
                height = bbox["height"] / img_h

                labels.append(f"0 {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}")

        # 저장
        label_file = output_dir / f"{page_name}.txt"
        label_file.write_text("\n".join(labels))

    print(f"내보내기 완료: {output_dir}")
```

---

## 7. 원격 학습 실행 옵션

### 7.1 SSH로 데스크톱 원격 접속

```bash
# 노트북에서 데스크톱으로 SSH

# 1. 데스크톱에 OpenSSH 서버 설치 (Windows)
# 설정 → 앱 → 선택적 기능 → OpenSSH 서버

# 2. 노트북에서 접속
ssh user@desktop-ip

# 3. 학습 스크립트 실행
cd /path/to/project
python train.py
```

### 7.2 VS Code Remote SSH

```
노트북 VS Code에서:
1. Remote-SSH 확장 설치
2. 데스크톱 연결
3. 코드 편집 + 터미널에서 학습 실행
4. GPU 사용량 실시간 확인
```

### 7.3 Jupyter Notebook 원격

```python
# 데스크톱에서 Jupyter 서버 실행
jupyter notebook --ip=0.0.0.0 --port=8888

# 노트북 브라우저에서 접속
http://desktop-ip:8888
```

---

## 8. 편의 스크립트

### 8.1 라벨 데이터 동기화 확인

```python
# scripts/check_sync.py

from pathlib import Path

NAS_PATH = Path("Z:/dataset_root/ai_training")

def check_sync():
    """라벨링 진행 상황 확인"""
    images = list((NAS_PATH / "raw_images/train").glob("*.png"))
    labels = list((NAS_PATH / "labels/train").glob("*.txt"))

    print(f"이미지: {len(images)}장")
    print(f"라벨: {len(labels)}개")
    print(f"라벨링 완료율: {len(labels)/len(images)*100:.1f}%")

    # 라벨 없는 이미지 찾기
    labeled = {l.stem for l in labels}
    unlabeled = [i for i in images if i.stem not in labeled]

    if unlabeled:
        print(f"\n라벨 없는 이미지 ({len(unlabeled)}개):")
        for img in unlabeled[:5]:
            print(f"  - {img.name}")

if __name__ == "__main__":
    check_sync()
```

### 8.2 원클릭 학습 스크립트

```python
# scripts/train_model.py (데스크톱용)

import subprocess
from pathlib import Path
from datetime import datetime
from ultralytics import YOLO

NAS_PATH = Path("Z:/dataset_root/ai_training")

def train():
    # 버전 생성
    version = datetime.now().strftime("v%Y%m%d_%H%M")
    output_dir = NAS_PATH / "models" / version

    print(f"학습 시작: {version}")
    print(f"출력 경로: {output_dir}")

    # 학습
    model = YOLO("yolov8m.pt")
    results = model.train(
        data=str(NAS_PATH / "configs/dataset.yaml"),
        epochs=100,
        imgsz=1024,
        batch=8,
        device=0,
        project=str(output_dir),
        name="train"
    )

    # 완료 알림 (Windows)
    subprocess.run([
        "powershell", "-Command",
        f"[System.Windows.Forms.MessageBox]::Show('학습 완료: {version}')"
    ])

    print(f"\n학습 완료!")
    print(f"모델 경로: {output_dir}/train/weights/best.pt")

if __name__ == "__main__":
    train()
```

### 8.3 학습 완료 알림 (선택)

```python
# 텔레그램 봇으로 알림 (선택 사항)
import requests

def send_telegram(message):
    bot_token = "YOUR_BOT_TOKEN"
    chat_id = "YOUR_CHAT_ID"
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    requests.post(url, data={"chat_id": chat_id, "text": message})

# 학습 완료 후
send_telegram(f"학습 완료! mAP: {results.maps[0]:.2f}")
```

---

## 9. 우려 사항 및 대응

### 9.1 네트워크 관련

| 우려 | 심각도 | 대응 |
|------|--------|------|
| **NAS 연결 끊김** | 중간 | 로컬에 백업 복사본 유지 |
| **동기화 지연** | 낮음 | 학습 전 동기화 완료 확인 |
| **대역폭 부족** | 중간 | 학습 데이터는 데스크톱 로컬에 캐시 |

### 9.2 데이터 관련

| 우려 | 심각도 | 대응 |
|------|--------|------|
| **라벨 형식 불일치** | 중간 | 검증 스크립트로 체크 |
| **이미지-라벨 불일치** | 중간 | 파일명 기반 매칭 확인 |
| **버전 혼란** | 낮음 | 날짜 기반 버전 관리 |

### 9.3 학습 관련

| 우려 | 심각도 | 대응 |
|------|--------|------|
| **GPU 메모리 부족** | 낮음 | 배치 크기 조절 (8→4) |
| **학습 중 PC 사용** | 낮음 | 백그라운드 실행, 우선순위 조절 |
| **학습 실패 감지** | 중간 | 로그 모니터링, 알림 설정 |

---

## 10. 권장 워크플로우 요약

### Phase 1: 빠른 시작 (1~2주)

```
1. Roboflow 가입 (무료)
2. 50~100페이지 업로드 (노트북에서)
3. 웹에서 라벨링 (어디서나)
4. YOLO 포맷 다운로드 (데스크톱)
5. YOLOv8 학습 (데스크톱, RTX 4070)
6. 결과 확인 및 반복
```

### Phase 2: 통합 시스템 (나중에)

```
1. 현재 웹앱에 라벨링 내보내기 기능 추가
2. NAS 기반 자동 동기화
3. 원클릭 학습 스크립트
4. 학습된 모델로 자동 분할 기능
```

---

## 11. 결론

### 핵심 권장사항

| 항목 | 권장 |
|------|------|
| **라벨링 도구** | Roboflow (Phase 1), 커스텀 웹앱 (Phase 2) |
| **동기화 방식** | 기존 NAS 활용 |
| **원격 학습** | VS Code Remote SSH |
| **모델 관리** | 날짜 기반 버전 (v20251205_1430) |

### 예상 워크플로우 시간

| 단계 | 소요 시간 | 장소 |
|------|----------|------|
| 이미지 업로드 | 10분 | 노트북 |
| 100페이지 라벨링 | 1~2시간 | 어디서나 |
| 학습 | 1~2시간 | 데스크톱 (자동) |
| 결과 확인 | 10분 | 노트북 |

### 다음 단계

```
□ Roboflow 계정 생성
□ 테스트용 10페이지 업로드
□ 라벨링 테스트
□ 데스크톱에서 다운로드 + 학습 테스트
```

---

*작성: Claude Code (Opus 4.5)*
*마지막 업데이트: 2025-12-05*
