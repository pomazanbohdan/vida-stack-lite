---
instruction_id: bound-the-repair-attempts-and-then-escalate
title: Bound the repair attempts and then escalate
summary: "The repair of a failed verification is bounded; when the budget is spent the run stops and the choice — retry, skip as incomplete, or stop to investigate — goes to the person."
capability_tags:
  - execute-plan
pattern_tags:
  - resource-bounds
conditions_applies_when: A verification of a finished task failed.
conditions_does_not_apply_when: The verification passed.
artifact_contract_output_type: repair-escalation
artifact_contract_required_data:
  - what the repair attempted
  - the repair budget
  - the options offered
artifact_contract_verified_by: the repair stopped at its budget and the run did not decide on its own
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/execute-plan.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Bound the repair attempts and then escalate
Repair will attempt RETRY, DECOMPOSE, or PRUNE autonomously. Only reaches this gate again if repair budget is exhausted (ESCALATE).
Present: "Verification failed for Task [X]: [name]. Expected: [criteria]. Actual: [result]. Repair attempted: [summary of what was tried]." Options: Retry | Skip (mark incomplete) | Stop (investigate).
