import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { waitForHydration } from './test';

export async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.locator('#username').fill('admin');
  await page.locator('#password').fill('admin');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/);
  // Login is a native form POST, so /admin is a fresh document.
  await waitForHydration(page);
}
