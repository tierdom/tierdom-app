import { test, expect } from '@playwright/test';
import { expectNoA11yViolations } from '../fixtures/axe';

test('import index lists all four importers and a suggest-format link', async ({ page }) => {
  await page.goto('/admin/tools/import');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Import' })).toBeVisible();

  for (const label of ['Tierdom JSON', 'Goodreads', 'BoardGameGeek', 'IMDb']) {
    await expect(main.getByRole('link', { name: new RegExp(label) })).toBeVisible();
  }
  await expect(main.getByRole('link', { name: /Suggest a new format/ })).toBeVisible();
});

test('Tierdom JSON page is reachable', async ({ page }) => {
  await page.goto('/admin/tools/import/json');
  await expect(page.getByRole('main').getByRole('heading', { name: 'Tierdom JSON' })).toBeVisible();
});

test('every stub page renders the coming-soon panel', async ({ page }) => {
  for (const id of ['goodreads', 'bgg', 'imdb']) {
    await page.goto(`/admin/tools/import/${id}`);
    await expect(page.getByText('Coming soon')).toBeVisible();
  }
});

test('schema endpoint serves the published JSON Schema', async ({ request }) => {
  const res = await request.get('/schemas/tierdom-import-v1.json');
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('application/schema+json');
  const body = await res.json();
  expect(body.$id).toBe('https://tierdom.app/schemas/tierdom-import-v1.json');
});

test('import index is accessible', async ({ page }) => {
  await page.goto('/admin/tools/import');
  await expectNoA11yViolations(page);
});

test('import stub page is accessible', async ({ page }) => {
  await page.goto('/admin/tools/import/goodreads');
  await expectNoA11yViolations(page);
});
