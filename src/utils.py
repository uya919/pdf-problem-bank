"""
유틸리티 함수 모음

공통으로 사용되는 헬퍼 함수들
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Optional


def imread_unicode(file_path: Path) -> Optional[np.ndarray]:
    """
    한글(유니코드) 경로를 지원하는 이미지 로드 함수

    OpenCV의 cv2.imread()는 Windows에서 한글 경로를 처리하지 못하는 문제를 해결.
    numpy의 fromfile()과 cv2.imdecode()를 조합하여 우회.

    Args:
        file_path: 이미지 파일 경로 (한글 포함 가능)

    Returns:
        이미지 배열 (BGR format) 또는 None (실패 시)

    Examples:
        >>> image = imread_unicode(Path("C:/한글경로/이미지.png"))
        >>> if image is not None:
        ...     print(f"이미지 크기: {image.shape}")
    """
    try:
        # 파일을 바이너리로 읽기
        with open(file_path, 'rb') as f:
            # numpy 배열로 변환
            array = np.frombuffer(f.read(), dtype=np.uint8)

        # OpenCV로 디코딩 (BGR 형식)
        image = cv2.imdecode(array, cv2.IMREAD_COLOR)

        if image is None:
            print(f"[경고] 이미지 디코딩 실패: {file_path}")
            return None

        return image

    except FileNotFoundError:
        print(f"[오류] 파일을 찾을 수 없음: {file_path}")
        return None
    except Exception as e:
        print(f"[오류] 이미지 로드 중 예외 발생: {file_path}")
        print(f"  상세: {e}")
        return None


def imwrite_unicode(file_path: Path, image: np.ndarray) -> bool:
    """
    한글(유니코드) 경로를 지원하는 이미지 저장 함수

    OpenCV의 cv2.imwrite()는 Windows에서 한글 경로를 처리하지 못하는 문제를 해결.

    Args:
        file_path: 저장할 파일 경로 (한글 포함 가능)
        image: 저장할 이미지 배열 (BGR format)

    Returns:
        성공 여부 (True/False)

    Examples:
        >>> success = imwrite_unicode(Path("C:/한글경로/결과.png"), image)
        >>> if success:
        ...     print("저장 완료")
    """
    try:
        # 이미지를 바이트로 인코딩
        is_success, buffer = cv2.imencode('.png', image)

        if not is_success:
            print(f"[오류] 이미지 인코딩 실패: {file_path}")
            return False

        # 파일로 저장
        with open(file_path, 'wb') as f:
            f.write(buffer)

        return True

    except Exception as e:
        print(f"[오류] 이미지 저장 중 예외 발생: {file_path}")
        print(f"  상세: {e}")
        return False
