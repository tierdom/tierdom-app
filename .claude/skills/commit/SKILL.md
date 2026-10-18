---
name: commit
description: Stage and commit changes with an emoji conventional commit message. Writes a brief from the session and delegates the commit to the `committer` subagent.
allowed-tools: Agent
---

Commit the current changes by delegating to the `committer` subagent.
Don't run `git status` or `git diff` yourself — the subagent does that, keeping diff and hook output out of this context.

1. If this session changed routes, components, navigation, auth, schema, seeds, or hooks and E2E hasn't run since — **ask** the user whether to run E2E tests (smoke or deterministic) via `/test` first.
   Skip for config/docs/test/cosmetic-only changes.
2. Call `Agent` with `subagent_type: "committer"` and a brief of at most ~8 lines:
   - **Intent:** why these changes were made (the user's goal, the problem solved).
   - **Must mention:** decisions, trade-offs, or caveats from the session worth recording in the body.
   - **Scope:** which files belong in this commit if not everything staged/changed should go in.
   - The user's arguments below, verbatim, if any.
3. Relay the subagent's result in one line. If the hook failed, show the reported errors and stop.

$ARGUMENTS
