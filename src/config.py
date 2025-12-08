"""
프로젝트 전역 설정 관리
"""
from pathlib import Path
from dotenv import load_dotenv
import os


class Config:
    """프로젝트 전역 설정"""

    # 경로 설정
    DATASET_ROOT: Path
    RAW_PDFS_DIR: Path
    DOCUMENTS_DIR: Path
    EXPORTS_DIR: Path
    MODELS_DIR: Path

    # 처리 설정
    DEFAULT_DPI: int = 150
    WHITE_THRESHOLD: int = 200  # 240 -> 200 (작은 기호 검출 개선)
    MIN_BLOCK_SIZE: int = 12    # 2 -> 12 (노이즈 제거 강화, AND 조건 필터링 사용)

    # UI 설정
    AUTO_SAVE_INTERVAL: int = 30

    @classmethod
    def load(cls) -> 'Config':
        """
        환경 변수에서 설정 로드

        Returns:
            Config 인스턴스
        """
        # .env 파일 로드 (.env 파일이 시스템 환경 변수보다 우선)
        load_dotenv(override=True)

        config = cls()

        # 경로 설정
        dataset_root_str = os.getenv('DATASET_ROOT', './dataset_root')
        config.DATASET_ROOT = Path(dataset_root_str).resolve()
        config.RAW_PDFS_DIR = config.DATASET_ROOT / 'raw_pdfs'
        config.DOCUMENTS_DIR = config.DATASET_ROOT / 'documents'
        config.EXPORTS_DIR = config.DATASET_ROOT / 'exports'
        config.MODELS_DIR = config.DATASET_ROOT / 'models'

        # 처리 설정
        config.DEFAULT_DPI = int(os.getenv('DEFAULT_DPI', '150'))
        config.WHITE_THRESHOLD = int(os.getenv('WHITE_THRESHOLD', '200'))
        config.MIN_BLOCK_SIZE = int(os.getenv('MIN_BLOCK_SIZE', '2'))

        # UI 설정
        config.AUTO_SAVE_INTERVAL = int(os.getenv('AUTO_SAVE_INTERVAL', '30'))

        # 경로 검증
        config.validate()

        return config

    def validate(self):
        """
        경로 존재 여부 확인 및 생성
        """
        # 필수 디렉토리 생성
        for directory in [
            self.DATASET_ROOT,
            self.RAW_PDFS_DIR,
            self.DOCUMENTS_DIR,
            self.EXPORTS_DIR,
            self.MODELS_DIR
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


# 직접 실행 시 테스트
if __name__ == "__main__":
    config = Config.load()
    print(f"Dataset Root: {config.DATASET_ROOT}")
    print(f"DPI: {config.DEFAULT_DPI}")
    print(f"White Threshold: {config.WHITE_THRESHOLD}")
    print(f"Min Block Size: {config.MIN_BLOCK_SIZE}")
    print(f"Auto Save Interval: {config.AUTO_SAVE_INTERVAL}")
    print("\nDirectory paths:")
    print(f"  - Raw PDFs: {config.RAW_PDFS_DIR}")
    print(f"  - Documents: {config.DOCUMENTS_DIR}")
    print(f"  - Exports: {config.EXPORTS_DIR}")
    print(f"  - Models: {config.MODELS_DIR}")
    print("\nConfig loaded successfully!")
