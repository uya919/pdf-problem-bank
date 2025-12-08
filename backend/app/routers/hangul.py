"""
Phase 16: 한글 파일 (HWPX/HML) 파싱 API
Phase 18-B: 휴지통(Soft Delete) 시스템
Phase 21: 이미지 지원

엔드포인트:
- POST /api/hangul/parse: 파일 업로드 및 파싱
- POST /api/hangul/save: 파싱 결과 저장
- GET /api/hangul/trash: 휴지통 목록 조회
- POST /api/hangul/trash/restore: 휴지통에서 복원
- DELETE /api/hangul/trash/empty: 휴지통 비우기 (영구 삭제)
- POST /api/hangul/problems/move-to-trash: 휴지통으로 이동 (Soft Delete)
- GET /api/hangul/images/{image_id}: 이미지 조회 (Phase 21)
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, Response
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import tempfile
import shutil
import os
import json
import uuid
import base64
from datetime import datetime

from app.config import config
from app.services.hangul import HMLParser, HWPXParser, ParseResult
from app.services.file_lock import file_lock, atomic_json_write, safe_json_read


router = APIRouter()


# === Pydantic 모델 ===

class ProblemMetadata(BaseModel):
    """문제 메타데이터"""
    subject: str = ""              # 과목
    grade: str = ""                # 학년
    chapter: str = ""              # 단원
    source: str = ""               # 출처
    difficulty: int = 3            # 난이도 (1-5)
    tags: List[str] = []           # 태그


class SaveRequest(BaseModel):
    """저장 요청"""
    problems: List[Dict[str, Any]]  # 문제 데이터
    metadata: ProblemMetadata       # 메타데이터


class SaveResponse(BaseModel):
    """저장 응답"""
    success: bool
    saved_count: int
    problem_ids: List[str]
    message: str


class MoveToTrashRequest(BaseModel):
    """Phase 18-B: 휴지통 이동 요청"""
    problem_ids: List[str]


class MoveToTrashResponse(BaseModel):
    """Phase 18-B: 휴지통 이동 응답"""
    success: bool
    moved_count: int
    moved_ids: List[str]
    failed_ids: List[str]
    message: str


class RestoreRequest(BaseModel):
    """Phase 18-B: 복원 요청"""
    problem_ids: List[str]


class RestoreResponse(BaseModel):
    """Phase 18-B: 복원 응답"""
    success: bool
    restored_count: int
    restored_ids: List[str]
    failed_ids: List[str]
    message: str


class TrashItem(BaseModel):
    """Phase 18-B: 휴지통 항목"""
    id: str
    number: str
    subject: str
    grade: str
    chapter: str
    has_answer: bool
    has_explanation: bool
    deleted_at: str
    days_in_trash: int


class TrashListResponse(BaseModel):
    """Phase 18-B: 휴지통 목록 응답"""
    items: List[TrashItem]
    total: int


class EmptyTrashRequest(BaseModel):
    """Phase 18-B: 휴지통 비우기 요청"""
    confirm: str  # "EMPTY_TRASH" 필요


class EmptyTrashResponse(BaseModel):
    """Phase 18-B: 휴지통 비우기 응답"""
    success: bool
    deleted_count: int
    message: str


# === API 엔드포인트 ===

@router.post("/parse")
async def parse_hangul_file(file: UploadFile = File(...)):
    """
    한글 파일 (HWPX/HML) 파싱

    - HWPX: ZIP + XML 형식
    - HML: 순수 XML 형식

    Phase 21: 이미지 자동 추출 및 저장

    Returns:
        파싱된 문제, 정답, 해설 목록
    """
    # 파일 확장자 확인
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 없습니다.")

    file_ext = Path(file.filename).suffix.lower()

    if file_ext not in ['.hwpx', '.hml']:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다: {file_ext}. HWPX 또는 HML 파일만 지원합니다."
        )

    # 임시 파일로 저장
    temp_dir = tempfile.mkdtemp(prefix='hangul_upload_')
    temp_file_path = Path(temp_dir) / file.filename

    try:
        # 파일 저장
        with open(temp_file_path, 'wb') as f:
            content = await file.read()
            f.write(content)

        # 파서 선택 및 파싱
        # Phase 20-C: HMLParser는 latex_converter 의존성 주입 지원
        # 기본값 None → 싱글톤 hwp_to_latex 사용
        # 테스트 시 Mock 컨버터 주입 가능
        if file_ext == '.hml':
            parser = HMLParser(str(temp_file_path))  # latex_converter=None (기본)
        else:  # .hwpx
            parser = HWPXParser(str(temp_file_path))

        result: ParseResult = parser.parse()

        # Phase 21: 이미지 저장 - Debug
        print(f"[Phase 21 Debug] metadata keys: {list(result.detected_metadata.keys())}")
        images_data = result.detected_metadata.get('images', {})
        print(f"[Phase 21 Debug] images_data type: {type(images_data)}, keys: {list(images_data.keys()) if images_data else 'empty'}")
        if images_data:
            # 임시 이미지 디렉토리 생성
            temp_images_dir = config.DATASET_ROOT / 'temp_images'
            temp_images_dir.mkdir(parents=True, exist_ok=True)

            # 세션 ID 생성 (이미지 그룹화용)
            session_id = str(uuid.uuid4())[:8]

            # 이미지 저장 및 URL 매핑
            image_urls = {}
            for bin_id, img_info in images_data.items():
                img_data = img_info.get('data', b'')
                img_format = img_info.get('format', 'bin')

                # 이미지 파일명 생성
                img_filename = f"{session_id}_{bin_id}.{img_format}"
                img_path = temp_images_dir / img_filename

                # 이미지 저장
                img_path.write_bytes(img_data)

                # URL 매핑
                image_urls[bin_id] = f"/api/hangul/images/{img_filename}"

            # 결과에 이미지 URL 정보 추가
            result.detected_metadata['image_urls'] = image_urls
            result.detected_metadata['session_id'] = session_id

            # 바이너리 데이터는 응답에서 제외
            del result.detected_metadata['images']

        # 결과 반환
        return JSONResponse(content=result.to_dict())

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"파싱 오류: {str(e)}")

    finally:
        # 임시 파일 정리
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


@router.post("/save", response_model=SaveResponse)
async def save_parsed_problems(request: SaveRequest):
    """
    Phase 18-A: 파싱된 문제들을 문제은행에 저장 (안정성 개선)

    - 파일 잠금으로 동시 쓰기 방지
    - 원자적 저장으로 부분 실패 방지
    - 실패 시 롤백

    Args:
        request: 문제 데이터 및 메타데이터

    Returns:
        저장 결과
    """
    problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
    problems_dir = problem_bank_dir / 'problems'
    answers_dir = problem_bank_dir / 'answers'
    explanations_dir = problem_bank_dir / 'explanations'
    index_path = problem_bank_dir / 'index.json'

    # 디렉토리 생성
    for dir_path in [problems_dir, answers_dir, explanations_dir]:
        dir_path.mkdir(parents=True, exist_ok=True)

    saved_ids = []
    created_files = []  # 롤백용 추적

    try:
        # 파일 잠금 획득
        with file_lock(index_path):
            # 인덱스 로드
            index_data = safe_json_read(index_path, {
                'problems': [],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            })

            metadata = request.metadata.model_dump()

            for problem_data in request.problems:
                problem_id = problem_data.get('id') or str(uuid.uuid4())

                # 문제 레코드 생성
                problem_record = {
                    'id': problem_id,
                    'number': problem_data.get('number', ''),
                    'content_text': problem_data.get('content_text', ''),
                    'content_images': problem_data.get('content_images', []),
                    'content_equations': problem_data.get('content_equations', []),
                    'metadata': {
                        'subject': metadata.get('subject', ''),
                        'grade': metadata.get('grade', ''),
                        'chapter': metadata.get('chapter', ''),
                        'source': metadata.get('source', ''),
                        'difficulty': metadata.get('difficulty', 3),
                        'tags': metadata.get('tags', []),
                        'points': problem_data.get('points'),
                    },
                    'created_at': datetime.now().isoformat(),
                }

                # 정답 저장 (원자적)
                answer_id = None
                if problem_data.get('answer'):
                    answer_id = str(uuid.uuid4())
                    answer_record = {
                        'id': answer_id,
                        'problem_id': problem_id,
                        'answer': problem_data.get('answer'),
                        'answer_type': problem_data.get('answer_type', 'unknown'),
                        'created_at': datetime.now().isoformat(),
                    }
                    answer_path = answers_dir / f'{answer_id}.json'
                    atomic_json_write(answer_path, answer_record)
                    created_files.append(answer_path)
                    problem_record['answer_id'] = answer_id

                # 해설 저장 (원자적)
                explanation_id = None
                if problem_data.get('explanation'):
                    explanation_id = str(uuid.uuid4())
                    explanation_record = {
                        'id': explanation_id,
                        'problem_id': problem_id,
                        'content': problem_data.get('explanation'),
                        'created_at': datetime.now().isoformat(),
                    }
                    explanation_path = explanations_dir / f'{explanation_id}.json'
                    atomic_json_write(explanation_path, explanation_record)
                    created_files.append(explanation_path)
                    problem_record['explanation_id'] = explanation_id

                # 문제 파일 저장 (원자적)
                problem_path = problems_dir / f'{problem_id}.json'
                atomic_json_write(problem_path, problem_record)
                created_files.append(problem_path)

                # 인덱스에 추가
                index_data['problems'].append({
                    'id': problem_id,
                    'number': problem_record['number'],
                    'subject': metadata.get('subject', ''),
                    'grade': metadata.get('grade', ''),
                    'chapter': metadata.get('chapter', ''),
                    'has_answer': answer_id is not None,
                    'has_explanation': explanation_id is not None,
                })

                saved_ids.append(problem_id)

            # 인덱스 업데이트 (원자적)
            index_data['updated_at'] = datetime.now().isoformat()
            atomic_json_write(index_path, index_data)

        return SaveResponse(
            success=True,
            saved_count=len(saved_ids),
            problem_ids=saved_ids,
            message=f"{len(saved_ids)}개 문제가 저장되었습니다."
        )

    except Exception as e:
        # 롤백: 생성된 파일 삭제
        for file_path in created_files:
            try:
                if file_path.exists():
                    file_path.unlink()
            except Exception:
                pass  # 롤백 실패는 무시

        raise HTTPException(status_code=500, detail=f"저장 오류: {str(e)}")


@router.get("/problems")
async def get_problems(
    subject: Optional[str] = None,
    grade: Optional[str] = None,
    chapter: Optional[str] = None,
    source: Optional[str] = None,
    difficulty: Optional[int] = None,
    has_answer: Optional[bool] = None,
    has_explanation: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Phase 17: 통합 문제은행에서 문제 목록 조회

    Args:
        subject: 과목 필터
        grade: 학년 필터
        chapter: 단원 필터
        source: 출처 필터
        difficulty: 난이도 필터 (1-5)
        has_answer: 정답 유무 필터
        has_explanation: 해설 유무 필터
        search: 텍스트 검색 (문제 내용, 번호)
        limit: 결과 수 제한
        offset: 시작 위치

    Returns:
        문제 목록
    """
    try:
        problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
        index_path = problem_bank_dir / 'index.json'

        if not index_path.exists():
            return {
                'problems': [],
                'total': 0,
                'limit': limit,
                'offset': offset
            }

        with open(index_path, 'r', encoding='utf-8') as f:
            index_data = json.load(f)

        problems = index_data.get('problems', [])

        # 기본 필터링 (인덱스 기반)
        if subject:
            problems = [p for p in problems if p.get('subject') == subject]
        if grade:
            problems = [p for p in problems if p.get('grade') == grade]
        if chapter:
            problems = [p for p in problems if p.get('chapter') == chapter]
        if has_answer is not None:
            problems = [p for p in problems if p.get('has_answer') == has_answer]
        if has_explanation is not None:
            problems = [p for p in problems if p.get('has_explanation') == has_explanation]

        # 상세 정보 로드 (추가 필터링 및 검색을 위해)
        problems_dir = problem_bank_dir / 'problems'
        detailed_problems = []

        for p in problems:
            problem_path = problems_dir / f"{p['id']}.json"
            if problem_path.exists():
                with open(problem_path, 'r', encoding='utf-8') as f:
                    problem_data = json.load(f)
                    detailed_problems.append(problem_data)
            else:
                detailed_problems.append(p)

        # 상세 필터링 (JSON 파일 기반)
        if source:
            detailed_problems = [
                p for p in detailed_problems
                if p.get('metadata', {}).get('source') == source
            ]
        if difficulty is not None:
            detailed_problems = [
                p for p in detailed_problems
                if p.get('metadata', {}).get('difficulty') == difficulty
            ]

        # 텍스트 검색
        if search:
            search_lower = search.lower()
            filtered = []
            for p in detailed_problems:
                # 문제 번호 검색
                if search_lower in str(p.get('number', '')).lower():
                    filtered.append(p)
                    continue
                # 문제 내용 검색
                if search_lower in p.get('content_text', '').lower():
                    filtered.append(p)
                    continue
                # 태그 검색
                tags = p.get('metadata', {}).get('tags', [])
                if any(search_lower in tag.lower() for tag in tags):
                    filtered.append(p)
            detailed_problems = filtered

        total = len(detailed_problems)

        # 페이징
        paginated_problems = detailed_problems[offset:offset + limit]

        return {
            'problems': paginated_problems,
            'total': total,
            'limit': limit,
            'offset': offset
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"조회 오류: {str(e)}")


@router.get("/problems/{problem_id}")
async def get_problem(problem_id: str):
    """
    특정 문제 상세 조회

    Args:
        problem_id: 문제 ID

    Returns:
        문제 상세 정보 (정답, 해설 포함)
    """
    try:
        problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
        problem_path = problem_bank_dir / 'problems' / f'{problem_id}.json'

        if not problem_path.exists():
            raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")

        with open(problem_path, 'r', encoding='utf-8') as f:
            problem = json.load(f)

        # 정답 로드
        if problem.get('answer_id'):
            answer_path = problem_bank_dir / 'answers' / f"{problem['answer_id']}.json"
            if answer_path.exists():
                with open(answer_path, 'r', encoding='utf-8') as f:
                    problem['answer_data'] = json.load(f)

        # 해설 로드
        if problem.get('explanation_id'):
            explanation_path = problem_bank_dir / 'explanations' / f"{problem['explanation_id']}.json"
            if explanation_path.exists():
                with open(explanation_path, 'r', encoding='utf-8') as f:
                    problem['explanation_data'] = json.load(f)

        return problem

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"조회 오류: {str(e)}")


@router.get("/stats")
async def get_problem_bank_stats():
    """
    Phase 17: 문제은행 통계 및 필터 옵션 조회

    필터 UI에서 사용할 수 있는 옵션들을 반환합니다.

    Returns:
        - total_problems: 전체 문제 수
        - with_answer: 정답 있는 문제 수
        - with_explanation: 해설 있는 문제 수
        - subjects: 고유 과목 목록
        - grades: 고유 학년 목록
        - chapters: 고유 단원 목록
        - sources: 고유 출처 목록
        - difficulties: 난이도별 문제 수
    """
    try:
        problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
        index_path = problem_bank_dir / 'index.json'

        if not index_path.exists():
            return {
                'total_problems': 0,
                'with_answer': 0,
                'with_explanation': 0,
                'subjects': [],
                'grades': [],
                'chapters': [],
                'sources': [],
                'difficulties': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            }

        with open(index_path, 'r', encoding='utf-8') as f:
            index_data = json.load(f)

        problems = index_data.get('problems', [])
        problems_dir = problem_bank_dir / 'problems'

        # 기본 통계
        total = len(problems)
        with_answer = sum(1 for p in problems if p.get('has_answer'))
        with_explanation = sum(1 for p in problems if p.get('has_explanation'))

        # 고유 값 수집
        subjects = set()
        grades = set()
        chapters = set()
        sources = set()
        difficulties = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

        for p in problems:
            if p.get('subject'):
                subjects.add(p['subject'])
            if p.get('grade'):
                grades.add(p['grade'])
            if p.get('chapter'):
                chapters.add(p['chapter'])

        # 상세 정보에서 source와 difficulty 수집
        for p in problems:
            problem_path = problems_dir / f"{p['id']}.json"
            if problem_path.exists():
                with open(problem_path, 'r', encoding='utf-8') as f:
                    problem_data = json.load(f)
                    metadata = problem_data.get('metadata', {})
                    if metadata.get('source'):
                        sources.add(metadata['source'])
                    diff = metadata.get('difficulty', 3)
                    if diff in difficulties:
                        difficulties[diff] += 1

        return {
            'total_problems': total,
            'with_answer': with_answer,
            'with_explanation': with_explanation,
            'subjects': sorted(list(subjects)),
            'grades': sorted(list(grades)),
            'chapters': sorted(list(chapters)),
            'sources': sorted(list(sources)),
            'difficulties': difficulties
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"통계 조회 오류: {str(e)}")


# === Phase 18-B: 휴지통(Trash) 시스템 ===

def _calculate_days_in_trash(deleted_at: str) -> int:
    """휴지통에 있는 일수 계산"""
    try:
        deleted_time = datetime.fromisoformat(deleted_at)
        now = datetime.now()
        delta = now - deleted_time
        return delta.days
    except Exception:
        return 0


def _ensure_trash_in_index(index_data: dict) -> dict:
    """인덱스에 trash 배열이 없으면 추가"""
    if 'trash' not in index_data:
        index_data['trash'] = []
    return index_data


@router.get("/trash", response_model=TrashListResponse)
async def get_trash():
    """
    Phase 18-B: 휴지통 목록 조회

    Returns:
        휴지통에 있는 문제 목록
    """
    try:
        problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
        index_path = problem_bank_dir / 'index.json'

        if not index_path.exists():
            return TrashListResponse(items=[], total=0)

        index_data = safe_json_read(index_path, {'problems': [], 'trash': []})
        index_data = _ensure_trash_in_index(index_data)

        trash_items = []
        for item in index_data.get('trash', []):
            trash_items.append(TrashItem(
                id=item.get('id', ''),
                number=item.get('number', ''),
                subject=item.get('subject', ''),
                grade=item.get('grade', ''),
                chapter=item.get('chapter', ''),
                has_answer=item.get('has_answer', False),
                has_explanation=item.get('has_explanation', False),
                deleted_at=item.get('deleted_at', ''),
                days_in_trash=_calculate_days_in_trash(item.get('deleted_at', ''))
            ))

        return TrashListResponse(items=trash_items, total=len(trash_items))

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"휴지통 조회 오류: {str(e)}")


@router.post("/problems/move-to-trash", response_model=MoveToTrashResponse)
async def move_to_trash(request: MoveToTrashRequest):
    """
    Phase 18-B: 문제를 휴지통으로 이동 (Soft Delete)

    - 최대 100개까지 한 번에 이동 가능
    - 실제 파일은 삭제하지 않고 인덱스만 변경

    Args:
        request: 이동할 문제 ID 목록

    Returns:
        이동 결과
    """
    if len(request.problem_ids) > 100:
        raise HTTPException(
            status_code=400,
            detail="한 번에 최대 100개까지만 이동할 수 있습니다."
        )

    if not request.problem_ids:
        raise HTTPException(
            status_code=400,
            detail="이동할 문제를 선택해주세요."
        )

    problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
    index_path = problem_bank_dir / 'index.json'

    moved_ids = []
    failed_ids = []

    try:
        with file_lock(index_path):
            index_data = safe_json_read(index_path, {'problems': [], 'trash': []})
            index_data = _ensure_trash_in_index(index_data)

            # ID로 문제 찾기
            problems_by_id = {p['id']: p for p in index_data.get('problems', [])}

            for problem_id in request.problem_ids:
                if problem_id in problems_by_id:
                    # 문제를 휴지통으로 이동
                    problem = problems_by_id[problem_id]
                    problem['deleted_at'] = datetime.now().isoformat()
                    index_data['trash'].append(problem)
                    moved_ids.append(problem_id)
                else:
                    failed_ids.append(problem_id)

            # problems에서 이동된 항목 제거
            index_data['problems'] = [
                p for p in index_data['problems']
                if p.get('id') not in moved_ids
            ]
            index_data['updated_at'] = datetime.now().isoformat()
            atomic_json_write(index_path, index_data)

        message = f"{len(moved_ids)}개 문제가 휴지통으로 이동되었습니다."
        if failed_ids:
            message += f" ({len(failed_ids)}개 실패)"

        return MoveToTrashResponse(
            success=len(moved_ids) > 0,
            moved_count=len(moved_ids),
            moved_ids=moved_ids,
            failed_ids=failed_ids,
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"휴지통 이동 오류: {str(e)}")


@router.post("/trash/restore", response_model=RestoreResponse)
async def restore_from_trash(request: RestoreRequest):
    """
    Phase 18-B: 휴지통에서 문제 복원

    Args:
        request: 복원할 문제 ID 목록

    Returns:
        복원 결과
    """
    if not request.problem_ids:
        raise HTTPException(
            status_code=400,
            detail="복원할 문제를 선택해주세요."
        )

    problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
    index_path = problem_bank_dir / 'index.json'

    restored_ids = []
    failed_ids = []

    try:
        with file_lock(index_path):
            index_data = safe_json_read(index_path, {'problems': [], 'trash': []})
            index_data = _ensure_trash_in_index(index_data)

            # ID로 휴지통 항목 찾기
            trash_by_id = {p['id']: p for p in index_data.get('trash', [])}

            for problem_id in request.problem_ids:
                if problem_id in trash_by_id:
                    # 휴지통에서 복원
                    problem = trash_by_id[problem_id]
                    # deleted_at 필드 제거
                    problem.pop('deleted_at', None)
                    index_data['problems'].append(problem)
                    restored_ids.append(problem_id)
                else:
                    failed_ids.append(problem_id)

            # trash에서 복원된 항목 제거
            index_data['trash'] = [
                p for p in index_data['trash']
                if p.get('id') not in restored_ids
            ]
            index_data['updated_at'] = datetime.now().isoformat()
            atomic_json_write(index_path, index_data)

        message = f"{len(restored_ids)}개 문제가 복원되었습니다."
        if failed_ids:
            message += f" ({len(failed_ids)}개 실패)"

        return RestoreResponse(
            success=len(restored_ids) > 0,
            restored_count=len(restored_ids),
            restored_ids=restored_ids,
            failed_ids=failed_ids,
            message=message
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"복원 오류: {str(e)}")


@router.delete("/trash/empty", response_model=EmptyTrashResponse)
async def empty_trash(confirm: str = None):
    """
    Phase 18-B: 휴지통 비우기 (영구 삭제)

    confirm 파라미터에 "EMPTY_TRASH"를 전달해야 함

    Args:
        confirm: 삭제 확인 문자열 ("EMPTY_TRASH")

    Returns:
        삭제 결과
    """
    if confirm != "EMPTY_TRASH":
        raise HTTPException(
            status_code=400,
            detail="휴지통을 비우려면 confirm=EMPTY_TRASH 파라미터가 필요합니다."
        )

    problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
    problems_dir = problem_bank_dir / 'problems'
    answers_dir = problem_bank_dir / 'answers'
    explanations_dir = problem_bank_dir / 'explanations'
    index_path = problem_bank_dir / 'index.json'

    deleted_count = 0

    try:
        with file_lock(index_path):
            index_data = safe_json_read(index_path, {'problems': [], 'trash': []})
            index_data = _ensure_trash_in_index(index_data)

            # 휴지통의 각 항목에 대해 실제 파일 삭제
            for item in index_data.get('trash', []):
                problem_id = item.get('id')
                if not problem_id:
                    continue

                # 문제 파일 삭제
                problem_path = problems_dir / f'{problem_id}.json'
                if problem_path.exists():
                    # 문제 데이터 로드 (연관 ID 확인용)
                    problem_data = safe_json_read(problem_path, {})

                    # 정답 파일 삭제
                    if problem_data.get('answer_id'):
                        answer_path = answers_dir / f"{problem_data['answer_id']}.json"
                        if answer_path.exists():
                            answer_path.unlink()

                    # 해설 파일 삭제
                    if problem_data.get('explanation_id'):
                        explanation_path = explanations_dir / f"{problem_data['explanation_id']}.json"
                        if explanation_path.exists():
                            explanation_path.unlink()

                    # 문제 파일 삭제
                    problem_path.unlink()
                    deleted_count += 1

            # 휴지통 비우기
            index_data['trash'] = []
            index_data['updated_at'] = datetime.now().isoformat()
            atomic_json_write(index_path, index_data)

        return EmptyTrashResponse(
            success=True,
            deleted_count=deleted_count,
            message=f"휴지통이 비워졌습니다. ({deleted_count}개 영구 삭제)"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"휴지통 비우기 오류: {str(e)}")


@router.delete("/trash/{problem_id}")
async def delete_from_trash(problem_id: str):
    """
    Phase 18-B: 휴지통에서 단일 항목 영구 삭제

    Args:
        problem_id: 삭제할 문제 ID

    Returns:
        삭제 결과
    """
    problem_bank_dir = config.DATASET_ROOT / 'problem_bank'
    problems_dir = problem_bank_dir / 'problems'
    answers_dir = problem_bank_dir / 'answers'
    explanations_dir = problem_bank_dir / 'explanations'
    index_path = problem_bank_dir / 'index.json'

    try:
        with file_lock(index_path):
            index_data = safe_json_read(index_path, {'problems': [], 'trash': []})
            index_data = _ensure_trash_in_index(index_data)

            # 휴지통에서 해당 항목 찾기
            trash_item = None
            for item in index_data.get('trash', []):
                if item.get('id') == problem_id:
                    trash_item = item
                    break

            if not trash_item:
                raise HTTPException(status_code=404, detail="휴지통에서 문제를 찾을 수 없습니다.")

            # 실제 파일 삭제
            problem_path = problems_dir / f'{problem_id}.json'
            if problem_path.exists():
                problem_data = safe_json_read(problem_path, {})

                # 정답 파일 삭제
                if problem_data.get('answer_id'):
                    answer_path = answers_dir / f"{problem_data['answer_id']}.json"
                    if answer_path.exists():
                        answer_path.unlink()

                # 해설 파일 삭제
                if problem_data.get('explanation_id'):
                    explanation_path = explanations_dir / f"{problem_data['explanation_id']}.json"
                    if explanation_path.exists():
                        explanation_path.unlink()

                # 문제 파일 삭제
                problem_path.unlink()

            # 휴지통에서 제거
            index_data['trash'] = [
                p for p in index_data['trash']
                if p.get('id') != problem_id
            ]
            index_data['updated_at'] = datetime.now().isoformat()
            atomic_json_write(index_path, index_data)

        return {
            "success": True,
            "deleted_id": problem_id,
            "message": "문제가 영구 삭제되었습니다."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"삭제 오류: {str(e)}")


# === Phase 21: 이미지 API ===

# MIME 타입 매핑
IMAGE_MIME_TYPES = {
    'bmp': 'image/bmp',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'tiff': 'image/tiff',
    'bin': 'application/octet-stream',
}


@router.get("/images/{image_filename}")
async def get_image(image_filename: str):
    """
    Phase 21: 이미지 조회 API

    임시 저장된 이미지 또는 문제은행에 저장된 이미지를 반환합니다.

    Args:
        image_filename: 이미지 파일명 (예: "a1b2c3d4_1.bmp")

    Returns:
        이미지 바이너리 데이터
    """
    # 경로 탐색 공격 방지
    if '..' in image_filename or '/' in image_filename or '\\' in image_filename:
        raise HTTPException(status_code=400, detail="잘못된 파일명입니다.")

    # 1. 임시 이미지 디렉토리에서 찾기
    temp_images_dir = config.DATASET_ROOT / 'temp_images'
    image_path = temp_images_dir / image_filename

    # 2. 문제은행 이미지 디렉토리에서 찾기
    if not image_path.exists():
        problem_bank_images_dir = config.DATASET_ROOT / 'problem_bank' / 'images'
        image_path = problem_bank_images_dir / image_filename

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="이미지를 찾을 수 없습니다.")

    # 파일 확장자에서 MIME 타입 결정
    ext = image_path.suffix.lower().lstrip('.')
    content_type = IMAGE_MIME_TYPES.get(ext, 'application/octet-stream')

    # 이미지 데이터 읽기 및 반환
    try:
        image_data = image_path.read_bytes()
        return Response(
            content=image_data,
            media_type=content_type,
            headers={
                'Cache-Control': 'public, max-age=3600',  # 1시간 캐시
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"이미지 읽기 오류: {str(e)}")
