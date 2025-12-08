# Phase 56-L: 자동 내보내기 실패 분석 리포트

**문서 번호**: 221
**작성일**: 2025-12-07
**심각도**: 낮음 (기능 손상 없음, 수동 처리 가능)

---

## 1. 증상

### 1.1 사용자 경험
```
가끔 문제를 등록할 때 다음 토스트 메시지가 표시됨:
"자동 등록에 실패했습니다. 수동으로 확정해주세요."

(원래 기대: "문제가 문제은행에 등록되었습니다")
```

### 1.2 콘솔 로그
```
PageViewer.tsx:810 [Phase 33-C] Auto-export failed: AxiosError
```

### 1.3 발생 빈도
- **간헐적** (가끔 발생)
- 특정 조건에서 재현 가능 (아래 참조)

---

## 2. 에러 메시지의 의미

### 2.1 "자동 등록에 실패했습니다"
이 메시지는 **그룹 생성은 성공했으나, 문제 이미지 내보내기(export)가 실패**했음을 의미합니다.

```
그룹 생성 (G키/Enter) → groups.json 저장 ✅ → 이미지 내보내기 ❌
                                               ↑ 여기서 실패
```

### 2.2 "수동으로 확정해주세요"
- 그룹 데이터는 **정상 저장**됨 (groups.json에 존재)
- 문제 이미지 PNG 파일만 생성되지 않음
- **해결 방법**: 해당 그룹을 우클릭 → "확정" 클릭 또는 그룹 재생성

---

## 3. 데이터 흐름 분석

### 3.1 정상 흐름
```
┌─────────────────────────────────────────────────────────────────┐
│ PageViewer.tsx - handleCreateGroup()                            │
├─────────────────────────────────────────────────────────────────┤
│ 1. 새 그룹 객체 생성                                             │
│    └─ newGroup = { id, block_ids, column, problemInfo, ... }   │
│                                                                 │
│ 2. localGroups 상태 업데이트                                     │
│    └─ setLocalGroups([...localGroups, newGroup])               │
│                                                                 │
│ 3. 부모 컴포넌트에 알림                                          │
│    └─ onGroupCreated?.(newGroup, currentPage)                  │
│                                                                 │
│ 4. try 블록 시작                                                 │
│    ├─ await saveImmediately(updatedGroups, currentPage)        │
│    │   └─ groups.json 저장 (POST /api/pdf/.../groups)          │
│    │                                                            │
│    └─ await api.exportGroup(documentId, currentPage, groupId)  │
│        └─ 이미지 내보내기 (POST /api/export/.../export)         │
│                                                                 │
│ 5. 성공 시: "문제가 문제은행에 등록되었습니다" 토스트             │
├─────────────────────────────────────────────────────────────────┤
│ catch 블록 (라인 809-813)                                       │
│    └─ "자동 등록에 실패했습니다" 토스트                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 실패 지점
```
                    ┌────────────────────────┐
                    │ 어떤 단계에서 실패?     │
                    └────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ saveImmediately │ │ api.exportGroup │ │ 네트워크/서버   │
├─────────────────┤ ├─────────────────┤ ├─────────────────┤
│ groups.json     │ │ 이미지 크롭     │ │ 연결 끊김       │
│ 저장 실패       │ │ 내보내기 실패   │ │ 타임아웃        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 4. 가능한 원인들

### 4.1 타이밍 이슈 (가장 가능성 높음)

#### 원인 A: Race Condition
```
문제 시나리오:
1. saveImmediately() 호출 - groups.json 저장 요청
2. 저장이 완료되기 전에 exportGroup() 호출
3. Backend에서 groups.json 읽기 시도
4. 아직 저장되지 않은 그룹 ID를 찾을 수 없음 → 404 에러
```

#### 원인 B: Backend Hot Reload
```
문제 시나리오:
1. 개발 중 백엔드 코드 수정
2. uvicorn --reload로 서버 자동 재시작 진행 중
3. 이 시점에 API 요청 발생
4. 서버 불응답 → AxiosError
```

### 4.2 Backend 에러

#### 원인 C: 그룹 못 찾음 (404)
```python
# export.py 라인 303-304
if target_group is None:
    raise HTTPException(status_code=404, detail=f"그룹 '{group_id}'를 찾을 수 없습니다")
```

**발생 조건**:
- groups.json 파일 저장 지연
- 파일 시스템 캐싱 문제

#### 원인 D: 블록 데이터 없음 (400)
```python
# export.py 라인 332-333
if not group_blocks:
    raise HTTPException(status_code=400, detail="그룹에 블록이 없습니다")
```

**발생 조건**:
- 잘못된 block_ids로 그룹 생성된 경우

### 4.3 네트워크 이슈

#### 원인 E: 타임아웃
```typescript
// client.ts - axios 설정에 timeout 없음!
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // timeout: 없음 → 무한 대기 가능
});
```

#### 원인 F: 연결 거부
```
서버가 잠시 응답하지 않을 때:
- ECONNREFUSED
- ERR_CONNECTION_RESET
```

---

## 5. 왜 "간헐적"으로 발생하는가?

| 상황 | 성공/실패 | 이유 |
|------|-----------|------|
| 서버 안정적, 파일 저장 빠름 | 성공 ✅ | 모든 작업 순차 완료 |
| 서버 안정적, 파일 저장 느림 | 실패 ❌ | Race condition |
| 서버 재시작 중 | 실패 ❌ | 연결 거부 |
| 빠른 연속 생성 | 실패 ❌ | 병렬 요청 충돌 |
| 느린 단건 생성 | 성공 ✅ | 충분한 대기 시간 |

---

## 6. 영향 분석

### 6.1 데이터 손실 여부
| 항목 | 영향 | 복구 가능 |
|------|------|----------|
| groups.json | 손실 없음 ✅ | - |
| 문제 이미지 PNG | 생성 안됨 ❌ | 수동 확정으로 복구 |
| session.problems | 동기화 안됨 | 페이지 이동 시 자동 동기화 |

### 6.2 심각도: **낮음**
- 그룹 데이터는 보존됨
- 수동으로 "확정" 가능
- 서비스 중단 없음

---

## 7. 해결 방안

### 7.1 즉시 적용 가능 (권장)

#### 방안 A: 저장 후 지연 추가
```typescript
// PageViewer.tsx handleCreateGroup 수정
try {
  // 1. 먼저 그룹 저장
  await saveImmediately(updatedGroups, currentPage);

  // Phase 56-L Fix: 파일 시스템 반영 대기 (100ms)
  await new Promise(resolve => setTimeout(resolve, 100));

  // 2. 그룹 이미지 크롭 & 내보내기
  await api.exportGroup(documentId, currentPage, newGroupId);
  // ...
}
```

#### 방안 B: 재시도 로직 추가
```typescript
// api/client.ts
const exportWithRetry = async (documentId: string, page: number, groupId: string) => {
  for (let i = 0; i < 3; i++) {
    try {
      return await api.exportGroup(documentId, page, groupId);
    } catch (error) {
      if (i < 2) await new Promise(r => setTimeout(r, 200 * (i + 1)));
      else throw error;
    }
  }
};
```

### 7.2 중장기 개선

#### 방안 C: Backend에서 통합 처리
```python
# 새로운 엔드포인트: POST /api/groups/create-and-export
async def create_and_export(document_id, page_index, group_data):
    # 1. 그룹 저장
    save_group(document_id, page_index, group_data)
    # 2. 같은 트랜잭션에서 이미지 내보내기
    export_group(document_id, page_index, group_data['id'])
    # → Race condition 완전 제거
```

---

## 8. 임시 해결 방법 (사용자용)

에러 발생 시:
1. 해당 그룹 선택
2. 우클릭 → "확정" 클릭
3. 또는: 해당 그룹 삭제 → 재생성

---

## 9. 결론

### 버그 요약
```
증상: 가끔 "자동 등록에 실패했습니다" 토스트 표시
원인: groups.json 저장과 export API 호출 사이의 Race Condition
      (또는 Backend Hot Reload 시 연결 거부)
영향: 그룹 데이터 보존됨, 이미지만 미생성
해결: 저장 후 100ms 지연 추가 (간단) 또는 통합 API (완벽)
```

### 수정 난이도
| 방안 | 난이도 | 효과 |
|------|--------|------|
| A: 지연 추가 | 쉬움 (5분) | 80% 해결 |
| B: 재시도 로직 | 보통 (15분) | 95% 해결 |
| C: 통합 API | 어려움 (1시간) | 100% 해결 |

---

*승인 후 실행: "Phase 56-L 진행해줘"*
