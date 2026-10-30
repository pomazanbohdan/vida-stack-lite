---
instruction_id: put-the-weakest-items-first
title: Put the weakest items first
summary: "The list of submissions that still need work is ordered by completeness, lowest first, and each row says what is missing."
capability_tags:
  - define-output-format
pattern_tags:
  - output-formatting
conditions_applies_when: A report lists several submissions that still need work.
conditions_does_not_apply_when: "The report lists one submission, or the order carries another meaning."
artifact_contract_output_type: ranked-item-list
artifact_contract_required_data:
  - the items ordered by completeness
  - the score of each
  - what each one is missing
artifact_contract_verified_by: the list is ordered lowest completeness first and names what each item is missing
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/workflows/inbox.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: procedure
domains:
  - engineering
---

# Put the weakest items first
For each issue sorted by completeness score, lowest first:
For each PR sorted by completeness score, lowest first:
Score: [percentage]% complete
Missing: {list of missing required fields}
Missing: {list of missing checklist items}
