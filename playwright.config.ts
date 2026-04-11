import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.e2e.{ts,js}',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 15_000,

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    // Smoke: runs against dev server, any DB state
    {
      name: 'smoke',
      testDir: 'tests/e2e/smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5173'
      }
    },

    // Deterministic: login once, save session
    {
      name: 'det-setup',
      testDir: 'tests/e2e/deterministic',
      testMatch: 'auth-setup.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4173'
      }
    },

    // Deterministic: all tests with saved auth
    {
      name: 'deterministic',
      testDir: 'tests/e2e/deterministic',
      testIgnore: 'auth-setup.e2e.ts',
      dependencies: ['det-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:4173',
        storageState: 'test-data/auth/admin.json'
      }
    }
  ],

  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000,
    env: { DATA_PATH: './test-data', ADMIN_PASSWORD: 'admin' }
  }
});
