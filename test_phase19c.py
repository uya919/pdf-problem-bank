"""
Phase 19-C 테스트: LaTeX 변환 통합 검증
"""
import sys
import os

# 백엔드 패키지 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.hangul.hml_parser import HMLParser

print("=" * 70)
print("Phase 19-C: LaTeX 변환 통합 테스트")
print("=" * 70)

file_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'

parser = HMLParser(file_path)
result = parser.parse()

print(f"\n파일: {result.file_name}")
print(f"추출 방식: {result.detected_metadata.get('extraction_method', '?')}")
print(f"검출된 문제 수: {len(result.problems)}")

print("\n" + "-" * 70)
print("문제별 LaTeX 변환 결과")
print("-" * 70)

for i, problem in enumerate(result.problems[:5]):  # 처음 5문제만
    print(f"\n[문제 {problem.number}]")
    print(f"  정답: {problem.answer}")
    print(f"  정답(LaTeX): {problem.answer_latex}")
    print(f"  유형: {problem.answer_type}")
    if problem.points:
        print(f"  배점: {problem.points}점")

    # 본문 미리보기 (처음 100자)
    if problem.content_text:
        preview = problem.content_text[:100].replace('\n', ' ')
        print(f"  본문: {preview}...")

    # LaTeX 본문 미리보기
    if problem.content_latex:
        latex_preview = problem.content_latex[:120].replace('\n', ' ')
        print(f"  LaTeX: {latex_preview}...")

    # 수식 정보
    if problem.content_equations:
        print(f"  원본 수식 ({len(problem.content_equations)}개):")
        for eq in problem.content_equations[:3]:
            print(f"    - HWP: {eq}")

    if problem.content_equations_latex:
        print(f"  LaTeX 수식 ({len(problem.content_equations_latex)}개):")
        for eq in problem.content_equations_latex[:3]:
            print(f"    - LaTeX: {eq}")

print("\n" + "=" * 70)
print("결과 요약")
print("=" * 70)

# 통계
problems_with_latex = sum(1 for p in result.problems if p.content_latex)
problems_with_equations = sum(1 for p in result.problems if p.content_equations)

print(f"\n총 문제 수: {len(result.problems)}개")
print(f"LaTeX 본문 있는 문제: {problems_with_latex}개")
print(f"수식 포함된 문제: {problems_with_equations}개")

# 성공 여부
if len(result.problems) == 21 and problems_with_latex == 21:
    print("\n[SUCCESS] Phase 19-C 통합 성공!")
else:
    print(f"\n[INFO] {len(result.problems)}문제, {problems_with_latex}개 LaTeX 변환됨")
