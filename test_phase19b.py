"""
Phase 19-B 테스트: ENDNOTE 기반 문제 추출 검증
"""
import sys
import os

# 백엔드 패키지 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app.services.hangul.hml_parser import HMLParser

print("=" * 70)
print("Phase 19-B: ENDNOTE 기반 문제 추출 테스트")
print("=" * 70)

file_path = r'C:\MYCLAUDE_PROJECT\pdf\.claude\내신 2024년 인천 미추홀구 인화여고 고1 공통 1학기기말 수학상.Hml'

parser = HMLParser(file_path)
result = parser.parse()

print(f"\n파일: {result.file_name}")
print(f"추출 방식: {result.detected_metadata.get('extraction_method', '?')}")
print(f"검출된 문제 수: {len(result.problems)}")

# 기대 정답
expected_answers = {
    1: '(2)', 2: '(4)', 3: '(1)', 4: '(3)', 5: '(4)',
    6: '(3)', 7: '(5)', 8: '(1)', 9: '(3)', 10: '(4)',
    11: '(5)', 12: '(1)', 13: '(2)', 14: '(2)', 15: '(5)',
    16: '(1)', 17: '(5)',
    18: 'expression',  # -8 <= x <= 3
    19: 'expression',  # y = -3x +- 10
    20: 'value',       # 60
    21: 'value',       # 15/2
}

print("\n" + "-" * 70)
print("문제별 상세")
print("-" * 70)

for i, problem in enumerate(result.problems):
    num = i + 1

    # 정답 원문자 변환 (비교용)
    ans_symbol = problem.answer
    if ans_symbol == '(1)':
        ans_symbol = '(1)'

    print(f"\n[{num:2d}] 정답: {problem.answer}")
    print(f"     유형: {problem.answer_type}")
    if problem.points:
        print(f"     배점: {problem.points}점")
    if problem.content_text:
        preview = problem.content_text[:60].replace('\n', ' ')
        print(f"     내용: {preview}...")

print("\n" + "=" * 70)
print("결과 요약")
print("=" * 70)

# 통계
choice_count = sum(1 for p in result.problems if p.answer_type == 'choice')
value_count = sum(1 for p in result.problems if p.answer_type == 'value')
expression_count = sum(1 for p in result.problems if p.answer_type == 'expression')
text_count = sum(1 for p in result.problems if p.answer_type == 'text')

print(f"\n총 문제 수: {len(result.problems)}개")
print(f"  - 객관식 (choice): {choice_count}개")
print(f"  - 단답형 (value): {value_count}개")
print(f"  - 수식형 (expression): {expression_count}개")
print(f"  - 텍스트 (text): {text_count}개")

# 성공 여부
if len(result.problems) == 21:
    print("\n[SUCCESS] 21문제 전체 검출 성공!")
else:
    print(f"\n[FAIL] {len(result.problems)}문제만 검출됨 (목표: 21)")

# 정답 목록
print("\n" + "-" * 70)
print("정답 목록")
print("-" * 70)
answers_str = []
for p in result.problems:
    answers_str.append(f"{p.number}:{p.answer}")
print(', '.join(answers_str))
