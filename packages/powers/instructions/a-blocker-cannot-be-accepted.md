---
instruction_id: a-blocker-cannot-be-accepted
title: A blocker cannot be accepted
summary: An open conflict that blocks is never closed by accepting the work anyway; the loop offers only the manual route.
capability_tags:
  - review-code
pattern_tags:
  - approval-policy-gate
conditions_applies_when: The loop ends with an open conflict that blocks.
conditions_does_not_apply_when: Only ordinary findings remain open.
artifact_contract_output_type: blocker-escalation
artifact_contract_required_data:
  - the open conflict
  - the route that was offered
artifact_contract_verified_by: the acceptance route was not offered while a blocking conflict was open
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/workflows/plan-review-convergence.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# A blocker cannot be accepted
An open plan-revision conflict is a blocker — this loop's whole purpose is to surface it rather than let a success banner paper over it
so escalation cannot end in the same silent acceptance
Only "Manual review" is available:
