"""
메이크에듀 웹 스크래핑 스크립트
Playwright를 사용한 학생 데이터 수집

사용법:
  python scrape_makeedu.py

출력:
  STEP:N:메시지 형식으로 진행상황 출력
  마지막에 JSON 형식 학생 데이터 출력
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

# 환경변수
MAKEEDU_USERNAME = os.getenv('MAKEEDU_USERNAME', 'cyeyum')
MAKEEDU_PASSWORD = os.getenv('MAKEEDU_PASSWORD', 'cyeyum')
MAKEEDU_LOGIN_URL = "https://school.makeedu.co.kr/login.do"
MAKEEDU_STUDENT_LIST_URL = "https://school.makeedu.co.kr/member/student/list.do"


def log_step(step: int, message: str):
    """진행 단계 로깅 (worker.py에서 파싱)"""
    print(f"STEP:{step}:{message}", flush=True)


def parse_student_row(row) -> dict | None:
    """테이블 행에서 학생 데이터 추출"""
    try:
        cols = row.find_all('td')
        if len(cols) < 8:
            return None

        # 테이블 구조에 맞춰 파싱
        # 순서: 번호, 이름, 학년, 학교, 학생연락처, 학부모연락처, 입학일, 출결번호
        return {
            "name": cols[1].get_text(strip=True),
            "grade": cols[2].get_text(strip=True) or None,
            "school": cols[3].get_text(strip=True) or None,
            "student_phone": cols[4].get_text(strip=True) or None,
            "parent_phone": cols[5].get_text(strip=True) or None,
            "admission_date": cols[6].get_text(strip=True) or None,
            "attendance_no": cols[7].get_text(strip=True) or None,
        }
    except Exception as e:
        return None


def parse_student_table(html: str) -> list[dict]:
    """HTML에서 학생 테이블 파싱"""
    soup = BeautifulSoup(html, 'lxml')
    students = []

    # 테이블 찾기
    table = soup.find('table', {'class': 'table'})
    if not table:
        table = soup.find('table')

    if not table:
        return students

    tbody = table.find('tbody')
    if not tbody:
        return students

    rows = tbody.find_all('tr')
    for row in rows:
        student = parse_student_row(row)
        if student and student.get('name'):
            students.append(student)

    return students


async def scrape_makeedu() -> dict:
    """
    메이크에듀 웹사이트 스크래핑

    Returns:
        {
            "success": bool,
            "students": list[dict],
            "total": int,
            "timestamp": str,
            "error": str | None
        }
    """
    result = {
        "success": False,
        "students": [],
        "total": 0,
        "timestamp": datetime.now().isoformat(),
        "error": None,
    }

    async with async_playwright() as p:
        try:
            # 1단계: 브라우저 시작
            log_step(1, "브라우저 시작")
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            page = await context.new_page()

            # 2단계: 로그인
            log_step(2, "로그인 중...")
            await page.goto(MAKEEDU_LOGIN_URL, wait_until='networkidle', timeout=30000)

            # 로그인 폼 입력
            await page.fill('input[name="userId"]', MAKEEDU_USERNAME)
            await page.fill('input[name="userPw"]', MAKEEDU_PASSWORD)
            await page.click('button[type="submit"]')

            # 로그인 완료 대기
            await page.wait_for_load_state('networkidle', timeout=15000)

            # 로그인 실패 체크
            if 'login' in page.url.lower():
                raise Exception("로그인 실패: 아이디/비밀번호를 확인하세요")

            # 3단계: 학생 목록 페이지 이동
            log_step(3, "학생 목록 조회")
            await page.goto(MAKEEDU_STUDENT_LIST_URL, wait_until='networkidle', timeout=30000)

            # 페이지당 500개로 설정 (최대)
            try:
                await page.select_option('select[name="listSize"]', '500')
                await page.wait_for_load_state('networkidle', timeout=10000)
            except Exception:
                # select가 없으면 무시
                pass

            # 4단계: 데이터 수집
            log_step(4, "데이터 수집 중...")

            all_students = []
            page_num = 1
            max_pages = 10  # 최대 10페이지 (5000명)

            while page_num <= max_pages:
                html = await page.content()
                students = parse_student_table(html)

                if not students:
                    break

                all_students.extend(students)
                log_step(4, f"페이지 {page_num}: {len(students)}명 수집 (총 {len(all_students)}명)")

                # 다음 페이지 확인
                next_button = await page.query_selector('a.page-link[aria-label="Next"]')
                if not next_button:
                    break

                is_disabled = await next_button.get_attribute('class')
                if is_disabled and 'disabled' in is_disabled:
                    break

                # 다음 페이지로 이동
                await next_button.click()
                await page.wait_for_load_state('networkidle', timeout=10000)
                page_num += 1

            # 중복 제거 (이름 기준)
            seen_names = set()
            unique_students = []
            for student in all_students:
                if student['name'] not in seen_names:
                    seen_names.add(student['name'])
                    unique_students.append(student)

            result["students"] = unique_students
            result["total"] = len(unique_students)
            result["success"] = True

            # 5단계: 완료
            log_step(5, "완료!")

            await browser.close()

        except Exception as e:
            result["error"] = str(e)
            log_step(0, f"에러: {e}")

    return result


def main():
    """메인 실행"""
    try:
        result = asyncio.run(scrape_makeedu())

        # JSON 출력 (worker.py에서 파싱)
        print(json.dumps(result, ensure_ascii=False, indent=2))

        if not result["success"]:
            sys.exit(1)

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e),
            "students": [],
            "total": 0,
        }, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
