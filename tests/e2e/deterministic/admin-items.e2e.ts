import path from 'node:path';
import { test, expect } from '@playwright/test';

const TEST_IMAGE = path.resolve('tests/e2e/fixtures/test-image.png');

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

  // Create with image
  await page.goto('/admin/items/new-item');
  await page.locator('#categoryId').selectOption({ label: 'Video Games' });
  await page.locator('#name').fill(unique);
  await page.locator('#score').fill('50');
  await page.locator('input[name="image"]').setInputFiles(TEST_IMAGE);
  await expect(page.locator('img[alt="Preview"]')).toBeVisible();
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

  // Verify image was saved — edit page shows the uploaded image
  await expect(page.locator('img[alt="Preview"]')).toBeVisible();

  // Edit score
  await page.locator('#score').fill('75');
  await page.locator('button[form="item-form"]').click();

  // Move to trash from items list
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(unique);
  await expect(main.getByRole('link', { name: unique })).toBeVisible();

  // Cancel must NOT trash (regression coverage for ConfirmDialog)
  await main.getByRole('button', { name: 'trash' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(main.getByRole('link', { name: unique })).toBeVisible();

  // With search filtered to one item, there's only one trash button
  await main.getByRole('button', { name: 'trash' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash' }).click();

  // Verify it disappears from the active list
  await expect(main.getByRole('link', { name: unique })).not.toBeVisible();
});

test('seeded items show prop pills in items list', async ({ page }) => {
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill('Hollow Knight');
  await expect(page.getByText('Platform: PC')).toBeVisible();
});

test('item edit form shows seeded props', async ({ page }) => {
  // Find Hollow Knight's edit page
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill('Hollow Knight');
  await page.getByRole('link', { name: 'Hollow Knight' }).click();

  // PropEditor should show the seeded prop
  const fieldset = page.locator('fieldset', { hasText: 'Props' });
  await expect(fieldset.locator('input[placeholder="Key"]')).toHaveValue('Platform');
  await expect(fieldset.locator('input[placeholder="Value"]')).toHaveValue('PC');
});

test('create item with props, verify they persist', async ({ page }) => {
  const main = page.getByRole('main');
  const unique = `Props-${Date.now()}`;

  // Create item with a prop
  await page.goto('/admin/items/new-item');
  await page.locator('#categoryId').selectOption({ label: 'Board Games' });
  await page.locator('#name').fill(unique);
  await page.locator('#score').fill('80');

  // Add a prop via the PropEditor
  await page.getByRole('button', { name: 'Add prop' }).click();
  const fieldset = page.locator('fieldset', { hasText: 'Props' });
  await fieldset.locator('input[placeholder="Key"]').fill('Players');
  await fieldset.locator('input[placeholder="Value"]').fill('2-4');
  await page.locator('button[form="item-form"]').click();

  // Navigate back to edit and verify the prop persisted
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(unique);
  await main.getByRole('link', { name: unique }).click();

  const editFieldset = page.locator('fieldset', { hasText: 'Props' });
  await expect(editFieldset.locator('input[placeholder="Key"]')).toHaveValue('Players');
  await expect(editFieldset.locator('input[placeholder="Value"]')).toHaveValue('2-4');

  // Clean up — move to trash
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(unique);
  await main.getByRole('button', { name: 'trash' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash' }).click();
  await expect(main.getByRole('link', { name: unique })).not.toBeVisible();
});
