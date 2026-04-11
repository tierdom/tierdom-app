import { test, expect } from '@playwright/test';

test('categories list shows seeded categories', async ({ page }) => {
  await page.goto('/admin/categories');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Categories' })).toBeVisible();

  for (const name of ['Video Games', 'Books', 'Movies', 'Board Games', 'Recipes']) {
    await expect(main.getByText(name).first()).toBeVisible();
  }
});

test('create, edit, and delete a category', async ({ page }) => {
  const main = page.getByRole('main');

  // Create
  await page.goto('/admin/categories/create');
  await page.locator('#name').fill('Test Category');
  await page.locator('button[form="create-category"]').click();
  await expect(page).toHaveURL(/\/admin\/categories/);
  await expect(main.getByText('Test Category').first()).toBeVisible();

  // Navigate to edit
  await main.getByRole('link', { name: 'Test Category' }).click();
  await expect(page.locator('#name')).toHaveValue('Test Category');

  // Edit name
  await page.locator('#name').fill('Test Category Edited');
  await page.locator('button[form="edit-category"]').click();
  await expect(page).toHaveURL(/\/admin\/categories$/);

  // Verify edit
  await expect(main.getByText('Test Category Edited').first()).toBeVisible();

  // Delete — find the sortable row containing our category
  page.on('dialog', (dialog) => dialog.accept());
  await main
    .locator('.sortable-row', { hasText: 'Test Category Edited' })
    .getByRole('button', { name: 'delete' })
    .click();

  // Verify deletion
  await expect(main.getByText('Test Category Edited')).not.toBeVisible();
});
