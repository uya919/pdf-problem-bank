"""
레이아웃 프리셋 관리자 (Phase 4.5)

사용자가 UI 패널 크기를 조정하고, 여러 프리셋으로 저장/로드할 수 있게 지원
"""
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import List, Optional
import json
from datetime import datetime


@dataclass
class LayoutPreset:
    """레이아웃 프리셋 데이터 클래스"""

    name: str
    labeling_mode_sizes: List[int]  # [left_panel, center_canvas, right_panel]
    dual_canvas_sizes: List[int]    # [problem_canvas, solution_canvas]
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    is_default: bool = False

    def validate(self) -> bool:
        """
        프리셋 유효성 검증

        Returns:
            유효하면 True
        """
        # 이름 검증
        if not self.name or len(self.name.strip()) == 0:
            return False

        # 크기 배열 검증
        if len(self.labeling_mode_sizes) != 3:
            return False

        if len(self.dual_canvas_sizes) != 2:
            return False

        # 모든 크기가 양수인지 확인
        if any(size <= 0 for size in self.labeling_mode_sizes):
            return False

        if any(size <= 0 for size in self.dual_canvas_sizes):
            return False

        return True

    def to_dict(self) -> dict:
        """딕셔너리로 변환"""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> 'LayoutPreset':
        """딕셔너리에서 생성"""
        return cls(**data)


class LayoutManager:
    """
    레이아웃 프리셋 관리자 (싱글톤)

    기능:
    - 프리셋 저장/로드/삭제
    - 기본 프리셋 관리
    - JSON 파일로 영구 저장
    """

    _instance = None

    def __new__(cls, presets_path: Path = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, presets_path: Path = None):
        if self._initialized:
            return

        self._initialized = True

        # 프리셋 저장 경로
        if presets_path is None:
            # 기본값: dataset_root/config/layout_presets.json
            from config import Config
            config = Config.load()
            presets_path = config.DATASET_ROOT / "config" / "layout_presets.json"

        self.presets_path = presets_path
        self.presets: List[LayoutPreset] = []

        # 프리셋 로드
        self._load_from_file()

        # 기본 프리셋이 없으면 생성
        if not self.presets:
            self._create_default_presets()

    def _create_default_presets(self):
        """기본 프리셋 3개 생성"""
        default_presets = [
            LayoutPreset(
                name="균형 뷰",
                labeling_mode_sizes=[200, 1200, 200],
                dual_canvas_sizes=[600, 600],
                is_default=True
            ),
            LayoutPreset(
                name="넓은 캔버스",
                labeling_mode_sizes=[150, 1400, 150],
                dual_canvas_sizes=[700, 700],
                is_default=True
            ),
            LayoutPreset(
                name="문제 중심",
                labeling_mode_sizes=[200, 1200, 200],
                dual_canvas_sizes=[900, 300],
                is_default=True
            )
        ]

        self.presets = default_presets
        self._save_to_file()
        print(f"[LayoutManager] 기본 프리셋 3개 생성: {[p.name for p in self.presets]}")

    def save_preset(self, preset: LayoutPreset) -> bool:
        """
        프리셋 저장

        Args:
            preset: 저장할 프리셋

        Returns:
            성공 여부
        """
        # 유효성 검증
        if not preset.validate():
            print(f"[LayoutManager] 프리셋 유효하지 않음: {preset.name}")
            return False

        # 기존 프리셋 제거 (같은 이름)
        self.presets = [p for p in self.presets if p.name != preset.name]

        # 새 프리셋 추가
        self.presets.append(preset)

        # 파일 저장
        success = self._save_to_file()

        if success:
            print(f"[LayoutManager] 프리셋 저장: {preset.name}")

        return success

    def load_preset(self, name: str) -> Optional[LayoutPreset]:
        """
        프리셋 로드

        Args:
            name: 프리셋 이름

        Returns:
            프리셋 객체 (없으면 None)
        """
        for preset in self.presets:
            if preset.name == name:
                print(f"[LayoutManager] 프리셋 로드: {name}")
                return preset

        print(f"[LayoutManager] 프리셋 없음: {name}")
        return None

    def delete_preset(self, name: str) -> bool:
        """
        프리셋 삭제

        Args:
            name: 프리셋 이름

        Returns:
            성공 여부
        """
        # 기본 프리셋은 삭제 불가
        preset = self.load_preset(name)
        if preset and preset.is_default:
            print(f"[LayoutManager] 기본 프리셋은 삭제 불가: {name}")
            return False

        # 프리셋 제거
        original_count = len(self.presets)
        self.presets = [p for p in self.presets if p.name != name]

        if len(self.presets) < original_count:
            # 파일 저장
            self._save_to_file()
            print(f"[LayoutManager] 프리셋 삭제: {name}")
            return True

        return False

    def get_all_preset_names(self) -> List[str]:
        """
        모든 프리셋 이름 반환

        Returns:
            프리셋 이름 리스트
        """
        return [p.name for p in self.presets]

    def get_all_presets(self) -> List[LayoutPreset]:
        """
        모든 프리셋 반환

        Returns:
            프리셋 리스트
        """
        return self.presets.copy()

    def _save_to_file(self) -> bool:
        """
        프리셋을 JSON 파일로 저장

        Returns:
            성공 여부
        """
        try:
            # 디렉토리 생성
            self.presets_path.parent.mkdir(parents=True, exist_ok=True)

            # JSON으로 변환
            data = {
                "presets": [p.to_dict() for p in self.presets],
                "version": "1.0"
            }

            # 파일 쓰기
            with open(self.presets_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

            print(f"[LayoutManager] 프리셋 파일 저장: {self.presets_path}")
            return True

        except Exception as e:
            print(f"[LayoutManager] 프리셋 저장 실패: {e}")
            return False

    def _load_from_file(self):
        """JSON 파일에서 프리셋 로드"""
        if not self.presets_path.exists():
            print(f"[LayoutManager] 프리셋 파일 없음: {self.presets_path}")
            return

        try:
            with open(self.presets_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 프리셋 로드
            self.presets = [
                LayoutPreset.from_dict(p_data)
                for p_data in data.get("presets", [])
            ]

            print(f"[LayoutManager] 프리셋 {len(self.presets)}개 로드: {self.get_all_preset_names()}")

        except Exception as e:
            print(f"[LayoutManager] 프리셋 로드 실패: {e}")
            self.presets = []


# 싱글톤 인스턴스 접근 헬퍼
def get_layout_manager() -> LayoutManager:
    """레이아웃 매니저 싱글톤 인스턴스 반환"""
    return LayoutManager()


# 직접 실행 시 테스트
if __name__ == "__main__":
    # 테스트용 경로
    test_path = Path("./test_layout_presets.json")

    # 매니저 생성
    manager = LayoutManager(test_path)

    print("\n=== 초기 프리셋 ===")
    for preset in manager.get_all_presets():
        print(f"  - {preset.name}: {preset.labeling_mode_sizes} / {preset.dual_canvas_sizes}")

    # 새 프리셋 저장
    print("\n=== 새 프리셋 저장 ===")
    custom_preset = LayoutPreset(
        name="커스텀 뷰",
        labeling_mode_sizes=[250, 1000, 250],
        dual_canvas_sizes=[500, 700]
    )
    manager.save_preset(custom_preset)

    print("\n=== 저장 후 프리셋 ===")
    for name in manager.get_all_preset_names():
        print(f"  - {name}")

    # 프리셋 로드
    print("\n=== 프리셋 로드 ===")
    loaded = manager.load_preset("커스텀 뷰")
    if loaded:
        print(f"  로드 성공: {loaded.name}")
        print(f"  Labeling: {loaded.labeling_mode_sizes}")
        print(f"  Dual Canvas: {loaded.dual_canvas_sizes}")

    # 프리셋 삭제
    print("\n=== 프리셋 삭제 ===")
    manager.delete_preset("커스텀 뷰")
    print(f"  삭제 후: {manager.get_all_preset_names()}")

    # 기본 프리셋 삭제 시도 (실패해야 함)
    print("\n=== 기본 프리셋 삭제 시도 ===")
    result = manager.delete_preset("균형 뷰")
    print(f"  삭제 결과: {result} (False여야 함)")

    # 테스트 파일 삭제
    if test_path.exists():
        test_path.unlink()
        print(f"\n테스트 파일 삭제: {test_path}")
