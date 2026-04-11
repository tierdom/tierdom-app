---
name: commit
description: Stage and commit changes with an emoji conventional commit message. Reviews staged/unstaged diffs, suggests a message, and creates the commit.
allowed-tools: Bash Read
---

Help me create a git commit for the current changes in this SvelteKit project.

1. Run `git status` and `git diff` (both staged and unstaged) to understand what has changed.
2. Pick the most fitting emoji and type from the table below.
3. Stage the relevant files and create the commit immediately — do not ask for confirmation first. Claude Code's built-in permission prompt is the approval gate.
4. Note: after the commit command runs, the user may be prompted for a GPG signing passphrase. If the process pauses briefly, that's why — just wait for it to complete.

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

## Message format rules

- **Subject line:** `<emoji> <type>: <short description>`
  - Max **50 characters** (including emoji)
  - No period at the end
  - Imperative mood ("add X", not "added X")
- **Body (optional):** separated from subject by a **blank line**
  - Max **72 characters per line**
  - Explain _why_, not _what_ — the diff shows what
  - Wrap bullet points at 72 chars
- **Never** add a `Co-Authored-By` trailer or any Claude attribution

### Examples

```
✨ feat: add tier list section routing

Sections are now dynamically routed via [section] param.
Public pages render server-side for SEO.
```

```
🗄️ db: add entries and sections schema

Initial Drizzle schema with tier, section, and entry tables.
Includes Drizzle Kit migration config.
```

```
🐛 fix: redirect unauthenticated admin requests
```

## Pre-commit hook

This project has a husky pre-commit hook that runs `npm run lint`. If the hook fails:

1. **Check if it's a Prettier formatting issue.** If so, run `npm run format` (or `npx prettier --write` on the specific files), re-stage, and retry the commit without asking the user.
2. **For any other failure (ESLint errors, etc.):** STOP. Do NOT attempt to fix the errors yourself. Report them to the user and ask how they want to proceed.
3. The user may choose to fix the errors in a separate commit, or bypass the hook with `git commit --no-verify`.

$ARGUMENTS
