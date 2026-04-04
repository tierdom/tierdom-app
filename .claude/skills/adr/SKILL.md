---
name: adr
description: Create a new Architecture Decision Record (ADR) in docs/decisions/. Automatically picks the next sequential number and fills in the lightweight template.
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

4. Fill in what you know from $ARGUMENTS. Leave placeholders for anything not specified.
5. Print the file path so I can open it.

If $ARGUMENTS is empty, ask me for the ADR title and context before creating the file.

$ARGUMENTS
