---
name: commit
description: Stage and commit changes with an emoji conventional commit message. Reviews staged/unstaged diffs, suggests a message, and creates the commit.
allowed-tools: Bash Read
---

Help me create a git commit for the current changes in this SvelteKit project.

1. Run `git status` and `git diff` (both staged and unstaged) to understand what has changed.
2. Pick the most fitting emoji and type from the table below.
3. If the diff touches routes, components, navigation, auth, schema, seeds, or hooks — **ask** the user whether to run E2E tests (smoke or deterministic) via `/test` before committing. Skip this for config/docs/test/cosmetic-only changes.
4. Stage the relevant files and create the commit immediately — do not ask for confirmation first. Claude Code's built-in permission prompt is the approval gate.

Note: the user may be prompted for a GPG signing passphrase after the commit command.

## Emoji types

| Emoji | Type          | Use for                                         |
| ----- | ------------- | ----------------------------------------------- |
| ✨    | `feat`        | New feature or capability                       |
| 🐛    | `fix`         | Bug fix                                         |
| 🔥    | `remove`      | Deleting code or files                          |
| ♻️    | `refactor`    | Restructuring without behavior change           |
| 📝    | `docs`        | Documentation only                              |
| 🎨    | `style`       | Formatting, linting, whitespace                 |
| ✅    | `test`        | Adding or updating tests                        |
| 🔧    | `config`      | Config files, tooling setup                     |
| 📦    | `deps`        | Adding or updating dependencies                 |
| 🗑️    | `deps-remove` | Removing dependencies                           |
| 🚀    | `perf`        | Performance improvement                         |
| 🔒    | `security`    | Security fix or hardening                       |
| 🗄️    | `db`          | Database schema or migration                    |
| 🐳    | `docker`      | Dockerfile or container changes                 |
| 🌐    | `i18n`        | Internationalisation / translations             |
| 💄    | `ui`          | Visual or layout changes                        |
| 🏗️    | `arch`        | Architectural changes                           |
| 🔀    | `merge`       | Merge branch                                    |
| 🏷️    | `types`       | Type definitions only                           |
| 🚧    | `wip`         | Work in progress (avoid committing if possible) |
| 🔖    | `release`     | Version bump or release tag                     |
| 🤔    | `other`       | Anything that doesn't fit above                 |

## Message format

- **Subject:** `<emoji> <type>: <short description>` — max 50 chars, imperative, no period
- **Body (optional):** blank line after subject, 72-char wrap, explain _why_ not _what_
- **Never** add a `Co-Authored-By` trailer or any Claude attribution

### Examples

```
✨ feat: add tier list section routing

Sections are now dynamically routed via [section] param.
Public pages render server-side for SEO.
```

```
🐛 fix: redirect unauthenticated admin requests
```

## Pre-commit hook

The husky pre-commit hook runs `npm run lint`, `npm run check`, and `npm run test:unit`. If it fails:

1. **Prettier issue:** run `npm run format`, re-stage, and retry without asking.
2. **Any other failure:** STOP and report to the user.

$ARGUMENTS
