import { test, expect } from '@playwright/test';
import { expectNoA11yViolations } from '../fixtures/axe';

test.describe('accessibility — public pages', () => {
  test('home page', async ({ page }) => {
    await page.goto('/');
    await expectNoA11yViolations(page);
  });

  test('category page with items', async ({ page }) => {
    await page.goto('/category/video-games');
    await expectNoA11yViolations(page);
  });

  test('empty category page', async ({ page }) => {
    await page.goto('/category/recipes');
    await expectNoA11yViolations(page);
  });

  test('about page', async ({ page }) => {
    await page.goto('/about');
    await expectNoA11yViolations(page);
  });

  test('item detail dialog with icon', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();
    await expect(page.locator('dialog[open]')).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('404 page', async ({ page }) => {
    await page.goto('/category/nonexistent-slug-xyz');
    await expectNoA11yViolations(page);
  });
});

test.describe('accessibility — admin pages', () => {
  test('admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    await expectNoA11yViolations(page);
  });

  test('admin categories', async ({ page }) => {
    await page.goto('/admin/categories');
    await expectNoA11yViolations(page);
  });

  test('admin items', async ({ page }) => {
    await page.goto('/admin/items');
    await expectNoA11yViolations(page);
  });

  test('admin cms', async ({ page }) => {
    await page.goto('/admin/cms');
    await expectNoA11yViolations(page);
  });

  test('admin cms page edit', async ({ page }) => {
    await page.goto('/admin/cms/pages/home');
    await expectNoA11yViolations(page);
  });

  test('admin cms general footer edit', async ({ page }) => {
    await page.goto('/admin/cms/general/footer');
    await expectNoA11yViolations(page);
  });

  test('admin trash', async ({ page }) => {
    await page.goto('/admin/trash');
    await expectNoA11yViolations(page);
  });

  test('admin tools', async ({ page }) => {
    await page.goto('/admin/tools');
    await expectNoA11yViolations(page);
  });

  test('admin tools export — wizard', async ({ page }) => {
    await page.goto('/admin/tools/export');
    await expectNoA11yViolations(page);
  });

  test('admin tools export — submitted state', async ({ page }) => {
    await page.goto('/admin/tools/export');
    // Submitting downloads the ZIP; consume the download event so it doesn't dangle.
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download ZIP' }).click();
    await (await downloadPromise).cancel();
    // Confirmation panel appears asynchronously (setTimeout(0) defers the swap).
    await expect(page.getByRole('heading', { name: 'Your export is on its way' })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('admin categories create', async ({ page }) => {
    await page.goto('/admin/categories/create');
    await expectNoA11yViolations(page);
  });

  test('admin categories edit', async ({ page }) => {
    // IDs are runtime UUIDs — navigate via the list to land on a real edit page.
    await page.goto('/admin/categories');
    await page.locator('main a[href^="/admin/categories/"]').first().click();
    await expect(page).toHaveURL(/\/admin\/categories\/[^/]+$/);
    await expectNoA11yViolations(page);
  });

  test('admin items create', async ({ page }) => {
    await page.goto('/admin/items/new-item');
    await expectNoA11yViolations(page);
  });

  test('admin items edit', async ({ page }) => {
    await page.goto('/admin/items');
    await page
      .locator('main a[href^="/admin/items/"]')
      .filter({ hasNotText: /new item/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/admin\/items\/[^/]+$/);
    await expectNoA11yViolations(page);
  });
});
