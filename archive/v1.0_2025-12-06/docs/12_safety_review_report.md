# 문항 이름 시스템 안전성 검토 리포트

**작성일:** 2025-11-25
**검토 대상:** 11_problem_naming_implementation_plan.md
**검토 유형:** 데이터 안전성, 하위 호환성, 롤백 가능성

---

## 1. 위험 요소 분석

### 1.1 데이터 구조 변경 위험

#### 현재 데이터 구조

**groups JSON** (`page_XXXX_groups.json`):
```json
{
  "document_id": "1-40",
  "page_index": 7,
  "groups": [
    {
      "id": "L1",
      "column": "L",
      "block_ids": [726, 727, ...]
    }
  ]
}
```

**problems JSON** (`{doc}_p{page}_{group}.json`):
```json
{
  "document_id": "1-40",
  "page_index": 7,
  "group_id": "L1",
  "column": "L",
  "block_ids": [...],
  "bbox": [119, 975, 631, 1161],
  "image_path": "documents\\1-40\\problems\\1-40_p0007_L1.png",
  "metadata": {}
}
```

#### 계획된 변경

```json
// groups JSON에 추가
{
  "groups": [
    {
      "id": "L1",
      "column": "L",
      "block_ids": [...],
      "problemInfo": {           // 새 필드 (optional)
        "bookName": "...",
        "course": "...",
        "page": 464,
        "problemNumber": "3",
        "displayName": "..."
      },
      "order": 1                 // 새 필드 (optional)
    }
  ]
}
```

### 1.2 위험 등급 평가

| 위험 요소 | 등급 | 영향 범위 | 발생 확률 |
|----------|------|----------|----------|
| 기존 JSON 파싱 실패 | 🔴 높음 | 전체 기능 | 낮음 |
| 데이터 손실 | 🔴 높음 | 기존 작업물 | 낮음 |
| Export 기능 오작동 | 🟡 중간 | 문제 내보내기 | 중간 |
| UI 렌더링 오류 | 🟢 낮음 | 화면 표시 | 중간 |
| 성능 저하 | 🟢 낮음 | 응답 속도 | 낮음 |

---

## 2. 발견된 문제점

### 2.1 🔴 문제 1: 두 개의 데이터 저장소

**현재 상태:**
- `groups/` 폴더: 그룹 정보 (라벨링용)
- `problems/` 폴더: 내보낸 문제 정보 (export용)

**문제:**
- `problemInfo`를 groups에만 추가하면 problems JSON과 **불일치** 발생
- Export 시 `problemInfo`가 problems JSON에 반영되지 않음

**해결 방안:**
```
Option A: groups만 수정 (problems는 export 시 동기화)
Option B: 둘 다 수정 (중복 관리 필요)
Option C: problems를 groups의 파생 데이터로 재설계 ⚠️ 대규모 변경
```

**권장:** Option A (최소 변경)
- groups JSON이 원본 (source of truth)
- Export 시 problemInfo도 함께 복사

---

### 2.2 🔴 문제 2: 기존 데이터 마이그레이션 누락

**현재 계획에 없는 것:**
- 기존 groups JSON에 `problemInfo`가 없을 때 처리
- 기존 problems JSON과의 동기화 방법

**해결 방안:**

```typescript
// 안전한 읽기 (프론트엔드)
const getDisplayName = (group: ProblemGroup): string => {
  // 새 형식
  if (group.problemInfo?.displayName) {
    return group.problemInfo.displayName;
  }
  // 기존 형식 (하위 호환)
  return group.id;  // "L1", "R2" 등
};

// 안전한 저장 (백엔드)
def save_page_groups(document_id, page_index, groups_data):
    # 기존 필드는 반드시 유지
    for group in groups_data.get("groups", []):
        # id, column, block_ids는 필수
        assert "id" in group
        assert "column" in group
        assert "block_ids" in group
        # problemInfo는 선택적
```

---

### 2.3 🟡 문제 3: Export 기능과의 연동

**현재 Export 로직 분석 필요:**
- problems JSON 생성 시 어떤 정보를 복사하는지
- `metadata` 필드가 어떻게 사용되는지

**권장:**
- Export 시 `problemInfo`를 `metadata`에 병합
- 기존 `metadata` 구조 유지

```json
// problems JSON (export 후)
{
  "document_id": "1-40",
  "page_index": 7,
  "group_id": "L1",
  "bbox": [...],
  "image_path": "...",
  "metadata": {
    "problemInfo": {
      "bookName": "수학의 바이블",
      "course": "공통수학2",
      "page": 464,
      "problemNumber": "3",
      "displayName": "..."
    }
  }
}
```

---

### 2.4 🟡 문제 4: settings.json 충돌 가능성

**위험:**
- 여러 탭/창에서 동시 수정 시 덮어쓰기
- 네트워크 오류 시 부분 저장

**해결 방안:**

```python
# 백엔드: 병합 저장 (덮어쓰기 방지)
def save_document_settings(document_id, new_settings):
    settings_file = doc_dir / "settings.json"

    # 기존 설정 읽기
    existing = {}
    if settings_file.exists():
        with open(settings_file, "r") as f:
            existing = json.load(f)

    # 병합 (새 값이 기존 값을 덮어씀)
    merged = {**existing, **new_settings}

    # 원자적 쓰기 (임시 파일 사용)
    temp_file = settings_file.with_suffix(".tmp")
    with open(temp_file, "w") as f:
        json.dump(merged, f, indent=2)
    temp_file.replace(settings_file)  # 원자적 교체
```

---

### 2.5 🟢 문제 5: TypeScript 타입 안전성

**위험:**
- Optional 필드 접근 시 런타임 에러

**해결 방안:**

```typescript
// 안전한 타입 정의
interface ProblemGroup {
  id: string;
  column: string;
  block_ids: number[];

  // 모든 새 필드는 optional
  problemInfo?: ProblemInfo;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

// 안전한 접근
const displayName = group.problemInfo?.displayName ?? group.id;
const order = group.order ?? index + 1;
```

---

## 3. 안전한 구현 순서 (수정안)

### Phase 0: 백업 및 준비 (필수 추가)

```bash
# 1. 현재 데이터 백업
cp -r dataset_root/documents dataset_root/documents_backup_$(date +%Y%m%d)

# 2. Git 커밋
git add .
git commit -m "백업: 문항 이름 시스템 구현 전"
```

### Phase 1: 읽기 전용 변경 먼저

**순서:**
1. 타입 정의 확장 (optional 필드)
2. UI에서 안전한 읽기 로직 추가
3. 테스트: 기존 데이터로 정상 동작 확인

**검증:**
```
✓ 기존 groups JSON 로드 성공
✓ problemInfo 없어도 UI 정상 표시
✓ 기존 기능 (그룹 생성/삭제) 정상 동작
```

### Phase 2: 쓰기 로직 추가

**순서:**
1. 백엔드 API 추가 (새 엔드포인트)
2. 프론트엔드 저장 로직 추가
3. 테스트: 새 데이터 저장 후 로드 확인

**검증:**
```
✓ 새 그룹에 problemInfo 저장 성공
✓ 기존 그룹 수정 시 데이터 손실 없음
✓ 저장 후 새로고침해도 데이터 유지
```

### Phase 3: Export 연동

**순서:**
1. Export 로직 분석
2. problemInfo → metadata 복사 로직 추가
3. 테스트: Export 후 problems JSON 확인

---

## 4. 롤백 계획

### 4.1 즉시 롤백 (코드)

```bash
# Git으로 이전 상태 복원
git checkout HEAD~1 -- frontend/src/components/GroupPanel.tsx
git checkout HEAD~1 -- frontend/src/api/client.ts
git checkout HEAD~1 -- backend/app/routers/blocks.py
```

### 4.2 데이터 롤백

```bash
# 백업에서 복원
rm -rf dataset_root/documents
mv dataset_root/documents_backup_YYYYMMDD dataset_root/documents
```

### 4.3 부분 롤백 (problemInfo만 제거)

```python
# 스크립트: 새 필드만 제거
import json
from pathlib import Path

for groups_file in Path("dataset_root").rglob("*_groups.json"):
    with open(groups_file, "r") as f:
        data = json.load(f)

    for group in data.get("groups", []):
        # 새 필드 제거
        group.pop("problemInfo", None)
        group.pop("order", None)

    with open(groups_file, "w") as f:
        json.dump(data, f, indent=2)
```

---

## 5. 테스트 체크리스트

### 5.1 하위 호환성 테스트

| 테스트 | 예상 결과 | 확인 |
|--------|----------|------|
| 기존 groups JSON 로드 | 정상 표시 | ☐ |
| problemInfo 없는 그룹 표시 | "L1" 표시 | ☐ |
| 기존 그룹 삭제 | 정상 삭제 | ☐ |
| 기존 그룹에 블록 추가 | 정상 동작 | ☐ |

### 5.2 새 기능 테스트

| 테스트 | 예상 결과 | 확인 |
|--------|----------|------|
| 새 그룹 + problemInfo 저장 | JSON에 포함 | ☐ |
| 페이지 이동 후 로드 | 정상 유지 | ☐ |
| 브라우저 새로고침 | 데이터 유지 | ☐ |
| Export 후 problems JSON | metadata에 포함 | ☐ |

### 5.3 엣지 케이스 테스트

| 테스트 | 예상 결과 | 확인 |
|--------|----------|------|
| 빈 문자열 책이름 | 저장 거부 또는 기본값 | ☐ |
| 특수문자 포함 이름 | 정상 저장/표시 | ☐ |
| 매우 긴 이름 (100자+) | UI 말줄임 처리 | ☐ |
| 페이지 0 또는 음수 | 유효성 검사 | ☐ |

---

## 6. 최종 권장사항

### 6.1 반드시 수행

1. **백업 먼저**: 구현 시작 전 전체 dataset_root 백업
2. **단계별 배포**: 읽기 → 쓰기 → Export 순서
3. **Feature Flag**: 새 기능 on/off 가능하게
4. **Optional 필드**: 모든 새 필드는 optional로

### 6.2 구현 원칙

```typescript
// 원칙 1: Defensive Reading
const safeGet = (group: ProblemGroup) => ({
  displayName: group.problemInfo?.displayName ?? group.id,
  page: group.problemInfo?.page ?? 0,
});

// 원칙 2: Non-destructive Writing
const safeUpdate = (group: ProblemGroup, info: ProblemInfo) => ({
  ...group,  // 기존 필드 유지
  problemInfo: info,
  updatedAt: new Date().toISOString(),
});

// 원칙 3: Graceful Degradation
try {
  await saveGroupInfo(groupId, info);
} catch (error) {
  console.error('저장 실패:', error);
  toast.error('저장에 실패했습니다. 다시 시도해주세요.');
  // 기존 기능은 계속 동작
}
```

### 6.3 수정된 Phase 순서

```
Phase 0: 백업 + Feature Flag 준비     (1시간) ⭐ 추가
Phase 1: 타입 확장 (읽기 전용)        (1시간)
Phase 1.5: 기존 기능 테스트           (30분) ⭐ 추가
Phase 2: 페이지 오프셋 (별도 파일)    (2시간)
Phase 3: problemInfo 저장             (3시간)
Phase 3.5: 하위 호환성 테스트         (30분) ⭐ 추가
Phase 4: 자동완성                     (3시간)
Phase 5: 사이드바 개선                (2시간)
Phase 6: Export 연동                  (2시간) ⭐ 순서 변경
Phase 7: 고급 기능                    (3시간)
```

---

## 7. 결론

### 7.1 안전성 평가: ✅ 구현 가능 (조건부)

**조건:**
1. 백업 필수
2. Optional 필드로 설계
3. 단계별 테스트 수행
4. Export 연동 검증

### 7.2 주요 변경점

| 항목 | 원래 계획 | 수정안 |
|------|----------|--------|
| 백업 | 없음 | Phase 0에 추가 |
| 테스트 단계 | 마지막 | 각 Phase 후 |
| Export 연동 | Phase 6 | Phase 3 직후 |
| Feature Flag | 없음 | 추가 권장 |

### 7.3 위험 완화 요약

```
🔴 데이터 손실 → 백업 + 원자적 쓰기
🔴 하위 호환성 → Optional 필드 + Defensive 코딩
🟡 Export 불일치 → Phase 3.5에서 연동
🟢 UI 오류 → Graceful Degradation
```

---

**검토 완료:** 2025-11-25
**다음 단계:** 수정된 계획으로 구현 시작

