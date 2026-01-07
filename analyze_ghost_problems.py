# -*- coding: utf-8 -*-
"""
9페이지 유령 문제 분석 스크립트
삭제했는데 없어지지 않는 문제들 분석
"""
import os
import json
from pathlib import Path

# 경로 설정
DATASET_ROOT = Path(r"c:\MYCLAUDE_PROJECT\pdf\dataset_root")
DOCS_DIR = DATASET_ROOT / "documents"

def analyze_page9_problems():
    """9페이지 문제 분석"""
    print("=" * 60)
    print("9페이지 유령 문제 분석 리포트")
    print("=" * 60)

    # 1. 문서 폴더 찾기 - 해설 문서
    problem_doc = None
    for doc in DOCS_DIR.iterdir():
        if doc.is_dir() and "해설" in doc.name:
            problem_doc = doc
            print(f"\n[해설 문서]: {doc.name}")
            break

    if not problem_doc:
        print("해설 문서를 찾을 수 없습니다")
        return

    # 2. groups.json 분석
    groups_file = problem_doc / "groups" / "page_0009_groups.json"
    print(f"\n[1] groups.json 분석")
    print(f"파일: {groups_file}")

    if groups_file.exists():
        with open(groups_file, 'r', encoding='utf-8') as f:
            groups_data = json.load(f)

        groups = groups_data.get("groups", [])
        print(f"그룹 수: {len(groups)}")

        for g in groups:
            problem_info = g.get("problemInfo", {})
            problem_num = problem_info.get("problemNumber", "없음")
            is_confirmed = g.get("isConfirmed", False)
            print(f"  - {g['id']}: problemNumber={problem_num}, confirmed={is_confirmed}")
    else:
        print("  groups.json 없음")

    # 3. problems 폴더 분석 (export된 파일들)
    problems_dir = problem_doc / "problems"
    print(f"\n[2] problems 폴더 분석 (export된 파일)")
    print(f"폴더: {problems_dir}")

    if problems_dir.exists():
        # PNG 파일들
        png_files = list(problems_dir.glob("*p0009*.png"))
        json_files = list(problems_dir.glob("*p0009*.json"))

        print(f"PNG 파일 수: {len(png_files)}")
        print(f"JSON 파일 수: {len(json_files)}")

        print("\nExport된 문제들:")
        for jf in sorted(json_files):
            with open(jf, 'r', encoding='utf-8') as f:
                meta = json.load(f)

            problem_info = meta.get("problem_info", {})
            problem_num = problem_info.get("problemNumber", "없음")
            group_id = meta.get("group_id", "?")
            exported_at = meta.get("exported_at", "?")[:19] if meta.get("exported_at") else "?"

            # 해당 PNG 존재 확인
            png_exists = (problems_dir / jf.stem).with_suffix('.png').exists()

            print(f"  - {jf.name}")
            print(f"      group_id: {group_id}")
            print(f"      problemNumber: {problem_num}")
            print(f"      exported_at: {exported_at}")
            print(f"      PNG존재: {png_exists}")
    else:
        print("  problems 폴더 없음")

    # 4. 세션 데이터 분석
    sessions_dir = DATASET_ROOT / "work_sessions"
    print(f"\n[3] 세션 데이터 분석")

    for session_file in sessions_dir.glob("*.json"):
        with open(session_file, 'r', encoding='utf-8') as f:
            session = json.load(f)

        if "문제" in session.get("problemDocumentId", ""):
            print(f"세션: {session_file.name}")

            # 9페이지 문제들
            page9_problems = [p for p in session.get("problems", []) if p.get("pageIndex") == 9]
            print(f"9페이지 문제 수: {len(page9_problems)}")

            for p in page9_problems:
                print(f"  - groupId: {p.get('groupId')}, problemNumber: {p.get('problemNumber')}")
            break

    # 5. 불일치 분석
    print("\n" + "=" * 60)
    print("[결론] 데이터 불일치 분석")
    print("=" * 60)

    # groups.json의 그룹 ID 목록
    groups_ids = set()
    if groups_file.exists():
        with open(groups_file, 'r', encoding='utf-8') as f:
            groups_data = json.load(f)
        groups_ids = {g['id'] for g in groups_data.get("groups", [])}

    # export된 group_id 목록
    export_ids = set()
    if problems_dir.exists():
        for jf in problems_dir.glob("*p0009*.json"):
            with open(jf, 'r', encoding='utf-8') as f:
                meta = json.load(f)
            export_ids.add(meta.get("group_id"))

    # 유령 문제 = export에 있지만 groups에 없는 것
    ghost_ids = export_ids - groups_ids

    print(f"\ngroups.json에 있는 그룹: {len(groups_ids)}개")
    print(f"export된 그룹: {len(export_ids)}개")
    print(f"유령 문제 (export에만 존재): {len(ghost_ids)}개")

    if ghost_ids:
        print("\n유령 문제 목록:")
        for gid in sorted(ghost_ids):
            # 해당 JSON 파일 찾기
            for jf in problems_dir.glob(f"*{gid}*.json"):
                with open(jf, 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                problem_num = meta.get("problem_info", {}).get("problemNumber", "없음")
                print(f"  - {gid} (problemNumber: {problem_num})")
                print(f"    파일: {jf.name}")

if __name__ == "__main__":
    analyze_page9_problems()
