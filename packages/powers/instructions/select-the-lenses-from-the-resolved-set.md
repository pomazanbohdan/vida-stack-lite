---
instruction_id: select-the-lenses-from-the-resolved-set
title: Select the lenses from the resolved set
summary: "The lens set comes from the configuration, a lens without an instruction is disabled, an explicit request wins over the filters, and everything else runs when it applies."
capability_tags:
  - review-code
pattern_tags:
  - code-review
  - guidance-selection
conditions_applies_when: A review starts and the lenses that will run have to be decided.
conditions_does_not_apply_when: The lenses to run were already fixed by the caller.
artifact_contract_output_type: lens-set
artifact_contract_required_data:
  - the resolved lens set
  - the lenses that are disabled
  - the lenses that will run
  - why each disabled or excluded lens was left out
artifact_contract_verified_by: "every selected lens is enabled and applicable, and every lens left out is named with its reason"
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-review/SKILL.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - operations
---

# Select the lenses from the resolved set
The lens set is not a fixed list.
Overrides add lenses and replace shipped ones.
Never claim a capability from this file; read the resolved lenses and work from those.
Select lenses from the resolved set. A lens with an empty `instruction` is disabled.
If the user or caller named lenses, run exactly those only — `applies_to` and `when` do not filter an explicit request.
Otherwise run every enabled lens whose `applies_to` covers the content class (`any` always covers) and whose `when` applies.
