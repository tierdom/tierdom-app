import { test, expect } from '@playwright/test';

test('trash page is reachable from the admin nav', async ({ page }) => {
  await page.goto('/admin');
  await page.getByRole('link', { name: 'Trash' }).click();
  await expect(page).toHaveURL(/\/admin\/trash/);
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Trash' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Categories' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Items' })).toBeVisible();
});

test('move item to trash, restore from trash, item reappears', async ({ page }) => {
  const main = page.getByRole('main');
  const unique = `Trash-Restore-${Date.now()}`;

  // Create a fresh item so this test can be re-run cleanly.
  await page.goto('/admin/items/new-item');
  await page.locator('#categoryId').selectOption({ label: 'Video Games' });
  await page.locator('#name').fill(unique);
  await page.locator('#score').fill('50');
  await page.locator('button[form="item-form"]').click();

  // Trash it from the items list.
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(unique);
  await main.getByRole('button', { name: 'trash' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash' }).click();
  await expect(main.getByRole('link', { name: unique })).not.toBeVisible();

  // It shows up in trash.
  await page.goto('/admin/trash');
  await expect(main.locator('tr', { hasText: unique })).toBeVisible();

  // Restore it.
  await main.locator('tr', { hasText: unique }).getByRole('button', { name: 'restore' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(main.locator('tr', { hasText: unique })).toHaveCount(0);

  // Back to items list — it's there again.
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(unique);
  await expect(main.getByRole('link', { name: unique })).toBeVisible();

  // Cleanup: trash + permanent delete so this test is idempotent across runs.
  await main.getByRole('button', { name: 'trash' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash' }).click();
});

test('cascade: trash category, items disappear from items list and category list', async ({
  page
}) => {
  const main = page.getByRole('main');
  const catName = `Cascade-${Date.now()}`;
  const itemName = `${catName}-Item`;

  // Set up: a fresh category with one item.
  await page.goto('/admin/categories/create');
  await page.locator('#name').fill(catName);
  await page.locator('button[form="create-category"]').click();
  await expect(page).toHaveURL(/\/admin\/categories$/);

  await page.goto('/admin/items/new-item');
  await page.locator('#categoryId').selectOption({ label: catName });
  await page.locator('#name').fill(itemName);
  await page.locator('#score').fill('50');
  await page.locator('button[form="item-form"]').click();

  // Trash the category.
  await page.goto('/admin/categories');
  await main
    .locator('.sortable-row', { hasText: catName })
    .getByRole('button', { name: 'trash' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash' }).click();
  await expect(main.locator('.sortable-row', { hasText: catName })).toHaveCount(0);

  // Items list no longer shows the cascaded item (view filters it out).
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(itemName);
  await expect(main.getByText(`No items matching "${itemName}".`)).toBeVisible();

  // Trash shows the category. The item is hidden under it (parent-in-trash rule).
  await page.goto('/admin/trash');
  await expect(main.locator('tr', { hasText: catName })).toBeVisible();
  await expect(main.locator('tr', { hasText: itemName })).toHaveCount(0);

  // Restore the category — its cascaded item comes back too.
  await main.locator('tr', { hasText: catName }).getByRole('button', { name: 'restore' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true }).click();
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(itemName);
  await expect(main.getByRole('link', { name: itemName })).toBeVisible();

  // Cleanup.
  await page.goto('/admin/categories');
  await main
    .locator('.sortable-row', { hasText: catName })
    .getByRole('button', { name: 'trash' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash' }).click();
});

test('permanent delete: typed confirmation gates, then item is gone for good', async ({ page }) => {
  const main = page.getByRole('main');
  const unique = `Purge-${Date.now()}`;
  // The item's slug becomes a slugified copy of the name.
  const slug = unique.toLowerCase();

  await page.goto('/admin/items/new-item');
  await page.locator('#categoryId').selectOption({ label: 'Video Games' });
  await page.locator('#name').fill(unique);
  await page.locator('#score').fill('50');
  await page.locator('button[form="item-form"]').click();

  // Trash it.
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(unique);
  await main.getByRole('button', { name: 'trash' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash' }).click();

  // Permanent delete with the typed-slug gate.
  await page.goto('/admin/trash');
  await main
    .locator('tr', { hasText: unique })
    .getByRole('button', { name: 'delete forever' })
    .click();
  const dialog = page.getByRole('dialog');
  const confirmBtn = dialog.getByRole('button', { name: 'Delete forever' });
  await expect(confirmBtn).toBeDisabled();
  await dialog.getByRole('textbox').fill(slug);
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();

  // Trash empty for this item; items list also clean.
  await expect(main.getByText(unique)).not.toBeVisible();
  await page.goto('/admin/items');
  await page.getByPlaceholder('Quick search').fill(unique);
  await expect(main.getByRole('link', { name: unique })).not.toBeVisible();
});

test('slug conflict on restore surfaces an error banner', async ({ page }) => {
  const main = page.getByRole('main');
  const slug = `conflict-${Date.now()}`;

  // Create category A, trash it.
  await page.goto('/admin/categories/create');
  await page.locator('#name').fill(slug);
  await page.locator('button[form="create-category"]').click();
  await page.goto('/admin/categories');
  await main
    .locator('.sortable-row', { hasText: slug })
    .getByRole('button', { name: 'trash' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash' }).click();

  // Create a new category that takes the same slug.
  await page.goto('/admin/categories/create');
  await page.locator('#name').fill(slug);
  await page.locator('button[form="create-category"]').click();

  // Try to restore the trashed one — should fail with a banner.
  await page.goto('/admin/trash');
  await main.locator('tr', { hasText: slug }).getByRole('button', { name: 'restore' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(main.getByRole('alert')).toContainText('slug');
  // Trashed category is still listed.
  await expect(main.getByText(slug).first()).toBeVisible();

  // Cleanup: trash the duplicate so the next run starts clean.
  await page.goto('/admin/categories');
  await main
    .locator('.sortable-row', { hasText: slug })
    .getByRole('button', { name: 'trash' })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Move to Trash' }).click();
});
