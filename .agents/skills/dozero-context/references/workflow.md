# Workflow do DOZERO

## Pedido "continue"

1. Inspect current worktree without discarding user changes.
2. Read `docs/ROADMAP_STATUS.md` and choose the first feasible functional item in the declared order.
3. Trace the existing flow and reuse adjacent services, stores and components.
4. Implement a testable vertical slice.
5. Run focused tests and the production build when integration changed.
6. Exercise the user flow in a browser when UI behavior changed.
7. Update roadmap status and a decision record only when warranted.

Do not ask which roadmap item to choose when the status file already provides a safe next item. Ask only when a missing choice would materially alter product behavior, data or external state.

## Worktree and Git

- Preserve unrelated modifications and untracked user files.
- Exclude `stats.html`, `desktop.ini`, `supabase/.temp/` and personal wiki edits from commits unless explicitly requested.
- Commit and push only on request.
- Lead the handoff with what is working, then tests and the next roadmap item.

## Verification baseline

- Logic: smallest focused Vitest test that would fail on regression.
- Integration: `npm run build`.
- UI: browser smoke flow plus console check when available.
- Database: migration syntax plus MCP/CLI verification against the explicitly authorized target.

