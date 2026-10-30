---
instruction_id: give-one-producer-per-section
title: Give one producer per section
summary: A section that was supplied is never re-run or overwritten; exactly one producer owns it.
capability_tags:
  - verify-work-results
pattern_tags:
  - single-source-of-truth
conditions_applies_when: A section could be produced by more than one source.
conditions_does_not_apply_when: Exactly one source can produce the section.
artifact_contract_output_type: section-ownership
artifact_contract_required_data:
  - the section
  - its producer
artifact_contract_verified_by: the section was produced once and not overwritten
compatibility_excludes: []
compatibility_requires: []
provenance:
  - donor=gsd-core; license=MIT; revision=19f2d5e8eeb0aa4e8d1c03246b52de1a48a7c005; path=gsd-core/references/specless-probe-fallback.md
status: active
revision: 2
schema: VPInstruction/v1.2
classification_status: classified
instruction_form: decision-rule
domains:
  - engineering
---

# Give one producer per section
a SPEC-supplied section is never re-run or overwritten — exactly one producer per section
