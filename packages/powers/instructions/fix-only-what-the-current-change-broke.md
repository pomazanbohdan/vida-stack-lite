---
instruction_id: fix-only-what-the-current-change-broke
title: Fix only what the current change broke
summary: A defect the current change caused is fixed; anything else is written down for later and left alone.
capability_tags:
  - execute-plan
pattern_tags:
  - scope-routing
conditions_applies_when: A defect is noticed while a task runs.
conditions_does_not_apply_when: The defect is a correctness or security requirement the change itself depends on.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the fixed defects
  - the deferred defects
artifact_contract_verified_by: no out-of-scope defect was fixed and each one was recorded
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-executor.md
status: active
revision: 1
---

# Fix only what the current change broke
Only auto-fix issues DIRECTLY caused by the current task's changes. Pre-existing warnings, linting errors, or failures in unrelated files are out of scope.
Log out-of-scope discoveries to `deferred-items.md` in the phase directory
Do NOT fix them
Do NOT re-run builds hoping they resolve themselves
