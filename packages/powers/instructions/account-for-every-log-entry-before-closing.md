---
instruction_id: account-for-every-log-entry-before-closing
title: Account for every log entry before closing
summary: "Before the run closes, walk the log with the owner and account for every meaningful entry: in the document, in the addendum, or set aside as process noise."
capability_tags:
  - keep-decision-trail
pattern_tags:
  - decision-trail
conditions_applies_when: A run is about to close and its log holds the decisions that were taken.
conditions_does_not_apply_when: The run is still going and the log is still growing.
artifact_contract_output_type: log-accounting
artifact_contract_required_data:
  - each meaningful entry
  - where it landed
  - what was set aside
artifact_contract_verified_by: no meaningful entry is left unaccounted for
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-product-brief/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - product
  - operations
---

# Account for every log entry before closing
Audit the log.
Walk the log with the user;
each entry captured in PRD, in addendum, or set aside.
The user ends this step with an explicit, shared accounting of how the meaningful contents of
the log
were handled — captured in the document, captured in the addendum, or set aside as process noise.
