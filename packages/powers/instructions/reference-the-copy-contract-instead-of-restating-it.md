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
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/templates/UI-SPEC.md
status: active
revision: 1
---

# Reference the copy contract instead of restating it
Empty-state and error-state COPY live in `## Copywriting Contract` above — this section covers
state coverage and REFERENCES those rows rather than restating the copy (de-dup).
