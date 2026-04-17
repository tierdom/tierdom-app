import { test, expect } from '@playwright/test';

test('dashboard shows entity counts', async ({ page }) => {
  await page.goto('/admin');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  // Dashboard cards have count (bold number) and label underneath
  const cards = main.locator('.text-2xl.font-bold');
  await expect(cards).toHaveCount(3);
});

test('dashboard links to admin sections', async ({ page }) => {
  await page.goto('/admin');
  const main = page.getByRole('main');
  await expect(main.locator('a[href*="/admin/cms"]').first()).toBeVisible();
  await expect(main.locator('a[href*="/admin/categories"]').first()).toBeVisible();
  await expect(main.locator('a[href*="/admin/items"]').first()).toBeVisible();
});

test('dashboard shows recent items', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('main').getByText('Recently updated')).toBeVisible();
});
