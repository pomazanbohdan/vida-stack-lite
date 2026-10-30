---
instruction_id: give-requirements-stable-ids-and-cross-reference-them
title: Give the requirements stable ids and cross-reference them
summary: "Number the requirements, the journeys and the metrics globally and reference them by id, so the references survive a reorganization of the document."
capability_tags:
  - plan-implementation
pattern_tags:
  - requirements-clarification
conditions_applies_when: "A requirements document carries numbered requirements, journeys or metrics."
conditions_does_not_apply_when: The document has no numbered elements.
artifact_contract_output_type: identifier-scheme
artifact_contract_required_data:
  - the identifiers
  - the cross-references
  - the source the ids were mirrored from
artifact_contract_verified_by: every id is unique and contiguous and every cross-reference resolves
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/SKILL.md
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-prd/assets/prd-template.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - product
---

# Give the requirements stable ids and cross-reference them
Features grouped; FRs nested with globally numbered stable IDs.
Numbered globally as UJ-1 through UJ-N. FRs reference journeys by ID inline ("realizes UJ-3"); SMs may also cross-reference.
Each SM cross-references the FR(s) it validates.
FRs are numbered globally (FR-1 through FR-N) so downstream artifacts have stable references even if features get reorganized.
Reference user journeys by ID inline ("realizes UJ-2") where the chain matters.
If a UX doc already exists, mirror its UJ IDs here and point to the source.
