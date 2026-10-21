---
instruction_id: the-suggested-fix-is-a-hint-not-a-contract
title: "The suggested fix is a hint, not a contract"
summary: "The suggested route to a fix is an example; the diagnosed cause is the binding part, and any smaller or different mechanism that removes the cause closes the item."
capability_tags:
  - debug-root-cause
pattern_tags:
  - systematic-debugging
conditions_applies_when: A diagnosis comes with a suggested route to a fix.
conditions_does_not_apply_when: The cause is known and the fix is fixed by contract.
artifact_contract_output_type: diagnosis-payload
artifact_contract_required_data:
  - the diagnosed cause
  - the suggested route marked as non-binding
artifact_contract_verified_by: the plan was built on the cause and not on the suggested route
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/diagnose-issues.md
status: active
revision: 1
---

# The suggested fix is a hint, not a contract
NON-BINDING example route for the gap closure plan - the binding payload is `root_cause`
A gap plan that removes the root cause by a smaller or different mechanism has closed the gap in full
