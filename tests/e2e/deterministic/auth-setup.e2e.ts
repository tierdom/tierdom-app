import { test as setup } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth';

setup('authenticate as admin', async ({ page }) => {
  await loginAsAdmin(page);
  await page.context().storageState({ path: 'test-data/auth/admin.json' });
});
