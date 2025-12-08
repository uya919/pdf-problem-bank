"""
Phase 16-2: HML 파서 (순수 XML 형식)
Phase 19: HWP 수식 문법 → 텍스트 변환 지원
Phase 19-B: ENDNOTE(미주) 기반 문제 추출
Phase 20-C: 의존성 주입 지원

HML 파일 구조:
<HWPML Version="2.8">
  <HEAD>
    <DOCSUMMARY><TITLE>제목</TITLE></DOCSUMMARY>
    <MAPPINGTABLE>
      <BINDATALIST><BINITEM BinData="1" Format="bmp"/></BINDATALIST>
    </MAPPINGTABLE>
  </HEAD>
  <BODY>
    <SECTION>
      <P ParaShape="8">
        <TEXT CharShape="0">텍스트...</TEXT>
      </P>
    </SECTION>
  </BODY>
</HWPML>
"""
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional, TYPE_CHECKING
from pathlib import Path
import base64
import zlib
import re

from .parser_base import HangulParserBase, ParseResult, ParsedProblem
from .problem_extractor import ProblemExtractor
from .hwp_latex_converter import hwp_to_latex

# Phase 20-C: 타입 힌트용 import (런타임에는 로드하지 않음)
if TYPE_CHECKING:
    from .interfaces import ILatexConverter


def clean_hwp_equation(equation: str) -> str:
    """
    Phase 19: HWP 수식 명령어를 읽기 쉬운 텍스트로 변환

    HWP 수식 문법:
    - rm: Roman (로만체) - 숫자, 상수
    - it: Italic (이탤릭) - 변수
    - bf: Bold (볼드)
    - LEFT/RIGHT: 괄호 확대
    - over: 분수
    - sqrt: 제곱근
    - leq/geq/neq: 비교 연산자

    Args:
        equation: HWP 수식 문자열

    Returns:
        정리된 텍스트
    """
    text = equation

    # Phase 19-F Step 1: cases 구조 변환 (plain text)
    # {cases{A#B#C}} → { A / B / C }
    def convert_cases_to_text(match):
        content = match.group(1)
        rows = content.split('#')
        formatted_rows = ' / '.join(row.strip() for row in rows)
        return f'{{ {formatted_rows} }}'

    # 중첩 cases 처리를 위해 반복 적용
    for _ in range(3):
        prev_text = text
        text = re.sub(r'\{cases\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\}',
                      convert_cases_to_text, text)
        if prev_text == text:
            break

    # rm/it/bf 명령어 제거 (글꼴 지시자)
    # "rm 1" → "1", "rm ABC" → "ABC"
    text = re.sub(r'\brm\s+', '', text)
    text = re.sub(r'\bit\s+', '', text)
    text = re.sub(r'\bbf\s+', '', text)

    # LEFT/RIGHT 괄호 → 실제 괄호
    text = re.sub(r'\bLEFT\s*\(', '(', text)
    text = re.sub(r'\bRIGHT\s*\)', ')', text)
    text = re.sub(r'\bLEFT\s*\[', '[', text)
    text = re.sub(r'\bRIGHT\s*\]', ']', text)
    text = re.sub(r'\bLEFT\s*\|', '|', text)
    text = re.sub(r'\bRIGHT\s*\|', '|', text)
    text = re.sub(r'\bLEFT\s*\{', '{', text)
    text = re.sub(r'\bRIGHT\s*\}', '}', text)

    # Phase 20-H: 수학 기호 변환 (look-ahead 사용하여 숫자 뒤에도 매칭)
    # (?![a-zA-Z]): 뒤에 영문자가 아니면 매칭 (숫자, 공백, 연산자 OK)
    text = re.sub(r'\bLEQ(?![a-zA-Z])', '≤', text)
    text = re.sub(r'\bleq(?![a-zA-Z])', '≤', text)
    text = re.sub(r'\bGEQ(?![a-zA-Z])', '≥', text)
    text = re.sub(r'\bgeq(?![a-zA-Z])', '≥', text)
    text = re.sub(r'\bNEQ(?![a-zA-Z])', '≠', text)
    text = re.sub(r'\bneq(?![a-zA-Z])', '≠', text)
    text = re.sub(r'\bpm(?![a-zA-Z])', '±', text)
    text = re.sub(r'\btimes(?![a-zA-Z])', '×', text)
    text = re.sub(r'\bdiv(?![a-zA-Z])', '÷', text)
    text = re.sub(r'\binfty(?![a-zA-Z])', '∞', text)

    # Phase 19-F Step 2: 각도 기호 (DEG → °)
    text = re.sub(r'\bDEG\b', '°', text)
    text = re.sub(r'\bANGLE\b', '∠', text)
    text = re.sub(r'\bangle\b', '∠', text)

    # Phase 19-G: 장식 기호 복합 패턴 먼저 처리
    # overline{{rm{AB}} it } → (AB)
    text = re.sub(r'\boverline\s*\{\{rm\{([^}]*)\}\}\s*it\s*\}', r'(\1)', text)
    text = re.sub(r'\boverline\s*\{\{rm\{([^}]*)\}\}\}', r'(\1)', text)
    text = re.sub(r'\boverline\s*\{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}', r'(\1)', text)
    # bar 복합 패턴
    text = re.sub(r'\bbar\s*\{\{rm\{([^}]*)\}\}\s*it\s*\}', r'\1', text)
    text = re.sub(r'\bbar\s*\{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}', r'\1', text)

    # Phase 19-G: 장식 기호 변환 (plain text용)
    # overline{AB} → (AB) 또는 AB̅
    text = re.sub(r'\boverline\s*\{([^}]*)\}', r'(\1)', text)
    text = re.sub(r'\bbar\s*\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\bhat\s*\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\bvec\s*\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\bdot\s*\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\btilde\s*\{([^}]*)\}', r'\1', text)
    text = re.sub(r'\bunderline\s*\{([^}]*)\}', r'\1', text)

    # Phase 20-H: 중괄호 없는 장식 기호 패턴 추가
    # overlineAB → (AB), barx → x, etc.
    text = re.sub(r'\boverline([A-Za-z0-9]+)', r'(\1)', text)
    text = re.sub(r'\bunderline([A-Za-z0-9]+)', r'\1', text)
    text = re.sub(r'\bbar([A-Za-z0-9]+)', r'\1', text)
    text = re.sub(r'\bhat([A-Za-z0-9]+)', r'\1', text)
    text = re.sub(r'\bvec([A-Za-z0-9]+)', r'\1', text)
    text = re.sub(r'\bdot([A-Za-z0-9]+)', r'\1', text)
    text = re.sub(r'\btilde([A-Za-z0-9]+)', r'\1', text)

    # Phase 19-G: 중괄호 rm 패턴 처리
    # {{rm{AB}} it } → AB
    text = re.sub(r'\{\{rm\{([^}]*)\}\}\s*it\s*\}', r'\1', text)
    # {rm{AB}} → AB
    text = re.sub(r'\{rm\{([^}]*)\}\}', r'\1', text)
    # {rm{AB} it } → AB (패턴 수정: 공백 위치 명확화)
    text = re.sub(r'\{rm\{([^}]*)\}\s+it\s*\}', r'\1', text)
    text = re.sub(r'\{rm\{([^}]*)\}it\s*\}', r'\1', text)
    # { rm AB it } → AB
    text = re.sub(r'\{\s*rm\s+([A-Za-z0-9]+)\s*it\s*\}', r'\1', text)
    # {rm{AB}} it 제거 (it가 외부에 있는 경우)
    text = re.sub(r'\{rm\{([^}]*)\}\}\s*it\b', r'\1', text)
    # {rm{AB} } → AB (it가 이미 제거된 경우 - 공백만 남음)
    text = re.sub(r'\{rm\{([^}]*)\}\s+\}', r'\1', text)
    # {{rm{AB}} } → AB (it가 이미 제거된 경우)
    text = re.sub(r'\{\{rm\{([^}]*)\}\}\s*\}', r'\1', text)

    # 그리스 문자
    text = re.sub(r'\balpha\b', 'α', text)
    text = re.sub(r'\bbeta\b', 'β', text)
    text = re.sub(r'\bgamma\b', 'γ', text)
    text = re.sub(r'\bdelta\b', 'δ', text)
    text = re.sub(r'\btheta\b', 'θ', text)
    text = re.sub(r'\bpi\b', 'π', text)
    text = re.sub(r'\bomega\b', 'ω', text)

    # 분수: {a} over {b} → a/b (간단화)
    text = re.sub(r'\{([^}]+)\}\s*over\s*\{([^}]+)\}', r'(\1)/(\2)', text)
    text = re.sub(r'(\S+)\s*over\s*(\S+)', r'\1/\2', text)

    # 제곱근: sqrt{a} → √a, sqrt a → √a
    text = re.sub(r'\bsqrt\s*\{([^}]+)\}', r'√(\1)', text)
    text = re.sub(r'\bsqrt\s+(\S+)', r'√\1', text)

    # 백틱 제거
    text = text.replace('`', '')

    # 여러 공백 → 하나로
    text = re.sub(r'\s+', ' ', text)

    return text.strip()


class HMLParser(HangulParserBase):
    """HML (순수 XML) 파일 파서

    Phase 20-C: 의존성 주입 지원
    - latex_converter: LaTeX 변환기 인스턴스 (None이면 기본 싱글톤 사용)
    """

    # HML 네임스페이스 (버전에 따라 다를 수 있음)
    NAMESPACES = {
        'hp': 'http://www.hancom.co.kr/hwpml/2011/paragraph',
        'hc': 'http://www.hancom.co.kr/hwpml/2011/core',
    }

    def __init__(
        self,
        file_path: str,
        latex_converter: Optional["ILatexConverter"] = None
    ):
        """HMLParser 초기화

        Args:
            file_path: HML 파일 경로
            latex_converter: LaTeX 변환기 (None이면 기본 싱글톤 사용)
        """
        super().__init__(file_path)
        self.tree = None
        self.root = None
        self.extractor = ProblemExtractor()

        # Phase 20-C: 의존성 주입 지원
        self._latex_converter = latex_converter

    def _convert_to_latex(self, hwp_eq: str) -> str:
        """Phase 20-C: HWP 수식을 LaTeX로 변환 (DI 지원)

        Args:
            hwp_eq: HWP 수식 문자열

        Returns:
            LaTeX 형식 문자열
        """
        if self._latex_converter is not None:
            return self._latex_converter.convert(hwp_eq)
        else:
            # 기본 싱글톤 사용
            return hwp_to_latex(hwp_eq)

    def parse(self) -> ParseResult:
        """HML 파일 파싱"""
        result = ParseResult(
            file_name=self.file_name,
            file_type='hml'
        )

        try:
            # 1. XML 파싱
            self.tree = ET.parse(self.file_path)
            self.root = self.tree.getroot()

            # 2. 텍스트 추출
            paragraphs = self.extract_text()

            # 3. 이미지 추출
            images = self.extract_images()

            # 4. 메타데이터 추출
            result.detected_metadata = self._extract_metadata()

            # Phase 19-B: ENDNOTE 기반 추출 우선 시도
            endnotes = list(self.root.iter('ENDNOTE'))
            if len(endnotes) >= 3:
                # ENDNOTE가 3개 이상이면 미주 기반 추출 사용
                result.problems = self._extract_by_endnote(endnotes, paragraphs)
                result.detected_metadata['extraction_method'] = 'endnote'
            else:
                # 기존 방식 (ProblemExtractor)
                result.problems = self.extractor.extract_problems(paragraphs)
                result.detected_metadata['extraction_method'] = 'text_pattern'

            # 검출 결과 검증
            if len(result.problems) == 0:
                result.warnings.append("문제를 검출하지 못했습니다.")

            # Phase 21-B: 이미지-문제 매핑
            if images:
                self._map_images_to_problems(result.problems, images)
                # 이미지 데이터를 메타데이터에 저장 (나중에 저장용)
                result.detected_metadata['images'] = images
                result.detected_metadata['image_count'] = len(images)

            result.success = True

        except ET.ParseError as e:
            result.success = False
            result.errors.append(f"XML 파싱 오류: {str(e)}")
        except Exception as e:
            result.success = False
            result.errors.append(f"파싱 오류: {str(e)}")

        return result

    def extract_text(self) -> List[str]:
        """
        HML에서 문단 텍스트 추출

        Returns:
            List[str]: 문단 단위 텍스트 리스트
        """
        paragraphs = []

        if self.root is None:
            return paragraphs

        # <P> 태그 (문단) 찾기 - 네임스페이스 없이 시도
        for p_elem in self.root.iter():
            if p_elem.tag.endswith('P') or p_elem.tag == 'P':
                para_text = self._get_paragraph_text(p_elem)
                if para_text.strip():
                    paragraphs.append(para_text.strip())

        # 만약 빈 결과면, 모든 텍스트 요소 수집
        if not paragraphs:
            paragraphs = self._extract_all_text()

        return paragraphs

    def _get_paragraph_text(self, p_elem) -> str:
        """
        문단 요소에서 텍스트 추출

        Phase 19: EQUATION 태그의 HWP 수식을 정리된 텍스트로 변환
        """
        texts = []
        # 이미 처리된 EQUATION 요소 추적 (중복 방지)
        processed_equations = set()

        for elem in p_elem.iter():
            # Phase 19: EQUATION 태그 특별 처리
            if elem.tag.endswith('EQUATION') or elem.tag == 'EQUATION':
                elem_id = id(elem)
                if elem_id not in processed_equations:
                    processed_equations.add(elem_id)
                    # 수식 텍스트 추출 및 정리
                    eq_text = ''.join(elem.itertext())
                    if eq_text.strip():
                        cleaned = clean_hwp_equation(eq_text)
                        texts.append(cleaned)
                continue  # EQUATION 내부 요소는 건너뛰기

            # EQUATION 내부 요소인 경우 건너뛰기
            parent = None
            for ancestor in p_elem.iter():
                if elem in list(ancestor):
                    parent = ancestor
                    break
            if parent is not None:
                if parent.tag.endswith('EQUATION') or parent.tag == 'EQUATION':
                    continue

            # TEXT 태그
            if elem.tag.endswith('TEXT') or elem.tag == 'TEXT':
                if elem.text:
                    texts.append(elem.text)
            # CHAR 태그 (개별 문자)
            elif elem.tag.endswith('CHAR') or elem.tag == 'CHAR':
                if elem.text:
                    texts.append(elem.text)
            # 직접 텍스트
            elif elem.text and elem.tag not in ['P', 'PARA']:
                # 태그 이름이 대문자로만 구성된 경우 (XML 요소)는 건너뛰기
                if not elem.tag.isupper():
                    texts.append(elem.text)

        return ''.join(texts)

    def _get_paragraph_text_with_latex(self, p_elem) -> tuple:
        """
        Phase 19-C: 문단에서 텍스트와 LaTeX 버전 모두 추출

        Returns:
            tuple: (plain_text, latex_text, hwp_equations, latex_equations)
        """
        plain_parts = []
        latex_parts = []
        hwp_equations = []
        latex_equations = []
        processed_equations = set()

        for elem in p_elem.iter():
            # EQUATION 태그 처리
            if elem.tag.endswith('EQUATION') or elem.tag == 'EQUATION':
                elem_id = id(elem)
                if elem_id not in processed_equations:
                    processed_equations.add(elem_id)
                    eq_text = ''.join(elem.itertext()).strip()
                    if eq_text:
                        # 원본 HWP 수식 저장
                        hwp_equations.append(eq_text)

                        # 일반 텍스트 버전
                        # Phase 19-E: 수식 뒤 공백 추가 (선택지 숫자 병합 방지)
                        cleaned = clean_hwp_equation(eq_text)
                        plain_parts.append(cleaned + ' ')

                        # LaTeX 버전 (수식을 $...$ 로 감싸기)
                        # Phase 20-C: DI 지원
                        latex_eq = self._convert_to_latex(eq_text)
                        latex_equations.append(latex_eq)
                        latex_parts.append(f'${latex_eq}$')
                continue

            # EQUATION 내부 요소 건너뛰기
            parent = None
            for ancestor in p_elem.iter():
                if elem in list(ancestor):
                    parent = ancestor
                    break
            if parent is not None:
                if parent.tag.endswith('EQUATION') or parent.tag == 'EQUATION':
                    continue

            # TEXT/CHAR 태그
            text_content = None
            if elem.tag.endswith('TEXT') or elem.tag == 'TEXT':
                text_content = elem.text
            elif elem.tag.endswith('CHAR') or elem.tag == 'CHAR':
                text_content = elem.text
            elif elem.text and elem.tag not in ['P', 'PARA']:
                if not elem.tag.isupper():
                    text_content = elem.text

            if text_content:
                plain_parts.append(text_content)
                latex_parts.append(text_content)

            # Phase 19-E: tail 텍스트 처리 (선택지 기호 ②③ 등이 TAB.tail에 있음)
            if elem.tail:
                plain_parts.append(elem.tail)
                latex_parts.append(elem.tail)

        return (
            ''.join(plain_parts),
            ''.join(latex_parts),
            hwp_equations,
            latex_equations
        )

    def _extract_all_text(self) -> List[str]:
        """모든 텍스트 요소 추출 (폴백 방식)"""
        paragraphs = []
        current_para = []

        def extract_recursive(elem):
            # 텍스트 추출
            if elem.text:
                text = elem.text.strip()
                if text:
                    current_para.append(text)

            # 자식 요소 순회
            for child in elem:
                extract_recursive(child)

            # tail 텍스트 (요소 뒤 텍스트)
            if elem.tail:
                tail = elem.tail.strip()
                if tail:
                    current_para.append(tail)

        extract_recursive(self.root)

        # 연속된 텍스트를 문단으로 결합
        full_text = ' '.join(current_para)

        # 줄바꿈 또는 특정 패턴으로 분할
        # 문제 번호 패턴 앞에서 분할
        split_pattern = r'(?=\d+\.\s|\[정답\]|\[\d+\.\d+점\])'
        segments = re.split(split_pattern, full_text)

        paragraphs = [s.strip() for s in segments if s.strip()]

        return paragraphs

    def extract_images(self) -> Dict[str, Dict]:
        """
        Phase 21-A: HML에서 이미지 추출 (수정됨)

        HML 이미지 구조:
        - BINITEM: HEAD/MAPPINGTABLE/BINDATALIST에 메타데이터
        - BINDATA: TAIL/BINDATASTORAGE에 실제 데이터 (Base64, zlib 압축)

        Returns:
            Dict[str, Dict]: 이미지 ID -> {'data': bytes, 'format': str}
        """
        images = {}

        if self.root is None:
            return images

        # 1. BINITEM에서 메타데이터 수집 (ID -> Format)
        binitem_map = {}
        for elem in self.root.iter():
            if elem.tag == 'BINITEM' or elem.tag.endswith('}BINITEM'):
                bin_id = elem.get('BinData') or elem.get('Id')
                fmt = elem.get('Format', 'bin')
                if bin_id:
                    binitem_map[bin_id] = fmt

        # 2. BINDATA에서 실제 데이터 추출
        for elem in self.root.iter():
            if elem.tag == 'BINDATA' or elem.tag.endswith('}BINDATA'):
                bin_id = elem.get('Id')
                if not bin_id or not elem.text:
                    continue

                try:
                    # Base64 디코딩 (줄바꿈/공백 제거)
                    data_text = elem.text.strip().replace('\n', '').replace('\r', '').replace(' ', '')
                    raw_data = base64.b64decode(data_text)

                    # 압축 해제 (Compress="true"인 경우)
                    compress = elem.get('Compress', 'false').lower()
                    if compress == 'true':
                        try:
                            # zlib raw deflate (wbits=-15)
                            raw_data = zlib.decompress(raw_data, -15)
                        except zlib.error:
                            # 기본 zlib 해제 시도
                            try:
                                raw_data = zlib.decompress(raw_data)
                            except zlib.error:
                                pass  # 압축 해제 실패 시 원본 유지

                    # 메타데이터와 결합
                    fmt = binitem_map.get(bin_id, 'bin')
                    images[bin_id] = {
                        'data': raw_data,
                        'format': fmt
                    }

                except Exception:
                    pass

        return images

    def _extract_metadata(self) -> Dict[str, str]:
        """문서 메타데이터 추출"""
        metadata = {}

        if self.root is None:
            return metadata

        # DOCSUMMARY에서 제목 등 추출
        for elem in self.root.iter():
            if 'TITLE' in elem.tag and elem.text:
                metadata['title'] = elem.text.strip()
            elif 'AUTHOR' in elem.tag and elem.text:
                metadata['author'] = elem.text.strip()
            elif 'SUBJECT' in elem.tag and elem.text:
                metadata['subject'] = elem.text.strip()

        # 파일명에서 추가 정보 추출
        metadata.update(self._extract_from_filename())

        return metadata

    def _extract_from_filename(self) -> Dict[str, str]:
        """파일명에서 메타데이터 추출"""
        metadata = {}
        filename = self.file_name

        # 학년 감지
        grade_patterns = {
            '고1': r'고1|고등학교\s*1',
            '고2': r'고2|고등학교\s*2',
            '고3': r'고3|고등학교\s*3',
            '중1': r'중1|중학교\s*1',
            '중2': r'중2|중학교\s*2',
            '중3': r'중3|중학교\s*3',
        }

        for grade, pattern in grade_patterns.items():
            if re.search(pattern, filename, re.IGNORECASE):
                metadata['detected_grade'] = grade
                break

        # 과목 감지
        if re.search(r'수학|math', filename, re.IGNORECASE):
            metadata['detected_subject'] = '수학'
        elif re.search(r'영어|english', filename, re.IGNORECASE):
            metadata['detected_subject'] = '영어'
        elif re.search(r'국어|korean', filename, re.IGNORECASE):
            metadata['detected_subject'] = '국어'

        # 학기/시험 감지
        if re.search(r'1학기', filename):
            metadata['detected_semester'] = '1학기'
        elif re.search(r'2학기', filename):
            metadata['detected_semester'] = '2학기'

        if re.search(r'기말', filename):
            metadata['detected_exam_type'] = '기말고사'
        elif re.search(r'중간', filename):
            metadata['detected_exam_type'] = '중간고사'

        return metadata

    # =========================================================================
    # Phase 19-B: ENDNOTE 기반 문제 추출 메서드들
    # =========================================================================

    def _extract_by_endnote(
        self,
        endnotes: List,
        paragraphs: List[str]
    ) -> List[ParsedProblem]:
        """
        Phase 19-B: ENDNOTE 기반 문제 추출

        Args:
            endnotes: ENDNOTE 태그 리스트
            paragraphs: 추출된 텍스트 문단들

        Returns:
            List[ParsedProblem]: 추출된 문제 리스트
        """
        problems = []

        # 1. ENDNOTE에서 정답 추출
        answers = self._extract_answers_from_endnotes(endnotes)

        # 2. AUTONUM으로 문제 본문 위치 파악
        problem_contents = self._find_problem_contents_by_autonum()

        # 3. 배점 정보 추출
        points_map = self._extract_points_map(paragraphs)

        # 4. 문제 객체 생성
        for i, answer_info in enumerate(answers):
            problem = ParsedProblem(
                number=str(i + 1),
                answer=answer_info['answer'],
                answer_latex=answer_info.get('answer_latex', answer_info['answer']),
                answer_type=answer_info['type']
            )

            # Phase 19-C: 문제 본문 매핑 (텍스트 + LaTeX)
            if i < len(problem_contents):
                content_data = problem_contents[i]
                problem.content_text = content_data['text']
                problem.content_latex = content_data['latex']
                problem.content_equations = content_data['equations']
                problem.content_equations_latex = content_data['equations_latex']

            # 배점 매핑 (순서 기반)
            if i + 1 in points_map:
                problem.points = points_map[i + 1]

            problems.append(problem)

        return problems

    def _extract_answers_from_endnotes(self, endnotes: List) -> List[Dict[str, str]]:
        """
        Phase 19-C: ENDNOTE 태그에서 정답 추출 (텍스트 + LaTeX)

        Returns:
            List[Dict]: [{'answer': '②', 'answer_latex': '②', 'type': 'choice', 'raw': '...'}, ...]
        """
        answers = []

        for note in endnotes:
            note_text = ''.join(note.itertext()).strip()

            # [정답] 패턴 찾기
            ans_match = re.search(r'\[정답\]\s*(.+)', note_text)

            if ans_match:
                raw_answer = ans_match.group(1).strip()

                # HWP 수식 정리 (일반 텍스트)
                answer = clean_hwp_equation(raw_answer)

                # Phase 19-C: LaTeX 변환
                # Phase 20-C: DI 지원
                answer_latex = self._convert_to_latex(raw_answer)

                # "수식입니다." 제거 (시작 또는 중간 어디서든)
                answer = re.sub(r'수식입니다\.?\s*', '', answer)
                answer_latex = re.sub(r'수식입니다\.?\s*', '', answer_latex)

                # 유형 판별
                answer_type = self._classify_answer_type(answer)

                answers.append({
                    'answer': answer,
                    'answer_latex': answer_latex,
                    'type': answer_type,
                    'raw': raw_answer
                })
            else:
                # [정답] 패턴이 없으면 전체 텍스트를 정답으로
                answers.append({
                    'answer': note_text,
                    'answer_latex': note_text,
                    'type': 'unknown',
                    'raw': note_text
                })

        return answers

    def _classify_answer_type(self, answer: str) -> str:
        """
        정답 유형 분류

        Returns:
            'choice': 객관식 (①~⑤)
            'value': 단답형 (숫자)
            'expression': 수식/범위
            'text': 텍스트
        """
        # 객관식 (원문자)
        if re.match(r'^[①②③④⑤]$', answer):
            return 'choice'

        # 숫자 값
        if re.match(r'^-?\d+\.?\d*$', answer):
            return 'value'

        # 분수 형태
        if re.match(r'^\(?-?\d+\)?/\(?-?\d+\)?$', answer):
            return 'value'

        # 부등식/범위 (주관식)
        if '≤' in answer or '≥' in answer or 'LEQ' in answer or 'GEQ' in answer:
            return 'expression'

        # 방정식/함수
        if '=' in answer and ('x' in answer or 'y' in answer):
            return 'expression'

        # 기타 텍스트
        return 'text'

    def _find_problem_contents_by_autonum(self) -> List[Dict]:
        """
        Phase 19-C: AUTONUM 위치 기반 문제 본문 추출 (텍스트 + LaTeX)

        Returns:
            List[Dict]: 문제별 {'text': ..., 'latex': ..., 'equations': ..., 'equations_latex': ...}
        """
        if self.root is None:
            return []

        # 1. AUTONUM(Endnote) 위치 수집
        # Phase 19-D: ENDNOTE 내 P 태그 제외 (본문 P 태그만 사용)
        autonum_positions = []

        # ENDNOTE 내 P 태그들을 먼저 수집 (제외 대상)
        endnote_p_elements = set()
        for endnote in self.root.iter('ENDNOTE'):
            for p in endnote.iter('P'):
                endnote_p_elements.add(p)

        # ENDNOTE P 태그를 제외한 본문 P 태그만 수집
        all_p_elements = [p for p in self.root.iter('P') if p not in endnote_p_elements]

        for p_idx, p_elem in enumerate(all_p_elements):
            for autonum in p_elem.iter('AUTONUM'):
                if autonum.get('NumberType') == 'Endnote':
                    num = int(autonum.get('Number', 0))
                    autonum_positions.append({
                        'number': num,
                        'p_index': p_idx,
                        'p_elem': p_elem
                    })

        # 번호순 정렬
        autonum_positions.sort(key=lambda x: x['number'])

        # 2. 각 문제의 본문 범위 결정
        problem_contents = []

        for i, pos in enumerate(autonum_positions):
            # 현재 문제의 P 태그 인덱스
            start_idx = pos['p_index']

            # 다음 문제의 P 태그 인덱스 (또는 끝)
            if i + 1 < len(autonum_positions):
                end_idx = autonum_positions[i + 1]['p_index']
            else:
                end_idx = len(all_p_elements)

            # Phase 19-C: 텍스트와 LaTeX 모두 추출
            plain_parts = []
            latex_parts = []
            all_hwp_equations = []
            all_latex_equations = []
            # Phase 20-N: 수식 중복 방지용 집합
            seen_equations = set()

            # Phase 19-E: 범위 확장 (10 → 20) - 선택지 P 태그 포함
            for p_idx in range(max(0, start_idx - 3), min(end_idx, start_idx + 20)):
                # 문제 시작 전후 일부 P 태그만 사용
                plain_text, latex_text, hwp_eqs, latex_eqs = \
                    self._get_paragraph_text_with_latex(all_p_elements[p_idx])
                if plain_text.strip():
                    plain_parts.append(plain_text.strip())
                    latex_parts.append(latex_text.strip())
                    # Phase 20-N: 중복 수식 제거
                    for hwp_eq, latex_eq in zip(hwp_eqs, latex_eqs):
                        eq_key = latex_eq.strip()
                        if eq_key and eq_key not in seen_equations:
                            seen_equations.add(eq_key)
                            all_hwp_equations.append(hwp_eq)
                            all_latex_equations.append(latex_eq)

            # [정답], [X.XX점] 등 메타 정보 제거
            plain_content = ' '.join(plain_parts)
            plain_content = self._clean_problem_content(plain_content)

            latex_content = ' '.join(latex_parts)
            latex_content = self._clean_problem_content(latex_content)

            # Phase 20-P/20-P-2: rm 패턴 수정 (EQUATION 태그 밖 텍스트에 적용)
            latex_content = self._fix_rm_patterns_in_latex(latex_content)

            # Phase 20-N: content_latex에서 중복 인라인 수식 제거
            latex_content = self._remove_duplicate_inline_equations(latex_content)

            # Phase 20-O: 텍스트 블록 중복 제거 ((가), (나), (다) 등 반복 패턴)
            plain_content = self._remove_duplicate_text_blocks(plain_content)
            latex_content = self._remove_duplicate_text_blocks(latex_content)

            problem_contents.append({
                'text': plain_content,
                'latex': latex_content,
                'equations': all_hwp_equations,
                'equations_latex': all_latex_equations
            })

        return problem_contents

    def _clean_problem_content(self, content: str) -> str:
        """
        Phase 19-D: 문제 본문에서 메타 정보 제거 (확장)

        제거 대상:
        - [정답] ②
        - [4.20점]
        - 문서 헤더 (내신 2024년...)
        - HWP 개체 대체 텍스트
        - 반복 텍스트
        """
        # === 기존 패턴 (수정됨 - Phase 19-D) ===
        # [정답] 태그 제거 (주의: \w는 한국어도 매칭하므로 사용하지 않음)
        # [정답] 뒤에는 선택지 기호(①②③④⑤)만 허용
        content = re.sub(r'\[정답\]\s*[①②③④⑤]?\s*', '', content)

        # [X.XX점] 태그 제거
        content = re.sub(r'\[\d+\.?\d*점\]', '', content)

        # === Phase 20-P: 정답 섹션 패턴 제거 ===
        # (빠른 정답) 및 날짜 패턴 제거 - 문제 21 버그 수정
        content = re.sub(r'\(빠른\s*정답\)[\s\d.]*', '', content)
        content = re.sub(r'\d{4}\.\d{2}\.\d{2}', '', content)  # 날짜 형식 YYYY.MM.DD

        # === Phase 19-D: 새 패턴 추가 ===

        # 1. HWP 개체 대체 텍스트 제거
        content = re.sub(r'(선입니다|사각형입니다|원입니다|직선입니다|삼각형입니다)\.?', '', content)

        # 2. "수학영역" 완전 제거 (어디에 있든)
        content = re.sub(r'수학영역\s*', '', content)

        # 3. 교시 정보 제거
        content = re.sub(r'제?\d+교시\s*', '', content)

        # 3.5. Phase 19-E: 문서 헤더 패턴 제거 (어디서든 나타날 수 있음)
        # "내신 YYYY년 ... 수학상/수학" 패턴 제거
        content = re.sub(r'내신\s*\d{4}년[^①②③④⑤]*?(수학상|수학)\s*\d*\s*', '', content)

        # 4. Phase 19-E: 선택지 공백 정규화 (기호 앞뒤 공백 확보)
        # 기존: 앞쪽 선택지 제거 → 변경: 공백만 정리
        content = re.sub(r'([①②③④⑤])(\S)', r'\1 \2', content)  # 기호 뒤 공백
        content = re.sub(r'(\S)([①②③④⑤])', r'\1 \2', content)  # 기호 앞 공백

        # 5. 문제 시작점 찾기: 문제 키워드 앞의 모든 헤더 제거
        problem_keywords = (
            r'(부등식|방정식|이차방정식|연립부등식|연립방정식|'
            r'함수|다항식|이차함수|삼차함수|'
            r'점\s*[A-Z]|직선|원\s|삼각형|사각형|평면|좌표평면|좌표|'
            r'두\s*수|세\s*수|실수|정수|자연수|유리수|'
            r'그림|한\s*개|'  # Phase 19-D: 추가 키워드
            r'다음|아래)'
        )
        match = re.search(problem_keywords, content)
        if match:
            content = content[match.start():]

        # 6. 여러 공백 정리
        content = re.sub(r'\s+', ' ', content)

        # 7. 문서 푸터 제거 (마지막 단계 - 모든 정제 후 끝부분 확인)
        # 문제 본문 뒤 절반 이후에 "내신 YYYY년"이 나오면 그 이후 제거
        if len(content) > 50:
            mid_point = len(content) // 2
            footer_match = re.search(r'내신\s*\d{4}년', content[mid_point:])
            if footer_match:
                footer_start = mid_point + footer_match.start()
                content = content[:footer_start].strip()

        return content.strip()[:500]  # 최대 500자

    def _fix_rm_patterns_in_latex(self, content: str) -> str:
        """
        Phase 20-P-2: latex_content에서 rm 패턴 수정

        EQUATION 태그 밖의 일반 텍스트에 있는 rm 패턴을 처리.
        hwp_latex_converter.py를 거치지 않은 텍스트에 적용.

        처리 패턴:
        - rm - 2 → -2 (음수, 대소문자 무시)
        - RM A → \\mathrm{A} (대문자 rm + 문자)

        Args:
            content: LaTeX 문자열

        Returns:
            rm 패턴이 수정된 문자열
        """
        # 1. 음수 패턴: rm - 2 → -2, RM - 1 → -1 (대소문자 무시)
        content = re.sub(r'\brm\s+-\s*(\d+)', r'-\1', content, flags=re.IGNORECASE)

        # 2. 대문자 RM 문자 패턴: RM A → \mathrm{A}
        # 소문자 rm은 hwp_to_latex()에서 이미 처리됨
        # 대문자 RM만 추가 처리 (EQUATION 태그 밖에서 발생)
        content = re.sub(r'\bRM\s+([A-Za-z0-9]+)', r'\\mathrm{\1}', content)

        return content

    def _remove_duplicate_inline_equations(self, content: str) -> str:
        """
        Phase 20-N: content_latex에서 중복 인라인 수식 제거

        HML 파일에서 같은 수식이 여러 P 태그에 반복되는 경우,
        content_latex에 같은 $...$ 패턴이 여러 번 나타날 수 있음.
        이 메서드는 중복 수식을 제거하고 첫 번째만 유지.

        Args:
            content: 인라인 수식을 포함한 LaTeX 문자열

        Returns:
            중복 수식이 제거된 문자열
        """
        if not content or '$' not in content:
            return content

        # $...$ 패턴 찾기 (단순하지 않은 수식 - 길이 10 이상)
        # 짧은 수식은 중복으로 보지 않음 (예: $x$, $y$ 등)
        seen_equations = set()
        result_parts = []
        last_end = 0

        # 정규식으로 $...$ 패턴 찾기
        import re
        pattern = re.compile(r'\$([^$]+)\$')

        for match in pattern.finditer(content):
            eq_content = match.group(1).strip()

            # 수식 시작 전 텍스트 추가
            result_parts.append(content[last_end:match.start()])

            # 긴 수식(15자 이상)만 중복 체크
            if len(eq_content) >= 15:
                if eq_content not in seen_equations:
                    seen_equations.add(eq_content)
                    result_parts.append(match.group(0))  # 전체 $...$
                # 중복이면 건너뜀 (추가하지 않음)
            else:
                # 짧은 수식은 항상 추가
                result_parts.append(match.group(0))

            last_end = match.end()

        # 남은 텍스트 추가
        result_parts.append(content[last_end:])

        # 연속 공백 정리
        result = ''.join(result_parts)
        result = re.sub(r'\s+', ' ', result)

        return result.strip()

    def _remove_duplicate_text_blocks(self, content: str) -> str:
        """
        Phase 20-O: 중복 텍스트 블록 제거

        HML 파일에서 같은 조건 텍스트((가), (나), (다) 등)가
        여러 P 태그에 반복되는 경우 중복 제거.

        예시:
        입력: "(가) A + B = 5 (나) A - B = 3 (가) A + B = 5 (나) A - B = 3"
        출력: "(가) A + B = 5 (나) A - B = 3"

        Args:
            content: 텍스트 문자열

        Returns:
            중복이 제거된 문자열
        """
        if not content:
            return content

        # 조건 마커 패턴: (가), (나), (다), (라), (마), (1), (2), (ㄱ), (ㄴ) 등
        marker_pattern = re.compile(r'\(([가나다라마바사아자차카타파하]|\d+|[ㄱㄴㄷㄹㅁㅂㅅㅇ])\)')

        # 마커 위치 찾기
        markers = list(marker_pattern.finditer(content))

        if len(markers) < 2:
            # 마커가 1개 이하면 중복 체크 불필요
            return content

        # 마커 시퀀스 추적
        # 예: "(가) ... (나) ... (다) ..." → ['가', '나', '다']
        marker_sequence = [m.group(1) for m in markers]

        # 반복 패턴 찾기
        # 예: ['가', '나', '다', '가', '나', '다'] → 길이 3 패턴 반복
        half = len(marker_sequence) // 2
        for pattern_len in range(2, half + 1):
            pattern = marker_sequence[:pattern_len]
            # 패턴이 반복되는지 확인
            if marker_sequence[:pattern_len] == marker_sequence[pattern_len:pattern_len * 2]:
                # 첫 번째 패턴 끝까지만 유지
                end_marker = markers[pattern_len - 1]
                # 다음 마커 시작점 직전까지
                if pattern_len < len(markers):
                    cut_point = markers[pattern_len].start()
                    return content[:cut_point].strip()
                break

        return content

    def _extract_points_map(self, paragraphs: List[str]) -> Dict[int, float]:
        """
        배점 정보 추출 및 문제 번호 매핑

        Returns:
            Dict[int, float]: {문제번호: 배점}
        """
        points_map = {}
        full_text = '\n'.join(paragraphs)

        # [X.XX점] 패턴 모두 찾기
        points_matches = list(re.finditer(r'\[(\d+\.?\d*)점\]', full_text))

        # 순서대로 매핑 (문제 번호와 1:1 대응 가정)
        # 실제로는 [정답] 뒤에 오는 배점이 해당 문제의 배점
        for i, match in enumerate(points_matches):
            problem_num = i + 1  # 1부터 시작
            points_value = float(match.group(1))
            points_map[problem_num] = points_value

        return points_map

    # =========================================================================
    # Phase 21-B: 이미지-문제 매핑 메서드
    # =========================================================================

    def _find_picture_locations(self) -> List[Dict]:
        """
        Phase 21-B: PICTURE 태그 위치와 BinData ID 수집

        HML 구조:
        <SHAPEOBJECT>
          <PICTURE>
            <SHAPECOMPONENT>
              <IMAGECT BinItem="1"/>  <!-- BinItem ID 참조 -->
            </SHAPECOMPONENT>
          </PICTURE>
        </SHAPEOBJECT>

        Returns:
            List[Dict]: [{'bin_id': '1', 'p_index': 42}, ...]
        """
        if self.root is None:
            return []

        picture_locations = []

        # ENDNOTE 내 P 태그들 제외
        endnote_p_elements = set()
        for endnote in self.root.iter('ENDNOTE'):
            for p in endnote.iter('P'):
                endnote_p_elements.add(p)

        # 본문 P 태그만 수집 (인덱스와 함께)
        all_p_elements = [p for p in self.root.iter('P') if p not in endnote_p_elements]

        # 각 P 태그에서 PICTURE 찾기
        for p_idx, p_elem in enumerate(all_p_elements):
            for picture in p_elem.iter('PICTURE'):
                # IMAGECT에서 BinItem ID 찾기
                for imagect in picture.iter('IMAGECT'):
                    bin_item_id = imagect.get('BinItem')
                    if bin_item_id:
                        picture_locations.append({
                            'bin_id': bin_item_id,
                            'p_index': p_idx
                        })
                        break  # 하나의 PICTURE당 하나의 이미지

                # IMAGE 태그도 확인 (다른 HML 버전)
                for image in picture.iter('IMAGE'):
                    bin_item_id = image.get('BinItem') or image.get('BinData')
                    if bin_item_id:
                        picture_locations.append({
                            'bin_id': bin_item_id,
                            'p_index': p_idx
                        })
                        break

        return picture_locations

    def _get_autonum_positions(self) -> List[Dict]:
        """
        Phase 21-B: AUTONUM(Endnote) 위치 정보 반환

        Returns:
            List[Dict]: [{'number': 1, 'p_index': 10}, ...]
        """
        if self.root is None:
            return []

        # ENDNOTE 내 P 태그들 제외
        endnote_p_elements = set()
        for endnote in self.root.iter('ENDNOTE'):
            for p in endnote.iter('P'):
                endnote_p_elements.add(p)

        all_p_elements = [p for p in self.root.iter('P') if p not in endnote_p_elements]

        autonum_positions = []
        for p_idx, p_elem in enumerate(all_p_elements):
            for autonum in p_elem.iter('AUTONUM'):
                if autonum.get('NumberType') == 'Endnote':
                    num = int(autonum.get('Number', 0))
                    autonum_positions.append({
                        'number': num,
                        'p_index': p_idx
                    })

        # 번호순 정렬
        autonum_positions.sort(key=lambda x: x['number'])
        return autonum_positions

    def _map_images_to_problems(
        self,
        problems: List[ParsedProblem],
        images: Dict[str, Dict]
    ) -> None:
        """
        Phase 21-B: 이미지를 문제에 매핑

        PICTURE 태그 위치를 기반으로 각 이미지가 어느 문제에 속하는지 결정.

        Args:
            problems: 파싱된 문제 리스트 (수정됨)
            images: 추출된 이미지 Dict[bin_id -> {'data': bytes, 'format': str}]
        """
        if not problems or not images:
            return

        # 1. PICTURE 위치 수집
        picture_locations = self._find_picture_locations()

        if not picture_locations:
            return

        # 2. AUTONUM 위치 수집 (문제 경계)
        autonum_positions = self._get_autonum_positions()

        if not autonum_positions:
            return

        # 3. 각 PICTURE를 문제에 매핑
        for pic_loc in picture_locations:
            bin_id = pic_loc['bin_id']
            pic_p_index = pic_loc['p_index']

            # 이미지가 실제로 존재하는지 확인
            if bin_id not in images:
                continue

            # 해당 P 인덱스가 어느 문제 범위에 속하는지 찾기
            problem_num = self._find_problem_for_position(pic_p_index, autonum_positions)

            if problem_num is not None and 1 <= problem_num <= len(problems):
                problem = problems[problem_num - 1]
                # 이미지 ID 추가 (중복 방지)
                if bin_id not in problem.content_images:
                    problem.content_images.append(bin_id)

    def _find_problem_for_position(
        self,
        p_index: int,
        autonum_positions: List[Dict]
    ) -> Optional[int]:
        """
        Phase 21-B: P 태그 인덱스가 어느 문제에 속하는지 찾기

        Args:
            p_index: P 태그 인덱스
            autonum_positions: AUTONUM 위치 리스트

        Returns:
            문제 번호 (1부터 시작) 또는 None
        """
        if not autonum_positions:
            return None

        # 각 문제의 시작 P 인덱스 확인
        for i, pos in enumerate(autonum_positions):
            start_idx = pos['p_index']

            # 다음 문제의 시작 인덱스
            if i + 1 < len(autonum_positions):
                end_idx = autonum_positions[i + 1]['p_index']
            else:
                end_idx = float('inf')  # 마지막 문제

            # 범위 체크 (문제 시작 전 약간의 여유 허용)
            if start_idx - 5 <= p_index < end_idx:
                return pos['number']

        return None
