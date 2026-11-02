---
instruction_id: write-the-out-of-scope-list-with-its-reasons
title: Write the out-of-scope list with its reasons
summary: "What is excluded is written with the reason, so it is not added back later."
capability_tags:
  - clarify-requirements
pattern_tags:
  - scope-routing
conditions_applies_when: The boundaries of a piece of work are being written.
conditions_does_not_apply_when: The boundaries are already fixed and recorded elsewhere.
artifact_contract_output_type: scope-boundary
artifact_contract_required_data:
  - what is out of scope
  - the reason for each exclusion
artifact_contract_verified_by: every exclusion carries a reason and the list is visible to later work
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/spec.md
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/requirements.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: checklist
domains:
  - product
---

# Write the out-of-scope list with its reasons
The out-of-scope list with reasoning is as important as the in-scope list.
Future phases that touch adjacent areas can point to this SPEC.md to understand what was intentionally excluded.
Explicit exclusions with reasoning
Prevents "why didn't you include X?" later
