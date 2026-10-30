---
instruction_id: check-the-on-disk-state-before-you-offer-a-retry
title: Check the on-disk state before you offer a retry
summary: "Before a retry is offered, the state on disk is checked; work that already landed is resumed rather than run again."
capability_tags:
  - degrade-gracefully-under-failure
pattern_tags:
  - idempotent-retry-design
conditions_applies_when: A run was interrupted and a retry is being considered.
conditions_does_not_apply_when: Nothing ran yet.
artifact_contract_output_type: resume-decision
artifact_contract_required_data:
  - what the on-disk check found
  - the decision to resume or to rerun
  - the reason
artifact_contract_verified_by: the on-disk state was read before the retry was offered
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/execute-phase-quota-recovery.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - operations
---

# Check the on-disk state before you offer a retry
Do not offer "retry now".
Run the step-5 spot-check first;
instead of an immediate redispatch.
