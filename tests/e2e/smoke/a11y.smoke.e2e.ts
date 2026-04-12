import { test } from '@playwright/test';
import { expectNoA11yViolations } from '../fixtures/axe';

test.describe('accessibility — public pages', () => {
  test('home page', async ({ page }) => {
    await page.goto('/');
    await expectNoA11yViolations(page);
  });

  test('404 page', async ({ page }) => {
    await page.goto('/category/nonexistent-slug-xyz');
    await expectNoA11yViolations(page);
  });
});
