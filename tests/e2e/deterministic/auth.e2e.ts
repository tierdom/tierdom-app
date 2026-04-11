import { test, expect } from '@playwright/test';

// These tests use a fresh browser context (no storageState) to test auth flows.
test.use({ storageState: { cookies: [], origins: [] } });

test('login with valid credentials', async ({ page }) => {
  await page.goto('/admin/login');
  await page.locator('#username').fill('admin');
  await page.locator('#password').fill('admin');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/);
});

test('login with invalid password shows error', async ({ page }) => {
  await page.goto('/admin/login');
  await page.locator('#username').fill('admin');
  await page.locator('#password').fill('wrongpassword');
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('.text-red-400')).toBeVisible();
});

test('logout clears session and redirects to login', async ({ page }) => {
  // Log in first
  await page.goto('/admin/login');
  await page.locator('#username').fill('admin');
  await page.locator('#password').fill('admin');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin(?!\/login)/);

  // Open user menu dropdown and click sign out
  await page.locator('[data-user-menu] button').first().click();
  await page.locator('[data-user-menu]').getByText('Sign out').click();
  await expect(page).toHaveURL(/\/admin\/login/);

  // Verify session is cleared — admin should redirect back to login
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});
