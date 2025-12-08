"""
Phase 12-2: 파일 I/O 유틸리티

JSON 파일 읽기/쓰기 표준화
"""
from pathlib import Path
import json
from typing import Any, Dict, Optional


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
