import { test, expect } from '@playwright/test';

test.describe('home page', () => {
  test('shows all seeded categories', async ({ page }) => {
    await page.goto('/');
    const main = page.getByRole('main');

    for (const name of ['Video Games', 'Books', 'Movies', 'Board Games', 'Recipes']) {
      await expect(main.getByText(name, { exact: false }).first()).toBeVisible();
    }

    // At least 5 category links in main content
    const categoryLinks = main.locator('a[href^="/category/"]');
    const count = await categoryLinks.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('shows home page content', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('main').getByText('My personal Tierdom')).toBeVisible();
  });

  test('shows tier system section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('The tier system')).toBeVisible();
  });
});

test.describe('category page', () => {
  test('home category card navigates to category', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('main').getByRole('link', { name: 'Video Games' }).first().click();
    await expect(page).toHaveURL(/\/category\/video-games/);
    await expect(page.getByRole('heading', { name: 'Video Games' })).toBeVisible();
  });

  test('video-games shows items grouped by tiers', async ({ page }) => {
    await page.goto('/category/video-games');
    await expect(page.getByRole('heading', { name: 'Video Games' })).toBeVisible();

    // Check that tier labels are present
    for (const tier of ['S', 'A', 'B']) {
      await expect(page.getByText(tier, { exact: true }).first()).toBeVisible();
    }

    // A known S-tier item
    await expect(page.getByText('Hollow Knight')).toBeVisible();
  });

  test('empty category renders gracefully', async ({ page }) => {
    await page.goto('/category/recipes');
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();
    await expect(page.getByText('No items in this category yet')).toBeVisible();
  });

  test('item detail shows score and tags', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Hollow Knight')).toBeVisible();
    await expect(dialog.getByText('/ 100')).toBeVisible();
    await expect(dialog.getByText('Indie')).toBeVisible();
  });

  test('item detail closes with X button', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('about page', () => {
  test('loads about content', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'Why self-host?' })).toBeVisible();
  });
});
