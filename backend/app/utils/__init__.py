"""
Phase 12-2: 유틸리티 모듈
Phase 20-A: 환경 감지 유틸리티 추가

백엔드 공통 유틸리티 함수들
"""
from .file_utils import load_json, save_json, load_json_or_default
from .environment import (
    Environment,
    get_environment,
    is_development,
    is_production,
    is_testing,
    get_env_info,
)
from .validators import (
    validate_document_exists,
    validate_page_exists,
    validate_blocks_exist,
    validate_groups_exist
)
from .formatters import (
    format_time_ago,
    extract_page_index,
    format_page_filename,
    format_file_size
)
from .image_utils import (
    calculate_bounding_box,
    add_padding,
    get_bbox_dimensions,
    get_bbox_center
)

__all__ = [
    # environment (Phase 20-A)
    "Environment",
    "get_environment",
    "is_development",
    "is_production",
    "is_testing",
    "get_env_info",
    # file_utils
    "load_json",
    "save_json",
    "load_json_or_default",
    # validators
    "validate_document_exists",
    "validate_page_exists",
    "validate_blocks_exist",
    "validate_groups_exist",
    # formatters
    "format_time_ago",
    "extract_page_index",
    "format_page_filename",
    "format_file_size",
    # image_utils
    "calculate_bounding_box",
    "add_padding",
    "get_bbox_dimensions",
    "get_bbox_center",
]
