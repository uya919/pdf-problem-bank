# Phase 34.5 에러 리포트: DocumentCombo Export 오류

> **작성일**: 2025-12-03
> **상태**: 분석 완료, 해결 필요

---

## 1. 에러 요약

### 증상
```
The requested module '/@fs/C:/MYCLAUDE_PROJECT/pdf/frontend/src/lib/documentParser.ts'
does not provide an export named 'DocumentCombo'
```

### 영향
- 프론트엔드 전체 렌더링 실패 (빈 화면)
- HeroSection 및 관련 컴포넌트 로드 불가

---

## 2. 조사 결과

### 2.1 파일 상태

| 항목 | 값 |
|------|-----|
| 파일 경로 | `frontend/src/lib/documentParser.ts` |
| 파일 크기 | 7,460 bytes |
| 마지막 수정 | 2025-12-03 02:49 |
| TypeScript 컴파일 | ✅ 성공 (`npx tsc --noEmit` 통과) |

### 2.2 Export 확인

```typescript
// Line 8: SchoolLevel export
export type SchoolLevel = 'elementary' | 'middle' | 'high';

// Line 19: DocumentCombo export
export interface DocumentCombo {
  id: string;
  schoolLevel: SchoolLevel;
  grade: string;
  course: string;
  series: string;
  problemDocId: string | null;
  solutionDocId: string | null;
  isComplete: boolean;
}
```

**결론**: 파일 내용은 정상. Export가 올바르게 정의됨.

### 2.3 Import 사용처 (9개 파일)

```
✓ hooks/useDocumentSearch.ts
✓ hooks/useDocumentIndex.ts
✓ components/main/BrowseAllSection.tsx
✓ components/main/GradeCourseSelector.tsx
✓ components/main/HeroSection.tsx
✓ components/main/SchoolTabs.tsx
✓ components/main/SearchResultItem.tsx
✓ components/main/SeriesGrid.tsx
✓ components/main/SmartSearchBox.tsx
```

### 2.4 빌드 환경

| 도구 | 버전 |
|------|------|
| Vite | 7.2.2 |
| TypeScript | (프로젝트 버전) |
| Node.js | (시스템 버전) |

---

## 3. 추정 원인

### 원인 1: Vite 모듈 캐시 문제 (가장 유력)

Vite의 ESM 변환 캐시가 파일 변경을 제대로 반영하지 못하는 것으로 추정.

**증거**:
- `node_modules/.vite` 삭제 후에도 동일 에러 발생
- TypeScript 컴파일은 성공하나 Vite 런타임에서 실패
- 여러 Vite 서버가 동시 실행되어 혼란 야기

### 원인 2: 파일 인코딩/BOM 문제

파일이 UTF-8이나 특수 인코딩으로 저장되어 Vite 파서가 제대로 읽지 못할 가능성.

**증거**:
- PowerShell에서 파일 읽기 시 한글 주석 깨짐 발생
- 파일 시작 부분에 BOM(Byte Order Mark) 존재 가능성

### 원인 3: Windows 파일 잠금

Windows에서 파일이 다른 프로세스에 의해 잠겨 있어 최신 버전을 읽지 못하는 경우.

---

## 4. 해결 방안

### 방안 A: 파일 재생성 (권장)

1. `documentParser.ts` 파일을 새 이름으로 복사
2. 원본 파일 삭제
3. 새 파일을 원본 이름으로 변경
4. 모든 서버 재시작

```powershell
# 실행 순서
cd frontend/src/lib
copy documentParser.ts documentParser_backup.ts
del documentParser.ts
# 파일 새로 생성 (Claude Code)
```

### 방안 B: Vite 캐시 완전 삭제

```powershell
# frontend 디렉토리에서
rmdir /s /q node_modules\.vite
rmdir /s /q .vite
del /q package-lock.json
npm install
npm run dev
```

### 방안 C: 파일 인코딩 재저장

1. VS Code에서 파일 열기
2. 우하단 인코딩 클릭 → "Save with Encoding" → "UTF-8" (BOM 없음)
3. 저장

### 방안 D: 브라우저 캐시 삭제

1. Chrome DevTools 열기 (F12)
2. Network 탭 → "Disable cache" 체크
3. Application 탭 → Storage → Clear site data
4. 새로고침

---

## 5. 즉시 실행 계획

1. **모든 Node 프로세스 종료**
   ```powershell
   taskkill /F /IM node.exe
   ```

2. **documentParser.ts 파일 재생성**
   - ASCII 호환 주석으로 변경 (한글 제거)
   - UTF-8 인코딩으로 명시적 저장

3. **Vite 캐시 완전 삭제 후 재시작**

4. **테스트**

---

## 6. 예방 조치

1. **단일 서버 실행 원칙**: 항상 기존 서버 종료 후 새 서버 시작
2. **캐시 정리 스크립트**: `dev.ps1`에 Vite 캐시 자동 정리 추가
3. **파일 인코딩 표준화**: 모든 소스 파일 UTF-8 (BOM 없음)

---

*리포트 작성: Claude Code*
*최종 업데이트: 2025-12-03*
