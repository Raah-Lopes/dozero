---
name: dozero-context
description: Maintain and extend the DOZERO VTT with its current architecture, roadmap, product priorities, design language, data boundaries, and collaboration preferences. Use for any DOZERO implementation, review, planning, debugging, database, UX, or "continue the roadmap" task.
---

# DOZERO Context

Ground work in the repository's current state instead of reconstructing intent from chat history or legacy documentation.

## Start here

1. Read `AGENTS.md` and obey its boundaries.
2. For architecture or cross-cutting work, read `docs/AI_CONTEXT.md`.
3. For "continue", prioritization, or roadmap work, read `docs/ROADMAP_STATUS.md`.
4. For structural choices, read `DECISIONS.md` and append a concise record only when a significant decision is actually implemented.

The code, migrations, and current package versions override stale documentation.

## Route conditional context

- For implementation cadence, Git hygiene, or interpreting "continue", read [references/workflow.md](references/workflow.md).
- For UI, UX, theme, layout, or visual review, read [references/design-language.md](references/design-language.md).
- For Supabase, auth, RLS, sync, secrets, or user content, read [references/security-and-data.md](references/security-and-data.md).

## Core product judgment

Prefer a usable vertical slice over scaffolding. Functions come before isolated polish, but accessibility and feedback are part of a functioning interface. Reuse the installed stack unless a dependency solves a demonstrated gap substantially better.

Ponytail is lite for this project: simplify implementation, never the requested outcome.
