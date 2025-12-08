"""
Phase 37-D5: 기존 세션 마이그레이션 스크립트

기존 WorkSession들을 SyncManager를 통해 동기화합니다.
- groups.json → session.problems 동기화
- session.links → groups.json.link 동기화

사용법:
    cd backend
    python scripts/migrate_sync.py

옵션:
    --dry-run    실제 저장 없이 미리보기만 실행
    --session    특정 세션만 마이그레이션 (예: --session ws-abc123)
"""
import sys
import json
import asyncio
import argparse
from pathlib import Path
from datetime import datetime

# 프로젝트 루트를 path에 추가
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.config import get_settings
from app.services.sync_manager import sync_manager
from app.models.work_session import WorkSession


def load_all_sessions() -> list[tuple[Path, dict]]:
    """모든 세션 파일 로드"""
    config = get_settings()
    sessions_dir = config.dataset_root / "work_sessions"

    if not sessions_dir.exists():
        print(f"[INFO] 세션 디렉토리가 없습니다: {sessions_dir}")
        return []

    sessions = []
    for session_file in sorted(sessions_dir.glob("ws-*.json")):
        try:
            with open(session_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            sessions.append((session_file, data))
        except Exception as e:
            print(f"[ERROR] 세션 로드 실패: {session_file} - {e}")

    return sessions


def save_session(session_file: Path, session: WorkSession):
    """세션 파일 저장"""
    with open(session_file, 'w', encoding='utf-8') as f:
        json.dump(session.model_dump(), f, ensure_ascii=False, indent=2)


async def migrate_session(
    session_file: Path,
    session_data: dict,
    dry_run: bool = False
) -> dict:
    """단일 세션 마이그레이션"""
    session_id = session_data.get('sessionId', 'unknown')

    result = {
        'session_id': session_id,
        'status': 'pending',
        'problems_before': len(session_data.get('problems', [])),
        'links_before': len(session_data.get('links', [])),
        'problems_added': 0,
        'problems_removed': 0,
        'links_synced': 0,
        'error': None
    }

    try:
        # WorkSession 객체로 변환
        session = WorkSession(**session_data)

        # 동기화 실행
        sync_result = sync_manager.full_sync(session)

        result['problems_added'] = sync_result.problems_added
        result['problems_removed'] = sync_result.problems_removed
        result['links_synced'] = sync_result.links_synced
        result['problems_after'] = len(session.problems)
        result['links_after'] = len(session.links)

        if sync_result.success:
            if not dry_run:
                # 세션 저장
                session.updatedAt = int(datetime.now().timestamp() * 1000)
                save_session(session_file, session)
                result['status'] = 'migrated'
            else:
                result['status'] = 'dry_run'
        else:
            result['status'] = 'failed'
            result['error'] = sync_result.error

    except Exception as e:
        result['status'] = 'error'
        result['error'] = str(e)

    return result


async def main():
    parser = argparse.ArgumentParser(description='Phase 37-D5: 세션 마이그레이션')
    parser.add_argument('--dry-run', action='store_true', help='실제 저장 없이 미리보기')
    parser.add_argument('--session', type=str, help='특정 세션 ID만 마이그레이션')
    args = parser.parse_args()

    print("=" * 60)
    print("Phase 37-D5: 세션 마이그레이션 시작")
    print("=" * 60)

    if args.dry_run:
        print("[MODE] Dry Run - 실제 저장 없이 미리보기만 실행합니다")

    # 세션 로드
    sessions = load_all_sessions()

    if not sessions:
        print("[INFO] 마이그레이션할 세션이 없습니다")
        return

    # 특정 세션만 필터링
    if args.session:
        sessions = [
            (f, d) for f, d in sessions
            if d.get('sessionId') == args.session
        ]
        if not sessions:
            print(f"[ERROR] 세션을 찾을 수 없습니다: {args.session}")
            return

    print(f"[INFO] 총 {len(sessions)}개 세션 마이그레이션 예정")
    print("-" * 60)

    results = []
    success_count = 0
    fail_count = 0

    for session_file, session_data in sessions:
        session_id = session_data.get('sessionId', 'unknown')
        print(f"\n[PROCESSING] {session_id}")

        result = await migrate_session(session_file, session_data, args.dry_run)
        results.append(result)

        if result['status'] in ['migrated', 'dry_run']:
            success_count += 1
            print(f"  ✓ 성공: +{result['problems_added']} 문제, "
                  f"-{result['problems_removed']} 문제, "
                  f"{result['links_synced']} 링크 동기화")
        else:
            fail_count += 1
            print(f"  ✗ 실패: {result['error']}")

    # 결과 요약
    print("\n" + "=" * 60)
    print("마이그레이션 결과 요약")
    print("=" * 60)
    print(f"총 세션: {len(sessions)}")
    print(f"성공: {success_count}")
    print(f"실패: {fail_count}")

    # 상세 결과 출력
    if args.dry_run:
        print("\n[DRY RUN] 위 결과는 미리보기입니다. --dry-run 없이 실행하면 실제 저장됩니다.")

    # JSON 결과 저장
    result_file = Path(__file__).parent / f"migration_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(result_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n[INFO] 상세 결과 저장됨: {result_file}")


if __name__ == "__main__":
    asyncio.run(main())
