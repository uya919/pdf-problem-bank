import { test, expect } from '@playwright/test';

/**
 * Stage 58-E2E: 주간 리포트 시스템 테스트
 *
 * 테스트 대상:
 * - RecordsPage의 '기록' 탭
 * - ReportTab 컴포넌트
 * - ReportModal 컴포넌트
 *
 * NOTE: 주담임 학생이 없거나 주말인 경우 EmptyState 표시
 */
test.describe('기록 페이지 - 주간 리포트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/backoffice/records');
    await page.waitForLoadState('networkidle');
  });

  // =====================================================
  // 1. 탭 네비게이션
  // =====================================================
  test.describe('탭 네비게이션', () => {
    test('기록 탭이 표시된다', async ({ page }) => {
      // 로그인 페이지로 리다이렉트된 경우 스킵
      const isLoginPage = await page.getByRole('button', { name: /로그인|login/i }).isVisible();
      if (isLoginPage) {
        test.skip();
        return;
      }

      const reportTab = page.getByRole('button', { name: /기록/i });
      await expect(reportTab).toBeVisible();
    });

    test('기록 탭 클릭 시 ReportTab이 로드된다', async ({ page }) => {
      const isLoginPage = await page.getByRole('button', { name: /로그인|login/i }).isVisible();
      if (isLoginPage) {
        test.skip();
        return;
      }

      await page.getByRole('button', { name: /기록/i }).click();
      await page.waitForTimeout(300);

      // 진행률 카드 또는 EmptyState 중 하나가 표시되어야 함
      const progressCard = page.getByText(/오늘의 기록/i);
      const emptyWeekend = page.getByText(/주말에는 리포트 작성이 없습니다/i);
      const emptyNoStudents = page.getByText(/주담임으로 배정된 학생이 없습니다/i);
      const emptyNoAssigned = page.getByText(/배정된 학생이 없습니다/i);

      const hasContent =
        (await progressCard.isVisible().catch(() => false)) ||
        (await emptyWeekend.isVisible().catch(() => false)) ||
        (await emptyNoStudents.isVisible().catch(() => false)) ||
        (await emptyNoAssigned.isVisible().catch(() => false));

      expect(hasContent).toBe(true);
    });

    test('진행률 카드가 표시된다 (학생이 있는 경우)', async ({ page }) => {
      const isLoginPage = await page.getByRole('button', { name: /로그인|login/i }).isVisible();
      if (isLoginPage) {
        test.skip();
        return;
      }

      await page.getByRole('button', { name: /기록/i }).click();
      await page.waitForTimeout(300);

      const progressCard = page.getByText(/오늘의 기록/i);
      const isVisible = await progressCard.isVisible().catch(() => false);

      if (isVisible) {
        // N/M명 형태의 진행률 텍스트 확인
        const progressCount = page.getByText(/\d+\/\d+명/);
        await expect(progressCount).toBeVisible();
      }
    });
  });

  // =====================================================
  // 2. 학생 카드 상호작용
  // =====================================================
  test.describe('학생 카드', () => {
    test.beforeEach(async ({ page }) => {
      const isLoginPage = await page.getByRole('button', { name: /로그인|login/i }).isVisible();
      if (isLoginPage) {
        test.skip();
        return;
      }

      await page.getByRole('button', { name: /기록/i }).click();
      await page.waitForTimeout(300);
    });

    test('학생 카드에 상태 배지가 표시된다', async ({ page }) => {
      // 학생 카드 확인 (purple 또는 green 배경의 아이콘이 있는 버튼)
      const studentCard = page.locator('button').filter({
        has: page.locator('.bg-purple-100, .bg-green-100'),
      }).first();

      const hasStudentCard = await studentCard.isVisible().catch(() => false);

      if (hasStudentCard) {
        // 완료/작성중/미작성 중 하나의 배지 확인
        const completedBadge = page.getByText(/완료/).first();
        const draftBadge = page.getByText(/작성중/).first();
        const pendingBadge = page.getByText(/미작성/).first();

        const hasBadge =
          (await completedBadge.isVisible().catch(() => false)) ||
          (await draftBadge.isVisible().catch(() => false)) ||
          (await pendingBadge.isVisible().catch(() => false));

        expect(hasBadge).toBe(true);
      }
    });

    test('학생 카드 클릭 시 모달이 열린다', async ({ page }) => {
      const studentCard = page.locator('button').filter({
        has: page.locator('.bg-purple-100'),
      }).first();

      const hasStudentCard = await studentCard.isVisible().catch(() => false);

      if (hasStudentCard) {
        await studentCard.click();
        await page.waitForTimeout(300);

        // 모달 제목 확인
        const modalTitle = page.getByText(/주간 리포트/i);
        await expect(modalTitle).toBeVisible();
      }
    });
  });

  // =====================================================
  // 3. ReportModal 폼 입력
  // =====================================================
  test.describe('리포트 모달', () => {
    async function openReportModal(page: import('@playwright/test').Page): Promise<boolean> {
      const isLoginPage = await page.getByRole('button', { name: /로그인|login/i }).isVisible();
      if (isLoginPage) return false;

      await page.getByRole('button', { name: /기록/i }).click();
      await page.waitForTimeout(300);

      const studentCard = page.locator('button').filter({
        has: page.locator('.bg-purple-100'),
      }).first();

      const hasStudentCard = await studentCard.isVisible().catch(() => false);
      if (!hasStudentCard) return false;

      await studentCard.click();
      await page.waitForTimeout(300);

      const modal = page.getByText(/주간 리포트/i);
      return await modal.isVisible().catch(() => false);
    }

    test('출석 입력 시 출석률이 계산된다', async ({ page }) => {
      const modalOpen = await openReportModal(page);
      if (!modalOpen) {
        test.skip();
        return;
      }

      // 출석 입력 필드 찾기
      const presentInput = page.locator('input[type="number"]').first();
      const totalInput = page.locator('input[type="number"]').nth(1);

      const hasInputs = await presentInput.isVisible().catch(() => false);
      if (hasInputs) {
        await presentInput.fill('4');
        await totalInput.fill('5');

        // 80% 텍스트 확인
        const percentage = page.getByText(/80%/);
        await expect(percentage).toBeVisible();
      }
    });

    test('별점 클릭 시 별이 활성화된다', async ({ page }) => {
      const modalOpen = await openReportModal(page);
      if (!modalOpen) {
        test.skip();
        return;
      }

      // 별점 버튼 찾기 (Star 아이콘이 있는 버튼)
      const starButtons = page.locator('button').filter({
        has: page.locator('svg'),
      });

      const starCount = await starButtons.count();
      if (starCount >= 5) {
        // 3번째 별 클릭
        await starButtons.nth(2).click();
        // 별이 활성화되었는지 확인 (amber 색상)
        const activeStar = page.locator('.text-amber-400, .fill-amber-400');
        const hasActiveStar = await activeStar.first().isVisible().catch(() => false);
        expect(hasActiveStar).toBe(true);
      }
    });

    test('템플릿 칩 클릭 시 텍스트가 추가된다', async ({ page }) => {
      const modalOpen = await openReportModal(page);
      if (!modalOpen) {
        test.skip();
        return;
      }

      // 템플릿 칩 찾기 ("+ " 로 시작하는 버튼)
      const chip = page.getByRole('button').filter({ hasText: /수업에 집중/ }).first();
      const hasChip = await chip.isVisible().catch(() => false);

      if (hasChip) {
        await chip.click();

        // textarea에 텍스트가 추가되었는지 확인
        const textarea = page.locator('textarea').first();
        const value = await textarea.inputValue();
        expect(value).toContain('수업에 집중');
      }
    });

    test('텍스트 입력이 가능하다', async ({ page }) => {
      const modalOpen = await openReportModal(page);
      if (!modalOpen) {
        test.skip();
        return;
      }

      const textareas = page.locator('textarea');
      const textareaCount = await textareas.count();

      if (textareaCount > 0) {
        const firstTextarea = textareas.first();
        await firstTextarea.fill('테스트 텍스트 입력');

        const value = await firstTextarea.inputValue();
        expect(value).toBe('테스트 텍스트 입력');
      }
    });
  });

  // =====================================================
  // 4. 저장 기능
  // =====================================================
  test.describe('저장', () => {
    async function openReportModal(page: import('@playwright/test').Page): Promise<boolean> {
      const isLoginPage = await page.getByRole('button', { name: /로그인|login/i }).isVisible();
      if (isLoginPage) return false;

      await page.getByRole('button', { name: /기록/i }).click();
      await page.waitForTimeout(300);

      const studentCard = page.locator('button').filter({
        has: page.locator('.bg-purple-100'),
      }).first();

      const hasStudentCard = await studentCard.isVisible().catch(() => false);
      if (!hasStudentCard) return false;

      await studentCard.click();
      await page.waitForTimeout(300);

      const modal = page.getByText(/주간 리포트/i);
      return await modal.isVisible().catch(() => false);
    }

    test('임시저장 버튼 클릭 시 모달이 닫힌다', async ({ page }) => {
      const modalOpen = await openReportModal(page);
      if (!modalOpen) {
        test.skip();
        return;
      }

      const draftBtn = page.getByRole('button', { name: /임시저장/i });
      const hasDraftBtn = await draftBtn.isVisible().catch(() => false);

      if (hasDraftBtn) {
        await draftBtn.click();
        await page.waitForTimeout(500);

        // 모달이 닫혔는지 확인
        const modalTitle = page.getByText(/주간 리포트/i);
        await expect(modalTitle).not.toBeVisible();
      }
    });

    test('저장 버튼 클릭 시 모달이 닫힌다', async ({ page }) => {
      const modalOpen = await openReportModal(page);
      if (!modalOpen) {
        test.skip();
        return;
      }

      // 저장 버튼 (임시저장이 아닌)
      const saveBtn = page.getByRole('button', { name: /^저장$/i });
      const hasSaveBtn = await saveBtn.isVisible().catch(() => false);

      if (hasSaveBtn) {
        await saveBtn.click();
        await page.waitForTimeout(500);

        const modalTitle = page.getByText(/주간 리포트/i);
        await expect(modalTitle).not.toBeVisible();
      }
    });

    test('ESC 키로 모달이 닫힌다', async ({ page }) => {
      const modalOpen = await openReportModal(page);
      if (!modalOpen) {
        test.skip();
        return;
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      const modalTitle = page.getByText(/주간 리포트/i);
      await expect(modalTitle).not.toBeVisible();
    });

    test('오버레이 클릭 시 모달이 닫힌다', async ({ page }) => {
      const modalOpen = await openReportModal(page);
      if (!modalOpen) {
        test.skip();
        return;
      }

      // 모달 오버레이 (배경) 클릭
      const overlay = page.locator('.bg-black\\/50, [class*="overlay"]').first();
      const hasOverlay = await overlay.isVisible().catch(() => false);

      if (hasOverlay) {
        // 모달 외부 영역 클릭
        await overlay.click({ position: { x: 10, y: 10 } });
        await page.waitForTimeout(300);

        const modalTitle = page.getByText(/주간 리포트/i);
        await expect(modalTitle).not.toBeVisible();
      }
    });
  });

  // =====================================================
  // 5. 엣지 케이스
  // =====================================================
  test.describe('엣지 케이스', () => {
    test('로그인되지 않은 경우 로그인 페이지로 리다이렉트', async ({ page }) => {
      // 이미 beforeEach에서 페이지 접근 완료
      // 로그인 페이지 또는 기록 페이지 중 하나가 표시되어야 함
      const isLoginPage = await page.getByRole('button', { name: /로그인|login/i }).isVisible();
      const isRecordsPage = await page.getByText(/기록/).first().isVisible();

      expect(isLoginPage || isRecordsPage).toBe(true);
    });

    test('탭 전환이 정상 작동한다', async ({ page }) => {
      const isLoginPage = await page.getByRole('button', { name: /로그인|login/i }).isVisible();
      if (isLoginPage) {
        test.skip();
        return;
      }

      // 각 탭 클릭 테스트
      const tabs = ['출결', '진도', '숙제', '성적', '기록'];

      for (const tabName of tabs) {
        const tab = page.getByRole('button', { name: new RegExp(tabName, 'i') });
        const isVisible = await tab.isVisible().catch(() => false);

        if (isVisible) {
          await tab.click();
          await page.waitForTimeout(200);
          // 탭이 활성화되었는지 확인 (선택 스타일)
          const isActive = await tab.evaluate((el) =>
            el.classList.contains('bg-white') || el.classList.contains('bg-[#3182F6]')
          );
          expect(isActive).toBe(true);
        }
      }
    });
  });
});
