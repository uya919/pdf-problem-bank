"""
MakeEdu 학생 데이터 스크래핑 스크립트

이 스크립트는 MakeEdu 사이트에서 학생 데이터를 추출합니다.
"""

import asyncio
import json
import sys
import os
from datetime import datetime
from playwright.async_api import async_playwright, Page
from bs4 import BeautifulSoup

# 환경변수로 디버그 모드 제어 (기본값: False)
DEBUG_MODE = os.getenv('SCRAPE_DEBUG', 'false').lower() == 'true'

# Windows 콘솔 인코딩 설정
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# MakeEdu 로그인 정보
MAKEEDU_URL = "https://school.makeedu.co.kr"
LOGIN_URL = f"{MAKEEDU_URL}/login.do"
STUDENT_LIST_URL = f"{MAKEEDU_URL}/member/student/list.do"
USERNAME = os.getenv('MAKEEDU_USERNAME', 'cyeyum')
PASSWORD = os.getenv('MAKEEDU_PASSWORD', 'cyeyum')


async def login(page: Page) -> bool:
    """
    MakeEdu 사이트에 로그인합니다.

    Args:
        page: Playwright Page 객체

    Returns:
        로그인 성공 여부
    """
    print("STEP:1:로그인 중...", flush=True)
    await page.goto(LOGIN_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(1000)  # 1초로 단축

    # 페이지 HTML 저장 (스크린샷은 디버그 모드에서만)
    html = await page.content()

    if DEBUG_MODE:
        await page.screenshot(path="temp/screenshots/01_login_page.png")
        print("📸 로그인 페이지 스크린샷 저장됨")
        with open("temp/login_page.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("💾 로그인 페이지 HTML 저장됨")

    # BeautifulSoup으로 폼 분석
    soup = BeautifulSoup(html, 'lxml')

    # 모든 input 필드 찾기
    print("\n=== Input 필드 분석 ===")
    inputs = soup.find_all('input')
    for inp in inputs:
        print(f"  Name: {inp.get('name')}, Type: {inp.get('type')}, ID: {inp.get('id')}")

    # 로그인 폼 찾기
    try:
        # ID 기반으로 찾기 (MakeEdu는 보통 userId, userPw 사용)
        print("\n🔍 로그인 폼 요소 찾는 중...")

        # 가능한 모든 셀렉터 시도
        selectors = [
            ('input#userId, input[name="userId"]', 'input#userPw, input[name="userPw"]'),
            ('input#username, input[name="username"]', 'input#password, input[name="password"]'),
            ('input#user_id, input[name="user_id"]', 'input#user_pw, input[name="user_pw"]'),
            ('input[type="text"]', 'input[type="password"]'),
        ]

        username_input = None
        password_input = None

        for user_sel, pass_sel in selectors:
            try:
                username_input = page.locator(user_sel).first
                password_input = page.locator(pass_sel).first

                # 요소가 존재하는지 확인
                await username_input.wait_for(state="attached", timeout=2000)
                print(f"✅ 로그인 폼 발견 (셀렉터: {user_sel})")
                break
            except:
                continue

        if not username_input or not password_input:
            print("❌ 로그인 폼을 찾을 수 없습니다.")
            return False

        print(f"   아이디: {USERNAME}")
        print(f"   비밀번호: {'*' * len(PASSWORD)}")

        # 로그인 정보 입력
        await username_input.fill(USERNAME)
        await password_input.fill(PASSWORD)
        await page.wait_for_timeout(500)

        # 디버그 모드에서만 스크린샷
        if DEBUG_MODE:
            await page.screenshot(path="temp/screenshots/02_before_login.png")

        # 로그인 버튼 찾기 (여러 가능성 시도)
        print("🔑 로그인 버튼 찾는 중...")

        button_selectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("로그인")',
            'a:has-text("로그인")',
            '#btnLogin',
            '.btn-login',
        ]

        login_button = None
        for btn_sel in button_selectors:
            try:
                login_button = page.locator(btn_sel).first
                await login_button.wait_for(state="attached", timeout=1000)
                print(f"✅ 로그인 버튼 발견 (셀렉터: {btn_sel})")
                break
            except:
                continue

        if not login_button:
            # 폼 submit으로 시도
            print("⚠️  버튼을 찾을 수 없어 Enter 키로 전송 시도")
            await username_input.press("Enter")
        else:
            print("🔑 로그인 버튼 클릭 중...")
            await login_button.click()

        # 페이지 변경 대기 (타임아웃 줄임)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=10000)
        except:
            print("⚠️  페이지 로드 타임아웃 (계속 진행)")

        await page.wait_for_timeout(1000)  # 1초로 단축

        # 디버그 모드에서만 스크린샷
        if DEBUG_MODE:
            await page.screenshot(path="temp/screenshots/03_after_login.png")
            print("📸 로그인 후 스크린샷 저장됨")

        # 현재 URL 및 HTML 확인
        current_url = page.url
        print(f"현재 URL: {current_url}")

        # 로그인 성공 확인
        if "login" not in current_url.lower() or current_url != LOGIN_URL:
            print("✅ 로그인 성공!")
            return True
        else:
            # 에러 메시지 확인
            html_after = await page.content()
            soup_after = BeautifulSoup(html_after, 'lxml')
            error_elem = soup_after.find(string=lambda text: text and any(word in text for word in ['실패', '오류', '확인', '없습니다', 'fail', 'error']))
            if error_elem:
                print(f"❌ 로그인 실패 메시지: {error_elem.strip()}")
            else:
                print("❌ 로그인 실패 (여전히 로그인 페이지에 있음)")
            return False

    except Exception as e:
        print(f"❌ 로그인 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return False


def parse_student_data(html: str) -> list[dict]:
    """
    HTML에서 학생 데이터를 파싱합니다.

    Args:
        html: HTML 문자열

    Returns:
        학생 데이터 리스트
    """
    soup = BeautifulSoup(html, 'lxml')
    students = []

    # 학생 데이터가 있는 테이블 찾기 (모든 tbody 중에서 학생 데이터가 있는 것 찾기)
    all_tbody = soup.find_all('tbody')
    if DEBUG_MODE:
        print(f"📊 페이지에서 {len(all_tbody)}개의 tbody 발견")

    # 두 번째 tbody가 학생 데이터를 포함 (첫 번째는 검색 폼)
    tbody = None
    for tb in all_tbody:
        # 학생 데이터를 포함하는 tbody 찾기 (td.first가 있는지 확인)
        if tb.find('td', class_='first'):
            tbody = tb
            break

    if not tbody:
        print("⚠️  학생 데이터 테이블을 찾을 수 없습니다.")
        return students

    rows = tbody.find_all('tr')
    if DEBUG_MODE:
        print(f"📊 총 {len(rows)}행의 데이터 발견")

    for row in rows:
        try:
            cells = row.find_all('td')
            if len(cells) < 9:
                continue

            # 데이터 추출
            no = cells[0].get_text(strip=True).split('\n')[0]  # 순번 (첫 줄만)

            # 이름 (a 태그 내부 텍스트)
            name_link = cells[1].find('a', class_='d_link_')
            name = name_link.get_text(strip=True) if name_link else cells[1].get_text(strip=True)

            # 학년 (별도 컬럼)
            grade = cells[2].get_text(strip=True)
            # 디버그: 처음 5명 학년 출력
            if len(students) < 5:
                print(f"DEBUG 학년파싱: {name} → cells[2]='{grade}'")

            # 학교 (별도 컬럼)
            school = cells[3].get_text(strip=True)

            # 보호자연락처 (label 내부 텍스트)
            parent_phone_label = cells[4].find('label', class_='btnCheck')
            parent_phone = parent_phone_label.get_text(strip=True) if parent_phone_label else ""
            # (모) 제거
            parent_phone = parent_phone.replace('(모)', '').replace('(부)', '').strip()

            # 원생연락처 (label 내부 텍스트)
            student_phone_label = cells[5].find('label', class_='btnCheck')
            student_phone = student_phone_label.get_text(strip=True) if student_phone_label else ""

            # 입학일
            admission_date = cells[6].get_text(strip=True)

            # 출결번호
            attendance_no = cells[8].get_text(strip=True) if len(cells) > 8 else ""

            student_data = {
                "no": no,
                "name": name,
                "grade": grade,
                "school": school,
                "parent_phone": parent_phone,
                "student_phone": student_phone,
                "admission_date": admission_date,
                "attendance_no": attendance_no,
            }

            students.append(student_data)

        except Exception as e:
            print(f"⚠️  행 파싱 중 오류: {e}")
            continue

    return students


async def get_all_students(page: Page) -> list[dict]:
    """
    모든 학생 데이터를 한 번에 추출합니다.
    (페이지당 500개 표시 설정 사용)

    Args:
        page: Playwright Page 객체

    Returns:
        전체 학생 데이터 리스트
    """
    print("STEP:3:데이터 수집 중...", flush=True)

    # 페이지당 500개 표시 옵션 선택
    try:
        # 페이지 이동 대기
        await page.wait_for_timeout(1000)  # 1초로 단축

        # 페이지당 표시 개수 드롭다운 찾기 및 선택
        # MakeEdu는 보통 select 요소로 페이지당 개수를 설정
        select_found = False

        # 여러 가능한 셀렉터 시도
        selectors = [
            'select[name="listSize"]',
            'select#listSize',
            'select.listSize',
            'select:has(option:text("500"))',
        ]

        for selector in selectors:
            try:
                select_element = page.locator(selector).first
                await select_element.wait_for(state="attached", timeout=2000)
                await select_element.select_option("500")
                print(f"  ✅ 페이지당 500개로 설정 완료 (셀렉터: {selector})")
                select_found = True
                break
            except:
                continue

        if not select_found:
            print("  ⚠️  페이지당 표시 개수 드롭다운을 찾을 수 없습니다. 기본값으로 진행합니다.")

        # 페이지 리로드 대기
        await page.wait_for_timeout(1000)  # 1초로 단축

    except Exception as e:
        if DEBUG_MODE:
            print(f"  ⚠️  페이지당 표시 개수 설정 중 오류: {e}")
            print("     기본값으로 진행합니다.")

    # HTML 가져오기
    html = await page.content()

    # 학생 데이터 파싱
    all_students = parse_student_data(html)

    print(f"STEP:4:처리 완료 ({len(all_students)}명)", flush=True)
    return all_students


async def get_student_list(page: Page) -> dict:
    """
    학생 목록 페이지에서 데이터를 추출합니다.

    Args:
        page: Playwright Page 객체

    Returns:
        추출된 학생 데이터
    """
    print("STEP:2:학생 목록 접속 중...", flush=True)

    # 첫 페이지 로드
    await page.goto(STUDENT_LIST_URL, wait_until="domcontentloaded")
    await page.wait_for_timeout(1000)  # 1초로 단축

    # HTML 가져오기
    html = await page.content()

    # 디버그 모드에서만 스크린샷 및 HTML 저장
    if DEBUG_MODE:
        await page.screenshot(path="temp/screenshots/04_student_list.png", full_page=True)
        print("📸 학생 목록 페이지 스크린샷 저장됨 (전체 페이지)")
        with open("temp/student_list_page.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("💾 HTML 파일 저장됨: student_list_page.html")

    # 전체 학생 데이터 수집 (모든 페이지)
    all_students = await get_all_students(page)

    # 결과 출력
    if len(all_students) > 0:
        print("\n=== 첫 3명의 학생 데이터 샘플 ===")
        for student in all_students[:3]:
            print(json.dumps(student, indent=2, ensure_ascii=False))

        print("\n=== 마지막 3명의 학생 데이터 샘플 ===")
        for student in all_students[-3:]:
            print(json.dumps(student, indent=2, ensure_ascii=False))

    # 데이터 구조 반환
    return {
        "timestamp": datetime.now().isoformat(),
        "source_url": STUDENT_LIST_URL,
        "total_students": len(all_students),
        "students": all_students,
    }


async def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("MakeEdu 학생 데이터 스크래핑 시작")
    print("=" * 60)

    # 스크린샷 디렉토리 생성
    import os
    os.makedirs("temp/screenshots", exist_ok=True)

    async with async_playwright() as p:
        # 브라우저 실행 (headless 모드 - 백그라운드 실행)
        browser = await p.chromium.launch(
            headless=True,  # 브라우저 창 안 보이게 (속도 향상)
        )

        # 새 페이지 생성
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        )
        page = await context.new_page()

        try:
            # 1단계: 로그인
            login_success = await login(page)

            if not login_success:
                print("\n❌ 로그인에 실패했습니다. 종료합니다.")
                return

            # 2단계: 학생 목록 가져오기
            result = await get_student_list(page)

            # 결과 출력
            print("STEP:5:완료!", flush=True)
            print(json.dumps(result, indent=2, ensure_ascii=False))

            # 결과 JSON 저장 (디버그 모드에서만)
            if DEBUG_MODE:
                with open("temp/scraping_result.json", "w", encoding="utf-8") as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                print("\n💾 결과 저장됨: scraping_result.json")

        except Exception as e:
            print(f"\n❌ 오류 발생: {e}")
            import traceback
            traceback.print_exc()

        finally:
            await browser.close()
            print("\n👋 브라우저 종료")


if __name__ == "__main__":
    asyncio.run(main())
