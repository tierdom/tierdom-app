# TODO

Open items, tracked here so the README can stay focused on what the project _is_ rather than what's not done yet.

## Roadmap (open)

- [ ] Option to add more static CMS pages
- [ ] Live rendered-markdown preview alongside the CMS editor textarea
- [ ] Import from external sources (Goodreads CSV, etc.)
- [ ] Build external API for automated operations
- [ ] Create an MCP server to access a Tierdom instance from AI tooling
- [ ] Add CI/CD

## Known issues and small TODOs

- [ ] Improve markdown in Footer (lists, code block, table, etc.)
- [ ] SortableList keyboard reordering (a11y follow-up)
- [ ] Full color contrast audit with manual verification (a11y follow-up)
- [ ] `aria-live` regions for loading states and form feedback (a11y follow-up)
- [ ] Improve image upload (better checks on file type and limit, UX improvements)
- [ ] Require double-confirmation for heavy deletes (e.g. category)
- [ ] Add `eslint-plugin-better-tailwindcss` to catch deprecated Tailwind v4 classes in lint
- [ ] Session cookies are missing `httpOnly` and `secure` flags
- [ ] Security headers (CSP, X-Frame-Options, X-Content-Type-Options) not yet configured
- [ ] Nav from a client-side-routed public page (e.g. `/category/[slug]`) into `/admin` via the user menu leaves the outgoing page's DOM in `<main>` — URL updates but the admin dashboard appears below the stale content; refreshing fixes it. Upstream Svelte 5 dev-HMR quirk (see [svelte#14885](https://github.com/sveltejs/svelte/issues/14885) family); does not occur in preview/production builds. A workaround using `data-sveltekit-reload` on the Admin links (plus a regression E2E test) is parked in git stash `admin-navigation-bug-fix` — revive with `git stash list` / `git stash apply` on a future branch once we pick a non-reload fix.
