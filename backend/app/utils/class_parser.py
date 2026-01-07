"""
반 이름 파싱 유틸리티

반 이름에서 학년과 반명을 분리하고,
새 학년에 맞는 반 이름을 생성합니다.

패턴 예시:
- "중1 수학 심화" → grade="중1", suffix="수학 심화"
- "고2 영어 H반" → grade="고2", suffix="영어 H반"
- "초6 수학 정규1" → 번호 붙은 반으로 인식
"""

import re
from typing import Optional, Tuple

# 학년 패턴 (초1~초6, 중1~중3, 고1~고3)
GRADE_PATTERN = r'^(초[1-6]|중[1-3]|고[1-3])\s*'

# 번호 패턴 (정규1, 정규2, A1, B2 등)
NUMBER_SUFFIX_PATTERN = r'\d+$'


def parse_class_name(class_name: str) -> Tuple[Optional[str], Optional[str]]:
    """
    반 이름에서 학년과 반명 분리

    Args:
        class_name: "중1 수학 심화" 형태의 반 이름

    Returns:
        (grade, suffix) 튜플
        예: ("중1", "수학 심화")
        파싱 실패 시: (None, None)

    Examples:
        >>> parse_class_name("중1 수학 심화")
        ("중1", "수학 심화")
        >>> parse_class_name("고2 영어 H반")
        ("고2", "영어 H반")
        >>> parse_class_name("올림피아드반")
        (None, None)
    """
    if not class_name:
        return None, None

    match = re.match(GRADE_PATTERN, class_name)
    if not match:
        return None, None

    grade = match.group(1)
    suffix = class_name[match.end():].strip()

    if not suffix:
        return None, None

    return grade, suffix


def has_number_suffix(suffix: str) -> bool:
    """
    반명 끝에 번호가 있는지 확인

    번호가 있는 반은 자동 승급 시 어떤 번호로 갈지 알 수 없으므로
    수동 배정이 필요합니다.

    Args:
        suffix: 반명 (학년 제외)

    Returns:
        번호가 있으면 True

    Examples:
        >>> has_number_suffix("수학 정규1")
        True
        >>> has_number_suffix("수학 심화")
        False
        >>> has_number_suffix("영어 A반")
        False
        >>> has_number_suffix("영어 A1반")
        True
    """
    if not suffix:
        return False
    return bool(re.search(NUMBER_SUFFIX_PATTERN, suffix))


def build_new_class_name(new_grade: str, suffix: str) -> str:
    """
    새 학년과 반명으로 새 반 이름 생성

    Args:
        new_grade: 새 학년 (예: "중2")
        suffix: 반명 (예: "수학 심화")

    Returns:
        새 반 이름 (예: "중2 수학 심화")

    Examples:
        >>> build_new_class_name("중2", "수학 심화")
        "중2 수학 심화"
    """
    return f"{new_grade} {suffix}"


def can_auto_promote(class_name: str) -> Tuple[bool, str]:
    """
    자동 승급 가능 여부 판단

    Args:
        class_name: 현재 반 이름

    Returns:
        (can_promote, reason) 튜플
        - can_promote: 자동 승급 가능 여부
        - reason: 판단 이유

    Examples:
        >>> can_auto_promote("중1 수학 심화")
        (True, "자동 승급 가능")
        >>> can_auto_promote("중1 수학 정규1")
        (False, "번호 붙은 반 (수동 배정 필요)")
        >>> can_auto_promote("올림피아드반")
        (False, "학년 패턴 인식 불가")
    """
    grade, suffix = parse_class_name(class_name)

    if not grade or not suffix:
        return False, "학년 패턴 인식 불가"

    if has_number_suffix(suffix):
        return False, "번호 붙은 반 (수동 배정 필요)"

    return True, "자동 승급 가능"


def get_promoted_class_name(
    current_class_name: str,
    new_grade: str
) -> Tuple[Optional[str], str]:
    """
    현재 반 이름과 새 학년으로 승급될 반 이름 계산

    Args:
        current_class_name: 현재 반 이름 (예: "중1 수학 심화")
        new_grade: 새 학년 (예: "중2")

    Returns:
        (new_class_name, status) 튜플
        - new_class_name: 새 반 이름 (None이면 매칭 불가)
        - status: "auto" | "unassigned"

    Examples:
        >>> get_promoted_class_name("중1 수학 심화", "중2")
        ("중2 수학 심화", "auto")
        >>> get_promoted_class_name("중1 수학 정규1", "중2")
        (None, "unassigned")
    """
    can_promote, reason = can_auto_promote(current_class_name)

    if not can_promote:
        return None, "unassigned"

    grade, suffix = parse_class_name(current_class_name)
    new_class_name = build_new_class_name(new_grade, suffix)

    return new_class_name, "auto"
