---
instruction_id: give-each-project-its-own-checkout-and-its-own-rules
title: Give each project its own checkout and its own rules
summary: "Give each project a bare clone with a worktree per branch, so several branches are open at once and agents working in parallel do not collide in one checkout; the rules belong to the project that owns them, and only what holds everywhere goes to the root."
capability_tags:
  - isolate-workspace
pattern_tags:
  - worktree-isolation
conditions_applies_when: Several agents or several branches work in the same project at once.
conditions_does_not_apply_when: One agent works in one checkout.
artifact_contract_output_type: workspace-layout
artifact_contract_required_data:
  - the bare clone
  - the worktree per branch
  - the rules file that owns the rules
artifact_contract_verified_by: two branches are open at once and the rules a project owns stay in that project
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmod-method/help/monorepo-and-polyrepo.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
  - operations
---

# Give each project its own checkout and its own rules
For each project, recommend a bare repository with worktrees: one bare clone per project, and a worktree per branch beside it.
Several branches of one project can then be open at once, and agents working in parallel do not collide in one checkout.
rules belong to each project's own `AGENTS.md`, because each repository has its own conventions.
Rules that hold across all of them go in an `AGENTS.md` at the workspace root.
