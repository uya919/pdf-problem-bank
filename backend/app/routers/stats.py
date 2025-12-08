"""
통계 API 라우터 (Phase 6-2)

대시보드에 표시될 통계 데이터 제공

Phase 12: utils 모듈 적용
"""
from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import Dict, List, Any

from ..config import config
from ..utils import load_json, load_json_or_default
from ..utils.formatters import format_time_ago

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/dashboard")
async def get_dashboard_stats() -> Dict[str, Any]:
    """
    대시보드 통계 조회

    Returns:
        - total_documents: 전체 문서 수
        - total_problems: 추출된 문제 수
        - in_progress_documents: 작업 중인 문서 수
        - completion_rate: 완료율 (%)
        - recent_activities: 최근 활동 목록
        - document_progress: 문서별 진행률
    """
    try:
        # 문서 목록 조회
        documents = []
        if config.DOCUMENTS_DIR.exists():
            for doc_dir in config.DOCUMENTS_DIR.iterdir():
                if doc_dir.is_dir():
                    meta_path = doc_dir / "meta.json"
                    if meta_path.exists():
                        # Phase 12: load_json 사용
                        meta = load_json(meta_path)
                        documents.append({
                            'document_id': doc_dir.name,
                            'total_pages': meta.get('total_pages', 0),
                            'analyzed_pages': meta.get('analyzed_pages', 0),
                            'created_at': meta.get('created_at', 0)
                        })

        total_documents = len(documents)

        # Phase 12-1: 추출된 문제 수 계산 (config 경로 수정)
        total_problems = 0
        for doc in documents:
            doc_id = doc['document_id']
            doc_dir = config.get_document_dir(doc_id)
            problems_dir = doc_dir / "problems"
            if problems_dir.exists():
                # Phase 12: load_json_or_default 사용
                problems_json = problems_dir / "problems.json"
                problems_data = load_json_or_default(problems_json, {'problems': []})
                total_problems += len(problems_data.get('problems', []))

        # 작업 중인 문서 수 (analyzed_pages < total_pages)
        in_progress_documents = sum(
            1 for doc in documents
            if doc['analyzed_pages'] < doc['total_pages']
        )

        # 완료율 계산
        if total_documents > 0:
            completed_documents = total_documents - in_progress_documents
            completion_rate = round((completed_documents / total_documents) * 100)
        else:
            completion_rate = 0

        # 최근 활동 목록 (최근 3개 문서, created_at 기준 정렬)
        recent_docs = sorted(documents, key=lambda x: x['created_at'], reverse=True)[:3]
        recent_activities = []
        for doc in recent_docs:
            status = 'completed' if doc['analyzed_pages'] >= doc['total_pages'] else 'in_progress'

            # Phase 12: format_time_ago 사용
            time_str = format_time_ago(doc['created_at'])

            recent_activities.append({
                'document_id': doc['document_id'],
                'name': doc['document_id'],  # TODO: 나중에 실제 문서 이름으로 교체
                'time': time_str,
                'status': status
            })

        # 문서별 진행률 (상위 2개)
        document_progress = []
        for doc in recent_docs[:2]:
            progress = 0
            if doc['total_pages'] > 0:
                progress = round((doc['analyzed_pages'] / doc['total_pages']) * 100)

            document_progress.append({
                'document_id': doc['document_id'],
                'name': doc['document_id'],  # TODO: 실제 문서 이름
                'progress': progress
            })

        # 대기 중인 페이지 수
        pending_pages = sum(
            doc['total_pages'] - doc['analyzed_pages']
            for doc in documents
            if doc['analyzed_pages'] < doc['total_pages']
        )

        return {
            'total_documents': total_documents,
            'total_problems': total_problems,
            'in_progress_documents': in_progress_documents,
            'completion_rate': completion_rate,
            'recent_activities': recent_activities,
            'document_progress': document_progress,
            'pending_pages': pending_pages
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 조회 실패: {str(e)}")


@router.get("/documents/{document_id}/stats")
async def get_document_stats(document_id: str) -> Dict[str, Any]:
    """
    특정 문서의 상세 통계 조회

    Args:
        document_id: 문서 ID

    Returns:
        - total_pages: 전체 페이지 수
        - analyzed_pages: 분석된 페이지 수
        - labeled_pages: 라벨링된 페이지 수
        - total_problems: 추출된 문제 수
        - blocks_count: 전체 블록 수
    """
    try:
        doc_dir = config.DOCUMENTS_DIR / document_id
        if not doc_dir.exists():
            raise HTTPException(status_code=404, detail=f"문서를 찾을 수 없습니다: {document_id}")

        # Phase 12: load_json 사용
        meta_path = doc_dir / "meta.json"
        if not meta_path.exists():
            raise HTTPException(status_code=404, detail="메타데이터를 찾을 수 없습니다")

        meta = load_json(meta_path)

        total_pages = meta.get('total_pages', 0)
        analyzed_pages = meta.get('analyzed_pages', 0)

        # Phase 12-1: 라벨링된 페이지 수 (groups.json이 있는 페이지)
        groups_dir = doc_dir / "groups"
        labeled_pages = 0
        if groups_dir.exists():
            labeled_pages = len(list(groups_dir.glob("page_*_groups.json")))

        # Phase 12: 추출된 문제 수 (load_json_or_default 사용)
        problems_dir = doc_dir / "problems"
        total_problems = 0
        if problems_dir.exists():
            problems_json = problems_dir / "problems.json"
            problems_data = load_json_or_default(problems_json, {'problems': []})
            total_problems = len(problems_data.get('problems', []))

        # Phase 12: 전체 블록 수 (load_json 사용)
        blocks_dir = doc_dir / "blocks"
        blocks_count = 0
        if blocks_dir.exists():
            for blocks_file in blocks_dir.glob("page_*_blocks.json"):
                blocks_data = load_json(blocks_file)
                blocks_count += len(blocks_data.get('blocks', []))

        return {
            'document_id': document_id,
            'total_pages': total_pages,
            'analyzed_pages': analyzed_pages,
            'labeled_pages': labeled_pages,
            'total_problems': total_problems,
            'blocks_count': blocks_count
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 조회 실패: {str(e)}")
