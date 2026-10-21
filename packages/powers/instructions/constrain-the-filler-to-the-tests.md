---
instruction_id: constrain-the-filler-to-the-tests
title: Constrain the filler to the tests
summary: "The worker that fills the gaps may only write tests; it never touches the implementation, it stops after a few debug rounds and escalates what it cannot fix."
capability_tags:
  - write-tests-first
pattern_tags:
  - test-placement-strategy
conditions_applies_when: A worker is asked to write the missing tests.
conditions_does_not_apply_when: The worker is also allowed to fix the implementation.
artifact_contract_output_type: filled-gaps
artifact_contract_required_data:
  - the gaps that were filled
  - the gaps that were escalated
  - the constraint the worker ran under
artifact_contract_verified_by: no implementation file was changed and everything unresolved was escalated
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/validate-phase.md
status: active
revision: 1
---

# Constrain the filler to the tests
Never modify impl files. Max 3 debug iterations. Escalate impl bugs.
`## GAPS FILLED` → record tests + map updates
`## PARTIAL` → record resolved, move escalated to manual-only
`## ESCALATE` → move all to manual-only
