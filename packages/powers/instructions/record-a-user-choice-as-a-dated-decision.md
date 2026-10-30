---
instruction_id: record-a-user-choice-as-a-dated-decision
title: Record a user choice as a dated decision
summary: "Every choice the user makes while the work is cut is written as a dated decision line where the next reader will find it, and a declined suggestion is not raised again without new evidence."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The user makes a choice that changes the work.
conditions_does_not_apply_when: The choice is already recorded somewhere else.
artifact_contract_output_type: decision-line
artifact_contract_required_data:
  - the choice
  - the date
  - the place it is recorded
artifact_contract_verified_by: each choice carries a dated line where the next reader will find it
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/slice.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/references/validate.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-ticket/assets/epic-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Record a user choice as a dated decision
Record each choice the user makes while slicing — a boundary, the tracer bullet, the sequencing, deferred scope, a declined suggestion — as a dated `Decision:` line in the container's Notes when it is made, not after approval.
A declined suggestion recorded as a `Decision:` line is not raised again unless new evidence changes its basis.
Decision: [a choice the user made, dated, so it is not asked again — a declined suggestion belongs here too]
