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

  test('item detail opens on click', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();

    // Dialog should appear with item details
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Hollow Knight')).toBeVisible();
  });
});

test.describe('about page', () => {
  test('loads about content', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'Why self-host?' })).toBeVisible();
  });
});
