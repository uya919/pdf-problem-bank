"""
Phase 12-2: 포맷팅 유틸리티

시간, 페이지 인덱스 등 포맷팅
"""
from datetime import datetime
import re
from typing import Optional


def format_time_ago(timestamp: float) -> str:
    """
    타임스탬프를 '~분 전', '~시간 전' 형식으로 변환

    Args:
        timestamp: Unix 타임스탬프

    Returns:
        상대 시간 문자열

    Examples:
        >>> format_time_ago(time.time() - 120)
        "2분 전"
        >>> format_time_ago(time.time() - 7200)
        "2시간 전"
    """
    delta = datetime.now() - datetime.fromtimestamp(timestamp)
    seconds = int(delta.total_seconds())

    if seconds < 60:
        return "방금 전"
    elif seconds < 3600:
        return f"{seconds // 60}분 전"
    elif seconds < 86400:
        return f"{seconds // 3600}시간 전"
    else:
        return f"{delta.days}일 전"


def extract_page_index(filename: str) -> Optional[int]:
    """
    파일명에서 페이지 인덱스 추출

    Args:
        filename: 파일명 (예: "page_0007_blocks.json")

    Returns:
        페이지 인덱스 또는 None

    Examples:
        >>> extract_page_index("page_0007_blocks.json")
        7
        >>> extract_page_index("page_0012_groups.json")
        12
        >>> extract_page_index("invalid.json")
        None
    """
    match = re.search(r'page_(\d+)', filename)
    if match:
        return int(match.group(1))
    return None


def format_page_filename(page_index: int, suffix: str = "") -> str:
    """
    페이지 인덱스를 파일명으로 변환

    Args:
        page_index: 페이지 인덱스
        suffix: 접미사 (예: "_blocks", "_groups")

    Returns:
        포맷된 파일명

    Examples:
        >>> format_page_filename(7, "_blocks")
        "page_0007_blocks"
        >>> format_page_filename(12)
        "page_0012"
    """
    return f"page_{page_index:04d}{suffix}"


def format_file_size(size_bytes: int) -> str:
    """
    바이트를 읽기 쉬운 형식으로 변환

    Args:
        size_bytes: 파일 크기 (바이트)

    Returns:
        포맷된 문자열 (예: "1.5 MB")

    Examples:
        >>> format_file_size(1024)
        "1.0 KB"
        >>> format_file_size(1048576)
        "1.0 MB"
    """
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"
