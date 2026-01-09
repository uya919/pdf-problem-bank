import { test, expect } from '@playwright/test';

/**
 * 로그인 후 기록 탭 테스트
 */
test('shj 로그인 후 기록 탭 확인', async ({ page }) => {
  test.setTimeout(60000);

  // 1. 로그인 페이지 이동
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // 2. 로그인 폼 입력 - 정확한 placeholder 사용
  const usernameInput = page.locator('input[type="text"], input[placeholder*="아이디"]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await usernameInput.fill('shj');
  await passwordInput.fill('shj');

  // 3. 로그인 버튼 클릭
  await page.getByRole('button', { name: /로그인|login/i }).click();

  // 4. 로그인 완료 대기 - 로딩 완료까지 대기
  await page.waitForTimeout(3000);

  // URL 확인
  const currentUrl = page.url();
  console.log('현재 URL:', currentUrl);

  // 5. records 페이지로 이동
  await page.goto('/backoffice/records');

  // 로딩 완료 대기 (탭 버튼이 나타날 때까지)
  await page.waitForSelector('button:has-text("출결")', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // 6. 기록 탭 확인
  const tabs = await page.locator('button').filter({ hasText: /출결|진도|숙제|성적|기록/ }).allTextContents();
  console.log('발견된 탭들:', tabs);

  // 스크린샷 저장 (탭 확인용)
  await page.screenshot({ path: 'test-results/tabs-screenshot.png' });

  // 기록 탭이 있는지 확인
  const hasReportTab = tabs.some(t => t.includes('기록'));

  if (!hasReportTab) {
    console.log('기록 탭이 없습니다. 모든 버튼 확인:');
    const allButtons = await page.locator('button').allTextContents();
    console.log('모든 버튼:', allButtons.slice(0, 20));
  }

  expect(hasReportTab).toBe(true);

  // 7. 기록 탭 클릭 (첫 번째 것 = 탭 버튼)
  await page.getByRole('button', { name: /기록/i }).first().click();

  // 데이터 로딩 대기 (학생 카드 또는 EmptyState가 나타날 때까지)
  await page.waitForTimeout(2000);

  // 8. 스크린샷 저장
  await page.screenshot({ path: 'test-results/report-tab-screenshot.png' });

  // 9. 기록 탭 콘텐츠 확인
  const pageContent = await page.textContent('body');
  console.log('페이지 내용 일부:', pageContent?.substring(0, 500));

  // 학생 카드 또는 진행률 카드가 있는지 확인
  const hasProgressCard = pageContent?.includes('오늘의 기록') || false;
  const hasEmptyState = pageContent?.includes('주담임으로 배정된') || pageContent?.includes('주말에는') || false;
  const hasStudentCard = pageContent?.includes('미작성') || pageContent?.includes('완료') || pageContent?.includes('작성중') || false;

  console.log('진행률 카드:', hasProgressCard);
  console.log('EmptyState:', hasEmptyState);
  console.log('학생 카드:', hasStudentCard);

  console.log('기록 탭 테스트 완료!');
});
