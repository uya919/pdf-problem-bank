"""
Phase 18-A: 파일 잠금 유틸리티

Windows/Linux 호환 파일 잠금 구현
- 스레드 안전한 파일 접근
- 원자적 JSON 파일 쓰기
"""
import os
import json
from pathlib import Path
from typing import Any
from contextlib import contextmanager
import threading


# 프로세스 내 락 (스레드 안전)
_locks: dict[str, threading.Lock] = {}
_locks_lock = threading.Lock()


def get_lock(path: str) -> threading.Lock:
    """
    경로별 Lock 객체 반환

    동일한 파일 경로에 대해 같은 Lock 객체를 반환하여
    여러 스레드가 동시에 접근하지 못하도록 함
    """
    with _locks_lock:
        if path not in _locks:
            _locks[path] = threading.Lock()
        return _locks[path]


@contextmanager
def file_lock(file_path: Path, timeout: float = 30.0):
    """
    파일 잠금 컨텍스트 매니저

    Usage:
        with file_lock(index_path):
            # 안전한 파일 작업
            data = safe_json_read(index_path)
            data['new_key'] = 'value'
            atomic_json_write(index_path, data)

    Args:
        file_path: 잠금할 파일 경로
        timeout: 잠금 획득 대기 시간 (초)

    Raises:
        TimeoutError: 지정된 시간 내 잠금 획득 실패
    """
    lock = get_lock(str(file_path))
    acquired = lock.acquire(timeout=timeout)

    if not acquired:
        raise TimeoutError(f"파일 잠금 획득 실패: {file_path}")

    try:
        yield
    finally:
        lock.release()


def atomic_json_write(file_path: Path, data: Any) -> None:
    """
    원자적 JSON 파일 쓰기

    1. 임시 파일에 쓰기
    2. 임시 파일 → 대상 파일 교체 (원자적)

    이 방식은 쓰기 도중 실패해도 원본 파일이 손상되지 않음

    Args:
        file_path: 저장할 파일 경로
        data: JSON 직렬화 가능한 데이터

    Raises:
        Exception: 파일 쓰기 실패 시
    """
    # Path 타입 보장
    file_path = Path(file_path)
    temp_path = file_path.with_suffix('.tmp')

    try:
        # 부모 디렉토리 생성
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # 임시 파일에 쓰기
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())  # 디스크에 확실히 쓰기

        # 원자적 교체 (Windows에서도 os.replace 사용 가능)
        os.replace(temp_path, file_path)

    except Exception:
        # 실패 시 임시 파일 정리
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass  # 정리 실패는 무시
        raise


def safe_json_read(file_path: Path, default: Any = None) -> Any:
    """
    안전한 JSON 파일 읽기

    파일이 없거나 손상된 경우 기본값 반환

    Args:
        file_path: 읽을 파일 경로
        default: 파일이 없거나 읽기 실패 시 반환할 기본값

    Returns:
        JSON 데이터 또는 기본값
    """
    file_path = Path(file_path)

    if not file_path.exists():
        return default

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError, OSError):
        return default


def safe_delete_file(file_path: Path) -> bool:
    """
    안전한 파일 삭제

    파일이 없어도 에러 없이 반환

    Args:
        file_path: 삭제할 파일 경로

    Returns:
        삭제 성공 여부
    """
    file_path = Path(file_path)

    if not file_path.exists():
        return True

    try:
        file_path.unlink()
        return True
    except Exception:
        return False
