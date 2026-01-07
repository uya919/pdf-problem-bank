# -*- coding: utf-8 -*-
"""
유령 문제 파일 삭제 스크립트
Phase 67-F: 9페이지 중복 문제 정리
"""
import os
from pathlib import Path

DATASET_ROOT = Path(r"c:\MYCLAUDE_PROJECT\pdf\dataset_root")

# 삭제 대상 유령 그룹 (세트 1 - 12:53에 export된 것들)
GHOST_GROUPS = [
    "g_1765242022880_ylv298rer",  # 13번
    "g_1765242031172_zkpo8a4mg",  # 14번
    "g_1765242032748_fxbyf3tid",  # 15번
    "g_1765242035193_bnd73wx2d",  # 16번
    "g_1765242051988_pc3y1rvcx",  # 17번
    "g_1765242054901_7p250v9w8",  # 18번
    "g_1765242061897_nkacgt13e",  # 19번
    "g_1765242063362_7jtjlqtt4",  # 20번
    "g_1765242081095_qipnwb45r",  # 21번
    "g_1765242253412_9bxh2av7k",  # 22번
    "g_1765242255783_9ve69y8n8",  # 23번
    "g_1765242257501_2n96uunl3",  # 24번
]

def delete_ghost_files():
    """유령 파일 삭제"""
    # 문제 문서 폴더 찾기
    docs_dir = DATASET_ROOT / "documents"
    problem_doc = None

    for doc in docs_dir.iterdir():
        if doc.is_dir() and "문제" in doc.name:
            problem_doc = doc
            break

    if not problem_doc:
        print("문제 문서를 찾을 수 없습니다")
        return

    problems_dir = problem_doc / "problems"
    print(f"문서: {problem_doc.name}")
    print(f"폴더: {problems_dir}")
    print(f"삭제 대상: {len(GHOST_GROUPS)}개 그룹 (24개 파일)")
    print("=" * 60)

    deleted_count = 0
    not_found = []

    for group_id in GHOST_GROUPS:
        # PNG 파일
        png_pattern = f"*_p0008_{group_id}.png"
        json_pattern = f"*_p0008_{group_id}.json"

        png_files = list(problems_dir.glob(png_pattern))
        json_files = list(problems_dir.glob(json_pattern))

        for f in png_files + json_files:
            try:
                f.unlink()
                print(f"삭제: {f.name}")
                deleted_count += 1
            except Exception as e:
                print(f"삭제 실패: {f.name} - {e}")

        if not png_files and not json_files:
            not_found.append(group_id)

    print("=" * 60)
    print(f"삭제 완료: {deleted_count}개 파일")

    if not_found:
        print(f"찾지 못함: {len(not_found)}개 그룹")
        for g in not_found:
            print(f"  - {g}")

if __name__ == "__main__":
    delete_ghost_files()
