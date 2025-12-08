"""
문서 페어 서비스

Phase 22-L: 영구 페어링 시스템

문제-해설 문서 페어를 관리하는 서비스입니다.
JSON 파일로 데이터를 저장합니다.
"""

import json
import os
from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from ..config import config
from ..models.document_pair import (
    DocumentPair,
    CreatePairRequest,
    UpdatePairRequest,
    PairStats
)


class DocumentPairService:
    """문서 페어 관리 서비스"""

    def __init__(self):
        """서비스 초기화"""
        # _system 디렉토리에 저장
        self.system_dir = config.DATASET_ROOT / '_system'
        self.pairs_file = self.system_dir / 'document_pairs.json'
        self._ensure_file()

    def _ensure_file(self):
        """파일 및 디렉토리 생성"""
        self.system_dir.mkdir(parents=True, exist_ok=True)
        if not self.pairs_file.exists():
            with open(self.pairs_file, 'w', encoding='utf-8') as f:
                json.dump([], f)

    def _load_pairs(self) -> List[dict]:
        """페어 목록 로드"""
        try:
            with open(self.pairs_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _save_pairs(self, pairs: List[dict]):
        """페어 목록 저장"""
        with open(self.pairs_file, 'w', encoding='utf-8') as f:
            json.dump(pairs, f, ensure_ascii=False, indent=2, default=str)

    def create_pair(self, request: CreatePairRequest) -> DocumentPair:
        """
        페어 생성

        이미 동일한 페어가 있으면 기존 페어를 반환합니다.
        """
        pairs = self._load_pairs()

        # 중복 체크 (양방향)
        for p in pairs:
            if (p['problem_document_id'] == request.problem_document_id and
                p['solution_document_id'] == request.solution_document_id):
                # 기존 페어가 archived 상태면 active로 변경
                if p.get('status') == 'archived':
                    p['status'] = 'active'
                    self._save_pairs(pairs)
                return DocumentPair(**p)

        # 새 페어 생성
        pair_data = {
            'id': str(uuid4())[:8],
            'problem_document_id': request.problem_document_id,
            'solution_document_id': request.solution_document_id,
            'created_at': datetime.now().isoformat(),
            'status': 'active',
            'last_session_id': None,
            'matched_count': 0,
            'problem_document_name': request.problem_document_name,
            'solution_document_name': request.solution_document_name
        }

        pairs.append(pair_data)
        self._save_pairs(pairs)

        return DocumentPair(**pair_data)

    def list_pairs(self, status: Optional[str] = None) -> List[DocumentPair]:
        """
        페어 목록 조회

        Args:
            status: 필터링할 상태 (None이면 전체)
        """
        pairs = self._load_pairs()

        if status:
            pairs = [p for p in pairs if p.get('status', 'active') == status]

        return [DocumentPair(**p) for p in pairs]

    def get_pair(self, pair_id: str) -> Optional[DocumentPair]:
        """페어 조회"""
        pairs = self._load_pairs()
        for p in pairs:
            if p['id'] == pair_id:
                return DocumentPair(**p)
        return None

    def get_pair_by_documents(
        self,
        problem_doc_id: str,
        solution_doc_id: str
    ) -> Optional[DocumentPair]:
        """문서 ID로 페어 조회"""
        pairs = self._load_pairs()
        for p in pairs:
            if (p['problem_document_id'] == problem_doc_id and
                p['solution_document_id'] == solution_doc_id):
                return DocumentPair(**p)
        return None

    def get_pairs_for_document(self, document_id: str) -> List[DocumentPair]:
        """
        특정 문서가 포함된 모든 페어 조회

        Args:
            document_id: 문서 ID (문제 또는 해설)
        """
        pairs = self._load_pairs()
        result = []
        for p in pairs:
            if (p['problem_document_id'] == document_id or
                p['solution_document_id'] == document_id):
                result.append(DocumentPair(**p))
        return result

    def update_pair(self, pair_id: str, request: UpdatePairRequest) -> Optional[DocumentPair]:
        """페어 업데이트"""
        pairs = self._load_pairs()
        for i, p in enumerate(pairs):
            if p['id'] == pair_id:
                if request.status is not None:
                    pairs[i]['status'] = request.status
                if request.last_session_id is not None:
                    pairs[i]['last_session_id'] = request.last_session_id
                if request.matched_count is not None:
                    pairs[i]['matched_count'] = request.matched_count
                self._save_pairs(pairs)
                return DocumentPair(**pairs[i])
        return None

    def delete_pair(self, pair_id: str, hard_delete: bool = False) -> bool:
        """
        페어 삭제

        Args:
            pair_id: 페어 ID
            hard_delete: True면 완전 삭제, False면 archived로 변경
        """
        pairs = self._load_pairs()
        for i, p in enumerate(pairs):
            if p['id'] == pair_id:
                if hard_delete:
                    pairs.pop(i)
                else:
                    pairs[i]['status'] = 'archived'
                self._save_pairs(pairs)
                return True
        return False

    def increment_matched_count(self, pair_id: str, increment: int = 1) -> Optional[DocumentPair]:
        """매칭 수 증가"""
        pairs = self._load_pairs()
        for i, p in enumerate(pairs):
            if p['id'] == pair_id:
                pairs[i]['matched_count'] = p.get('matched_count', 0) + increment
                self._save_pairs(pairs)
                return DocumentPair(**pairs[i])
        return None

    def get_stats(self) -> PairStats:
        """페어 통계 조회"""
        pairs = self._load_pairs()

        active_pairs = [p for p in pairs if p.get('status', 'active') == 'active']
        total_matched = sum(p.get('matched_count', 0) for p in active_pairs)

        return PairStats(
            total_pairs=len(pairs),
            active_pairs=len(active_pairs),
            total_matched=total_matched
        )


# 싱글톤 서비스 인스턴스
document_pair_service = DocumentPairService()
