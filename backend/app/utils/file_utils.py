"""
Phase 12-2: 파일 I/O 유틸리티
Phase 68-A: Export 파일 삭제 기능 추가

JSON 파일 읽기/쓰기 표준화
"""
from pathlib import Path
import json
from typing import Any, Dict, Optional, Tuple


def load_json(path: Path) -> Dict[str, Any]:
    """
    JSON 파일을 읽어서 딕셔너리로 반환

    Args:
        path: JSON 파일 경로

    Returns:
        파싱된 딕셔너리

    Raises:
        FileNotFoundError: 파일이 없을 때
        json.JSONDecodeError: JSON 파싱 실패
    """
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: Dict[str, Any], indent: int = 2) -> None:
    """
    딕셔너리를 JSON 파일로 저장

    Args:
        path: 저장할 파일 경로
        data: 저장할 데이터
        indent: 들여쓰기 (기본값: 2)
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=indent)


def load_json_or_default(
    path: Path,
    default: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    JSON 파일을 읽거나, 없으면 기본값 반환

    Args:
        path: JSON 파일 경로
        default: 기본값 (None이면 빈 딕셔너리)

    Returns:
        파싱된 딕셔너리 또는 기본값
    """
    if default is None:
        default = {}

    if not path.exists():
        return default

    try:
        return load_json(path)
    except (json.JSONDecodeError, Exception):
        return default


def delete_exported_problem(
    problems_dir: Path,
    document_id: str,
    page_index: int,
    group_id: str
) -> Tuple[bool, int]:
    """
    Phase 68-A: Export된 문제 파일 삭제 (PNG + JSON)

    Args:
        problems_dir: problems 폴더 경로
        document_id: 문서 ID
        page_index: 페이지 인덱스
        group_id: 그룹 ID

    Returns:
        (성공 여부, 삭제된 파일 수)
    """
    if not problems_dir.exists():
        return (False, 0)

    # 파일 패턴: {document_id}_p{page_index:04d}_{group_id}.{ext}
    base_name = f"{document_id}_p{page_index:04d}_{group_id}"

    deleted_count = 0
    for ext in [".png", ".json"]:
        file_path = problems_dir / f"{base_name}{ext}"
        if file_path.exists():
            try:
                file_path.unlink()
                deleted_count += 1
                print(f"[Phase 68-A] 삭제: {file_path.name}")
            except Exception as e:
                print(f"[Phase 68-A] 삭제 실패: {file_path.name} - {e}")

    return (deleted_count > 0, deleted_count)
