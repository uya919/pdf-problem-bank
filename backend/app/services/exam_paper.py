"""
시험지(ExamPaper) 서비스

Phase 21+ D-1: 시험지 비즈니스 로직
"""

import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional, List
from functools import lru_cache

from ..models.exam_paper import (
    ExamPaper,
    ExamPaperCreate,
    ExamPaperUpdate,
    ExamPaperStatus,
    ExamSection,
    ExamProblemItem,
    ExamPaperSettings,
    ExamPaperListResponse,
    AddProblemToExam,
)
from ..config import config


class ExamPaperService:
    """시험지 서비스"""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or Path(config.DATASET_ROOT) / "exam_papers"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, ExamPaper] = {}
        self._load_all()

    def _load_all(self) -> None:
        """모든 시험지 로드"""
        self._cache.clear()
        for file_path in self.data_dir.glob("*.json"):
            try:
                data = json.loads(file_path.read_text(encoding="utf-8"))
                exam = ExamPaper(**data)
                self._cache[exam.id] = exam
            except Exception as e:
                print(f"시험지 로드 실패 ({file_path}): {e}")

    def _save(self, exam: ExamPaper) -> None:
        """시험지 저장"""
        file_path = self.data_dir / f"{exam.id}.json"
        file_path.write_text(
            exam.model_dump_json(indent=2),
            encoding="utf-8"
        )
        self._cache[exam.id] = exam

    def _delete_file(self, exam_id: str) -> None:
        """시험지 파일 삭제"""
        file_path = self.data_dir / f"{exam_id}.json"
        if file_path.exists():
            file_path.unlink()
        self._cache.pop(exam_id, None)

    def _calculate_stats(self, exam: ExamPaper) -> ExamPaper:
        """통계 계산"""
        total_problems = 0
        total_points = 0

        for section in exam.sections:
            total_problems += len(section.problems)
            total_points += sum(p.points for p in section.problems)

        exam.totalProblems = total_problems
        exam.totalPoints = total_points
        return exam

    # ========== CRUD ==========

    def list(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[ExamPaperStatus] = None,
    ) -> ExamPaperListResponse:
        """시험지 목록 조회"""
        items = list(self._cache.values())

        # 상태 필터
        if status:
            items = [e for e in items if e.status == status]

        # 정렬 (최신순)
        items.sort(key=lambda x: x.updatedAt, reverse=True)

        # 페이지네이션
        total = len(items)
        total_pages = (total + page_size - 1) // page_size
        start = (page - 1) * page_size
        end = start + page_size
        items = items[start:end]

        return ExamPaperListResponse(
            items=items,
            total=total,
            page=page,
            pageSize=page_size,
            totalPages=total_pages,
        )

    def get(self, exam_id: str) -> Optional[ExamPaper]:
        """시험지 조회"""
        return self._cache.get(exam_id)

    def create(self, data: ExamPaperCreate) -> ExamPaper:
        """시험지 생성"""
        now = datetime.now()

        # 기본 섹션 생성
        default_section = ExamSection(
            id=str(uuid.uuid4()),
            title="문제",
            problems=[],
            order=1,
        )

        exam = ExamPaper(
            id=str(uuid.uuid4()),
            name=data.name,
            description=data.description,
            status=ExamPaperStatus.DRAFT,
            sections=[default_section],
            settings=data.settings or ExamPaperSettings(),
            totalProblems=0,
            totalPoints=0,
            createdAt=now,
            updatedAt=now,
        )

        self._save(exam)
        return exam

    def update(self, exam_id: str, data: ExamPaperUpdate) -> Optional[ExamPaper]:
        """시험지 수정"""
        exam = self.get(exam_id)
        if not exam:
            return None

        # 필드 업데이트
        if data.name is not None:
            exam.name = data.name
        if data.description is not None:
            exam.description = data.description
        if data.status is not None:
            exam.status = data.status
        if data.sections is not None:
            exam.sections = data.sections
        if data.settings is not None:
            exam.settings = data.settings

        # 통계 재계산
        exam = self._calculate_stats(exam)
        exam.updatedAt = datetime.now()

        self._save(exam)
        return exam

    def delete(self, exam_id: str) -> bool:
        """시험지 삭제"""
        if exam_id not in self._cache:
            return False
        self._delete_file(exam_id)
        return True

    # ========== 문제 관리 ==========

    def add_problem(
        self,
        exam_id: str,
        problem_id: str,
        section_id: Optional[str] = None,
        points: int = 5,
    ) -> Optional[ExamPaper]:
        """시험지에 문제 추가"""
        exam = self.get(exam_id)
        if not exam or not exam.sections:
            return None

        # 섹션 찾기
        target_section = None
        if section_id:
            for section in exam.sections:
                if section.id == section_id:
                    target_section = section
                    break
        else:
            target_section = exam.sections[0]

        if not target_section:
            return None

        # 새 문제 항목 생성
        new_order = len(target_section.problems) + 1
        problem_item = ExamProblemItem(
            id=str(uuid.uuid4()),
            problemId=problem_id,
            order=new_order,
            points=points,
        )

        target_section.problems.append(problem_item)

        # 통계 재계산 및 저장
        exam = self._calculate_stats(exam)
        exam.updatedAt = datetime.now()
        self._save(exam)

        return exam

    def remove_problem(
        self,
        exam_id: str,
        problem_item_id: str,
    ) -> Optional[ExamPaper]:
        """시험지에서 문제 제거"""
        exam = self.get(exam_id)
        if not exam:
            return None

        # 문제 항목 찾아서 제거
        for section in exam.sections:
            for i, problem in enumerate(section.problems):
                if problem.id == problem_item_id:
                    section.problems.pop(i)
                    # 순서 재정렬
                    for j, p in enumerate(section.problems):
                        p.order = j + 1
                    break

        # 통계 재계산 및 저장
        exam = self._calculate_stats(exam)
        exam.updatedAt = datetime.now()
        self._save(exam)

        return exam

    def update_problem_points(
        self,
        exam_id: str,
        problem_item_id: str,
        points: int,
    ) -> Optional[ExamPaper]:
        """문제 배점 수정"""
        exam = self.get(exam_id)
        if not exam:
            return None

        for section in exam.sections:
            for problem in section.problems:
                if problem.id == problem_item_id:
                    problem.points = points
                    break

        exam = self._calculate_stats(exam)
        exam.updatedAt = datetime.now()
        self._save(exam)

        return exam

    def reorder_problems(
        self,
        exam_id: str,
        section_id: str,
        problem_item_ids: List[str],
    ) -> Optional[ExamPaper]:
        """문제 순서 변경"""
        exam = self.get(exam_id)
        if not exam:
            return None

        # 섹션 찾기
        target_section = None
        for section in exam.sections:
            if section.id == section_id:
                target_section = section
                break

        if not target_section:
            return None

        # ID로 문제 찾기
        problems_by_id = {p.id: p for p in target_section.problems}

        # 새 순서로 재정렬
        new_problems = []
        for i, item_id in enumerate(problem_item_ids):
            if item_id in problems_by_id:
                problem = problems_by_id[item_id]
                problem.order = i + 1
                new_problems.append(problem)

        target_section.problems = new_problems

        exam.updatedAt = datetime.now()
        self._save(exam)

        return exam

    # ========== 섹션 관리 ==========

    def add_section(
        self,
        exam_id: str,
        title: str,
        description: Optional[str] = None,
    ) -> Optional[ExamPaper]:
        """섹션 추가"""
        exam = self.get(exam_id)
        if not exam:
            return None

        new_order = len(exam.sections) + 1
        section = ExamSection(
            id=str(uuid.uuid4()),
            title=title,
            description=description,
            problems=[],
            order=new_order,
        )

        exam.sections.append(section)
        exam.updatedAt = datetime.now()
        self._save(exam)

        return exam

    def remove_section(
        self,
        exam_id: str,
        section_id: str,
    ) -> Optional[ExamPaper]:
        """섹션 삭제"""
        exam = self.get(exam_id)
        if not exam:
            return None

        # 최소 1개 섹션 유지
        if len(exam.sections) <= 1:
            return None

        exam.sections = [s for s in exam.sections if s.id != section_id]

        # 순서 재정렬
        for i, section in enumerate(exam.sections):
            section.order = i + 1

        exam = self._calculate_stats(exam)
        exam.updatedAt = datetime.now()
        self._save(exam)

        return exam

    def update_section(
        self,
        exam_id: str,
        section_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Optional[ExamPaper]:
        """섹션 수정"""
        exam = self.get(exam_id)
        if not exam:
            return None

        for section in exam.sections:
            if section.id == section_id:
                if title is not None:
                    section.title = title
                if description is not None:
                    section.description = description
                break

        exam.updatedAt = datetime.now()
        self._save(exam)

        return exam

    # ========== 복제 ==========

    def duplicate(self, exam_id: str, new_name: Optional[str] = None) -> Optional[ExamPaper]:
        """시험지 복제"""
        exam = self.get(exam_id)
        if not exam:
            return None

        now = datetime.now()

        # 새 ID 생성
        new_exam = ExamPaper(
            id=str(uuid.uuid4()),
            name=new_name or f"{exam.name} (복사본)",
            description=exam.description,
            status=ExamPaperStatus.DRAFT,
            sections=[
                ExamSection(
                    id=str(uuid.uuid4()),
                    title=s.title,
                    description=s.description,
                    problems=[
                        ExamProblemItem(
                            id=str(uuid.uuid4()),
                            problemId=p.problemId,
                            order=p.order,
                            points=p.points,
                            customNumber=p.customNumber,
                            note=p.note,
                        )
                        for p in s.problems
                    ],
                    order=s.order,
                )
                for s in exam.sections
            ],
            settings=exam.settings,
            totalProblems=exam.totalProblems,
            totalPoints=exam.totalPoints,
            createdAt=now,
            updatedAt=now,
        )

        self._save(new_exam)
        return new_exam


# ========== 의존성 주입 ==========

_service_instance: Optional[ExamPaperService] = None


def get_exam_paper_service() -> ExamPaperService:
    """ExamPaperService 싱글톤 반환"""
    global _service_instance
    if _service_instance is None:
        _service_instance = ExamPaperService()
    return _service_instance
