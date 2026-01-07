import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 테스트 설정
 *
 * Vercel 프로덕션 환경에서 E2E 테스트 실행
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    // Vercel 프로덕션 URL
    baseURL: 'https://hyeyum.vercel.app',

    // 테스트 설정
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 타임아웃
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // 테스트 타임아웃
  timeout: 60000,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 모바일 테스트 (Chromium 기반으로 변경)
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],  // Chromium 기반 Android 디바이스
      },
    },
  ],
});
