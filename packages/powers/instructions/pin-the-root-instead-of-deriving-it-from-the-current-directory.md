---
instruction_id: pin-the-root-instead-of-deriving-it-from-the-current-directory
title: Pin the root instead of deriving it from the current directory
summary: The working root travels with the prompt as a bound value; the worker never re-derives it from its own possibly drifted current directory.
capability_tags:
  - delegate-subagent-tasks
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A prompt is composed for a worker that runs on a known root.
conditions_does_not_apply_when: The worker runs in its own isolated workspace whose root is its own toplevel.
artifact_contract_output_type: root-binding
artifact_contract_required_data:
  - the bound root
  - the substitution made in the prompt
  - the guard carried with it
artifact_contract_verified_by: "the prompt carries the bound root and the guard, not an instruction to derive them"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/sequential-root-pin.md
status: active
revision: 1
---

# Pin the root instead of deriving it from the current directory
a sequential executor must never re-derive its root from its own (possibly drifted) cwd
This substitution is sequential-mode ONLY: worktree-mode dispatches keep the self-derived line — an isolated executor's own toplevel IS its correct (and intentionally different) worktree
the dispatched prompt must carry the bound, runnable guard verbatim; do not pass this instruction through in its place.
