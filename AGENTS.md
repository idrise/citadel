# Working agreement

- Read `PLAN.md` before working. It owns the design, milestone checklist, acceptance criteria and current progress.
- “Do the next milestone” means follow the plan's resume rules, implement one milestone, update its work record and stop for review. Do not start later milestones automatically.
- Commit frequently at coherent, reviewable checkpoints. Local commits do not require milestone approval. Use focused messages, inspect the diff and run checks appropriate to the change. Include only task-related files; preserve unrelated user work.
- Never push unless the user explicitly asks. A milestone request, approval or local commit is not permission to push. Never trigger a remote deployment manually unless asked. An authorised default-branch push may publish through the planned Pages workflow.
- Ask before using the `gh` command, including read-only operations.
- Keep modules focused on one responsibility. Split rendering, UI, input and simulation by ownership; extract packages only when they reduce real coupling.
- Prefer strict TypeScript and Vite+ (`vp check`, `vp test`, `vp build`). Keep simulation independent from Three.js rendering and input adapters. Follow the plan's local-first scope and procedural-art rules.
- Report checks actually run, failures and remaining limits. For gameplay or visual changes, provide a usable local demo and rendered evidence as required by the milestone. End milestone handoffs with `REVIEW REQUIRED — Mxx`.
Always unit test code writing useful and thorough tests.
