---
instruction_id: warn-on-multiple-goals-and-continue
title: Warn on multiple goals and continue
summary: Several independently shippable goals in one request are flagged as a warning; the work is neither split nor blocked.
capability_tags:
  - clarify-requirements
pattern_tags:
  - requirements-clarification
conditions_applies_when: The intent carries more than one independently shippable goal.
conditions_does_not_apply_when: The intent carries a single goal.
artifact_contract_output_type: multi-goal-warning
artifact_contract_required_data:
  - the goals found
  - the warning that was recorded
artifact_contract_verified_by: the warning was recorded and the work continued
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-01-clarify-and-route.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=docs/build/build-a-change.md
status: active
revision: 3
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
  - operations
---

# Warn on multiple goals and continue
If the intent appears to contain multiple independently shippable goals, carry `multiple-goals` forward
Do not split or block
Each run stays focused on one goal.
Check that file after a run — it is a backlog of follow-ups.
