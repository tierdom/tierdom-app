# TODO

This file serves as a light-weight backlog of open features.

## Epics and big features

- Performance tests (e.g. Lighthouse?) to ensure a blazingly fast production system
- Tweak and finalize design for a v1 release (to include: long texts e.g. from book titles won't fit in Tier List Items)
- Improved URL structure with shorter URL's (for public site)
- Option to add more static CMS pages
- Live rendered-markdown preview alongside the CMS editor textarea
- Improved UX for "well-known" props like "Platform" for Video Games style categories
- Well-known prop "ISBN" support for Books-like categories
- Well-known prop "Author" support for Books-like categories
- Well-known prop "Year" support for Books-like categories
- Import from Goodreads
- Import from StoryGraph
- Import from TMDB
- Import from BoardGameGeek
- Import from Untappd
- Build external API for automated operations
- Create an MCP server to access a Tierdom instance with AI tooling
- Add CI/CD
- Sync (mirror) to external services (e.g. Goodreads, IMDB, etc.) with Tierdom being the source of truth
- Improve the logo top-left to include the name (for brand recognition)
- Support (at the least docs, but perhaps also changes) for serving through a CDN
- Support (at the least docs, perhaps also changes) for setting up SSL/TLS on a running app
- Support for better logging, APM, and monitoring
- Meta tags and schema.org support
- DX: Ensure development on other OS's and with other AI harnesses works well

## Small issues and bugs

- Import from IMDb should support custom Tier Cutoffs (because ratings are whole numbers this becomes more important for a 7-tier system)
- Use a "Poster Child" tier list item for category thumbnail on the home page
- Improve markdown in Footer (lists, code block, table, etc.)
- SortableList keyboard reordering (a11y follow-up)
- Full color contrast audit with manual verification (a11y follow-up)
- `aria-live` regions for loading states and form feedback (a11y follow-up)
- Improve image upload (better checks on file type and limit, UX improvements)
- Add `eslint-plugin-better-tailwindcss` to catch deprecated Tailwind v4 classes in lint
- Session cookies are missing `httpOnly` and `secure` flags
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options) not yet configured
- Nav from a client-side-routed public page (e.g. `/category/[slug]`) into `/admin` via the user menu leaves the outgoing page's DOM in `<main>` — URL updates but the admin dashboard appears below the stale content; refreshing fixes it. Upstream Svelte 5 dev-HMR quirk (see [svelte#14885](https://github.com/sveltejs/svelte/issues/14885) family); does not occur in preview/production builds. A workaround using `data-sveltekit-reload` on the Admin links (plus a regression E2E test) is parked in git stash `admin-navigation-bug-fix` — revive with `git stash list` / `git stash apply` on a future branch once we pick a non-reload fix.
