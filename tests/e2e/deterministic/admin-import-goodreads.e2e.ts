import { test, expect } from '@playwright/test';
import { resolve as resolvePath } from 'node:path';
import { expectNoA11yViolations } from '../fixtures/axe';

// IMPORTANT: the deterministic suite runs against a single seeded DB shared by
// every test in the project. The Goodreads synthetic category slug `books` is
// NOT in the seed, so committing would mutate the shared DB. Each test below
// cancels at the review step instead. If you add a test that triggers
// inserts, give it a fresh DB (separate Playwright project).

const FIXTURE_GOODREADS = resolvePath('tests/fixtures/imports/goodreads-sample.csv');
const FIXTURE_GOODREADS_BAD = resolvePath('tests/fixtures/imports/goodreads-malformed.csv');

test('Goodreads upload routes through a configure step before review', async ({ page }) => {
  await page.goto('/admin/tools/import/goodreads');
  await page.setInputFiles('input[type="file"]', FIXTURE_GOODREADS);
  await page.getByRole('button', { name: 'Continue' }).click();

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Configure Goodreads import' })).toBeVisible();
  for (const legend of [
    'Title conciseness',
    'ISBN field to import',
    'Author',
    'Binding',
    'Publication year',
    'Order tie-breaker',
    'Rows without a "My Rating" value',
    'Generate gradient placeholders',
  ]) {
    await expect(main.getByRole('group', { name: legend })).toBeVisible();
  }
});

test('Goodreads configure → review → cancel round-trip', async ({ page }) => {
  await page.goto('/admin/tools/import/goodreads');
  await page.setInputFiles('input[type="file"]', FIXTURE_GOODREADS);
  await page.getByRole('button', { name: 'Continue' }).click();

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Configure Goodreads import' })).toBeVisible();
  await main.getByRole('button', { name: 'Continue' }).click();

  await expect(main.getByRole('heading', { name: 'Review import' })).toBeVisible();
  await expect(main.locator('code', { hasText: 'books' })).toBeVisible();
  await main.getByRole('button', { name: 'Cancel' }).click();

  await expect(main.getByRole('heading', { name: 'Goodreads', level: 2 })).toBeVisible();
});

test('Goodreads header validation surfaces an error result for a malformed CSV', async ({
  page,
}) => {
  await page.goto('/admin/tools/import/goodreads');
  await page.setInputFiles('input[type="file"]', FIXTURE_GOODREADS_BAD);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('main').getByRole('button', { name: 'Continue' }).click();

  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Import rejected' }),
  ).toBeVisible();
  await expect(
    page.getByRole('main').getByText(/Missing required Goodreads columns/),
  ).toBeVisible();
});

test('the Goodreads configure step is accessible', async ({ page }) => {
  await page.goto('/admin/tools/import/goodreads');
  await page.setInputFiles('input[type="file"]', FIXTURE_GOODREADS);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('heading', { name: 'Configure Goodreads import' }).waitFor();
  await expectNoA11yViolations(page);
});
