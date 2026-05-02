import { test, expect } from '@playwright/test';
import { expectNoA11yViolations } from '../fixtures/axe';

// Cross-cutting import tests: index page, stub pages, and the published
// schema endpoint. Per-importer flows live alongside this file
// (`admin-import-json.e2e.ts`, `admin-import-imdb.e2e.ts`, ...) so the file
// list mirrors the importer registry.

test('import index groups importers into Tierdom and Third-Party sections', async ({ page }) => {
  await page.goto('/admin/tools/import');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Import', exact: true, level: 2 })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Tierdom Import' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Third-Party Import' })).toBeVisible();

  for (const label of ['Tierdom JSON', 'Goodreads', 'BoardGameGeek', 'IMDb']) {
    await expect(main.getByRole('link', { name: new RegExp(label) })).toBeVisible();
  }
  await expect(main.getByRole('link', { name: /Suggest a new format/ })).toBeVisible();
});

test('every stub page renders the coming-soon panel', async ({ page }) => {
  for (const id of ['goodreads', 'bgg']) {
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
