import { test, expect } from '@playwright/test';

test('tags list shows seeded tags', async ({ page }) => {
  await page.goto('/admin/tags');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Tags' })).toBeVisible();

  for (const label of ['Classic', 'Indie', 'Masterpiece', 'Sci-Fi', 'Fantasy']) {
    await expect(main.getByText(label).first()).toBeVisible();
  }
});

test('create and delete a tag', async ({ page }) => {
  const main = page.getByRole('main');

  // Create
  await page.goto('/admin/tags/create');
  await page.locator('#label').fill('Test Tag');
  await page.locator('button[form="create-tag"]').click();
  await expect(page).toHaveURL(/\/admin\/tags/);

  // Verify it shows up — navigate to the tag edit page
  await main.getByRole('link', { name: 'Test Tag' }).click();
  await expect(page.locator('#label')).toHaveValue('Test Tag');

  // Delete from the edit page
  page.on('dialog', (dialog) => dialog.accept());
  await main.getByRole('button', { name: 'Delete' }).click();

  // Verify deletion
  await page.goto('/admin/tags');
  await expect(main.getByText('Test Tag')).not.toBeVisible();
});
