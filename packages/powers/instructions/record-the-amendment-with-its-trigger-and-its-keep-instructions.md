---
instruction_id: record-the-amendment-with-its-trigger-and-its-keep-instructions
title: Record the amendment with its trigger and its keep instructions
summary: "Every amendment to the plan records the finding that caused it, what was amended, the bad state it avoids and what must survive re-derivation."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: The plan is amended after a review finding.
conditions_does_not_apply_when: The plan was never amended.
artifact_contract_output_type: plan-change-log
artifact_contract_required_data:
  - the triggering finding
  - what was amended
  - the known-bad state avoided
  - the keep instructions
artifact_contract_verified_by: every amendment carries all four parts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/plan-template.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-build-auto/step-04-review.md
status: active
revision: 1
---

# Record the amendment with its trigger and its keep instructions
Each entry records: what finding triggered the change, what was amended, what known-bad state the amendment avoids, and any KEEP instructions (what worked well and must survive re-derivation).
Append a new change-log entry recording: the triggering finding, what was amended, the known-bad state avoided, and the KEEP instructions.
