---
name: audit-branch
description: Audit the current branch for loose ends before merge or plan close — stale docs, untested defensive code, partial wiring, coverage regressions, leftover TODOs. Reports findings; does not fix. MUST be used as part of plan-mode step 4 ("Branch audit before closing"); also useful ad-hoc whenever a branch is asked to be merge-ready.
allowed-tools: Bash Read Glob Grep
---

Audit the current branch for loose ends. Output is a categorised list — **do not fix anything**, just surface what you find and let the user pick what to address.

## Process

1. **Scope.** Run in parallel:
   - `git log --oneline main..HEAD` — commit shape
   - `git diff --stat main..HEAD` — files touched
   - `git status --short` — uncommitted changes (if any, mention them but do not stage)

2. **Stale references.** For every directory the branch touches, grep the surrounding code/docs for symbols that may have been renamed or removed during the branch:
   - `git diff main..HEAD --name-only --diff-filter=D` — deleted files; grep their basenames in the rest of the repo.
   - `git log main..HEAD --diff-filter=R --name-status` — renames; grep the old paths.
   - Look in particular at **READMEs, fixtures, code comments, and ADRs** in the touched areas. The fixtures README pointing at a renamed importer was a real instance of this in the import-tooling rework.

3. **Newly introduced TODO / FIXME / XXX / HACK.** Use `git diff main..HEAD` to find lines added on this branch only — pre-existing markers from `main` are not findings.

4. **Defensive code without tests.** For every `try { ... } catch` or fallback expression added in the diff, check whether a test exercises the failure branch. Hint: search the test file alongside the source file for keywords from the catch's error message.

5. **Partial wiring.** Look for one-sided additions:
   - New server actions / `+page.server.ts` exports without a UI consumer
   - New components without a route mount or unit test
   - New `Importer` / `CategoryMapping` style enum variants without server parsing
   - Types or schemas changed without adjacent test updates

6. **Coverage.** Run `npm run test:unit:coverage` and compare:
   - Aggregate (statements / branches / funcs / lines) against the most recent ADR's coverage baseline if one exists in `docs/decisions/`.
   - Per-file 0% lines that are not in the `coverage.exclude` list in `vite.config.ts` — those are an unconscious "no tests yet, no exclusion" state.

7. **Report.** Group findings into three buckets — same shape the user has accepted before:
   - **Definite gaps** (should fix before merge): stale docs, untested defensive paths, real partial wiring, regressed coverage without an exclude.
   - **Open questions** (need user judgment): trade-offs the branch left ambiguous, or "should we strip this too?" sweeps.
   - **Out of scope here** (track for a future branch / milestone): intentional carry-overs.

   Cap each bucket at ~5 items. If something is too small to mention (one stray comma comment), drop it.

## Notes

- **Reporter, not fixer.** Even if a fix is one line, surface it as a finding and let the user decide. The whole point of the audit is to give them a flat list to triage.
- This skill complements **plan-mode step 4** in `CLAUDE.md` — that step says to do an audit before the close milestone; this skill is how.
- Project memory file `~/.claude/projects/.../memory/MEMORY.md` may contain recent feedback worth checking against (e.g. preferences for `placeholder`, sweep behaviour, image handling). Skim if relevant.

$ARGUMENTS
