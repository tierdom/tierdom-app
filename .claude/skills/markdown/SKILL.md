---
name: markdown
description: Write and review Markdown files following project conventions — one sentence per line, MermaidJS diagrams, fenced code blocks with language tags, balanced headings.
allowed-tools: Read Edit Bash
---

Write or review Markdown files in this project. Apply these rules strictly:

## 1. One sentence per line

In prose paragraphs, place **each sentence on its own line**.
This keeps git diffs clean when a single sentence changes.

- Applies to paragraphs, list item text, and blockquote prose.
- Does NOT apply inside code blocks, tables, or headings.
- A "sentence" ends with `.`, `?`, or `!` followed by a space or end-of-line.
- Abbreviations like "e.g.", "i.e.", "etc." do not end a sentence.

Good:

```markdown
Tiers are a hardcoded enum.
Each item's score maps to a tier using cutoff thresholds.
```

Bad:

```markdown
Tiers are a hardcoded enum. Each item's score maps to a tier using cutoff thresholds.
```

## 2. Diagrams use MermaidJS

All diagrams must use fenced MermaidJS code blocks (` ```mermaid `).
Never use ASCII art diagrams.

## 3. Code blocks always have a language

Every fenced code block (triple backtick) **must** specify a language.
Use `text` when no specific language applies.

## 4. Balanced heading structure

- At most **one `h1`** (`#`) per file — typically the document title.
- Headings must not skip levels (e.g. `h2` → `h4` without an `h3`).
- Think of headings as a tree: each level nests under its parent.

## Workflow

When invoked on a file or set of files:

1. Read the file(s).
2. Check all four rules above.
3. Fix violations, or report them if `$ARGUMENTS` contains `--check`.
4. After editing, run `npx prettier --write <file>` on each changed file to ensure consistent formatting.

If `$ARGUMENTS` is empty, ask which file(s) to review.

$ARGUMENTS
