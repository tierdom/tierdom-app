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

  // Cancel must NOT trash (regression: previously the browser confirm()'s
  // Cancel still triggered the use:enhance fetch — see ADR-0021)
  await main
    .locator('.sortable-row', { hasText: 'Test Category Edited' })
    .getByRole('button', { name: 'trash' })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(main.getByText('Test Category Edited').first()).toBeVisible();

  // Reload to confirm the row really is still there server-side
  await page.reload();
  await expect(main.getByText('Test Category Edited').first()).toBeVisible();

  // Send to trash — soft delete, simple confirm (typed gate moved to
  // permanent-delete in the trash page; see ADR-0022)
  await main
    .locator('.sortable-row', { hasText: 'Test Category Edited' })
    .getByRole('button', { name: 'trash' })
    .click();
  const trashDialog = page.getByRole('dialog');
  await expect(trashDialog).toBeVisible();
  await trashDialog.getByRole('button', { name: 'Move to Trash' }).click();

  // Verify it disappears from the active list
  await expect(main.getByText('Test Category Edited')).not.toBeVisible();
});
