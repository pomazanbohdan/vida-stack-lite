---
instruction_id: map-the-duplication-across-the-change
title: Map the duplication across the change
summary: "The same problem solved more than one way across the pieces of work is mapped, because two sessions rarely know what the other one wrote."
capability_tags:
  - audit-codebase
pattern_tags:
  - code-audit
conditions_applies_when: A body of work that spans several sessions is read back.
conditions_does_not_apply_when: The change came from one session.
artifact_contract_output_type: duplication-map
artifact_contract_required_data:
  - the places the same problem is solved twice
  - the places that exist twice
artifact_contract_verified_by: every duplicate is named with the places it appears in
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-retrospective/references/aggregate-views.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - engineering
---

# Map the duplication across the change
**Duplication map** — the same problem solved more than one way across tickets.
Two sessions independently writing near-identical logic, or a helper reimplemented because the second session did not know the first existed.
