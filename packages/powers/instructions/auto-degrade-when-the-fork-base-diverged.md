---
instruction_id: auto-degrade-when-the-fork-base-diverged
title: Auto-degrade when the fork base diverged
summary: When the checkout has diverged from the fork base the run degrades to the sequential path with a one-line warning instead of hitting a halt inside the worker.
capability_tags:
  - isolate-workspace
pattern_tags:
  - graceful-degradation
conditions_applies_when: The fork base of the isolated run no longer matches the head of the checkout.
conditions_does_not_apply_when: The fork base still matches.
artifact_contract_output_type: isolation-degrade
artifact_contract_required_data:
  - the divergence that was detected
  - the warning that was printed
  - the path the run fell back to
artifact_contract_verified_by: the run continued on the sequential path and the warning was printed
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-phase/steps/worktree-base-check.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Auto-degrade when the fork base diverged
fork-base divergence is a property of the repository
The auto-degrade prints a one-line warning to stderr and falls through to the sequential path so executors do not hit the exit-42 worktree-branch-check halt.
