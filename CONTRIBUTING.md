# Contributing

Thanks for your interest in Tierdom App.

## Before you start work

The project is in early alpha and has a single maintainer who is actively shaping its direction.
**Please contact the maintainer before starting any non-trivial work** — see [jeroenheijmans.nl](https://www.jeroenheijmans.nl/) for ways to get in touch.
This avoids wasted effort on changes that may not fit the roadmap.

## Development setup

```sh
npm ci
npm run dev
```

A SQLite database with example data will be seeded on first run.

## Tech stack

See the [README](README.md#tech-stack) for the canonical list.

## Day-to-day commands

See `package.json` `scripts` for all the convenient commands you can run with `npm run ...`.
The Husky pre-commit hook runs lint + type-check + unit tests automatically.
The pre-push hook runs the smoke E2E suite.

## AI usage policy

This project itself is built with AI assistance (see the disclaimer in the README), so contributions made with AI help are welcome — but with a few rules:

- **A human must be in the loop and take ownership of every contribution.** Fully autonomous AI submissions are not accepted.
- **Disclose AI usage** in your issues and PRs.
- **Read the diff yourself** before submitting. If you can't explain what changed and why, don't submit it.

## Architectural decisions

See [`docs/decisions/`](docs/decisions/) — significant changes should be reflected as a new ADR (use the `/adr` skill if you have Claude Code set up, otherwise follow the existing format).
