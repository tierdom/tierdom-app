# ADR-0001: Use Architecture Decision Records

## Status

Accepted

## Context

As tierdom-pro grows, architectural decisions will be made that are not obvious from reading the code alone. Without a record of _why_ a choice was made, future contributors (or the author returning after a break) must either reverse-engineer the reasoning or risk undoing deliberate decisions by accident.

A lightweight, file-based approach keeps the decisions close to the code, version-controlled, and easy to write.

## Decision

Use Architecture Decision Records (ADRs) stored as Markdown files in `docs/decisions/`. Each ADR is numbered sequentially (zero-padded to 4 digits) and covers one significant decision. The lightweight template consists of: Status, Context, Decision, and Consequences.

New ADRs are created using the `/adr` Claude Code skill.

## Consequences

- Architectural reasoning is documented and version-controlled alongside the code.
- Past decisions can be revisited and superseded by new ADRs rather than silently overwritten.
- Small overhead per decision: writing a short ADR before or after a significant choice.
- The `docs/decisions/` folder becomes the authoritative source for architectural context.
