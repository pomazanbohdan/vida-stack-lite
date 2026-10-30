---
instruction_id: do-not-re-litigate-a-locked-decision
title: Do not re-litigate a locked decision
summary: A decision that was already locked is respected unconditionally.
capability_tags:
  - execute-plan
pattern_tags:
  - frozen-intent
conditions_applies_when: A locked decision is met while the work is being done.
conditions_does_not_apply_when: The decision is not locked.
artifact_contract_output_type: locked-decision
artifact_contract_required_data:
  - the locked decision
artifact_contract_verified_by: the locked decision was honoured without being reopened
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/universal-anti-patterns.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - operations
---

# Do not re-litigate a locked decision
Do not re-litigate decisions that are already locked in
respect locked decisions unconditionally
