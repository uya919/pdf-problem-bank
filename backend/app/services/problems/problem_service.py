"""
문제(Problem) 서비스

Phase 21+ A-2: Problem CRUD 서비스

문제 데이터의 생성, 조회, 수정, 삭제를 담당하는 서비스
JSON 파일 기반 저장소 사용
"""

import json
import os
from pathlib import Path
from typing import List, Optional, Tuple
from datetime import datetime
import threading

from ...models.problem import (
    Problem,
    ProblemCreate,
    ProblemUpdate,
    ProblemFilter,
    ProblemListResponse,
    ProblemStats,
)


class ProblemService:
    """
    문제 서비스

    싱글톤 패턴으로 구현되어 애플리케이션 전체에서 하나의 인스턴스만 사용
    """

    _instance: Optional["ProblemService"] = None
    _lock = threading.Lock()

    def __new__(cls, data_dir: Optional[str] = None):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, data_dir: Optional[str] = None):
        if self._initialized:
            return

        # 데이터 디렉토리 설정
        if data_dir:
            self._data_dir = Path(data_dir)
        else:
            # 기본 위치: backend/app/data/problems
            self._data_dir = Path(__file__).parent.parent.parent / "data" / "problems"

        self._data_dir.mkdir(parents=True, exist_ok=True)

        # 문제 저장 파일
        self._problems_file = self._data_dir / "problems.json"

        # 메모리 캐시
        self._problems: dict[str, Problem] = {}

        # 데이터 로드
        self._load_problems()

        self._initialized = True

    def _load_problems(self) -> None:
        """JSON 파일에서 문제 데이터 로드"""
        if not self._problems_file.exists():
            self._problems = {}
            return

        try:
            with open(self._problems_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            self._problems = {}
            for item in data:
                problem = Problem(**item)
                self._problems[problem.id] = problem

        except Exception as e:
            print(f"[ProblemService] 문제 로드 실패: {e}")
            self._problems = {}

    def _save_problems(self) -> None:
        """문제 데이터를 JSON 파일에 저장"""
        try:
            data = [p.model_dump(mode="json") for p in self._problems.values()]
            with open(self._problems_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        except Exception as e:
            print(f"[ProblemService] 문제 저장 실패: {e}")

    # ========== CRUD 메서드 ==========

    def create(self, data: ProblemCreate) -> Problem:
        """
        문제 생성

        Args:
            data: 문제 생성 데이터

        Returns:
            생성된 문제
        """
        problem = Problem(
            classification=data.classification,
            questionType=data.questionType,
            difficulty=data.difficulty,
            points=data.points,
            content=data.content,
            source=data.source,
            tags=data.tags,
        )

        self._problems[problem.id] = problem
        self._save_problems()

        return problem

    def get(self, problem_id: str) -> Optional[Problem]:
        """
        문제 조회

        Args:
            problem_id: 문제 ID

        Returns:
            문제 또는 None
        """
        return self._problems.get(problem_id)

    def bulk_get(self, problem_ids: List[str]) -> List[Problem]:
        """
        문제 일괄 조회

        Phase F-1: 미리보기에서 여러 문제를 한 번에 조회

        Args:
            problem_ids: 문제 ID 목록

        Returns:
            조회된 문제 목록 (존재하는 문제만)
        """
        result = []
        for pid in problem_ids:
            problem = self._problems.get(pid)
            if problem:
                result.append(problem)
        return result

    def update(self, problem_id: str, data: ProblemUpdate) -> Optional[Problem]:
        """
        문제 수정

        Args:
            problem_id: 문제 ID
            data: 수정 데이터 (None이 아닌 필드만 수정)

        Returns:
            수정된 문제 또는 None
        """
        problem = self._problems.get(problem_id)
        if not problem:
            return None

        # 수정 가능한 필드들
        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            if value is not None:
                setattr(problem, key, value)

        # 수정 시각 갱신
        problem.updatedAt = datetime.now()

        self._problems[problem_id] = problem
        self._save_problems()

        return problem

    def delete(self, problem_id: str) -> bool:
        """
        문제 삭제

        Args:
            problem_id: 문제 ID

        Returns:
            삭제 성공 여부
        """
        if problem_id not in self._problems:
            return False

        del self._problems[problem_id]
        self._save_problems()

        return True

    # ========== 목록/검색 메서드 ==========

    def list(
        self,
        filter: Optional[ProblemFilter] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "createdAt",
        sort_desc: bool = True,
    ) -> ProblemListResponse:
        """
        문제 목록 조회 (필터링, 페이지네이션 지원)

        Args:
            filter: 필터 조건
            page: 페이지 번호 (1부터 시작)
            page_size: 페이지 크기
            sort_by: 정렬 기준 필드
            sort_desc: 내림차순 정렬 여부

        Returns:
            페이지네이션된 문제 목록
        """
        # 필터링
        problems = list(self._problems.values())

        if filter:
            problems = self._apply_filter(problems, filter)

        # 정렬
        problems = self._sort_problems(problems, sort_by, sort_desc)

        # 페이지네이션
        total = len(problems)
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1

        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_items = problems[start_idx:end_idx]

        return ProblemListResponse(
            items=page_items,
            total=total,
            page=page,
            pageSize=page_size,
            totalPages=total_pages,
        )

    def _apply_filter(
        self,
        problems: List[Problem],
        filter: ProblemFilter,
    ) -> List[Problem]:
        """필터 적용"""
        result = problems

        # 분류 필터
        if filter.gradeIds:
            result = [
                p for p in result
                if p.classification and p.classification.gradeId in filter.gradeIds
            ]

        if filter.majorUnitIds:
            result = [
                p for p in result
                if p.classification and p.classification.majorUnitId in filter.majorUnitIds
            ]

        if filter.middleUnitIds:
            result = [
                p for p in result
                if p.classification and p.classification.middleUnitId in filter.middleUnitIds
            ]

        if filter.minorUnitIds:
            result = [
                p for p in result
                if p.classification and p.classification.minorUnitId in filter.minorUnitIds
            ]

        if filter.typeIds:
            result = [
                p for p in result
                if p.classification and p.classification.typeId in filter.typeIds
            ]

        # 속성 필터
        if filter.questionTypes:
            result = [p for p in result if p.questionType in filter.questionTypes]

        if filter.difficultyMin is not None:
            result = [p for p in result if p.difficulty >= filter.difficultyMin]

        if filter.difficultyMax is not None:
            result = [p for p in result if p.difficulty <= filter.difficultyMax]

        # 출처 필터
        if filter.sourceTypes:
            result = [p for p in result if p.source.type in filter.sourceTypes]

        if filter.years:
            result = [
                p for p in result
                if p.source.year and p.source.year in filter.years
            ]

        if filter.organizations:
            result = [
                p for p in result
                if p.source.organization and p.source.organization in filter.organizations
            ]

        # 기타 필터
        if filter.tags:
            result = [
                p for p in result
                if any(tag in p.tags for tag in filter.tags)
            ]

        if filter.hasAnswer is not None:
            if filter.hasAnswer:
                result = [p for p in result if p.content.answer]
            else:
                result = [p for p in result if not p.content.answer]

        if filter.hasSolution is not None:
            if filter.hasSolution:
                result = [
                    p for p in result
                    if p.content.solution or p.content.solutionImageUrl
                ]
            else:
                result = [
                    p for p in result
                    if not p.content.solution and not p.content.solutionImageUrl
                ]

        if filter.isFavorite is not None:
            result = [p for p in result if p.isFavorite == filter.isFavorite]

        # 검색
        if filter.searchQuery:
            query = filter.searchQuery.lower()
            result = [
                p for p in result
                if self._matches_search(p, query)
            ]

        return result

    def _matches_search(self, problem: Problem, query: str) -> bool:
        """검색어 매칭 확인"""
        # 태그 검색
        if any(query in tag.lower() for tag in problem.tags):
            return True

        # 분류 경로 검색
        if problem.classification and problem.classification.fullPath:
            if query in problem.classification.fullPath.lower():
                return True

        # 출처 검색
        if query in problem.source.name.lower():
            return True

        # OCR 텍스트 검색
        if problem.content.ocrText and query in problem.content.ocrText.lower():
            return True

        return False

    def _sort_problems(
        self,
        problems: List[Problem],
        sort_by: str,
        sort_desc: bool,
    ) -> List[Problem]:
        """정렬 적용"""
        def get_sort_key(p: Problem):
            value = getattr(p, sort_by, None)
            if value is None:
                return "" if isinstance(getattr(Problem, sort_by, None), str) else 0
            return value

        return sorted(problems, key=get_sort_key, reverse=sort_desc)

    # ========== 통계 메서드 ==========

    def get_stats(self) -> ProblemStats:
        """
        문제 통계 조회

        Returns:
            문제 통계
        """
        problems = list(self._problems.values())

        # 문제 유형별 개수
        by_question_type: dict[str, int] = {}
        for p in problems:
            by_question_type[p.questionType] = by_question_type.get(p.questionType, 0) + 1

        # 난이도별 개수
        by_difficulty: dict[str, int] = {}
        for p in problems:
            key = str(p.difficulty)
            by_difficulty[key] = by_difficulty.get(key, 0) + 1

        # 학년별 개수
        by_grade: dict[str, int] = {}
        for p in problems:
            if p.classification and p.classification.gradeName:
                grade = p.classification.gradeName
                by_grade[grade] = by_grade.get(grade, 0) + 1

        # 최근 추가 (7일 이내)
        now = datetime.now()
        recently_added = sum(
            1 for p in problems
            if (now - p.createdAt).days <= 7
        )

        # 즐겨찾기
        favorites = sum(1 for p in problems if p.isFavorite)

        return ProblemStats(
            total=len(problems),
            byQuestionType=by_question_type,
            byDifficulty=by_difficulty,
            byGrade=by_grade,
            recentlyAdded=recently_added,
            favorites=favorites,
        )

    # ========== 유틸리티 메서드 ==========

    def increment_usage(self, problem_id: str) -> Optional[Problem]:
        """
        문제 사용 횟수 증가

        Args:
            problem_id: 문제 ID

        Returns:
            수정된 문제 또는 None
        """
        problem = self._problems.get(problem_id)
        if not problem:
            return None

        problem.usageCount += 1
        problem.lastUsedAt = datetime.now()

        self._save_problems()

        return problem

    def toggle_favorite(self, problem_id: str) -> Optional[Problem]:
        """
        즐겨찾기 토글

        Args:
            problem_id: 문제 ID

        Returns:
            수정된 문제 또는 None
        """
        problem = self._problems.get(problem_id)
        if not problem:
            return None

        problem.isFavorite = not problem.isFavorite
        problem.updatedAt = datetime.now()

        self._save_problems()

        return problem

    def bulk_create(self, items: List[ProblemCreate]) -> List[Problem]:
        """
        문제 일괄 생성

        Args:
            items: 생성할 문제 목록

        Returns:
            생성된 문제 목록
        """
        created = []
        for data in items:
            problem = Problem(
                classification=data.classification,
                questionType=data.questionType,
                difficulty=data.difficulty,
                points=data.points,
                content=data.content,
                source=data.source,
                tags=data.tags,
            )
            self._problems[problem.id] = problem
            created.append(problem)

        self._save_problems()

        return created

    def get_all_tags(self) -> List[str]:
        """
        모든 태그 목록 조회

        Returns:
            중복 제거된 태그 목록
        """
        tags = set()
        for p in self._problems.values():
            tags.update(p.tags)
        return sorted(tags)

    def get_by_source(
        self,
        document_id: str,
        group_id: Optional[str] = None,
    ) -> List[Problem]:
        """
        출처 기준 문제 조회 (라벨링 시스템 연동용)

        Args:
            document_id: 문서 ID
            group_id: 그룹 ID (선택)

        Returns:
            해당 출처의 문제 목록
        """
        result = []
        for p in self._problems.values():
            if p.source.documentId == document_id:
                if group_id is None or p.source.groupId == group_id:
                    result.append(p)
        return result

    @classmethod
    def reset_instance(cls) -> None:
        """싱글톤 인스턴스 초기화 (테스트용)"""
        cls._instance = None


# 의존성 주입용 함수
def get_problem_service() -> ProblemService:
    """ProblemService 인스턴스 반환 (FastAPI Depends용)"""
    return ProblemService()
