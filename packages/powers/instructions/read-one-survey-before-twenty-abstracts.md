---
instruction_id: read-one-survey-before-twenty-abstracts
title: Read one survey before twenty abstracts
summary: "Find one good survey before reading twenty abstracts: it maps the area and points at the papers worth reading."
capability_tags:
  - research-primary-sources
pattern_tags:
  - source-hierarchy
conditions_applies_when: The literature of an area has to be entered.
conditions_does_not_apply_when: The question is about one named paper rather than an area.
artifact_contract_output_type: literature-entry
artifact_contract_required_data:
  - the survey read
  - the papers the survey points at
artifact_contract_verified_by: the reading started from a survey and not from a list of abstracts
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=bmad-method; license=MIT; revision=cfba3ff5f982c1809e060606e399f55ebd7bce5e; path=skills/bmad-deep-recon/types/academic-lit.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - research
---

# Read one survey before twenty abstracts
find one good survey before reading twenty abstracts
