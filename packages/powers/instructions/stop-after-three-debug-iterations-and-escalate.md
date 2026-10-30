---
instruction_id: stop-after-three-debug-iterations-and-escalate
title: Stop after three debug iterations and escalate
summary: A failing test gets three attempts and then the requirement is escalated with the expected and the actual behaviour.
capability_tags:
  - debug-root-cause
pattern_tags:
  - resource-bounds
conditions_applies_when: A test keeps failing.
conditions_does_not_apply_when: The test passed.
artifact_contract_output_type: gap-report
artifact_contract_required_data:
  - the iterations
  - the expected and the actual behaviour
artifact_contract_verified_by: the escalation happened at or before the third iteration
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-nyquist-auditor.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=agents/gsd-nyquist-auditor.compact.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
  - operations
---

# Stop after three debug iterations and escalate
Max 3 iterations per failing test.
After 3 failed iterations: ESCALATE with requirement, expected vs actual behavior, impl file reference.
Max 3 debug iterations per gap
