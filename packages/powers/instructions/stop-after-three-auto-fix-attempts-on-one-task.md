---
instruction_id: stop-after-three-auto-fix-attempts-on-one-task
title: Stop after three auto-fix attempts on one task
summary: "Three attempts and the task stops: what is left is written down and the run moves on instead of rebuilding."
capability_tags:
  - execute-plan
pattern_tags:
  - resource-bounds
conditions_applies_when: A task keeps failing and the agent keeps trying to fix it.
conditions_does_not_apply_when: The task passed.
artifact_contract_output_type: task-report
artifact_contract_required_data:
  - the remaining issues
artifact_contract_verified_by: the task stopped at the bound and the remaining issues were documented
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-executor.md
status: active
revision: 1
---

# Stop after three auto-fix attempts on one task
Track auto-fix attempts per task. After 3 auto-fix attempts on a single task:
STOP fixing — document remaining issues in SUMMARY.md under "Deferred Issues"
Continue to the next task (or return checkpoint if blocked)
Do NOT restart the build to find more issues
