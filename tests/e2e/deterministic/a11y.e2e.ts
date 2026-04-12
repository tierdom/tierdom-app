import { test } from '@playwright/test';
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

  test('admin tags', async ({ page }) => {
    await page.goto('/admin/tags');
    await expectNoA11yViolations(page);
  });

  test('admin pages', async ({ page }) => {
    await page.goto('/admin/pages');
    await expectNoA11yViolations(page);
  });
});
