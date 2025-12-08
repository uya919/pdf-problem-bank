/**
 * 분류 체계 타입 정의
 *
 * Phase 21+ A-1: 분류 체계 DB 구축
 */

/**
 * 분류 레벨
 */
export type ClassificationLevel =
  | 'grade'       // 학년 (Level 1)
  | 'majorUnit'   // 대단원 (Level 2)
  | 'middleUnit'  // 중단원 (Level 3)
  | 'minorUnit'   // 소단원 (Level 4)
  | 'type';       // 유형 (Level 5)

/**
 * 분류 트리 노드
 *
 * 수학비서 5단계 분류 체계:
 * - Level 1: 학년 (중1-1, 중1-2, ..., 기하)
 * - Level 2: 대단원 (다항식, 방정식과 부등식 등)
 * - Level 3: 중단원 (복소수, 이차방정식 등)
 * - Level 4: 소단원 (이차방정식의 풀이, 판별식 등)
 * - Level 5: 유형 (근의 공식, 판별식의 뜻 등)
 */
export interface ClassificationNode {
  /** 노드 고유 ID */
  id: number;

  /** 노드 코드 (01, 02 등) */
  code: string;

  /** 노드 이름 (이차방정식) */
  name: string;

  /** 전체 이름 (03 이차방정식) */
  fullName: string;

  /** 레벨 (1-5) */
  level: number;

  /** 부모 노드 ID */
  parentId: number | null;

  /** 정렬 순서 */
  order: number;

  /** 하위 문제 수 (캐시) */
  problemCount: number;

  /** 자식 노드 목록 */
  children: ClassificationNode[];
}

/**
 * 분류 경로 (선택된 분류)
 *
 * 문제에 할당되는 분류 정보를 담는 타입
 */
export interface ClassificationPath {
  /** 학년 ID */
  gradeId?: number;

  /** 대단원 ID */
  majorUnitId?: number;

  /** 중단원 ID */
  middleUnitId?: number;

  /** 소단원 ID */
  minorUnitId?: number;

  /** 유형 ID */
  typeId?: number;

  /** 학년 이름 */
  gradeName?: string;

  /** 전체 경로 텍스트 */
  fullPath?: string;
}

/**
 * 분류 검색 결과
 */
export interface ClassificationSearchResult {
  /** 검색된 노드 */
  node: ClassificationNode;

  /** 전체 경로 텍스트 */
  path: string;

  /** 경로상의 노드 ID 목록 */
  pathIds: number[];

  /** 매칭 타입 (exact, prefix, contains) */
  matchType: 'exact' | 'prefix' | 'contains';

  /** 관련도 점수 (0-1) */
  score: number;
}

/**
 * 분류 트리 응답
 */
export interface ClassificationTreeResponse {
  /** 데이터 버전 */
  version: string;

  /** 전체 노드 수 */
  totalNodes: number;

  /** 트리 데이터 */
  tree: ClassificationNode[];
}

/**
 * 분류 통계 응답
 */
export interface ClassificationStatsResponse {
  /** 전체 노드 수 */
  total: number;

  /** 레벨별 노드 수 */
  byLevel: {
    grade: number;
    majorUnit: number;
    middleUnit: number;
    minorUnit: number;
    type: number;
  };

  /** 레벨 이름 */
  levelNames: Record<number, string>;
}

/**
 * 레벨 정보
 */
export const CLASSIFICATION_LEVELS: Record<number, { name: string; korName: string }> = {
  1: { name: 'grade', korName: '학년' },
  2: { name: 'majorUnit', korName: '대단원' },
  3: { name: 'middleUnit', korName: '중단원' },
  4: { name: 'minorUnit', korName: '소단원' },
  5: { name: 'type', korName: '유형' },
};

/**
 * ClassificationPath에서 가장 깊은 레벨의 ID 반환
 */
export function getDeepestId(path: ClassificationPath): number | undefined {
  if (path.typeId) return path.typeId;
  if (path.minorUnitId) return path.minorUnitId;
  if (path.middleUnitId) return path.middleUnitId;
  if (path.majorUnitId) return path.majorUnitId;
  return path.gradeId;
}

/**
 * ClassificationPath의 선택된 레벨 반환 (1-5)
 */
export function getSelectedLevel(path: ClassificationPath): number {
  if (path.typeId) return 5;
  if (path.minorUnitId) return 4;
  if (path.middleUnitId) return 3;
  if (path.majorUnitId) return 2;
  if (path.gradeId) return 1;
  return 0;
}

/**
 * 노드 ID 목록에서 ClassificationPath 생성
 */
export function buildClassificationPath(
  pathIds: number[],
  nodes: Map<number, ClassificationNode>
): ClassificationPath {
  const result: ClassificationPath = {};
  const names: string[] = [];

  for (let i = 0; i < pathIds.length; i++) {
    const id = pathIds[i];
    const node = nodes.get(id);
    if (!node) continue;

    names.push(node.name);

    switch (i) {
      case 0:
        result.gradeId = id;
        result.gradeName = node.name;
        break;
      case 1:
        result.majorUnitId = id;
        break;
      case 2:
        result.middleUnitId = id;
        break;
      case 3:
        result.minorUnitId = id;
        break;
      case 4:
        result.typeId = id;
        break;
    }
  }

  result.fullPath = names.join(' > ');
  return result;
}
