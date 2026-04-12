import { test, expect } from '@playwright/test';

test('health endpoint returns ok', async ({ request }) => {
  const res = await request.get('/health');
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: 'ok' });
});

test('home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/tierdom/i);
  await expect(page.locator('h2')).not.toHaveCount(0);
});

test('navigation contains links', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation').first();
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link')).not.toHaveCount(0);
});

test('invalid category slug shows 404', async ({ page }) => {
  await page.goto('/category/nonexistent-slug-xyz');
  await expect(page.getByRole('heading', { name: 'Error 404' })).toBeAttached();
  await expect(page.getByText('not ranked here')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to safety' })).toBeVisible();
});
