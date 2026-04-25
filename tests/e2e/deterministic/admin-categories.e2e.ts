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

  // Cancel must NOT delete (regression: previously the browser confirm()'s
  // Cancel still triggered the use:enhance fetch — see ADR-0021)
  await main
    .locator('.sortable-row', { hasText: 'Test Category Edited' })
    .getByRole('button', { name: 'delete' })
    .click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(main.getByText('Test Category Edited').first()).toBeVisible();

  // Reload to confirm the row really is still there server-side
  await page.reload();
  await expect(main.getByText('Test Category Edited').first()).toBeVisible();

  // Now actually delete — typed-confirmation is required
  await main
    .locator('.sortable-row', { hasText: 'Test Category Edited' })
    .getByRole('button', { name: 'delete' })
    .click();
  const deleteDialog = page.getByRole('dialog');
  await expect(deleteDialog).toBeVisible();

  // Confirm button must be disabled until the slug is typed correctly
  const confirmBtn = deleteDialog.getByRole('button', { name: 'Delete category' });
  await expect(confirmBtn).toBeDisabled();

  // Wrong text keeps it disabled
  const slugInput = deleteDialog.getByRole('textbox');
  await slugInput.fill('not-the-slug');
  await expect(confirmBtn).toBeDisabled();

  // Slug from auto-generation on creation: "test-category"
  await slugInput.fill('test-category');
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();

  // Verify deletion
  await expect(main.getByText('Test Category Edited')).not.toBeVisible();
});
