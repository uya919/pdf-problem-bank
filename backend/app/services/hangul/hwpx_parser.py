"""
Phase 16-3 → Phase 17: HWPX 파서 (ZIP + XML 형식)

HWPX 파일 구조:
파일.hwpx (ZIP)
├── mimetype
├── version.xml
├── Contents/
│   ├── header.xml
│   └── section0.xml      # 본문 (핵심)
└── BinData/
    ├── image1.jpg
    └── ...

Phase 17 추가:
- 수식(equation) 추출 지원
- Hancom Script → LaTeX 변환
"""
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional, Union
from pathlib import Path
import tempfile
import shutil
import re
import os

from .parser_base import HangulParserBase, ParseResult, ParsedProblem
from .problem_extractor import ProblemExtractor
from .equation_converter import hancom_to_latex, hancom_to_unicode


class HWPXParser(HangulParserBase):
    """HWPX (ZIP + XML) 파일 파서"""

    def __init__(self, file_path: str):
        super().__init__(file_path)
        self.temp_dir = None
        self.extractor = ProblemExtractor()

    def parse(self) -> ParseResult:
        """HWPX 파일 파싱"""
        result = ParseResult(
            file_name=self.file_name,
            file_type='hwpx'
        )

        try:
            # 1. ZIP 압축 해제
            self.temp_dir = tempfile.mkdtemp(prefix='hwpx_')

            with zipfile.ZipFile(self.file_path, 'r') as zf:
                zf.extractall(self.temp_dir)

            # 2. 텍스트 추출
            paragraphs = self.extract_text()

            # 3. 이미지 추출
            images = self.extract_images()

            # 4. 메타데이터 추출
            result.detected_metadata = self._extract_metadata()

            # 5. 문제 단위 분리
            result.problems = self.extractor.extract_problems(paragraphs)

            result.success = True

        except zipfile.BadZipFile:
            result.success = False
            result.errors.append("유효하지 않은 HWPX 파일입니다.")
        except Exception as e:
            result.success = False
            result.errors.append(f"파싱 오류: {str(e)}")
        finally:
            # 임시 디렉토리 정리
            if self.temp_dir and os.path.exists(self.temp_dir):
                shutil.rmtree(self.temp_dir)

        return result

    def extract_text(self) -> List[str]:
        """
        HWPX에서 문단 텍스트 추출

        Returns:
            List[str]: 문단 단위 텍스트 리스트
        """
        paragraphs = []

        if not self.temp_dir:
            return paragraphs

        # Contents 폴더에서 section*.xml 파일 찾기
        contents_dir = Path(self.temp_dir) / 'Contents'

        if not contents_dir.exists():
            return paragraphs

        # section 파일들 순차 처리
        section_files = sorted(contents_dir.glob('section*.xml'))

        for section_file in section_files:
            section_paragraphs = self._parse_section_file(section_file)
            paragraphs.extend(section_paragraphs)

        return paragraphs

    def _parse_section_file(self, section_path: Path) -> List[str]:
        """섹션 XML 파일 파싱 (Phase 17: 수식 포함)"""
        paragraphs = []

        try:
            tree = ET.parse(section_path)
            root = tree.getroot()

            # 네임스페이스 정의
            ns = {'hp': 'http://www.hancom.co.kr/hwpml/2011/paragraph'}

            # 문단(p) 요소 찾기
            para_tag = '{http://www.hancom.co.kr/hwpml/2011/paragraph}p'
            t_tag = '{http://www.hancom.co.kr/hwpml/2011/paragraph}t'
            eq_tag = '{http://www.hancom.co.kr/hwpml/2011/paragraph}equation'
            script_tag = '{http://www.hancom.co.kr/hwpml/2011/paragraph}script'

            content_items = []

            for para in root.iter(para_tag):
                para_content = []

                # 문단 내의 모든 요소를 순서대로 처리
                for elem in para.iter():
                    tag = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag

                    if tag == 't' and elem.text:
                        text = elem.text.strip()
                        if text:
                            para_content.append(text)

                    elif tag == 'equation':
                        # 수식 요소에서 script 추출
                        script_elem = elem.find(f'.//{script_tag}')
                        if script_elem is not None and script_elem.text:
                            script = script_elem.text.strip()
                            # LaTeX로 변환하여 저장
                            latex = hancom_to_latex(script)
                            unicode_text = hancom_to_unicode(script)
                            # Unicode 버전을 텍스트에 포함
                            para_content.append(unicode_text)

                if para_content:
                    content_items.append(' '.join(para_content))

            # 문단들을 결합
            if content_items:
                full_text = ' '.join(content_items)
                paragraphs = self._split_into_paragraphs(full_text)

        except ET.ParseError as e:
            print(f"섹션 파싱 오류: {e}")

        return paragraphs

    def _split_into_paragraphs(self, full_text: str) -> List[str]:
        """전체 텍스트를 문단으로 분할"""
        # 문제 시작 패턴
        problem_patterns = [
            r'(?=\d+\.\s)',          # 1. 2. 3.
            r'(?=\d+\)\s)',          # 1) 2) 3)
            r'(?=\[\d+\]\s)',        # [1] [2] [3]
            r'(?=\d+-\d+\s)',        # 01-1, 01-2
            r'(?=정답\s)',            # 정답
            r'(?=\[정답\])',          # [정답]
        ]

        # 결합된 패턴으로 분할
        combined_pattern = '|'.join(problem_patterns)
        segments = re.split(combined_pattern, full_text)

        # 빈 세그먼트 제거 및 정리
        paragraphs = [s.strip() for s in segments if s and s.strip()]

        return paragraphs

    def extract_images(self) -> Dict[str, bytes]:
        """
        HWPX에서 이미지 추출 (BinData 폴더)

        Returns:
            Dict[str, bytes]: 파일명 -> 이미지 데이터
        """
        images = {}

        if not self.temp_dir:
            return images

        # BinData 폴더 확인
        bindata_dir = Path(self.temp_dir) / 'BinData'

        if not bindata_dir.exists():
            return images

        # 이미지 파일 읽기
        image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'}

        for file_path in bindata_dir.iterdir():
            if file_path.suffix.lower() in image_extensions:
                try:
                    with open(file_path, 'rb') as f:
                        images[file_path.name] = f.read()
                except Exception:
                    pass

        return images

    def _extract_metadata(self) -> Dict[str, str]:
        """문서 메타데이터 추출"""
        metadata = {}

        if not self.temp_dir:
            return metadata

        # header.xml에서 메타데이터 추출 시도
        header_path = Path(self.temp_dir) / 'Contents' / 'header.xml'

        if header_path.exists():
            try:
                tree = ET.parse(header_path)
                root = tree.getroot()

                # 제목 등 메타데이터 추출
                for elem in root.iter():
                    tag_name = elem.tag.split('}')[-1] if '}' in elem.tag else elem.tag

                    if tag_name.lower() == 'title' and elem.text:
                        metadata['title'] = elem.text.strip()
                    elif tag_name.lower() == 'creator' and elem.text:
                        metadata['author'] = elem.text.strip()

            except Exception:
                pass

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

        # 단원 감지 (예: 01-지수)
        chapter_match = re.search(r'(\d{2})-([가-힣]+)', filename)
        if chapter_match:
            metadata['detected_chapter'] = chapter_match.group(2)

        # 문제 수 감지 (예: 125제)
        count_match = re.search(r'(\d+)제', filename)
        if count_match:
            metadata['detected_problem_count'] = int(count_match.group(1))

        # 출처 감지 (예: 라이트SSEN)
        source_patterns = ['라이트SSEN', '베이직쎈', '쎈', 'EBS', '수능특강']
        for source in source_patterns:
            if source in filename:
                metadata['detected_source'] = source
                break

        return metadata
