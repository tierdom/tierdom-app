import { test, expect } from '@playwright/test';

test('pages list shows seeded pages', async ({ page }) => {
  await page.goto('/admin/cms');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Pages' })).toBeVisible();
  await expect(main.getByText('Home').first()).toBeVisible();
  await expect(main.getByText('About tierdom').first()).toBeVisible();
});

test('general content section lists footer block', async ({ page }) => {
  await page.goto('/admin/cms');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'General Content' })).toBeVisible();
  await expect(main.getByRole('link', { name: /Footer/ })).toBeVisible();
});

test('edit footer and verify on public side', async ({ page }) => {
  const main = page.getByRole('main');

  await page.goto('/admin/cms');
  await main.getByRole('link', { name: /Footer/ }).click();
  await page.locator('#content').fill('Custom footer with **bold** E2E marker.');
  // Save specifically — a Reset button is also present once a row exists.
  await main.getByRole('button', { name: 'Save' }).click();

  await page.goto('/');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByText('Custom footer with')).toBeVisible();
  await expect(footer.locator('strong', { hasText: 'bold' })).toBeVisible();

  // Restore: clear the row so the next run (or a retry) starts clean.
  await page.goto('/admin/cms/general/footer');
  await main.getByRole('button', { name: 'Reset to default' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset' }).click();
  await expect(page).toHaveURL('/admin/cms');
});

test('edit home page content and verify on public side', async ({ page }) => {
  const main = page.getByRole('main');

  // Navigate to home page editor
  await page.goto('/admin/cms');
  await main.getByRole('link', { name: 'Home' }).first().click();

  // Store original content
  const contentField = page.locator('#content');
  const originalContent = await contentField.inputValue();

  // Edit content
  await contentField.fill(originalContent + '\n\nE2E test marker.');
  await main.locator('button[type="submit"]').click();

  // Verify on public home page
  await page.goto('/');
  await expect(page.getByText('E2E test marker.')).toBeVisible();

  // Restore original content
  await page.goto('/admin/cms');
  await main.getByRole('link', { name: 'Home' }).first().click();
  await page.locator('#content').fill(originalContent);
  await main.locator('button[type="submit"]').click();

  // Verify restoration
  await page.goto('/');
  await expect(page.getByText('E2E test marker.')).not.toBeVisible();
});
