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

  test('item detail shows score and props', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Hollow Knight')).toBeVisible();
    await expect(dialog.getByText('/100')).toBeVisible();
    await expect(dialog.getByText('Platform: PC')).toBeVisible();
  });

  test('item detail shows icon for matching prop value', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();

    const icon = dialog.getByRole('img', { name: 'PC' });
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAttribute('src', /\/icons\/gaming-platforms\/pc\.svg$/);
  });

  test('item detail shows no icon when category has no icon set', async ({ page }) => {
    await page.goto('/category/books');
    await page.getByText('Blood Meridian').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Year: 1985')).toBeVisible();

    // Books category has no icon set linked to any prop key
    const icons = dialog.locator('img[src*="/icons/"]');
    await expect(icons).toHaveCount(0);
  });

  test('book item detail shows multiple props', async ({ page }) => {
    await page.goto('/category/books');
    await page.getByText('Blood Meridian').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Year: 1985')).toBeVisible();
    await expect(dialog.getByText('ISBN: 978-0679728757')).toBeVisible();
  });

  test('item detail closes with X button', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('clicking item updates URL with query param', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/category\/video-games\?item=hollow-knight/);
  });

  test('closing dialog restores URL without query param', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\?item=hollow-knight/);

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/\/category\/video-games$/);
  });

  test('browser back after opening item dismisses dialog', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();

    await page.goBack();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/\/category\/video-games$/);
  });

  test('browser forward after back re-opens dialog', async ({ page }) => {
    await page.goto('/category/video-games');
    await page.getByText('Hollow Knight').click();

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();

    await page.goBack();
    await expect(dialog).not.toBeVisible();

    await page.goForward();
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\?item=hollow-knight/);
  });

  test('opening different items creates separate history entries', async ({ page }) => {
    await page.goto('/category/video-games');

    // Open first item
    await page.getByText('Hollow Knight').click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Hollow Knight')).toBeVisible();

    // Close first item
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).not.toBeVisible();

    // Open second item
    await page.getByText('Hades').click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Hades')).toBeVisible();
    await expect(page).toHaveURL(/\?item=hades/);

    // Back should go to closed state
    await page.goBack();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/\/category\/video-games$/);

    // Back again should re-open Hollow Knight
    await page.goBack();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Hollow Knight')).toBeVisible();
  });

  test('direct URL with item param opens and closes dialog', async ({ page }) => {
    await page.goto('/category/video-games?item=hollow-knight');

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Hollow Knight')).toBeVisible();

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page).toHaveURL(/\/category\/video-games$/);
  });

  test('direct URL with item param closes on backdrop click', async ({ page }) => {
    await page.goto('/category/video-games?item=hollow-knight');

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();

    // Click in the backdrop area (viewport top-left, outside the centered dialog content)
    await page.mouse.click(5, 5);
    await expect(dialog).not.toBeVisible();
  });

  test('direct URL then close then back re-opens dialog', async ({ page }) => {
    await page.goto('/category/video-games?item=hollow-knight');

    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).not.toBeVisible();

    await page.goBack();
    await expect(dialog).toBeVisible();
  });
});

test.describe('about page', () => {
  test('loads about content', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { name: 'Why self-host?' })).toBeVisible();
  });
});
