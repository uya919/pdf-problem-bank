"""
docs 폴더 아카이브 스크립트

사용법:
    python scripts/archive_docs.py [옵션]

옵션:
    --dry-run       실제 이동 없이 미리보기만
    --range 200-250 특정 번호 범위만 아카이브
    --before 300    300 미만 번호만 아카이브
    --keep plan.md,hyeyum-features.md  유지할 파일 (쉼표 구분)

예시:
    python scripts/archive_docs.py --dry-run
    python scripts/archive_docs.py --before 300
    python scripts/archive_docs.py --range 200-299 --dry-run
"""

import os
import re
import shutil
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Tuple, Optional

# 기본 설정
DOCS_DIR = Path(__file__).parent.parent / "docs"
ARCHIVE_DIR = DOCS_DIR / "archive"

# 항상 유지할 파일들 (아카이브하지 않음)
DEFAULT_KEEP_FILES = [
    "plan.md",
    "hyeyum-features.md",
    "supabase-schema.md",
    "business-logic.md",
]


def get_doc_number(filename: str) -> Optional[int]:
    """파일명에서 문서 번호 추출 (예: 223_xxx.md -> 223)"""
    match = re.match(r'^(\d+)_', filename)
    if match:
        return int(match.group(1))
    return None


def categorize_doc(filename: str) -> str:
    """문서를 카테고리로 분류"""
    name_lower = filename.lower()

    # 키워드 기반 분류
    if any(kw in name_lower for kw in ['error', 'bug', 'issue', 'fix']):
        return 'errors'
    elif any(kw in name_lower for kw in ['research', 'feasibility', 'analysis']):
        return 'research'
    elif any(kw in name_lower for kw in ['plan', 'development', 'implementation']):
        return 'plans'
    elif any(kw in name_lower for kw in ['ux', 'ui', 'design', 'style']):
        return 'design'
    elif any(kw in name_lower for kw in ['supabase', 'auth', 'database']):
        return 'infrastructure'
    else:
        return 'misc'


def list_docs(
    docs_dir: Path,
    keep_files: List[str],
    number_range: Optional[Tuple[int, int]] = None,
    before_number: Optional[int] = None
) -> List[Tuple[Path, str, int]]:
    """
    아카이브할 문서 목록 반환

    Returns:
        List of (file_path, category, doc_number)
    """
    results = []

    for file_path in docs_dir.glob("*.md"):
        filename = file_path.name

        # 유지할 파일 건너뛰기
        if filename in keep_files:
            continue

        # 이미 아카이브 폴더에 있으면 건너뛰기
        if "archive" in str(file_path):
            continue

        doc_num = get_doc_number(filename)

        # 번호 없는 파일은 건너뛰기 (plan.md 등)
        if doc_num is None:
            continue

        # 범위 필터링
        if number_range:
            if not (number_range[0] <= doc_num <= number_range[1]):
                continue

        if before_number:
            if doc_num >= before_number:
                continue

        category = categorize_doc(filename)
        results.append((file_path, category, doc_num))

    # 번호순 정렬
    results.sort(key=lambda x: x[2])
    return results


def archive_docs(
    docs: List[Tuple[Path, str, int]],
    archive_dir: Path,
    dry_run: bool = False
) -> dict:
    """
    문서들을 아카이브 폴더로 이동

    Returns:
        카테고리별 이동된 파일 수
    """
    stats = {}

    for file_path, category, doc_num in docs:
        category_dir = archive_dir / category

        if not dry_run:
            category_dir.mkdir(parents=True, exist_ok=True)
            dest_path = category_dir / file_path.name
            shutil.move(str(file_path), str(dest_path))

        stats[category] = stats.get(category, 0) + 1
        print(f"  [{category}] {file_path.name}")

    return stats


def create_archive_index(archive_dir: Path):
    """아카이브 인덱스 파일 생성"""
    index_content = f"""# 문서 아카이브

아카이브 날짜: {datetime.now().strftime('%Y-%m-%d %H:%M')}

---

"""

    categories = {}
    for category_dir in archive_dir.iterdir():
        if category_dir.is_dir():
            files = sorted(category_dir.glob("*.md"))
            if files:
                categories[category_dir.name] = files

    for category, files in sorted(categories.items()):
        index_content += f"## {category.title()}\n\n"
        for f in files:
            doc_num = get_doc_number(f.name)
            index_content += f"- [{f.name}]({category}/{f.name})\n"
        index_content += "\n"

    index_path = archive_dir / "README.md"
    index_path.write_text(index_content, encoding='utf-8')
    print(f"\n인덱스 생성: {index_path}")


def main():
    # Windows 콘솔 UTF-8 출력 설정
    import sys
    if sys.platform == 'win32':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    parser = argparse.ArgumentParser(description='docs 폴더 아카이브')
    parser.add_argument('--dry-run', action='store_true', help='미리보기만 (실제 이동 없음)')
    parser.add_argument('--range', type=str, help='번호 범위 (예: 200-299)')
    parser.add_argument('--before', type=int, help='특정 번호 미만만 아카이브')
    parser.add_argument('--keep', type=str, help='유지할 파일들 (쉼표 구분)')

    args = parser.parse_args()

    # 유지할 파일 목록
    keep_files = DEFAULT_KEEP_FILES.copy()
    if args.keep:
        keep_files.extend([f.strip() for f in args.keep.split(',')])

    # 범위 파싱
    number_range = None
    if args.range:
        parts = args.range.split('-')
        number_range = (int(parts[0]), int(parts[1]))

    print("=" * 60)
    print("문서 아카이브 스크립트")
    print("=" * 60)
    print(f"\n소스: {DOCS_DIR}")
    print(f"대상: {ARCHIVE_DIR}")
    print(f"유지 파일: {keep_files}")

    if args.dry_run:
        print("\n[DRY RUN] 미리보기 모드 (실제 이동 없음)")

    if number_range:
        print(f"범위: {number_range[0]} ~ {number_range[1]}")
    if args.before:
        print(f"조건: {args.before} 미만")

    # 아카이브할 문서 목록
    docs = list_docs(DOCS_DIR, keep_files, number_range, args.before)

    if not docs:
        print("\n아카이브할 문서가 없습니다.")
        return

    print(f"\n아카이브 대상: {len(docs)}개 파일")
    print("-" * 60)

    # 아카이브 실행
    stats = archive_docs(docs, ARCHIVE_DIR, args.dry_run)

    print("-" * 60)
    print("\n카테고리별 통계:")
    for category, count in sorted(stats.items()):
        print(f"  {category}: {count}개")

    # 인덱스 생성 (dry-run이 아닐 때만)
    if not args.dry_run and ARCHIVE_DIR.exists():
        create_archive_index(ARCHIVE_DIR)

    print("\n완료!")


if __name__ == "__main__":
    main()
