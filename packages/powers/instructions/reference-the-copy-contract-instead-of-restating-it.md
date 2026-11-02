---
instruction_id: reference-the-copy-contract-instead-of-restating-it
title: Reference the copy contract instead of restating it
summary: "The state coverage references the copy rows rather than repeating the words, so the copy stays written in one place."
capability_tags:
  - design-user-interface
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A state coverage section and a copy contract both exist.
conditions_does_not_apply_when: There is no separate copy contract.
artifact_contract_output_type: copy-reference
artifact_contract_required_data:
  - the copy rows that are referenced
artifact_contract_verified_by: the state section references the copy rows and does not repeat them
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=bfab82492374a847a01417707a1a38e9e7cf097e; path=gsd-core/templates/UI-SPEC.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: principle
domains:
  - design-ux
---

# Reference the copy contract instead of restating it
Empty-state and error-state COPY live in `## Copywriting Contract` above — this section covers
state coverage and REFERENCES those rows rather than restating the copy (de-dup).
