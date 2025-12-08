"""
시험지 PDF 내보내기 서비스

Phase E-1: 시험지를 PDF로 내보내기
"""

import io
import os
from pathlib import Path
from typing import List, Optional, Tuple
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, B4, letter
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Image,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    Flowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from ...models.exam_paper import ExamPaper, ExamPaperSettings
from ...models.problem import Problem


class ExamPdfExporter:
    """시험지 PDF 내보내기"""

    # 용지 크기 매핑
    PAPER_SIZES = {
        "A4": A4,
        "B4": B4,
        "Letter": letter,
    }

    # 폰트 크기 매핑
    FONT_SIZES = {
        "small": {"title": 16, "subtitle": 12, "body": 9, "problem_num": 10},
        "medium": {"title": 20, "subtitle": 14, "body": 11, "problem_num": 12},
        "large": {"title": 24, "subtitle": 16, "body": 13, "problem_num": 14},
    }

    def __init__(self, dataset_root: str):
        self.dataset_root = Path(dataset_root)
        self._register_fonts()

    def _register_fonts(self):
        """한글 폰트 등록"""
        # Windows 기본 폰트 경로
        font_paths = [
            "C:/Windows/Fonts/malgun.ttf",  # 맑은 고딕
            "C:/Windows/Fonts/NanumGothic.ttf",  # 나눔고딕
            "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",  # Linux
        ]

        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    pdfmetrics.registerFont(TTFont("Korean", font_path))
                    return
                except Exception:
                    continue

        # 폰트 등록 실패 시 기본 폰트 사용
        print("[ExamPdfExporter] 한글 폰트를 찾을 수 없습니다. 기본 폰트를 사용합니다.")

    def _get_page_size(self, settings: ExamPaperSettings) -> Tuple[float, float]:
        """용지 크기 반환"""
        base_size = self.PAPER_SIZES.get(settings.paperSize, A4)

        if settings.orientation == "landscape":
            return (base_size[1], base_size[0])
        return base_size

    def _create_styles(self, settings: ExamPaperSettings) -> dict:
        """스타일 생성"""
        font_sizes = self.FONT_SIZES.get(settings.fontSize, self.FONT_SIZES["medium"])

        # 한글 폰트 확인
        try:
            pdfmetrics.getFont("Korean")
            font_name = "Korean"
        except KeyError:
            font_name = "Helvetica"

        styles = {
            "title": ParagraphStyle(
                "title",
                fontName=font_name,
                fontSize=font_sizes["title"],
                alignment=TA_CENTER,
                spaceAfter=6 * mm,
                leading=font_sizes["title"] * 1.2,
            ),
            "subtitle": ParagraphStyle(
                "subtitle",
                fontName=font_name,
                fontSize=font_sizes["subtitle"],
                alignment=TA_CENTER,
                spaceAfter=4 * mm,
                textColor=colors.grey,
                leading=font_sizes["subtitle"] * 1.2,
            ),
            "info": ParagraphStyle(
                "info",
                fontName=font_name,
                fontSize=10,
                alignment=TA_LEFT,
                leading=14,
            ),
            "section_title": ParagraphStyle(
                "section_title",
                fontName=font_name,
                fontSize=font_sizes["problem_num"] + 2,
                alignment=TA_LEFT,
                spaceBefore=6 * mm,
                spaceAfter=4 * mm,
                borderWidth=1,
                borderColor=colors.grey,
                borderPadding=2 * mm,
            ),
            "problem_num": ParagraphStyle(
                "problem_num",
                fontName=font_name,
                fontSize=font_sizes["problem_num"],
                alignment=TA_LEFT,
                leading=font_sizes["problem_num"] * 1.4,
            ),
            "body": ParagraphStyle(
                "body",
                fontName=font_name,
                fontSize=font_sizes["body"],
                alignment=TA_LEFT,
                leading=font_sizes["body"] * 1.4,
            ),
            "answer": ParagraphStyle(
                "answer",
                fontName=font_name,
                fontSize=font_sizes["body"],
                alignment=TA_LEFT,
                textColor=colors.darkgreen,
                leading=font_sizes["body"] * 1.4,
            ),
        }

        return styles

    def _build_header(
        self,
        settings: ExamPaperSettings,
        styles: dict,
        total_points: int,
        is_answer_key: bool = False,
    ) -> List[Flowable]:
        """헤더 영역 생성"""
        elements = []

        # 기관명
        if settings.institution:
            elements.append(Paragraph(settings.institution, styles["info"]))
            elements.append(Spacer(1, 2 * mm))

        # 제목
        title = settings.title
        if is_answer_key:
            title += " (정답지)"
        elements.append(Paragraph(f"<b>{title}</b>", styles["title"]))

        # 부제목
        if settings.subtitle:
            elements.append(Paragraph(settings.subtitle, styles["subtitle"]))

        # 정보 테이블
        info_data = []
        left_info = []
        right_info = []

        if settings.subject:
            left_info.append(f"과목: {settings.subject}")
        if settings.grade:
            left_info.append(f"학년: {settings.grade}")

        if settings.date:
            right_info.append(f"날짜: {settings.date}")
        if settings.duration:
            right_info.append(f"시간: {settings.duration}분")
        if settings.showTotalPoints:
            right_info.append(f"총점: {total_points}점")

        if left_info or right_info:
            info_data.append([" | ".join(left_info), " | ".join(right_info)])

            info_table = Table(info_data, colWidths=["50%", "50%"])
            info_table.setStyle(
                TableStyle([
                    ("FONTNAME", (0, 0), (-1, -1), styles["info"].fontName),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("ALIGN", (0, 0), (0, -1), "LEFT"),
                    ("ALIGN", (1, 0), (1, -1), "RIGHT"),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
                ])
            )
            elements.append(info_table)

        # 이름 작성란
        name_data = [["반: ________", "번호: ________", "이름: ________________"]]
        name_table = Table(name_data, colWidths=["25%", "25%", "50%"])
        name_table.setStyle(
            TableStyle([
                ("FONTNAME", (0, 0), (-1, -1), styles["info"].fontName),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 4 * mm),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
                ("LINEABOVE", (0, 0), (-1, 0), 1, colors.grey),
            ])
        )
        elements.append(name_table)

        # 헤더 구분선
        elements.append(Spacer(1, 4 * mm))

        return elements

    def _get_problem_image_path(self, problem: Problem) -> Optional[Path]:
        """문제 이미지 경로 반환"""
        if not problem.content or not problem.content.get("imageUrl"):
            return None

        image_url = problem.content["imageUrl"]

        # API URL 형식 처리
        if image_url.startswith("/api/documents/"):
            # /api/documents/{doc_id}/problems/image?image_path=...
            try:
                import urllib.parse
                parsed = urllib.parse.urlparse(image_url)
                query = urllib.parse.parse_qs(parsed.query)
                if "image_path" in query:
                    rel_path = query["image_path"][0]
                    return self.dataset_root / rel_path
            except Exception:
                pass

        # 상대 경로 처리
        if not image_url.startswith("http"):
            return self.dataset_root / image_url.lstrip("/")

        return None

    def _build_problem(
        self,
        problem_item,
        problem: Optional[Problem],
        global_number: int,
        settings: ExamPaperSettings,
        styles: dict,
        is_answer_key: bool = False,
    ) -> List[Flowable]:
        """개별 문제 생성"""
        elements = []

        # 문제 번호 및 배점
        number_text = problem_item.customNumber or str(global_number)
        if settings.showPoints:
            header_text = f"<b>{number_text}.</b> [{problem_item.points}점]"
        else:
            header_text = f"<b>{number_text}.</b>"

        elements.append(Paragraph(header_text, styles["problem_num"]))

        if problem:
            if is_answer_key:
                # 정답지 모드
                answer = problem.answer or problem.content.get("answer", "(정답 미입력)")
                elements.append(Paragraph(f"<b>정답:</b> {answer}", styles["answer"]))

                solution = problem.solution or problem.content.get("solution")
                if solution:
                    elements.append(Spacer(1, 2 * mm))
                    elements.append(Paragraph(f"<b>해설:</b> {solution}", styles["body"]))
            else:
                # 문제지 모드 - 이미지 삽입
                image_path = self._get_problem_image_path(problem)
                if image_path and image_path.exists():
                    try:
                        img = Image(str(image_path))
                        # 이미지 크기 조정 (최대 너비)
                        max_width = 160 * mm
                        max_height = 100 * mm

                        aspect = img.imageWidth / img.imageHeight
                        if img.imageWidth > max_width:
                            img.drawWidth = max_width
                            img.drawHeight = max_width / aspect
                        if img.drawHeight > max_height:
                            img.drawHeight = max_height
                            img.drawWidth = max_height * aspect

                        elements.append(Spacer(1, 2 * mm))
                        elements.append(img)
                    except Exception as e:
                        elements.append(Paragraph(f"[이미지 로드 실패]", styles["body"]))
                else:
                    # 텍스트 콘텐츠
                    text = problem.content.get("text", "")
                    if text:
                        elements.append(Paragraph(text, styles["body"]))

                # 답안 작성란
                if settings.showAnswerSpace:
                    elements.append(Spacer(1, 3 * mm))
                    answer_lines = "_" * 40
                    for _ in range(settings.answerSpaceLines):
                        elements.append(Paragraph(answer_lines, styles["body"]))
                        elements.append(Spacer(1, 4 * mm))
        else:
            elements.append(
                Paragraph(
                    f"[문제를 찾을 수 없습니다: {problem_item.problemId}]",
                    styles["body"],
                )
            )

        elements.append(Spacer(1, 6 * mm))

        return elements

    def export_to_pdf(
        self,
        exam: ExamPaper,
        problems_map: dict[str, Problem],
        include_answer_key: bool = False,
    ) -> bytes:
        """
        시험지를 PDF로 내보내기

        Args:
            exam: 시험지 데이터
            problems_map: 문제 ID → Problem 매핑
            include_answer_key: 정답지 포함 여부

        Returns:
            PDF 파일 바이트
        """
        buffer = io.BytesIO()

        # 페이지 설정
        page_size = self._get_page_size(exam.settings)
        doc = SimpleDocTemplate(
            buffer,
            pagesize=page_size,
            leftMargin=20 * mm,
            rightMargin=20 * mm,
            topMargin=15 * mm,
            bottomMargin=15 * mm,
        )

        styles = self._create_styles(exam.settings)
        elements = []

        # 문제지 생성
        if exam.settings.showHeader:
            elements.extend(
                self._build_header(
                    exam.settings,
                    styles,
                    exam.totalPoints,
                    is_answer_key=False,
                )
            )

        # 문제 번호 카운터
        global_number = 0

        for section in exam.sections:
            # 섹션 제목
            if len(exam.sections) > 1:
                section_text = f"<b>{section.title}</b>"
                if section.description:
                    section_text += f" - {section.description}"
                elements.append(Paragraph(section_text, styles["section_title"]))

            # 문제들
            for problem_item in section.problems:
                global_number += 1
                problem = problems_map.get(problem_item.problemId)

                problem_elements = self._build_problem(
                    problem_item,
                    problem,
                    global_number,
                    exam.settings,
                    styles,
                    is_answer_key=False,
                )

                # 문제가 페이지에서 잘리지 않도록
                elements.append(KeepTogether(problem_elements))

        # 정답지 생성
        if include_answer_key and exam.settings.generateAnswerKey:
            elements.append(PageBreak())

            if exam.settings.showHeader:
                elements.extend(
                    self._build_header(
                        exam.settings,
                        styles,
                        exam.totalPoints,
                        is_answer_key=True,
                    )
                )

            global_number = 0

            for section in exam.sections:
                if len(exam.sections) > 1:
                    section_text = f"<b>{section.title}</b> (정답)"
                    elements.append(Paragraph(section_text, styles["section_title"]))

                for problem_item in section.problems:
                    global_number += 1
                    problem = problems_map.get(problem_item.problemId)

                    problem_elements = self._build_problem(
                        problem_item,
                        problem,
                        global_number,
                        exam.settings,
                        styles,
                        is_answer_key=True,
                    )
                    elements.append(KeepTogether(problem_elements))

        # PDF 생성
        doc.build(elements)

        buffer.seek(0)
        return buffer.read()
