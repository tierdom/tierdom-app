import { test, expect } from '@playwright/test';

test('admin redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('admin categories redirects to login', async ({ page }) => {
  await page.goto('/admin/categories');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('login page renders form', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});
