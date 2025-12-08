"""
분류 트리 서비스

Phase 21+ A-1: 분류 체계 DB 구축

분류 트리 데이터의 로드, 검색, 캐싱을 담당
"""

import json
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from functools import lru_cache

from ...models.classification import (
    ClassificationNode,
    ClassificationPath,
    ClassificationSearchResult,
    ClassificationTreeResponse,
)

logger = logging.getLogger(__name__)


class ClassificationTreeService:
    """
    분류 트리 서비스

    싱글톤 패턴으로 트리 데이터를 메모리에 캐싱
    """

    _instance: Optional["ClassificationTreeService"] = None
    _initialized: bool = False

    def __new__(cls) -> "ClassificationTreeService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if ClassificationTreeService._initialized:
            return

        self._tree_data: Dict[str, Any] = {}
        self._nodes_by_id: Dict[int, ClassificationNode] = {}
        self._parent_map: Dict[int, int] = {}  # child_id -> parent_id

        self._load_tree_data()
        ClassificationTreeService._initialized = True

    def _load_tree_data(self) -> None:
        """트리 데이터 로드"""
        data_path = Path(__file__).parent.parent.parent / "data" / "classification" / "math_tree.json"

        if not data_path.exists():
            logger.warning(f"Classification tree file not found: {data_path}")
            self._tree_data = {"version": "1.0", "metadata": {}, "tree": []}
            return

        try:
            with open(data_path, "r", encoding="utf-8") as f:
                self._tree_data = json.load(f)

            # 인덱스 구축
            self._build_index(self._tree_data.get("tree", []))

            logger.info(
                f"Classification tree loaded: {len(self._nodes_by_id)} nodes"
            )
        except Exception as e:
            logger.error(f"Failed to load classification tree: {e}")
            self._tree_data = {"version": "1.0", "metadata": {}, "tree": []}

    def _build_index(
        self,
        nodes: List[Dict],
        parent_id: Optional[int] = None
    ) -> None:
        """노드 인덱스 구축 (재귀)"""
        for node_data in nodes:
            node = ClassificationNode(**node_data)
            self._nodes_by_id[node.id] = node

            if parent_id is not None:
                self._parent_map[node.id] = parent_id

            # 자식 노드 처리
            children = node_data.get("children", [])
            if children:
                self._build_index(children, node.id)

    def get_tree(self) -> ClassificationTreeResponse:
        """전체 트리 반환"""
        tree = [
            ClassificationNode(**node)
            for node in self._tree_data.get("tree", [])
        ]
        return ClassificationTreeResponse(
            version=self._tree_data.get("version", "1.0"),
            totalNodes=len(self._nodes_by_id),
            tree=tree,
        )

    def get_grades(self) -> List[ClassificationNode]:
        """학년 목록 (Level 1) 반환"""
        return [
            ClassificationNode(**node)
            for node in self._tree_data.get("tree", [])
        ]

    def get_node(self, node_id: int) -> Optional[ClassificationNode]:
        """특정 노드 조회"""
        return self._nodes_by_id.get(node_id)

    def get_children(self, parent_id: int) -> List[ClassificationNode]:
        """특정 노드의 자식 목록 반환"""
        parent = self._nodes_by_id.get(parent_id)
        if not parent:
            return []
        return parent.children

    def get_path(self, node_id: int) -> Optional[ClassificationPath]:
        """
        노드의 전체 경로 반환

        Args:
            node_id: 노드 ID

        Returns:
            ClassificationPath 또는 None
        """
        node = self._nodes_by_id.get(node_id)
        if not node:
            return None

        # 루트까지 경로 추적
        path_ids: List[int] = []
        path_names: List[str] = []
        current_id = node_id

        while current_id is not None:
            current_node = self._nodes_by_id.get(current_id)
            if current_node:
                path_ids.insert(0, current_id)
                path_names.insert(0, current_node.name)
            current_id = self._parent_map.get(current_id)

        # ClassificationPath 구성
        result = ClassificationPath(
            fullPath=" > ".join(path_names)
        )

        # 레벨별 ID 할당
        for i, pid in enumerate(path_ids):
            level = i + 1
            if level == 1:
                result.gradeId = pid
                result.gradeName = self._nodes_by_id[pid].name
            elif level == 2:
                result.majorUnitId = pid
            elif level == 3:
                result.middleUnitId = pid
            elif level == 4:
                result.minorUnitId = pid
            elif level == 5:
                result.typeId = pid

        return result

    def get_path_ids(self, node_id: int) -> List[int]:
        """노드의 경로 ID 목록 반환 (루트부터)"""
        path_ids: List[int] = []
        current_id: Optional[int] = node_id

        while current_id is not None:
            path_ids.insert(0, current_id)
            current_id = self._parent_map.get(current_id)

        return path_ids

    def search(
        self,
        query: str,
        level: Optional[int] = None,
        limit: int = 20
    ) -> List[ClassificationSearchResult]:
        """
        분류 검색

        Args:
            query: 검색어
            level: 특정 레벨에서만 검색 (1-5)
            limit: 최대 결과 수

        Returns:
            검색 결과 목록
        """
        if not query:
            return []

        query_lower = query.lower()
        results: List[ClassificationSearchResult] = []

        for node_id, node in self._nodes_by_id.items():
            # 레벨 필터
            if level is not None and node.level != level:
                continue

            name_lower = node.name.lower()
            full_name_lower = node.fullName.lower()

            # 매칭 검사
            score = 0.0
            match_type = ""

            if name_lower == query_lower:
                score = 1.0
                match_type = "exact"
            elif name_lower.startswith(query_lower):
                score = 0.8
                match_type = "prefix"
            elif query_lower in name_lower or query_lower in full_name_lower:
                score = 0.5
                match_type = "contains"

            if score > 0:
                path_ids = self.get_path_ids(node_id)
                path_names = [
                    self._nodes_by_id[pid].name
                    for pid in path_ids
                    if pid in self._nodes_by_id
                ]

                results.append(ClassificationSearchResult(
                    node=node,
                    path=" > ".join(path_names),
                    pathIds=path_ids,
                    matchType=match_type,
                    score=score,
                ))

        # 점수 내림차순 정렬
        results.sort(key=lambda r: (-r.score, r.node.level, r.node.order))

        return results[:limit]

    def get_nodes_by_level(self, level: int) -> List[ClassificationNode]:
        """특정 레벨의 모든 노드 반환"""
        return [
            node for node in self._nodes_by_id.values()
            if node.level == level
        ]

    def get_descendants(
        self,
        node_id: int,
        max_depth: Optional[int] = None
    ) -> List[ClassificationNode]:
        """
        노드의 모든 자손 반환

        Args:
            node_id: 노드 ID
            max_depth: 최대 깊이 (None이면 전체)

        Returns:
            자손 노드 목록
        """
        node = self._nodes_by_id.get(node_id)
        if not node:
            return []

        descendants: List[ClassificationNode] = []
        self._collect_descendants(node, descendants, 0, max_depth)
        return descendants

    def _collect_descendants(
        self,
        node: ClassificationNode,
        result: List[ClassificationNode],
        current_depth: int,
        max_depth: Optional[int]
    ) -> None:
        """자손 수집 (재귀)"""
        if max_depth is not None and current_depth >= max_depth:
            return

        for child in node.children:
            result.append(child)
            self._collect_descendants(child, result, current_depth + 1, max_depth)

    def count_nodes(self) -> int:
        """전체 노드 수 반환"""
        return len(self._nodes_by_id)

    def get_stats_by_level(self) -> Dict[int, int]:
        """레벨별 노드 수 통계"""
        stats: Dict[int, int] = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for node in self._nodes_by_id.values():
            if node.level in stats:
                stats[node.level] += 1
        return stats


# 싱글톤 인스턴스 접근 함수
def get_classification_service() -> ClassificationTreeService:
    """분류 서비스 싱글톤 인스턴스 반환"""
    return ClassificationTreeService()
