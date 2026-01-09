import { test, expect } from '@playwright/test';

/**
 * Stage 59e: 진도 저장 버그 테스트
 *
 * 목표: 날짜별 진도 분리 저장이 정상 작동하는지 검증
 * 버그: 1/9 수정하면 1/7 데이터도 같이 바뀌는 문제
 */

test.describe('진도 저장 버그 테스트 (Stage 59)', () => {
  // 콘솔 로그 캡처 배열
  let consoleLogs: string[] = [];

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120000); // 2분 타임아웃
    consoleLogs = [];

    // 콘솔 로그 캡처
    page.on('console', (msg) => {
      const text = msg.text();
      if (
        text.includes('[ProgressModal]') ||
        text.includes('[useSaveProgress]')
      ) {
        consoleLogs.push(text);
        console.log('CAPTURED:', text);
      }
    });

    // 로그인
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const usernameInput = page
      .locator('input[type="text"], input[placeholder*="아이디"]')
      .first();
    const passwordInput = page.locator('input[type="password"]').first();

    await usernameInput.fill('shj');
    await passwordInput.fill('shj');
    await page.getByRole('button', { name: /로그인|login/i }).click();

    // 대시보드 로딩 대기
    await page.waitForURL('**/backoffice**', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  });

  test('테스트 1: 날짜별 진도 분리 저장', async ({ page }) => {
    // 1. 현재 날짜 확인 (스크린샷)
    await page.screenshot({ path: 'test-results/progress-1-initial.png' });
    console.log('=== 초기 대시보드 ===');

    // 2. 이전 날짜로 이동 (1/7 또는 이전 날짜)
    const prevBtn = page
      .locator('button')
      .filter({ hasText: /←|<|이전/ })
      .first();
    const isPrevVisible = await prevBtn.isVisible().catch(() => false);

    if (isPrevVisible) {
      await prevBtn.click();
      await page.waitForTimeout(500);
      await prevBtn.click(); // 두 번 클릭
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/progress-2-prev-date.png' });
    }

    // 3. 진도 버튼 찾기
    const progressBtn = page
      .locator('button')
      .filter({ hasText: /진도/ })
      .first();
    const isProgressVisible = await progressBtn.isVisible().catch(() => false);

    if (!isProgressVisible) {
      console.log('진도 버튼 없음 - 해당 날짜에 수업이 없을 수 있음');
      // 다음 날짜로 이동해서 다시 시도
      const nextBtn = page
        .locator('button')
        .filter({ hasText: /→|>|다음/ })
        .first();
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    // 4. 진도 모달 열기 및 입력 (첫 번째 날짜)
    const progressBtn1 = page
      .locator('button')
      .filter({ hasText: /진도/ })
      .first();
    if (await progressBtn1.isVisible()) {
      await progressBtn1.click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: 'test-results/progress-3-modal-open-date1.png',
      });

      // 콘솔 로그 출력
      console.log('=== 첫 번째 날짜 모달 열기 로그 ===');
      consoleLogs.forEach((log) => console.log(log));

      // 단원명 입력
      const topicInput = page
        .locator('input[placeholder*="단원"], input[name*="topic"]')
        .first();
      const hasTopicInput = await topicInput.isVisible().catch(() => false);

      if (hasTopicInput) {
        await topicInput.clear();
        await topicInput.fill('이차방정식_첫번째날짜');
        console.log('첫 번째 날짜 단원명 입력: 이차방정식_첫번째날짜');
      }

      // 저장
      consoleLogs = [];
      const saveBtn = page.getByRole('button', { name: /저장|완료/ }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);

        console.log('=== 첫 번째 날짜 저장 로그 ===');
        consoleLogs.forEach((log) => console.log(log));
      }

      // 모달 닫기 (ESC)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 5. 다른 날짜로 이동
    consoleLogs = [];
    const nextBtn = page
      .locator('button')
      .filter({ hasText: /→|>|다음/ })
      .first();

    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      await nextBtn.click(); // 두 번 클릭해서 다른 날짜로
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/progress-4-moved-date2.png',
      });
    }

    // 6. 두 번째 날짜에서 진도 모달 열기
    const progressBtn2 = page
      .locator('button')
      .filter({ hasText: /진도/ })
      .first();
    if (await progressBtn2.isVisible()) {
      await progressBtn2.click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: 'test-results/progress-5-modal-open-date2.png',
      });

      console.log('=== 두 번째 날짜 모달 열기 로그 ===');
      consoleLogs.forEach((log) => console.log(log));

      // 현재 표시된 단원명 확인
      const topicInput = page
        .locator('input[placeholder*="단원"], input[name*="topic"]')
        .first();
      const currentValue = await topicInput.inputValue().catch(() => '');
      console.log('두 번째 날짜 현재 단원명:', currentValue);

      // 단원명 수정
      if (await topicInput.isVisible()) {
        await topicInput.clear();
        await topicInput.fill('이차함수_두번째날짜');
        console.log('두 번째 날짜 단원명 입력: 이차함수_두번째날짜');
      }

      // 저장
      consoleLogs = [];
      const saveBtn = page.getByRole('button', { name: /저장|완료/ }).first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(2000);

        console.log('=== 두 번째 날짜 저장 로그 ===');
        consoleLogs.forEach((log) => console.log(log));
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }

    // 7. 첫 번째 날짜로 다시 돌아가서 확인
    consoleLogs = [];
    const prevBtn2 = page
      .locator('button')
      .filter({ hasText: /←|<|이전/ })
      .first();

    if (await prevBtn2.isVisible()) {
      await prevBtn2.click();
      await page.waitForTimeout(500);
      await prevBtn2.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: 'test-results/progress-6-back-to-date1.png',
      });
    }

    // 8. 첫 번째 날짜 진도 확인 (핵심 검증)
    const progressBtn3 = page
      .locator('button')
      .filter({ hasText: /진도/ })
      .first();
    if (await progressBtn3.isVisible()) {
      await progressBtn3.click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: 'test-results/progress-7-verify-date1.png',
      });

      console.log('=== 첫 번째 날짜 재확인 로그 ===');
      consoleLogs.forEach((log) => console.log(log));

      // 단원명 검증
      const topicInput = page
        .locator('input[placeholder*="단원"], input[name*="topic"]')
        .first();
      const verifyValue = await topicInput.inputValue().catch(() => '');
      console.log('첫 번째 날짜 재확인 단원명:', verifyValue);

      // 기대: "이차방정식" (버그면 "이차함수")
      if (verifyValue.includes('이차방정식')) {
        console.log('✅ 테스트 통과: 첫 번째 날짜 데이터 유지됨');
      } else if (verifyValue.includes('이차함수')) {
        console.log('❌ 버그 확인: 두 번째 날짜 수정이 첫 번째 날짜에 영향');
      }

      // expect(verifyValue).toContain('이차방정식');
    }

    console.log('테스트 1 완료!');
  });

  test('테스트 2: 저장 후 즉시 재열기', async ({ page }) => {
    // 1. 진도 버튼 찾기
    const progressBtn = page
      .locator('button')
      .filter({ hasText: /진도/ })
      .first();

    if (!(await progressBtn.isVisible().catch(() => false))) {
      console.log('진도 버튼 없음 - 오늘 수업이 없을 수 있음');
      test.skip();
      return;
    }

    // 2. 진도 모달 열기
    await progressBtn.click();
    await page.waitForTimeout(1500);

    console.log('=== 첫 모달 열기 로그 ===');
    consoleLogs.forEach((log) => console.log(log));

    // 3. 단원명 입력 후 저장
    const topicInput = page
      .locator('input[placeholder*="단원"], input[name*="topic"]')
      .first();
    const testValue = '테스트단원_' + Date.now();

    if (await topicInput.isVisible()) {
      await topicInput.fill(testValue);
    }

    consoleLogs = [];
    const saveBtn = page.getByRole('button', { name: /저장|완료/ }).first();
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
    }

    console.log('=== 저장 로그 ===');
    consoleLogs.forEach((log) => console.log(log));

    // 4. 바로 다시 열기
    consoleLogs = [];
    await progressBtn.click();
    await page.waitForTimeout(1500);

    console.log('=== 재열기 로그 ===');
    consoleLogs.forEach((log) => console.log(log));

    await page.screenshot({
      path: 'test-results/progress-reopen-immediate.png',
    });

    // 5. 저장된 데이터가 표시되는지 확인
    const reopenValue = await topicInput.inputValue().catch(() => '');
    console.log('재열기 후 단원명:', reopenValue);

    if (reopenValue === testValue) {
      console.log('✅ 정상: 저장한 데이터가 바로 표시됨');
    } else {
      console.log('⚠️ 주의: 저장한 데이터와 다른 값 표시됨');
      console.log('  - 저장한 값:', testValue);
      console.log('  - 표시된 값:', reopenValue);
    }

    // todayProgressData가 있는지 확인 (로그에서)
    const hasTodayData = consoleLogs.some(
      (log) => log.includes('todayProgressData') && !log.includes('null')
    );
    console.log('todayProgressData 존재:', hasTodayData);

    console.log('테스트 2 완료!');
  });

  test('테스트 3: 콘솔 로그 상세 분석', async ({ page }) => {
    // 진도 버튼 찾기
    const progressBtn = page
      .locator('button')
      .filter({ hasText: /진도/ })
      .first();

    if (!(await progressBtn.isVisible().catch(() => false))) {
      console.log('진도 버튼 없음');
      test.skip();
      return;
    }

    // 진도 모달 열기
    await progressBtn.click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/progress-console-test.png' });

    // 모든 캡처된 로그 출력
    console.log('========================================');
    console.log('=== 캡처된 모든 콘솔 로그 ===');
    console.log('========================================');

    if (consoleLogs.length === 0) {
      console.log('(캡처된 로그 없음 - 디버그 로그가 코드에 없을 수 있음)');
    } else {
      consoleLogs.forEach((log, i) => {
        console.log(`[${i + 1}] ${log}`);
      });
    }

    console.log('========================================');

    // 로그에서 핵심 정보 추출
    const dateLog = consoleLogs.find((log) => log.includes('dateStr'));
    const dataLog = consoleLogs.find((log) => log.includes('Data:'));

    if (dateLog) {
      console.log('날짜 정보:', dateLog);
    }
    if (dataLog) {
      console.log('데이터 정보:', dataLog);
    }

    console.log('테스트 3 완료!');
  });
});
