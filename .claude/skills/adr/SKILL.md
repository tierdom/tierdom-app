---
name: adr
description: Create a new Architecture Decision Record (ADR) in docs/decisions/. MUST be used whenever writing an ADR — never create ADR files manually. Picks the next sequential number, fills the template, and updates the ADR table in README.md.
allowed-tools: Bash Read Write Glob
---

Create a new Architecture Decision Record for this project.

1. Look in `docs/decisions/` and find the highest existing ADR number to determine the next number (zero-padded to 4 digits, e.g. `0003`).
2. Derive a kebab-case filename from the title in $ARGUMENTS, e.g. `0003-use-sqlite-for-storage.md`.
3. Create the file at `docs/decisions/<number>-<slug>.md` using this template:

```markdown
# ADR-<number>: <Title>

## Status

Proposed

## Context

<Why is this decision needed? What problem or situation prompted it?>

## Decision

<What was decided?>

## Consequences

<What are the results of this decision — positive, negative, or neutral?>
```

4. Fill in what you know from $ARGUMENTS. Leave placeholders for anything not specified. **Be terse.** ADRs in this project are scanned, not read end-to-end. Treat the rules below as gating, not aspirational:

   **Hard targets:**
   - Aim for under ~80 lines total. Compare to the existing ADRs in `docs/decisions/` — if yours is longer than the median, it's probably overstuffed.
   - Each section earns its length: Context names the problem, Decision lists what changed, Consequences names trade-offs. Anything else is pruning fodder.
   - Prefer short bullets over prose paragraphs. One bullet per fact. No rhetorical scaffolding ("Beyond the bug…", "We considered X but…" → "Rejected: X — reason.").

   **Do NOT include in an ADR** (these belong in code comments, commit messages, or PR descriptions):
   - Function signatures or specific exported APIs
   - LOC counts ("the wrapper is ~25 lines")
   - Cross-platform syntax notes (Windows path handling, escape rules) — those belong next to the code that handles them
   - Step-by-step user workflows (those belong in READMEs / script headers)
   - Justification prose like "avoids drift between X and Y" — either the rule is self-evident from the bullet, or it's a code-comment concern
   - Implementation tactics (which library functions you called, how you wired the stream) — the _choice_ of library belongs here, the _wiring_ doesn't

   **Before you save, re-read every bullet and ask: would removing it confuse a future reader?** If no, cut it. Verbose first drafts get rewritten — start tight.

   **Amendments held to the same bar.** When updating an existing ADR (status flip Proposed→Accepted, or refining decisions made during implementation), apply every rule above to the new bullets too. Easy drift modes when amending: speculation about future use cases, implementation detail that belongs in code comments, "this enables X" rhetorical add-ons, parenthetical motivations on every bullet. Compare the amended length against the previous accepted version — if it grew without the decision space growing, you're padding.

5. Add or update the entry in the **Architecture Decision Records** table in `README.md` at the project root. Match the existing table format (ADR link, Title, Status columns). If updating an existing ADR, update its row; if creating a new one, append a row.
6. Print the file path so I can open it.

If $ARGUMENTS is empty, ask me for the ADR title and context before creating the file.

$ARGUMENTS
