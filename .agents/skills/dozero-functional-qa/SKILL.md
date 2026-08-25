---
name: dozero-functional-qa
description: Verify DOZERO user flows in the running React/Vite application, including browser interaction, console errors, responsive behavior, accessibility basics, and focused regression checks. Use after UI or cross-layer changes and for explicit smoke, functional, visual, or release QA.
---

# DOZERO Functional QA

Verify behavior rather than only checking that code compiles.

## Choose proportional coverage

1. Identify the user-visible flow affected by the diff.
2. Run the smallest focused unit/integration tests that cover its logic.
3. Start or reuse the local Vite app and exercise the affected flow with the available browser-control capability.
4. Inspect visible state, browser console and relevant network failures.
5. Check keyboard/focus, a narrow viewport and recovery/error behavior when applicable.
6. Run `npm run build` for cross-layer or release-ready changes.

Read [references/critical-flows.md](references/critical-flows.md) when choosing an end-to-end smoke path.

Capture screenshots only when they help compare a visual result or prove a failure. Never claim a flow passed without actually reaching its success state.

If authentication, multiple users, microphone, screen share or live Supabase writes cannot be exercised safely, report the exact unverified boundary and complete all independent checks.
