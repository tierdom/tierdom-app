---
name: learnings
description: Review the current session for learnings worth persisting. Prefers committed files (CLAUDE.md, skills) over memory — memory is only for personal/user-specific things.
allowed-tools: Read Write Edit Glob
---

Review this session and persist any learnings that will be useful in future conversations.

## Where learnings go — the hierarchy

Learnings should be shared with the whole team by default. Only use memory for things that are genuinely personal. Apply this decision tree:

1. **Project convention or workflow rule** → update `CLAUDE.md` or the relevant skill in `.claude/skills/`. These are committed to the repo and shared with all contributors.
2. **Skill-specific guidance** (how to write tests, how to format commits) → update the relevant skill file directly.
3. **Personal preference** (user's communication style, role, expertise) → save as memory. These are per-user and not shared via the repo.
4. **Project context** (deadlines, who's doing what, external references) → save as memory only if it's not derivable from code, git, or docs.

**Rule of thumb:** if a future contributor using this repo would benefit from the learning, it goes in a committed file, not memory.

## What to look for

Scan the full conversation history for:

1. **User corrections** — "don't do X", "use Y instead", "that's wrong", "I prefer Z".
2. **Confirmed approaches** — things that worked well and the user approved, especially non-obvious choices.
3. **Project context** — decisions, deadlines, goals, why something is being done.
4. **User profile updates** — new info about the user's role, expertise, or preferences.
5. **External references** — URLs, tools, dashboards, ticket systems mentioned.

## What NOT to save

- Anything already in CLAUDE.md, skills, or derivable from code/git
- Ephemeral task details (what files were edited, what commands ran)
- Debugging solutions (the fix is in the code)
- Things that are only relevant to this session

## Process

1. Read `CLAUDE.md` and skim the existing skills to know what's already documented.
2. Read `MEMORY.md` at the memory path to see what's already recorded.
3. Identify candidate learnings from the session — list them briefly.
4. For each candidate, classify using the hierarchy above:
   - **Committed file update** → apply the change to CLAUDE.md or the skill file directly.
   - **Memory** → write/update the memory file and MEMORY.md index.
   - **Skip** → already covered or too ephemeral.
5. Report what was done.

## Output format

Summarize what you did:

- Changes applied to committed files (CLAUDE.md, skills) with one-line descriptions
- Memories added/updated/removed (if any)
- Nothing saved? Say so — not every session produces learnings

Keep it brief — the user invokes this at session end and wants a quick summary, not an essay.

$ARGUMENTS
