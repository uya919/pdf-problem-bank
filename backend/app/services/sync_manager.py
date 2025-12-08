"""
Phase 37-D1: 동기화 관리자

groups.json ↔ WorkSession 양방향 동기화

원칙:
- groups.json: 그룹 정의의 원본 (Single Source of Truth)
- session.links: 연결 정보의 원본 (Single Source of Truth)
- session.problems: groups.json의 캐시
- groups.json.link: session.links의 캐시
"""
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime

from app.config import config
from app.models.work_session import (
    WorkSession,
    ProblemReference,
    ProblemSolutionLink
)
from app.services.file_lock import (
    file_lock,
    atomic_json_write,
    safe_json_read
)


@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    problems_added: int = 0
    problems_removed: int = 0
    problems_updated: int = 0
    links_synced: int = 0
    conflicts: List[Dict[str, Any]] = field(default_factory=list)
    error: Optional[str] = None

    @classmethod
    def merge(cls, *results: 'SyncResult') -> 'SyncResult':
        """여러 결과 병합"""
        return cls(
            success=all(r.success for r in results),
            problems_added=sum(r.problems_added for r in results),
            problems_removed=sum(r.problems_removed for r in results),
            problems_updated=sum(r.problems_updated for r in results),
            links_synced=sum(r.links_synced for r in results),
            conflicts=[c for r in results for c in (r.conflicts or [])],
            error="; ".join(r.error for r in results if r.error)
        )


class SyncManager:
    """
    groups.json ↔ WorkSession 동기화 관리자
    """

    def __init__(self):
        self.config = config

    def sync_problems_to_session(self, session: WorkSession) -> SyncResult:
        """
        groups.json → session.problems 동기화

        1. 문서의 모든 groups.json 스캔
        2. 신규 그룹 → session.problems에 추가
        3. 삭제된 그룹 → session.problems에서 제거
        4. 변경된 그룹 → session.problems 업데이트
        """
        try:
            doc_dir = self.config.get_document_dir(session.problemDocumentId)
            groups_dir = doc_dir / "groups"

            if not groups_dir.exists():
                return SyncResult(success=True)

            # 1. groups.json에서 모든 그룹 수집
            # Phase 47: 복합 키 사용으로 페이지간 그룹 ID 충돌 방지
            # 키: "{pageIndex}:{groupId}" (예: "10:L1", "18:L1")
            all_groups: Dict[str, Dict] = {}

            for groups_file in sorted(groups_dir.glob("page_*_groups.json")):
                # 페이지 인덱스 추출 (page_0001_groups.json → 1)
                try:
                    page_index = int(groups_file.stem.split("_")[1])
                except (IndexError, ValueError):
                    continue

                with file_lock(groups_file):
                    data = safe_json_read(groups_file, {"groups": []})

                for group in data.get("groups", []):
                    group_id = group.get("id")
                    if group_id:
                        # Phase 47: 복합 키로 저장하여 덮어쓰기 방지
                        composite_key = f"{page_index}:{group_id}"
                        all_groups[composite_key] = {
                            "group": group,
                            "groupId": group_id,  # 원본 ID 보존
                            "pageIndex": page_index,
                            "documentId": session.problemDocumentId
                        }

            # 2. 기존 problems와 비교 (Phase 47: 복합 키 사용)
            # 기존 problems를 복합 키로 변환: "{pageIndex}:{groupId}"
            existing_composite_ids = {
                f"{p.pageIndex}:{p.groupId}" for p in session.problems
            }
            new_composite_ids = set(all_groups.keys())

            added_count = 0
            removed_count = 0
            updated_count = 0

            # 3. 신규 그룹 추가 (Phase 47: 복합 키로 비교)
            for composite_key in (new_composite_ids - existing_composite_ids):
                group_data = all_groups[composite_key]
                group = group_data["group"]
                original_group_id = group_data["groupId"]  # 원본 ID
                problem_info = group.get("problemInfo", {})

                # displayName 생성
                # Phase 56-K: Frontend와 동일한 형식 사용 (책이름_p페이지_번호번)
                problem_number = problem_info.get("problemNumber", "")
                book_name = problem_info.get("bookName", "")
                page = problem_info.get("page", group_data["pageIndex"] + 1)
                display_name = problem_info.get("displayName", "")

                if not display_name:
                    if book_name and page:
                        display_name = f"{book_name}_p{page}_{problem_number}번"
                    elif book_name:
                        display_name = f"{book_name}_{problem_number}번"
                    else:
                        display_name = f"#{original_group_id[:8]}"

                # Phase 56-M: 모문제 여부 동기화
                is_parent = group.get("isParent", False)

                session.problems.append(ProblemReference(
                    groupId=original_group_id,  # 원본 ID 사용
                    documentId=group_data["documentId"],
                    pageIndex=group_data["pageIndex"],
                    problemNumber=problem_number or "",
                    displayName=display_name,
                    isParent=is_parent,  # Phase 56-M
                    createdAt=int(datetime.now().timestamp() * 1000)
                ))
                added_count += 1

            # 4. 기존 그룹 업데이트 (문항 정보 변경 시) - Phase 47: 복합 키로 조회
            for problem in session.problems:
                composite_key = f"{problem.pageIndex}:{problem.groupId}"
                if composite_key in all_groups:
                    group_data = all_groups[composite_key]
                    group = group_data["group"]
                    problem_info = group.get("problemInfo", {})

                    new_number = problem_info.get("problemNumber", "")
                    new_display = problem_info.get("displayName", "")

                    # Phase 56-K: Frontend와 동일한 형식 사용
                    if not new_display:
                        book_name = problem_info.get("bookName", "")
                        page = problem_info.get("page", group_data["pageIndex"] + 1)
                        if book_name and page:
                            new_display = f"{book_name}_p{page}_{new_number}번"
                        elif book_name:
                            new_display = f"{book_name}_{new_number}번"

                    if new_number and new_number != problem.problemNumber:
                        problem.problemNumber = new_number
                        updated_count += 1
                    if new_display and new_display != problem.displayName:
                        problem.displayName = new_display

                    # Phase 56-M: 모문제 여부 업데이트
                    new_is_parent = group.get("isParent", False)
                    if new_is_parent != problem.isParent:
                        problem.isParent = new_is_parent

            # 5. 삭제된 그룹 제거 (Phase 47: 복합 키로 비교)
            original_count = len(session.problems)
            session.problems = [
                p for p in session.problems
                if f"{p.pageIndex}:{p.groupId}" in new_composite_ids
            ]
            removed_count = original_count - len(session.problems)

            return SyncResult(
                success=True,
                problems_added=added_count,
                problems_removed=removed_count,
                problems_updated=updated_count
            )

        except Exception as e:
            return SyncResult(success=False, error=str(e))

    def sync_links_to_groups(self, session: WorkSession) -> SyncResult:
        """
        session.links → groups.json.link 동기화

        1. session.links 순회
        2. 해당 그룹의 groups.json 찾기
        3. link 필드 업데이트
        """
        try:
            if not session.solutionDocumentId:
                return SyncResult(success=True)

            synced_count = 0

            # 해설 문서의 groups 디렉토리
            solution_dir = self.config.get_document_dir(session.solutionDocumentId)
            groups_dir = solution_dir / "groups"

            if not groups_dir.exists():
                return SyncResult(success=True)

            # 링크를 페이지별로 그룹화
            links_by_page: Dict[int, List[ProblemSolutionLink]] = {}
            for link in session.links:
                page = link.solutionPageIndex
                if page not in links_by_page:
                    links_by_page[page] = []
                links_by_page[page].append(link)

            # 각 페이지의 groups.json 업데이트
            for page_index, links in links_by_page.items():
                groups_file = groups_dir / f"page_{page_index:04d}_groups.json"

                if not groups_file.exists():
                    continue

                with file_lock(groups_file):
                    data = safe_json_read(groups_file, {"groups": []})

                    # 링크 정보를 그룹에 추가
                    link_map = {l.solutionGroupId: l for l in links}
                    modified = False

                    for group in data.get("groups", []):
                        group_id = group.get("id")
                        if group_id in link_map:
                            link = link_map[group_id]

                            # 문제 그룹 정보 조회
                            problem_ref = next(
                                (p for p in session.problems if p.groupId == link.problemGroupId),
                                None
                            )

                            group["link"] = {
                                "linkedGroupId": link.problemGroupId,
                                "linkedDocumentId": session.problemDocumentId,
                                "linkedPageIndex": problem_ref.pageIndex if problem_ref else 0,
                                "linkedName": problem_ref.displayName if problem_ref else "",
                                "linkType": "solution",
                                "linkedAt": link.linkedAt
                            }
                            modified = True
                            synced_count += 1

                    if modified:
                        atomic_json_write(groups_file, data)

            return SyncResult(success=True, links_synced=synced_count)

        except Exception as e:
            return SyncResult(success=False, error=str(e))

    def full_sync(self, session: WorkSession) -> SyncResult:
        """완전 양방향 동기화"""
        result1 = self.sync_problems_to_session(session)
        result2 = self.sync_links_to_groups(session)
        return SyncResult.merge(result1, result2)

    def sync_single_link_to_group(
        self,
        solution_document_id: str,
        solution_group_id: str,
        solution_page_index: int,
        link_data: Dict[str, Any]
    ) -> bool:
        """
        단일 링크를 groups.json에 즉시 동기화

        Args:
            solution_document_id: 해설 문서 ID
            solution_group_id: 해설 그룹 ID
            solution_page_index: 해설 페이지 인덱스
            link_data: 링크 정보 딕셔너리

        Returns:
            성공 여부
        """
        try:
            groups_file = (
                self.config.get_document_dir(solution_document_id) /
                "groups" / f"page_{solution_page_index:04d}_groups.json"
            )

            if not groups_file.exists():
                return False

            with file_lock(groups_file):
                data = safe_json_read(groups_file, {"groups": []})

                found = False
                for group in data.get("groups", []):
                    if group.get("id") == solution_group_id:
                        group["link"] = link_data
                        found = True
                        break

                if found:
                    atomic_json_write(groups_file, data)

            return found

        except Exception as e:
            print(f"[SyncManager] Error syncing link: {e}")
            return False

    def clear_link_from_group(
        self,
        document_id: str,
        group_id: str,
        page_index: int
    ) -> bool:
        """
        그룹에서 링크 정보 제거

        Args:
            document_id: 문서 ID
            group_id: 그룹 ID
            page_index: 페이지 인덱스

        Returns:
            성공 여부
        """
        try:
            groups_file = (
                self.config.get_document_dir(document_id) /
                "groups" / f"page_{page_index:04d}_groups.json"
            )

            if not groups_file.exists():
                return False

            with file_lock(groups_file):
                data = safe_json_read(groups_file, {"groups": []})

                found = False
                for group in data.get("groups", []):
                    if group.get("id") == group_id:
                        if "link" in group:
                            del group["link"]
                            found = True
                        break

                if found:
                    atomic_json_write(groups_file, data)

            return found

        except Exception as e:
            print(f"[SyncManager] Error clearing link: {e}")
            return False

    def delete_group_from_disk(
        self,
        document_id: str,
        page_index: int,
        group_id: str
    ) -> bool:
        """
        Phase 54-A: groups.json에서 그룹 삭제

        Args:
            document_id: 문서 ID
            page_index: 페이지 인덱스
            group_id: 삭제할 그룹 ID

        Returns:
            삭제 성공 여부
        """
        try:
            groups_file = (
                self.config.get_document_dir(document_id) /
                "groups" / f"page_{page_index:04d}_groups.json"
            )

            if not groups_file.exists():
                return False

            with file_lock(groups_file):
                data = safe_json_read(groups_file, {"groups": []})
                original_count = len(data.get("groups", []))

                # 그룹 필터링 (삭제)
                data["groups"] = [
                    g for g in data.get("groups", [])
                    if g.get("id") != group_id
                ]

                # 변경이 있으면 저장
                if len(data["groups"]) < original_count:
                    atomic_json_write(groups_file, data)
                    print(f"[SyncManager] Group deleted from disk: {group_id}")
                    return True

            return False

        except Exception as e:
            print(f"[SyncManager] Error deleting group: {e}")
            return False

    def delete_exported_problem(
        self,
        document_id: str,
        page_index: int,
        group_id: str
    ) -> Dict[str, bool]:
        """
        Phase 54-A: 내보낸 문제 이미지/JSON 삭제

        Args:
            document_id: 문서 ID
            page_index: 페이지 인덱스
            group_id: 그룹 ID

        Returns:
            삭제 결과 {"png": bool, "json": bool}
        """
        try:
            problems_dir = self.config.get_document_dir(document_id) / "problems"
            base_name = f"{document_id}_p{page_index:04d}_{group_id}"

            result = {"png": False, "json": False}

            # PNG 삭제
            png_file = problems_dir / f"{base_name}.png"
            if png_file.exists():
                png_file.unlink()
                result["png"] = True

            # JSON 삭제
            json_file = problems_dir / f"{base_name}.json"
            if json_file.exists():
                json_file.unlink()
                result["json"] = True

            if result["png"] or result["json"]:
                print(f"[SyncManager] Exported files deleted: {base_name}")

            return result

        except Exception as e:
            print(f"[SyncManager] Error deleting exports: {e}")
            return {"png": False, "json": False}

    def cleanup_all_groups(self, document_id: str) -> Dict[str, int]:
        """
        Phase 55-A: 문서의 모든 groups.json 비우기

        Args:
            document_id: 문서 ID

        Returns:
            {"files_cleaned": int, "groups_removed": int}
        """
        try:
            doc_dir = self.config.get_document_dir(document_id)
            groups_dir = doc_dir / "groups"

            if not groups_dir.exists():
                return {"files_cleaned": 0, "groups_removed": 0}

            files_cleaned = 0
            groups_removed = 0

            for groups_file in groups_dir.glob("page_*_groups.json"):
                with file_lock(groups_file):
                    data = safe_json_read(groups_file, {"groups": []})
                    groups_removed += len(data.get("groups", []))

                    # 그룹 배열 비우기
                    data["groups"] = []
                    atomic_json_write(groups_file, data)
                    files_cleaned += 1

            print(f"[SyncManager] Cleaned {files_cleaned} files, {groups_removed} groups from {document_id}")
            return {"files_cleaned": files_cleaned, "groups_removed": groups_removed}

        except Exception as e:
            print(f"[SyncManager] Error cleaning groups: {e}")
            return {"files_cleaned": 0, "groups_removed": 0}

    def reset_session(self, session: WorkSession) -> Dict[str, int]:
        """
        Phase 55-A: 세션 완전 초기화

        1. session.problems 비우기
        2. session.links 비우기
        3. 문제/해설 문서의 groups.json 비우기

        Returns:
            {"problems_removed": int, "links_removed": int, "groups_removed": int}
        """
        result = {
            "problems_removed": len(session.problems),
            "links_removed": len(session.links),
            "groups_removed": 0
        }

        # 1. 문제 문서의 groups.json 정리
        if session.problemDocumentId:
            cleanup_result = self.cleanup_all_groups(session.problemDocumentId)
            result["groups_removed"] += cleanup_result["groups_removed"]

        # 2. 해설 문서의 groups.json 정리 (다른 문서인 경우)
        if session.solutionDocumentId and session.solutionDocumentId != session.problemDocumentId:
            cleanup_result = self.cleanup_all_groups(session.solutionDocumentId)
            result["groups_removed"] += cleanup_result["groups_removed"]

        # 3. 세션 데이터 초기화
        session.problems = []
        session.links = []

        print(f"[SyncManager] Session reset: {result}")
        return result

    def get_sync_status(self, session: WorkSession) -> Dict[str, Any]:
        """
        동기화 상태 확인

        Returns:
            status: "synced" | "pending" | "conflict"
            groupsCount: groups.json의 그룹 수
            sessionCount: session.problems의 문제 수
            linksCount: session.links의 연결 수
        """
        try:
            doc_dir = self.config.get_document_dir(session.problemDocumentId)
            groups_dir = doc_dir / "groups"

            groups_count = 0
            if groups_dir.exists():
                for groups_file in groups_dir.glob("page_*_groups.json"):
                    data = safe_json_read(groups_file, {"groups": []})
                    groups_count += len(data.get("groups", []))

            session_count = len(session.problems)

            # 상태 판단
            if groups_count == session_count:
                status = "synced"
            elif groups_count > session_count:
                status = "pending"  # 동기화 필요
            else:
                status = "conflict"  # 불일치

            return {
                "status": status,
                "groupsCount": groups_count,
                "sessionCount": session_count,
                "linksCount": len(session.links)
            }

        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }


# 전역 인스턴스
sync_manager = SyncManager()
