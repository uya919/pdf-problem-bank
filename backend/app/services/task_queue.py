"""
백그라운드 작업 큐 관리 (Phase 1, Phase 14-1)

PDF 업로드 후 나머지 페이지를 백그라운드에서 처리
Phase 14-1: 점진적 변환 지원 (이미지 변환 + 블록 분석)
"""
from typing import Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import sys
import uuid

# 프로젝트 루트 추가
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root / "src"))

from pdf_pipeline import PDFPipeline


@dataclass
class BackgroundTask:
    """백그라운드 작업 정보"""
    task_id: str
    document_id: str
    start_page: int
    total_pages: int
    batch_size: int
    status: str  # "pending", "processing", "completed", "failed"
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    progress: int = 0  # 처리 완료된 페이지 수
    pdf_path: Optional[str] = None  # Phase 14-1: 원본 PDF 경로
    progressive: bool = False  # Phase 14-1: 점진적 처리 모드


class BackgroundTaskQueue:
    """백그라운드 작업 큐"""

    def __init__(self):
        self.tasks: Dict[str, BackgroundTask] = {}

    def add_task(
        self,
        document_id: str,
        start_page: int,
        total_pages: int,
        batch_size: int
    ) -> str:
        """
        작업 추가

        Args:
            document_id: 문서 ID
            start_page: 시작 페이지 (이미 분석된 다음 페이지)
            total_pages: 전체 페이지 수
            batch_size: 배치 크기

        Returns:
            task_id: 작업 ID
        """
        task_id = str(uuid.uuid4())

        task = BackgroundTask(
            task_id=task_id,
            document_id=document_id,
            start_page=start_page,
            total_pages=total_pages,
            batch_size=batch_size,
            status="pending",
            created_at=datetime.now()
        )

        self.tasks[task_id] = task

        print(f"[TaskQueue] 작업 추가: {task_id} - {document_id} ({start_page}~{total_pages})")

        return task_id

    def add_progressive_task(
        self,
        document_id: str,
        pdf_path: str,
        start_page: int,
        total_pages: int,
        batch_size: int = 10
    ) -> str:
        """
        Phase 14-1: 점진적 변환 작업 추가 (이미지 변환 + 블록 분석)

        Args:
            document_id: 문서 ID
            pdf_path: 원본 PDF 파일 경로
            start_page: 시작 페이지 (이미 처리된 다음 페이지)
            total_pages: 전체 페이지 수
            batch_size: 배치 크기

        Returns:
            task_id: 작업 ID
        """
        task_id = str(uuid.uuid4())

        task = BackgroundTask(
            task_id=task_id,
            document_id=document_id,
            start_page=start_page,
            total_pages=total_pages,
            batch_size=batch_size,
            status="pending",
            created_at=datetime.now(),
            pdf_path=pdf_path,
            progressive=True
        )

        self.tasks[task_id] = task

        print(f"[TaskQueue] 점진적 작업 추가: {task_id} - {document_id} ({start_page}~{total_pages})")

        return task_id

    async def process_progressive_task(self, task_id: str, pipeline: PDFPipeline):
        """
        Phase 14-1: 점진적 작업 처리 (이미지 변환 + 블록 분석 함께)

        Args:
            task_id: 작업 ID
            pipeline: PDFPipeline 인스턴스
        """
        if task_id not in self.tasks:
            print(f"[TaskQueue 오류] 작업을 찾을 수 없음: {task_id}")
            return

        task = self.tasks[task_id]
        task.status = "processing"

        print(f"[TaskQueue] 점진적 작업 시작: {task_id}")

        try:
            current_page = task.start_page
            pdf_path = Path(task.pdf_path)

            while current_page < task.total_pages:
                # 점진적 배치 처리 (이미지 변환 + 블록 분석)
                result = pipeline.process_next_batch_progressive(
                    document_id=task.document_id,
                    pdf_path=pdf_path,
                    start_page=current_page,
                    batch_size=task.batch_size
                )

                if result["processed_pages"] > 0:
                    task.progress = current_page + result["processed_pages"]
                    print(f"[TaskQueue] 진행: {task.progress}/{task.total_pages}")

                current_page += task.batch_size

                # 완료 체크
                if result["status"] == "completed":
                    break

            # 완료
            task.status = "completed"
            task.completed_at = datetime.now()

            # PDF 캐시 정리
            pipeline.pdf_processor.close_pdf_cache(pdf_path)

            print(f"[TaskQueue] 점진적 작업 완료: {task_id}")

        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            task.completed_at = datetime.now()

            print(f"[TaskQueue 오류] 점진적 작업 실패: {task_id} - {str(e)}")
            import traceback
            traceback.print_exc()

    async def process_task(self, task_id: str, pipeline: PDFPipeline):
        """
        작업 처리 (백그라운드에서 실행)

        Args:
            task_id: 작업 ID
            pipeline: PDFPipeline 인스턴스
        """
        if task_id not in self.tasks:
            print(f"[TaskQueue 오류] 작업을 찾을 수 없음: {task_id}")
            return

        task = self.tasks[task_id]
        task.status = "processing"

        print(f"[TaskQueue] 작업 시작: {task_id}")

        try:
            current_page = task.start_page

            while current_page < task.total_pages:
                # 배치 분석
                analyzed_count = pipeline.analyze_next_batch(
                    document_id=task.document_id,
                    start_page=current_page,
                    batch_size=task.batch_size
                )

                if analyzed_count > 0:
                    task.progress = current_page + analyzed_count
                    print(f"[TaskQueue] 진행: {task.progress}/{task.total_pages}")

                current_page += task.batch_size

            # 완료
            task.status = "completed"
            task.completed_at = datetime.now()

            print(f"[TaskQueue] 작업 완료: {task_id}")

        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            task.completed_at = datetime.now()

            print(f"[TaskQueue 오류] 작업 실패: {task_id} - {str(e)}")
            import traceback
            traceback.print_exc()

    def get_task_status(self, task_id: str) -> Optional[Dict]:
        """
        작업 상태 조회

        Args:
            task_id: 작업 ID

        Returns:
            작업 상태 딕셔너리 또는 None
        """
        if task_id not in self.tasks:
            return None

        task = self.tasks[task_id]

        return {
            "task_id": task.task_id,
            "document_id": task.document_id,
            "status": task.status,
            "progress": task.progress,
            "total_pages": task.total_pages,
            "created_at": task.created_at.isoformat(),
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "error": task.error
        }

    def list_tasks(self, document_id: Optional[str] = None) -> list[Dict]:
        """
        작업 목록 조회

        Args:
            document_id: 특정 문서의 작업만 조회 (선택)

        Returns:
            작업 목록
        """
        tasks = []

        for task in self.tasks.values():
            if document_id and task.document_id != document_id:
                continue

            tasks.append({
                "task_id": task.task_id,
                "document_id": task.document_id,
                "status": task.status,
                "progress": task.progress,
                "total_pages": task.total_pages,
                "created_at": task.created_at.isoformat()
            })

        # 최신순 정렬
        tasks.sort(key=lambda x: x["created_at"], reverse=True)

        return tasks
