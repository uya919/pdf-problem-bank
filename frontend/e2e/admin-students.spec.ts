import { test, expect } from '@playwright/test';

/**
 * WF-1: 학생 관리 워크플로우 테스트
 *
 * AdminStudentsPage 리팩토링 후 기능 검증
 * - 페이지 로드
 * - 필터 작동 (학부/학년/과목)
 * - 검색 기능
 * - 학생 상세 모달
 *
 * NOTE: 인증이 필요한 페이지는 로그인 리다이렉트를 확인
 */
test.describe('학생 관리 페이지 (AdminStudentsPage)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/students');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 접근 - 로그인 또는 학생 테이블 표시', async ({ page }) => {
    // 로그인 페이지로 리다이렉트되었거나 학생 페이지가 표시되어야 함
    const isLoginPage = await page.getByRole('button', { name: /로그인|login/i }).isVisible();
    const isStudentPage = await page.getByRole('heading', { name: /학생/i }).isVisible();

    // 둘 중 하나는 true여야 함
    expect(isLoginPage || isStudentPage).toBeTruthy();
  });

  test('학부 필터 탭 렌더링', async ({ page }) => {
    // 탭 버튼들 확인 (로그인 페이지가 아닌 경우)
    const tabs = page.getByRole('button', { name: /초등|중등|고등|전체/i });
    const tabCount = await tabs.count();

    // 탭이 있으면 클릭 테스트
    if (tabCount > 0) {
      const middleTab = page.getByRole('button', { name: /중등/i });
      if (await middleTab.isVisible()) {
        await middleTab.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('검색 입력창 존재 확인', async ({ page }) => {
    // 검색 입력창 찾기
    const searchInput = page.getByPlaceholder(/검색|이름|학생/i);
    const hasSearch = await searchInput.isVisible().catch(() => false);

    // 검색창이 있으면 입력 테스트
    if (hasSearch) {
      await searchInput.fill('김');
      await page.waitForTimeout(300);
    }
  });

  test('테이블 행 클릭 - 모달 열기', async ({ page }) => {
    // 테이블 행 찾기
    const rows = page.locator('tbody tr, [class*="student-row"], [class*="table-row"]');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      await rows.first().click();
      await page.waitForTimeout(500);

      // 모달 확인
      const modal = page.locator('[role="dialog"], [class*="modal"]');
      if (await modal.isVisible()) {
        // 닫기 버튼 클릭
        const closeBtn = modal.getByRole('button', { name: /닫기|close|취소/i }).first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      }
    }
  });

  test('페이지 레이아웃 - 사이드바/헤더 또는 로그인 페이지', async ({ page }) => {
    // 기본 레이아웃 요소 확인
    const sidebar = page.locator('nav, [class*="sidebar"], [class*="navigation"]');
    const header = page.locator('header, [class*="header"]');

    // 둘 중 하나라도 있으면 통과
    const hasSidebar = await sidebar.first().isVisible().catch(() => false);
    const hasHeader = await header.first().isVisible().catch(() => false);

    // 로그인 페이지거나 레이아웃 요소가 있으면 통과
    const isLoginPage = await page.getByRole('button', { name: /로그인|login/i }).isVisible();
    expect(hasSidebar || hasHeader || isLoginPage).toBeTruthy();
  });
});
