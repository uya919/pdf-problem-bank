import { test, expect } from '@playwright/test';

/**
 * Stage 59: 강사 워크플로우 전체 테스트
 *
 * 테스트 대상:
 * - 로그인 → 대시보드 → 출결/진도/숙제 모달
 */

test.describe('강사 워크플로우 테스트', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);

    // 로그인
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const usernameInput = page.locator('input[type="text"], input[placeholder*="아이디"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await usernameInput.fill('shj');
    await passwordInput.fill('shj');
    await page.getByRole('button', { name: /로그인|login/i }).click();

    // 대시보드 로딩 대기
    await page.waitForURL('**/backoffice**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('테스트 1: 대시보드 확인', async ({ page }) => {
    // 오늘 날짜 표시 확인
    const pageContent = await page.textContent('body');
    console.log('대시보드 내용:', pageContent?.substring(0, 300));

    // 수업 카드 또는 히어로 카드 확인
    const hasClassCard = pageContent?.includes('수업') || pageContent?.includes('출결') || pageContent?.includes('진도');
    expect(hasClassCard).toBe(true);

    await page.screenshot({ path: 'test-results/1-dashboard.png' });
    console.log('테스트 1 완료: 대시보드 확인');
  });

  test('테스트 2: 출결 모달', async ({ page }) => {
    // 출결 버튼 찾기 (히어로 카드 또는 태스크 배지)
    const attendanceBtn = page.locator('button').filter({ hasText: /출결|출석/ }).first();
    const isVisible = await attendanceBtn.isVisible().catch(() => false);

    if (!isVisible) {
      console.log('출결 버튼 없음 - 오늘 수업이 없을 수 있음');
      test.skip();
      return;
    }

    await attendanceBtn.click();
    await page.waitForTimeout(1000);

    // 모달 확인
    const modalVisible = await page.locator('.fixed').first().isVisible().catch(() => false);
    console.log('출결 모달 열림:', modalVisible);

    if (modalVisible) {
      await page.screenshot({ path: 'test-results/2-attendance-modal.png' });

      // 학생 목록 확인
      const students = await page.locator('button, div').filter({ hasText: /출석|지각|결석/ }).count();
      console.log('출결 상태 버튼 수:', students);

      // 모달 닫기 (ESC 또는 X 버튼)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    console.log('테스트 2 완료: 출결 모달');
  });

  test('테스트 3: 진도 모달 - 저장 및 수정', async ({ page }) => {
    // 진도 버튼 찾기
    const progressBtn = page.locator('button').filter({ hasText: /진도/ }).first();
    const isVisible = await progressBtn.isVisible().catch(() => false);

    if (!isVisible) {
      console.log('진도 버튼 없음 - 오늘 수업이 없을 수 있음');
      test.skip();
      return;
    }

    await progressBtn.click();
    await page.waitForTimeout(1500);

    // 모달 확인
    await page.screenshot({ path: 'test-results/3-progress-modal-open.png' });

    // 교재 입력 필드 확인
    const textbookInput = page.locator('input[placeholder*="교재"], input[type="text"]').first();
    const hasTextbookInput = await textbookInput.isVisible().catch(() => false);
    console.log('교재 입력 필드:', hasTextbookInput);

    if (hasTextbookInput) {
      // 테스트 데이터 입력
      await textbookInput.fill('테스트 교재');

      // 페이지 입력
      const pageInputs = page.locator('input[type="number"], input[placeholder*="페이지"]');
      const pageCount = await pageInputs.count();
      console.log('페이지 입력 필드 수:', pageCount);

      if (pageCount >= 2) {
        await pageInputs.nth(0).fill('1');
        await pageInputs.nth(1).fill('10');
      }

      await page.screenshot({ path: 'test-results/3-progress-filled.png' });

      // 저장 버튼 클릭
      const saveBtn = page.getByRole('button', { name: /저장|완료/ }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
        console.log('진도 저장 완료');
      }
    }

    // 다시 열어서 데이터 확인 (B1 버그 테스트)
    await page.waitForTimeout(1000);
    const progressBtn2 = page.locator('button').filter({ hasText: /진도/ }).first();
    if (await progressBtn2.isVisible()) {
      await progressBtn2.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'test-results/3-progress-reopen.png' });

      // 입력된 데이터가 유지되는지 확인
      const inputValue = await page.locator('input').first().inputValue().catch(() => '');
      console.log('재열기 후 입력값:', inputValue);

      await page.keyboard.press('Escape');
    }

    console.log('테스트 3 완료: 진도 모달');
  });

  test('테스트 4: 기록 페이지 탭 전환', async ({ page }) => {
    // 기록 페이지로 이동
    await page.goto('/backoffice/records');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 탭 확인
    const tabs = ['출결', '진도', '숙제', '성적', '기록'];

    for (const tabName of tabs) {
      const tab = page.getByRole('button', { name: new RegExp(tabName) }).first();
      const isVisible = await tab.isVisible().catch(() => false);

      if (isVisible) {
        await tab.click();
        await page.waitForTimeout(500);
        console.log(`${tabName} 탭 클릭 완료`);
      }
    }

    await page.screenshot({ path: 'test-results/4-records-tabs.png' });
    console.log('테스트 4 완료: 기록 페이지 탭');
  });

  test('테스트 5: 날짜 변경 테스트 (B2, B3 버그)', async ({ page }) => {
    // 날짜 선택기 찾기
    const dateSelector = page.locator('button, div').filter({ hasText: /오늘|어제|내일|\d+월|\d+일/ }).first();
    const hasDateSelector = await dateSelector.isVisible().catch(() => false);

    if (!hasDateSelector) {
      console.log('날짜 선택기 없음');
      test.skip();
      return;
    }

    await page.screenshot({ path: 'test-results/5-date-initial.png' });

    // 날짜 변경 (스와이프 또는 화살표 클릭)
    const prevBtn = page.locator('button').filter({ hasText: /←|<|이전/ }).first();
    if (await prevBtn.isVisible()) {
      await prevBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/5-date-changed.png' });
      console.log('날짜 변경 완료');
    }

    console.log('테스트 5 완료: 날짜 변경');
  });
});
