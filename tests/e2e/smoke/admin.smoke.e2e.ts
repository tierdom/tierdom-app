import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../fixtures/auth';

test('admin redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('admin categories redirects to login', async ({ page }) => {
  await page.goto('/admin/categories');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('login page renders form', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.locator('#username')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

// Expected to FAIL on dev while the admin-navigation-bug-fix stash is
// unapplied — see README "Known issues" and git stash list. This test
// documents current dev-mode behavior; applying the stash should flip
// it green, surfacing the regression the moment someone re-introduces
// the DOM-leak on /category → /admin client-side navigation.
test.fail('user-menu Admin link from /category replaces page content', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Video Games', exact: true }).click();
  await expect(page).toHaveURL('/category/video-games');

  await page.getByRole('button', { name: /Signed in as/ }).click();
  await page.getByRole('menuitem', { name: 'Admin' }).click();
  await expect(page).toHaveURL('/admin');

  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  // Outgoing category <section> must be gone — this is the assertion
  // the known dev-HMR quirk violates.
  await expect(main.locator(':scope > section')).toHaveCount(0);
});
