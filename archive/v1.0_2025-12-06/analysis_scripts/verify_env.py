"""
.env 파일 로드 확인 스크립트
"""
from pathlib import Path
import sys

# 프로젝트 루트
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root / "src"))

from config import Config

config = Config.load()

print("=" * 80)
print(".env 설정값 확인")
print("=" * 80)
print()
print(f"WHITE_THRESHOLD: {config.WHITE_THRESHOLD}")
print(f"MIN_BLOCK_SIZE: {config.MIN_BLOCK_SIZE}")
print(f"DEFAULT_DPI: {config.DEFAULT_DPI}")
print()

# .env 파일 직접 읽기
env_path = project_root / ".env"
print("=" * 80)
print(f".env 파일 내용 ({env_path})")
print("=" * 80)
print()

with open(env_path, 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#'):
            print(line)
print()

# 환경 변수 직접 확인
import os
from dotenv import load_dotenv

print("=" * 80)
print("load_dotenv() 직후 os.getenv() 값")
print("=" * 80)
print()

load_dotenv()
print(f"WHITE_THRESHOLD (env): {os.getenv('WHITE_THRESHOLD')}")
print(f"MIN_BLOCK_SIZE (env): {os.getenv('MIN_BLOCK_SIZE')}")
print(f"DEFAULT_DPI (env): {os.getenv('DEFAULT_DPI')}")
print()

print("=" * 80)
