# TODO

This file serves as a light-weight backlog of open features.

## Epics and big features

- [ ] Tweak and finalize design for a v1 release
- [ ] Option to add more static CMS pages
- [ ] Live rendered-markdown preview alongside the CMS editor textarea
- [ ] Improved UX for "well-known" props like "Platform" for Video Games style categories
- [ ] Well-known prop "ISBN" support for Books-like categories
- [ ] Well-known prop "Author" support for Books-like categories
- [ ] Well-known prop "Year" support for Books-like categories
- [ ] Import from Goodreads
- [ ] Import from IMDB
- [ ] Import from TMDB
- [ ] Import from BoardGameGeek
- [ ] Build external API for automated operations
- [ ] Create an MCP server to access a Tierdom instance with AI tooling
- [ ] Add CI/CD
- [ ] Sync (mirror) to external services (e.g. Goodreads, IMDB, etc.) with Tierdom being the source of truth

## Small issues and bugs

- [ ] Improve markdown in Footer (lists, code block, table, etc.)
- [ ] SortableList keyboard reordering (a11y follow-up)
- [ ] Full color contrast audit with manual verification (a11y follow-up)
- [ ] `aria-live` regions for loading states and form feedback (a11y follow-up)
- [ ] Improve image upload (better checks on file type and limit, UX improvements)
- [ ] Add `eslint-plugin-better-tailwindcss` to catch deprecated Tailwind v4 classes in lint
- [ ] Session cookies are missing `httpOnly` and `secure` flags
- [ ] Security headers (CSP, X-Frame-Options, X-Content-Type-Options) not yet configured
- [ ] Nav from a client-side-routed public page (e.g. `/category/[slug]`) into `/admin` via the user menu leaves the outgoing page's DOM in `<main>` — URL updates but the admin dashboard appears below the stale content; refreshing fixes it. Upstream Svelte 5 dev-HMR quirk (see [svelte#14885](https://github.com/sveltejs/svelte/issues/14885) family); does not occur in preview/production builds. A workaround using `data-sveltekit-reload` on the Admin links (plus a regression E2E test) is parked in git stash `admin-navigation-bug-fix` — revive with `git stash list` / `git stash apply` on a future branch once we pick a non-reload fix.
