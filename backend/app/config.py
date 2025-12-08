"""
백엔드 전역 설정 관리 (Phase 1)
"""
from pathlib import Path
from dotenv import load_dotenv
import os
from typing import Optional


class Config:
    """백엔드 전역 설정"""

    # 경로 설정
    DATASET_ROOT: Path
    RAW_PDFS_DIR: Path
    DOCUMENTS_DIR: Path
    EXPORTS_DIR: Path
    MODELS_DIR: Path
    UPLOADS_DIR: Path  # FastAPI 업로드 임시 저장
    WORK_SESSIONS_DIR: Path  # Phase 32: 작업 세션 저장

    # 처리 설정
    DEFAULT_DPI: int = 150
    WHITE_THRESHOLD: int = 200
    MIN_BLOCK_SIZE: int = 2

    # Lazy Loading 설정 (Phase 0)
    INITIAL_PAGES: int = 10
    BATCH_SIZE: int = 10

    # Phase 14-2: 이미지 포맷 설정
    IMAGE_FORMAT: str = "webp"  # png | webp
    WEBP_QUALITY: int = 90  # 0-100 (90 권장)

    # Phase 14-3: 썸네일 설정
    THUMB_DPI: int = 50  # 썸네일 해상도 (50 권장)
    THUMB_QUALITY: int = 80  # 썸네일 품질 (80 권장)

    # FastAPI 설정
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]
    MAX_UPLOAD_SIZE: int = 100 * 1024 * 1024  # 100MB

    @classmethod
    def load(cls) -> 'Config':
        """
        환경 변수에서 설정 로드

        Returns:
            Config 인스턴스
        """
        # .env 파일 로드
        load_dotenv(override=True)

        config = cls()

        # 경로 설정
        dataset_root_str = os.getenv('DATASET_ROOT', './dataset_root')
        config.DATASET_ROOT = Path(dataset_root_str).resolve()
        config.RAW_PDFS_DIR = config.DATASET_ROOT / 'raw_pdfs'
        config.DOCUMENTS_DIR = config.DATASET_ROOT / 'documents'
        config.EXPORTS_DIR = config.DATASET_ROOT / 'exports'
        config.MODELS_DIR = config.DATASET_ROOT / 'models'
        config.UPLOADS_DIR = config.DATASET_ROOT / 'uploads'
        config.WORK_SESSIONS_DIR = config.DATASET_ROOT / 'work_sessions'  # Phase 32

        # 처리 설정
        config.DEFAULT_DPI = int(os.getenv('DEFAULT_DPI', '150'))
        config.WHITE_THRESHOLD = int(os.getenv('WHITE_THRESHOLD', '200'))
        config.MIN_BLOCK_SIZE = int(os.getenv('MIN_BLOCK_SIZE', '2'))

        # Lazy Loading 설정
        config.INITIAL_PAGES = int(os.getenv('INITIAL_PAGES', '10'))
        config.BATCH_SIZE = int(os.getenv('BATCH_SIZE', '10'))

        # Phase 14-2: 이미지 포맷 설정
        config.IMAGE_FORMAT = os.getenv('IMAGE_FORMAT', 'webp')
        config.WEBP_QUALITY = int(os.getenv('WEBP_QUALITY', '90'))

        # Phase 14-3: 썸네일 설정
        config.THUMB_DPI = int(os.getenv('THUMB_DPI', '50'))
        config.THUMB_QUALITY = int(os.getenv('THUMB_QUALITY', '80'))

        # FastAPI 설정
        config.API_HOST = os.getenv('API_HOST', '0.0.0.0')
        config.API_PORT = int(os.getenv('API_PORT', '8000'))

        cors_origins_str = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173,http://localhost:5174')
        config.CORS_ORIGINS = [origin.strip() for origin in cors_origins_str.split(',')]

        config.MAX_UPLOAD_SIZE = int(os.getenv('MAX_UPLOAD_SIZE', str(100 * 1024 * 1024)))

        # 경로 검증
        config.validate()

        return config

    def validate(self):
        """경로 존재 여부 확인 및 생성"""
        for directory in [
            self.DATASET_ROOT,
            self.RAW_PDFS_DIR,
            self.DOCUMENTS_DIR,
            self.EXPORTS_DIR,
            self.MODELS_DIR,
            self.UPLOADS_DIR,
            self.WORK_SESSIONS_DIR  # Phase 32
        ]:
            directory.mkdir(parents=True, exist_ok=True)

    def get_document_dir(self, document_id: str) -> Path:
        """
        문서별 디렉토리 경로 반환

        Args:
            document_id: 문서 ID

        Returns:
            문서 디렉토리 경로
        """
        doc_dir = self.DOCUMENTS_DIR / document_id
        doc_dir.mkdir(parents=True, exist_ok=True)
        return doc_dir

    def get_image_extension(self) -> str:
        """Phase 14-2: 이미지 확장자 반환"""
        return ".webp" if self.IMAGE_FORMAT == "webp" else ".png"

    def get_work_session_path(self, session_id: str) -> Path:
        """Phase 32: 작업 세션 파일 경로 반환"""
        return self.WORK_SESSIONS_DIR / f"{session_id}.json"


# 전역 설정 인스턴스
config = Config.load()


if __name__ == "__main__":
    print(f"Dataset Root: {config.DATASET_ROOT}")
    print(f"API Host: {config.API_HOST}:{config.API_PORT}")
    print(f"CORS Origins: {config.CORS_ORIGINS}")
    print(f"Lazy Loading: {config.INITIAL_PAGES} initial, {config.BATCH_SIZE} batch")
    print("\nConfig loaded successfully!")
