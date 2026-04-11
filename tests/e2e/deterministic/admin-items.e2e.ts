import { test, expect } from '@playwright/test';

test('items list shows seeded items', async ({ page }) => {
  await page.goto('/admin/items');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: /Items/ })).toBeVisible();
  await expect(main.getByRole('heading', { name: /Items \(/ })).toBeVisible();
});

test('items search filters results', async ({ page }) => {
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill('Hollow Knight');
  await expect(page.getByRole('main').getByText('Hollow Knight')).toBeVisible();
  await expect(page.getByRole('main').getByText('The Witcher 3')).not.toBeVisible();
});

test('create, edit, and delete an item', async ({ page }) => {
  const main = page.getByRole('main');
  const unique = `E2E-${Date.now()}`;

  // Create
  await page.goto('/admin/items/new-item');
  await page.locator('#categoryId').selectOption({ label: 'Video Games' });
  await page.locator('#name').fill(unique);
  await page.locator('#score').fill('50');
  await page.locator('button[form="item-form"]').click();

  // Should redirect after creation
  await expect(page).not.toHaveURL(/new-item/);

  // Find the item in the items list
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(unique);
  await expect(main.getByRole('link', { name: unique })).toBeVisible();

  // Navigate to edit
  await main.getByRole('link', { name: unique }).click();
  await expect(page.locator('#name')).toHaveValue(unique);

  // Edit score
  await page.locator('#score').fill('75');
  await page.locator('button[form="item-form"]').click();

  // Delete from items list
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(unique);
  await expect(main.getByRole('link', { name: unique })).toBeVisible();

  // With search filtered to one item, there's only one delete button
  page.on('dialog', (dialog) => dialog.accept());
  await main.getByRole('button', { name: 'delete' }).click();

  // Verify deletion — the item link should be gone
  await expect(main.getByRole('link', { name: unique })).not.toBeVisible();
});
