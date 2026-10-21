---
instruction_id: fail-closed-when-the-check-could-not-look
title: Fail closed when the check could not look
summary: A check that could not read its input blocks and says so; it never certifies the absence it did not verify.
capability_tags:
  - verify-work-results
pattern_tags:
  - halt-on-missing-precondition
conditions_applies_when: A gate or a check runs over a scope it could not read or resolve.
conditions_does_not_apply_when: The check read everything it needed.
artifact_contract_output_type: fail-closed-report
artifact_contract_required_data:
  - what could not be read
  - the block
  - the difference between a failure of the check and a negative result
artifact_contract_verified_by: the run stopped and the report says the check could not look
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/api-coverage.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/dispatch-isolation-gate.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/failing-direction.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/execute-phase-between-wave-reset.md
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/autonomous-ui-design-contract.md
status: active
revision: 1
---

# Fail closed when the check could not look
The last four are the fail-closed arms: the gate refuses to certify "no external-API integration" from scope it did not read.
Non-blocking for every answer it gets
The detector is deliberately **fail-closed**: it leans toward firing
Keep the resolver's own failure DISTINGUISHABLE from a genuine `none`.
A non-empty `readError` means the probe **could not look**.
