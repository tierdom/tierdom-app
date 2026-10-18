import { test as base, expect, type Page } from '@playwright/test';

export { expect };

// Wait for the root layout's hydration marker. Interacting with SSR markup
// before hydration hits buttons without handlers and forms without
// `use:enhance`, and sees SvelteKit 3's relative SSR hrefs (`./category/x`).
export async function waitForHydration(page: Page) {
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
}

// Full-document navigations wait for hydration before returning.
export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (...args) => {
      const response = await goto(...args);
      await waitForHydration(page);
      return response;
    };
    page.reload = async (...args) => {
      const response = await reload(...args);
      await waitForHydration(page);
      return response;
    };
    await use(page);
  },
});
