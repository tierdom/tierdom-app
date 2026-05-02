import { test, expect } from '@playwright/test';
import { resolve as resolvePath } from 'node:path';
import { expectNoA11yViolations } from '../fixtures/axe';

// IMPORTANT: the deterministic suite runs against a single seeded DB shared by
// every test in the project. The upload tests below all clash on slug with the
// seed (books, board-games) and therefore skip — they do NOT mutate the DB.
// If you add a test that triggers inserts or upserts, give it a fresh DB
// (separate Playwright project) so it doesn't leak into later tests.

const FIXTURE_GOOD = resolvePath('tests/fixtures/imports/tierdom-json-001-good.json');
const FIXTURE_MALFORMED = resolvePath('tests/fixtures/imports/tierdom-json-003-malformed.json');

test('Tierdom JSON page is reachable', async ({ page }) => {
  await page.goto('/admin/tools/import/json');
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Tierdom JSON', exact: true, level: 2 }),
  ).toBeVisible();
});

test('uploading a good fixture goes through review then result', async ({ page }) => {
  await page.goto('/admin/tools/import/json');
  await page.setInputFiles('input[type="file"]', FIXTURE_GOOD);
  await page.getByRole('button', { name: 'Continue' }).click();

  // Review screen — defaults pre-fill use-existing matches against the seed.
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Review import' })).toBeVisible();
  await expect(main.getByText('tierdom-json-001-good.json')).toBeVisible();

  await main.getByRole('button', { name: 'Continue import' }).click();

  // The seed DB already has "books" and "board-games" slugs, so the fixture's
  // categories fold into them and items skip on slug clash.
  await expect(main.getByRole('heading', { name: 'Import finished' })).toBeVisible();
  await expect(main.getByText('tierdom-json-001-good.json')).toBeVisible();
  await expect(main.getByText('skip mode')).toBeVisible();
  await expect(main.getByRole('button', { name: 'Import again' })).toBeVisible();
  await expect(main.getByRole('link', { name: 'Done' })).toBeVisible();
});

test('uploading a malformed fixture skips review and shows validation errors', async ({ page }) => {
  await page.goto('/admin/tools/import/json');
  await page.setInputFiles('input[type="file"]', FIXTURE_MALFORMED);
  await page.getByRole('button', { name: 'Continue' }).click();

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Import rejected' })).toBeVisible();
  // The malformed fixture has a string score and a row missing required props.
  await expect(main.getByText(/score/).first()).toBeVisible();
});

test('cancel from the review step returns to the upload form', async ({ page }) => {
  await page.goto('/admin/tools/import/json');
  await page.setInputFiles('input[type="file"]', FIXTURE_GOOD);
  await page.getByRole('button', { name: 'Continue' }).click();

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Review import' })).toBeVisible();
  await main.getByRole('button', { name: 'Cancel' }).click();

  await expect(main.getByRole('heading', { name: 'Tierdom JSON', level: 2 })).toBeVisible();
  await expect(main.getByLabel('File')).toBeVisible();
});

test('the review page is accessible', async ({ page }) => {
  await page.goto('/admin/tools/import/json');
  await page.setInputFiles('input[type="file"]', FIXTURE_GOOD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Review import' }).waitFor();
  await expectNoA11yViolations(page);
});

test('the result page is accessible', async ({ page }) => {
  await page.goto('/admin/tools/import/json');
  await page.setInputFiles('input[type="file"]', FIXTURE_GOOD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Continue import' }).click();
  await page.getByRole('heading', { name: 'Import finished' }).waitFor();
  await expectNoA11yViolations(page);
});
