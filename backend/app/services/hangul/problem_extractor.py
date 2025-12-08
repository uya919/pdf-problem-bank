"""
Phase 16-4: 문제/정답/해설 분리 알고리즘
Phase 19: [출제의도] 패턴 및 내신 시험지 형식 지원
"""
import re
from typing import List, Optional, Tuple
from dataclasses import dataclass

from .parser_base import ParsedProblem


@dataclass
class PatternMatch:
    """패턴 매칭 결과"""
    pattern_type: str
    match: re.Match
    value: str


class ProblemExtractor:
    """문제 단위 추출 및 분리"""

    # 문제 번호 패턴
    PROBLEM_PATTERNS = [
        (r'^(\d+)\.\s', 'dot'),           # 1. 2. 3.
        (r'^(\d+)\)\s', 'paren'),         # 1) 2) 3)
        (r'^\[(\d+)\]\s', 'bracket'),     # [1] [2] [3]
        (r'^(\d+)번\s', 'number'),        # 1번 2번
        (r'^문제\s*(\d+)', 'question'),   # 문제 1
        (r'^(\d+)-(\d+)\s', 'sub'),       # 01-1, 01-2
        # Phase 19: 내신 시험지 형식
        (r'^\[출제의도\]', 'purpose'),    # [출제의도] 형식
        (r'^【(\d+)】', 'korean_bracket'), # 【1】 형식
    ]

    # 정답 패턴
    ANSWER_PATTERNS = [
        # 객관식 [정답] ①~⑤
        (r'\[정답\]\s*([①②③④⑤])', 'choice'),
        # 객관식 정답: ①~⑤
        (r'정답\s*[:：]\s*([①②③④⑤])', 'choice'),
        # 객관식 숫자
        (r'\[정답\]\s*([1-5])\s*$', 'choice_num'),
        # 주관식 [정답] 값
        (r'\[정답\]\s*(.+?)(?=\[|\n|$)', 'value'),
        # 주관식 정답: 값
        (r'정답\s*[:：]\s*(.+?)(?=\n|$)', 'value'),
    ]

    # 해설 패턴
    EXPLANATION_PATTERNS = [
        r'\[해설\]\s*(.+?)(?=\[정답\]|\[\d+\.\d+점\]|\d+\.\s|$)',
        r'\[풀이\]\s*(.+?)(?=\[정답\]|\[\d+\.\d+점\]|\d+\.\s|$)',
        r'해설\s*[:：]\s*(.+?)(?=\n\d+\.|$)',
        r'풀이\s*[:：]\s*(.+?)(?=\n\d+\.|$)',
    ]

    # 배점 패턴
    POINTS_PATTERN = r'\[(\d+\.?\d*)점\]'

    def __init__(self):
        self.detected_pattern_type = None

    def extract_problems(self, paragraphs: List[str]) -> List[ParsedProblem]:
        """
        문단 리스트에서 문제들 추출

        Args:
            paragraphs: 문단 텍스트 리스트

        Returns:
            List[ParsedProblem]: 추출된 문제 리스트
        """
        # 전체 텍스트
        full_text = '\n'.join(paragraphs)

        # 1. 문서 패턴 감지
        pattern_type = self._detect_document_pattern(full_text)

        # 2. 패턴에 따른 추출
        if pattern_type == 'purpose':
            # Phase 19: [출제의도] 형식 (내신 시험지)
            return self._extract_purpose_pattern(paragraphs)
        elif pattern_type == 'points_based':
            # Phase 19: [X.XX점] 기반 분리 (문제 번호 없음)
            return self._extract_points_based_pattern(paragraphs)
        elif pattern_type == 'inline':
            # 문제 직후 정답 (인화여고 스타일)
            return self._extract_inline_pattern(paragraphs)
        elif pattern_type == 'section':
            # 문제부/정답부 분리
            return self._extract_section_pattern(paragraphs)
        else:
            # 기본: 문제 단위 분리 시도
            return self._extract_default_pattern(paragraphs)

    def _detect_document_pattern(self, full_text: str) -> str:
        """
        문서의 정답 배치 패턴 감지

        Returns:
            'purpose': [출제의도] 형식 (내신 시험지)
            'points_based': [X.XX점] 기반 분리 (문제 번호 없음)
            'inline': 문제 직후 정답
            'section': 섹션 분리 (문제들 / 정답들)
            'default': 기본 패턴
        """
        # Phase 19: [출제의도] 형식 감지
        purpose_count = len(re.findall(r'\[출제의도\]', full_text))
        if purpose_count > 3:
            return 'purpose'

        # [정답] 태그 인라인 여부
        inline_count = len(re.findall(r'\[정답\]', full_text))

        # [X.XX점] 배점 태그 수
        points_count = len(re.findall(r'\[\d+\.?\d*점\]', full_text))

        # 문제 번호 패턴 존재 여부 (1. 또는 1) 또는 문제 1 등)
        has_problem_numbers = bool(re.search(r'(?:^|\n)\s*\d+[\.\)]\s', full_text))

        # 섹션 분리 여부
        has_section = bool(re.search(
            r'(정답\s*(및|과)?\s*해설|빠른\s*정답|정답표)',
            full_text
        ))

        if has_section:
            return 'section'
        elif inline_count > 5 and points_count > 5 and not has_problem_numbers:
            # Phase 19: 배점 기반 분리 (문제 번호 없이 [정답]과 [점] 태그만 있는 경우)
            return 'points_based'
        elif inline_count > 5:
            return 'inline'
        else:
            return 'default'

    def _extract_purpose_pattern(self, paragraphs: List[str]) -> List[ParsedProblem]:
        """
        Phase 19: [출제의도] 형식 추출 (내신 시험지)

        구조:
        [출제의도] 문제 설명...
        ① 보기1 ② 보기2 ...
        [정답] ②
        [4.20점]
        """
        problems = []
        full_text = '\n'.join(paragraphs)

        # [출제의도] 기준으로 분할
        # 첫 번째 [출제의도] 전의 내용은 헤더로 무시
        purpose_splits = re.split(r'\[출제의도\]', full_text)

        problem_number = 0
        for i, segment in enumerate(purpose_splits):
            if i == 0:
                # 첫 세그먼트는 헤더이므로 건너뛰기
                continue

            segment = segment.strip()
            if not segment:
                continue

            problem_number += 1

            # 문제 생성
            problem = ParsedProblem(number=str(problem_number))

            # 정답 추출
            ans_match = re.search(r'\[정답\]\s*([①②③④⑤]|\d)', segment)
            if ans_match:
                problem.answer = ans_match.group(1)
                problem.answer_type = self._detect_answer_type(problem.answer)

            # 배점 추출
            points_match = re.search(r'\[(\d+\.?\d*)점\]', segment)
            if points_match:
                problem.points = float(points_match.group(1))

            # 내용 추출 (정답, 배점 태그 제거)
            content = segment
            content = re.sub(r'\[정답\]\s*[①②③④⑤\d]', '', content)
            content = re.sub(r'\[\d+\.?\d*점\]', '', content)
            content = content.strip()

            # [출제의도] 태그를 문제 내용 앞에 다시 추가
            problem.content_text = f"[출제의도] {content}"

            problems.append(problem)

        return problems

    def _extract_points_based_pattern(self, paragraphs: List[str]) -> List[ParsedProblem]:
        """
        Phase 19: [X.XX점] 기반 문제 분리 (문제 번호 없음)

        구조:
        문제 내용...
        ① 보기1 ② 보기2 ...
        [정답] ②
        [4.20점]   <- 문제 종료 마커

        각 [X.XX점] 태그를 문제 종료 지점으로 사용
        """
        problems = []
        full_text = '\n'.join(paragraphs)

        # [X.XX점] 기준으로 분할
        # 각 세그먼트가 하나의 문제
        points_pattern = r'\[\d+\.?\d*점\]'
        segments = re.split(points_pattern, full_text)
        points_matches = re.findall(points_pattern, full_text)

        problem_number = 0
        for i, segment in enumerate(segments):
            segment = segment.strip()

            # 빈 세그먼트 건너뛰기
            if not segment:
                continue

            # 헤더 부분 감지 (문제 내용 없이 메타 정보만 있는 경우)
            # "수학영역" 같은 짧은 텍스트만 있으면 건너뛰기
            if len(segment) < 50 and '[정답]' not in segment:
                continue

            # [정답]이 없으면 문제가 아닐 가능성
            if '[정답]' not in segment:
                continue

            problem_number += 1
            problem = ParsedProblem(number=str(problem_number))

            # 정답 추출
            ans_match = re.search(r'\[정답\]\s*([①②③④⑤]|\d)', segment)
            if ans_match:
                problem.answer = ans_match.group(1)
                problem.answer_type = self._detect_answer_type(problem.answer)

            # 배점 추출 (이전 매치에서)
            if i < len(points_matches):
                points_text = points_matches[i]
                points_value = re.search(r'\[(\d+\.?\d*)점\]', points_text)
                if points_value:
                    problem.points = float(points_value.group(1))

            # 내용 정리 (정답 태그 제거)
            content = segment
            content = re.sub(r'\[정답\]\s*[①②③④⑤\d]?', '', content)
            content = content.strip()

            # 문제 텍스트 중 질문 부분만 추출 시도
            # 보통 "~의 값은?" 또는 "~을 구하시오" 등으로 끝남
            question_match = re.search(
                r'([^①②③④⑤]+(?:은\?|는\?|시오\.?|하라\.?|가\?|을\?|를\?))',
                content
            )
            if question_match:
                problem.content_text = question_match.group(1).strip()
            else:
                # 보기 이전까지만 추출
                choice_start = re.search(r'[①②③④⑤]', content)
                if choice_start:
                    problem.content_text = content[:choice_start.start()].strip()
                else:
                    problem.content_text = content[:500]  # 최대 500자

            problems.append(problem)

        return problems

    def _extract_inline_pattern(self, paragraphs: List[str]) -> List[ParsedProblem]:
        """인라인 패턴 추출 (문제 직후 정답)"""
        problems = []
        current_problem = None
        content_buffer = []

        for para in paragraphs:
            # 문제 시작 감지
            prob_match = self._match_problem_start(para)

            if prob_match:
                # 이전 문제 저장
                if current_problem:
                    current_problem.content_text = '\n'.join(content_buffer).strip()
                    problems.append(current_problem)

                # 새 문제 시작
                current_problem = ParsedProblem(
                    number=prob_match.value
                )
                content_buffer = [para]
                continue

            # 정답 감지
            ans_match = self._match_answer(para)
            if ans_match and current_problem:
                current_problem.answer = ans_match.value.strip()
                current_problem.answer_type = self._detect_answer_type(ans_match.value)
                continue

            # 배점 감지
            points_match = re.search(self.POINTS_PATTERN, para)
            if points_match and current_problem:
                current_problem.points = float(points_match.group(1))
                continue

            # 해설 감지
            for pattern in self.EXPLANATION_PATTERNS:
                exp_match = re.search(pattern, para, re.DOTALL)
                if exp_match and current_problem:
                    current_problem.explanation = exp_match.group(1).strip()
                    break

            # 현재 문제에 내용 추가
            if current_problem and not ans_match:
                content_buffer.append(para)

        # 마지막 문제 저장
        if current_problem:
            current_problem.content_text = '\n'.join(content_buffer).strip()
            problems.append(current_problem)

        return problems

    def _extract_section_pattern(self, paragraphs: List[str]) -> List[ParsedProblem]:
        """섹션 분리 패턴 추출 (문제부/정답부 분리)"""
        full_text = '\n'.join(paragraphs)

        # 정답 섹션 찾기
        section_markers = [
            r'정답\s*(및|과)?\s*해설',
            r'빠른\s*정답',
            r'정답표',
        ]

        split_pos = None
        for marker in section_markers:
            match = re.search(marker, full_text)
            if match:
                split_pos = match.start()
                break

        if split_pos:
            problem_text = full_text[:split_pos]
            answer_text = full_text[split_pos:]

            # Phase 19: 정답 섹션이 실제로 정답을 포함하는지 확인
            # 정답 섹션에 "1. ②" 같은 패턴이 있어야 유효
            has_answer_list = bool(re.search(r'\d+\.\s*[①②③④⑤]', answer_text))

            if has_answer_list:
                # 문제부 파싱
                problem_paragraphs = problem_text.split('\n')
                problems = self._extract_problems_only(problem_paragraphs)

                # 정답부에서 정답 매칭
                self._match_answers_from_section(problems, answer_text)

                return problems
            else:
                # 정답 섹션이 비어있거나 유효하지 않음
                # 문제부에서 인라인 정답/배점 기반으로 추출
                # [정답]과 [X.XX점] 태그가 있는지 확인
                problem_paragraphs = problem_text.split('\n')
                inline_count = len(re.findall(r'\[정답\]', problem_text))
                points_count = len(re.findall(r'\[\d+\.?\d*점\]', problem_text))

                if inline_count > 5 and points_count > 5:
                    # 배점 기반 추출 사용
                    return self._extract_points_based_pattern(problem_paragraphs)
                else:
                    return self._extract_default_pattern(paragraphs)
        else:
            return self._extract_default_pattern(paragraphs)

    def _extract_default_pattern(self, paragraphs: List[str]) -> List[ParsedProblem]:
        """기본 패턴 추출"""
        problems = []
        current_problem = None
        content_buffer = []

        for para in paragraphs:
            # 문제 시작 감지
            prob_match = self._match_problem_start(para)

            if prob_match:
                # 이전 문제 저장
                if current_problem:
                    current_problem.content_text = '\n'.join(content_buffer).strip()
                    # 내용에서 정답 추출 시도
                    self._extract_answer_from_content(current_problem)
                    problems.append(current_problem)

                # 새 문제 시작
                current_problem = ParsedProblem(
                    number=prob_match.value
                )
                content_buffer = [para]
            elif current_problem:
                content_buffer.append(para)

        # 마지막 문제 저장
        if current_problem:
            current_problem.content_text = '\n'.join(content_buffer).strip()
            self._extract_answer_from_content(current_problem)
            problems.append(current_problem)

        return problems

    def _extract_problems_only(self, paragraphs: List[str]) -> List[ParsedProblem]:
        """문제만 추출 (정답 제외)"""
        problems = []
        current_problem = None
        content_buffer = []

        for para in paragraphs:
            prob_match = self._match_problem_start(para)

            if prob_match:
                if current_problem:
                    current_problem.content_text = '\n'.join(content_buffer).strip()
                    problems.append(current_problem)

                current_problem = ParsedProblem(
                    number=prob_match.value
                )
                content_buffer = [para]
            elif current_problem:
                content_buffer.append(para)

        if current_problem:
            current_problem.content_text = '\n'.join(content_buffer).strip()
            problems.append(current_problem)

        return problems

    def _match_answers_from_section(self, problems: List[ParsedProblem], answer_text: str):
        """정답 섹션에서 각 문제에 정답 매칭"""
        # 번호-정답 쌍 추출
        # 예: 1. ② 2. ④ 3. 15
        answer_pattern = r'(\d+)\.\s*([①②③④⑤]|\d+|.+?)(?=\s*\d+\.|$)'
        matches = re.findall(answer_pattern, answer_text)

        answer_map = {m[0]: m[1].strip() for m in matches}

        for problem in problems:
            if problem.number in answer_map:
                problem.answer = answer_map[problem.number]
                problem.answer_type = self._detect_answer_type(problem.answer)

    def _match_problem_start(self, text: str) -> Optional[PatternMatch]:
        """문제 시작 패턴 매칭"""
        for pattern, pattern_type in self.PROBLEM_PATTERNS:
            match = re.match(pattern, text.strip())
            if match:
                # 서브 문제 (01-1 등) 처리
                if pattern_type == 'sub':
                    value = f"{match.group(1)}-{match.group(2)}"
                else:
                    value = match.group(1)

                return PatternMatch(
                    pattern_type=pattern_type,
                    match=match,
                    value=value
                )
        return None

    def _match_answer(self, text: str) -> Optional[PatternMatch]:
        """정답 패턴 매칭"""
        for pattern, pattern_type in self.ANSWER_PATTERNS:
            match = re.search(pattern, text)
            if match:
                return PatternMatch(
                    pattern_type=pattern_type,
                    match=match,
                    value=match.group(1)
                )
        return None

    def _extract_answer_from_content(self, problem: ParsedProblem):
        """문제 내용에서 정답 추출"""
        if not problem.content_text:
            return

        ans_match = self._match_answer(problem.content_text)
        if ans_match:
            problem.answer = ans_match.value.strip()
            problem.answer_type = self._detect_answer_type(problem.answer)

            # 해설도 추출 시도
            for pattern in self.EXPLANATION_PATTERNS:
                exp_match = re.search(pattern, problem.content_text, re.DOTALL)
                if exp_match:
                    problem.explanation = exp_match.group(1).strip()
                    break

    def _detect_answer_type(self, answer: str) -> str:
        """정답 유형 판별"""
        if not answer:
            return 'unknown'

        # 객관식 (①~⑤)
        if answer in '①②③④⑤':
            return 'choice'

        # 객관식 숫자 (1~5)
        if answer in '12345' and len(answer) == 1:
            return 'choice'

        # 숫자 값
        if re.match(r'^-?\d+\.?\d*$', answer):
            return 'value'

        # 수식 (LaTeX 형태)
        if any(c in answer for c in ['\\', '^', '_', '{', '}']):
            return 'expression'

        # 기본: 값
        return 'value'
