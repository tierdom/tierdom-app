import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Run axe-core WCAG 2.1 AA analysis on the current page and assert zero violations.
 * Call after the page has fully loaded and any dynamic content is visible.
 */
export async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.map((n) => n.html).slice(0, 3)
  }));

  expect(violations, `Accessibility violations:\n${JSON.stringify(violations, null, 2)}`).toEqual(
    []
  );
}
