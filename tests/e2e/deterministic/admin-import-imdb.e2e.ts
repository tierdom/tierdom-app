import { test, expect } from '@playwright/test';
import { resolve as resolvePath } from 'node:path';
import { expectNoA11yViolations } from '../fixtures/axe';

// IMPORTANT: the deterministic suite runs against a single seeded DB shared by
// every test in the project. The IMDb synthetic category slug `imdb-watchlist`
// is NOT in the seed, so committing would mutate the shared DB. Each test
// below cancels at the review step instead. If you add a test that triggers
// inserts, give it a fresh DB (separate Playwright project).

const FIXTURE_IMDB = resolvePath('tests/fixtures/imports/imdb-sample.csv');
const FIXTURE_IMDB_BAD = resolvePath('tests/fixtures/imports/imdb-malformed.csv');

test('IMDb upload routes through a configure step before review', async ({ page }) => {
  await page.goto('/admin/tools/import/imdb');
  await page.setInputFiles('input[type="file"]', FIXTURE_IMDB);
  await page.getByRole('button', { name: 'Continue' }).click();

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Configure IMDb import' })).toBeVisible();
  for (const legend of [
    'Year',
    'Directors',
    'Which entries to import',
    'Include the IMDb URL in the description',
    'Order tie-breaker',
    'Rows without a "Your Rating" value',
    'Genres',
    'Generate gradient placeholders',
  ]) {
    await expect(main.getByRole('group', { name: legend })).toBeVisible();
  }
});

test('IMDb configure → review → cancel round-trip', async ({ page }) => {
  await page.goto('/admin/tools/import/imdb');
  await page.setInputFiles('input[type="file"]', FIXTURE_IMDB);
  await page.getByRole('button', { name: 'Continue' }).click();

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Configure IMDb import' })).toBeVisible();
  await main.getByRole('button', { name: 'Continue' }).click();

  await expect(main.getByRole('heading', { name: 'Review import' })).toBeVisible();
  await expect(main.locator('code', { hasText: 'imdb-watchlist' })).toBeVisible();
  await main.getByRole('button', { name: 'Cancel' }).click();

  await expect(main.getByRole('heading', { name: 'IMDb', level: 2 })).toBeVisible();
});

test('IMDb titleType=movie changes the synthetic category to "movies"', async ({ page }) => {
  // Selecting "Movie" only on the configure step swaps the synthetic-category
  // slug from `imdb-watchlist` to `movies`. That proves the chosen option
  // flows through the configure → planner pipeline.
  await page.goto('/admin/tools/import/imdb');
  await page.setInputFiles('input[type="file"]', FIXTURE_IMDB);
  await page.getByRole('button', { name: 'Continue' }).click();

  const main = page.getByRole('main');
  await main
    .getByRole('group', { name: 'Which entries to import' })
    .getByRole('radio', { name: 'Only "Movie" rows' })
    .check();
  await main.getByRole('button', { name: 'Continue' }).click();

  await expect(main.getByRole('heading', { name: 'Review import' })).toBeVisible();
  await expect(main.locator('code', { hasText: 'movies' })).toBeVisible();
  await expect(main.locator('code', { hasText: 'imdb-watchlist' })).toHaveCount(0);

  await main.getByRole('button', { name: 'Cancel' }).click();
});

test('IMDb header validation surfaces an error result for a malformed CSV', async ({ page }) => {
  await page.goto('/admin/tools/import/imdb');
  await page.setInputFiles('input[type="file"]', FIXTURE_IMDB_BAD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Continue' }).click();

  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Import rejected' }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByText(/Missing required IMDb columns/)).toBeVisible();
});

test('the IMDb configure step is accessible', async ({ page }) => {
  await page.goto('/admin/tools/import/imdb');
  await page.setInputFiles('input[type="file"]', FIXTURE_IMDB);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Configure IMDb import' }).waitFor();
  await expectNoA11yViolations(page);
});
