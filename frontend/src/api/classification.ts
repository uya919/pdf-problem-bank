/**
 * 분류 체계 API 클라이언트
 *
 * Phase 21+ A-1: 분류 체계 DB 구축
 */

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  ClassificationNode,
  ClassificationPath,
  ClassificationSearchResult,
  ClassificationTreeResponse,
  ClassificationStatsResponse,
} from '../types/classification';

// =============================================================================
// API 함수들
// =============================================================================

/**
 * 전체 분류 트리 조회
 */
async function fetchClassificationTree(): Promise<ClassificationTreeResponse> {
  const response = await apiClient.get<ClassificationTreeResponse>(
    '/api/classification/tree'
  );
  return response.data;
}

/**
 * 학년 목록 (Level 1) 조회
 */
async function fetchGrades(): Promise<ClassificationNode[]> {
  const response = await apiClient.get<ClassificationNode[]>(
    '/api/classification/grades'
  );
  return response.data;
}

/**
 * 특정 노드 조회
 */
async function fetchNode(nodeId: number): Promise<ClassificationNode> {
  const response = await apiClient.get<ClassificationNode>(
    `/api/classification/nodes/${nodeId}`
  );
  return response.data;
}

/**
 * 자식 노드 목록 조회
 */
async function fetchChildren(parentId: number): Promise<ClassificationNode[]> {
  const response = await apiClient.get<ClassificationNode[]>(
    `/api/classification/nodes/${parentId}/children`
  );
  return response.data;
}

/**
 * 노드 경로 조회
 */
async function fetchNodePath(nodeId: number): Promise<ClassificationPath> {
  const response = await apiClient.get<ClassificationPath>(
    `/api/classification/nodes/${nodeId}/path`
  );
  return response.data;
}

/**
 * 분류 검색
 */
async function searchClassification(
  query: string,
  level?: number,
  limit: number = 20
): Promise<ClassificationSearchResult[]> {
  const response = await apiClient.get<ClassificationSearchResult[]>(
    '/api/classification/search',
    {
      params: { q: query, level, limit },
    }
  );
  return response.data;
}

/**
 * 레벨별 노드 조회
 */
async function fetchNodesByLevel(level: number): Promise<ClassificationNode[]> {
  const response = await apiClient.get<ClassificationNode[]>(
    `/api/classification/by-level/${level}`
  );
  return response.data;
}

/**
 * 분류 통계 조회
 */
async function fetchClassificationStats(): Promise<ClassificationStatsResponse> {
  const response = await apiClient.get<ClassificationStatsResponse>(
    '/api/classification/stats'
  );
  return response.data;
}

// =============================================================================
// React Query 훅들
// =============================================================================

/**
 * 전체 분류 트리 조회 훅
 *
 * @example
 * const { data: tree, isLoading } = useClassificationTree();
 */
export function useClassificationTree() {
  return useQuery({
    queryKey: ['classification', 'tree'],
    queryFn: fetchClassificationTree,
    staleTime: 1000 * 60 * 60, // 1시간 캐시 (분류 데이터는 자주 변경되지 않음)
    gcTime: 1000 * 60 * 60 * 24, // 24시간 가비지 컬렉션
  });
}

/**
 * 학년 목록 조회 훅
 *
 * @example
 * const { data: grades } = useGrades();
 */
export function useGrades() {
  return useQuery({
    queryKey: ['classification', 'grades'],
    queryFn: fetchGrades,
    staleTime: Infinity, // 학년 목록은 변경되지 않음
  });
}

/**
 * 특정 노드 조회 훅
 *
 * @param nodeId - 노드 ID
 *
 * @example
 * const { data: node } = useClassificationNode(7);
 */
export function useClassificationNode(nodeId: number | null) {
  return useQuery({
    queryKey: ['classification', 'node', nodeId],
    queryFn: () => fetchNode(nodeId!),
    enabled: nodeId !== null,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });
}

/**
 * 자식 노드 목록 조회 훅
 *
 * @param parentId - 부모 노드 ID
 *
 * @example
 * const { data: children } = useClassificationChildren(7);
 */
export function useClassificationChildren(parentId: number | null) {
  return useQuery({
    queryKey: ['classification', 'children', parentId],
    queryFn: () => fetchChildren(parentId!),
    enabled: parentId !== null,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });
}

/**
 * 노드 경로 조회 훅
 *
 * @param nodeId - 노드 ID
 *
 * @example
 * const { data: path } = useClassificationPath(702020303);
 * // path.fullPath: "공통수학1 > 방정식과 부등식 > 이차방정식 > 근과 계수의 관계 > 근대입"
 */
export function useClassificationPath(nodeId: number | null) {
  return useQuery({
    queryKey: ['classification', 'path', nodeId],
    queryFn: () => fetchNodePath(nodeId!),
    enabled: nodeId !== null,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });
}

/**
 * 분류 검색 훅
 *
 * @param query - 검색어
 * @param level - 특정 레벨에서만 검색 (선택)
 * @param limit - 최대 결과 수 (기본: 20)
 *
 * @example
 * const { data: results } = useClassificationSearch('이차방정식');
 */
export function useClassificationSearch(
  query: string,
  level?: number,
  limit: number = 20
) {
  return useQuery({
    queryKey: ['classification', 'search', query, level, limit],
    queryFn: () => searchClassification(query, level, limit),
    enabled: query.length > 0,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
}

/**
 * 레벨별 노드 조회 훅
 *
 * @param level - 레벨 (1-5)
 *
 * @example
 * const { data: majorUnits } = useClassificationByLevel(2);
 */
export function useClassificationByLevel(level: number | null) {
  return useQuery({
    queryKey: ['classification', 'by-level', level],
    queryFn: () => fetchNodesByLevel(level!),
    enabled: level !== null && level >= 1 && level <= 5,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });
}

/**
 * 분류 통계 조회 훅
 *
 * @example
 * const { data: stats } = useClassificationStats();
 */
export function useClassificationStats() {
  return useQuery({
    queryKey: ['classification', 'stats'],
    queryFn: fetchClassificationStats,
    staleTime: 1000 * 60 * 10, // 10분 캐시
  });
}

// =============================================================================
// 유틸리티 훅
// =============================================================================

/**
 * 분류 트리에서 노드 맵 생성 훅
 *
 * 트리 데이터를 ID → Node 맵으로 변환하여
 * 빠른 조회가 가능하게 함
 *
 * @example
 * const nodeMap = useClassificationNodeMap();
 * const node = nodeMap.get(702);
 */
export function useClassificationNodeMap(): Map<number, ClassificationNode> {
  const { data: tree } = useClassificationTree();

  if (!tree) {
    return new Map();
  }

  const nodeMap = new Map<number, ClassificationNode>();

  function traverse(nodes: ClassificationNode[]) {
    for (const node of nodes) {
      nodeMap.set(node.id, node);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree.tree);
  return nodeMap;
}

/**
 * 분류 선택기 상태 관리 훅
 *
 * @example
 * const picker = useClassificationPicker();
 * picker.selectNode(node);
 * picker.goBack();
 * picker.confirm();
 */
export function useClassificationPicker(
  initialPath?: ClassificationPath,
  onConfirm?: (path: ClassificationPath) => void
) {
  const { data: grades } = useGrades();
  const queryClient = useQueryClient();

  // 선택 경로 상태 (ID 배열)
  const [selectedPath, setSelectedPath] = useState<number[]>(() => {
    if (!initialPath) return [];
    const path: number[] = [];
    if (initialPath.gradeId) path.push(initialPath.gradeId);
    if (initialPath.majorUnitId) path.push(initialPath.majorUnitId);
    if (initialPath.middleUnitId) path.push(initialPath.middleUnitId);
    if (initialPath.minorUnitId) path.push(initialPath.minorUnitId);
    if (initialPath.typeId) path.push(initialPath.typeId);
    return path;
  });

  // 현재 보여줄 레벨
  const [currentLevel, setCurrentLevel] = useState(() =>
    selectedPath.length > 0 ? selectedPath.length + 1 : 1
  );

  // 현재 레벨의 노드 가져오기
  const parentId = selectedPath[selectedPath.length - 1] ?? null;
  const { data: currentNodes } = useClassificationChildren(parentId);

  // 실제로 표시할 노드 (Level 1은 grades, 나머지는 children)
  const displayNodes = currentLevel === 1 ? grades : currentNodes;

  // 노드 선택
  const selectNode = (node: ClassificationNode) => {
    const newPath = [...selectedPath.slice(0, currentLevel - 1), node.id];
    setSelectedPath(newPath);

    // 자식이 있으면 다음 레벨로
    if (node.children && node.children.length > 0) {
      setCurrentLevel(currentLevel + 1);
    }
  };

  // 뒤로 가기
  const goBack = () => {
    if (currentLevel > 1) {
      setSelectedPath(selectedPath.slice(0, -1));
      setCurrentLevel(currentLevel - 1);
    }
  };

  // 리셋
  const reset = () => {
    setSelectedPath([]);
    setCurrentLevel(1);
  };

  // 선택 확인
  const confirm = () => {
    const path = buildPathFromIds(selectedPath);
    onConfirm?.(path);
    return path;
  };

  // ID 배열에서 ClassificationPath 생성
  const buildPathFromIds = (ids: number[]): ClassificationPath => {
    const result: ClassificationPath = {};
    const nodeMap = queryClient.getQueryData<Map<number, ClassificationNode>>([
      'classification',
      'nodeMap',
    ]);

    if (!nodeMap) {
      // 간단한 버전
      if (ids[0]) result.gradeId = ids[0];
      if (ids[1]) result.majorUnitId = ids[1];
      if (ids[2]) result.middleUnitId = ids[2];
      if (ids[3]) result.minorUnitId = ids[3];
      if (ids[4]) result.typeId = ids[4];
      return result;
    }

    const names: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      const node = nodeMap.get(ids[i]);
      if (!node) continue;

      names.push(node.name);
      switch (i) {
        case 0:
          result.gradeId = ids[i];
          result.gradeName = node.name;
          break;
        case 1:
          result.majorUnitId = ids[i];
          break;
        case 2:
          result.middleUnitId = ids[i];
          break;
        case 3:
          result.minorUnitId = ids[i];
          break;
        case 4:
          result.typeId = ids[i];
          break;
      }
    }

    result.fullPath = names.join(' > ');
    return result;
  };

  return {
    selectedPath,
    currentLevel,
    displayNodes,
    selectNode,
    goBack,
    reset,
    confirm,
    canGoBack: currentLevel > 1,
    canConfirm: selectedPath.length >= 3, // 최소 중단원까지 선택
  };
}
